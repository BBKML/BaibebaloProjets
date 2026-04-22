const { query, transaction } = require('../database/db');
const logger = require('../utils/logger');
const { uploadService } = require('../services/upload.service');
const { generateAccessToken, generateRefreshToken } = require('../middlewares/auth');
const { safeJsonParse } = require('../utils/safeJson');

/** Timeout en ms pour éviter de laisser la requête sans réponse (ex: client APK qui coupe) */
const HANDLER_TIMEOUT_MS = 10000;
/** Routes livraison (earnings, orders/active, history) : 4s puis 200 avec données vides */
const DELIVERY_ROUTE_TIMEOUT_MS = 4000;

function withTimeout(promise, ms = HANDLER_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Handler timeout')), ms)),
  ]);
}

/**
 * Inscription d'un nouveau livreur
 * NOTE: Authentification uniquement par OTP - pas de mot de passe requis
 */
exports.registerDeliveryPerson = async (req, res) => {
  try {
    const {
      phone,
      first_name,
      last_name,
      password, // Optionnel - non utilisé pour l'authentification
      vehicle_type,
      vehicle_plate,
      id_card,
      driver_license,
      vehicle_registration,
      insurance_document,
      mobile_money_number,
      mobile_money_provider,
      availability,
    } = req.body;

    // Vérifier si le téléphone existe déjà
    const existingResult = await query(
      'SELECT id FROM delivery_persons WHERE phone = $1',
      [phone]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PHONE_EXISTS',
          message: 'Ce numéro est déjà enregistré',
        },
      });
    }

    // Hasher le mot de passe seulement s'il est fourni (optionnel)
    let password_hash = null;
    if (password) {
      const bcrypt = require('bcrypt');
      const config = require('../config');
      password_hash = await bcrypt.hash(password, config.security.bcryptRounds);
    }

    const result = await query(
      `INSERT INTO delivery_persons (
        phone, first_name, last_name, password_hash,
        vehicle_type, vehicle_plate, id_card, driver_license,
        vehicle_registration, insurance_document,
        mobile_money_number, mobile_money_provider,
        availability_hours, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, phone, first_name, last_name, status`,
      [
        phone, first_name, last_name, password_hash,
        vehicle_type, vehicle_plate || null,
        id_card || null, driver_license || null, 
        vehicle_registration || null, insurance_document || null,
        mobile_money_number || null, mobile_money_provider || null,
        JSON.stringify(availability || {}), 'pending'
      ]
    );

    const row = result.rows[0];
    logger.info(`Nouveau livreur inscrit: ${row.id}`);

    const accessToken = generateAccessToken({
      id: row.id,
      phone: row.phone,
      type: 'delivery_person',
    });
    const refreshToken = generateRefreshToken({
      id: row.id,
      type: 'delivery_person',
      tokenVersion: 0,
    });

    res.status(201).json({
      success: true,
      message: 'Inscription réussie. Votre profil sera validé sous 24-48h.',
      data: {
        delivery_person: row,
        token: accessToken,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('Erreur registerDeliveryPerson:', { message: error.message, stack: error.stack, code: error.code });
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_ERROR',
        message: 'Erreur lors de l\'inscription',
      },
    });
  }
};

/**
 * Changer le statut de disponibilité
 */
exports.updateDeliveryStatus = async (req, res) => {
  try {
    // Le champ est 'delivery_status' dans la route, pas 'status'
    const { delivery_status } = req.body;

    // Valeurs alignées avec la route: available, busy, offline
    const validStatuses = ['available', 'busy', 'offline'];
    if (!validStatuses.includes(delivery_status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Statut invalide (available, busy, offline)',
        },
      });
    }

    await query(
      'UPDATE delivery_persons SET delivery_status = $1 WHERE id = $2',
      [delivery_status, req.user.id]
    );

    logger.info(`Livreur ${req.user.id} statut: ${delivery_status}`);

    res.json({
      success: true,
      message: 'Statut mis à jour',
      data: { delivery_status },
    });
  } catch (error) {
    logger.error('Erreur updateDeliveryStatus:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Erreur lors de la mise à jour',
      },
    });
  }
};

/**
 * Mettre à jour la position GPS
 */
exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    await query(
      `UPDATE delivery_persons 
       SET current_latitude = $1, 
           current_longitude = $2,
           last_location_update = NOW()
       WHERE id = $3`,
      [latitude, longitude, req.user.id]
    );

    const { emitToOrder } = require('../utils/socketEmitter');
    const ordersResult = await query(
      `SELECT id FROM orders 
       WHERE delivery_person_id = $1 AND status IN ('delivering', 'picked_up')`,
      [req.user.id]
    );
    ordersResult.rows.forEach((order) => {
      emitToOrder(req.app, order.id, 'delivery_location_updated', {
        order_id: order.id,
        latitude,
        longitude,
        delivery_person_id: req.user.id,
        timestamp: new Date().toISOString(),
      });
    });

    res.json({
      success: true,
      message: 'Position mise à jour',
    });
  } catch (error) {
    logger.error('Erreur updateLocation:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Erreur lors de la mise à jour',
      },
    });
  }
};

/** Coordonnées Korhogo par défaut si position livreur absente */
const KORHOGO_FALLBACK = { lat: 9.4581, lng: -5.6296 };

/**
 * Obtenir les commandes disponibles à proximité
 * Si lat/lng non fournis, utilise la position du livreur (current_latitude/longitude) ou Korhogo.
 */
exports.getAvailableOrders = async (req, res) => {
  try {
    let lat = parseFloat(req.query.lat);
    let lng = parseFloat(req.query.lng);
    const radius = parseFloat(req.query.radius) || 50;
    const skipDistance = req.query.all === '1' || req.query.all === 'true';

    if (!lat || !lng || Number.isNaN(lat) || Number.isNaN(lng)) {
      const posResult = await query(
        'SELECT current_latitude, current_longitude FROM delivery_persons WHERE id = $1',
        [req.user.id]
      );
      const dp = posResult.rows[0];
      if (dp?.current_latitude != null && dp?.current_longitude != null) {
        lat = parseFloat(dp.current_latitude);
        lng = parseFloat(dp.current_longitude);
      } else {
        lat = KORHOGO_FALLBACK.lat;
        lng = KORHOGO_FALLBACK.lng;
      }
    }

    // Inclure les commandes proposées à ce livreur (order_delivery_proposals) ou sans proposition valide
    // Support food (restaurant) et express (pickup_address)
    const result = await query(
      `SELECT o.*,
              o.order_type,
              o.pickup_address,
              r.name as restaurant_name, 
              r.address as restaurant_address,
              r.latitude as restaurant_latitude,
              r.longitude as restaurant_longitude,
              CASE
                WHEN o.order_type = 'express' AND o.pickup_address IS NOT NULL
                     AND (o.pickup_address->>'latitude') ~ '^-?[0-9]+(\.[0-9]+)?$'
                     AND (o.pickup_address->>'longitude') ~ '^-?[0-9]+(\.[0-9]+)?$'
                THEN earth_distance(
                  ll_to_earth((o.pickup_address->>'latitude')::decimal, (o.pickup_address->>'longitude')::decimal),
                  ll_to_earth($1, $2)
                ) / 1000
                WHEN r.latitude IS NOT NULL AND r.longitude IS NOT NULL
                THEN earth_distance(ll_to_earth(r.latitude, r.longitude), ll_to_earth($1, $2)) / 1000
                ELSE COALESCE(o.delivery_distance, 0)
              END as distance_km
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.status = 'ready'
         AND o.delivery_person_id IS NULL
         AND (
           NOT EXISTS (SELECT 1 FROM order_delivery_proposals p WHERE p.order_id = o.id AND p.expires_at > NOW())
           OR EXISTS (SELECT 1 FROM order_delivery_proposals p WHERE p.order_id = o.id AND p.delivery_person_id = $4 AND p.expires_at > NOW())
         )
         AND (
           $5 = true
           OR (
             (o.order_type = 'express' AND o.pickup_address IS NOT NULL
              AND (o.pickup_address->>'latitude') ~ '^-?[0-9]+(\.[0-9]+)?$'
              AND (o.pickup_address->>'longitude') ~ '^-?[0-9]+(\.[0-9]+)?$'
              AND earth_distance(
                ll_to_earth((o.pickup_address->>'latitude')::decimal, (o.pickup_address->>'longitude')::decimal),
                ll_to_earth($1, $2)
              ) / 1000 <= $3)
             OR (r.latitude IS NOT NULL AND r.longitude IS NOT NULL
                 AND earth_distance(ll_to_earth(r.latitude, r.longitude), ll_to_earth($1, $2)) / 1000 <= $3)
           )
         )
       ORDER BY o.placed_at ASC
       LIMIT 20`,
      [lat, lng, radius, req.user.id, skipDistance]
    );

    logger.debug('getAvailableOrders', {
      lat,
      lng,
      radius,
      count: result.rows.length,
      orderIds: result.rows.map((r) => r.id),
    });

    res.json({
      success: true,
      data: {
        orders: result.rows,
        total: result.rows.length,
      },
    });
  } catch (error) {
    logger.error('Erreur getAvailableOrders:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erreur lors de la récupération',
      },
    });
  }
};

/**
 * Accepter une livraison
 */
exports.acceptDelivery = async (req, res) => {
  try {
    const { id } = req.params;

    return await transaction(async (client) => {
      // Vérifier que la commande est disponible : soit ce livreur a une proposition valide, soit aucune proposition (course visible à tous)
      const orderResult = await client.query(
        `SELECT o.*, o.order_type, o.pickup_address,
                r.name as restaurant_name, r.address as restaurant_address, 
                r.latitude as restaurant_lat, r.longitude as restaurant_lng
         FROM orders o
         LEFT JOIN restaurants r ON o.restaurant_id = r.id
         WHERE o.id = $1 AND o.status = 'ready' AND o.delivery_person_id IS NULL
           AND (
             NOT EXISTS (SELECT 1 FROM order_delivery_proposals p WHERE p.order_id = o.id AND p.expires_at > NOW())
             OR EXISTS (SELECT 1 FROM order_delivery_proposals p WHERE p.order_id = o.id AND p.delivery_person_id = $2 AND p.expires_at > NOW())
           )
         FOR UPDATE OF o`,
        [id, req.user.id]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_AVAILABLE',
            message: 'Commande non disponible ou déjà assignée',
          },
        });
      }

      const order = orderResult.rows[0];

      // Annuler les propositions aux autres livreurs et assigner ce livreur
      await client.query(`DELETE FROM order_delivery_proposals WHERE order_id = $1`, [id]);
      await client.query(
        `UPDATE orders 
         SET delivery_person_id = $1, assigned_at = NOW(),
             proposed_delivery_person_id = NULL, proposal_expires_at = NULL, updated_at = NOW()
         WHERE id = $2`,
        [req.user.id, id]
      );

      // Récupérer infos du livreur
      const deliveryResult = await client.query(
        'SELECT first_name, last_name, phone, vehicle_type, profile_photo, average_rating FROM delivery_persons WHERE id = $1',
        [req.user.id]
      );
      const deliveryPerson = deliveryResult.rows[0];

      // Récupérer infos client
      const userResult = await client.query(
        'SELECT id, phone, first_name FROM users WHERE id = $1',
        [order.user_id]
      );

      const io = req.app.get('io');
      const partnersIo = req.app.get('partnersIo');

      const { emitToOrder } = require('../utils/socketEmitter');
      emitToOrder(req.app, id, 'delivery_assigned', {
        order_id: id,
        delivery_person: {
          id: req.user.id,
          name: `${deliveryPerson.first_name} ${deliveryPerson.last_name || ''}`.trim(),
          phone: deliveryPerson.phone,
          vehicle_type: deliveryPerson.vehicle_type,
          photo: deliveryPerson.profile_photo,
          rating: deliveryPerson.average_rating,
        },
      });

      // Notifier le restaurant (uniquement pour commandes food)
      if (partnersIo && order.restaurant_id) {
        partnersIo.to(`restaurant_${order.restaurant_id}`).emit('delivery_assigned', {
          order_id: id,
          order_number: order.order_number,
          delivery_person: {
            name: `${deliveryPerson.first_name} ${deliveryPerson.last_name || ''}`.trim(),
            phone: deliveryPerson.phone,
            vehicle_type: deliveryPerson.vehicle_type,
          },
        });
      }

      // Notifier les admins
      const { notifyOrderStatusChange } = require('../utils/socket');
      notifyOrderStatusChange(io, id, 'assigned');

      // SMS au client
      if (userResult.rows[0]?.phone) {
        try {
          const smsService = require('../services/sms.service');
          await smsService.sendOrderNotification(
            userResult.rows[0].phone,
            order.order_number,
            'assigned'
          );
        } catch (smsError) {
          logger.warn('Échec envoi SMS client (acceptDelivery)', { 
            error: smsError.message,
            orderId: order.id 
          });
        }
      }

      // Push notification au client
      try {
        const notificationService = require('../services/notification.service');
        await notificationService.sendOrderNotification(order.id, 'client', 'delivery_assigned');
      } catch (notificationError) {
        logger.warn('Notification push ignorée (acceptDelivery)', { error: notificationError.message });
      }

      logger.info(`Livraison acceptée: ${order.order_number} par livreur ${req.user.id}`);

      res.json({
        success: true,
        message: 'Livraison acceptée',
        data: { 
          order: {
            ...order,
            delivery_person: deliveryPerson,
          },
        },
      });
    });
  } catch (error) {
    logger.error('Erreur acceptDelivery:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ACCEPT_ERROR',
        message: 'Erreur lors de l\'acceptation',
      },
    });
  }
};

/**
 * Livreur paie le restaurant à l'avance (avant de récupérer la commande)
 */
exports.payRestaurant = async (req, res) => {
  try {
    const { id } = req.params;

    const orderResult = await query(
      `SELECT * FROM orders 
       WHERE id = $1 AND delivery_person_id = $2 AND status IN ('ready', 'preparing', 'accepted')
       AND restaurant_paid_by_delivery = FALSE`,
      [id, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Commande non trouvée, déjà payée par vous, ou statut invalide',
        },
      });
    }

    const order = orderResult.rows[0];

    // Marquer comme payé par le livreur
    await query(
      `UPDATE orders 
       SET restaurant_paid_by_delivery = TRUE, 
           restaurant_paid_by_delivery_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    logger.info(`Livreur ${req.user.id} a payé le restaurant pour commande ${order.order_number}`);

    res.json({
      success: true,
      message: 'Paiement restaurant enregistré. Vous pouvez récupérer la commande.',
      data: {
        order_id: id,
        order_number: order.order_number,
        restaurant_paid_by_delivery: true,
      },
    });
  } catch (error) {
    logger.error('Erreur payRestaurant:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PAYMENT_ERROR',
        message: 'Erreur lors de l\'enregistrement du paiement',
      },
    });
  }
};

/**
 * Confirmer la récupération de la commande au restaurant
 */
exports.confirmPickup = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE orders 
       SET status = 'picked_up', picked_up_at = NOW()
       WHERE id = $1 AND delivery_person_id = $2 AND status IN ('ready', 'delivering', 'accepted')
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Commande non trouvée ou déjà récupérée',
        },
      });
    }

    const order = result.rows[0];

    const io = req.app.get('io');
    const partnersIo = req.app.get('partnersIo');

    const { emitToOrder } = require('../utils/socketEmitter');
    emitToOrder(req.app, id, 'order_picked_up', {
      order_id: id,
      order_number: order.order_number,
      message: 'Votre commande a été récupérée par le livreur',
    });
    emitToOrder(req.app, id, 'order_status_changed', {
      order_id: id,
      status: 'picked_up',
    });

    // Notifier le restaurant - commande partie (uniquement pour commandes food)
    if (partnersIo && order.restaurant_id) {
      partnersIo.to(`restaurant_${order.restaurant_id}`).emit('order_picked_up', {
        order_id: id,
        order_number: order.order_number,
        message: 'Le livreur a récupéré la commande',
      });
    }

    // Notifier les admins
    const { notifyOrderStatusChange } = require('../utils/socket');
    notifyOrderStatusChange(io, id, 'picked_up');

    // Récupérer téléphone client pour SMS
    const userResult = await query(
      'SELECT phone FROM users WHERE id = $1',
      [order.user_id]
    );

    // SMS au client
    if (userResult.rows[0]?.phone) {
      try {
        const smsService = require('../services/sms.service');
        await smsService.sendOrderNotification(
          userResult.rows[0].phone,
          order.order_number,
          'picked_up'
        );
      } catch (smsError) {
        logger.warn('Échec envoi SMS client (confirmPickup)', { 
          error: smsError.message,
          orderId: order.id 
        });
      }
    }

    // Push notification au client
    try {
      const notificationService = require('../services/notification.service');
      await notificationService.sendOrderNotification(order.id, 'client', 'delivery_on_way');
    } catch (notificationError) {
      logger.warn('Notification push ignorée (confirmPickup)', { error: notificationError.message });
    }

    logger.info(`Commande récupérée: ${order.order_number}`);

    res.json({
      success: true,
      message: 'Récupération confirmée',
    });
  } catch (error) {
    logger.error('Erreur confirmPickup:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PICKUP_ERROR',
        message: 'Erreur lors de la confirmation',
      },
    });
  }
};

/**
 * Confirmer la livraison
 */
exports.confirmDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_code, confirmation_code, photo } = req.body;
    const code = delivery_code || confirmation_code;

    return await transaction(async (client) => {
      const orderResult = await client.query(
        `SELECT * FROM orders 
         WHERE id = $1 AND delivery_person_id = $2 AND status IN ('picked_up', 'delivering', 'driver_at_customer')`,
        [id, req.user.id]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Commande non trouvée',
          },
        });
      }

      const order = orderResult.rows[0];

      // Valider le code de confirmation : utilise les chiffres de l'ID commande (ex: BAIB-40031 → 40031)
      if (code && typeof code === 'string') {
        const expectedCode = (order.order_number || '').replace(/^[A-Za-z_-]+/, '').replace(/\D/g, '');
        const providedCode = String(code).replace(/\D/g, '');
        if (expectedCode && providedCode && expectedCode !== providedCode) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_CODE',
              message: 'Code incorrect. Utilisez les chiffres du numéro de commande.',
            },
          });
        }
      }

      // Marquer comme livrée (et paiement espèces reçu du client si cash), optionnellement photo preuve (URL ou chemin)
      const hasPhoto = photo && typeof photo === 'string' && photo.trim().length > 0;
      const photoClause = hasPhoto ? ', delivery_proof_photo = $2' : '';
      const photoParam = hasPhoto ? [id, photo.trim()] : [id];
      await client.query(
        `UPDATE orders 
         SET status = 'delivered', delivered_at = NOW()
         ${order.payment_method === 'cash' ? ", payment_status = 'paid', paid_at = NOW()" : ''}
         ${photoClause}
         WHERE id = $1`,
        photoParam
      );

      // === CRÉDIT RESTAURANT (flux Glovo : plateforme crédite le restaurant une fois livré + payé) ===
      // Uniquement pour commandes food (express n'a pas de restaurant)
      const paymentStatusAfterDelivery = order.payment_method === 'cash' ? 'paid' : order.payment_status;
      const restaurantAlreadyPaidByDelivery = order.restaurant_paid_by_delivery === true;
      
      if (order.restaurant_id && paymentStatusAfterDelivery === 'paid' && !restaurantAlreadyPaidByDelivery) {
        const existingCredit = await client.query(
          `SELECT 1 FROM transactions WHERE order_id = $1 AND to_user_type = 'restaurant' AND to_user_id = $2 AND status = 'completed' LIMIT 1`,
          [order.id, order.restaurant_id]
        );
        if (existingCredit.rows.length === 0) {
          const { getCommission, getNetRestaurantRevenue } = require('../utils/commission');
          const subtotal = parseFloat(order.subtotal) || 0;
          const { commission, rate: commissionRate } = getCommission(subtotal, order.commission_rate);
          const netRestaurant = getNetRestaurantRevenue(subtotal, order.commission_rate, order.commission);
          if (netRestaurant > 0) {
            await client.query(
              `INSERT INTO transactions (
                order_id, transaction_type, amount,
                from_user_type, from_user_id,
                to_user_type, to_user_id,
                status, payment_method, metadata
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [
                order.id, 'order_payment', netRestaurant,
                'platform', null,
                'restaurant', order.restaurant_id,
                'completed', order.payment_method || 'internal',
                JSON.stringify({ subtotal, commission, commission_rate: commissionRate, order_number: order.order_number }),
              ]
            );
            logger.info(`Restaurant ${order.restaurant_id} crédité: ${netRestaurant} FCFA (commande ${order.order_number})`);
          }
        }
      } else if (order.restaurant_id && restaurantAlreadyPaidByDelivery) {
        logger.info(`Restaurant ${order.restaurant_id} déjà payé par livreur pour commande ${order.order_number} - Pas de crédit plateforme`);
      }

      // === CALCUL DES GAINS DU LIVREUR ===
      // NOUVEAU MODÈLE : Les bonus sont inclus dans les frais de livraison payés par le client
      // En livraison gratuite : Baibebalo paie le livreur (freeDeliveryDriverFee)
      const config = require('../config');
      const businessConfig = config.business;
      const now = new Date();
      let deliveryFee = parseFloat(order.delivery_fee) || 0;
      const deliveryDistance = (parseFloat(order.delivery_distance) || 0);
      const safeDistance = Number.isFinite(deliveryDistance) ? deliveryDistance : 0;

      const isFreeDelivery = deliveryFee <= 0;
      if (isFreeDelivery) {
        deliveryFee = businessConfig.freeDeliveryDriverFee || 500;
      }

      // Les bonus sont déjà inclus dans order.delivery_fee (payé par le client) ; en gratuit, plateforme paie
      const deliveryPersonPercentage = businessConfig.deliveryPersonPercentage || 70;
      const deliveryEarnings = Math.round((deliveryFee * deliveryPersonPercentage) / 100);
      const platformCommission = deliveryFee - deliveryEarnings;

      // Détail des gains pour le log et la transaction
      const earningsBreakdown = {
        delivery_fee_total: deliveryFee, // Client ou plateforme (livraison gratuite)
        free_delivery_paid_by_platform: isFreeDelivery,
        delivery_person_percentage: deliveryPersonPercentage,
        delivery_person_earnings: deliveryEarnings, // 70% du total
        platform_commission: platformCommission, // 30% du total
        details: {
          distance_km: safeDistance,
          hour: now.getHours(),
          day_of_week: now.getDay(),
        },
      };
      
      logger.info(`Gains livreur calculés pour commande ${order.order_number}:`, earningsBreakdown);

      // Mettre à jour les statistiques et le solde du livreur
      await client.query(
        `UPDATE delivery_persons 
         SET total_deliveries = total_deliveries + 1,
             total_earnings = total_earnings + $1,
             available_balance = available_balance + $1,
             total_distance = COALESCE(total_distance, 0) + $2
         WHERE id = $3`,
        [deliveryEarnings, safeDistance, req.user.id]
      );

      // Créer la transaction principale pour le livreur
      await client.query(
        `INSERT INTO transactions (
          order_id, transaction_type, amount,
          from_user_type, from_user_id,
          to_user_type, to_user_id,
          status, payment_method, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          order.id, 'delivery_fee', deliveryEarnings,
          'platform', null,
          'delivery', req.user.id,
          'completed', 'internal',
          JSON.stringify(earningsBreakdown),
        ]
      );
      
      // === VÉRIFICATION BONUS OBJECTIF QUOTIDIEN ===
      // Si le livreur atteint 10 courses dans la journée, bonus de 2000 FCFA
      const dailyGoalTarget = businessConfig.deliveryDailyGoalTarget || 10;
      const dailyGoalBonus = businessConfig.deliveryDailyGoalBonusAmount || 2000;
      
      const todayDeliveriesResult = await client.query(
        `SELECT COUNT(*) as count FROM orders 
         WHERE delivery_person_id = $1 
         AND status = 'delivered' 
         AND DATE(delivered_at) = CURRENT_DATE`,
        [req.user.id]
      );
      const todayDeliveries = parseInt(todayDeliveriesResult.rows[0].count);
      
      let dailyBonusAwarded = false;
      if (todayDeliveries === dailyGoalTarget) {
        // C'est exactement la 10ème course → attribuer le bonus
        await client.query(
          `UPDATE delivery_persons 
           SET total_earnings = total_earnings + $1,
               available_balance = available_balance + $1
           WHERE id = $2`,
          [dailyGoalBonus, req.user.id]
        );
        
        // Enregistrer la transaction de bonus
        await client.query(
          `INSERT INTO transactions (
            transaction_type, amount,
            from_user_type, from_user_id,
            to_user_type, to_user_id,
            status, payment_method, metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            'daily_goal_bonus', dailyGoalBonus,
            'platform', null,
            'delivery', req.user.id,
            'completed', 'internal',
            JSON.stringify({ target: dailyGoalTarget, achieved_at: now }),
          ]
        );
        
        dailyBonusAwarded = true;
        logger.info(`Bonus objectif quotidien attribué au livreur ${req.user.id}: ${dailyGoalBonus} FCFA (${dailyGoalTarget} courses)`);
        
        // Notification au livreur
        try {
          const notificationService = require('../services/notification.service');
          await notificationService.sendToUser(req.user.id, 'delivery', {
            title: '🎯 Objectif atteint !',
            body: `Félicitations ! Vous avez effectué ${dailyGoalTarget} courses aujourd'hui. Bonus de ${dailyGoalBonus} FCFA crédité !`,
            type: 'daily_goal_bonus',
            data: { bonus: dailyGoalBonus, deliveries: dailyGoalTarget },
            channel: 'rewards',
          });
        } catch (e) {
          // Ignorer l'erreur de notification
        }
      }

      // === VÉRIFICATION PÉNALITÉ DE RETARD ===
      // Si le livreur met plus de 15 minutes de retard → pénalité de 200 FCFA
      let latePenaltyApplied = false;
      let latePenaltyAmount = 0;
      
      if (order.estimated_delivery_time && order.picked_up_at) {
        const lateThreshold = businessConfig.deliveryPenaltyLateThreshold || 15; // minutes
        const latePenalty = businessConfig.deliveryPenaltyLateAmount || 200; // FCFA
        
        // Temps réel de livraison (de picked_up à maintenant)
        const pickedUpTime = new Date(order.picked_up_at);
        const deliveredTime = now;
        const actualDeliveryMinutes = Math.round((deliveredTime - pickedUpTime) / (1000 * 60));
        
        // Temps estimé pour la livraison (après pickup)
        // On estime que le temps estimé total inclut préparation + livraison
        // La partie livraison seule est estimée à environ 50% du temps total ou un minimum de 15 min
        const estimatedDeliveryMinutes = Math.max(15, Math.round(order.estimated_delivery_time * 0.5));
        
        const delayMinutes = actualDeliveryMinutes - estimatedDeliveryMinutes;
        
        if (delayMinutes > lateThreshold) {
          latePenaltyAmount = latePenalty;
          
          // Appliquer la pénalité
          await client.query(
            `UPDATE delivery_persons 
             SET total_earnings = GREATEST(0, total_earnings - $1),
                 available_balance = GREATEST(0, available_balance - $1),
                 total_penalties = COALESCE(total_penalties, 0) + $1
             WHERE id = $2`,
            [latePenaltyAmount, req.user.id]
          );
          
          // Enregistrer la transaction de pénalité
          await client.query(
            `INSERT INTO transactions (
              order_id, transaction_type, amount,
              from_user_type, from_user_id,
              to_user_type, to_user_id,
              status, payment_method, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              order.id, 'penalty_late', -latePenaltyAmount,
              'delivery', req.user.id,
              'platform', null,
              'completed', 'internal',
              JSON.stringify({ 
                estimated_minutes: estimatedDeliveryMinutes,
                actual_minutes: actualDeliveryMinutes,
                delay_minutes: delayMinutes,
                threshold_minutes: lateThreshold,
              }),
            ]
          );
          
          latePenaltyApplied = true;
          logger.warn(`Pénalité de retard appliquée au livreur ${req.user.id}: -${latePenaltyAmount} FCFA (retard: ${delayMinutes} min)`);
        }
      }

      // Notifier le client
      const { emitToOrder } = require('../utils/socketEmitter');
      emitToOrder(req.app, id, 'order_status_changed', {
        order_id: id,
        status: 'delivered',
      });
      emitToOrder(req.app, id, 'order_delivered', {
        order_id: id,
        order_number: order.order_number,
        delivered_at: new Date(),
      });
      
      // Notifier les admins du dashboard
      const io = req.app.get('io');
      const { notifyOrderStatusChange } = require('../utils/socket');
      notifyOrderStatusChange(io, id, 'delivered', { delivered_at: new Date() });

      const userResult = await client.query(
        'SELECT phone FROM users WHERE id = $1',
        [order.user_id]
      );

      // Notifier le restaurant (uniquement pour commandes food)
      const partnersIo = req.app.get('partnersIo');
      if (partnersIo && order.restaurant_id) {
        partnersIo.to(`restaurant_${order.restaurant_id}`).emit('order_delivered', {
          order_id: id,
          order_number: order.order_number,
          delivered_at: new Date(),
          total: order.total,
        });
      }

      // Notifier le client par SMS
      if (userResult.rows[0]?.phone) {
        try {
          const smsService = require('../services/sms.service');
          await smsService.sendOrderNotification(
            userResult.rows[0].phone,
            order.order_number,
            'delivered'
          );
        } catch (smsError) {
          logger.warn('Échec envoi SMS client (confirmDelivery)', { 
            error: smsError.message,
            orderId: id 
          });
        }
      }

      // Push notification au client
      try {
        const notificationService = require('../services/notification.service');
        await notificationService.sendOrderNotification(order.id, 'client', 'order_delivered');
      } catch (notificationError) {
        logger.warn('Notification push ignorée (confirmDelivery)', { error: notificationError.message });
      }

      // === ATTRIBUTION DES POINTS DE FIDÉLITÉ ===
      // Formule: 1 point pour chaque tranche de 100 FCFA (arrondi à l'inférieur)
      const orderTotal = parseFloat(order.total) || 0;
      const loyaltyPointsEarned = Math.floor(orderTotal / 100);
      
      if (loyaltyPointsEarned > 0) {
        // Mettre à jour les points du client
        await client.query(
          `UPDATE users 
           SET loyalty_points = COALESCE(loyalty_points, 0) + $1
           WHERE id = $2`,
          [loyaltyPointsEarned, order.user_id]
        );

        // Enregistrer la transaction de points
        // amount = montant de la commande en FCFA (utilisé pour calculer les points)
        await client.query(
          `INSERT INTO loyalty_transactions (
            user_id, type, amount, points, description, order_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            order.user_id,
            'earned',
            Math.floor(orderTotal), // amount en FCFA (entier)
            loyaltyPointsEarned, // points gagnés
            `Points gagnés pour commande #${order.order_number}`,
            order.id,
          ]
        );

        logger.info(`Points fidélité attribués: ${loyaltyPointsEarned} points à l'utilisateur ${order.user_id}`);

        // Vérifier si le client a changé de niveau de fidélité
        const userPoints = await client.query(
          'SELECT loyalty_points FROM users WHERE id = $1',
          [order.user_id]
        );
        const totalPoints = userPoints.rows[0]?.loyalty_points || 0;
        
        // Niveaux: Bronze (0-100), Argent (101-500), Or (501+)
        let newLevel = 'bronze';
        if (totalPoints > 500) newLevel = 'or';
        else if (totalPoints > 100) newLevel = 'argent';

        // Notification de bonus si changement de niveau
        if (totalPoints - loyaltyPointsEarned <= 100 && totalPoints > 100 && totalPoints <= 500) {
          // Passage à Argent
          try {
            const notificationService = require('../services/notification.service');
            await notificationService.sendOrderNotification(order.id, 'client', 'loyalty_reward');
          } catch (e) { /* ignore */ }
        } else if (totalPoints - loyaltyPointsEarned <= 500 && totalPoints > 500) {
          // Passage à Or
          try {
            const notificationService = require('../services/notification.service');
            await notificationService.sendOrderNotification(order.id, 'client', 'loyalty_reward');
          } catch (e) { /* ignore */ }
        }
      }
      // === FIN POINTS DE FIDÉLITÉ ===

      logger.info(`Commande livrée: ${order.order_number}`);

      // Calculer le gain net (après pénalités)
      const netEarnings = deliveryEarnings - latePenaltyAmount + (dailyBonusAwarded ? dailyGoalBonus : 0);
      
      res.json({
        success: true,
        message: latePenaltyApplied 
          ? `Livraison confirmée. Pénalité de retard: -${latePenaltyAmount} FCFA`
          : 'Livraison confirmée',
        data: {
          earnings: {
            total: deliveryEarnings,
            net: netEarnings,
            breakdown: earningsBreakdown,
          },
          daily_bonus: dailyBonusAwarded ? {
            awarded: true,
            amount: dailyGoalBonus,
            target_reached: dailyGoalTarget,
          } : null,
          late_penalty: latePenaltyApplied ? {
            applied: true,
            amount: latePenaltyAmount,
            reason: 'Retard de livraison',
          } : null,
          today_deliveries: todayDeliveries,
          loyalty_points_earned: loyaltyPointsEarned,
        },
      });
    });
  } catch (error) {
    logger.error('Erreur confirmDelivery:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELIVERY_ERROR',
        message: 'Erreur lors de la confirmation',
      },
    });
  }
};

/**
 * Obtenir les gains du livreur
 * - Requêtes transactions en PARALLÈLE (au lieu de séquentielles) pour réduire le temps total
 * - Tout le bloc sous withTimeout pour éviter "- - ms - -" si une requête bloque
 */
exports.getEarnings = async (req, res) => {
  try {
    const run = async () => {
      const deliveryResult = await query(
        `SELECT total_earnings, total_deliveries, available_balance
         FROM delivery_persons WHERE id = $1`,
        [req.user.id]
      );

      if (deliveryResult.rows.length === 0) {
        return { notFound: true };
      }

      const delivery = deliveryResult.rows[0];
      const uid = req.user.id;

      const [todayResult, weekResult, monthResult] = await Promise.all([
        query(
          `SELECT COALESCE(SUM(amount), 0) as today_earnings
           FROM transactions
           WHERE to_user_id = $1 AND to_user_type = 'delivery'
           AND transaction_type = 'delivery_fee'
           AND created_at >= CURRENT_DATE`,
          [uid]
        ),
        query(
          `SELECT COALESCE(SUM(amount), 0) as week_earnings
           FROM transactions
           WHERE to_user_id = $1 AND to_user_type = 'delivery'
           AND transaction_type = 'delivery_fee'
           AND created_at >= DATE_TRUNC('week', CURRENT_DATE)`,
          [uid]
        ),
        query(
          `SELECT COALESCE(SUM(amount), 0) as month_earnings
           FROM transactions
           WHERE to_user_id = $1 AND to_user_type = 'delivery'
           AND transaction_type = 'delivery_fee'
           AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
          [uid]
        ),
      ]);

      const todayEarnings = parseFloat(todayResult.rows[0]?.today_earnings || 0);
      const weekEarnings = parseFloat(weekResult.rows[0]?.week_earnings || 0);
      const monthEarnings = parseFloat(monthResult.rows[0]?.month_earnings || 0);

      return {
        notFound: false,
        data: {
          available_balance: parseFloat(delivery.available_balance ?? 0),
          total_earnings: parseFloat(delivery.total_earnings || 0),
          total_deliveries: Number(delivery.total_deliveries) || 0,
          today: todayEarnings,
          this_week: weekEarnings,
          this_month: monthEarnings,
        },
      };
    };

    const outcome = await withTimeout(run(), DELIVERY_ROUTE_TIMEOUT_MS);

    if (outcome.notFound) {
      return res.status(404).json({
        success: false,
        error: { code: 'DELIVERY_NOT_FOUND', message: 'Livreur non trouvé' },
      });
    }

    return res.json({
      success: true,
      data: outcome.data,
    });
  } catch (error) {
    logger.error('Erreur getEarnings:', error);
    return res.json({
      success: true,
      data: {
        available_balance: 0,
        total_earnings: 0,
        total_deliveries: 0,
        today: 0,
        this_week: 0,
        this_month: 0,
      },
    });
  }
};

/**
 * Dashboard livreur en 1 requête HTTP : earnings + commandes actives + historique récent.
 * Réduit les timeouts et "- - ms - -" (1 seul round-trip, timeout 4s, 200 + données vides en erreur).
 */
exports.getDashboard = async (req, res) => {
  const empty = () => ({
    earnings: {
      available_balance: 0,
      total_earnings: 0,
      total_deliveries: 0,
      today: 0,
      today_deliveries: 0,
      this_week: 0,
      this_month: 0,
      cash_to_remit: 0, // Solde espèces à reverser
    },
    orders: [],
    deliveries: [],
    pagination: { page: 1, limit: 5, total: 0, pages: 0 },
  });

  try {
    const uid = req.user.id;
    const run = async () => {
      const sql = `
        SELECT
          dp.available_balance,
          dp.total_earnings,
          dp.total_deliveries,
          dp.average_rating,
          (SELECT COALESCE(SUM(amount), 0) FROM transactions
           WHERE to_user_id = $1 AND to_user_type = 'delivery' AND transaction_type = 'delivery_fee' AND created_at >= CURRENT_DATE) AS today_fees,
          (SELECT COUNT(*)::int FROM orders
           WHERE delivery_person_id = $1 AND status = 'delivered' AND DATE(delivered_at) = CURRENT_DATE) AS today_deliveries_count,
          (SELECT COALESCE(SUM(amount), 0) FROM transactions
           WHERE to_user_id = $1 AND to_user_type = 'delivery' AND transaction_type = 'delivery_fee' AND created_at >= DATE_TRUNC('week', CURRENT_DATE)) AS week_fees,
          (SELECT COALESCE(SUM(amount), 0) FROM transactions
           WHERE to_user_id = $1 AND to_user_type = 'delivery' AND transaction_type = 'delivery_fee' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)) AS month_fees,
          (SELECT COALESCE(SUM(CASE WHEN o.payment_method = 'cash' AND o.status = 'delivered' AND (o.cash_remittance_id IS NULL OR o.cash_remittance_id IN (SELECT id FROM cash_remittances WHERE status = 'rejected')) THEN o.total ELSE 0 END), 0)
           FROM orders o WHERE o.delivery_person_id = $1 AND o.payment_method = 'cash' AND o.status = 'delivered') AS cash_to_remit,
          COALESCE((
            SELECT json_agg(t)
            FROM (
              SELECT o.id, o.order_number, o.status, o.restaurant_id, o.delivery_fee, o.delivery_address,
                     o.placed_at, o.ready_at, o.delivering_at,
                     (SELECT r.name FROM restaurants r WHERE r.id = o.restaurant_id LIMIT 1) AS restaurant_name
              FROM orders o
              WHERE o.delivery_person_id = $1 AND o.status IN ('ready', 'picked_up', 'delivering', 'driver_at_customer')
              ORDER BY o.created_at DESC LIMIT 20
            ) t
          ), '[]'::json) AS active_orders,
          COALESCE((
            SELECT json_agg(t)
            FROM (
              SELECT o.id, o.order_number, o.status, o.delivery_fee, o.delivery_address,
                     o.placed_at, o.delivered_at, o.created_at,
                     (SELECT r.name FROM restaurants r WHERE r.id = o.restaurant_id LIMIT 1) AS restaurant_name
              FROM orders o
              WHERE o.delivery_person_id = $1 AND o.status = 'delivered'
              ORDER BY o.created_at DESC LIMIT 5
            ) t
          ), '[]'::json) AS history
        FROM delivery_persons dp
        WHERE dp.id = $1`;
      const result = await query(sql, [uid]);
      const row = result.rows[0];
      if (!row) {
        return {
          earnings: { available_balance: 0, total_earnings: 0, total_deliveries: 0, today: 0, today_deliveries: 0, this_week: 0, this_month: 0, cash_to_remit: 0 },
          profile: { average_rating: 0 },
          orders: [],
          deliveries: [],
          pagination: { page: 1, limit: 5, total: 0, pages: 1 },
        };
      }
      const today = parseFloat(row.today_fees ?? 0);
      const todayDeliveries = parseInt(row.today_deliveries_count ?? 0, 10);
      const week = parseFloat(row.week_fees ?? 0);
      const month = parseFloat(row.month_fees ?? 0);
      const cashToRemit = parseFloat(row.cash_to_remit ?? 0);
      let orders = row.active_orders;
      let deliveries = row.history;
      if (typeof orders === 'string') try { orders = JSON.parse(orders); } catch (_) { orders = []; }
      if (typeof deliveries === 'string') try { deliveries = JSON.parse(deliveries); } catch (_) { deliveries = []; }
      if (!Array.isArray(orders)) orders = [];
      if (!Array.isArray(deliveries)) deliveries = [];
      return {
        earnings: {
          available_balance: parseFloat(row.available_balance ?? 0),
          total_earnings: parseFloat(row.total_earnings ?? 0),
          total_deliveries: Number(row.total_deliveries) || 0,
          today,
          today_deliveries: todayDeliveries,
          this_week: week,
          this_month: month,
          cash_to_remit: cashToRemit,
        },
        profile: { average_rating: parseFloat(row.average_rating) || 0 },
        orders,
        deliveries,
        pagination: { page: 1, limit: 5, total: deliveries.length, pages: 1 },
      };
    };

    const data = await withTimeout(run(), DELIVERY_ROUTE_TIMEOUT_MS);
    return res.json({ success: true, data });
  } catch (error) {
    logger.error('Erreur getDashboard:', error);
    return res.json({ success: true, data: empty() });
  }
};

/**
 * Demander un retrait
 * Crée une payout_request visible par l'admin (pas de déduction immédiate, déduction au paiement)
 */
exports.requestPayout = async (req, res) => {
  try {
    const { amount } = req.body;

    return await transaction(async (client) => {
      const deliveryResult = await client.query(
        'SELECT available_balance, mobile_money_number, mobile_money_provider FROM delivery_persons WHERE id = $1',
        [req.user.id]
      );

      const delivery = deliveryResult.rows[0];
      const balance = parseFloat(delivery.available_balance || 0);

      if (balance < amount) {
        return res.status(400).json({
          success: false,
          error: { code: 'INSUFFICIENT_BALANCE', message: 'Solde insuffisant' },
        });
      }

      if (amount < 5000) {
        return res.status(400).json({
          success: false,
          error: { code: 'MINIMUM_AMOUNT', message: 'Pour une demande avant le lundi, montant minimum: 5000 FCFA' },
        });
      }

      if (!delivery.mobile_money_number) {
        return res.status(400).json({
          success: false,
          error: { code: 'MOBILE_MONEY_REQUIRED', message: 'Configurez votre numéro Mobile Money dans les paramètres' },
        });
      }

      // Vérifier qu'il n'y a pas déjà un payout en attente
      const existing = await client.query(
        `SELECT id FROM payout_requests 
         WHERE user_type = 'delivery' AND user_id = $1 AND status IN ('pending', 'paid')`,
        [req.user.id]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'PENDING_PAYOUT', message: 'Vous avez déjà une demande de retrait en cours' },
        });
      }

      // Créer la demande de retrait (visible par l'admin)
      await client.query(
        `INSERT INTO payout_requests (user_type, user_id, amount, payment_method, account_number, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')`,
        ['delivery', req.user.id, amount, delivery.mobile_money_provider || 'mobile_money', delivery.mobile_money_number]
      );

      logger.info(`Demande de retrait: ${amount} FCFA pour livreur ${req.user.id}`);

      res.json({
        success: true,
        message: 'Demande de retrait enregistrée. Traitement sous 24-48h.',
        data: {
          amount,
          new_balance: balance,
        },
      });
    });
  } catch (error) {
    logger.error('Erreur requestPayout:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PAYOUT_ERROR',
        message: 'Erreur lors de la demande',
      },
    });
  }
};

/**
 * Commandes espèces livrées dont la remise n'a pas encore été enregistrée (ou pas encore validée)
 */
exports.getOrdersPendingCashRemittance = async (req, res) => {
  try {
    const result = await query(
      `SELECT o.id, o.order_number, o.total, o.delivered_at, r.name as restaurant_name
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.delivery_person_id = $1
         AND o.status = 'delivered'
         AND o.payment_method = 'cash'
         AND (o.cash_remittance_id IS NULL OR o.cash_remittance_id IN (
           SELECT id FROM cash_remittances WHERE status = 'rejected'
         ))
       ORDER BY o.delivered_at DESC`,
      [req.user.id]
    );
    const totalPending = result.rows.reduce((sum, row) => sum + parseFloat(row.total || 0), 0);
    res.json({
      success: true,
      data: {
        orders: result.rows,
        total_pending_amount: Math.round(totalPending),
      },
    });
  } catch (error) {
    logger.error('Erreur getOrdersPendingCashRemittance:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Déclarer une remise espèces (remise à l'agence ou dépôt sur compte entreprise, sans enlever sa part)
 */
exports.createCashRemittance = async (req, res) => {
  try {
    const { amount, method, order_ids, reference } = req.body;
    if (!amount || amount <= 0 || !method || !order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Montant, méthode (agency, bank_deposit ou mobile_money_deposit) et liste de commandes requis' },
      });
    }
    if (!['agency', 'bank_deposit', 'mobile_money_deposit'].includes(method)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_METHOD', message: 'Méthode doit être agency, bank_deposit ou mobile_money_deposit' },
      });
    }

    return await transaction(async (client) => {
      const ordersResult = await client.query(
        `SELECT id, order_number, total FROM orders
         WHERE delivery_person_id = $1 AND status = 'delivered' AND payment_method = 'cash'
         AND id = ANY($2::uuid[])
         AND (cash_remittance_id IS NULL OR cash_remittance_id IN (SELECT id FROM cash_remittances WHERE status IN ('pending', 'rejected')))`,
        [req.user.id, order_ids]
      );
      if (ordersResult.rows.length !== order_ids.length) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_ORDERS', message: 'Certaines commandes ne sont pas éligibles (pas à vous, pas livrées, pas espèces, ou déjà remises)' },
        });
      }
      const expectedTotal = ordersResult.rows.reduce((s, r) => s + parseFloat(r.total), 0);
      const declaredAmount = parseFloat(amount);
      
      // SÉCURITÉ : Vérification stricte du montant
      if (Math.abs(declaredAmount - expectedTotal) > 0.01) {
        logger.warn(`⚠️ Tentative remise espèces incorrecte - Livreur ${req.user.id}`, {
          declared: declaredAmount,
          expected: expectedTotal,
          difference: declaredAmount - expectedTotal,
          order_ids,
        });
        return res.status(400).json({
          success: false,
          error: { 
            code: 'AMOUNT_MISMATCH', 
            message: `Le montant déclaré (${declaredAmount.toFixed(0)} FCFA) ne correspond pas au total des commandes sélectionnées (${expectedTotal.toFixed(0)} FCFA). Différence: ${(declaredAmount - expectedTotal).toFixed(0)} FCFA` 
          },
        });
      }
      
      // SÉCURITÉ : Vérifier qu'il n'y a pas de remise déjà en cours pour ces commandes
      const existingRemittance = await client.query(
        `SELECT cr.id, cr.amount, cr.status 
         FROM cash_remittances cr
         JOIN cash_remittance_orders cro ON cr.id = cro.remittance_id
         WHERE cro.order_id = ANY($1::uuid[])
         AND cr.status IN ('pending', 'completed')
         AND cr.delivery_person_id = $2
         LIMIT 1`,
        [order_ids, req.user.id]
      );
      
      if (existingRemittance.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'ALREADY_REMITTED', 
            message: 'Certaines commandes ont déjà été déclarées dans une remise précédente' 
          },
        });
      }

      const mobileMoneyProvider = method === 'mobile_money_deposit' ? req.body.mobile_money_provider : null;
      
      const remResult = await client.query(
        `INSERT INTO cash_remittances (delivery_person_id, amount, method, reference, mobile_money_provider, status)
         VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
        [req.user.id, amount, method, reference || null, mobileMoneyProvider]
      );
      const rem = remResult.rows[0];
      for (const row of ordersResult.rows) {
        await client.query(
          `INSERT INTO cash_remittance_orders (remittance_id, order_id, order_total) VALUES ($1, $2, $3)`,
          [rem.id, row.id, row.total]
        );
      }
      logger.info(`Remise espèces déclarée par livreur ${req.user.id}: ${amount} FCFA (${method})`);
      res.status(201).json({
        success: true,
        data: {
          remittance: rem,
          orders_count: ordersResult.rows.length,
          message: method === 'agency'
            ? 'Remise enregistrée. Présentez-vous à l\'agence avec cet argent pour validation.'
            : method === 'mobile_money_deposit'
            ? 'Dépôt Mobile Money enregistré. L\'admin validera après vérification du dépôt.'
            : 'Dépôt bancaire enregistré. Après avoir effectué le virement, l\'admin validera après vérification.',
        },
      });
    });
  } catch (error) {
    logger.error('Erreur createCashRemittance:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'Erreur lors de la déclaration de la remise' },
    });
  }
};

/**
 * Liste des remises espèces du livreur
 */
exports.getMyCashRemittances = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let q = `
      SELECT r.*, a.full_name as processed_by_name,
             (SELECT COUNT(*) FROM cash_remittance_orders WHERE remittance_id = r.id) as orders_count,
             (SELECT json_agg(json_build_object('order_id', o.id, 'order_number', o.order_number, 'order_total', cro.order_total))
              FROM cash_remittance_orders cro JOIN orders o ON o.id = cro.order_id WHERE cro.remittance_id = r.id) as orders
      FROM cash_remittances r
      LEFT JOIN admins a ON r.processed_by = a.id
      WHERE r.delivery_person_id = $1
    `;
    const params = [req.user.id];
    if (status) {
      params.push(status);
      q += ` AND r.status = $${params.length}`;
    }
    q += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);
    const result = await query(q, params);
    const countResult = await query(
      status
        ? 'SELECT COUNT(*) FROM cash_remittances WHERE delivery_person_id = $1 AND status = $2'
        : 'SELECT COUNT(*) FROM cash_remittances WHERE delivery_person_id = $1',
      status ? [req.user.id, status] : [req.user.id]
    );
    res.json({
      success: true,
      data: {
        remittances: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getMyCashRemittances:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Obtenir les informations de remise espèces (numéro Baibebalo, etc.)
 */
exports.getCashRemittanceInfo = async (req, res) => {
  try {
    const config = require('../config');
    const businessConfig = config.business;
    
    res.json({
      success: true,
      data: {
        baibebalo_mobile_money_number: businessConfig.baibebaloMobileMoneyNumber || '+2250787097996',
        baibebalo_mobile_money_provider: businessConfig.baibebaloMobileMoneyProvider || 'orange_money',
      },
    });
  } catch (error) {
    logger.error('Erreur getCashRemittanceInfo:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Obtenir l'historique des livraisons (pagination 1–100, champs ciblés, index composite)
 */
exports.getDeliveryHistory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const status = req.query.status;
    const offset = (page - 1) * limit;

    const values = [req.user.id];
    let paramIdx = 2;

    const selectFields = `o.id, o.order_number, o.status, o.delivery_fee, o.delivery_address,
                         o.placed_at, o.delivered_at, o.created_at,
                         (SELECT r.name FROM restaurants r WHERE r.id = o.restaurant_id LIMIT 1) as restaurant_name`;
    let queryText = `
      SELECT ${selectFields}
      FROM orders o
      WHERE o.delivery_person_id = $1
    `;

    if (status) {
      queryText += ` AND o.status = $${paramIdx}`;
      values.push(status);
      paramIdx += 1;
    }

    queryText += ` ORDER BY o.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    values.push(limit, offset);

    const run = async () => {
      const [result, countResult] = await Promise.all([
        query(queryText, values),
        query(
          status
            ? 'SELECT COUNT(*) FROM orders WHERE delivery_person_id = $1 AND status = $2'
            : 'SELECT COUNT(*) FROM orders WHERE delivery_person_id = $1',
          status ? [req.user.id, status] : [req.user.id]
        ),
      ]);
      return { result, countResult };
    };

    const { result, countResult } = await withTimeout(run(), DELIVERY_ROUTE_TIMEOUT_MS);

    const total = parseInt(countResult.rows[0]?.count, 10) || 0;
    const deliveries = Array.isArray(result?.rows) ? result.rows : [];

    return res.json({
      success: true,
      data: {
        deliveries,
        pagination: {
          page,
          limit,
          total,
          pages: limit > 0 ? Math.ceil(total / limit) : 0,
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getDeliveryHistory:', error);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    return res.json({
      success: true,
      data: {
        deliveries: [],
        pagination: { page, limit, total: 0, pages: 0 },
      },
    });
  }
};

/**
 * Upload preuve de livraison en base64 uniquement (route dédiée sans multer, pour éviter Network Error en RN)
 */
exports.uploadDeliveryProof = async (req, res) => {
  try {
    const { photo_base64 } = req.body || {};
    const base64Data = (typeof photo_base64 === 'string' && photo_base64.includes(','))
      ? photo_base64.split(',')[1]
      : photo_base64;
    if (!base64Data) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_BASE64', message: 'Données image base64 requises' },
      });
    }
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_IMAGE', message: 'Image trop grande ou vide (max 5 Mo)' },
      });
    }
    const file = {
      buffer,
      originalname: `proof_${Date.now()}.jpg`,
      mimetype: 'image/jpeg',
      size: buffer.length,
    };
    const result = await uploadService.uploadToLocal(file, 'delivery-proofs', {
      baseUrl: req.headers.host ? `http://${req.headers.host}` : undefined,
    });
    if (!result.success) throw new Error('Échec upload');
    logger.info(`Preuve livraison uploadée par livreur ${req.user.id}`);
    return res.json({
      success: true,
      message: 'Photo envoyée',
      data: { url: result.url, key: result.key },
    });
  } catch (error) {
    logger.error('Erreur uploadDeliveryProof:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'UPLOAD_ERROR', message: 'Erreur lors de l\'envoi de la photo' },
    });
  }
};

/**
 * Upload un document (CNI, permis, photo profil, etc.)
 * Accepte soit multipart (file) soit JSON avec photo_base64 (tous types, fallback RN pour éviter Network Error multipart)
 */
exports.uploadDocument = async (req, res) => {
  try {
    let file = req.file;
    const { document_type, photo_base64 } = req.body || {};

    // Fallback pour app React Native : envoi en base64 (évite les soucis multipart / Network Error)
    if (!file && photo_base64 && document_type) {
      try {
        const base64Data = (typeof photo_base64 === 'string' && photo_base64.includes(','))
          ? photo_base64.split(',')[1]
          : photo_base64;
        if (!base64Data) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_BASE64', message: 'Données image base64 invalides' },
          });
        }
        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.length === 0 || buffer.length > (5 * 1024 * 1024)) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_IMAGE', message: 'Image trop grande ou vide (max 5 Mo)' },
          });
        }
        file = {
          buffer,
          originalname: `doc_${document_type}_${Date.now()}.jpg`,
          mimetype: 'image/jpeg',
          size: buffer.length,
        };
      } catch (e) {
        logger.warn('Upload document base64 échoué:', e.message);
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_BASE64', message: 'Format base64 invalide' },
        });
      }
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'Aucun fichier fourni (envoyez "file" en multipart ou "photo_base64" + document_type en JSON pour preuve de livraison)' },
      });
    }

    // Types de documents valides (incluant recto/verso + preuve de livraison)
    const validTypes = [
      'id_card', 'id_card_recto', 'id_card_verso',
      'driver_license', 'driver_license_recto', 'driver_license_verso',
      'vehicle_registration', 'vehicle_registration_recto', 'vehicle_registration_verso',
      'insurance_document', 'profile_photo',
      // Types utilisés dans l'inscription
      'cni_recto', 'cni_verso', 'permis_recto', 'permis_verso',
      'carte_grise_recto', 'carte_grise_verso', 'assurance', 'photo_moto',
      'certificat_residence', 'photo_recente',
      'delivery_proof', 'incident_photo'
    ];
    
    if (document_type && !validTypes.includes(document_type)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TYPE', message: 'Type de document invalide' },
      });
    }

    // Déterminer le dossier selon le type
    const folder = document_type === 'profile_photo'
      ? 'delivery-profiles'
      : document_type === 'delivery_proof'
        ? 'delivery-proofs'
        : document_type === 'incident_photo'
          ? 'delivery-incidents'
          : 'delivery-documents';

    // Upload le fichier
    const result = await uploadService.uploadToLocal(file, folder, {
      baseUrl: `http://${req.headers.host}`,
    });

    if (!result.success) {
      throw new Error('Échec de l\'upload');
    }

    // Mapper les types d'inscription vers les colonnes de la BDD
    const columnMapping = {
      'cni_recto': 'id_card_recto',
      'cni_verso': 'id_card_verso',
      'permis_recto': 'driver_license_recto',
      'permis_verso': 'driver_license_verso',
      'carte_grise_recto': 'vehicle_registration_recto',
      'carte_grise_verso': 'vehicle_registration_verso',
      'assurance': 'insurance_document',
      'photo_moto': 'vehicle_photo',
      'photo_recente': 'profile_photo',
    };

    const columnName = columnMapping[document_type] || document_type;

    // Mettre à jour le profil si un type de document est spécifié
    if (document_type && columnName) {
      // Vérifier si la colonne existe
      const validColumns = [
        'id_card', 'id_card_recto', 'id_card_verso',
        'driver_license', 'driver_license_recto', 'driver_license_verso',
        'vehicle_registration', 'vehicle_registration_recto', 'vehicle_registration_verso',
        'insurance_document', 'profile_photo', 'vehicle_photo'
      ];
      
      if (validColumns.includes(columnName)) {
        await query(
          `UPDATE delivery_persons SET ${columnName} = $1, updated_at = NOW() WHERE id = $2`,
          [result.url, req.user.id]
        );
      }
    }

    logger.info(`Document uploadé par livreur ${req.user.id}: ${document_type || 'general'}`);

    res.json({
      success: true,
      message: 'Document téléchargé avec succès',
      data: {
        url: result.url,
        key: result.key,
        document_type,
      },
    });
  } catch (error) {
    logger.error('Erreur uploadDocument:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPLOAD_ERROR', message: 'Erreur lors du téléchargement du fichier' },
    });
  }
};

/**
 * Vérifier le statut du livreur (accessible même si compte en attente)
 * Utilisé par l'écran "En attente de validation" pour le bouton "Vérifier statut"
 */
exports.getCheckStatus = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM delivery_persons WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'DELIVERY_NOT_FOUND', message: 'Livreur non trouvé' },
      });
    }

    const deliveryPerson = result.rows[0];
    const status = deliveryPerson.status || 'pending';

    const data = { status };
    if (status === 'active') {
      data.delivery_person = deliveryPerson;
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Erreur getCheckStatus:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la vérification' },
    });
  }
};

/**
 * Obtenir le profil du livreur connecté (réponse rapide <200ms, SELECT ciblé)
 */
exports.getMyProfile = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, phone, first_name, last_name, status, delivery_status,
              vehicle_type, vehicle_plate, average_rating, total_deliveries,
              profile_photo, mobile_money_number, mobile_money_provider,
              current_latitude, current_longitude, created_at, updated_at
       FROM delivery_persons WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'DELIVERY_NOT_FOUND', message: 'Livreur non trouvé' },
      });
    }

    return res.json({
      success: true,
      data: { delivery_person: result.rows[0] },
    });
  } catch (error) {
    logger.error('Erreur getMyProfile:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Mettre à jour le profil
 */
exports.updateMyProfile = async (req, res) => {
  try {
    const { 
      first_name, last_name, vehicle_type, vehicle_plate, 
      mobile_money_number, mobile_money_provider,
      availability_hours, work_zones, preferences, notification_preferences
    } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (first_name) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(first_name);
    }
    if (last_name) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(last_name);
    }
    if (vehicle_type) {
      updates.push(`vehicle_type = $${paramIndex++}`);
      values.push(vehicle_type);
    }
    if (vehicle_plate !== undefined) {
      updates.push(`vehicle_plate = $${paramIndex++}`);
      values.push(vehicle_plate && String(vehicle_plate).trim() ? String(vehicle_plate).trim() : null);
    }
    if (mobile_money_number !== undefined) {
      const trimmed = String(mobile_money_number || '').trim().replace(/\s/g, '');
      const normalized = trimmed.startsWith('+') ? trimmed : (trimmed.startsWith('225') ? `+${trimmed}` : `+225${trimmed}`);
      updates.push(`mobile_money_number = $${paramIndex++}`);
      values.push(normalized || null);
    }
    if (mobile_money_provider !== undefined) {
      updates.push(`mobile_money_provider = $${paramIndex++}`);
      values.push(mobile_money_provider && String(mobile_money_provider).trim() ? String(mobile_money_provider).trim() : null);
    }
    if (availability_hours !== undefined) {
      updates.push(`availability_hours = $${paramIndex++}`);
      values.push(typeof availability_hours === 'string' ? availability_hours : JSON.stringify(availability_hours));
    }
    if (work_zones !== undefined) {
      updates.push(`work_zones = $${paramIndex++}`);
      values.push(typeof work_zones === 'string' ? work_zones : JSON.stringify(work_zones));
    }
    if (preferences !== undefined) {
      updates.push(`preferences = $${paramIndex++}`);
      values.push(typeof preferences === 'string' ? preferences : JSON.stringify(preferences));
    }
    if (notification_preferences !== undefined) {
      updates.push(`notification_preferences = $${paramIndex++}`);
      values.push(typeof notification_preferences === 'string' ? notification_preferences : JSON.stringify(notification_preferences));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_UPDATES', message: 'Aucune donnée à mettre à jour' },
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.user.id);

    const result = await query(
      `UPDATE delivery_persons SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'DELIVERY_NOT_FOUND', message: 'Livreur non trouvé' },
      });
    }

    logger.info(`Profil livreur mis à jour: ${req.user.id}`);

    res.json({
      success: true,
      message: 'Profil mis à jour',
      data: { delivery_person: result.rows[0] },
    });
  } catch (error) {
    logger.error('Erreur updateMyProfile:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' },
    });
  }
};

/**
 * Commandes actives : colonnes minimales, 1 JOIN, statuts = ready|delivering (pas picked_up en DB), LIMIT 20
 */
exports.getActiveOrders = async (req, res) => {
  try {
    const result = await withTimeout(
      query(
        `SELECT o.id, o.order_number, o.status, o.restaurant_id, o.delivery_fee,
                o.delivery_address, o.delivery_distance, o.payment_method, o.total,
                o.placed_at, o.ready_at, o.delivering_at,
                (SELECT r.name FROM restaurants r WHERE r.id = o.restaurant_id LIMIT 1) as restaurant_name
         FROM orders o
         WHERE o.delivery_person_id = $1
           AND o.status IN ('ready', 'picked_up', 'delivering', 'driver_at_customer')
         ORDER BY o.created_at DESC
         LIMIT 20`,
        [req.user.id]
      ),
      DELIVERY_ROUTE_TIMEOUT_MS
    );
    
    const { calculateEstimatedEarnings } = require('../utils/earnings');
    const orders = Array.isArray(result?.rows) ? result.rows.map(order => {
      // Calculer les gains estimés au lieu d'utiliser delivery_fee brut
      const estimatedEarnings = calculateEstimatedEarnings(
        parseFloat(order.delivery_fee || 0),
        parseFloat(order.delivery_distance || 0),
        order.placed_at ? new Date(order.placed_at) : new Date()
      );
      
      return {
        ...order,
        estimated_earnings: estimatedEarnings,
      };
    }) : [];
    
    return res.json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    logger.error('Erreur getActiveOrders:', error);
    return res.json({
      success: true,
      data: { orders: [] },
    });
  }
};

/**
 * Refuser une livraison
 */
exports.declineDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Vérifier si la commande est assignée à ce livreur ou disponible
    const orderResult = await query(
      `SELECT * FROM orders WHERE id = $1 AND (delivery_person_id = $2 OR delivery_person_id IS NULL)`,
      [id, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
      });
    }

    const order = orderResult.rows[0];
    const config = require('../config');
    let penaltyApplied = false;
    let penaltyAmount = 0;

    // Si la commande était assignée au livreur, c'est une ANNULATION après acceptation
    // → Pénalité de 500 FCFA
    if (order.delivery_person_id === req.user.id) {
      penaltyAmount = config.business.deliveryPenaltyCancellationAmount || 500;
      
      // Appliquer la pénalité
      await query(
        `UPDATE delivery_persons 
         SET total_earnings = GREATEST(0, total_earnings - $1),
             available_balance = GREATEST(0, available_balance - $1),
             total_penalties = COALESCE(total_penalties, 0) + $1
         WHERE id = $2`,
        [penaltyAmount, req.user.id]
      );
      
      // Enregistrer la transaction de pénalité
      await query(
        `INSERT INTO transactions (
          order_id, transaction_type, amount,
          from_user_type, from_user_id,
          to_user_type, to_user_id,
          status, payment_method, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          order.id, 'penalty_cancellation', -penaltyAmount,
          'delivery', req.user.id,
          'platform', null,
          'completed', 'internal',
          JSON.stringify({ reason: reason || 'Annulation après acceptation' }),
        ]
      );
      
      penaltyApplied = true;
      logger.warn(`Pénalité d'annulation appliquée au livreur ${req.user.id}: -${penaltyAmount} FCFA`);
      
      // Réassigner la commande (proposer à un autre livreur sera fait par le cron ou manuellement)
      await query(
        `UPDATE orders SET delivery_person_id = NULL, proposed_delivery_person_id = NULL, proposal_expires_at = NULL, status = 'ready', updated_at = NOW() WHERE id = $1`,
        [id]
      );
      const deliveryProposalService = require('../services/deliveryProposal.service');
      await deliveryProposalService.clearProposalAndProposeNext(id, req.app);
      
      // Notifier le livreur de la pénalité
      try {
        const notificationService = require('../services/notification.service');
        await notificationService.sendToUser(req.user.id, 'delivery', {
          title: '⚠️ Pénalité appliquée',
          body: `Une pénalité de ${penaltyAmount} FCFA a été appliquée pour annulation de course.`,
          type: 'penalty',
          data: { amount: penaltyAmount, reason: 'cancellation' },
          channel: 'alerts',
        });
      } catch (e) {
        // Ignorer l'erreur de notification
      }
    } else if (!order.delivery_person_id) {
      // Vérifier si ce livreur a une proposition en cours
      const propResult = await query(
        `SELECT 1 FROM order_delivery_proposals WHERE order_id = $1 AND delivery_person_id = $2 AND expires_at > NOW()`,
        [id, req.user.id]
      );
      if (propResult.rows.length > 0) {
        // Refus de la proposition — pas de pénalité, proposer aux 3 suivants
        const deliveryProposalService = require('../services/deliveryProposal.service');
        await deliveryProposalService.clearProposalAndProposeNext(id, req.app);
      }
    }

    // Logger le refus
    await query(
      `INSERT INTO audit_logs (user_type, user_id, action, resource_type, resource_id, new_values)
       VALUES ('delivery', $1, 'decline_order', 'order', $2, $3)`,
      [req.user.id, id, JSON.stringify({ 
        reason: reason || 'Non spécifié',
        was_assigned: order.delivery_person_id === req.user.id,
        penalty_applied: penaltyApplied,
        penalty_amount: penaltyAmount,
      })]
    );

    logger.info(`Commande ${id} refusée par livreur ${req.user.id}${penaltyApplied ? ` (pénalité: ${penaltyAmount} FCFA)` : ''}`);

    res.json({
      success: true,
      message: penaltyApplied 
        ? `Livraison annulée. Pénalité de ${penaltyAmount} FCFA appliquée.`
        : 'Livraison refusée',
      data: penaltyApplied ? {
        penalty: {
          applied: true,
          amount: penaltyAmount,
          reason: 'Annulation après acceptation',
        },
      } : null,
    });
  } catch (error) {
    logger.error('Erreur declineDelivery:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors du refus' },
    });
  }
};

/**
 * Arriver au restaurant
 */
exports.arriveAtRestaurant = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE orders 
       SET arrived_at_restaurant = NOW(),
           status = CASE WHEN status = 'ready' THEN 'delivering' ELSE status END
       WHERE id = $1 AND delivery_person_id = $2 AND status IN ('ready', 'delivering', 'accepted', 'picked_up')
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
      });
    }

    const order = result.rows[0];

    // Notifier le restaurant (Socket + push)
    const partnersIoArrived = req.app.get('partnersIo');
    if (order.restaurant_id) {
      if (partnersIoArrived) {
        partnersIoArrived.to(`restaurant_${order.restaurant_id}`).emit('delivery_arrived', {
          order_id: id,
          order_number: order.order_number,
        });
      }
      try {
        const notificationService = require('../services/notification.service');
        await notificationService.sendOrderNotification(id, 'restaurant', 'delivery_arrived');
      } catch (notifErr) {
        logger.warn('Push restaurant (arrive au restaurant) ignorée', { error: notifErr.message });
      }
    }

    // Notifier le client : statut "Livraison en cours"
    const { emitToOrder } = require('../utils/socketEmitter');
    emitToOrder(req.app, id, 'order_status_changed', {
      order_id: id,
      status: order.status,
    });

    logger.info(`Livreur arrivé au restaurant pour commande ${order.order_number}`);

    res.json({
      success: true,
      message: 'Arrivée au restaurant confirmée',
    });
  } catch (error) {
    logger.error('Erreur arriveAtRestaurant:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' },
    });
  }
};

/**
 * Arriver chez le client
 */
exports.arriveAtCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE orders 
       SET arrived_at_customer = NOW(),
           status = 'driver_at_customer'
       WHERE id = $1 AND delivery_person_id = $2 AND status IN ('picked_up', 'delivering')
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
      });
    }

    const order = result.rows[0];

    // Notifier le client : Socket + push "Livreur arrivé chez vous"
    const { emitToOrder } = require('../utils/socketEmitter');
    emitToOrder(req.app, id, 'delivery_arrived_at_customer', {
      order_id: id,
      message: 'Votre livreur est arrivé!',
    });
    emitToOrder(req.app, id, 'order_status_changed', {
      order_id: id,
      status: 'driver_at_customer',
    });
    try {
      const notificationService = require('../services/notification.service');
      await notificationService.sendOrderNotification(id, 'client', 'delivery_arrived_at_customer');
    } catch (notifErr) {
      logger.warn('Push client (arrivée chez le client) ignorée', { error: notifErr.message });
    }

    // Envoyer SMS au client
    const userResult = await query('SELECT phone FROM users WHERE id = $1', [order.user_id]);
    if (userResult.rows[0]?.phone) {
      try {
        const smsService = require('../services/sms.service');
        await smsService.sendOrderNotification(
          userResult.rows[0].phone,
          order.order_number,
          'arrived'
        );
      } catch (smsError) {
        logger.warn('Échec envoi SMS client (arriveAtCustomer)', { error: smsError.message });
      }
    }

    logger.info(`Livreur arrivé chez le client pour commande ${order.order_number}`);

    res.json({
      success: true,
      message: 'Arrivée chez le client confirmée',
    });
  } catch (error) {
    logger.error('Erreur arriveAtCustomer:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' },
    });
  }
};

/**
 * Obtenir les demandes de paiement du livreur (depuis payout_requests)
 */
exports.getPayoutRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT id, amount, status, payment_transaction_id as payment_reference, created_at, paid_at as completed_at
       FROM payout_requests
       WHERE user_type = 'delivery' AND user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), parseInt(offset)]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM payout_requests WHERE user_type = 'delivery' AND user_id = $1`,
      [req.user.id]
    );

    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        payouts: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getPayoutRequests:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Obtenir les statistiques
 */
exports.getStatistics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFilter = '';
    let dateFilterTransactions = '';
    switch (period) {
      case 'today':
        dateFilter = 'AND o.delivered_at >= CURRENT_DATE';
        dateFilterTransactions = 'AND t.created_at >= CURRENT_DATE';
        break;
      case 'week':
        dateFilter = "AND o.delivered_at >= DATE_TRUNC('week', CURRENT_DATE)";
        dateFilterTransactions = "AND t.created_at >= DATE_TRUNC('week', CURRENT_DATE)";
        break;
      case 'month':
        dateFilter = "AND o.delivered_at >= DATE_TRUNC('month', CURRENT_DATE)";
        dateFilterTransactions = "AND t.created_at >= DATE_TRUNC('month', CURRENT_DATE)";
        break;
      case 'year':
        dateFilter = "AND o.delivered_at >= DATE_TRUNC('year', CURRENT_DATE)";
        dateFilterTransactions = "AND t.created_at >= DATE_TRUNC('year', CURRENT_DATE)";
        break;
    }

    // Statistiques globales des commandes (orders n'a pas delivery_rating, c'est dans reviews)
    const statsResult = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'delivered') as total_delivered,
        COUNT(*) FILTER (WHERE status = 'cancelled') as total_cancelled,
        COALESCE(SUM(delivery_fee), 0) as total_delivery_fees,
        COALESCE(SUM(COALESCE(delivery_distance, 0)), 0) as total_distance
       FROM orders o
       WHERE delivery_person_id = $1 ${dateFilter}`,
      [req.user.id]
    );

    // Note moyenne et nombre d'avis sur la période (table reviews)
    const ratingFilter = period === 'today'
      ? 'AND o.delivered_at >= CURRENT_DATE'
      : period === 'week'
        ? "AND o.delivered_at >= DATE_TRUNC('week', CURRENT_DATE)"
        : period === 'year'
          ? "AND o.delivered_at >= DATE_TRUNC('year', CURRENT_DATE)"
          : "AND o.delivered_at >= DATE_TRUNC('month', CURRENT_DATE)";
    const ratingResult = await query(
      `SELECT
        COALESCE(AVG(r.delivery_rating), 0) as avg_rating,
        COUNT(*) as total_rated
       FROM reviews r
       INNER JOIN orders o ON o.id = r.order_id AND o.delivery_person_id = $1 ${ratingFilter}
       WHERE r.delivery_person_id = $1 AND r.delivery_rating IS NOT NULL`,
      [req.user.id]
    );

    // Gains réels depuis les transactions (inclut bonus et pénalités)
    const earningsResult = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_earned,
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_penalties,
        COALESCE(SUM(CASE WHEN transaction_type = 'daily_goal_bonus' THEN amount ELSE 0 END), 0) as total_daily_bonuses,
        COALESCE(SUM(amount), 0) as net_earnings
       FROM transactions t
       WHERE to_user_id = $1 AND to_user_type = 'delivery' ${dateFilterTransactions}`,
      [req.user.id]
    );

    // Livraisons par jour (7 derniers jours)
    const dailyResult = await query(
      `SELECT 
        DATE(delivered_at) as date,
        COUNT(*) as count,
        SUM(delivery_fee) as earnings,
        SUM(COALESCE(delivery_distance, 0)) as distance
       FROM orders
       WHERE delivery_person_id = $1 
       AND status = 'delivered'
       AND delivered_at >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY DATE(delivered_at)
       ORDER BY date DESC`,
      [req.user.id]
    );

    // Profil du livreur pour les stats cumulées
    const profileResult = await query(
      `SELECT total_deliveries, total_earnings, total_distance, total_penalties, available_balance, average_rating
       FROM delivery_persons WHERE id = $1`,
      [req.user.id]
    );

    const stats = statsResult.rows[0];
    const ratingRow = ratingResult.rows[0];
    const earnings = earningsResult.rows[0];
    const profile = profileResult.rows[0] || {};
    const totalDelivered = parseInt(stats.total_delivered) || 0;
    const totalCancelled = parseInt(stats.total_cancelled) || 0;
    const total = totalDelivered + totalCancelled;

    // Config pour référence
    const config = require('../config');
    const businessConfig = config.business;

    res.json({
      success: true,
      data: {
        period,
        summary: {
          // Statistiques de la période
          total_deliveries: totalDelivered,
          total_cancelled: totalCancelled,
          completion_rate: total > 0 ? Math.round((totalDelivered / total) * 100) : 100,
          average_rating: parseFloat(ratingRow?.avg_rating) || parseFloat(profile.average_rating) || 0,
          total_reviews: parseInt(ratingRow?.total_rated) || 0,
          
          // Gains de la période
          total_delivery_fees: parseFloat(stats.total_delivery_fees) || 0,
          total_earned: parseFloat(earnings.total_earned) || 0,
          total_penalties: parseFloat(earnings.total_penalties) || 0,
          total_daily_bonuses: parseFloat(earnings.total_daily_bonuses) || 0,
          net_earnings: parseFloat(earnings.net_earnings) || 0,
          
          // Distance de la période
          total_distance_km: parseFloat(stats.total_distance) || 0,
        },
        // Statistiques cumulées (depuis le début)
        cumulative: {
          total_deliveries: parseInt(profile.total_deliveries) || 0,
          total_earnings: parseFloat(profile.total_earnings) || 0,
          total_distance_km: parseFloat(profile.total_distance) || 0,
          total_penalties: parseFloat(profile.total_penalties) || 0,
          available_balance: parseFloat(profile.available_balance) || 0,
        },
        daily_stats: dailyResult.rows.map(d => ({
          date: d.date,
          deliveries: parseInt(d.count),
          earnings: parseFloat(d.earnings),
          distance_km: parseFloat(d.distance) || 0,
        })),
        // Référence des bonus/pénalités
        config: {
          delivery_percentage: businessConfig.deliveryPersonPercentage || 70,
          bonus_long_distance_threshold_km: businessConfig.deliveryBonusLongDistanceThreshold || 5,
          bonus_long_distance_amount: businessConfig.deliveryBonusLongDistanceAmount || 200,
          bonus_peak_hour_amount: businessConfig.deliveryBonusPeakHourAmount || 100,
          bonus_weekend_percent: businessConfig.deliveryBonusWeekendPercent || 10,
          daily_goal_target: businessConfig.deliveryDailyGoalTarget || 10,
          daily_goal_bonus: businessConfig.deliveryDailyGoalBonusAmount || 2000,
          penalty_late_threshold_min: businessConfig.deliveryPenaltyLateThreshold || 15,
          penalty_late_amount: businessConfig.deliveryPenaltyLateAmount || 200,
          penalty_cancellation_amount: businessConfig.deliveryPenaltyCancellationAmount || 500,
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getStatistics:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Obtenir les avis reçus par le livreur (depuis la table reviews)
 */
exports.getMyReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const pageNum = Math.max(1, parseInt(page, 10));

    // Récupérer les avis depuis la table reviews (delivery_rating, comment)
    const reviewsResult = await query(
      `SELECT 
        r.id,
        o.order_number,
        r.delivery_rating as rating,
        r.comment,
        r.created_at,
        u.first_name as customer_name,
        rest.name as restaurant_name
       FROM reviews r
       INNER JOIN orders o ON o.id = r.order_id
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN restaurants rest ON o.restaurant_id = rest.id
       WHERE r.delivery_person_id = $1 
       AND r.delivery_rating IS NOT NULL
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limitNum, (pageNum - 1) * limitNum]
    );

    // Compter le total
    const countResult = await query(
      `SELECT COUNT(*) FROM reviews 
       WHERE delivery_person_id = $1 
       AND delivery_rating IS NOT NULL`,
      [req.user.id]
    );

    // Calculer la note moyenne
    const avgResult = await query(
      `SELECT
        COALESCE(AVG(delivery_rating), 0) as average_rating,
        COUNT(*) as total_reviews
       FROM reviews
       WHERE delivery_person_id = $1
       AND delivery_rating IS NOT NULL`,
      [req.user.id]
    );

    const total = parseInt(countResult.rows[0].count);
    const averageRating = parseFloat(avgResult.rows[0].average_rating) || 0;

    res.json({
      success: true,
      data: {
        reviews: reviewsResult.rows.map(review => ({
          id: review.id,
          order_number: review.order_number,
          rating: parseFloat(review.rating) || 0,
          comment: review.comment || '',
          customer_name: review.customer_name || 'Client',
          restaurant_name: review.restaurant_name || 'Restaurant',
          created_at: review.created_at,
        })),
        summary: {
          average_rating: Math.round(averageRating * 10) / 10,
          total_reviews: parseInt(avgResult.rows[0].total_reviews) || 0,
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getMyReviews:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des avis' },
    });
  }
};

/**
 * Classement des livreurs (leaderboard) - pour l'écran Stats > Classement
 * Données depuis la base : nombre de livraisons par livreur sur la période
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const { period = 'week', limit = 20 } = req.query;
    const periodDays = period === 'month' ? 30 : 7;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 50);

    const result = await query(
      `SELECT 
        dp.id,
        dp.first_name,
        dp.last_name,
        COUNT(o.id) FILTER (WHERE o.status = 'delivered' AND o.delivered_at >= CURRENT_DATE - ($2)::integer) as deliveries
       FROM delivery_persons dp
       LEFT JOIN orders o ON o.delivery_person_id = dp.id
       WHERE dp.status = 'active'
       GROUP BY dp.id, dp.first_name, dp.last_name
       ORDER BY deliveries DESC
       LIMIT $1`,
      [limitNum, periodDays]
    );

    const rankings = result.rows.map((row, index) => ({
      id: row.id,
      name: [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Livreur',
      deliveries: parseInt(row.deliveries, 10) || 0,
      rank: index + 1,
      isYou: row.id === req.user.id,
    }));

    const myEntry = rankings.find((r) => r.id === req.user.id);
    const myRank = myEntry
      ? {
          rank: myEntry.rank,
          deliveries: myEntry.deliveries,
          name: myEntry.name,
        }
      : null;

    res.json({
      success: true,
      data: {
        rankings,
        my_rank: myRank,
        period,
      },
    });
  } catch (error) {
    logger.error('Erreur getLeaderboard:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération du classement' },
    });
  }
};

/**
 * Contacter le support
 */
exports.contactSupport = async (req, res) => {
  try {
    const { subject, message, order_id } = req.body;

    // Créer un ticket de support
    const result = await query(
      `INSERT INTO support_tickets (
        ticket_number, user_type, user_id, order_id,
        category, priority, subject, description, status
      )
      VALUES (
        generate_ticket_number(), 'delivery', $1, $2,
        'delivery', 'medium', $3, $4, 'open'
      )
      RETURNING *`,
      [req.user.id, order_id || null, subject, message]
    );

    const ticket = result.rows[0];

    // Ajouter le premier message dans ticket_messages
    await query(
      `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message)
       VALUES ($1, 'delivery', $2, $3)`,
      [ticket.id, req.user.id, message]
    );

    logger.info(`Ticket support créé par livreur ${req.user.id}: ${ticket.ticket_number}`);

    res.status(201).json({
      success: true,
      message: 'Votre message a été envoyé. Le support vous répondra sous peu.',
      data: {
        ticket: {
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          subject: ticket.subject,
          status: ticket.status,
          created_at: ticket.created_at,
        },
      },
    });
  } catch (error) {
    logger.error('Erreur contactSupport:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'Erreur lors de l\'envoi du message' },
    });
  }
};

/**
 * Obtenir toutes les conversations de support du livreur
 */
exports.getSupportConversations = async (req, res) => {
  try {
    const result = await query(
      `SELECT t.*, 
        (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) as message_count,
        (SELECT message FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
        0 as unread_count
       FROM support_tickets t
       WHERE t.user_id = $1 AND t.user_type = 'delivery'
       ORDER BY COALESCE((SELECT created_at FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY created_at DESC LIMIT 1), t.created_at) DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: { conversations: result.rows },
    });
  } catch (error) {
    logger.error('Erreur getSupportConversations:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Obtenir les messages d'un ticket spécifique
 */
exports.getSupportMessages = async (req, res) => {
  try {
    const { ticketId } = req.params;

    // Vérifier que le ticket appartient au livreur
    const ticketResult = await query(
      `SELECT * FROM support_tickets WHERE id = $1 AND user_id = $2 AND user_type = 'delivery'`,
      [ticketId, req.user.id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Conversation non trouvée' },
      });
    }

    // Récupérer les messages (exclure les notes internes admin)
    const messagesResult = await query(
      `SELECT * FROM ticket_messages WHERE ticket_id = $1 ORDER BY created_at ASC`,
      [ticketId]
    );
    const messages = messagesResult.rows.filter(m => m.is_internal !== true);

    res.json({
      success: true,
      data: {
        ticket: ticketResult.rows[0],
        messages,
      },
    });
  } catch (error) {
    logger.error('Erreur getSupportMessages:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Envoyer un message dans un ticket existant
 */
exports.sendSupportMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;

    // Vérifier que le ticket appartient au livreur et est ouvert
    const ticketResult = await query(
      `SELECT * FROM support_tickets WHERE id = $1 AND user_id = $2 AND user_type = 'delivery'`,
      [ticketId, req.user.id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Conversation non trouvée' },
      });
    }

    const ticket = ticketResult.rows[0];

    if (ticket.status === 'closed') {
      return res.status(400).json({
        success: false,
        error: { code: 'TICKET_CLOSED', message: 'Cette conversation est fermée' },
      });
    }

    // Ajouter le message
    const result = await query(
      `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message)
       VALUES ($1, 'delivery', $2, $3)
       RETURNING *`,
      [ticketId, req.user.id, message]
    );

    // Mettre à jour le ticket
    await query(
      `UPDATE support_tickets SET updated_at = NOW() WHERE id = $1`,
      [ticketId]
    );

    res.status(201).json({
      success: true,
      data: { message: result.rows[0] },
    });
  } catch (error) {
    logger.error('Erreur sendSupportMessage:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SEND_ERROR', message: 'Erreur lors de l\'envoi' },
    });
  }
};

/**
 * ═══════════════════════════════════════════════════════════
 * GESTION DES PROBLÈMES
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Signaler un problème avec une commande
 */
exports.reportIssue = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const { issue_type, description, photos = [], latitude, longitude } = req.body;
    const deliveryPersonId = req.user.id;

    // Vérifier que la commande appartient au livreur
    const orderResult = await query(
      'SELECT * FROM orders WHERE id = $1 AND delivery_person_id = $2',
      [orderId, deliveryPersonId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Commande non trouvée ou ne vous appartient pas',
        },
      });
    }

    // Créer un ticket de support automatique
    const ticketResult = await query(
      `INSERT INTO support_tickets (
        ticket_number, user_type, user_id, order_id,
        category, priority, subject, description, photos, status
      )
      VALUES (
        generate_ticket_number(), 'delivery', $1, $2,
        'delivery', 'high', $3, $4, $5, 'open'
      )
      RETURNING *`,
      [
        deliveryPersonId,
        orderId,
        `Problème livreur: ${issue_type}`,
        description,
        photos,
      ]
    );

    // Mettre à jour la position si fournie
    if (latitude && longitude) {
      await query(
        `UPDATE delivery_persons 
         SET current_latitude = $1, current_longitude = $2, last_location_update = NOW()
         WHERE id = $3`,
        [latitude, longitude, deliveryPersonId]
      );
    }

    // Logger l'action
    await query(
      `INSERT INTO audit_logs (user_type, user_id, action, resource_type, resource_id, new_values)
       VALUES ('delivery', $1, 'report_issue', 'order', $2, $3)`,
      [deliveryPersonId, orderId, JSON.stringify({ issue_type, description })]
    );

    logger.info(`Problème signalé par livreur ${deliveryPersonId} sur commande ${orderId}`);

    res.status(201).json({
      success: true,
      message: 'Problème signalé. Le support vous contactera sous peu.',
      data: {
        ticket: ticketResult.rows[0],
        order_id: orderId,
      },
    });

  } catch (error) {
    logger.error('Erreur reportIssue:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REPORT_ERROR',
        message: 'Erreur lors du signalement du problème',
      },
    });
  }
};

/**
 * Gérer client absent (procédure complète)
 */
exports.handleClientAbsent = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const { attempts, action, neighbor_info } = req.body;
    const deliveryPersonId = req.user.id;

    // Vérifier la commande
    const orderResult = await query(
      'SELECT * FROM orders WHERE id = $1 AND delivery_person_id = $2',
      [orderId, deliveryPersonId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
      });
    }

    const order = orderResult.rows[0];

    // Si retour au restaurant
    if (action === 'return_restaurant') {
      await query(
        `UPDATE orders 
         SET status = 'cancelled',
             cancellation_reason = 'Client absent après ' || $1 || ' tentatives',
             cancelled_by = 'delivery',
             cancelled_at = NOW()
         WHERE id = $2`,
        [attempts, orderId]
      );

      // Rémunération partielle (50% des frais de livraison)
      const partialEarnings = Math.round(order.delivery_fee * 0.5);
      await query(
        `UPDATE delivery_persons 
         SET balance = balance + $1, total_earnings = total_earnings + $1
         WHERE id = $2`,
        [partialEarnings, deliveryPersonId]
      );

      return res.json({
        success: true,
        message: 'Commande annulée. Rémunération partielle accordée.',
        data: {
          earnings: partialEarnings,
          reason: 'Client absent',
        },
      });
    }

    // Si laisser chez voisin
    if (action === 'leave_neighbor' && neighbor_info) {
      await query(
        `UPDATE orders 
         SET status = 'delivered',
             delivered_at = NOW(),
             special_instructions = 'Livré chez voisin: ' || $1
         WHERE id = $2`,
        [JSON.stringify(neighbor_info), orderId]
      );

      return res.json({
        success: true,
        message: 'Commande laissée chez le voisin',
        data: { neighbor_info },
      });
    }

    // Si annulation
    if (action === 'cancel') {
      await query(
        `UPDATE orders 
         SET status = 'cancelled',
             cancellation_reason = 'Client absent - Annulé par livreur',
             cancelled_by = 'delivery',
             cancelled_at = NOW()
         WHERE id = $1`,
        [orderId]
      );

      return res.json({
        success: true,
        message: 'Commande annulée',
      });
    }

    res.json({
      success: true,
      message: 'Situation enregistrée. Continuez d\'attendre.',
    });

  } catch (error) {
    logger.error('Erreur handleClientAbsent:', error);
    res.status(500).json({
      success: false,
      error: { code: 'HANDLE_ERROR', message: 'Erreur lors de la gestion' },
    });
  }
};

/**
 * Gérer adresse incorrecte
 */
exports.handleWrongAddress = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const { correct_address, correct_latitude, correct_longitude, additional_distance_km = 0 } = req.body;
    const deliveryPersonId = req.user.id;

    // Vérifier la commande
    const orderResult = await query(
      'SELECT * FROM orders WHERE id = $1 AND delivery_person_id = $2',
      [orderId, deliveryPersonId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
      });
    }

    const order = orderResult.rows[0];

    // Calculer distance supplémentaire
    const originalDistance = order.delivery_distance || 0;
    const newDistance = originalDistance + additional_distance_km;

    // Si distance supplémentaire > 2km, demander bonus ou refuser
    if (additional_distance_km > 2) {
      const bonusAmount = Math.round(additional_distance_km * 200); // 200 FCFA/km supplémentaire

      await query(
        `UPDATE orders 
         SET delivery_address = $1,
             delivery_distance = $2,
             special_instructions = 'Adresse corrigée. Distance supplémentaire: ' || $3 || ' km. Bonus: ' || $4 || ' FCFA'
         WHERE id = $5`,
        [
          JSON.stringify({
            address_line: correct_address,
            latitude: correct_latitude,
            longitude: correct_longitude,
          }),
          newDistance,
          additional_distance_km,
          bonusAmount,
          orderId,
        ]
      );

      return res.json({
        success: true,
        message: 'Adresse corrigée. Bonus accordé pour distance supplémentaire.',
        data: {
          additional_distance_km,
          bonus_amount: bonusAmount,
        },
      });
    }

    // Distance < 2km, continuer sans bonus
    await query(
      `UPDATE orders 
       SET delivery_address = $1,
           delivery_distance = $2,
           special_instructions = 'Adresse corrigée'
       WHERE id = $3`,
      [
        JSON.stringify({
          address_line: correct_address,
          latitude: correct_latitude,
          longitude: correct_longitude,
        }),
        newDistance,
        orderId,
      ]
    );

    res.json({
      success: true,
      message: 'Adresse corrigée. Continuez la livraison.',
    });

  } catch (error) {
    logger.error('Erreur handleWrongAddress:', error);
    res.status(500).json({
      success: false,
      error: { code: 'HANDLE_ERROR', message: 'Erreur lors de la correction' },
    });
  }
};

/**
 * Bouton d'urgence
 */
exports.reportEmergency = async (req, res) => {
  try {
    const { emergency_type, description, latitude, longitude, order_id } = req.body;
    const deliveryPersonId = req.user.id;

    // Créer ticket urgence
    const ticketResult = await query(
      `INSERT INTO support_tickets (
        ticket_number, user_type, user_id, order_id,
        category, priority, subject, description, status
      )
      VALUES (
        generate_ticket_number(), 'delivery', $1, $2,
        'other', 'urgent', 'URGENCE: ' || $3, $4, 'open'
      )
      RETURNING *`,
      [deliveryPersonId, order_id, emergency_type, description]
    );

    // Mettre à jour position
    if (latitude && longitude) {
      await query(
        `UPDATE delivery_persons 
         SET current_latitude = $1, current_longitude = $2, last_location_update = NOW()
         WHERE id = $3`,
        [latitude, longitude, deliveryPersonId]
      );
    }

    // Si commande en cours, réassigner automatiquement
    if (order_id) {
      const orderResult = await query(
        `SELECT * FROM orders WHERE id = $1 AND status IN ('ready', 'picked_up', 'delivering')`,
        [order_id]
      );

      if (orderResult.rows.length > 0) {
        // Réassigner à un autre livreur disponible
        await query(
          `UPDATE orders 
           SET delivery_person_id = NULL,
               status = 'ready',
               special_instructions = 'Réassignation: livreur en urgence'
           WHERE id = $1`,
          [order_id]
        );
      }
    }

    // Notifier l'admin immédiatement (via notification push)
    const notificationService = require('../services/notification.service');
    await notificationService.sendToAdmins({
      title: '🚨 URGENCE LIVREUR',
      message: `Livreur ${deliveryPersonId} signale une urgence: ${emergency_type}`,
      data: {
        delivery_person_id: deliveryPersonId,
        emergency_type,
        latitude,
        longitude,
        ticket_id: ticketResult.rows[0].id,
      },
      priority: 'high',
    });

    logger.error(`URGENCE signalée par livreur ${deliveryPersonId}: ${emergency_type}`);

    res.status(201).json({
      success: true,
      message: 'Urgence signalée. Le support vous contactera immédiatement.',
      data: {
        ticket: ticketResult.rows[0],
        reassigned: order_id ? true : false,
      },
    });

  } catch (error) {
    logger.error('Erreur reportEmergency:', error);
    res.status(500).json({
      success: false,
      error: { code: 'EMERGENCY_ERROR', message: 'Erreur lors du signalement d\'urgence' },
    });
  }
};

// ═══════════════════════════════════════════════════════════
// PROFIL ÉTENDU
// ═══════════════════════════════════════════════════════════

exports.updateAvailability = async (req, res) => {
  try {
    const { availability_hours } = req.body;
    await query(
      'UPDATE delivery_persons SET availability_hours = $1 WHERE id = $2',
      [JSON.stringify(availability_hours), req.user.id]
    );
    res.json({ success: true, message: 'Planning de disponibilité mis à jour' });
  } catch (error) {
    logger.error('Erreur updateAvailability:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' } });
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    const { vehicle_type, vehicle_plate } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;
    if (vehicle_type) { updates.push(`vehicle_type = $${idx++}`); values.push(vehicle_type); }
    if (vehicle_plate !== undefined) { updates.push(`vehicle_plate = $${idx++}`); values.push(vehicle_plate || null); }
    if (updates.length === 0) return res.status(400).json({ success: false, error: { code: 'NO_DATA', message: 'Aucune donnée à mettre à jour' } });
    values.push(req.user.id);
    await query(`UPDATE delivery_persons SET ${updates.join(', ')} WHERE id = $${idx}`, values);
    res.json({ success: true, message: 'Informations du véhicule mises à jour' });
  } catch (error) {
    logger.error('Erreur updateVehicle:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' } });
  }
};

exports.updateZones = async (req, res) => {
  try {
    const { work_zones } = req.body;
    await query(
      'UPDATE delivery_persons SET work_zones = $1 WHERE id = $2',
      [JSON.stringify(work_zones), req.user.id]
    );
    res.json({ success: true, message: 'Zones de livraison mises à jour' });
  } catch (error) {
    logger.error('Erreur updateZones:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' } });
  }
};

// ═══════════════════════════════════════════════════════════
// MOBILE MONEY
// ═══════════════════════════════════════════════════════════

exports.verifyMobileMoney = async (req, res) => {
  try {
    const { mobile_money_number, mobile_money_provider } = req.body;
    if (!mobile_money_number || !mobile_money_provider) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Numéro et opérateur requis' } });
    }
    // Vérification basique du format
    const digits = String(mobile_money_number).replace(/\s/g, '').replace(/^\+/, '');
    const valid = /^225?(0[1457]|[4-7])\d{8}$/.test(digits) || /^(0[1457]|[4-7])\d{8}$/.test(digits);
    if (!valid) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_NUMBER', message: 'Numéro Mobile Money invalide' } });
    }
    res.json({ success: true, data: { verified: true, mobile_money_number, mobile_money_provider } });
  } catch (error) {
    logger.error('Erreur verifyMobileMoney:', error);
    res.status(500).json({ success: false, error: { code: 'VERIFY_ERROR', message: 'Erreur lors de la vérification' } });
  }
};

exports.updateMobileMoney = async (req, res) => {
  try {
    const { mobile_money_number, mobile_money_provider } = req.body;
    await query(
      'UPDATE delivery_persons SET mobile_money_number = $1, mobile_money_provider = $2 WHERE id = $3',
      [mobile_money_number || null, mobile_money_provider || null, req.user.id]
    );
    res.json({ success: true, message: 'Compte Mobile Money mis à jour' });
  } catch (error) {
    logger.error('Erreur updateMobileMoney:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' } });
  }
};

// ═══════════════════════════════════════════════════════════
// FORMATION & ONBOARDING
// ═══════════════════════════════════════════════════════════

exports.getTrainingModules = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, training_modules_completed, quiz_passed, contract_signed, status
       FROM delivery_persons WHERE id = $1`,
      [req.user.id]
    );
    const dp = result.rows[0] || {};
    const completedModules = Array.isArray(dp.training_modules_completed)
      ? dp.training_modules_completed
      : (safeJsonParse(dp.training_modules_completed) || []);

    const modules = [
      { id: 'module_1', title: 'Bienvenue chez Baibebalo', description: 'Introduction à la plateforme', duration_minutes: 5, order: 1, completed: completedModules.includes('module_1') },
      { id: 'module_2', title: 'Comment accepter et gérer une livraison', description: 'Processus complet de livraison', duration_minutes: 10, order: 2, completed: completedModules.includes('module_2') },
      { id: 'module_3', title: 'Service client et professionnalisme', description: 'Interaction avec les clients et restaurants', duration_minutes: 8, order: 3, completed: completedModules.includes('module_3') },
      { id: 'module_4', title: 'Sécurité et urgences', description: 'Procédures d\'urgence et sécurité', duration_minutes: 7, order: 4, completed: completedModules.includes('module_4') },
    ];

    res.json({ success: true, data: { modules, total_completed: completedModules.length, total: modules.length } });
  } catch (error) {
    logger.error('Erreur getTrainingModules:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des modules' } });
  }
};

exports.getModuleDetail = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const moduleContent = {
      module_1: { id: 'module_1', title: 'Bienvenue chez Baibebalo', content: 'Contenu du module 1...', video_url: null, duration_minutes: 5 },
      module_2: { id: 'module_2', title: 'Comment accepter et gérer une livraison', content: 'Contenu du module 2...', video_url: null, duration_minutes: 10 },
      module_3: { id: 'module_3', title: 'Service client et professionnalisme', content: 'Contenu du module 3...', video_url: null, duration_minutes: 8 },
      module_4: { id: 'module_4', title: 'Sécurité et urgences', content: 'Contenu du module 4...', video_url: null, duration_minutes: 7 },
    };
    const module = moduleContent[moduleId];
    if (!module) return res.status(404).json({ success: false, error: { code: 'MODULE_NOT_FOUND', message: 'Module non trouvé' } });
    res.json({ success: true, data: module });
  } catch (error) {
    logger.error('Erreur getModuleDetail:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération du module' } });
  }
};

exports.completeModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const result = await query('SELECT training_modules_completed FROM delivery_persons WHERE id = $1', [req.user.id]);
    const dp = result.rows[0] || {};
    const completed = Array.isArray(dp.training_modules_completed)
      ? dp.training_modules_completed
      : (safeJsonParse(dp.training_modules_completed) || []);
    if (!completed.includes(moduleId)) completed.push(moduleId);
    await query('UPDATE delivery_persons SET training_modules_completed = $1 WHERE id = $2', [JSON.stringify(completed), req.user.id]);
    res.json({ success: true, message: 'Module complété', data: { completed_modules: completed } });
  } catch (error) {
    logger.error('Erreur completeModule:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' } });
  }
};

exports.getQuiz = async (req, res) => {
  try {
    const quiz = {
      id: 'quiz_certification',
      title: 'Quiz de certification Baibebalo',
      questions: [
        { id: 'q1', question: 'Que faire si le client est absent ?', options: ['Repartir immédiatement', 'Attendre 10 minutes et contacter le client', 'Appeler le support', 'Laisser la commande devant la porte'], correct_index: 1 },
        { id: 'q2', question: 'Quelle est la durée maximale d\'attente au restaurant ?', options: ['5 minutes', '10 minutes', '15 minutes', '20 minutes'], correct_index: 2 },
        { id: 'q3', question: 'Que faire en cas d\'accident ?', options: ['Continuer la livraison', 'Appuyer sur le bouton d\'urgence', 'Contacter le client', 'Abandonner la commande'], correct_index: 1 },
      ],
      passing_score: 70,
    };
    res.json({ success: true, data: quiz });
  } catch (error) {
    logger.error('Erreur getQuiz:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération du quiz' } });
  }
};

exports.submitQuiz = async (req, res) => {
  try {
    const { answers } = req.body;
    const correctAnswers = { q1: 1, q2: 2, q3: 1 };
    let correct = 0;
    const total = Object.keys(correctAnswers).length;
    if (answers && typeof answers === 'object') {
      Object.entries(correctAnswers).forEach(([qId, correctIdx]) => {
        if (answers[qId] === correctIdx) correct++;
      });
    }
    const score = Math.round((correct / total) * 100);
    const passed = score >= 70;
    if (passed) {
      await query('UPDATE delivery_persons SET quiz_passed = true WHERE id = $1', [req.user.id]);
    }
    res.json({ success: true, data: { score, passed, correct, total } });
  } catch (error) {
    logger.error('Erreur submitQuiz:', error);
    res.status(500).json({ success: false, error: { code: 'SUBMIT_ERROR', message: 'Erreur lors de la soumission du quiz' } });
  }
};

exports.signContract = async (req, res) => {
  try {
    await query('UPDATE delivery_persons SET contract_signed = true, contract_signed_at = NOW() WHERE id = $1', [req.user.id]);
    res.json({ success: true, message: 'Contrat signé avec succès', data: { contract_signed: true, signed_at: new Date().toISOString() } });
  } catch (error) {
    logger.error('Erreur signContract:', error);
    res.status(500).json({ success: false, error: { code: 'SIGN_ERROR', message: 'Erreur lors de la signature du contrat' } });
  }
};

exports.getStarterKit = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        items: [
          { id: 'bag', name: 'Sac isotherme Baibebalo', price: 5000, required: true },
          { id: 'tshirt', name: 'T-shirt Baibebalo (uniforme)', price: 3000, required: false },
        ],
        total_price: 8000,
        pickup_address: 'Siège Baibebalo, Abidjan',
        contact_phone: '+2250787097996',
      },
    });
  } catch (error) {
    logger.error('Erreur getStarterKit:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération du kit' } });
  }
};

exports.orderStarterKit = async (req, res) => {
  try {
    res.json({ success: true, message: 'Demande de kit de démarrage enregistrée. L\'équipe Baibebalo vous contactera.' });
  } catch (error) {
    logger.error('Erreur orderStarterKit:', error);
    res.status(500).json({ success: false, error: { code: 'ORDER_ERROR', message: 'Erreur lors de la commande du kit' } });
  }
};

// ═══════════════════════════════════════════════════════════
// LOCALISATION
// ═══════════════════════════════════════════════════════════

exports.getHeatMap = async (req, res) => {
  try {
    // Retourne les zones à forte demande basées sur les commandes récentes
    const result = await query(
      `SELECT
         ROUND(CAST(delivery_latitude AS NUMERIC), 3) AS lat,
         ROUND(CAST(delivery_longitude AS NUMERIC), 3) AS lng,
         COUNT(*) AS order_count
       FROM orders
       WHERE created_at > NOW() - INTERVAL '7 days'
         AND delivery_latitude IS NOT NULL
         AND delivery_longitude IS NOT NULL
       GROUP BY 1, 2
       ORDER BY order_count DESC
       LIMIT 50`,
      []
    );
    res.json({ success: true, data: { points: result.rows } });
  } catch (error) {
    logger.error('Erreur getHeatMap:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération de la carte de chaleur' } });
  }
};

exports.getNearbyRestaurants = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query;
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_LOCATION', message: 'Latitude et longitude requises' } });
    }
    const result = await query(
      `SELECT id, name, address, latitude, longitude,
         ROUND(CAST(
           6371 * acos(
             cos(radians($1)) * cos(radians(latitude)) *
             cos(radians(longitude) - radians($2)) +
             sin(radians($1)) * sin(radians(latitude))
           ) AS NUMERIC
         ), 2) AS distance_km
       FROM restaurants
       WHERE is_open = true AND status = 'active'
         AND latitude IS NOT NULL AND longitude IS NOT NULL
       HAVING 6371 * acos(
         cos(radians($1)) * cos(radians(latitude)) *
         cos(radians(longitude) - radians($2)) +
         sin(radians($1)) * sin(radians(latitude))
       ) <= $3
       ORDER BY distance_km
       LIMIT 20`,
      [parseFloat(latitude), parseFloat(longitude), parseFloat(radius)]
    );
    res.json({ success: true, data: { restaurants: result.rows } });
  } catch (error) {
    logger.error('Erreur getNearbyRestaurants:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des restaurants' } });
  }
};

exports.getSuggestedZones = async (req, res) => {
  try {
    // Zones suggérées basées sur le volume de commandes par quartier
    const result = await query(
      `SELECT
         delivery_address_district AS zone,
         COUNT(*) AS order_count,
         AVG(delivery_fee) AS avg_fee
       FROM orders
       WHERE created_at > NOW() - INTERVAL '7 days'
         AND delivery_address_district IS NOT NULL
       GROUP BY delivery_address_district
       ORDER BY order_count DESC
       LIMIT 10`,
      []
    );
    res.json({ success: true, data: { zones: result.rows } });
  } catch (error) {
    logger.error('Erreur getSuggestedZones:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des zones' } });
  }
};

exports.getPerformanceBonuses = async (req, res) => {
  try {
    const deliveryPersonId = req.deliveryPerson?.id;
    if (!deliveryPersonId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Non autorisé' } });
    }

    // Livraisons aujourd'hui
    const todayResult = await query(
      `SELECT COUNT(*) AS count
       FROM orders
       WHERE assigned_driver_id = $1
         AND status = 'delivered'
         AND completed_at >= CURRENT_DATE
         AND completed_at < CURRENT_DATE + INTERVAL '1 day'`,
      [deliveryPersonId]
    );
    const todayCount = parseInt(todayResult.rows[0]?.count || 0, 10);

    // Bonus potentiel aujourd'hui
    let potentialBonus = 0;
    if (todayCount >= 20) potentialBonus = 1500;
    else if (todayCount >= 10) potentialBonus = 500;

    // Bonus déjà attribués (30 derniers jours)
    const bonusResult = await query(
      `SELECT bonus_date, deliveries_count, bonus_amount, status
       FROM delivery_performance_bonuses
       WHERE delivery_person_id = $1
         AND bonus_date >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY bonus_date DESC
       LIMIT 15`,
      [deliveryPersonId]
    );

    // Prochain palier
    let nextThreshold = null;
    let deliveriesNeeded = 0;
    if (todayCount < 10) {
      nextThreshold = 500;
      deliveriesNeeded = 10 - todayCount;
    } else if (todayCount < 20) {
      nextThreshold = 1500;
      deliveriesNeeded = 20 - todayCount;
    }

    res.json({
      success: true,
      data: {
        today_deliveries: todayCount,
        potential_bonus: potentialBonus,
        next_threshold: nextThreshold,
        deliveries_needed: deliveriesNeeded,
        recent_bonuses: bonusResult.rows.map((b) => ({
          date: b.bonus_date,
          deliveries: parseInt(b.deliveries_count, 10),
          amount: parseInt(b.bonus_amount, 10),
          status: b.status,
        })),
      },
    });
  } catch (error) {
    logger.error('Erreur getPerformanceBonuses:', error);
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des bonus' } });
  }
};

module.exports = exports;
const { query, transaction } = require('../database/db');
const logger = require('../utils/logger');

/**
 * Inscription d'un nouveau livreur
 */
exports.registerDeliveryPerson = async (req, res) => {
  try {
    const {
      phone,
      first_name,
      last_name,
      email,
      password,
      vehicle_type,
      vehicle_info,
      id_card,
      driver_license,
      vehicle_registration,
      insurance,
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

    // Hasher le mot de passe
    const bcrypt = require('bcrypt');
    const config = require('../config');
    const password_hash = await bcrypt.hash(password, config.security.bcryptRounds);

    const result = await query(
      `INSERT INTO delivery_persons (
        phone, first_name, last_name, email, password_hash,
        vehicle_type, vehicle_info, id_card, driver_license,
        vehicle_registration, insurance,
        mobile_money_number, mobile_money_provider,
        availability, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, phone, first_name, last_name, status`,
      [
        phone, first_name, last_name, email, password_hash,
        vehicle_type, JSON.stringify(vehicle_info || {}),
        id_card, driver_license, vehicle_registration, insurance,
        mobile_money_number, mobile_money_provider,
        JSON.stringify(availability || {}), 'pending'
      ]
    );

    logger.info(`Nouveau livreur inscrit: ${result.rows[0].id}`);

    res.status(201).json({
      success: true,
      message: 'Inscription réussie. Votre profil sera validé sous 24-48h.',
      data: {
        delivery_person: result.rows[0],
      },
    });
  } catch (error) {
    logger.error('Erreur registerDeliveryPerson:', error);
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
    const { status } = req.body;

    const validStatuses = ['online', 'offline', 'on_break'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Statut invalide',
        },
      });
    }

    await query(
      'UPDATE delivery_persons SET delivery_status = $1 WHERE id = $2',
      [status, req.user.id]
    );

    logger.info(`Livreur ${req.user.id} statut: ${status}`);

    res.json({
      success: true,
      message: 'Statut mis à jour',
      data: { status },
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

    // Émettre via WebSocket pour les commandes en cours
    const io = req.app.get('io');
    
    // Récupérer les commandes en cours de livraison
    const ordersResult = await query(
      `SELECT id FROM orders 
       WHERE delivery_person_id = $1 AND status = 'delivering'`,
      [req.user.id]
    );

    ordersResult.rows.forEach(order => {
      io.to(`order_${order.id}`).emit('delivery_location_updated', {
        latitude,
        longitude,
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

/**
 * Obtenir les commandes disponibles à proximité
 */
exports.getAvailableOrders = async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'LOCATION_REQUIRED',
          message: 'Position GPS requise',
        },
      });
    }

    const result = await query(
      `SELECT o.*,
              r.name as restaurant_name, 
              r.address as restaurant_address,
              r.latitude as restaurant_latitude,
              r.longitude as restaurant_longitude,
              earth_distance(
                ll_to_earth(r.latitude, r.longitude),
                ll_to_earth($1, $2)
              ) / 1000 as distance_km
       FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.status = 'ready' 
       AND o.delivery_person_id IS NULL
       AND earth_distance(
         ll_to_earth(r.latitude, r.longitude),
         ll_to_earth($1, $2)
       ) / 1000 <= $3
       ORDER BY o.placed_at ASC
       LIMIT 20`,
      [parseFloat(lat), parseFloat(lng), parseFloat(radius)]
    );

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
      // Vérifier que la commande est disponible
      const orderResult = await client.query(
        `SELECT * FROM orders 
         WHERE id = $1 AND status = 'ready' AND delivery_person_id IS NULL
         FOR UPDATE`,
        [id]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_AVAILABLE',
            message: 'Commande non disponible',
          },
        });
      }

      // Assigner le livreur
      await client.query(
        `UPDATE orders 
         SET delivery_person_id = $1, status = 'delivering'
         WHERE id = $2`,
        [req.user.id, id]
      );

      const order = orderResult.rows[0];

      // Notifier le client
      const io = req.app.get('io');
      io.to(`order_${id}`).emit('order_status_changed', {
        order_id: id,
        status: 'delivering',
        delivery_person_id: req.user.id,
      });

      const userResult = await client.query(
        'SELECT phone FROM users WHERE id = $1',
        [order.user_id]
      );

      const deliveryResult = await client.query(
        'SELECT first_name, vehicle_type FROM delivery_persons WHERE id = $1',
        [req.user.id]
      );

      const smsService = require('../services/sms.service');
      await smsService.sendNotification(
        userResult.rows[0].phone,
        'delivery_on_way',
        {
          orderNumber: order.order_number,
          deliveryName: deliveryResult.rows[0].first_name,
        }
      );

      logger.info(`Livraison acceptée: ${order.order_number} par livreur ${req.user.id}`);

      res.json({
        success: true,
        message: 'Livraison acceptée',
        data: { order },
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
 * Confirmer la récupération de la commande au restaurant
 */
exports.confirmPickup = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE orders 
       SET picked_up_at = NOW()
       WHERE id = $1 AND delivery_person_id = $2 AND status = 'delivering'
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Commande non trouvée',
        },
      });
    }

    const order = result.rows[0];

    // Notifier le client
    const io = req.app.get('io');
    io.to(`order_${id}`).emit('order_picked_up', {
      order_id: id,
    });

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
    // photo et confirmation_code peuvent être utilisés plus tard pour validation

    return await transaction(async (client) => {
      const orderResult = await client.query(
        `SELECT * FROM orders 
         WHERE id = $1 AND delivery_person_id = $2 AND status = 'delivering'`,
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

      // Marquer comme livrée
      await client.query(
        `UPDATE orders 
         SET status = 'delivered', delivered_at = NOW()
         WHERE id = $1`,
        [id]
      );

      // Calculer les gains du livreur
      const config = require('../config');
      const deliveryEarnings = (order.delivery_fee * config.business.deliveryPersonPercentage) / 100;

      await client.query(
        `UPDATE delivery_persons 
         SET total_deliveries = total_deliveries + 1,
             total_earnings = total_earnings + $1,
             available_balance = available_balance + $1
         WHERE id = $2`,
        [deliveryEarnings, req.user.id]
      );

      // Créer la transaction pour le livreur
      await client.query(
        `INSERT INTO transactions (
          order_id, type, amount,
          from_user_type, from_user_id,
          to_user_type, to_user_id,
          status, payment_method
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          order.id, 'delivery_fee', deliveryEarnings,
          'platform', null,
          'delivery', req.user.id,
          'completed', 'internal'
        ]
      );

      // Notifier le client
      const io = req.app.get('io');
      io.to(`order_${id}`).emit('order_status_changed', {
        order_id: id,
        status: 'delivered',
      });
      
      // Notifier les admins du dashboard
      const { notifyOrderStatusChange } = require('../utils/socket');
      notifyOrderStatusChange(io, id, 'delivered', { delivered_at: new Date() });

      const userResult = await client.query(
        'SELECT phone FROM users WHERE id = $1',
        [order.user_id]
      );

      const smsService = require('../services/sms.service');
      await smsService.sendNotification(
        userResult.rows[0].phone,
        'order_delivered',
        { orderNumber: order.order_number }
      );

      logger.info(`Commande livrée: ${order.order_number}`);

      res.json({
        success: true,
        message: 'Livraison confirmée',
        data: {
          earnings: deliveryEarnings,
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
 */
exports.getEarnings = async (req, res) => {
  try {
    const deliveryResult = await query(
      `SELECT total_earnings, available_balance, total_deliveries
       FROM delivery_persons WHERE id = $1`,
      [req.user.id]
    );

    // Gains aujourd'hui
    const todayResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as today_earnings
       FROM transactions
       WHERE to_user_id = $1 
       AND to_user_type = 'delivery'
       AND type = 'delivery_fee'
       AND created_at >= CURRENT_DATE`,
      [req.user.id]
    );

    // Gains cette semaine
    const weekResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as week_earnings
       FROM transactions
       WHERE to_user_id = $1 
       AND to_user_type = 'delivery'
       AND type = 'delivery_fee'
       AND created_at >= DATE_TRUNC('week', CURRENT_DATE)`,
      [req.user.id]
    );

    // Gains ce mois
    const monthResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as month_earnings
       FROM transactions
       WHERE to_user_id = $1 
       AND to_user_type = 'delivery'
       AND type = 'delivery_fee'
       AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
      [req.user.id]
    );

    const delivery = deliveryResult.rows[0];

    res.json({
      success: true,
      data: {
        available_balance: parseFloat(delivery.available_balance),
        total_earnings: parseFloat(delivery.total_earnings),
        total_deliveries: delivery.total_deliveries,
        today: parseFloat(todayResult.rows[0].today_earnings),
        this_week: parseFloat(weekResult.rows[0].week_earnings),
        this_month: parseFloat(monthResult.rows[0].month_earnings),
      },
    });
  } catch (error) {
    logger.error('Erreur getEarnings:', error);
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
 * Demander un retrait
 */
exports.requestPayout = async (req, res) => {
  try {
    const { amount } = req.body;

    return await transaction(async (client) => {
      // Vérifier le solde disponible
      const deliveryResult = await client.query(
        'SELECT available_balance, mobile_money_number FROM delivery_persons WHERE id = $1',
        [req.user.id]
      );

      const delivery = deliveryResult.rows[0];

      if (parseFloat(delivery.available_balance) < amount) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_BALANCE',
            message: 'Solde insuffisant',
          },
        });
      }

      if (amount < 5000) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MINIMUM_AMOUNT',
            message: 'Montant minimum: 5000 FCFA',
          },
        });
      }

      // Déduire du solde
      await client.query(
        'UPDATE delivery_persons SET available_balance = available_balance - $1 WHERE id = $2',
        [amount, req.user.id]
      );

      // Créer la transaction de retrait
      await client.query(
        `INSERT INTO transactions (
          type, amount, 
          from_user_type, from_user_id,
          to_user_type, to_user_id,
          status, payment_method,
          reference
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          'payout', amount,
          'platform', null,
          'delivery', req.user.id,
          'pending', 'mobile_money',
          delivery.mobile_money_number
        ]
      );

      logger.info(`Demande de retrait: ${amount} FCFA pour livreur ${req.user.id}`);

      res.json({
        success: true,
        message: 'Demande de retrait enregistrée. Traitement sous 24-48h.',
        data: {
          amount,
          new_balance: parseFloat(delivery.available_balance) - amount,
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
 * Obtenir l'historique des livraisons
 */
exports.getDeliveryHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT o.*, 
             r.name as restaurant_name,
             u.first_name as client_first_name
      FROM orders o
      LEFT JOIN restaurants r ON o.restaurant_id = r.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.delivery_person_id = $1
    `;

    const values = [req.user.id];

    if (status) {
      queryText += ' AND o.status = $2';
      values.push(status);
    }

    queryText += ` ORDER BY o.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await query(queryText, values);

    const countResult = await query(
      status
        ? 'SELECT COUNT(*) FROM orders WHERE delivery_person_id = $1 AND status = $2'
        : 'SELECT COUNT(*) FROM orders WHERE delivery_person_id = $1',
      status ? [req.user.id, status] : [req.user.id]
    );

    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        deliveries: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getDeliveryHistory:', error);
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
 * Obtenir le profil du livreur connecté
 */
exports.getMyProfile = async (req, res) => {
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

    res.json({
      success: true,
      data: { delivery_person: result.rows[0] },
    });
  } catch (error) {
    logger.error('Erreur getMyProfile:', error);
    res.status(500).json({
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
    // TODO: Implémenter la mise à jour
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
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
 * Obtenir les commandes actives
 */
exports.getActiveOrders = async (req, res) => {
  try {
    const result = await query(
      `SELECT o.*, r.name as restaurant_name
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.delivery_person_id = $1 
       AND o.status IN ('ready', 'picked_up', 'delivering')
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: { orders: result.rows },
    });
  } catch (error) {
    logger.error('Erreur getActiveOrders:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Refuser une livraison
 */
exports.declineDelivery = async (req, res) => {
  try {
    // TODO: Implémenter le refus
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
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
    // TODO: Implémenter l'arrivée
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
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
    // TODO: Implémenter l'arrivée
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
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
 * Obtenir les demandes de paiement
 */
exports.getPayoutRequests = async (req, res) => {
  try {
    // TODO: Implémenter la récupération
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
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
    // TODO: Implémenter la récupération
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
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
 * Obtenir les avis
 */
exports.getMyReviews = async (req, res) => {
  try {
    // TODO: Implémenter la récupération
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur getMyReviews:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Contacter le support
 */
exports.contactSupport = async (req, res) => {
  try {
    // TODO: Implémenter le contact
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur contactSupport:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'Erreur lors du contact' },
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

module.exports = exports;
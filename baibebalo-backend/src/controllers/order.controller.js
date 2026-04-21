const { query, transaction } = require('../database/db');
const logger = require('../utils/logger');
const crypto = require('crypto');
const config = require('../config');
const mapsService = require('../services/maps.service');
const notificationService = require('../services/notification.service');

/**
 * Générer un numéro de commande unique
 */
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = crypto.randomInt(1000, 9999);
  return `BAIB-${timestamp}${random}`;
};

/**
 * Calculer les frais de livraison basés sur la distance
 * Utilise le service maps gratuit
 */
const calculateDeliveryFee = (distance) => {
  return mapsService.calculateDeliveryFee(distance);
};

/** Prix minimum livraison express (FCFA) */
const EXPRESS_MIN_FEE = 500;

/**
 * Calculer les frais de livraison et de service
 * API pour le client avant de créer la commande
 */
exports.calculateFees = async (req, res) => {
  try {
    const { restaurant_id, delivery_address_id, subtotal: rawSubtotal } = req.body;
    const subtotal = Number(rawSubtotal);
    if (Number.isNaN(subtotal) || subtotal < 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Sous-total invalide' },
      });
    }
    const userId = req.user.id;

    // 1. Récupérer les coordonnées du restaurant
    const restaurantResult = await query(
      'SELECT latitude, longitude, name, delivery_radius FROM restaurants WHERE id = $1',
      [restaurant_id]
    );

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant non trouvé' },
      });
    }

    const restaurant = restaurantResult.rows[0];

    // 2. Récupérer les coordonnées de l'adresse de livraison
    const addressResult = await query(
      'SELECT latitude, longitude, address_line as address FROM addresses WHERE id = $1 AND user_id = $2',
      [delivery_address_id, userId]
    );

    if (addressResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ADDRESS_NOT_FOUND', message: 'Adresse non trouvée' },
      });
    }

    const address = addressResult.rows[0];

    // 3. Calculer la distance
    let distance = 0;
    let deliveryFee = 500; // Minimum par défaut

    if (restaurant.latitude && restaurant.longitude && address.latitude && address.longitude) {
      distance = mapsService.calculateDistance(
        parseFloat(restaurant.latitude),
        parseFloat(restaurant.longitude),
        parseFloat(address.latitude),
        parseFloat(address.longitude)
      );

      // Rayon max = choix du restaurant (BDD), sinon défaut 15 km
      const platformMaxKm = 15;
      const maxRadius = Number(restaurant.delivery_radius) || platformMaxKm;
      if (distance > maxRadius) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'OUT_OF_DELIVERY_RANGE',
            message: `L'adresse est trop loin (${distance.toFixed(1)} km). Distance maximale: ${maxRadius} km`,
          },
        });
      }

      // Calculer les frais de livraison de base
      deliveryFee = calculateDeliveryFee(distance);
    }

    // === CALCUL DES BONUS (À INCLURE DANS LES FRAIS DE LIVRAISON) ===
    // Les bonus sont payés par le client et inclus dans les frais de livraison
    const { calculateDeliveryBonuses } = require('../utils/earnings');
    const orderDate = new Date();
    const bonuses = calculateDeliveryBonuses(deliveryFee, distance, orderDate);
    const baseDeliveryFee = deliveryFee;
    const totalDeliveryFeeWithBonuses = baseDeliveryFee + bonuses.totalBonus;

    // === SEUIL DE LIVRAISON GRATUITE ===
    // Si le sous-total dépasse le seuil, la livraison est gratuite
    const freeDeliveryThreshold = config.business.freeDeliveryThreshold || 5000;
    const freeDeliveryEnabled = config.business.freeDeliveryEnabled !== false;
    let freeDeliveryApplied = false;
    let originalDeliveryFee = totalDeliveryFeeWithBonuses; // Total avec bonus
    let amountToFreeDelivery = 0;

    if (freeDeliveryEnabled && subtotal >= freeDeliveryThreshold) {
      freeDeliveryApplied = true;
      deliveryFee = 0; // Livraison gratuite = 0 (sans bonus)
    } else if (freeDeliveryEnabled) {
      amountToFreeDelivery = freeDeliveryThreshold - subtotal;
      // Utiliser les frais avec bonus pour le calcul
      deliveryFee = totalDeliveryFeeWithBonuses;
    } else {
      // Utiliser les frais avec bonus
      deliveryFee = totalDeliveryFeeWithBonuses;
    }

    // Frais de service désactivés (0 %) — uniquement frais livraison + commission restaurant
    const serviceFee = 0;
    const serviceFeePercentDisplay = 0;

    // Rayon max livraison = restaurant (BDD), sinon défaut 15 km
    const platformMaxKm = 15;
    const deliveryRadiusKm = Number(restaurant.delivery_radius) || platformMaxKm;

    // Total = sous-total + frais de livraison (avec bonus inclus)
    const total = subtotal + deliveryFee;

    logger.info('Calcul des frais:', {
      userId,
      restaurantId: restaurant_id,
      distance: distance.toFixed(2),
      subtotal,
      baseDeliveryFee,
      bonuses: bonuses.totalBonus,
      deliveryFee: deliveryFee, // Total avec bonus
      total,
      freeDeliveryApplied,
    });

    // Obtenir les détails du tarif de livraison
    const deliveryFeeDetails = mapsService.getDeliveryFeeDetails(distance);

    res.json({
      success: true,
      data: {
        subtotal: subtotal,
        delivery_fee: deliveryFee, // Total avec bonus inclus
        base_delivery_fee: baseDeliveryFee, // Frais de base sans bonus
        bonuses: {
          long_distance: bonuses.breakdown.bonus_long_distance,
          peak_hour: bonuses.breakdown.bonus_peak_hour,
          weekend: bonuses.breakdown.bonus_weekend,
          total: bonuses.totalBonus,
        },
        service_fee: serviceFee,
        total: total,
        distance_km: parseFloat(distance.toFixed(2)),
        delivery_radius_km: deliveryRadiusKm,
        service_fee_percent: serviceFeePercentDisplay,
        restaurant_name: restaurant.name,
        delivery_address: address.address,
        // Détails du tarif de livraison
        delivery_details: {
          original_fee: originalDeliveryFee,
          label: deliveryFeeDetails.label,
          description: deliveryFeeDetails.description,
        },
        // Informations sur la livraison gratuite
        free_delivery: {
          enabled: freeDeliveryEnabled,
          threshold: freeDeliveryThreshold,
          applied: freeDeliveryApplied,
          original_fee: originalDeliveryFee,
          savings: freeDeliveryApplied ? originalDeliveryFee : 0,
          amount_remaining: amountToFreeDelivery > 0 ? amountToFreeDelivery : 0,
          message: freeDeliveryApplied 
            ? 'Livraison gratuite appliquée !' 
            : amountToFreeDelivery > 0 
              ? `Ajoutez ${amountToFreeDelivery} FCFA pour la livraison gratuite`
              : null,
        },
      },
    });
  } catch (error) {
    logger.error('Erreur calculateFees:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CALCULATION_ERROR', message: 'Erreur lors du calcul des frais' },
    });
  }
};

/**
 * Calculer les frais de livraison EXPRESS (point à point, sans restaurant)
 * pickup_address → delivery_address
 */
exports.calculateExpressFees = async (req, res) => {
  try {
    const { pickup_address_id, delivery_address_id, pickup_address, delivery_address } = req.body;
    const userId = req.user.id;

    let pickupLat, pickupLon, pickupAddressLine;
    let deliveryLat, deliveryLon, deliveryAddressLine;

    // Point de collecte : ID d'adresse ou objet
    if (pickup_address_id) {
      const pickupResult = await query(
        'SELECT latitude, longitude, address_line FROM addresses WHERE id = $1 AND user_id = $2',
        [pickup_address_id, userId]
      );
      if (pickupResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'PICKUP_ADDRESS_NOT_FOUND', message: 'Adresse de collecte non trouvée' },
        });
      }
      const p = pickupResult.rows[0];
      pickupLat = p.latitude;
      pickupLon = p.longitude;
      pickupAddressLine = p.address_line;
    } else if (pickup_address && typeof pickup_address === 'object') {
      pickupLat = parseFloat(pickup_address.latitude);
      pickupLon = parseFloat(pickup_address.longitude);
      pickupAddressLine = pickup_address.address_line || pickup_address.address || '';
      if (!pickupLat || !pickupLon) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PICKUP', message: 'Coordonnées de collecte requises (latitude, longitude)' },
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: { code: 'PICKUP_REQUIRED', message: 'Point de collecte requis (pickup_address_id ou pickup_address)' },
      });
    }

    // Adresse de livraison : ID ou objet
    if (delivery_address_id) {
      const deliveryResult = await query(
        'SELECT latitude, longitude, address_line FROM addresses WHERE id = $1 AND user_id = $2',
        [delivery_address_id, userId]
      );
      if (deliveryResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'DELIVERY_ADDRESS_NOT_FOUND', message: 'Adresse de livraison non trouvée' },
        });
      }
      const d = deliveryResult.rows[0];
      deliveryLat = d.latitude;
      deliveryLon = d.longitude;
      deliveryAddressLine = d.address_line;
    } else if (delivery_address && typeof delivery_address === 'object') {
      deliveryLat = parseFloat(delivery_address.latitude);
      deliveryLon = parseFloat(delivery_address.longitude);
      deliveryAddressLine = delivery_address.address_line || delivery_address.address || '';
      if (!deliveryLat || !deliveryLon) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_DELIVERY', message: 'Coordonnées de livraison requises (latitude, longitude)' },
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: { code: 'DELIVERY_REQUIRED', message: 'Adresse de livraison requise (delivery_address_id ou delivery_address)' },
      });
    }

    const maxRadiusKm = 20;
    const distance = mapsService.calculateDistance(pickupLat, pickupLon, deliveryLat, deliveryLon);

    if (distance > maxRadiusKm) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'OUT_OF_DELIVERY_RANGE',
          message: `Distance trop longue (${distance.toFixed(1)} km). Maximum: ${maxRadiusKm} km`,
        },
      });
    }

    const baseDeliveryFee = calculateDeliveryFee(distance);
    const { calculateDeliveryBonuses } = require('../utils/earnings');
    const bonuses = calculateDeliveryBonuses(baseDeliveryFee, distance, new Date());
    const deliveryFee = Math.max(EXPRESS_MIN_FEE, baseDeliveryFee + bonuses.totalBonus);
    const total = deliveryFee;

    const deliveryFeeDetails = mapsService.getDeliveryFeeDetails(distance);

    res.json({
      success: true,
      data: {
        order_type: 'express',
        pickup_address: pickupAddressLine,
        delivery_address: deliveryAddressLine,
        distance_km: parseFloat(distance.toFixed(2)),
        delivery_fee: deliveryFee,
        base_delivery_fee: baseDeliveryFee,
        bonuses: {
          long_distance: bonuses.breakdown.bonus_long_distance,
          peak_hour: bonuses.breakdown.bonus_peak_hour,
          weekend: bonuses.breakdown.bonus_weekend,
          total: bonuses.totalBonus,
        },
        total,
        delivery_details: {
          label: deliveryFeeDetails.label,
          description: deliveryFeeDetails.description,
        },
      },
    });
  } catch (error) {
    logger.error('Erreur calculateExpressFees:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CALCULATION_ERROR', message: 'Erreur lors du calcul des frais' },
    });
  }
};

/**
 * Créer une commande EXPRESS (livraison point à point, sans restaurant)
 */
exports.createExpressOrder = async (req, res) => {
  try {
    const {
      pickup_address_id,
      delivery_address_id,
      pickup_address,
      delivery_address,
      recipient_name,
      recipient_phone,
      special_instructions,
      payment_method,
      express_description,
    } = req.body;

    const ALLOWED_PAYMENT_METHODS = ['cash'];
    if (!ALLOWED_PAYMENT_METHODS.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PAYMENT_METHOD_DISABLED',
          message: 'Seul le paiement à la livraison (cash) est accepté pour le moment.',
        },
      });
    }

    const userId = req.user.id;

    let pickupLat, pickupLon, pickupAddressLine, pickupDistrict, pickupLandmark;
    let deliveryLat, deliveryLon, deliveryAddressLine, deliveryDistrict, deliveryLandmark;
    let recipientName = recipient_name || '';
    let recipientPhone = recipient_phone || '';

    // Résoudre le point de collecte
    if (pickup_address_id) {
      const pickupResult = await query(
        'SELECT latitude, longitude, address_line, district, landmark FROM addresses WHERE id = $1 AND user_id = $2',
        [pickup_address_id, userId]
      );
      if (pickupResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'PICKUP_ADDRESS_NOT_FOUND', message: 'Adresse de collecte non trouvée' },
        });
      }
      const p = pickupResult.rows[0];
      pickupLat = p.latitude;
      pickupLon = p.longitude;
      pickupAddressLine = p.address_line;
      pickupDistrict = p.district;
      pickupLandmark = p.landmark;
    } else if (pickup_address && typeof pickup_address === 'object') {
      pickupLat = parseFloat(pickup_address.latitude);
      pickupLon = parseFloat(pickup_address.longitude);
      pickupAddressLine = pickup_address.address_line || pickup_address.address || '';
      pickupDistrict = pickup_address.district || null;
      pickupLandmark = pickup_address.landmark || null;
      if (!pickupLat || !pickupLon) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PICKUP', message: 'Coordonnées de collecte requises' },
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: { code: 'PICKUP_REQUIRED', message: 'Point de collecte requis' },
      });
    }

    // Résoudre l'adresse de livraison
    if (delivery_address_id) {
      const deliveryResult = await query(
        'SELECT latitude, longitude, address_line, district, landmark FROM addresses WHERE id = $1 AND user_id = $2',
        [delivery_address_id, userId]
      );
      if (deliveryResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'DELIVERY_ADDRESS_NOT_FOUND', message: 'Adresse de livraison non trouvée' },
        });
      }
      const d = deliveryResult.rows[0];
      deliveryLat = d.latitude;
      deliveryLon = d.longitude;
      deliveryAddressLine = d.address_line;
      deliveryDistrict = d.district;
      deliveryLandmark = d.landmark;
    } else if (delivery_address && typeof delivery_address === 'object') {
      deliveryLat = parseFloat(delivery_address.latitude);
      deliveryLon = parseFloat(delivery_address.longitude);
      deliveryAddressLine = delivery_address.address_line || delivery_address.address || '';
      deliveryDistrict = delivery_address.district || null;
      deliveryLandmark = delivery_address.landmark || null;
      recipientName = recipient_name || delivery_address.recipient_name || '';
      recipientPhone = recipient_phone || delivery_address.recipient_phone || '';
      if (!deliveryLat || !deliveryLon) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_DELIVERY', message: 'Coordonnées de livraison requises' },
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: { code: 'DELIVERY_REQUIRED', message: 'Adresse de livraison requise' },
      });
    }

    const maxRadiusKm = 20;
    const distance = mapsService.calculateDistance(pickupLat, pickupLon, deliveryLat, deliveryLon);
    if (distance > maxRadiusKm) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'OUT_OF_DELIVERY_RANGE',
          message: `Distance trop longue (${distance.toFixed(1)} km). Maximum: ${maxRadiusKm} km`,
        },
      });
    }

    const baseDeliveryFee = mapsService.calculateDeliveryFee(distance);
    const { calculateDeliveryBonuses } = require('../utils/earnings');
    const bonuses = calculateDeliveryBonuses(baseDeliveryFee, distance, new Date());
    const deliveryFee = Math.max(EXPRESS_MIN_FEE, baseDeliveryFee + bonuses.totalBonus);
    const total = deliveryFee;

    const result = await transaction(async (client) => {
      const order_number = generateOrderNumber();

      const pickupAddressJson = {
        address_line: pickupAddressLine,
        district: pickupDistrict,
        landmark: pickupLandmark,
        latitude: pickupLat,
        longitude: pickupLon,
      };

      const deliveryAddressJson = {
        address_line: deliveryAddressLine,
        district: deliveryDistrict,
        landmark: deliveryLandmark,
        latitude: deliveryLat,
        longitude: deliveryLon,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
      };

      const orderResult = await client.query(
        `INSERT INTO orders (
          order_number, user_id, restaurant_id,
          order_type, pickup_address, delivery_address,
          recipient_name, recipient_phone, express_description,
          subtotal, delivery_fee, discount, commission, total,
          special_instructions, payment_method, payment_status, status,
          delivery_distance, estimated_delivery_time
        )
        VALUES ($1, $2, NULL, 'express', $3, $4, $5, $6, $7, 0, $8, 0, 0, $9, $10, $11, 'pending', 'ready', $12, $13)
        RETURNING *`,
        [
          order_number, userId,
          JSON.stringify(pickupAddressJson),
          JSON.stringify(deliveryAddressJson),
          recipientName || null,
          recipientPhone || null,
          express_description || null,
          deliveryFee,
          total,
          special_instructions || null,
          payment_method,
          distance,
          Math.round((distance / 15) * 60) + 10,
        ]
      );

      const order = orderResult.rows[0];

      await client.query(
        `INSERT INTO transactions (
          order_id, transaction_type, amount,
          from_user_type, from_user_id,
          to_user_type, to_user_id,
          status, payment_method
        )
        VALUES ($1, 'order_payment', $2, 'client', $3, 'delivery', NULL, 'pending', $4)`,
        [order.id, total, userId, payment_method]
      );

      const io = req.app.get('io');
      const partnersIo = req.app.get('partnersIo');
      const { notifyNewOrder } = require('../utils/socket');
      notifyNewOrder(io, order);

      const deliveryProposalService = require('../services/deliveryProposal.service');
      const proposalResult = await deliveryProposalService.proposeOrderToDelivery(order.id, req.app);

      if (!proposalResult.proposed) {
        logger.info(`Aucun livreur disponible pour commande express ${order.order_number}`);
      }

      const userResult = await client.query('SELECT first_name, phone FROM users WHERE id = $1', [userId]);
      const user = userResult.rows[0];

      try {
        const smsService = require('../services/sms.service');
        if (user?.phone) {
          await smsService.sendOrderNotification(
            user.phone,
            order.order_number,
            'express_created'
          );
        }
      } catch (smsErr) {
        logger.warn('SMS express non envoyé', { error: smsErr.message });
      }

      return { order };
    });
    if (result && result.order) {
      res.status(201).json({
        success: true,
        message: 'Commande express créée. Un livreur va être assigné.',
        data: {
          order: {
            id: result.order.id,
            order_number: result.order.order_number,
            order_type: 'express',
            status: result.order.status,
            pickup_address: result.order.pickup_address,
            delivery_address: result.order.delivery_address,
            recipient_name: result.order.recipient_name,
            recipient_phone: result.order.recipient_phone,
            express_description: result.order.express_description,
            subtotal: 0,
            delivery_fee: result.order.delivery_fee,
            total: result.order.total,
            payment_method: result.order.payment_method,
            payment_status: result.order.payment_status,
            delivery_distance: result.order.delivery_distance,
            estimated_delivery_time: result.order.estimated_delivery_time,
            placed_at: result.order.placed_at,
            items: [],
          },
        },
      });
      try {
        await notificationService.sendOrderNotification(result.order.id, 'client', 'order_confirmed');
      } catch (notifErr) {
        logger.warn('Notification push express ignorée', { error: notifErr.message });
      }
    }
  } catch (error) {
    logger.error('Erreur createExpressOrder:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ORDER_CREATION_ERROR',
        message: 'Erreur lors de la création de la commande express',
      },
    });
  }
};

/**
 * Créer une nouvelle commande
 */
exports.createOrder = async (req, res) => {
  try {
    const {
      restaurant_id,
      items,
      delivery_address,
      delivery_address_id,
      special_instructions,
      payment_method,
      promo_code,
      scheduled_at,
    } = req.body;

    // Valider la date programmée si fournie
    if (scheduled_at) {
      const scheduledDate = new Date(scheduled_at);
      const minDelay = new Date(Date.now() + 15 * 60 * 1000); // 15 min minimum
      const maxDelay = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours max
      if (isNaN(scheduledDate.getTime()) || scheduledDate < minDelay || scheduledDate > maxDelay) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_SCHEDULED_TIME', message: 'Heure programmée invalide (entre 15 min et 7 jours)' },
        });
      }
    }

    // Anti-abus: max 3 commandes actives simultanées par utilisateur
    const activeOrdersResult = await query(
      `SELECT COUNT(*) FROM orders
       WHERE user_id = $1 AND status IN ('new','accepted','preparing','ready','delivering') AND order_type = 'food'`,
      [req.user.id]
    );
    if (parseInt(activeOrdersResult.rows[0].count) >= 3) {
      return res.status(429).json({
        success: false,
        error: { code: 'TOO_MANY_ACTIVE_ORDERS', message: 'Vous avez déjà 3 commandes en cours. Attendez qu\'elles soient livrées.' },
      });
    }

    // Validation de la méthode de paiement
    const ALLOWED_PAYMENT_METHODS = ['cash'];
    if (!ALLOWED_PAYMENT_METHODS.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PAYMENT_METHOD_DISABLED',
          message: 'Seul le paiement à la livraison (cash) est accepté pour le moment.'
        }
      });
    }

    const result = await transaction(async (client) => {
      // 1. Vérifier que le restaurant existe et est ouvert
      const restaurantResult = await client.query(
        `SELECT * FROM restaurants 
         WHERE id = $1 AND status = 'active' AND is_open = true`,
        [restaurant_id]
      );

      if (restaurantResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'RESTAURANT_UNAVAILABLE',
            message: 'Restaurant indisponible ou fermé',
          },
        });
      }

      const restaurant = restaurantResult.rows[0];

      // 2. Vérifier la disponibilité des articles et calculer le sous-total
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        // Valider et normaliser la quantité
        const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
        if (!item.menu_item_id) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_ITEM',
              message: 'menu_item_id manquant pour un article',
            },
          });
        }

        const menuItemResult = await client.query(
          `SELECT * FROM menu_items 
           WHERE id = $1 AND restaurant_id = $2 AND is_available = true`,
          [item.menu_item_id, restaurant_id]
        );

        if (menuItemResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'ITEM_UNAVAILABLE',
              message: `Article ${item.menu_item_id} non disponible`,
            },
          });
        }

        const menuItem = menuItemResult.rows[0];
        
        // Utiliser le prix promotionnel si la promotion est active
        const now = new Date();
        const isPromotionActive = menuItem.is_promotional && 
          menuItem.promotional_price &&
          (!menuItem.promotion_start || new Date(menuItem.promotion_start) <= now) &&
          (!menuItem.promotion_end || new Date(menuItem.promotion_end) >= now);
        
        let itemPrice = isPromotionActive 
          ? parseFloat(menuItem.promotional_price) 
          : parseFloat(menuItem.price);

        // Calculer le prix avec les options sélectionnées
        if (item.selected_options) {
          const options = menuItem.options || {};
          Object.keys(item.selected_options).forEach(optionKey => {
            const selectedValue = item.selected_options[optionKey];
            if (options[optionKey]?.choices) {
              const choice = options[optionKey].choices.find(c => c.value === selectedValue);
              if (choice?.price_modifier) {
                itemPrice += parseFloat(choice.price_modifier);
              }
            }
          });
        }

        // Calculer le sous-total de l'item (prix unitaire * quantité)
        const itemSubtotal = parseFloat(itemPrice) * quantity;
        subtotal += itemSubtotal;
        
        // Logger pour déboguer
        logger.debug('Calcul item commande:', {
          menu_item_id: item.menu_item_id,
          item_name: menuItem.name,
          unit_price: itemPrice,
          quantity: quantity,
          item_subtotal: itemSubtotal,
          running_subtotal: subtotal,
        });

        orderItems.push({
          menu_item_id: menuItem.id,
          menu_item_snapshot: menuItem,
          quantity: quantity, // Utiliser la quantité normalisée
          unit_price: itemPrice,
          selected_options: item.selected_options || {},
          special_notes: item.special_notes || null,
          subtotal: itemSubtotal,
        });
      }

      // 3. Récupérer l'adresse de livraison si ID fourni
      let resolvedDeliveryAddress = delivery_address;
      if (!resolvedDeliveryAddress && delivery_address_id) {
        const addressResult = await client.query(
          'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
          [delivery_address_id, req.user.id]
        );
        if (addressResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'ADDRESS_NOT_FOUND',
              message: 'Adresse de livraison introuvable',
            },
          });
        }
        resolvedDeliveryAddress = {
          label: addressResult.rows[0].title,
          address_line: addressResult.rows[0].address_line,
          district: addressResult.rows[0].district,
          landmark: addressResult.rows[0].landmark,
          latitude: parseFloat(addressResult.rows[0].latitude),
          longitude: parseFloat(addressResult.rows[0].longitude),
        };
      } else if (resolvedDeliveryAddress) {
        // S'assurer que les coordonnées sont des nombres
        resolvedDeliveryAddress.latitude = parseFloat(resolvedDeliveryAddress.latitude);
        resolvedDeliveryAddress.longitude = parseFloat(resolvedDeliveryAddress.longitude);
      }

      if (!resolvedDeliveryAddress) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DELIVERY_ADDRESS_REQUIRED',
            message: 'Adresse de livraison requise',
          },
        });
      }

      // Convertir les coordonnées en nombres si elles sont des strings
      const rawLat = parseFloat(resolvedDeliveryAddress.latitude);
      const rawLon = parseFloat(resolvedDeliveryAddress.longitude);
      // Coordonnées par défaut : centre de Korhogo (utilisées si l'adresse n'a pas de GPS)
      const KORHOGO_LAT = 9.4580;
      const KORHOGO_LON = -5.6294;
      const hasValidCoords = rawLat && rawLon && !isNaN(rawLat) && !isNaN(rawLon);
      const lat = hasValidCoords ? rawLat : KORHOGO_LAT;
      const lon = hasValidCoords ? rawLon : KORHOGO_LON;
      if (!hasValidCoords) {
        logger.warn('Adresse sans coordonnées GPS — utilisation coords Korhogo par défaut', {
          address: resolvedDeliveryAddress,
        });
      }

      // 4. Calculer les frais de livraison (distance)
      const restaurantLat = parseFloat(restaurant.latitude) || KORHOGO_LAT;
      const restaurantLon = parseFloat(restaurant.longitude) || KORHOGO_LON;
      const deliveryRadius = parseFloat(restaurant.delivery_radius) || 15; // Par défaut 15 km

      const distance = await calculateDistance(
        restaurantLat,
        restaurantLon,
        lat,
        lon
      );

      logger.debug('Vérification zone de livraison', {
        restaurantId: restaurant.id,
        restaurantCoords: `${restaurantLat}, ${restaurantLon}`,
        deliveryCoords: `${lat}, ${lon}`,
        distance: `${distance} km`,
        deliveryRadius: `${deliveryRadius} km`,
        isWithinRange: distance <= deliveryRadius,
      });

      if (distance > deliveryRadius) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'OUT_OF_DELIVERY_RANGE',
            message: `Adresse hors de la zone de livraison (${deliveryRadius}km max). Distance: ${distance.toFixed(2)}km`,
          },
        });
      }

      let baseDeliveryFee = calculateDeliveryFee(distance);
      let originalDeliveryFee = baseDeliveryFee;
      let freeDeliveryApplied = false;
      let delivery_fee = 0;

      // === CALCUL DES BONUS (À INCLURE DANS LES FRAIS DE LIVRAISON) ===
      // Les bonus sont payés par le client et inclus dans les frais de livraison
      const { calculateDeliveryBonuses } = require('../utils/earnings');
      const orderDate = new Date();
      const bonuses = calculateDeliveryBonuses(baseDeliveryFee, distance, orderDate);
      const totalDeliveryFeeWithBonuses = baseDeliveryFee + bonuses.totalBonus;

      // === SEUIL DE LIVRAISON GRATUITE ===
      // Si le sous-total dépasse le seuil, la livraison est gratuite
      const freeDeliveryThreshold = config.business.freeDeliveryThreshold || 5000;
      const freeDeliveryEnabled = config.business.freeDeliveryEnabled !== false;
      
      if (freeDeliveryEnabled && subtotal >= freeDeliveryThreshold) {
        freeDeliveryApplied = true;
        delivery_fee = 0; // Livraison gratuite = 0 (sans bonus)
        originalDeliveryFee = totalDeliveryFeeWithBonuses; // Pour le log
        logger.info(`Livraison gratuite appliquée: sous-total ${subtotal} >= seuil ${freeDeliveryThreshold}`);
      } else {
        // Utiliser les frais avec bonus inclus
        delivery_fee = totalDeliveryFeeWithBonuses;
        originalDeliveryFee = totalDeliveryFeeWithBonuses;
      }

      // === DÉTECTION ET CALCUL DE LA RÉDUCTION BUNDLE ===
      // Si le panier contient un plat ET une boisson, appliquer une réduction
      let bundleDiscount = 0;
      let bundleApplied = false;
      const bundleDiscountEnabled = config.business.bundleDiscountEnabled !== false;
      const bundleDiscountPercent = config.business.bundleDiscountPercent || 5;
      const bundleDrinkCategories = config.business.bundleDrinkCategories || ['boissons', 'drinks', 'beverages', 'sodas', 'jus'];
      const bundleFoodCategories = config.business.bundleFoodCategories || ['plats', 'plat principal', 'entrées', 'grillades', 'poissons', 'viandes'];

      if (bundleDiscountEnabled && orderItems.length >= 2) {
        // Récupérer les catégories des items
        const itemCategories = await Promise.all(orderItems.map(async (item) => {
          const catResult = await client.query(
            'SELECT name FROM menu_categories WHERE id = $1',
            [item.menu_item_snapshot.category_id]
          );
          return catResult.rows[0]?.name?.toLowerCase() || '';
        }));

        // Vérifier si on a au moins un plat ET au moins une boisson
        const hasFood = itemCategories.some(cat => 
          bundleFoodCategories.some(food => cat.includes(food.toLowerCase()))
        );
        const hasDrink = itemCategories.some(cat => 
          bundleDrinkCategories.some(drink => cat.includes(drink.toLowerCase()))
        );

        if (hasFood && hasDrink) {
          bundleApplied = true;
          bundleDiscount = Math.round(subtotal * bundleDiscountPercent / 100);
          logger.info(`Réduction bundle appliquée: ${bundleDiscountPercent}% soit ${bundleDiscount} FCFA (plat + boisson détecté)`);
        }
      }

      // 5. Appliquer le code promo si fourni
      let discount = 0;
      let promo_code_id = null;
      let referralDiscount = 0;
      let isFirstOrderReferee = false;

      // === VÉRIFIER SI C'EST UN FILLEUL EFFECTUANT SA PREMIÈRE COMMANDE ===
      // Les filleuls bénéficient de 50% de réduction sur leur première commande
      const userOrdersCount = await client.query(
        'SELECT COUNT(*) FROM orders WHERE user_id = $1 AND status != $2',
        [req.user.id, 'cancelled']
      );
      
      const isFirstOrder = parseInt(userOrdersCount.rows[0].count) === 0;
      
      if (isFirstOrder) {
        // Vérifier si l'utilisateur a été parrainé
        const referralCheck = await client.query(
          `SELECT r.*, u.id as referrer_id 
           FROM referrals r
           JOIN users u ON r.referrer_id = u.id
           WHERE r.referee_id = $1 AND r.status = 'pending'`,
          [req.user.id]
        );
        
        if (referralCheck.rows.length > 0) {
          isFirstOrderReferee = true;
          // Appliquer 50% de réduction pour le filleul
          referralDiscount = subtotal * 0.5;
          logger.info(`Réduction filleul appliquée: 50% soit ${referralDiscount} FCFA pour utilisateur ${req.user.id}`);
        }
      }

      if (promo_code) {
        const promoResult = await client.query(
          `SELECT * FROM promotions 
           WHERE code = $1 
           AND is_active = true 
           AND valid_from <= NOW() 
           AND valid_until >= NOW()
           AND (usage_limit IS NULL OR used_count < usage_limit)`,
          [promo_code]
        );

        if (promoResult.rows.length > 0) {
          const promo = promoResult.rows[0];

          // Vérifier le montant minimum
          if (!promo.min_order_amount || subtotal >= promo.min_order_amount) {
            // Vérifier utilisation par utilisateur
            const usageResult = await client.query(
              'SELECT COUNT(*) FROM promo_usage WHERE promo_id = $1 AND user_id = $2',
              [promo.id, req.user.id]
            );

            const userUsage = parseInt(usageResult.rows[0].count);

            if (userUsage < (promo.usage_per_user || 1)) {
              promo_code_id = promo.id;

              if (promo.type === 'percentage') {
                discount = (subtotal * promo.value) / 100;
              } else if (promo.type === 'fixed_amount') {
                discount = promo.value;
              } else               if (promo.type === 'free_delivery') {
                // La réduction "livraison gratuite" s'applique sur le total avec bonus
                discount = delivery_fee;
              }

              if (promo.max_discount && discount > promo.max_discount) {
                discount = promo.max_discount;
              }
            }
          }
        }
      }

      // Prendre la réduction la plus avantageuse (code promo OU réduction filleul)
      if (referralDiscount > discount) {
        discount = referralDiscount;
        promo_code_id = null; // Pas de code promo utilisé
        logger.info(`Réduction filleul (${referralDiscount}) plus avantageuse que code promo (${discount})`);
      }

      // 6. Calculer la commission Baibebalo (taux du restaurant, défaut 15 %) — voir utils/commission.js
      const { getCommission } = require('../utils/commission');
      const { commission, rate: commissionRate } = getCommission(subtotal, restaurant.commission_rate);

      // Ajouter la réduction bundle au discount total
      const totalDiscount = discount + bundleDiscount;

      // 7. Calculer le total
      // Total = Sous-total + Frais de livraison - Réduction (promo + bundle)
      const total = Math.max(0, subtotal + delivery_fee - totalDiscount);
      
      // Logger le calcul final pour déboguer
      logger.info('Calcul final commande:', {
        subtotal,
        baseDeliveryFee: baseDeliveryFee,
        bonuses: bonuses.totalBonus,
        delivery_fee, // Total avec bonus inclus
        totalDiscount,
        commission,
        commissionRate,
        netRevenue: subtotal - commission,
        total,
        items_count: orderItems.length,
        items_total_check: orderItems.reduce((sum, item) => sum + item.subtotal, 0),
        items_details: orderItems.map(item => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          item_subtotal: item.subtotal,
        })),
      });

      // 8. Créer la commande
      const order_number = generateOrderNumber();

      // S'assurer que delivery_address a les coordonnées en nombres
      const deliveryAddressForDB = {
        ...resolvedDeliveryAddress,
        latitude: lat,
        longitude: lon,
      };

      // Métadonnées des réductions appliquées
      const discountMetadata = {
        promo_discount: discount - bundleDiscount - (isFirstOrderReferee ? referralDiscount : 0),
        bundle_discount: bundleDiscount,
        bundle_applied: bundleApplied,
        referral_discount: isFirstOrderReferee ? referralDiscount : 0,
        free_delivery_applied: freeDeliveryApplied,
        original_delivery_fee: originalDeliveryFee,
        base_delivery_fee: baseDeliveryFee,
        bonuses: {
          long_distance: bonuses.breakdown.bonus_long_distance,
          peak_hour: bonuses.breakdown.bonus_peak_hour,
          weekend: bonuses.breakdown.bonus_weekend,
          total: bonuses.totalBonus,
        },
        delivery_savings: freeDeliveryApplied ? originalDeliveryFee : 0,
      };

      const orderStatus = scheduled_at ? 'scheduled' : 'new';
      const orderResult = await client.query(
        `INSERT INTO orders (
          order_number, user_id, restaurant_id,
          subtotal, delivery_fee, discount, commission, commission_rate, total,
          delivery_address, special_instructions,
          payment_method, payment_status, status,
          promo_code_id, estimated_delivery_time, delivery_distance, scheduled_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *`,
        [
          order_number, req.user.id, restaurant_id,
          subtotal, delivery_fee, totalDiscount, commission, commissionRate, total,
          JSON.stringify({ ...deliveryAddressForDB, discount_metadata: discountMetadata }),
          special_instructions,
          payment_method, 'pending',
          orderStatus, promo_code_id,
          30,
          distance,
          scheduled_at || null,
        ]
      );

      const order = orderResult.rows[0];

      // 8. Insérer les items de la commande
      for (const item of orderItems) {
        await client.query(
          `INSERT INTO order_items (
            order_id, menu_item_id, menu_item_snapshot,
            quantity, unit_price, selected_options,
            special_notes, subtotal
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            order.id,
            item.menu_item_id,
            JSON.stringify(item.menu_item_snapshot),
            item.quantity,
            item.unit_price,
            JSON.stringify(item.selected_options),
            item.special_notes,
            item.subtotal,
          ]
        );
      }

      // 9. Mettre à jour l'utilisation du code promo
      if (promo_code_id) {
        await client.query(
          'UPDATE promotions SET used_count = used_count + 1 WHERE id = $1',
          [promo_code_id]
        );

        await client.query(
          'INSERT INTO promo_usage (promo_id, user_id, order_id, discount_amount) VALUES ($1, $2, $3, $4)',
          [promo_code_id, req.user.id, order.id, discount]
        );
      }

      // 10. Créer la transaction
      await client.query(
        `INSERT INTO transactions (
          order_id, transaction_type, amount, 
          from_user_type, from_user_id,
          to_user_type, to_user_id,
          status, payment_method
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          order.id, 'order_payment', total,
          'client', req.user.id,
          'restaurant', restaurant_id,
          'pending', payment_method
        ]
      );

      // 11. Envoyer les notifications
      const io = req.app.get('io');
      const partnersIo = req.app.get('partnersIo');
      const smsService = require('../services/sms.service');
      const { notifyNewOrder } = require('../utils/socket');

      const customerName = (resolvedDeliveryAddress && (resolvedDeliveryAddress.recipient_name || resolvedDeliveryAddress.full_name))
        || (req.user && (req.user.first_name ? [req.user.first_name, req.user.last_name].filter(Boolean).join(' ') : req.user.name))
        || 'Client';

      // Notifier le restaurant via le namespace partners
      if (partnersIo) {
        partnersIo.to(`restaurant_${restaurant_id}`).emit('new_order', {
          orderId: order.id,
          order_id: order.id,
          order_number: order.order_number,
          total: order.total,
          customer_name: customerName,
          items_count: items.length,
          created_at: order.created_at,
        });
        logger.info('📱 Notification new_order envoyée au restaurant', { 
          restaurantId: restaurant_id,
          orderId: order.id 
        });
      }

      // Notifier les admins du dashboard
      notifyNewOrder(io, order);

      // Notifier le restaurant par SMS
      if (restaurant.phone) {
        try {
          await smsService.sendRestaurantNotification(
            restaurant.phone,
            order.order_number,
            order.total
          );
        } catch (smsError) {
          logger.warn('Échec envoi SMS restaurant (createOrder)', { 
            error: smsError.message,
            restaurantId: restaurant.id 
          });
        }
      }

      // Notifier le client par SMS
      const userResult = await client.query(
        'SELECT phone FROM users WHERE id = $1',
        [req.user.id]
      );

      if (userResult.rows[0]?.phone) {
        try {
          await smsService.sendOrderNotification(
            userResult.rows[0].phone,
            order.order_number,
            'accepted'
          );
        } catch (smsError) {
          logger.warn('Échec envoi SMS client (createOrder)', { 
            error: smsError.message,
            userId: req.user.id 
          });
        }
      }

      // Les notifications push sont envoyées APRÈS le commit (voir après transaction)

      // === TRAITEMENT DU PARRAINAGE ===
      // Si c'est la première commande d'un filleul, créditer le parrain
      if (isFirstOrderReferee) {
        try {
          // Récupérer le parrainage en attente
          const referralResult = await client.query(
            `SELECT r.*, u.first_name as referrer_name
             FROM referrals r
             JOIN users u ON r.referrer_id = u.id
             WHERE r.referee_id = $1 AND r.status = 'pending'`,
            [req.user.id]
          );
          
          if (referralResult.rows.length > 0) {
            const referral = referralResult.rows[0];
            const referrerReward = 500; // Bonus parrain: 500 FCFA
            
            // Marquer le parrainage comme complété
            await client.query(
              `UPDATE referrals 
               SET status = 'completed', completed_at = NOW(), first_order_id = $1
               WHERE id = $2`,
              [order.id, referral.id]
            );
            
            // Créditer le parrain (500 FCFA en points ou solde)
            await client.query(
              `UPDATE users 
               SET loyalty_points = COALESCE(loyalty_points, 0) + $1
               WHERE id = $2`,
              [referrerReward, referral.referrer_id]
            );
            
            // Enregistrer la transaction de bonus parrain
            await client.query(
              `INSERT INTO loyalty_transactions (
                user_id, points, type, description, created_at
              ) VALUES ($1, $2, $3, $4, NOW())`,
              [
                referral.referrer_id,
                referrerReward,
                'referral_bonus',
                `Bonus parrainage - Première commande de votre filleul`,
              ]
            );
            
            logger.info(`Parrainage complété: parrain ${referral.referrer_id} reçoit ${referrerReward} points`);
            
            // Notification au parrain
            try {
              await notificationService.sendToUser(referral.referrer_id, 'client', {
                title: '🎉 Bonus de parrainage !',
                body: `Votre filleul a passé sa première commande. Vous recevez ${referrerReward} points !`,
                type: 'referral_bonus',
                data: { points: referrerReward },
                channel: 'rewards',
              });
            } catch (e) {
              // Ignorer l'erreur de notification
            }
          }
        } catch (referralError) {
          logger.warn('Erreur traitement parrainage:', referralError.message);
          // Ne pas bloquer la commande si le parrainage échoue
        }
      }
      // === FIN TRAITEMENT PARRAINAGE ===

      logger.info(`Commande créée: ${order.order_number}`);

      return { order };
    });
    if (result && result.order) {
      res.status(201).json({
        success: true,
        message: 'Commande créée avec succès',
        data: {
          order: {
            id: result.order.id,
            order_number: result.order.order_number,
            status: result.order.status,
            total: result.order.total,
            estimated_delivery_time: result.order.estimated_delivery_time,
          },
        },
      });
      try {
        await notificationService.sendOrderNotification(result.order.id, 'restaurant', 'new_order');
        await notificationService.sendOrderNotification(result.order.id, 'client', 'order_confirmed');
      } catch (notificationError) {
        logger.warn('Notification push ignorée (createOrder)', { error: notificationError.message });
      }
    }
  } catch (error) {
    logger.error('Erreur createOrder:', { message: error.message, stack: error.stack, code: error.code, detail: error.detail });
    res.status(500).json({
      success: false,
      error: {
        code: 'ORDER_CREATION_ERROR',
        message: 'Erreur lors de la création de la commande',
      },
    });
  }
};

/**
 * Calculer la distance entre deux points GPS
 * Utilise le service maps gratuit (formule Haversine)
 */
const calculateDistance = async (lat1, lon1, lat2, lon2) => {
  // Utiliser le service maps gratuit au lieu de PostGIS
  // (PostGIS nécessite l'extension cube, ce service est plus portable)
  return mapsService.calculateDistance(lat1, lon1, lat2, lon2);
};

/**
 * Obtenir les détails d'une commande
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'ID de commande invalide' },
      });
    }

    const result = await query(
      `SELECT o.*, 
              r.name as restaurant_name, r.logo as restaurant_logo,
              r.phone as restaurant_phone, r.address as restaurant_address,
              r.latitude as restaurant_latitude, r.longitude as restaurant_longitude,
              u.first_name as client_first_name, u.last_name as client_last_name,
              u.phone as client_phone,
              dp.first_name as delivery_first_name, dp.last_name as delivery_last_name,
              dp.phone as delivery_phone, dp.vehicle_type, dp.vehicle_plate,
              dp.current_latitude as delivery_latitude,
              dp.current_longitude as delivery_longitude,
              dp.profile_photo as delivery_photo,
              dp.average_rating as delivery_rating
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN delivery_persons dp ON o.delivery_person_id = dp.id
       WHERE o.id = $1`,
      [id]
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

    // Vérifier les permissions (client = user_id; accepter type 'user' ou 'client' pour le client)
    const userIdStr = String(req.user.id);
    const orderUserIdStr = order.user_id != null ? String(order.user_id) : '';
    const orderRestaurantIdStr = order.restaurant_id != null ? String(order.restaurant_id) : '';
    const orderDeliveryIdStr = order.delivery_person_id != null ? String(order.delivery_person_id) : '';
    const canView =
      req.user.type === 'admin' ||
      ((req.user.type === 'client' || req.user.type === 'user') && orderUserIdStr === userIdStr) ||
      (req.user.type === 'restaurant' && orderRestaurantIdStr === userIdStr) ||
      (req.user.type === 'delivery_person' && orderDeliveryIdStr === userIdStr);

    if (!canView) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Accès interdit',
        },
      });
    }

    // Récupérer les items avec les noms depuis le snapshot
    const itemsResult = await query(
      `SELECT oi.*, 
              COALESCE(oi.menu_item_snapshot->>'name', mi.name) as item_name,
              COALESCE((oi.menu_item_snapshot->>'price')::numeric, mi.price, oi.unit_price) as item_price
       FROM order_items oi
       LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE oi.order_id = $1`,
      [id]
    );

    // Formater les items pour le frontend
    const formattedItems = itemsResult.rows.map(item => {
      const snapshot = typeof item.menu_item_snapshot === 'string' 
        ? JSON.parse(item.menu_item_snapshot) 
        : item.menu_item_snapshot;
      
      return {
        ...item,
        name: item.item_name || snapshot?.name || 'Article',
        price: Number.parseFloat(item.unit_price || item.item_price || snapshot?.price || 0),
        menu_item: snapshot ? {
          name: snapshot.name,
          price: snapshot.price,
          image_url: snapshot.photo || snapshot.image_url,
        } : null,
      };
    });

    // Formater l'adresse de livraison si elle est en JSON
    let discountMetadata = null;
    if (order.delivery_address && typeof order.delivery_address === 'string') {
      try {
        const parsedAddress = JSON.parse(order.delivery_address);
        // Extraire discount_metadata si présent
        if (parsedAddress.discount_metadata) {
          discountMetadata = parsedAddress.discount_metadata;
          // Garder seulement l'adresse dans delivery_address
          const { discount_metadata, ...addressData } = parsedAddress;
          order.delivery_address = addressData;
        } else {
          order.delivery_address = parsedAddress;
        }
      } catch (e) {
        // Garder la valeur string si le parsing échoue
      }
    }
    
    // Ajouter les informations sur les bonus si disponibles
    if (discountMetadata && discountMetadata.bonuses) {
      order.delivery_fee_breakdown = {
        base_delivery_fee: discountMetadata.base_delivery_fee || 0,
        bonuses: discountMetadata.bonuses,
        total: order.delivery_fee || 0,
      };
    }

    // Structurer les données du restaurant pour correspondre à l'attendu du frontend
    // Pour les commandes express, pas de restaurant
    let restaurantPhone = order.restaurant_phone;
    let restaurantAddress = order.restaurant_address;
    
    if (order.restaurant_id && (!restaurantPhone || !restaurantAddress)) {
      try {
        const restaurantResult = await query(
          'SELECT phone, address FROM restaurants WHERE id = $1',
          [order.restaurant_id]
        );
        if (restaurantResult.rows[0]) {
          restaurantPhone = restaurantPhone || restaurantResult.rows[0].phone;
          restaurantAddress = restaurantAddress || restaurantResult.rows[0].address;
        }
      } catch (restaurantError) {
        logger.warn('Erreur récupération restaurant:', restaurantError);
      }
    }
    
    order.restaurant = order.restaurant_id ? {
      id: order.restaurant_id,
      name: order.restaurant_name,
      phone: restaurantPhone || null,
      logo: order.restaurant_logo,
      address: restaurantAddress || null,
      latitude: order.restaurant_latitude,
      longitude: order.restaurant_longitude,
    } : null;
    order.order_type = order.order_type || 'food';
    if (order.order_type === 'express' && order.pickup_address) {
      order.pickup_address = typeof order.pickup_address === 'string' ? JSON.parse(order.pickup_address) : order.pickup_address;
    }
    
    // Logger pour déboguer
    logger.debug('Données restaurant structurées (getOrderById):', {
      orderId: order.id,
      restaurantId: order.restaurant_id,
      restaurant_name_from_join: order.restaurant_name,
      restaurant_address_from_join: order.restaurant_address,
      restaurant_phone_from_join: order.restaurant_phone,
      restaurant_final: order.restaurant,
    });

    // Structurer les données du client
    // Vérifier si les données du client sont disponibles, sinon les récupérer directement
    let clientFirstName = order.client_first_name;
    let clientLastName = order.client_last_name;
    let clientPhone = order.client_phone;
    
    // TOUJOURS récupérer les données si elles manquent (même si seulement le téléphone manque)
    if (order.user_id && (!clientFirstName || !clientLastName || !clientPhone)) {
      try {
        const userResult = await query(
          'SELECT first_name, last_name, phone FROM users WHERE id = $1',
          [order.user_id]
        );
        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          clientFirstName = clientFirstName || user.first_name || null;
          clientLastName = clientLastName || user.last_name || null;
          clientPhone = clientPhone || user.phone || null;
          
          logger.debug('Données client récupérées directement (getOrderById):', {
            orderId: order.id,
            userId: order.user_id,
            phone_from_join: order.client_phone,
            phone_from_db: user.phone,
            phone_final: clientPhone,
            first_name: clientFirstName,
            last_name: clientLastName,
          });
        } else {
          logger.warn('Utilisateur non trouvé pour récupération client (getOrderById):', {
            orderId: order.id,
            userId: order.user_id,
          });
        }
      } catch (userError) {
        logger.error('Erreur récupération client (getOrderById):', {
          orderId: order.id,
          userId: order.user_id,
          error: userError.message,
        });
      }
    }
    
    // Ajouter les données client à l'objet order pour faciliter l'accès
    order.client_first_name = clientFirstName;
    order.client_last_name = clientLastName;
    order.client_phone = clientPhone;
    
    logger.debug('Données client structurées (getOrderById):', {
      orderId: order.id,
      userId: order.user_id,
      client_first_name_from_join: order.client_first_name,
      client_last_name_from_join: order.client_last_name,
      client_phone_from_join: order.client_phone,
      client_final: {
        first_name: clientFirstName,
        last_name: clientLastName,
        phone: clientPhone,
      },
      phone_is_null: clientPhone === null,
      phone_is_empty: clientPhone === '',
      phone_is_undefined: clientPhone === undefined,
    });

    // Structurer les données du livreur si assigné
    if (order.delivery_first_name) {
      order.delivery_person = {
        first_name: order.delivery_first_name,
        last_name: order.delivery_last_name,
        phone: order.delivery_phone,
        vehicle_type: order.vehicle_type,
        current_latitude: order.delivery_latitude,
        current_longitude: order.delivery_longitude,
      };
    }

    order.items = formattedItems;

    // RECALCULER le total pour garantir l'exactitude
    // Total = Sous-total + Frais de livraison - Réduction
    const subtotal = parseFloat(order.subtotal) || 0;
    const deliveryFee = parseFloat(order.delivery_fee) || 0;
    const discount = parseFloat(order.discount) || 0;
    const storedTotal = parseFloat(order.total) || 0;
    const recalculatedTotal = Math.max(0, subtotal + deliveryFee - discount);
    
    // Logger si le total diffère de celui en base
    if (Math.abs(storedTotal - recalculatedTotal) > 0.01) {
      logger.warn('Total recalculé diffère de celui en base (getOrderById):', {
        orderId: order.id,
        orderNumber: order.order_number,
        storedTotal,
        recalculatedTotal,
        subtotal,
        deliveryFee,
        discount,
        difference: Math.abs(storedTotal - recalculatedTotal),
        formula: `${subtotal} + ${deliveryFee} - ${discount} = ${recalculatedTotal}`,
      });
    }
    
    // Utiliser le total recalculé (source de vérité)
    order.total = recalculatedTotal;
    
    // Logger pour vérification
    logger.info('getOrderById - Total recalculé:', {
      orderId: order.id,
      orderNumber: order.order_number,
      subtotal,
      deliveryFee,
      discount,
      storedTotal,
      recalculatedTotal,
      formula: `${subtotal} + ${deliveryFee} - ${discount} = ${recalculatedTotal}`,
    });

    // Calculer les gains estimés et revenu net restaurant pour les livreurs
    if ((req.user.type === 'delivery' || req.user.type === 'delivery_person') && order.delivery_fee) {
      const { calculateEstimatedEarnings } = require('../utils/earnings');
      order.estimated_earnings = calculateEstimatedEarnings(
        parseFloat(order.delivery_fee || 0),
        parseFloat(order.delivery_distance || 0),
        order.placed_at ? new Date(order.placed_at) : new Date()
      );
      
      // Calculer le revenu net du restaurant pour que le livreur sache combien le restaurant doit recevoir (commandes food uniquement)
      if (order.restaurant_id) {
        const { getCommission, getNetRestaurantRevenue } = require('../utils/commission');
        const commissionRate = parseFloat(order.commission_rate) || 15;
        const netRestaurantRevenue = getNetRestaurantRevenue(subtotal, commissionRate, order.commission);
        order.restaurant_net_revenue = netRestaurantRevenue;
        order.restaurant_subtotal = subtotal;
        order.restaurant_commission = order.commission || getCommission(subtotal, commissionRate).commission;
      }
    }

    // S'assurer que client_phone est bien présent dans la réponse
    if (!order.client_phone && order.user_id) {
      logger.warn('⚠️ client_phone manquant avant envoi réponse (getOrderById):', {
        orderId: order.id,
        userId: order.user_id,
        client_first_name: order.client_first_name,
        client_last_name: order.client_last_name,
      });
    }
    
    res.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    logger.error('Erreur getOrderById:', error);
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
 * Annuler une commande (Client)
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    return await transaction(async (client) => {
      const orderResult = await client.query(
        'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
        });
      }

      const order = orderResult.rows[0];

      // Vérifier le statut
      if (!['new', 'accepted'].includes(order.status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CANNOT_CANCEL',
            message: 'Cette commande ne peut plus être annulée',
          },
        });
      }

      // Annuler la commande
      await client.query(
        `UPDATE orders 
         SET status = 'cancelled', 
             cancellation_reason = $1,
             cancelled_at = NOW()
         WHERE id = $2`,
        [reason, id]
      );

      // Si paiement déjà effectué, créer remboursement (plateforme → client, comme Glovo)
      if (order.payment_status === 'paid') {
        await client.query(
          `INSERT INTO transactions (
            order_id, transaction_type, amount,
            from_user_type, from_user_id,
            to_user_type, to_user_id,
            status, payment_method, metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            order.id, 'refund', order.total,
            'platform', null,
            'user', order.user_id,
            'pending', order.payment_method || 'internal',
            JSON.stringify({ reason: reason || 'Annulation commande', order_number: order.order_number })
          ]
        );
        await client.query(
          `UPDATE orders SET payment_status = 'refunded', updated_at = NOW() WHERE id = $1`,
          [order.id]
        );
      }

      // Notifier les parties
      const io = req.app.get('io');
      const partnersIo = req.app.get('partnersIo');
      
      // Notifier le restaurant via partnersIo
      if (partnersIo) {
        partnersIo.to(`restaurant_${order.restaurant_id}`).emit('order_cancelled', {
          orderId: order.id,
          order_id: order.id,
          reason,
        });
      }

      // Notifier l'admin dashboard
      const { notifyOrderStatusChange: notifyCancelAdmin } = require('../utils/socket');
      if (io) notifyCancelAdmin(io, order.id, 'cancelled', { reason });

      try {
        await notificationService.sendOrderNotification(order.id, 'restaurant', 'order_cancelled');
      } catch (notificationError) {
        logger.warn('Notification push ignorée (cancelOrder)', { error: notificationError.message });
      }

      logger.info(`Commande annulée: ${order.order_number}`);

      res.json({
        success: true,
        message: 'Commande annulée avec succès',
      });
    });
  } catch (error) {
    logger.error('Erreur cancelOrder:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CANCEL_ERROR', message: 'Erreur lors de l\'annulation' },
    });
  }
};

/**
 * Laisser un avis sur une commande
 */
exports.reviewOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      restaurant_rating,
      food_quality,
      order_accuracy,
      packaging,
      delivery_rating,
      speed,
      courtesy,
      comment,
      tags,
      photos,
    } = req.body;

    return await transaction(async (client) => {
      // Vérifier que la commande existe et est livrée
      const orderResult = await client.query(
        `SELECT * FROM orders 
         WHERE id = $1 AND user_id = $2 AND status = 'delivered'`,
        [id, req.user.id]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Commande non trouvée ou pas encore livrée',
          },
        });
      }

      const order = orderResult.rows[0];

      // Vérifier si avis déjà laissé
      const existingReview = await client.query(
        'SELECT id FROM reviews WHERE order_id = $1',
        [id]
      );

      if (existingReview.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'REVIEW_EXISTS',
            message: 'Vous avez déjà évalué cette commande',
          },
        });
      }

      // Créer l'avis
      await client.query(
        `INSERT INTO reviews (
          order_id, user_id, restaurant_id, delivery_person_id,
          restaurant_rating, food_quality, order_accuracy, packaging,
          delivery_rating, speed, courtesy,
          comment, tags, photos
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          id, req.user.id, order.restaurant_id, order.delivery_person_id,
          restaurant_rating, food_quality, order_accuracy, packaging,
          delivery_rating, speed, courtesy,
          comment, tags || [], photos || []
        ]
      );

      // Mettre à jour la note moyenne du restaurant
      const avgResult = await client.query(
        `SELECT AVG(restaurant_rating) as avg_rating, COUNT(*) as total
         FROM reviews WHERE restaurant_id = $1`,
        [order.restaurant_id]
      );

      await client.query(
        'UPDATE restaurants SET average_rating = $1, total_reviews = $2 WHERE id = $3',
        [
          parseFloat(avgResult.rows[0].avg_rating).toFixed(2),
          parseInt(avgResult.rows[0].total),
          order.restaurant_id
        ]
      );

      // Mettre à jour la note moyenne du livreur
      if (order.delivery_person_id) {
        const deliveryAvgResult = await client.query(
          `SELECT AVG(delivery_rating) as avg_rating
           FROM reviews WHERE delivery_person_id = $1 AND delivery_rating IS NOT NULL`,
          [order.delivery_person_id]
        );

        await client.query(
          'UPDATE delivery_persons SET average_rating = $1 WHERE id = $2',
          [
            parseFloat(deliveryAvgResult.rows[0].avg_rating).toFixed(2),
            order.delivery_person_id
          ]
        );

        // === BONUS NOTE PARFAITE (5 étoiles) ===
        // Si le livreur reçoit 5/5, il gagne un bonus de 100 FCFA
        if (delivery_rating === 5) {
          const config = require('../config');
          const perfectRatingBonus = config.business.deliveryBonusPerfectRatingAmount || 100;

          await client.query(
            `UPDATE delivery_persons 
             SET total_earnings = total_earnings + $1,
                 available_balance = available_balance + $1
             WHERE id = $2`,
            [perfectRatingBonus, order.delivery_person_id]
          );

          // Enregistrer la transaction de bonus
          await client.query(
            `INSERT INTO transactions (
              order_id, transaction_type, amount,
              from_user_type, from_user_id,
              to_user_type, to_user_id,
              status, payment_method, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              order.id, 'bonus_perfect_rating', perfectRatingBonus,
              'platform', null,
              'delivery', order.delivery_person_id,
              'completed', 'internal',
              JSON.stringify({ rating: 5, order_number: order.order_number }),
            ]
          );

          logger.info(`Bonus note parfaite attribué au livreur ${order.delivery_person_id}: +${perfectRatingBonus} FCFA`);

          // Notification au livreur
          try {
            await notificationService.sendToUser(order.delivery_person_id, 'delivery', {
              title: '⭐ Note parfaite !',
              body: `Félicitations ! Vous avez reçu 5 étoiles. Bonus de ${perfectRatingBonus} FCFA crédité !`,
              type: 'bonus_perfect_rating',
              data: { bonus: perfectRatingBonus, rating: 5 },
              channel: 'rewards',
            });
          } catch (e) {
            // Ignorer l'erreur de notification
          }
        }
      }

      logger.info(`Avis créé pour commande: ${order.order_number}`);

      res.status(201).json({
        success: true,
        message: 'Merci pour votre avis !',
      });
    });
  } catch (error) {
    logger.error('Erreur reviewOrder:', error);
    res.status(500).json({
      success: false,
      error: { code: 'REVIEW_ERROR', message: 'Erreur lors de la création de l\'avis' },
    });
  }
};

/**
 * Accepter une commande (Restaurant)
 */
exports.acceptOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const estimated_time = req.body.estimated_preparation_time ?? req.body.estimated_time;

    return await transaction(async (client) => {
      const orderResult = await client.query(
        'SELECT * FROM orders WHERE id = $1 AND restaurant_id = $2 AND status = $3',
        [id, req.user.id, 'new']
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
        });
      }

      await client.query(
        `UPDATE orders 
         SET status = 'accepted', 
             accepted_at = NOW(),
             estimated_delivery_time = $1
         WHERE id = $2`,
        [estimated_time || 30, id]
      );

      const order = orderResult.rows[0];

      // Notifier le client
      const io = req.app.get('io');
      const { emitToOrder } = require('../utils/socketEmitter');
      emitToOrder(req.app, id, 'order_status_changed', {
        order_id: id,
        status: 'accepted',
      });
      
      // Notifier les admins du dashboard
      const { notifyOrderStatusChange } = require('../utils/socket');
      notifyOrderStatusChange(io, id, 'accepted');

      // Notifier l'app restaurant (pour arrêter alertes / pendingOrders)
      const partnersIo = req.app.get('partnersIo');
      if (partnersIo && order.restaurant_id) {
        partnersIo.to(`restaurant_${order.restaurant_id}`).emit('order_update', {
          order_id: id,
          orderId: id,
          status: 'accepted',
        });
      }

      const userResult = await client.query(
        'SELECT phone FROM users WHERE id = $1',
        [order.user_id]
      );

      // Notifier le client par SMS
      if (userResult.rows[0]?.phone) {
        try {
          const smsService = require('../services/sms.service');
          await smsService.sendOrderNotification(
            userResult.rows[0].phone,
            order.order_number,
            'accepted'
          );
        } catch (smsError) {
          logger.warn('Échec envoi SMS client (acceptOrder)', { 
            error: smsError.message,
            orderId: id 
          });
        }
      }

      // Push notification au client
      try {
        await notificationService.sendOrderNotification(order.id, 'client', 'order_confirmed');
      } catch (notificationError) {
        logger.warn('Notification push ignorée (acceptOrder)', { error: notificationError.message });
      }

      logger.info(`Commande acceptée: ${order.order_number}`);

      res.json({
        success: true,
        message: 'Commande acceptée',
      });
    });
  } catch (error) {
    logger.error('Erreur acceptOrder:', error);
    res.status(500).json({
      success: false,
      error: { code: 'ACCEPT_ERROR', message: 'Erreur lors de l\'acceptation' },
    });
  }
};

/**
 * Refuser une commande (Restaurant)
 */
exports.rejectOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await query(
      `UPDATE orders 
       SET status = 'cancelled', 
           cancellation_reason = $1
       WHERE id = $2 AND restaurant_id = $3 AND status = 'new'
       RETURNING *`,
      [reason, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
      });
    }

    const order = result.rows[0];

    // Si la commande était déjà payée (Mobile Money), créer remboursement plateforme → client
    if (order.payment_status === 'paid') {
      await query(
        `INSERT INTO transactions (
          order_id, transaction_type, amount,
          from_user_type, from_user_id,
          to_user_type, to_user_id,
          status, payment_method, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          order.id, 'refund', order.total,
          'platform', null,
          'user', order.user_id,
          'pending', order.payment_method || 'internal',
          JSON.stringify({ reason: reason || 'Refus restaurant', order_number: order.order_number, source: 'restaurant_reject' })
        ]
      );
      await query(
        `UPDATE orders SET payment_status = 'refunded', updated_at = NOW() WHERE id = $1`,
        [order.id]
      );
    }

    // Notifier le client
    const io = req.app.get('io');
    const { emitToOrder } = require('../utils/socketEmitter');
    emitToOrder(req.app, id, 'order_status_changed', {
      order_id: id,
      status: 'cancelled',
      reason,
    });

    // Notifier l'app restaurant (arrêter alertes)
    const partnersIo = req.app.get('partnersIo');
    if (partnersIo && order.restaurant_id) {
      partnersIo.to(`restaurant_${order.restaurant_id}`).emit('order_update', {
        order_id: id,
        orderId: id,
        status: 'refused',
      });
    }

    // Notifier l'admin dashboard
    const { notifyOrderStatusChange: notifyRejectAdmin } = require('../utils/socket');
    if (io) notifyRejectAdmin(io, id, 'cancelled', { reason, rejected_by: 'restaurant' });

    try {
      await notificationService.sendOrderNotification(order.id, 'client', 'order_cancelled');
    } catch (notificationError) {
      logger.warn('Notification push ignorée (rejectOrder)', { error: notificationError.message });
    }

    logger.info(`Commande refusée: ${order.order_number}`);

    res.json({
      success: true,
      message: 'Commande refusée',
    });
  } catch (error) {
    logger.error('Erreur rejectOrder:', error);
    res.status(500).json({
      success: false,
      error: { code: 'REJECT_ERROR', message: 'Erreur lors du refus' },
    });
  }
};

/**
 * Marquer commande comme prête (Restaurant)
 * Accepte les statuts new, accepted, preparing (certains restaurants marquent prête sans cliquer "Accepter").
 */
exports.markOrderReady = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.user.id;

    const result = await query(
      `UPDATE orders 
       SET status = 'ready', 
           ready_at = NOW(),
           accepted_at = COALESCE(accepted_at, NOW())
       WHERE id = $1 AND restaurant_id = $2 AND status IN ('new', 'accepted', 'preparing')
       RETURNING *`,
      [id, restaurantId]
    );

    if (result.rows.length === 0) {
      const check = await query(
        'SELECT id, status, restaurant_id FROM orders WHERE id = $1',
        [id]
      );
      if (check.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
        });
      }
      const order = check.rows[0];
      if (order.restaurant_id != null && order.restaurant_id !== restaurantId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cette commande n\'appartient pas à votre restaurant' },
        });
      }
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'La commande ne peut pas être marquée prête dans son état actuel (statut: ' + (order.status || 'inconnu') + ')',
        },
      });
    }

    const order = result.rows[0];
    let proposalResult = { proposed: false };

    try {
      const io = req.app.get('io');
      const partnersIo = req.app.get('partnersIo');

      const restaurantResult = await query(
        'SELECT name, address, latitude, longitude FROM restaurants WHERE id = $1',
        [order.restaurant_id]
      );
      const restaurant = restaurantResult.rows[0] || {};

      const { emitToOrder } = require('../utils/socketEmitter');
      emitToOrder(req.app, id, 'order_status_changed', {
        order_id: id,
        status: 'ready',
        message: 'Votre commande est prête !',
      });

      const { notifyOrderStatusChange } = require('../utils/socket');
      if (io) notifyOrderStatusChange(io, id, 'ready');

      if (order.delivery_person_id) {
        if (partnersIo) {
          partnersIo.to(`delivery_${order.delivery_person_id}`).emit('order_ready', {
            order_id: id,
            order_number: order.order_number,
            restaurant_name: restaurant?.name,
            restaurant_address: restaurant?.address,
          });
        }
        try {
          await notificationService.sendOrderNotification(order.id, 'delivery', 'order_ready_for_pickup');
        } catch (err) {
          logger.warn('Push livreur ignorée', { error: err.message });
        }
      } else {
        const deliveryProposalService = require('../services/deliveryProposal.service');
        proposalResult = await deliveryProposalService.proposeOrderToDelivery(id, req.app);
        if (proposalResult.proposed) {
          logger.info(`Course proposée automatiquement à un livreur pour ${order.order_number}`);
        }
      }

      try {
        await notificationService.sendOrderNotification(order.id, 'client', 'order_ready');
      } catch (notificationError) {
        logger.warn('Notification push ignorée (markOrderReady)', { error: notificationError.message });
      }
    } catch (notifyErr) {
      logger.warn('Notifications/socket ignorées (markOrderReady)', { error: notifyErr.message });
    }

    logger.info(`Commande prête: ${order.order_number}`);

    let availableCount = 0;
    try {
      if (!order.delivery_person_id) {
        const countResult = await query(
          `SELECT COUNT(*) FROM delivery_persons 
           WHERE status = 'active' AND delivery_status = 'available'`
        );
        availableCount = parseInt(countResult.rows[0]?.count, 10) || 0;
      }
    } catch (countErr) {
      logger.warn('Count delivery_persons ignoré (markOrderReady)', { error: countErr.message });
    }

    res.json({
      success: true,
      message: 'Commande marquée comme prête',
      data: {
        proposed_to_delivery: proposalResult.proposed || false,
        available_delivery_persons: availableCount,
      },
    });
  } catch (error) {
    logger.error('Erreur markOrderReady:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: error.message || 'Erreur lors de la mise à jour',
      },
    });
  }
};

/**
 * Suivre une commande en temps réel
 */
exports.trackOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'ID de commande invalide' },
      });
    }

    const result = await query(
      `SELECT o.*, 
              r.name as restaurant_name, r.address as restaurant_address,
              r.phone as restaurant_phone, r.logo as restaurant_logo,
              r.latitude as restaurant_latitude, 
              r.longitude as restaurant_longitude,
              u.first_name as client_first_name, u.last_name as client_last_name,
              u.phone as client_phone,
              d.first_name as delivery_first_name, d.last_name as delivery_last_name,
              d.phone as delivery_phone, d.current_latitude, d.current_longitude,
              d.vehicle_type, d.vehicle_plate, d.profile_photo as delivery_photo,
              d.average_rating as delivery_rating
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN delivery_persons d ON o.delivery_person_id = d.id
       WHERE o.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
      });
    }

    const order = result.rows[0];

    // Récupérer les items avec les noms depuis le snapshot (comme dans getOrderById)
    const itemsResult = await query(
      `SELECT oi.*, 
              COALESCE(oi.menu_item_snapshot->>'name', mi.name) as item_name,
              COALESCE((oi.menu_item_snapshot->>'price')::numeric, mi.price, oi.unit_price) as item_price
       FROM order_items oi
       LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE oi.order_id = $1`,
      [id]
    );

    // Formater les items pour le frontend (identique à getOrderById)
    const formattedItems = itemsResult.rows.map(item => {
      const snapshot = typeof item.menu_item_snapshot === 'string' 
        ? JSON.parse(item.menu_item_snapshot) 
        : item.menu_item_snapshot;
      
      return {
        ...item,
        name: item.item_name || snapshot?.name || 'Article',
        price: Number.parseFloat(item.unit_price || item.item_price || snapshot?.price || 0),
        menu_item: snapshot ? {
          name: snapshot.name,
          price: snapshot.price,
          image_url: snapshot.photo || snapshot.image_url,
          effective_price: snapshot.effective_price,
          original_price: snapshot.original_price,
          is_promotion_active: snapshot.is_promotion_active,
        } : null,
        menu_item_snapshot: snapshot,
      };
    });

    // Formater l'adresse de livraison si elle est en JSON
    let discountMetadata = null;
    if (order.delivery_address && typeof order.delivery_address === 'string') {
      try {
        const parsedAddress = JSON.parse(order.delivery_address);
        // Extraire discount_metadata si présent
        if (parsedAddress.discount_metadata) {
          discountMetadata = parsedAddress.discount_metadata;
          // Garder seulement l'adresse dans delivery_address
          const { discount_metadata, ...addressData } = parsedAddress;
          order.delivery_address = addressData;
        } else {
          order.delivery_address = parsedAddress;
        }
      } catch (e) {
        // Garder la valeur string si le parsing échoue
      }
    }
    
    // Ajouter les informations sur les bonus si disponibles
    if (discountMetadata && discountMetadata.bonuses) {
      order.delivery_fee_breakdown = {
        base_delivery_fee: discountMetadata.base_delivery_fee || 0,
        bonuses: discountMetadata.bonuses,
        total: order.delivery_fee || 0,
      };
    }

    // Structurer les données du restaurant pour correspondre à l'attendu du frontend
    // Vérifier si les données du restaurant sont disponibles, sinon les récupérer directement
    let restaurantPhone = order.restaurant_phone;
    let restaurantAddress = order.restaurant_address;
    
    // Si les données ne sont pas dans le JOIN, les récupérer directement
    if ((!restaurantPhone || !restaurantAddress) && order.restaurant_id) {
      try {
        const restaurantResult = await query(
          'SELECT phone, address FROM restaurants WHERE id = $1',
          [order.restaurant_id]
        );
        if (restaurantResult.rows.length > 0) {
          restaurantPhone = restaurantPhone || restaurantResult.rows[0].phone;
          restaurantAddress = restaurantAddress || restaurantResult.rows[0].address;
          logger.debug('Données restaurant récupérées directement (trackOrder):', {
            orderId: order.id,
            restaurantId: order.restaurant_id,
            phone: restaurantPhone,
            address: restaurantAddress,
          });
        }
      } catch (restaurantError) {
        logger.warn('Erreur récupération restaurant (trackOrder):', restaurantError);
      }
    }
    
    order.restaurant = {
      id: order.restaurant_id,
      name: order.restaurant_name || 'Restaurant',
      phone: restaurantPhone || null,
      logo: order.restaurant_logo || null,
      address: restaurantAddress || null,
      latitude: order.restaurant_latitude,
      longitude: order.restaurant_longitude,
    };
    
    // Logger pour déboguer
    logger.debug('Données restaurant structurées (trackOrder):', {
      orderId: order.id,
      restaurantId: order.restaurant_id,
      restaurant_name_from_join: order.restaurant_name,
      restaurant_address_from_join: order.restaurant_address,
      restaurant_phone_from_join: order.restaurant_phone,
      restaurant_final: order.restaurant,
    });

    // Structurer les données du client
    // Vérifier si les données du client sont disponibles, sinon les récupérer directement
    let clientFirstName = order.client_first_name;
    let clientLastName = order.client_last_name;
    let clientPhone = order.client_phone;
    
    // TOUJOURS récupérer les données si elles manquent (même si seulement le téléphone manque)
    if (order.user_id && (!clientFirstName || !clientLastName || !clientPhone)) {
      try {
        const userResult = await query(
          'SELECT first_name, last_name, phone FROM users WHERE id = $1',
          [order.user_id]
        );
        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          clientFirstName = clientFirstName || user.first_name || null;
          clientLastName = clientLastName || user.last_name || null;
          clientPhone = clientPhone || user.phone || null;
          
          logger.debug('Données client récupérées directement (trackOrder):', {
            orderId: order.id,
            userId: order.user_id,
            phone_from_join: order.client_phone,
            phone_from_db: user.phone,
            phone_final: clientPhone,
            first_name: clientFirstName,
            last_name: clientLastName,
          });
        } else {
          logger.warn('Utilisateur non trouvé pour récupération client (trackOrder):', {
            orderId: order.id,
            userId: order.user_id,
          });
        }
      } catch (userError) {
        logger.error('Erreur récupération client (trackOrder):', {
          orderId: order.id,
          userId: order.user_id,
          error: userError.message,
        });
      }
    }
    
    // Ajouter les données client à l'objet order pour faciliter l'accès
    order.client_first_name = clientFirstName;
    order.client_last_name = clientLastName;
    order.client_phone = clientPhone;
    
    logger.debug('Données client structurées (trackOrder):', {
      orderId: order.id,
      userId: order.user_id,
      client_first_name_from_join: order.client_first_name,
      client_last_name_from_join: order.client_last_name,
      client_phone_from_join: order.client_phone,
      client_final: {
        first_name: clientFirstName,
        last_name: clientLastName,
        phone: clientPhone,
      },
      phone_is_null: clientPhone === null,
      phone_is_empty: clientPhone === '',
      phone_is_undefined: clientPhone === undefined,
    });

    // Structurer les données du livreur si assigné
    if (order.delivery_first_name) {
      order.delivery_person = {
        first_name: order.delivery_first_name,
        last_name: order.delivery_last_name,
        phone: order.delivery_phone,
        current_latitude: order.current_latitude,
        current_longitude: order.current_longitude,
        vehicle_type: order.vehicle_type,
        vehicle_plate: order.vehicle_plate,
        profile_photo: order.delivery_photo,
        average_rating: order.delivery_rating,
      };
    }

    // Ajouter les items à la commande
    order.items = formattedItems;

    // RECALCULER le total pour garantir l'exactitude
    // Total = Sous-total + Frais de livraison - Réduction
    const subtotal = parseFloat(order.subtotal) || 0;
    const deliveryFee = parseFloat(order.delivery_fee) || 0;
    const discount = parseFloat(order.discount) || 0;
    const storedTotal = parseFloat(order.total) || 0;
    const recalculatedTotal = Math.max(0, subtotal + deliveryFee - discount);
    
    // Logger si le total diffère de celui en base
    if (Math.abs(storedTotal - recalculatedTotal) > 0.01) {
      logger.warn('Total recalculé diffère de celui en base (trackOrder):', {
        orderId: order.id,
        orderNumber: order.order_number,
        storedTotal,
        recalculatedTotal,
        subtotal,
        deliveryFee,
        discount,
        difference: Math.abs(storedTotal - recalculatedTotal),
      });
    }
    
    // Utiliser le total recalculé (source de vérité)
    order.total = recalculatedTotal;

    // Calculer le revenu net du restaurant pour le livreur (subtotal - commission)
    const { getCommission, getNetRestaurantRevenue } = require('../utils/commission');
    const commissionRate = parseFloat(order.commission_rate) || 15;
    const netRestaurantRevenue = getNetRestaurantRevenue(subtotal, commissionRate, order.commission);
    order.restaurant_net_revenue = netRestaurantRevenue;
    order.restaurant_subtotal = subtotal;
    order.restaurant_commission = order.commission ?? getCommission(subtotal, commissionRate).commission;

    // Logger pour vérifier que tous les champs nécessaires aux calculs sont présents
    logger.info('trackOrder - Total recalculé:', {
      orderId: order.id,
      orderNumber: order.order_number,
      subtotal,
      deliveryFee,
      discount,
      storedTotal,
      recalculatedTotal,
      formula: `${subtotal} + ${deliveryFee} - ${discount} = ${recalculatedTotal}`,
    });
    
    logger.debug('trackOrder - Données retournées:', {
      orderId: order.id,
      hasItems: !!order.items && order.items.length > 0,
      itemsCount: order.items?.length || 0,
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      taxes: order.taxes,
      discount: order.discount,
      total: order.total,
      total_recalculated: recalculatedTotal,
      restaurantPhone: order.restaurant?.phone,
      restaurantName: order.restaurant?.name,
    });

    // S'assurer que client_phone est bien présent dans la réponse
    if (!order.client_phone && order.user_id) {
      logger.warn('⚠️ client_phone manquant avant envoi réponse (trackOrder):', {
        orderId: order.id,
        userId: order.user_id,
        client_first_name: order.client_first_name,
        client_last_name: order.client_last_name,
      });
    }
    
    res.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    logger.error('Erreur trackOrder:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors du suivi' },
    });
  }
};

/**
 * Signaler un problème avec une commande
 */
exports.reportIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const { issue_type, description } = req.body;

    const issueCategoryMap = {
      wrong_items: 'order',
      missing_items: 'order',
      quality_issue: 'order',
      late_delivery: 'delivery',
      damaged: 'delivery',
      other: 'other',
    };

    return await transaction(async (client) => {
      const orderResult = await client.query(
        'SELECT id, order_number FROM orders WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
        });
      }

      const ticketNumberResult = await client.query(
        'SELECT generate_ticket_number() as ticket_number'
      );
      const ticketNumber = ticketNumberResult.rows[0].ticket_number;
      const orderNumber = orderResult.rows[0].order_number;

      const subject = `Signalement commande #${orderNumber}`;

      const ticketResult = await client.query(
        `INSERT INTO support_tickets (
          ticket_number, user_type, user_id, order_id,
          category, priority, subject, description, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open')
        RETURNING *`,
        [
          ticketNumber,
          'user',
          req.user.id,
          id,
          issueCategoryMap[issue_type] || 'other',
          'medium',
          subject,
          description,
        ]
      );

      const ticket = ticketResult.rows[0];

      await client.query(
        `INSERT INTO ticket_messages (
          ticket_id, sender_type, sender_id, message
        )
        VALUES ($1, $2, $3, $4)`,
        [ticket.id, 'user', req.user.id, description]
      );

      res.status(201).json({
        success: true,
        message: 'Signalement envoyé',
        data: {
          ticket: {
            id: ticket.id,
            ticket_number: ticket.ticket_number,
            status: ticket.status,
          },
        },
      });
    });
  } catch (error) {
    logger.error('Erreur reportIssue:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'Erreur lors du signalement' },
    });
  }
};

/**
 * Marquer commande en préparation (Restaurant)
 */
exports.markOrderPreparing = async (req, res) => {
  try {
    const { id } = req.params;
    const { estimated_time } = req.body;
    
    const result = await query(
      `UPDATE orders 
       SET status = 'preparing', preparing_at = NOW(),
           estimated_delivery_time = COALESCE($3, estimated_delivery_time)
       WHERE id = $1 AND restaurant_id = $2 AND status = 'accepted'
       RETURNING *`,
      [id, req.user.id, estimated_time]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
      });
    }

    const order = result.rows[0];

    // WebSocket - notifier le client
    const io = req.app.get('io');
    const { emitToOrder } = require('../utils/socketEmitter');
    emitToOrder(req.app, id, 'order_status_changed', {
      order_id: id,
      status: 'preparing',
      estimated_time: order.estimated_delivery_time,
    });

    // Notifier les admins
    const { notifyOrderStatusChange } = require('../utils/socket');
    notifyOrderStatusChange(io, id, 'preparing');

    // Push notification
    try {
      await notificationService.sendOrderNotification(id, 'client', 'order_preparing');
    } catch (notificationError) {
      logger.warn('Notification push ignorée (markOrderPreparing)', { error: notificationError.message });
    }

    res.json({
      success: true,
      message: 'Commande en préparation',
    });
  } catch (error) {
    logger.error('Erreur markOrderPreparing:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' },
    });
  }
};

/**
 * Confirmer la collecte (Livreur)
 */
exports.confirmPickup = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE orders 
       SET status = 'picked_up', picked_up_at = NOW()
       WHERE id = $1 AND delivery_person_id = $2 AND status = 'ready'
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
      });
    }

    res.json({
      success: true,
      message: 'Collecte confirmée',
    });
  } catch (error) {
    logger.error('Erreur confirmPickup:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la confirmation' },
    });
  }
};

/**
 * Marquer commande en livraison (Livreur)
 */
exports.markOrderDelivering = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE orders 
       SET status = 'delivering'
       WHERE id = $1 AND delivery_person_id = $2 AND status = 'picked_up'
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
      });
    }

    try {
      await notificationService.sendOrderNotification(id, 'client', 'delivery_on_way');
    } catch (notificationError) {
      logger.warn('Notification push ignorée (markOrderDelivering)', { error: notificationError.message });
    }

    res.json({
      success: true,
      message: 'Commande en livraison',
    });
  } catch (error) {
    logger.error('Erreur markOrderDelivering:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' },
    });
  }
};

/**
 * Confirmer la livraison (Livreur)
 */
exports.confirmDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE orders 
       SET status = 'delivered', delivered_at = NOW()
       WHERE id = $1 AND delivery_person_id = $2 AND status = 'delivering'
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
      });
    }

    try {
      await notificationService.sendOrderNotification(id, 'client', 'order_delivered');
    } catch (notificationError) {
      logger.warn('Notification push ignorée (confirmDelivery)', { error: notificationError.message });
    }

    res.json({
      success: true,
      message: 'Livraison confirmée',
    });
  } catch (error) {
    logger.error('Erreur confirmDelivery:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la confirmation' },
    });
  }
};

/**
 * Initier un paiement
 */
exports.initiatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, phone_number, return_url } = req.body;

    // Récupérer la commande
    const orderResult = await query(
      `SELECT o.*, u.phone as user_phone 
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = $1 AND o.user_id = $2`,
      [id, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
      });
    }

    const order = orderResult.rows[0];

    // Vérifier que le paiement n'a pas déjà été effectué
    if (order.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_PAID', message: 'Cette commande a déjà été payée' },
      });
    }

    const phoneToUse = phone_number || order.user_phone;
    let paymentResult;

    switch (payment_method) {
      case 'orange_money': {
        const orangeMoneyService = require('../services/payment/orange-money.service');
        paymentResult = await orangeMoneyService.initiatePayment(
          order.order_number,
          Math.round(order.total),
          phoneToUse,
          return_url
        );
        break;
      }

      case 'mtn_money': {
        const mtnMomoService = require('../services/payment/mtn-momo.service');
        paymentResult = await mtnMomoService.requestPayment(
          order.order_number,
          Math.round(order.total),
          phoneToUse,
          `Paiement commande BAIBEBALO #${order.order_number}`
        );
        break;
      }

      case 'moov_money': {
        // Moov Money non implémenté pour le moment
        return res.status(501).json({
          success: false,
          error: { code: 'NOT_IMPLEMENTED', message: 'Moov Money sera bientôt disponible' },
        });
      }

      default:
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PAYMENT_METHOD', message: 'Méthode de paiement non supportée' },
        });
    }

    // Enregistrer la référence de paiement
    await query(
      `UPDATE orders SET 
        payment_reference = $1,
        payment_status = 'pending'
       WHERE id = $2`,
      [paymentResult.transactionId || paymentResult.referenceId, id]
    );

    logger.info(`Paiement ${payment_method} initié pour commande ${order.order_number}`);

    res.json({
      success: true,
      message: 'Paiement initié avec succès',
      data: {
        payment_url: paymentResult.paymentUrl,
        transaction_id: paymentResult.transactionId || paymentResult.referenceId,
        payment_method,
        amount: order.total,
      },
    });
  } catch (error) {
    logger.error('Erreur initiatePayment:', error);
    res.status(500).json({
      success: false,
      error: { code: 'PAYMENT_ERROR', message: error.message || 'Erreur lors de l\'initiation du paiement' },
    });
  }
};

/**
 * Vérifier le statut du paiement
 */
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer la commande avec la référence de paiement
    const orderResult = await query(
      `SELECT o.*, o.payment_reference, o.payment_status, o.payment_method
       FROM orders o
       WHERE o.id = $1 AND o.user_id = $2`,
      [id, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
      });
    }

    const order = orderResult.rows[0];

    // Si déjà payée, retourner directement
    if (order.payment_status === 'paid') {
      return res.json({
        success: true,
        data: {
          status: 'paid',
          order_id: id,
          amount: order.total,
        },
      });
    }

    // Si pas de référence de paiement, retourner en attente
    if (!order.payment_reference) {
      return res.json({
        success: true,
        data: {
          status: 'pending',
          order_id: id,
          message: 'Paiement non initié',
        },
      });
    }

    // Vérifier le statut auprès du provider
    let paymentStatus;
    const paymentMethod = order.payment_method;

    try {
      if (paymentMethod === 'orange_money') {
        const orangeMoneyService = require('../services/payment/orange-money.service');
        paymentStatus = await orangeMoneyService.checkPaymentStatus(order.payment_reference);
      } else if (paymentMethod === 'mtn_money') {
        const mtnMomoService = require('../services/payment/mtn-momo.service');
        paymentStatus = await mtnMomoService.checkPaymentStatus(order.payment_reference);
      }
    } catch (providerError) {
      logger.warn('Erreur vérification provider:', providerError.message);
      // Retourner le statut actuel de la DB si le provider ne répond pas
    }

    // Mettre à jour si payé
    if (paymentStatus?.status === 'SUCCESS' || paymentStatus?.status === 'SUCCESSFUL') {
      await query(
        `UPDATE orders SET payment_status = 'paid', paid_at = NOW() WHERE id = $1`,
        [id]
      );

      return res.json({
        success: true,
        data: {
          status: 'paid',
          order_id: id,
          amount: order.total,
          paid_at: new Date(),
        },
      });
    }

    res.json({
      success: true,
      data: {
        status: paymentStatus?.status?.toLowerCase() || order.payment_status || 'pending',
        order_id: id,
        amount: order.total,
        payment_reference: order.payment_reference,
      },
    });
  } catch (error) {
    logger.error('Erreur checkPaymentStatus:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la vérification' },
    });
  }
};

/**
 * Rechercher des commandes
 */
exports.searchOrders = async (req, res) => {
  try {
    // TODO: Implémenter la recherche
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur searchOrders:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la recherche' },
    });
  }
};

/**
 * ═══════════════════════════════════════════════════════════
 * CHAT CLIENT ↔ RESTAURANT
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Récupérer les messages d'une commande
 */
exports.getOrderMessages = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const userId = req.user.id;
    const userType = req.user.type;

    // Vérifier l'accès à la commande
    let orderQuery;
    if (userType === 'restaurant') {
      orderQuery = await query(
        `SELECT o.id, o.user_id, o.restaurant_id, r.name as restaurant_name,
                u.first_name as customer_first_name, u.last_name as customer_last_name
         FROM orders o
         JOIN restaurants r ON o.restaurant_id = r.id
         JOIN users u ON o.user_id = u.id
         WHERE o.id = $1 AND r.id = $2`,
        [orderId, userId]
      );
    } else {
      orderQuery = await query(
        `SELECT o.id, o.user_id, o.restaurant_id, r.name as restaurant_name,
                u.first_name as customer_first_name, u.last_name as customer_last_name
         FROM orders o
         JOIN restaurants r ON o.restaurant_id = r.id
         JOIN users u ON o.user_id = u.id
         WHERE o.id = $1 AND o.user_id = $2`,
        [orderId, userId]
      );
    }

    if (orderQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée ou accès refusé' },
      });
    }

    const order = orderQuery.rows[0];

    // Récupérer les messages
    const messagesResult = await query(
      `SELECT id, sender_type, message, created_at, read_at
       FROM order_messages
       WHERE order_id = $1
       ORDER BY created_at ASC`,
      [orderId]
    );

    res.json({
      success: true,
      data: {
        order: {
          id: order.id,
          restaurant_name: order.restaurant_name,
          customer_name: `${order.customer_first_name} ${order.customer_last_name || ''}`.trim(),
        },
        messages: messagesResult.rows,
        unread_count: messagesResult.rows.filter(m => 
          !m.read_at && 
          ((userType === 'restaurant' && m.sender_type === 'customer') ||
           (userType !== 'restaurant' && m.sender_type === 'restaurant'))
        ).length,
      },
    });
  } catch (error) {
    logger.error('Erreur getOrderMessages:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des messages' },
    });
  }
};

/**
 * Envoyer un message sur une commande
 */
exports.sendOrderMessage = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;
    const userType = req.user.type;

    logger.debug('Envoi message commande:', {
      orderId,
      userId,
      userType,
      messageLength: message?.length,
    });

    // Vérifier l'accès à la commande
    let orderQuery;
    let senderType;
    
    if (userType === 'restaurant') {
      orderQuery = await query(
        `SELECT o.id, o.user_id, o.restaurant_id, o.status, r.name as restaurant_name,
                u.fcm_token as customer_fcm_token, u.first_name as customer_first_name
         FROM orders o
         JOIN restaurants r ON o.restaurant_id = r.id
         JOIN users u ON o.user_id = u.id
         WHERE o.id = $1 AND r.id = $2`,
        [orderId, userId]
      );
      senderType = 'restaurant';
    } else {
      orderQuery = await query(
        `SELECT o.id, o.user_id, o.restaurant_id, o.status, r.name as restaurant_name,
                r.id as restaurant_id
         FROM orders o
         JOIN restaurants r ON o.restaurant_id = r.id
         WHERE o.id = $1 AND o.user_id = $2`,
        [orderId, userId]
      );
      senderType = 'customer';
    }

    if (orderQuery.rows.length === 0) {
      logger.warn('Commande non trouvée pour envoi message:', { orderId, userId, userType });
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée ou accès refusé' },
      });
    }

    const order = orderQuery.rows[0];
    logger.debug('Commande trouvée:', { orderId, status: order.status, senderType });

    // Vérifier que la commande est en cours (pas livrée/annulée depuis trop longtemps)
    const inactiveStatuses = ['delivered', 'cancelled'];
    if (inactiveStatuses.includes(order.status)) {
      // Permettre les messages jusqu'à 24h après la livraison/annulation
      const orderResult = await query(
        'SELECT updated_at FROM orders WHERE id = $1',
        [orderId]
      );
      const updatedAt = new Date(orderResult.rows[0]?.updated_at);
      const hoursSince = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);
      
      logger.debug('Vérification délai commande fermée:', { orderId, status: order.status, hoursSince });
      
      if (hoursSince > 24) {
        logger.warn('Tentative d\'envoi message sur commande fermée:', { orderId, hoursSince });
        return res.status(400).json({
          success: false,
          error: { code: 'ORDER_CLOSED', message: 'La discussion est fermée pour cette commande' },
        });
      }
    }

    // Insérer le message
    logger.debug('Insertion message:', { orderId, senderType, userId, messageLength: message?.length });
    const insertResult = await query(
      `INSERT INTO order_messages (order_id, sender_type, sender_id, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, sender_type, message, created_at`,
      [orderId, senderType, userId, message]
    );

    const newMessage = insertResult.rows[0];
    logger.info('Message inséré avec succès:', { messageId: newMessage.id, orderId, senderType });

    // Émettre via WebSocket
    const io = req.app.get('io');
    if (io) {
      const { emitToOrder } = require('../utils/socketEmitter');
      emitToOrder(req.app, orderId, 'new_order_message', {
        order_id: orderId,
        message: newMessage,
      });

      // Notifier le restaurant si c'est un message client
      if (senderType === 'customer') {
        io.of('/partners').to(`restaurant_${order.restaurant_id}`).emit('new_customer_message', {
          order_id: orderId,
          message: newMessage,
        });
      }
    }

    // Envoyer notification push
    try {
      // Les restaurants reçoivent les notifications via Socket.IO (déjà émis ci-dessus)
      // Pas besoin de FCM pour les restaurants
      if (senderType === 'restaurant' && order.customer_fcm_token) {
        // Notification au client
        await notificationService.sendPushNotification(
          order.customer_fcm_token,
          `Message de ${order.restaurant_name}`,
          message.substring(0, 100),
          { type: 'order_message', order_id: orderId }
        );
      }
    } catch (notifError) {
      logger.warn('Erreur notification message:', notifError.message);
    }

    logger.info('Message envoyé avec succès:', { messageId: newMessage.id, orderId });
    res.status(201).json({
      success: true,
      data: { message: newMessage },
    });
  } catch (error) {
    logger.error('Erreur sendOrderMessage:', {
      error: error.message,
      stack: error.stack,
      orderId: req.params.id,
      userId: req.user?.id,
      userType: req.user?.type,
    });
    res.status(500).json({
      success: false,
      error: { code: 'SEND_ERROR', message: 'Erreur lors de l\'envoi du message' },
    });
  }
};

/**
 * Marquer les messages comme lus
 */
exports.markMessagesRead = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const userId = req.user.id;
    const userType = req.user.type;

    // Vérifier l'accès à la commande
    let orderQuery;
    let targetSenderType;
    
    if (userType === 'restaurant') {
      orderQuery = await query(
        `SELECT o.id FROM orders o
         JOIN restaurants r ON o.restaurant_id = r.id
         WHERE o.id = $1 AND r.id = $2`,
        [orderId, userId]
      );
      targetSenderType = 'customer'; // Marquer les messages du client comme lus
    } else {
      orderQuery = await query(
        'SELECT id FROM orders WHERE id = $1 AND user_id = $2',
        [orderId, userId]
      );
      targetSenderType = 'restaurant'; // Marquer les messages du restaurant comme lus
    }

    if (orderQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée ou accès refusé' },
      });
    }

    // Marquer les messages comme lus
    const updateResult = await query(
      `UPDATE order_messages
       SET read_at = NOW()
       WHERE order_id = $1 AND sender_type = $2 AND read_at IS NULL
       RETURNING id`,
      [orderId, targetSenderType]
    );

    res.json({
      success: true,
      data: { marked_read: updateResult.rowCount },
    });
  } catch (error) {
    logger.error('Erreur markMessagesRead:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' },
    });
  }
};

/**
 * Reorder en 1 clic — recrée le panier depuis une ancienne commande
 * POST /api/v1/orders/:id/reorder
 */
exports.reorder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Récupérer la commande originale
    const orderResult = await query(
      `SELECT o.id, o.restaurant_id, o.delivery_address, o.delivery_address_id,
              o.special_instructions, o.payment_method, o.order_type,
              r.name AS restaurant_name, r.status AS restaurant_status, r.is_open
       FROM orders o
       LEFT JOIN restaurants r ON r.id = o.restaurant_id
       WHERE o.id = $1 AND o.user_id = $2`,
      [id, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Commande introuvable' },
      });
    }

    const order = orderResult.rows[0];

    if (order.order_type === 'express') {
      return res.status(400).json({
        success: false,
        error: { code: 'EXPRESS_NOT_SUPPORTED', message: 'Reorder non disponible pour les livraisons express' },
      });
    }

    // Récupérer les articles de la commande originale
    const itemsResult = await query(
      `SELECT oi.menu_item_id, oi.quantity, oi.unit_price, oi.options,
              mi.name, mi.description, mi.photo, mi.price AS current_price, mi.is_available
       FROM order_items oi
       JOIN menu_items mi ON mi.id = oi.menu_item_id
       WHERE oi.order_id = $1`,
      [id]
    );

    // Filtrer les articles disponibles et détecter les changements de prix
    const available = [];
    const unavailable = [];

    for (const item of itemsResult.rows) {
      if (!item.is_available) {
        unavailable.push({ name: item.name, reason: 'indisponible' });
      } else {
        available.push({
          menu_item_id: item.menu_item_id,
          name: item.name,
          description: item.description,
          photo: item.photo,
          quantity: item.quantity,
          unit_price: Math.round(parseFloat(item.current_price)),
          original_price: Math.round(parseFloat(item.unit_price)),
          price_changed: Math.round(parseFloat(item.current_price)) !== Math.round(parseFloat(item.unit_price)),
          options: item.options || {},
        });
      }
    }

    if (available.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALL_ITEMS_UNAVAILABLE', message: 'Tous les articles de cette commande sont indisponibles' },
      });
    }

    res.json({
      success: true,
      data: {
        restaurant: {
          id: order.restaurant_id,
          name: order.restaurant_name,
          is_open: order.is_open,
          is_active: order.restaurant_status === 'active',
        },
        items: available,
        unavailable_items: unavailable,
        suggested: {
          delivery_address_id: order.delivery_address_id,
          delivery_address: order.delivery_address,
          special_instructions: order.special_instructions,
          payment_method: order.payment_method,
        },
      },
    });
  } catch (error) {
    logger.error('Erreur reorder:', error);
    res.status(500).json({
      success: false,
      error: { code: 'REORDER_ERROR', message: 'Erreur lors du reorder' },
    });
  }
};

/**
 * Créer une commande programmée — avec scheduled_at
 * Utilise createOrder mais avec scheduled_at dans le body
 * Le cron job la passera en 'new' au moment venu
 */
exports.createScheduledOrder = async (req, res) => {
  // Injecter scheduled_at et déléguer à createOrder
  req.body._is_scheduled = true;
  return exports.createOrder(req, res);
};

module.exports = exports;
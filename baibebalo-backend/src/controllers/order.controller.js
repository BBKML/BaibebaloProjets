const { query, transaction } = require('../database/db');
const logger = require('../utils/logger');
const crypto = require('crypto');
const mapsService = require('../services/maps.service');

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

/**
 * Créer une nouvelle commande
 */
exports.createOrder = async (req, res) => {
  try {
    const {
      restaurant_id,
      items,
      delivery_address,
      special_instructions,
      payment_method,
      promo_code,
    } = req.body;

    return await transaction(async (client) => {
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
        let itemPrice = parseFloat(menuItem.price);

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

        const itemSubtotal = itemPrice * item.quantity;
        subtotal += itemSubtotal;

        orderItems.push({
          menu_item_id: menuItem.id,
          menu_item_snapshot: menuItem,
          quantity: item.quantity,
          unit_price: itemPrice,
          selected_options: item.selected_options || {},
          special_notes: item.special_notes || null,
          subtotal: itemSubtotal,
        });
      }

      // 3. Calculer les frais de livraison (distance)
      const distance = await calculateDistance(
        restaurant.latitude,
        restaurant.longitude,
        delivery_address.latitude,
        delivery_address.longitude
      );

      if (distance > restaurant.delivery_radius) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'OUT_OF_DELIVERY_RANGE',
            message: `Adresse hors de la zone de livraison (${restaurant.delivery_radius}km max)`,
          },
        });
      }

      const delivery_fee = calculateDeliveryFee(distance);

      // 4. Appliquer le code promo si fourni
      let discount = 0;
      let promo_code_id = null;

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
              } else if (promo.type === 'free_delivery') {
                discount = delivery_fee;
              }

              if (promo.max_discount && discount > promo.max_discount) {
                discount = promo.max_discount;
              }
            }
          }
        }
      }

      // 5. Calculer la commission restaurant
      const commission = (subtotal * restaurant.commission_rate) / 100;

      // 6. Calculer le total
      const total = subtotal + delivery_fee - discount;

      // 7. Créer la commande
      const order_number = generateOrderNumber();

      const orderResult = await client.query(
        `INSERT INTO orders (
          order_number, user_id, restaurant_id,
          subtotal, delivery_fee, discount, commission, total,
          delivery_address, special_instructions,
          payment_method, payment_status, status,
          promo_code_id, estimated_delivery_time
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          order_number, req.user.id, restaurant_id,
          subtotal, delivery_fee, discount, commission, total,
          JSON.stringify(delivery_address), special_instructions,
          payment_method, payment_method === 'cash' ? 'pending' : 'pending',
          'new', promo_code_id,
          30 // Estimation par défaut
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
          order_id, type, amount, 
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
      const smsService = require('../services/sms.service');
      const { notifyNewOrder } = require('../utils/socket');

      // Notifier le restaurant
      io.to(`restaurant_${restaurant_id}`).emit('new_order', {
        order_id: order.id,
        order_number: order.order_number,
        total: order.total,
      });

      // Notifier les admins du dashboard
      notifyNewOrder(io, order);

      await smsService.sendNotification(
        restaurant.phone,
        'new_order_restaurant',
        {
          orderNumber: order.order_number,
          total: order.total,
        }
      );

      // Notifier le client
      const userResult = await client.query(
        'SELECT phone FROM users WHERE id = $1',
        [req.user.id]
      );

      await smsService.sendNotification(
        userResult.rows[0].phone,
        'order_confirmed',
        { orderNumber: order.order_number }
      );

      logger.info(`Commande créée: ${order.order_number}`);

      res.status(201).json({
        success: true,
        message: 'Commande créée avec succès',
        data: {
          order: {
            id: order.id,
            order_number: order.order_number,
            status: order.status,
            total: order.total,
            estimated_delivery_time: order.estimated_delivery_time,
          },
        },
      });
    });
  } catch (error) {
    logger.error('Erreur createOrder:', error);
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
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT o.*, 
              r.name as restaurant_name, r.logo as restaurant_logo,
              r.phone as restaurant_phone, r.address as restaurant_address,
              u.first_name as client_first_name, u.last_name as client_last_name,
              u.phone as client_phone,
              dp.first_name as delivery_first_name, dp.last_name as delivery_last_name,
              dp.phone as delivery_phone, dp.vehicle_type,
              dp.current_latitude as delivery_latitude,
              dp.current_longitude as delivery_longitude
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

    // Vérifier les permissions
    const canView =
      req.user.type === 'admin' ||
      (req.user.type === 'client' && order.user_id === req.user.id) ||
      (req.user.type === 'restaurant' && order.restaurant_id === req.user.id) ||
      (req.user.type === 'delivery' && order.delivery_person_id === req.user.id);

    if (!canView) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Accès interdit',
        },
      });
    }

    // Récupérer les items
    const itemsResult = await query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [id]
    );

    order.items = itemsResult.rows;

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

      // Si paiement déjà effectué, créer remboursement
      if (order.payment_status === 'paid') {
        await client.query(
          `INSERT INTO transactions (
            order_id, type, amount,
            from_user_type, from_user_id,
            to_user_type, to_user_id,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            order.id, 'refund', order.total,
            'restaurant', order.restaurant_id,
            'client', order.user_id,
            'pending'
          ]
        );
      }

      // Notifier les parties
      const io = req.app.get('io');
      io.to(`restaurant_${order.restaurant_id}`).emit('order_cancelled', {
        order_id: order.id,
        reason,
      });

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
    const { estimated_time } = req.body;

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
      io.to(`order_${id}`).emit('order_status_changed', {
        order_id: id,
        status: 'accepted',
      });
      
      // Notifier les admins du dashboard
      const { notifyOrderStatusChange } = require('../utils/socket');
      notifyOrderStatusChange(io, id, 'accepted');

      const userResult = await client.query(
        'SELECT phone FROM users WHERE id = $1',
        [order.user_id]
      );

      const smsService = require('../services/sms.service');
      await smsService.sendNotification(
        userResult.rows[0].phone,
        'order_ready',
        { orderNumber: order.order_number }
      );

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

    // Notifier le client
    const io = req.app.get('io');
    io.to(`order_${id}`).emit('order_status_changed', {
      order_id: id,
      status: 'cancelled',
      reason,
    });

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
 */
exports.markOrderReady = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE orders 
       SET status = 'ready', prepared_at = NOW()
       WHERE id = $1 AND restaurant_id = $2 AND status = 'preparing'
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

    // Notifier le livreur si déjà assigné
    const io = req.app.get('io');
    if (order.delivery_person_id) {
      io.to(`delivery_${order.delivery_person_id}`).emit('order_ready', {
        order_id: id,
      });
    }

    logger.info(`Commande prête: ${order.order_number}`);

    res.json({
      success: true,
      message: 'Commande marquée comme prête',
    });
  } catch (error) {
    logger.error('Erreur markOrderReady:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' },
    });
  }
};

/**
 * Suivre une commande en temps réel
 */
exports.trackOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT o.*, r.name as restaurant_name, 
              d.first_name as delivery_first_name, d.last_name as delivery_last_name,
              d.phone as delivery_phone, d.current_latitude, d.current_longitude
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
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

    res.json({
      success: true,
      data: { order: result.rows[0] },
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
    // TODO: Implémenter le signalement
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
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
    const result = await query(
      `UPDATE orders 
       SET status = 'preparing', preparing_at = NOW()
       WHERE id = $1 AND restaurant_id = $2 AND status = 'accepted'
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
    // TODO: Implémenter l'initiation du paiement
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur initiatePayment:', error);
    res.status(500).json({
      success: false,
      error: { code: 'PAYMENT_ERROR', message: 'Erreur lors de l\'initiation du paiement' },
    });
  }
};

/**
 * Vérifier le statut du paiement
 */
exports.checkPaymentStatus = async (req, res) => {
  try {
    // TODO: Implémenter la vérification
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
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

module.exports = exports;
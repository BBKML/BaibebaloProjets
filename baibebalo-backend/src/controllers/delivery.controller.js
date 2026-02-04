const { query, transaction } = require('../database/db');
const logger = require('../utils/logger');
const { uploadService } = require('../services/upload.service');

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

    logger.info(`Nouveau livreur inscrit: ${result.rows[0].id}`);

    res.status(201).json({
      success: true,
      message: 'Inscription réussie. Votre profil sera validé sous 24-48h.',
      data: {
        delivery_person: result.rows[0],
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
        `SELECT o.*, r.name as restaurant_name, r.address as restaurant_address, 
                r.latitude as restaurant_lat, r.longitude as restaurant_lng
         FROM orders o
         JOIN restaurants r ON o.restaurant_id = r.id
         WHERE o.id = $1 AND o.status = 'ready' AND o.delivery_person_id IS NULL
         FOR UPDATE OF o`,
        [id]
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

      // Assigner le livreur (garder statut 'ready' jusqu'au pickup)
      await client.query(
        `UPDATE orders 
         SET delivery_person_id = $1, assigned_at = NOW()
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

      // Notifier le client - livreur assigné
      io.to(`order_${id}`).emit('delivery_assigned', {
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

      // Notifier le restaurant
      if (partnersIo) {
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
 * Confirmer la récupération de la commande au restaurant
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
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Commande non trouvée ou déjà récupérée',
        },
      });
    }

    const order = result.rows[0];

    const io = req.app.get('io');
    const partnersIo = req.app.get('partnersIo');

    // Notifier le client - commande récupérée
    io.to(`order_${id}`).emit('order_picked_up', {
      order_id: id,
      order_number: order.order_number,
      message: 'Votre commande a été récupérée par le livreur',
    });

    io.to(`order_${id}`).emit('order_status_changed', {
      order_id: id,
      status: 'picked_up',
    });

    // Notifier le restaurant - commande partie
    if (partnersIo) {
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
    const { confirmation_code } = req.body;

    return await transaction(async (client) => {
      const orderResult = await client.query(
        `SELECT * FROM orders 
         WHERE id = $1 AND delivery_person_id = $2 AND status IN ('picked_up', 'delivering')`,
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

      // Marquer comme livrée (et paiement espèces reçu du client si cash)
      await client.query(
        `UPDATE orders 
         SET status = 'delivered', delivered_at = NOW()
         ${order.payment_method === 'cash' ? ", payment_status = 'paid'" : ''}
         WHERE id = $1`,
        [id]
      );

      // === CALCUL COMPLET DES GAINS DU LIVREUR ===
      const config = require('../config');
      const businessConfig = config.business;
      const now = new Date();
      const currentHour = now.getHours();
      const dayOfWeek = now.getDay(); // 0 = Dimanche, 6 = Samedi
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // 1. GAIN DE BASE (70% des frais de livraison)
      const baseEarnings = (order.delivery_fee * (businessConfig.deliveryPersonPercentage || 70)) / 100;
      
      // 2. BONUS DISTANCE LONGUE (si distance > 5 km → +200 FCFA)
      const deliveryDistance = parseFloat(order.delivery_distance) || 0;
      const longDistanceThreshold = businessConfig.deliveryBonusLongDistanceThreshold || 5;
      const bonusLongDistance = deliveryDistance > longDistanceThreshold 
        ? (businessConfig.deliveryBonusLongDistanceAmount || 200) 
        : 0;
      
      // 3. BONUS HEURE DE POINTE (12h-14h ou 19h-21h → +100 FCFA)
      const peakHours = businessConfig.deliveryPeakHours || { lunch: { start: 12, end: 14 }, dinner: { start: 19, end: 21 } };
      const isPeakHour = (currentHour >= peakHours.lunch.start && currentHour < peakHours.lunch.end) ||
                         (currentHour >= peakHours.dinner.start && currentHour < peakHours.dinner.end);
      const bonusPeakHour = isPeakHour ? (businessConfig.deliveryBonusPeakHourAmount || 100) : 0;
      
      // 4. Sous-total avant bonus week-end
      let subtotalEarnings = baseEarnings + bonusLongDistance + bonusPeakHour;
      
      // 5. BONUS WEEK-END (+10% sur le total)
      const weekendBonusPercent = businessConfig.deliveryBonusWeekendPercent || 10;
      const bonusWeekend = isWeekend ? Math.round(subtotalEarnings * weekendBonusPercent / 100) : 0;
      
      // 6. TOTAL DES GAINS
      const deliveryEarnings = subtotalEarnings + bonusWeekend;
      
      // Détail des gains pour le log et la transaction
      const earningsBreakdown = {
        base: baseEarnings,
        bonus_long_distance: bonusLongDistance,
        bonus_peak_hour: bonusPeakHour,
        bonus_weekend: bonusWeekend,
        total: deliveryEarnings,
        details: {
          delivery_fee: order.delivery_fee,
          percentage: businessConfig.deliveryPersonPercentage || 70,
          distance_km: deliveryDistance,
          is_peak_hour: isPeakHour,
          is_weekend: isWeekend,
          hour: currentHour,
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
        [deliveryEarnings, deliveryDistance, req.user.id]
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

      // Notifier le restaurant
      const partnersIo = req.app.get('partnersIo');
      if (partnersIo) {
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
        await notificationService.sendOrderNotification(order.id, 'client', 'order_delivered');
      } catch (notificationError) {
        logger.warn('Notification push ignorée (confirmDelivery)', { error: notificationError.message });
      }

      // === ATTRIBUTION DES POINTS DE FIDÉLITÉ ===
      // Formule: 1 point pour chaque tranche de 100 FCFA (arrondi à l'inférieur)
      const loyaltyPointsEarned = Math.floor(order.total / 100);
      
      if (loyaltyPointsEarned > 0) {
        // Mettre à jour les points du client
        await client.query(
          `UPDATE users 
           SET loyalty_points = COALESCE(loyalty_points, 0) + $1
           WHERE id = $2`,
          [loyaltyPointsEarned, order.user_id]
        );

        // Enregistrer la transaction de points
        await client.query(
          `INSERT INTO loyalty_transactions (
            user_id, points, type, description, order_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            order.user_id,
            loyaltyPointsEarned,
            'earned',
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
            await notificationService.sendOrderNotification(order.id, 'client', 'loyalty_reward');
          } catch (e) { /* ignore */ }
        } else if (totalPoints - loyaltyPointsEarned <= 500 && totalPoints > 500) {
          // Passage à Or
          try {
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
 */
exports.getEarnings = async (req, res) => {
  try {
    // La colonne s'appelle 'balance' et non 'available_balance'
    const deliveryResult = await query(
      `SELECT total_earnings, balance, total_deliveries
       FROM delivery_persons WHERE id = $1`,
      [req.user.id]
    );

    if (deliveryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'DELIVERY_NOT_FOUND', message: 'Livreur non trouvé' },
      });
    }

    // Gains aujourd'hui
    const todayResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as today_earnings
       FROM transactions
       WHERE to_user_id = $1 
       AND to_user_type = 'delivery'
       AND transaction_type = 'delivery_fee'
       AND created_at >= CURRENT_DATE`,
      [req.user.id]
    );

    // Gains cette semaine
    const weekResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as week_earnings
       FROM transactions
       WHERE to_user_id = $1 
       AND to_user_type = 'delivery'
       AND transaction_type = 'delivery_fee'
       AND created_at >= DATE_TRUNC('week', CURRENT_DATE)`,
      [req.user.id]
    );

    // Gains ce mois
    const monthResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as month_earnings
       FROM transactions
       WHERE to_user_id = $1 
       AND to_user_type = 'delivery'
       AND transaction_type = 'delivery_fee'
       AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
      [req.user.id]
    );

    const delivery = deliveryResult.rows[0];

    res.json({
      success: true,
      data: {
        available_balance: parseFloat(delivery.balance || 0),
        total_earnings: parseFloat(delivery.total_earnings || 0),
        total_deliveries: delivery.total_deliveries || 0,
        today: parseFloat(todayResult.rows[0].today_earnings || 0),
        this_week: parseFloat(weekResult.rows[0].week_earnings || 0),
        this_month: parseFloat(monthResult.rows[0].month_earnings || 0),
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
          transaction_type, amount, 
          from_user_type, from_user_id,
          to_user_type, to_user_id,
          status, payment_method,
          payment_reference
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
        total_pending_amount: Math.round(totalPending * 100) / 100,
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
        error: { code: 'INVALID_INPUT', message: 'Montant, méthode (agency ou bank_deposit) et liste de commandes requis' },
      });
    }
    if (!['agency', 'bank_deposit'].includes(method)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_METHOD', message: 'Méthode doit être agency (remise à l\'agence) ou bank_deposit (dépôt sur compte)' },
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
      if (Math.abs(parseFloat(amount) - expectedTotal) > 0.01) {
        return res.status(400).json({
          success: false,
          error: { code: 'AMOUNT_MISMATCH', message: `Le montant doit correspondre au total des commandes: ${expectedTotal.toFixed(0)} FCFA` },
        });
      }

      const remResult = await client.query(
        `INSERT INTO cash_remittances (delivery_person_id, amount, method, reference, status)
         VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
        [req.user.id, amount, method, reference || null]
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
            : 'Dépôt enregistré. Après avoir effectué le virement, l\'admin validera après vérification.',
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
             (SELECT json_agg(json_build_object('order_id', o.id, 'order_number', o.order_number, 'order_total', o.order_total))
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
 * Upload un document (CNI, permis, photo profil, etc.)
 */
exports.uploadDocument = async (req, res) => {
  try {
    const file = req.file;
    const { document_type } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'Aucun fichier fourni' },
      });
    }

    // Types de documents valides (incluant recto/verso)
    const validTypes = [
      'id_card', 'id_card_recto', 'id_card_verso',
      'driver_license', 'driver_license_recto', 'driver_license_verso',
      'vehicle_registration', 'vehicle_registration_recto', 'vehicle_registration_verso',
      'insurance_document', 'profile_photo',
      // Types utilisés dans l'inscription
      'cni_recto', 'cni_verso', 'permis_recto', 'permis_verso',
      'carte_grise_recto', 'carte_grise_verso', 'assurance', 'photo_moto',
      'certificat_residence', 'photo_recente'
    ];
    
    if (document_type && !validTypes.includes(document_type)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TYPE', message: 'Type de document invalide' },
      });
    }

    // Déterminer le dossier selon le type
    const folder = document_type === 'profile_photo' ? 'delivery-profiles' : 'delivery-documents';

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
        'insurance_document', 'profile_photo'
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
      values.push(vehicle_plate);
    }
    if (mobile_money_number) {
      updates.push(`mobile_money_number = $${paramIndex++}`);
      values.push(mobile_money_number);
    }
    if (mobile_money_provider) {
      updates.push(`mobile_money_provider = $${paramIndex++}`);
      values.push(mobile_money_provider);
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
      
      // Réassigner la commande
      await query(
        `UPDATE orders SET delivery_person_id = NULL, status = 'ready' WHERE id = $1`,
        [id]
      );
      
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
       SET arrived_at_restaurant = NOW()
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

    const order = result.rows[0];

    // Notifier le restaurant
    const io = req.app.get('io');
    io.to(`restaurant_${order.restaurant_id}`).emit('delivery_arrived', {
      order_id: id,
      order_number: order.order_number,
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
       SET arrived_at_customer = NOW()
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

    const order = result.rows[0];

    // Notifier le client
    const io = req.app.get('io');
    io.to(`order_${id}`).emit('delivery_arrived_at_customer', {
      order_id: id,
      message: 'Votre livreur est arrivé!',
    });

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
 * Obtenir les demandes de paiement
 */
exports.getPayoutRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT id, amount, status, payment_reference, created_at, completed_at
       FROM transactions
       WHERE to_user_id = $1 
       AND to_user_type = 'delivery'
       AND transaction_type = 'payout'
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), parseInt(offset)]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM transactions
       WHERE to_user_id = $1 AND to_user_type = 'delivery' AND transaction_type = 'payout'`,
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

    // Statistiques globales des commandes
    const statsResult = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'delivered') as total_delivered,
        COUNT(*) FILTER (WHERE status = 'cancelled') as total_cancelled,
        AVG(CASE WHEN delivery_rating IS NOT NULL THEN delivery_rating END) as avg_rating,
        COUNT(*) FILTER (WHERE delivery_rating IS NOT NULL) as total_rated,
        COALESCE(SUM(delivery_fee), 0) as total_delivery_fees,
        COALESCE(SUM(COALESCE(delivery_distance, 0)), 0) as total_distance
       FROM orders o
       WHERE delivery_person_id = $1 ${dateFilter}`,
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
          average_rating: parseFloat(stats.avg_rating) || parseFloat(profile.average_rating) || 0,
          total_reviews: parseInt(stats.total_rated) || 0,
          
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
 * Obtenir les avis reçus par le livreur
 */
exports.getMyReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Récupérer les commandes avec avis sur la livraison
    const reviewsResult = await query(
      `SELECT 
        o.id,
        o.order_number,
        o.delivery_rating as rating,
        o.delivery_review as comment,
        o.delivered_at as created_at,
        u.first_name as customer_name,
        r.name as restaurant_name
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.delivery_person_id = $1 
       AND o.status = 'delivered'
       AND o.delivery_rating IS NOT NULL
       ORDER BY o.delivered_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), parseInt(offset)]
    );

    // Compter le total
    const countResult = await query(
      `SELECT COUNT(*) FROM orders 
       WHERE delivery_person_id = $1 
       AND status = 'delivered'
       AND delivery_rating IS NOT NULL`,
      [req.user.id]
    );

    // Calculer la note moyenne
    const avgResult = await query(
      `SELECT 
        AVG(delivery_rating) as average_rating,
        COUNT(*) as total_reviews
       FROM orders 
       WHERE delivery_person_id = $1 
       AND status = 'delivered'
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
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
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
        'delivery', 'normal', $3, $4, 'open'
      )
      RETURNING *`,
      [req.user.id, order_id || null, subject, message]
    );

    const ticket = result.rows[0];

    // Ajouter le premier message dans support_messages
    await query(
      `INSERT INTO support_messages (ticket_id, sender_type, sender_id, message)
       VALUES ($1, 'user', $2, $3)`,
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
        (SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id = t.id) as message_count,
        (SELECT message FROM support_messages m WHERE m.ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM support_messages m WHERE m.ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
        (SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id = t.id AND m.sender_type = 'support' AND m.read_at IS NULL) as unread_count
       FROM support_tickets t
       WHERE t.user_id = $1 AND t.user_type = 'delivery'
       ORDER BY COALESCE((SELECT created_at FROM support_messages m WHERE m.ticket_id = t.id ORDER BY created_at DESC LIMIT 1), t.created_at) DESC`,
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

    // Récupérer les messages
    const messages = await query(
      `SELECT * FROM support_messages WHERE ticket_id = $1 ORDER BY created_at ASC`,
      [ticketId]
    );

    // Marquer les messages du support comme lus
    await query(
      `UPDATE support_messages SET read_at = NOW() 
       WHERE ticket_id = $1 AND sender_type = 'support' AND read_at IS NULL`,
      [ticketId]
    );

    res.json({
      success: true,
      data: {
        ticket: ticketResult.rows[0],
        messages: messages.rows,
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
      `INSERT INTO support_messages (ticket_id, sender_type, sender_id, message)
       VALUES ($1, 'user', $2, $3)
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

module.exports = exports;
const admin = require('firebase-admin');
const config = require('../config');
const logger = require('../utils/logger');
const { query } = require('../database/db');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** Token Expo (ExponentPushToken[...]) = gratuit, pas de Firebase requis */
const isExpoPushToken = (token) =>
  token && typeof token === 'string' && token.startsWith('ExponentPushToken[');

/**
 * Envoyer une notification via l'API Expo Push (100% gratuit)
 */
async function sendViaExpoPush(token, notification) {
  const body = {
    to: token,
    title: notification.title || '',
    body: notification.body || notification.message || '',
    sound: 'default',
    priority: 'high',
    channelId: notification.channel || 'default',
    data: notification.data || {},
  };
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.errors?.[0]?.message || `Expo Push HTTP ${res.status}`);
  }
  const ticket = Array.isArray(json.data) ? json.data[0] : json.data;
  if (ticket?.status === 'error') {
    throw new Error(ticket.message || 'Expo Push error');
  }
  return ticket?.id || 'ok';
}

// Initialiser Firebase Admin
let firebaseApp = null;

try {
  if (config.firebase.projectId && config.firebase.privateKey && config.firebase.clientEmail) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        privateKey: config.firebase.privateKey.replace(/\\n/g, '\n'),
        clientEmail: config.firebase.clientEmail,
      }),
    });
    logger.info('✅ Firebase Admin initialisé');
  } else {
    logger.warn('⚠️  Firebase non configuré - notifications push désactivées');
  }
} catch (error) {
  logger.error('❌ Erreur initialisation Firebase:', error.message);
}

class NotificationService {
  getUserTable(userType) {
    switch (userType) {
      case 'client':
      case 'user':
        return 'users';
      case 'restaurant':
        return 'restaurants';
      case 'delivery':
      case 'delivery_person':
        return 'delivery_persons';
      case 'admin':
        return 'admins';
      default:
        throw new Error('Type d\'utilisateur invalide');
    }
  }

  normalizeNotificationUserType(userType) {
    if (userType === 'client' || userType === 'user') return 'user';
    if (userType === 'delivery_person' || userType === 'delivery') return 'delivery';
    return userType;
  }

  /**
   * Envoyer une notification push à un utilisateur
   * Supporte Expo Push (gratuit) et Firebase FCM
   */
  async sendToUser(userId, userType, notification) {
    try {
      const table = this.getUserTable(userType);
      const notificationUserType = this.normalizeNotificationUserType(userType);

      const result = await query(
        `SELECT fcm_token FROM ${table} WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].fcm_token) {
        logger.warn(`Pas de FCM token pour ${userType} ${userId}`);
        return { success: false, reason: 'no_fcm_token' };
      }

      const pushToken = result.rows[0].fcm_token;
      const messageBody = notification.body || notification.message || '';

      let response;

      // Expo Push Token = gratuit, pas de Firebase requis
      if (isExpoPushToken(pushToken)) {
        response = await sendViaExpoPush(pushToken, {
          title: notification.title,
          body: messageBody,
          message: messageBody,
          data: notification.data || {},
        });
        logger.info(`Notification Expo Push envoyée: ${response}`);
      } else if (firebaseApp) {
        // Token FCM = Firebase requis
        const message = {
          token: pushToken,
          notification: {
            title: notification.title,
            body: messageBody,
          },
          data: notification.data || {},
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: notification.channel || 'default',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        };
        response = await admin.messaging().send(message);
        logger.info(`Notification Firebase envoyée: ${response}`);
      } else {
        logger.warn('Firebase non configuré et token non-Expo - notification ignorée');
        return { success: false, reason: 'firebase_not_configured' };
      }

      // Enregistrer dans la base de données
      await query(
        `INSERT INTO notifications (
          user_id, user_type, type, title, message, data, is_read, sent_via
        )
        VALUES ($1, $2, $3, $4, $5, $6, false, 'push')`,
        [
          userId,
          notificationUserType,
          notification.type || 'general',
          notification.title,
          messageBody,
          JSON.stringify(notification.data || {}),
        ]
      );

      return {
        success: true,
        message_id: response,
      };
    } catch (error) {
      logger.error('Erreur envoi notification push:', error);
      
      // Enregistrer quand même en base même si l'envoi a échoué
      try {
        await query(
          `INSERT INTO notifications (
            user_id, user_type, type, title, message, data, is_read, sent_via
          )
          VALUES ($1, $2, $3, $4, $5, $6, false, 'push')`,
          [
            userId,
            this.normalizeNotificationUserType(userType),
            notification.type || 'general',
            notification.title,
            messageBody,
            JSON.stringify(notification.data || {}),
          ]
        );
      } catch (dbError) {
        logger.error('Erreur enregistrement notification en DB:', dbError);
      }

      throw error;
    }
  }

  /**
   * Envoyer une notification à plusieurs utilisateurs
   */
  async sendToMultiple(userIds, userType, notification) {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendToUser(userId, userType, notification))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      total: userIds.length,
      successful,
      failed,
    };
  }

  /**
   * Envoyer une notification par topic (diffusion)
   */
  async sendToTopic(topic, notification) {
    try {
      if (!firebaseApp) {
        logger.warn('Firebase non initialisé - notification topic ignorée');
        return { success: false, reason: 'firebase_not_configured' };
      }

      const message = {
        topic: topic,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
      };

      const response = await admin.messaging().send(message);
      
      logger.info(`Notification topic envoyée à ${topic}: ${response}`);

      return {
        success: true,
        message_id: response,
      };
    } catch (error) {
      logger.error('Erreur envoi notification topic:', error);
      throw error;
    }
  }

  /**
   * Templates de notifications prédéfinis
   */
  async sendOrderNotification(orderId, recipientType, eventType) {
    try {
      const orderResult = await query(
        `SELECT o.*, 
                r.name as restaurant_name,
                u.first_name as client_first_name,
                dp.first_name as delivery_first_name
         FROM orders o
         LEFT JOIN restaurants r ON o.restaurant_id = r.id
         LEFT JOIN users u ON o.user_id = u.id
         LEFT JOIN delivery_persons dp ON o.delivery_person_id = dp.id
         WHERE o.id = $1`,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        throw new Error('Commande non trouvée');
      }

      const order = orderResult.rows[0];
      let notification;
      let recipientId;

      switch (recipientType) {
        case 'client':
          recipientId = order.user_id;
          notification = this.getClientNotification(eventType, order);
          break;
        
        case 'restaurant':
          recipientId = order.restaurant_id;
          notification = this.getRestaurantNotification(eventType, order);
          break;
        
        case 'delivery':
          recipientId = order.delivery_person_id;
          notification = this.getDeliveryNotification(eventType, order);
          break;
        
        default:
          throw new Error('Type de destinataire invalide');
      }

      if (!recipientId) {
        logger.warn(`Pas de destinataire pour ${recipientType} dans commande ${orderId}`);
        return { success: false, reason: 'no_recipient' };
      }

      return await this.sendToUser(recipientId, recipientType, notification);
    } catch (error) {
      logger.error('Erreur sendOrderNotification:', error);
      throw error;
    }
  }

  /**
   * Notifications pour clients
   */
  getClientNotification(eventType, order) {
    const templates = {
      order_confirmed: {
        title: '🎉 Commande confirmée !',
        body: `Votre commande ${order.order_number} a été confirmée. Préparation en cours...`,
        type: 'order_update',
        data: {
          order_id: order.id,
          order_number: order.order_number,
          status: 'confirmed',
        },
        channel: 'orders',
      },
      order_preparing: {
        title: '👨‍🍳 Préparation en cours',
        body: `${order.restaurant_name} prépare votre commande. Prête dans ~${order.estimated_delivery_time} min.`,
        type: 'order_update',
        data: {
          order_id: order.id,
          order_number: order.order_number,
          status: 'preparing',
        },
        channel: 'orders',
      },
      order_ready: {
        title: '✅ Commande prête !',
        body: 'Votre commande est prête. Un livreur va la récupérer.',
        type: 'order_update',
        data: {
          order_id: order.id,
          order_number: order.order_number,
          status: 'ready',
        },
        channel: 'orders',
      },
      delivery_assigned: {
        title: '🚴 Livreur assigné',
        body: `${order.delivery_first_name} va livrer votre commande.`,
        type: 'order_update',
        data: {
          order_id: order.id,
          order_number: order.order_number,
          delivery_person_id: order.delivery_person_id,
        },
        channel: 'orders',
      },
      delivery_on_way: {
        title: '🚴 En route !',
        body: `${order.delivery_first_name} est en route avec votre commande !`,
        type: 'order_update',
        data: {
          order_id: order.id,
          order_number: order.order_number,
          status: 'delivering',
        },
        channel: 'orders',
      },
      delivery_nearby: {
        title: '📍 Presque arrivé',
        body: 'Votre livreur arrive dans 5 minutes !',
        type: 'order_update',
        data: {
          order_id: order.id,
          order_number: order.order_number,
        },
        channel: 'orders',
      },
      delivery_arrived_at_customer: {
        title: '🚴 Livreur arrivé !',
        body: `${order.delivery_first_name || 'Votre livreur'} est arrivé chez vous. Préparez le règlement si besoin.`,
        type: 'order_update',
        data: {
          order_id: order.id,
          order_number: order.order_number,
          status: 'driver_at_customer',
        },
        channel: 'orders',
      },
      order_delivered: {
        title: '🎉 Commande livrée !',
        body: 'Bon appétit ! N\'oubliez pas de noter votre expérience.',
        type: 'order_update',
        data: {
          order_id: order.id,
          order_number: order.order_number,
          status: 'delivered',
        },
        channel: 'orders',
      },
      order_cancelled: {
        title: '❌ Commande annulée',
        body: `Votre commande ${order.order_number} a été annulée.`,
        type: 'order_update',
        data: {
          order_id: order.id,
          order_number: order.order_number,
          status: 'cancelled',
        },
        channel: 'orders',
      },
      // Rappels
      cart_reminder: {
        title: '🛒 Panier en attente',
        body: 'Vous avez des articles dans votre panier. Finalisez votre commande !',
        type: 'reminder',
        data: {},
        channel: 'reminders',
      },
      reorder_suggestion: {
        title: '🍽️ Envie de recommander ?',
        body: `Recommandez votre plat préféré chez ${order?.restaurant_name || 'votre restaurant favori'} !`,
        type: 'reminder',
        data: {
          restaurant_id: order?.restaurant_id,
        },
        channel: 'reminders',
      },
      // Promotions
      promotion: {
        title: order?.title || '🎁 Offre spéciale !',
        body: order?.message || 'Découvrez nos offres exclusives.',
        type: 'promotion',
        data: {
          promo_code: order?.promo_code,
          discount: order?.discount,
        },
        channel: 'promotions',
      },
      loyalty_reward: {
        title: '🏆 Récompense fidélité !',
        body: `Vous avez gagné ${order?.points || 0} points de fidélité.`,
        type: 'loyalty',
        data: {
          points: order?.points,
        },
        channel: 'rewards',
      },
    };

    return templates[eventType] || {
      title: 'Mise à jour de commande',
      body: `Votre commande ${order?.order_number || ''} a été mise à jour.`,
      type: 'order_update',
      data: { order_id: order?.id },
    };
  }

  /**
   * Notifications pour restaurants
   */
  getRestaurantNotification(eventType, order) {
    const templates = {
      new_order: {
        title: '🔔 Nouvelle commande !',
        body: `Commande ${order?.order_number} - ${order?.total || 0} FCFA. Acceptez rapidement !`,
        type: 'new_order',
        data: {
          order_id: order?.id,
          order_number: order?.order_number,
          total: String(order?.total || 0),
        },
        channel: 'orders',
      },
      order_cancelled: {
        title: '❌ Commande annulée',
        body: `La commande ${order?.order_number} a été annulée par le client.`,
        type: 'order_cancelled',
        data: {
          order_id: order?.id,
          order_number: order?.order_number,
        },
        channel: 'orders',
      },
      urgent_order_pending: {
        title: '⚠️ URGENT - Commande en attente !',
        body: `La commande ${order?.order_number} attend depuis ${order?.wait_minutes || 5} min. Acceptez-la maintenant !`,
        type: 'urgent',
        data: {
          order_id: order?.id,
          order_number: order?.order_number,
        },
        channel: 'urgent',
      },
      delivery_arrived: {
        title: '🚴 Livreur arrivé',
        body: `Le livreur est arrivé pour récupérer la commande ${order?.order_number}.`,
        type: 'delivery_update',
        data: {
          order_id: order?.id,
          order_number: order?.order_number,
        },
        channel: 'orders',
      },
      order_picked_up: {
        title: '📦 Commande récupérée',
        body: `Le livreur a récupéré la commande ${order?.order_number}.`,
        type: 'delivery_update',
        data: {
          order_id: order?.id,
          order_number: order?.order_number,
        },
        channel: 'orders',
      },
      payout_processed: {
        title: '💰 Paiement envoyé',
        body: `Un virement de ${order?.amount || 0} FCFA a été envoyé sur votre compte.`,
        type: 'payment',
        data: {
          amount: order?.amount,
        },
        channel: 'payments',
      },
    };

    return templates[eventType] || {
      title: 'Notification',
      body: 'Vous avez une nouvelle notification.',
      type: 'general',
      data: {},
    };
  }

  /**
   * Notifications pour livreurs
   */
  getDeliveryNotification(eventType, order) {
    const templates = {
      new_delivery_available: {
        title: '🚴 Nouvelle livraison disponible',
        body: `${order?.restaurant_name || 'Restaurant'} - ${order?.delivery_fee || order?.total || 0} FCFA. Acceptez vite !`,
        type: 'new_delivery',
        data: {
          order_id: order?.id,
          order_number: order?.order_number,
          restaurant_name: order?.restaurant_name,
        },
        channel: 'deliveries',
      },
      order_ready_for_pickup: {
        title: '📦 Commande prête',
        body: `La commande ${order?.order_number} est prête à récupérer chez ${order?.restaurant_name}.`,
        type: 'order_ready',
        data: {
          order_id: order?.id,
          order_number: order?.order_number,
        },
        channel: 'deliveries',
      },
      order_proposed: {
        title: '📦 Course proposée',
        body: `${order?.restaurant_name || 'Restaurant'} - ${order?.delivery_fee || order?.total || 0} FCFA. Acceptez dans les 2 min.`,
        type: 'order_proposed',
        data: {
          order_id: order?.id,
          order_number: order?.order_number,
          restaurant_name: order?.restaurant_name,
          expires_at: order?.expires_at,
          expires_in_seconds: order?.expires_in_seconds,
        },
        channel: 'deliveries',
      },
      order_cancelled: {
        title: '❌ Commande annulée',
        body: `La commande ${order?.order_number} a été annulée.`,
        type: 'order_cancelled',
        data: {
          order_id: order?.id,
          order_number: order?.order_number,
        },
        channel: 'deliveries',
      },
      delivery_completed: {
        title: '✅ Livraison terminée',
        body: `Bien joué ! Vous avez gagné ${order?.earnings || 0} FCFA.`,
        type: 'delivery_completed',
        data: {
          order_id: order?.id,
          earnings: order?.earnings,
        },
        channel: 'deliveries',
      },
      bonus_reached: {
        title: '🎉 Bonus atteint !',
        body: `Félicitations ! Vous avez débloqué un bonus de ${order?.bonus_amount || 0} FCFA.`,
        type: 'bonus',
        data: {
          bonus_amount: order?.bonus_amount,
          bonus_type: order?.bonus_type,
        },
        channel: 'bonuses',
      },
      daily_target_reached: {
        title: '🏆 Objectif atteint !',
        body: `Bravo ! Vous avez atteint votre objectif quotidien de ${order?.target_deliveries || 10} livraisons.`,
        type: 'achievement',
        data: {
          deliveries_count: order?.deliveries_count,
        },
        channel: 'achievements',
      },
    };

    return templates[eventType] || {
      title: 'Notification',
      body: 'Vous avez une nouvelle notification.',
      type: 'general',
      data: {},
    };
  }

  /**
   * Sauvegarder le FCM token d'un utilisateur
   */
  async saveFCMToken(userId, userType, fcmToken) {
    try {
      const table = this.getUserTable(userType);

      await query(
        `UPDATE ${table} SET fcm_token = $1 WHERE id = $2`,
        [fcmToken, userId]
      );

      logger.info(`FCM token sauvegardé pour ${userType} ${userId}`);

      return { success: true };
    } catch (error) {
      logger.error('Erreur sauvegarde FCM token:', error);
      throw error;
    }
  }

  /**
   * Marquer une notification comme lue
   */
  async markAsRead(notificationId, userId) {
    try {
      await query(
        'UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND user_id = $2',
        [notificationId, userId]
      );

      return { success: true };
    } catch (error) {
      logger.error('Erreur markAsRead:', error);
      throw error;
    }
  }

  /**
   * Obtenir les notifications d'un utilisateur
   */
  async getUserNotifications(userId, userType, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;

      const result = await query(
        `SELECT * FROM notifications
         WHERE user_id = $1 AND user_type = $2
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4`,
        [userId, userType, limit, offset]
      );

      const countResult = await query(
        'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND user_type = $2',
        [userId, userType]
      );

      const unreadResult = await query(
        'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND user_type = $2 AND is_read = false',
        [userId, userType]
      );

      return {
        notifications: result.rows,
        total: parseInt(countResult.rows[0].count),
        unread: parseInt(unreadResult.rows[0].count),
        page: parseInt(page),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      };
    } catch (error) {
      logger.error('Erreur getUserNotifications:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
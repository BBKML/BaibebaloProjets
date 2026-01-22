const admin = require('firebase-admin');
const config = require('../config');
const logger = require('../utils/logger');
const { query } = require('../database/db');

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
   */
  async sendToUser(userId, userType, notification) {
    try {
      if (!firebaseApp) {
        logger.warn('Firebase non initialisé - notification ignorée');
        return { success: false, reason: 'firebase_not_configured' };
      }

      // Récupérer le FCM token de l'utilisateur
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

      const fcmToken = result.rows[0].fcm_token;

      const messageBody = notification.body || notification.message || '';

      // Construire le message
      const message = {
        token: fcmToken,
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

      // Envoyer la notification
      const response = await admin.messaging().send(message);
      
      logger.info(`Notification push envoyée: ${response}`);

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
    };

    return templates[eventType] || {
      title: 'Mise à jour de commande',
      body: `Votre commande ${order.order_number} a été mise à jour.`,
      type: 'order_update',
      data: { order_id: order.id },
    };
  }

  /**
   * Notifications pour restaurants
   */
  getRestaurantNotification(eventType, order) {
    const templates = {
      new_order: {
        title: '🔔 Nouvelle commande !',
        body: `Commande ${order.order_number} - ${order.total} FCFA. Acceptez rapidement !`,
        type: 'new_order',
        data: {
          order_id: order.id,
          order_number: order.order_number,
          total: order.total.toString(),
        },
        channel: 'orders',
      },
      order_cancelled: {
        title: '❌ Commande annulée',
        body: `La commande ${order.order_number} a été annulée par le client.`,
        type: 'order_cancelled',
        data: {
          order_id: order.id,
          order_number: order.order_number,
        },
        channel: 'orders',
      },
    };

    return templates[eventType];
  }

  /**
   * Notifications pour livreurs
   */
  getDeliveryNotification(eventType, order) {
    const templates = {
      new_delivery_available: {
        title: '🚴 Nouvelle livraison disponible',
        body: `${order.restaurant_name} - ${order.total} FCFA. Acceptez vite !`,
        type: 'new_delivery',
        data: {
          order_id: order.id,
          order_number: order.order_number,
          restaurant_name: order.restaurant_name,
        },
        channel: 'deliveries',
      },
      order_ready_for_pickup: {
        title: '📦 Commande prête',
        body: `La commande ${order.order_number} est prête à récupérer chez ${order.restaurant_name}.`,
        type: 'order_ready',
        data: {
          order_id: order.id,
          order_number: order.order_number,
        },
        channel: 'deliveries',
      },
    };

    return templates[eventType];
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
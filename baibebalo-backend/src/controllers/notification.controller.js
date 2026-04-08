const { query } = require('../database/db');
const logger = require('../utils/logger');
const notificationService = require('../services/notification.service');

const normalizeNotificationUserType = (userType) => {
  if (userType === 'client' || userType === 'user') return 'user';
  if (userType === 'delivery_person' || userType === 'delivery') return 'delivery';
  return userType;
};

exports.saveFcmToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FCM_TOKEN',
          message: 'FCM token invalide',
        },
      });
    }

    await notificationService.saveFCMToken(req.user.id, req.user.type, token.trim());

    res.json({
      success: true,
      message: 'FCM token enregistré',
    });
  } catch (error) {
    logger.error('Erreur saveFcmToken:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FCM_SAVE_ERROR',
        message: 'Erreur lors de l\'enregistrement du token',
      },
    });
  }
};

exports.getMyNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userType = normalizeNotificationUserType(req.user.type);

    const data = await notificationService.getUserNotifications(
      req.user.id,
      userType,
      parseInt(page, 10),
      parseInt(limit, 10)
    );

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Erreur getMyNotifications:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erreur lors de la récupération des notifications',
      },
    });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userType = normalizeNotificationUserType(req.user.type);

    const result = await query(
      `UPDATE notifications
       SET is_read = true, read_at = NOW()
       WHERE id = $1 AND user_id = $2 AND user_type = $3
       RETURNING id`,
      [id, req.user.id, userType]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'Notification non trouvée',
        },
      });
    }

    res.json({
      success: true,
      message: 'Notification marquée comme lue',
    });
  } catch (error) {
    logger.error('Erreur markNotificationRead:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Erreur lors de la mise à jour de la notification',
      },
    });
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    const userType = normalizeNotificationUserType(req.user.type);

    const result = await query(
      `UPDATE notifications
       SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND user_type = $2 AND is_read = false
       RETURNING id`,
      [req.user.id, userType]
    );

    res.json({
      success: true,
      message: `${result.rowCount} notification(s) marquée(s) comme lue(s)`,
      data: { updated_count: result.rowCount },
    });
  } catch (error) {
    logger.error('Erreur markAllNotificationsRead:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Erreur lors de la mise à jour des notifications',
      },
    });
  }
};

exports.getNotificationSettings = async (req, res) => {
  try {
    const userType = req.user.type;
    let settings = null;

    if (userType === 'delivery_person') {
      const result = await query(
        'SELECT notification_preferences FROM delivery_persons WHERE id = $1',
        [req.user.id]
      );
      settings = result.rows[0]?.notification_preferences || {};
    } else if (userType === 'restaurant') {
      const result = await query(
        'SELECT notification_preferences FROM restaurants WHERE id = $1',
        [req.user.id]
      );
      settings = result.rows[0]?.notification_preferences || {};
    } else {
      const result = await query(
        'SELECT notification_preferences FROM users WHERE id = $1',
        [req.user.id]
      );
      settings = result.rows[0]?.notification_preferences || {};
    }

    res.json({
      success: true,
      data: { settings: typeof settings === 'string' ? JSON.parse(settings) : settings },
    });
  } catch (error) {
    logger.error('Erreur getNotificationSettings:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des paramètres' },
    });
  }
};

exports.updateNotificationSettings = async (req, res) => {
  try {
    const userType = req.user.type;
    const settings = req.body;

    if (userType === 'delivery_person') {
      await query(
        'UPDATE delivery_persons SET notification_preferences = $1 WHERE id = $2',
        [JSON.stringify(settings), req.user.id]
      );
    } else if (userType === 'restaurant') {
      await query(
        'UPDATE restaurants SET notification_preferences = $1 WHERE id = $2',
        [JSON.stringify(settings), req.user.id]
      );
    } else {
      await query(
        'UPDATE users SET notification_preferences = $1 WHERE id = $2',
        [JSON.stringify(settings), req.user.id]
      );
    }

    res.json({
      success: true,
      message: 'Paramètres de notifications mis à jour',
    });
  } catch (error) {
    logger.error('Erreur updateNotificationSettings:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour des paramètres' },
    });
  }
};

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

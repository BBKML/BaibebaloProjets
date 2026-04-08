const express = require('express');
const { body, query, param } = require('express-validator');
const { authenticate, authorize } = require('../middlewares/auth');
const { validate } = require('../middlewares/validators');
const notificationController = require('../controllers/notification.controller');

const router = express.Router();

router.use(authenticate);
router.use(authorize('user', 'client', 'restaurant', 'delivery_person'));

/**
 * @route   POST /api/v1/notifications/fcm-token
 * @desc    Enregistrer le token FCM
 * @access  Private
 */
router.post(
  '/fcm-token',
  [
    body('token')
      .trim()
      .notEmpty()
      .isLength({ min: 20 })
      .withMessage('Token FCM invalide'),
  ],
  validate,
  notificationController.saveFcmToken
);

/**
 * @route   GET /api/v1/notifications
 * @desc    Lister les notifications
 * @access  Private
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validate,
  notificationController.getMyNotifications
);

/**
 * @route   PUT /api/v1/notifications/:id/read
 * @desc    Marquer une notification comme lue
 * @access  Private
 */
router.put(
  '/:id/read',
  [param('id').isUUID().withMessage('ID notification invalide')],
  validate,
  notificationController.markNotificationRead
);

/**
 * @route   PUT /api/v1/notifications/read-all
 * @desc    Marquer toutes les notifications comme lues
 * @access  Private
 */
router.put('/read-all', notificationController.markAllNotificationsRead);

/**
 * @route   GET /api/v1/notifications/settings
 * @desc    Obtenir les préférences de notifications
 * @access  Private
 */
router.get('/settings', notificationController.getNotificationSettings);

/**
 * @route   PUT /api/v1/notifications/settings
 * @desc    Mettre à jour les préférences de notifications
 * @access  Private
 */
router.put('/settings', notificationController.updateNotificationSettings);

module.exports = router;

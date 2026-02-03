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

module.exports = router;

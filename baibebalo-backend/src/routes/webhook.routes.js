const express = require('express');
const logger = require('../utils/logger');
const orangeMoneyService = require('../services/payment/orange-money.service');
const mtnMomoService = require('../services/payment/mtn-momo.service');

const router = express.Router();

/**
 * Webhook Orange Money
 * @route POST /api/v1/webhooks/orange-money
 */
router.post('/orange-money', async (req, res) => {
  try {
    logger.info('Webhook Orange Money reçu:', req.body);

    await orangeMoneyService.handleWebhook(req.body);

    res.json({
      success: true,
      message: 'Webhook traité',
    });
  } catch (error) {
    logger.error('Erreur webhook Orange Money:', error);
    
    // Toujours répondre 200 pour éviter les retry
    res.json({
      success: false,
      message: 'Erreur de traitement',
    });
  }
});

/**
 * Webhook MTN Mobile Money
 * @route POST /api/v1/webhooks/mtn-momo
 */
router.post('/mtn-momo', async (req, res) => {
  try {
    logger.info('Webhook MTN MoMo reçu:', req.body);

    await mtnMomoService.handleCallback(req.body);

    res.json({
      success: true,
      message: 'Webhook traité',
    });
  } catch (error) {
    logger.error('Erreur webhook MTN MoMo:', error);
    
    res.json({
      success: false,
      message: 'Erreur de traitement',
    });
  }
});

/**
 * Webhook Moov Money (à implémenter selon API)
 * @route POST /api/v1/webhooks/moov-money
 */
router.post('/moov-money', async (req, res) => {
  try {
    logger.info('Webhook Moov Money reçu:', req.body);

    // TODO: Implémenter selon la vraie API Moov Money

    res.json({
      success: true,
      message: 'Webhook traité',
    });
  } catch (error) {
    logger.error('Erreur webhook Moov Money:', error);
    
    res.json({
      success: false,
      message: 'Erreur de traitement',
    });
  }
});

/**
 * Webhook Firebase Cloud Messaging (optionnel)
 * Pour gérer les événements de livraison de notifications
 * @route POST /api/v1/webhooks/fcm
 */
router.post('/fcm', async (req, res) => {
  try {
    logger.info('Webhook FCM reçu:', req.body);

    // Gérer les événements de notification (optionnel)
    // Ex: notification non livrée, token invalide, etc.

    res.json({
      success: true,
    });
  } catch (error) {
    logger.error('Erreur webhook FCM:', error);
    res.json({ success: false });
  }
});

/**
 * Test webhook (développement seulement)
 * @route POST /api/v1/webhooks/test
 */
if (process.env.NODE_ENV !== 'production') {
  router.post('/test', (req, res) => {
    logger.info('Test webhook:', req.body);
    res.json({
      success: true,
      message: 'Webhook test reçu',
      data: req.body,
    });
  });
}

module.exports = router;
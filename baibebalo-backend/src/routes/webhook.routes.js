const express = require('express');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');
const orangeMoneyService = require('../services/payment/orange-money.service');
const mtnMomoService = require('../services/payment/mtn-momo.service');

const router = express.Router();

/**
 * Middleware de vérification signature HMAC-SHA256.
 * - En production sans secret configuré : refuse avec 500 (configuration manquante).
 * - En dev sans secret : laisse passer avec un avertissement.
 * - Avec secret : vérifie le header de signature, rejette si invalide (timing-safe).
 */
function verifyHmacSignature(secret, providerName) {
  return (req, res, next) => {
    if (!secret) {
      if (config.env === 'production') {
        logger.error(`SÉCURITÉ CRITIQUE: secret webhook ${providerName} absent en production !`);
        return res.status(500).json({ error: 'Configuration sécurité manquante' });
      }
      logger.warn(`⚠️  Webhook ${providerName} sans vérification HMAC (secret absent — dev uniquement)`);
      return next();
    }

    // Les providers envoient la signature dans différents headers
    const rawSig = req.headers['x-orange-signature']
      || req.headers['x-api-signature']
      || req.headers['x-callback-signature']
      || req.headers['x-signature']
      || '';

    if (!rawSig) {
      logger.warn(`Webhook ${providerName} rejeté: header de signature absent`, { ip: req.ip });
      return res.status(401).json({ success: false, error: 'Signature manquante' });
    }

    // Certains providers préfixent avec "sha256="
    const sigHex = rawSig.replace(/^sha256=/, '');
    const body = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const expectedHex = crypto.createHmac('sha256', secret).update(body).digest('hex');

    try {
      const sigBuf = Buffer.from(sigHex, 'hex');
      const expBuf = Buffer.from(expectedHex, 'hex');
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        logger.warn(`Webhook ${providerName} rejeté: signature invalide`, { ip: req.ip });
        return res.status(401).json({ success: false, error: 'Signature invalide' });
      }
    } catch {
      logger.warn(`Webhook ${providerName} rejeté: format signature invalide`, { ip: req.ip });
      return res.status(401).json({ success: false, error: 'Format signature invalide' });
    }

    next();
  };
}

/**
 * Webhook Orange Money
 * @route POST /api/v1/webhooks/orange-money
 */
router.post(
  '/orange-money',
  verifyHmacSignature(config.payment.orangeMoney.webhookSecret, 'Orange Money'),
  async (req, res) => {
    try {
      logger.info('Webhook Orange Money reçu', {
        ip: req.ip,
        order_id: req.body?.order_id,
        status: req.body?.status,
      });

      await orangeMoneyService.handleWebhook(req.body);

      res.json({ success: true, message: 'Webhook traité' });
    } catch (error) {
      logger.error('Erreur webhook Orange Money:', error);
      // Toujours répondre 200 pour éviter les retry infinis du provider
      res.json({ success: false, message: 'Erreur de traitement' });
    }
  }
);

/**
 * Webhook MTN Mobile Money
 * @route POST /api/v1/webhooks/mtn-momo
 */
router.post(
  '/mtn-momo',
  verifyHmacSignature(config.payment.mtnMomo.webhookSecret, 'MTN MoMo'),
  async (req, res) => {
    try {
      logger.info('Webhook MTN MoMo reçu', {
        ip: req.ip,
        externalId: req.body?.externalId,
        status: req.body?.status,
      });

      await mtnMomoService.handleCallback(req.body);

      res.json({ success: true, message: 'Webhook traité' });
    } catch (error) {
      logger.error('Erreur webhook MTN MoMo:', error);
      res.json({ success: false, message: 'Erreur de traitement' });
    }
  }
);

/**
 * Webhook Moov Money
 * @route POST /api/v1/webhooks/moov-money
 */
router.post('/moov-money', async (req, res) => {
  try {
    logger.info('Webhook Moov Money reçu', { ip: req.ip });
    // TODO: Implémenter selon la vraie API Moov Money (+ signature HMAC)
    res.json({ success: true, message: 'Webhook traité' });
  } catch (error) {
    logger.error('Erreur webhook Moov Money:', error);
    res.json({ success: false, message: 'Erreur de traitement' });
  }
});

/**
 * Webhook Firebase Cloud Messaging
 * @route POST /api/v1/webhooks/fcm
 */
router.post('/fcm', async (req, res) => {
  try {
    logger.info('Webhook FCM reçu', { ip: req.ip });
    res.json({ success: true });
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
    res.json({ success: true, message: 'Webhook test reçu', data: req.body });
  });
}

module.exports = router;

/**
 * Routes publiques (sans authentification)
 * Accessibles aux applications mobiles pour récupérer les paramètres généraux
 */

const express = require('express');
const router = express.Router();
const { getPublicSettings } = require('../utils/settings');
const logger = require('../utils/logger');

/**
 * GET /api/v1/public/settings
 * Récupère les paramètres publics pour les applications mobiles
 * AUCUNE AUTHENTIFICATION REQUISE
 * 
 * Retourne les paramètres avec is_public = true depuis app_settings
 * Avec fallback automatique sur config/index.js si app_settings est vide
 */
router.get('/settings', async (req, res) => {
  logger.debug('Route GET /settings appelée');
  try {
    const settings = await getPublicSettings();
    
    res.json({
      success: true,
      data: {
        settings,
        // Ajouter un timestamp pour le cache côté client
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Erreur récupération paramètres publics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SETTINGS_ERROR',
        message: 'Erreur lors de la récupération des paramètres',
      },
    });
  }
});

module.exports = router;

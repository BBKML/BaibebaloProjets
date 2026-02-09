/**
 * Utilitaires pour la gestion des paramètres d'application
 * Permet de récupérer les paramètres depuis app_settings avec fallback sur config/index.js
 * 
 * ⚠️ IMPORTANT: Les calculs critiques continuent d'utiliser config/index.js directement
 * Ce module est UNIQUEMENT pour l'affichage dans les applications mobiles
 */

const config = require('../config');
const { query } = require('../database/db');
const logger = require('./logger');

/**
 * Récupère un paramètre depuis app_settings avec fallback sur config
 * UTILISÉ UNIQUEMENT POUR L'AFFICHAGE, PAS POUR LES CALCULS CRITIQUES
 * 
 * @param {string} key - Clé du paramètre (ex: 'business.minOrderAmount')
 * @param {any} defaultValue - Valeur par défaut si non trouvée
 * @returns {Promise<any>} Valeur du paramètre
 */
async function getSetting(key, defaultValue = null) {
  try {
    const result = await query(
      'SELECT value FROM app_settings WHERE key = $1 AND is_public = true',
      [key]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0].value;
    }
  } catch (error) {
    logger.warn(`Erreur lecture paramètre ${key} depuis app_settings:`, error.message);
  }
  
  // Fallback sur config/index.js
  const configPath = key.split('.');
  let value = config;
  for (const part of configPath) {
    value = value?.[part];
    if (value === undefined) break;
  }
  
  return value === undefined ? defaultValue : value;
}

/**
 * Récupère tous les paramètres publics pour les applications mobiles
 * Garantit toujours des valeurs valides avec fallback sur config/index.js
 * 
 * @returns {Promise<Object>} Objet avec tous les paramètres publics
 */
async function getPublicSettings() {
  try {
    const result = await query(
      'SELECT key, value, description FROM app_settings WHERE is_public = true ORDER BY key'
    );
    
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = {
        value: row.value,
        description: row.description,
      };
    });
    
    // Ajouter les paramètres critiques depuis config avec fallback
    // (pour garantir que les apps ont toujours les valeurs à jour)
    const criticalSettings = {
      'payment.enabledMethods': config.payment.enabledMethods,
      'business.minOrderAmount': config.business.minOrderAmount,
      'business.freeDeliveryThreshold': config.business.freeDeliveryThreshold,
      'business.freeDeliveryEnabled': config.business.freeDeliveryEnabled,
      'business.maxDeliveryDistance': config.business.maxDeliveryDistance,
      'business.baseDeliveryFee': config.business.baseDeliveryFee,
      'business.deliveryPersonPercentage': config.business.deliveryPersonPercentage,
      'business.bundleDiscountEnabled': config.business.bundleDiscountEnabled,
      'business.bundleDiscountPercent': config.business.bundleDiscountPercent,
    };
    
    // Fusionner (app_settings en priorité, config en fallback)
    Object.entries(criticalSettings).forEach(([key, value]) => {
      if (settings[key] === undefined) {
        settings[key] = { 
          value, 
          description: `Depuis config (fallback)` 
        };
      }
    });
    
    return settings;
  } catch (error) {
    logger.error('Erreur récupération paramètres publics:', error);
    // En cas d'erreur, retourner au moins les valeurs critiques depuis config
    return {
      'payment.enabledMethods': { value: config.payment.enabledMethods },
      'business.minOrderAmount': { value: config.business.minOrderAmount },
      'business.freeDeliveryThreshold': { value: config.business.freeDeliveryThreshold },
      'business.freeDeliveryEnabled': { value: config.business.freeDeliveryEnabled },
      'business.maxDeliveryDistance': { value: config.business.maxDeliveryDistance },
      'business.baseDeliveryFee': { value: config.business.baseDeliveryFee },
      'business.deliveryPersonPercentage': { value: config.business.deliveryPersonPercentage },
      'business.bundleDiscountEnabled': { value: config.business.bundleDiscountEnabled },
      'business.bundleDiscountPercent': { value: config.business.bundleDiscountPercent },
    };
  }
}

module.exports = {
  getSetting,
  getPublicSettings,
};

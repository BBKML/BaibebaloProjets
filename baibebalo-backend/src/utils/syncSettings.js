/**
 * Synchronisation des paramètres depuis config/index.js vers app_settings
 * Garantit que les paramètres critiques sont toujours à jour dans la base de données
 * 
 * ⚠️ IMPORTANT: Cette synchronisation ne modifie PAS les calculs backend
 * Les calculs continuent d'utiliser config/index.js directement
 * Cette sync est uniquement pour que les applications mobiles aient les bonnes valeurs
 */

const config = require('../config');
const { query } = require('../database/db');
const logger = require('../utils/logger');

/**
 * Synchronise app_settings avec config/index.js
 * Appelée au démarrage du serveur pour garantir la cohérence
 */
async function syncSettingsFromConfig() {
  try {
    logger.info('🔄 Synchronisation des paramètres depuis config/index.js...');
    
    const settingsToSync = [
      {
        key: 'payment.enabledMethods',
        value: config.payment.enabledMethods,
        description: 'Méthodes de paiement activées (utilisé pour validation backend)',
        is_public: true,
      },
      {
        key: 'business.minOrderAmount',
        value: config.business.minOrderAmount,
        description: 'Montant minimum de commande (FCFA)',
        is_public: true,
      },
      {
        key: 'business.freeDeliveryThreshold',
        value: config.business.freeDeliveryThreshold,
        description: 'Seuil pour livraison gratuite (FCFA) - Si sous-total >= ce montant, livraison gratuite',
        is_public: true,
      },
      {
        key: 'business.freeDeliveryEnabled',
        value: config.business.freeDeliveryEnabled,
        description: 'Livraison gratuite activée (true/false)',
        is_public: true,
      },
      {
        key: 'business.maxDeliveryDistance',
        value: config.business.maxDeliveryDistance,
        description: 'Rayon maximum de livraison (km)',
        is_public: true,
      },
      {
        key: 'business.baseDeliveryFee',
        value: config.business.baseDeliveryFee,
        description: 'Frais de livraison de base (FCFA) - Note: Les frais réels sont calculés par maps.service.js',
        is_public: true,
      },
      {
        key: 'business.deliveryPersonPercentage',
        value: config.business.deliveryPersonPercentage,
        description: 'Pourcentage des frais de livraison pour le livreur (%)',
        is_public: true,
      },
      {
        key: 'business.bundleDiscountEnabled',
        value: config.business.bundleDiscountEnabled,
        description: 'Réduction automatique plat + boisson activée (true/false)',
        is_public: true,
      },
      {
        key: 'business.bundleDiscountPercent',
        value: config.business.bundleDiscountPercent,
        description: 'Pourcentage de réduction pour offre groupée (plat + boisson) (%)',
        is_public: true,
      },
      {
        key: 'business.deliveryBonusLongDistanceThreshold',
        value: config.business.deliveryBonusLongDistanceThreshold,
        description: 'Seuil de distance pour bonus longue distance (km)',
        is_public: true,
      },
      {
        key: 'business.deliveryBonusLongDistanceAmount',
        value: config.business.deliveryBonusLongDistanceAmount,
        description: 'Montant du bonus longue distance (FCFA)',
        is_public: true,
      },
      {
        key: 'business.deliveryBonusPeakHourAmount',
        value: config.business.deliveryBonusPeakHourAmount,
        description: 'Montant du bonus heure de pointe (FCFA)',
        is_public: true,
      },
      {
        key: 'business.deliveryBonusWeekendPercent',
        value: config.business.deliveryBonusWeekendPercent,
        description: 'Pourcentage de bonus week-end (%)',
        is_public: true,
      },
    ];

    let syncedCount = 0;
    let updatedCount = 0;
    let createdCount = 0;

    for (const setting of settingsToSync) {
      try {
        // Vérifier si le paramètre existe déjà
        const existing = await query(
          'SELECT key FROM app_settings WHERE key = $1',
          [setting.key]
        );

        const jsonValue = typeof setting.value === 'string' 
          ? setting.value 
          : JSON.stringify(setting.value);

        if (existing.rows.length > 0) {
          // Mettre à jour
          await query(
            `UPDATE app_settings 
             SET value = $1::jsonb, 
                 description = $2, 
                 is_public = $3, 
                 updated_at = NOW()
             WHERE key = $4`,
            [jsonValue, setting.description, setting.is_public, setting.key]
          );
          updatedCount++;
        } else {
          // Créer
          await query(
            `INSERT INTO app_settings (key, value, description, is_public, updated_at)
             VALUES ($1, $2::jsonb, $3, $4, NOW())`,
            [setting.key, jsonValue, setting.description, setting.is_public]
          );
          createdCount++;
        }
        syncedCount++;
      } catch (error) {
        logger.error(`Erreur synchronisation paramètre ${setting.key}:`, error.message);
      }
    }

    logger.info(`✅ Synchronisation terminée: ${syncedCount} paramètres synchronisés (${createdCount} créés, ${updatedCount} mis à jour)`);
  } catch (error) {
    logger.error('❌ Erreur synchronisation paramètres:', error);
    // Ne pas faire échouer le démarrage si la sync échoue
  }
}

module.exports = { syncSettingsFromConfig };

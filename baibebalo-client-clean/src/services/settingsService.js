/**
 * Service pour récupérer les paramètres publics de l'application
 * Utilise l'endpoint public /api/v1/public/settings
 */

import axios from 'axios';
import { API_CONFIG } from '../constants/api';

let cachedSettings = null;
let cacheTimestamp = null;
const CACHE_DURATION = 30 * 1000; // 30 secondes (pour détecter rapidement le mode maintenance)

/**
 * Récupère les paramètres publics depuis l'API
 * @returns {Promise<Object>} Paramètres publics
 */
export const getPublicSettings = async () => {
  try {
    // Vérifier le cache
    if (cachedSettings && cacheTimestamp) {
      const now = Date.now();
      if (now - cacheTimestamp < CACHE_DURATION) {
        console.log('[Settings] Utilisation du cache');
        return cachedSettings;
      }
    }

    // Utiliser axios directement pour éviter les intercepteurs d'auth
    // Construire l'URL de manière robuste : retirer /api/v1 si présent, puis le rajouter explicitement
    const rawBase = API_CONFIG.BASE_URL || '';
    const baseURL = rawBase.replace('/api/v1', '') || 'https://baibebaloprojets.onrender.com';
    const url = `${baseURL}/api/v1/public/settings`;
    console.log('[Settings] Appel URL:', url);
    const response = await axios.get(url, {
      timeout: 5000, // Timeout court pour ne pas bloquer le démarrage
    });

    if (response.data?.success) {
      cachedSettings = response.data.data.settings;
      cacheTimestamp = Date.now();
      return cachedSettings;
    }

    return null;
  } catch (error) {
    console.error('[Settings] Erreur récupération paramètres:', error.message);
    // En cas d'erreur, retourner null pour ne pas bloquer l'app
    return null;
  }
};

/**
 * Vérifie si la plateforme est en mode maintenance
 * @returns {Promise<boolean>} true si maintenance_mode = true
 */
export const checkMaintenanceMode = async () => {
  try {
    const settings = await getPublicSettings();
    if (!settings) {
      // Si on ne peut pas récupérer les paramètres, on considère que tout va bien
      return false;
    }

    const maintenanceMode = settings['maintenance_mode']?.value || false;
    return Boolean(maintenanceMode);
  } catch (error) {
    console.error('[Settings] Erreur vérification maintenance:', error.message);
    // En cas d'erreur, on considère que tout va bien pour ne pas bloquer l'app
    return false;
  }
};

/**
 * Récupère un paramètre spécifique
 * @param {string} key - Clé du paramètre (ex: 'business.minOrderAmount')
 * @param {any} defaultValue - Valeur par défaut si non trouvée
 * @returns {Promise<any>} Valeur du paramètre
 */
export const getSetting = async (key, defaultValue = null) => {
  try {
    const settings = await getPublicSettings();
    if (!settings) {
      return defaultValue;
    }

    const setting = settings[key];
    return setting?.value !== undefined ? setting.value : defaultValue;
  } catch (error) {
    console.error(`[Settings] Erreur récupération paramètre ${key}:`, error.message);
    return defaultValue;
  }
};

/**
 * Invalide le cache (à appeler après modification des paramètres)
 */
export const invalidateSettingsCache = () => {
  cachedSettings = null;
  cacheTimestamp = null;
};

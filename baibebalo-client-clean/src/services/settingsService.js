/**
 * Service pour récupérer les paramètres publics de l'application
 * Utilise l'endpoint public /api/v1/public/settings
 * Cache 60 secondes + déduplication des appels simultanés.
 */

import axios from 'axios';
import { API_CONFIG } from '../constants/api';

let cachedSettings = null;
let cacheTimestamp = null;
const CACHE_DURATION_MS = 30 * 1000; // 30 secondes (coordonnées admin propagées plus vite)

/** Promesse en cours pour éviter plusieurs requêtes simultanées */
let inFlightPromise = null;

/**
 * Récupère les paramètres publics depuis l'API (ou le cache si < 60 s).
 * Les appels simultanés partagent la même requête.
 * @returns {Promise<Object>} Paramètres publics
 */
export const getPublicSettings = async () => {
  const now = Date.now();
  if (cachedSettings != null && cacheTimestamp != null && now - cacheTimestamp < CACHE_DURATION_MS) {
    if (__DEV__) console.log('[Settings] Utilisation du cache (< 60 s)');
    return cachedSettings;
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  const fetch = async () => {
    try {
      const rawBase = API_CONFIG.BASE_URL || '';
      const baseURL = rawBase.replace('/api/v1', '') || 'https://baibebaloprojets.onrender.com';
      const url = `${baseURL}/api/v1/public/settings`;
      if (__DEV__) console.log('[Settings] Appel URL:', url);
      const response = await axios.get(url, {
        timeout: 5000,
      });

      if (response.data?.success) {
        cachedSettings = response.data.data.settings;
        cacheTimestamp = Date.now();
        return cachedSettings;
      }
      return null;
    } catch (error) {
      if (__DEV__) console.warn('[Settings] Paramètres non disponibles:', error.message);
      return null;
    } finally {
      inFlightPromise = null;
    }
  };

  inFlightPromise = fetch();
  return inFlightPromise;
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
    if (__DEV__) console.warn('[Settings] Vérification maintenance impossible:', error.message);
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
    if (__DEV__) console.warn(`[Settings] Paramètre ${key} non disponible:`, error.message);
    return defaultValue;
  }
};

/**
 * Invalide le cache (à appeler après modification des paramètres).
 * Le prochain getPublicSettings() fera une nouvelle requête.
 */
export const invalidateSettingsCache = () => {
  cachedSettings = null;
  cacheTimestamp = null;
  inFlightPromise = null;
};

/**
 * Récupère la valeur d'un paramètre "coordonnées entreprise" (format API { value, description } ou valeur directe).
 */
export const getCompanyValue = (settings, key) => {
  if (!settings || !key) return undefined;
  const v = settings[key];
  if (v == null) return undefined;
  if (typeof v === 'object' && v !== null && 'value' in v) return v.value;
  return v;
};

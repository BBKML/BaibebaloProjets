import apiClient from './client';
import { API_CONFIG } from '../constants/api';

/**
 * Récupérer la liste des notifications
 */
export const getNotifications = async (params = {}) => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.NOTIFICATIONS.LIST, {
    params,
  });
  return response.data;
};

/**
 * Marquer une notification comme lue
 */
export const markNotificationRead = async (notificationId) => {
  const response = await apiClient.put(
    API_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId)
  );
  return response.data;
};

/**
 * Enregistrer le token FCM pour les notifications push
 */
export const saveFcmToken = async (fcmToken) => {
  const response = await apiClient.post(
    API_CONFIG.ENDPOINTS.NOTIFICATIONS.SAVE_FCM_TOKEN,
    { token: fcmToken }
  );
  return response.data;
};

import api from './auth';
import { API_ENDPOINTS } from '../constants/api';

export const restaurantNotifications = {
  /**
   * Récupérer la liste des notifications
   */
  getNotifications: async (params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.NOTIFICATIONS.LIST, {
        params,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Marquer une notification comme lue
   */
  markAsRead: async (notificationId) => {
    try {
      const response = await api.put(
        API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId)
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Enregistrer le token FCM pour les notifications push
   */
  saveFcmToken: async (fcmToken) => {
    try {
      const response = await api.post(
        API_ENDPOINTS.NOTIFICATIONS.SAVE_FCM_TOKEN,
        { token: fcmToken }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

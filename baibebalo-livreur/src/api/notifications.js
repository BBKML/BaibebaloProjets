import apiClient from './client';
import { API_ENDPOINTS } from '../constants/api';

// === Liste des notifications ===
export const getNotifications = async (page = 1, limit = 20) => {
  const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.LIST, {
    params: { page, limit },
  });
  return response.data;
};

// === Marquer comme lu ===
export const markAsRead = async (notificationId) => {
  const response = await apiClient.put(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId));
  return response.data;
};

export const markAllAsRead = async () => {
  const response = await apiClient.put(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
  return response.data;
};

// === Token FCM ===
export const saveFCMToken = async (token) => {
  const response = await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.SAVE_FCM_TOKEN, { token });
  return response.data;
};

// === Paramètres de notification ===
export const getNotificationSettings = async () => {
  const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.SETTINGS);
  return response.data;
};

export const updateNotificationSettings = async (settings) => {
  const response = await apiClient.put(API_ENDPOINTS.NOTIFICATIONS.SETTINGS, settings);
  return response.data;
};

export default {
  getNotifications,
  markAsRead,
  markAllAsRead,
  saveFCMToken,
  getNotificationSettings,
  updateNotificationSettings,
};

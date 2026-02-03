import api from './auth';
import { API_ENDPOINTS } from '../constants/api';

export const restaurantOrders = {
  // Liste des commandes
  getOrders: async (filters = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.ORDERS.LIST, { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Détails d'une commande
  getOrderDetails: async (orderId) => {
    try {
      const response = await api.get(API_ENDPOINTS.ORDERS.DETAIL(orderId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Accepter une commande
  acceptOrder: async (orderId, estimatedPreparationTime) => {
    try {
      const response = await api.put(API_ENDPOINTS.ORDERS.ACCEPT(orderId), {
        estimated_preparation_time: estimatedPreparationTime,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Refuser une commande
  refuseOrder: async (orderId, reason, rejectionType) => {
    try {
      const response = await api.put(API_ENDPOINTS.ORDERS.REJECT(orderId), {
        reason,
        rejection_type: rejectionType,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Démarrer la préparation
  startPreparation: async (orderId) => {
    try {
      const response = await api.put(API_ENDPOINTS.ORDERS.PREPARING(orderId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Marquer comme prêt
  markReady: async (orderId) => {
    try {
      const response = await api.put(API_ENDPOINTS.ORDERS.READY(orderId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Suivre une commande
  trackOrder: async (orderId) => {
    try {
      const response = await api.get(API_ENDPOINTS.ORDERS.TRACK(orderId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // ═══════════════════════════════════════════════════════════
  // CHAT CLIENT ↔ RESTAURANT
  // ═══════════════════════════════════════════════════════════

  // Récupérer les messages d'une commande
  getOrderMessages: async (orderId) => {
    try {
      const response = await api.get(`/orders/${orderId}/messages`);
      return response;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Envoyer un message
  sendOrderMessage: async (orderId, message) => {
    try {
      const response = await api.post(`/orders/${orderId}/messages`, { message });
      return response;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Marquer les messages comme lus
  markMessagesRead: async (orderId) => {
    try {
      const response = await api.put(`/orders/${orderId}/messages/read`);
      return response;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

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
      // Utiliser le chemin complet avec /api/v1 car baseURL l'enlève
      // validateStatus permet d'accepter les codes 200-399 (y compris 304 Not Modified)
      const response = await api.get(`/api/v1/orders/${orderId}/messages`, {
        validateStatus: (status) => status >= 200 && status < 400,
      });
      
      // Pour un 304 (Not Modified), response.data peut être vide/undefined
      // Dans ce cas, on retourne un objet avec success: true pour éviter les erreurs
      if (response.status === 304) {
        // Code 304 signifie que les données n'ont pas changé
        // On retourne un objet vide avec success pour indiquer que tout va bien
        return { success: true, data: { messages: [], unread_count: 0 } };
      }
      
      // Pour les autres codes (200, etc.), retourner les données normalement
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Envoyer un message
  sendOrderMessage: async (orderId, message) => {
    try {
      // Utiliser le chemin complet avec /api/v1 car baseURL l'enlève
      const response = await api.post(`/api/v1/orders/${orderId}/messages`, { message });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Marquer les messages comme lus
  markMessagesRead: async (orderId) => {
    try {
      // Utiliser le chemin complet avec /api/v1 car baseURL l'enlève
      const response = await api.put(`/api/v1/orders/${orderId}/messages/read`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

import api from './auth';
import { API_ENDPOINTS } from '../constants/api';

export const restaurantPromotions = {
  // Liste des promotions
  getPromotions: async (filters = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.PROMOTIONS.LIST, { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Créer une promotion
  createPromotion: async (promotionData) => {
    try {
      const response = await api.post(API_ENDPOINTS.PROMOTIONS.CREATE, promotionData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Modifier une promotion
  updatePromotion: async (promotionId, promotionData) => {
    try {
      const response = await api.put(API_ENDPOINTS.PROMOTIONS.UPDATE(promotionId), {
        value: promotionData.value,
        valid_from: promotionData.valid_from,
        valid_until: promotionData.valid_until,
        is_active: promotionData.is_active,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Activer/désactiver une promotion
  togglePromotion: async (promotionId) => {
    try {
      const response = await api.put(API_ENDPOINTS.PROMOTIONS.TOGGLE(promotionId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Supprimer une promotion
  deletePromotion: async (promotionId) => {
    try {
      const response = await api.delete(API_ENDPOINTS.PROMOTIONS.DELETE(promotionId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

import api from './auth';
import { API_ENDPOINTS } from '../constants/api';

export const restaurantReviews = {
  // Liste des avis
  getReviews: async (filters = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.REVIEWS.LIST, { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Répondre à un avis
  respondToReview: async (reviewId, responseText) => {
    try {
      const response = await api.put(API_ENDPOINTS.REVIEWS.RESPOND(reviewId), {
        response: responseText,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

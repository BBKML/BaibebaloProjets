import apiClient from './client';

export const analyticsAPI = {
  // Obtenir les données analytics globales
  getAnalytics: async (params = {}) => {
    try {
      const response = await apiClient.get('/admin/analytics/overview', { params });
      return response.data;
    } catch (error) {
      console.error('Erreur getAnalytics:', error);
      throw error;
    }
  },

  // Obtenir le rapport des ventes
  getSalesReport: async (params = {}) => {
    try {
      const response = await apiClient.get('/admin/analytics/sales', { params });
      return response.data;
    } catch (error) {
      if (error.response?.status === 501) {
        console.warn('⚠️ Endpoint /admin/analytics/sales non implémenté');
        return { success: true, data: null };
      }
      console.error('Erreur getSalesReport:', error);
      throw error;
    }
  },

  // Obtenir le rapport des utilisateurs
  getUsersReport: async (params = {}) => {
    try {
      const response = await apiClient.get('/admin/analytics/users', { params });
      return response.data;
    } catch (error) {
      if (error.response?.status === 501) {
        console.warn('⚠️ Endpoint /admin/analytics/users non implémenté');
        return { success: true, data: null };
      }
      console.error('Erreur getUsersReport:', error);
      throw error;
    }
  },

  // Obtenir le rapport des restaurants
  getRestaurantsReport: async (params = {}) => {
    try {
      const response = await apiClient.get('/admin/analytics/restaurants', { params });
      return response.data;
    } catch (error) {
      if (error.response?.status === 501) {
        console.warn('⚠️ Endpoint /admin/analytics/restaurants non implémenté');
        return { success: true, data: null };
      }
      console.error('Erreur getRestaurantsReport:', error);
      throw error;
    }
  },

  // Obtenir le rapport des livraisons
  getDeliveriesReport: async (params = {}) => {
    try {
      const response = await apiClient.get('/admin/analytics/deliveries', { params });
      return response.data;
    } catch (error) {
      if (error.response?.status === 501) {
        console.warn('⚠️ Endpoint /admin/analytics/deliveries non implémenté');
        return { success: true, data: null };
      }
      console.error('Erreur getDeliveriesReport:', error);
      throw error;
    }
  },

  // Obtenir les revenus analytics
  getRevenue: async (params = {}) => {
    try {
      const response = await apiClient.get('/admin/analytics/revenue', { params });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404 || error.response?.status === 501) {
        console.warn('⚠️ Endpoint /admin/analytics/revenue non disponible');
        return { success: true, data: { chartData: [] } };
      }
      console.error('Erreur getRevenue:', error);
      throw error;
    }
  },
};

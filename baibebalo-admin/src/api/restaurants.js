import apiClient from './client';

export const restaurantsAPI = {
  // Obtenir tous les restaurants
  getRestaurants: async (params = {}) => {
    const response = await apiClient.get('/admin/restaurants', { params });
    return response.data;
  },

  // Obtenir les détails d'un restaurant
  getRestaurantDetails: async (id) => {
    const response = await apiClient.get(`/admin/restaurants/${id}`);
    return response.data;
  },

  // Appliquer la commission (admin)
  updateRestaurantCommission: async (id, commission_rate) => {
    const response = await apiClient.put(`/admin/restaurants/${id}/commission`, { commission_rate });
    return response.data;
  },

  // Valider un restaurant
  validateRestaurant: async (id, data) => {
    const response = await apiClient.put(`/admin/restaurants/${id}/approve`, data);
    return response.data;
  },

  // Suspendre un restaurant
  suspendRestaurant: async (id, reason) => {
    const response = await apiClient.put(`/admin/restaurants/${id}/suspend`, { reason });
    return response.data;
  },

  // Rejeter un restaurant
  rejectRestaurant: async (id, reason) => {
    const response = await apiClient.put(`/admin/restaurants/${id}/reject`, { reason });
    return response.data;
  },

  // Obtenir les restaurants suspendus
  getSuspendedRestaurants: async (params = {}) => {
    const response = await apiClient.get('/admin/restaurants/suspended', { params });
    return response.data;
  },

  // Réactiver un restaurant
  reactivateRestaurant: async (id) => {
    const response = await apiClient.put(`/admin/restaurants/${id}/reactivate`);
    return response.data;
  },

  // Obtenir les statistiques détaillées d'un restaurant
  getRestaurantStatistics: async (id, params = {}) => {
    const response = await apiClient.get(`/admin/restaurants/${id}/statistics`, { params });
    return response.data;
  },

  // Supprimer un restaurant
  deleteRestaurant: async (id) => {
    const response = await apiClient.delete(`/admin/restaurants/${id}`);
    return response.data;
  },

  // Demander des corrections à un restaurant
  requestCorrections: async (id, message) => {
    const response = await apiClient.post(`/admin/restaurants/${id}/request-corrections`, { message });
    return response.data;
  },

  // Obtenir le menu d'un restaurant
  getRestaurantMenu: async (id) => {
    const response = await apiClient.get(`/admin/restaurants/${id}/menu`);
    return response.data;
  },
};

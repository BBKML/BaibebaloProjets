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
};

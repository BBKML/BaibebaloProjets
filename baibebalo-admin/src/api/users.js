import apiClient from './client';

export const usersAPI = {
  // Obtenir tous les utilisateurs
  getUsers: async (params = {}) => {
    const response = await apiClient.get('/admin/users', { params });
    return response.data;
  },

  // Obtenir les détails d'un utilisateur
  getUserDetails: async (id) => {
    const response = await apiClient.get(`/admin/users/${id}`);
    return response.data;
  },

  // Suspendre un utilisateur
  suspendUser: async (id, reason) => {
    const response = await apiClient.put(`/admin/users/${id}/suspend`, { reason });
    return response.data;
  },

  // Activer un utilisateur
  activateUser: async (id) => {
    const response = await apiClient.put(`/admin/users/${id}/activate`);
    return response.data;
  },

  // Actions en masse sur les utilisateurs
  bulkActionUsers: async (userIds, action, reason) => {
    const response = await apiClient.post('/admin/users/bulk-action', {
      user_ids: userIds,
      action,
      reason,
    });
    return response.data;
  },
};

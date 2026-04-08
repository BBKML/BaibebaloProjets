import apiClient from './client';

export const promosAPI = {
  getPromotions: async (params = {}) => {
    const response = await apiClient.get('/admin/promotions', { params });
    return response.data;
  },

  createPromotion: async (data) => {
    const response = await apiClient.post('/admin/promotions', data);
    return response.data;
  },

  togglePromotion: async (id) => {
    const response = await apiClient.put(`/admin/promotions/${id}/toggle`);
    return response.data;
  },
};

import apiClient from './client';

export const refundsAPI = {
  // Obtenir tous les remboursements
  getRefunds: async (params = {}) => {
    const response = await apiClient.get('/admin/refunds', { params });
    return response.data;
  },

  // Approuver un remboursement
  approveRefund: async (id) => {
    const response = await apiClient.put(`/admin/refunds/${id}/approve`);
    return response.data;
  },

  // Rejeter un remboursement
  rejectRefund: async (id, reason) => {
    const response = await apiClient.put(`/admin/refunds/${id}/reject`, { reason });
    return response.data;
  },
};

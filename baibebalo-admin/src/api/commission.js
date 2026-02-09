import apiClient from './client';

export const commissionAPI = {
  // Obtenir les paramètres de commission
  getCommissionSettings: async () => {
    const response = await apiClient.get('/admin/finances/commission-settings');
    return response.data;
  },

  // Mettre à jour les paramètres de commission
  updateCommissionSettings: async (settings) => {
    const response = await apiClient.put('/admin/finances/commission-settings', { settings });
    return response.data;
  },
};

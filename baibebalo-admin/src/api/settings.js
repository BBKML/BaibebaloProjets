import apiClient from './client';

export const settingsAPI = {
  /**
   * Récupérer tous les paramètres de l'application
   */
  getSettings: async () => {
    const response = await apiClient.get('/admin/settings');
    return response.data;
  },

  /**
   * Mettre à jour les paramètres de l'application
   */
  updateSettings: async (settings) => {
    const response = await apiClient.put('/admin/settings', { settings });
    return response.data;
  },

  /**
   * Récupérer les paramètres publics (pour référence)
   */
  getPublicSettings: async () => {
    const response = await apiClient.get('/public/settings');
    return response.data;
  },
};

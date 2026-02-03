import apiClient from './client';

export const financesAPI = {
  // Obtenir l'aperçu financier
  getFinancialOverview: async () => {
    const response = await apiClient.get('/admin/finances/overview');
    return response.data;
  },

  // Obtenir les paiements en attente (livreurs)
  getPendingDeliveryPayments: async (params = {}) => {
    try {
      const response = await apiClient.get('/admin/finances/payments/delivery', { params });
      return response.data;
    } catch (error) {
      // Si l'endpoint n'existe pas encore (404), retourner des données par défaut
      if (error.response?.status === 404) {
        if (import.meta.env.DEV) {
          console.warn('⚠️ Endpoint /admin/finances/payments/delivery non disponible, utilisation de données par défaut');
        }
        return {
          data: {
            payments: [],
            pagination: {
              page: params.page || 1,
              limit: params.limit || 20,
              total: 0,
              totalPages: 0,
            },
          },
        };
      }
      throw error;
    }
  },

  // Obtenir les paiements en attente (restaurants)
  getPendingRestaurantPayments: async (params = {}) => {
    try {
      const response = await apiClient.get('/admin/finances/payments/restaurants', { params });
      return response.data;
    } catch (error) {
      // Si l'endpoint n'existe pas encore (404), retourner des données par défaut
      if (error.response?.status === 404) {
        if (import.meta.env.DEV) {
          console.warn('⚠️ Endpoint /admin/finances/payments/restaurants non disponible, utilisation de données par défaut');
        }
        return {
          data: {
            payments: [],
            pagination: {
              page: params.page || 1,
              limit: params.limit || 20,
              total: 0,
              totalPages: 0,
            },
          },
        };
      }
      throw error;
    }
  },

  // Valider un paiement
  approvePayment: async (id, type) => {
    const response = await apiClient.post(`/admin/finances/payments/${id}/approve`, { type });
    return response.data;
  },

  // Obtenir les dépenses
  getExpenses: async (period = 'month') => {
    const response = await apiClient.get('/admin/finances/expenses', {
      params: { period },
    });
    return response.data;
  },

  // Remises espèces (livreurs remettent l'argent à l'agence ou dépôt sur compte)
  getCashRemittances: async (params = {}) => {
    const response = await apiClient.get('/admin/finances/cash-remittances', { params });
    return response.data;
  },
  confirmCashRemittance: async (id, notes) => {
    const response = await apiClient.put(`/admin/finances/cash-remittances/${id}/confirm`, { notes });
    return response.data;
  },
  rejectCashRemittance: async (id, reason) => {
    const response = await apiClient.put(`/admin/finances/cash-remittances/${id}/reject`, { reason });
    return response.data;
  },
};

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

  // Liste des livreurs avec gains (vue paiement lundi)
  getDeliveryPaymentSummary: async () => {
    const response = await apiClient.get('/admin/finances/delivery-payment-summary');
    return response.data;
  },

  // Solde espèces dû par chaque livreur (ce qu'ils doivent reverser)
  getDeliveryCashOwed: async () => {
    const response = await apiClient.get('/admin/finances/delivery-cash-owed');
    return response.data;
  },

  // Remises espèces (livreurs remettent l'argent à l'agence ou dépôt sur compte)
  getCashRemittances: async (params = {}) => {
    const response = await apiClient.get('/admin/finances/cash-remittances', { params });
    return response.data;
  },
  confirmCashRemittance: async (id, notes, verified_amount) => {
    const response = await apiClient.put(`/admin/finances/cash-remittances/${id}/confirm`, {
      notes: notes || undefined,
      verified_amount: verified_amount ?? undefined,
    });
    return response.data;
  },
  rejectCashRemittance: async (id, reason) => {
    const response = await apiClient.put(`/admin/finances/cash-remittances/${id}/reject`, { reason });
    return response.data;
  },

  // Payouts (demandes de retrait)
  getPayoutRequests: async (params = {}) => {
    const response = await apiClient.get('/admin/finances/payouts', { params });
    return response.data;
  },
  processPayout: async (id) => {
    const response = await apiClient.put(`/admin/finances/payouts/${id}/process`);
    return response.data;
  },
  markPayoutAsPaid: async (id, proof) => {
    const response = await apiClient.put(`/admin/finances/payouts/${id}/mark-paid`, proof);
    return response.data;
  },
  refreshDeliveryBalance: async (id) => {
    const response = await apiClient.put(`/admin/finances/delivery/${id}/refresh-balance`);
    return response.data;
  },
  refreshAllDeliveryBalances: async () => {
    const response = await apiClient.post('/admin/finances/delivery/refresh-all-balances');
    return response.data;
  },
  refreshRestaurantBalance: async (id) => {
    const response = await apiClient.put(`/admin/finances/restaurant/${id}/refresh-balance`);
    return response.data;
  },
  rejectPayout: async (id, reason) => {
    const response = await apiClient.put(`/admin/finances/payouts/${id}/reject`, { reason });
    return response.data;
  },
  generatePayouts: async (userType) => {
    const response = await apiClient.post('/admin/finances/generate-payouts', { user_type: userType });
    return response.data;
  },
};

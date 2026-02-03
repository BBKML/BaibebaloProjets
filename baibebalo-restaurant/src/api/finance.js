import api from './auth';
import { API_ENDPOINTS } from '../constants/api';

export const restaurantFinance = {
  // Dashboard financier (utilise earnings avec période)
  getFinancialDashboard: async (period = 'month') => {
    try {
      const response = await api.get(API_ENDPOINTS.FINANCE.DASHBOARD, {
        params: { period },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Historique des transactions (utilise earnings avec filtres de date)
  getTransactions: async (filters = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.FINANCE.TRANSACTIONS, {
        params: {
          start_date: filters.start_date,
          end_date: filters.end_date,
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Demande de retrait
  requestWithdrawal: async (amount) => {
    try {
      const response = await api.post(API_ENDPOINTS.FINANCE.WITHDRAWAL, { amount });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Historique des retraits
  getPayoutHistory: async (filters = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.FINANCE.PAYOUT_HISTORY, {
        params: filters,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

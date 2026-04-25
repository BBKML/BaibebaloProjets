import api from './auth';
import { API_ENDPOINTS } from '../constants/api';

export const restaurantFinance = {
  // Dashboard financier (utilise earnings avec plage de dates basée sur la période)
  getFinancialDashboard: async (period = 'month') => {
    try {
      const now = new Date();
      let start_date, end_date;
      if (period === 'month') {
        start_date = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        end_date = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      } else if (period === 'week') {
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diff);
        monday.setHours(0, 0, 0, 0);
        start_date = monday.toISOString();
        end_date = now.toISOString();
      } else {
        start_date = new Date(now.getFullYear(), 0, 1).toISOString();
        end_date = now.toISOString();
      }
      const response = await api.get(API_ENDPOINTS.FINANCE.DASHBOARD, {
        params: { start_date, end_date },
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

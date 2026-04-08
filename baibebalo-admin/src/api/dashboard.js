import apiClient from './client';

export const dashboardAPI = {
  // Obtenir les données du dashboard
  getDashboard: async () => {
    const response = await apiClient.get('/admin/dashboard');
    return response.data;
  },

  // Obtenir les commandes récentes
  getRecentOrders: async (params = {}) => {
    const response = await apiClient.get('/admin/orders', { params: { limit: 10, ...params } });
    return response.data;
  },

  // Obtenir les données de revenus pour les graphiques
  getRevenueData: async (period = 'monthly') => {
    try {
      const response = await apiClient.get('/admin/analytics/revenue', { params: { period } });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return { data: { chartData: [] } };
      }
      throw error;
    }
  },

  getAnalytics: async (params = {}) => {
    try {
      const response = await apiClient.get('/admin/analytics/overview', { params });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          data: {
            total_gmv: 0, total_orders: 0, active_users: 0, conversion_rate: 0,
            orders_change: 0, users_change: 0, conversion_change: 0,
            revenue_data: [], order_data: [], payment_methods: [],
          },
        };
      }
      throw error;
    }
  },

  // Obtenir les commandes en temps réel
  getRealTimeOrders: async (params = {}) => {
    const response = await apiClient.get('/admin/dashboard/realtime-orders', { params });
    return response.data;
  },

  getGeographicData: async () => {
    const response = await apiClient.get('/admin/dashboard/geographic');
    return response.data;
  },

  getSystemAlerts: async () => {
    const response = await apiClient.get('/admin/dashboard/alerts');
    return response.data;
  },

  dismissAlert: async (alertId, alertType) => {
    const response = await apiClient.post('/admin/dashboard/alerts/dismiss', {
      alert_id: alertId,
      alert_type: alertType,
    });
    return response.data;
  },

  getDismissedAlerts: async (params = {}) => {
    const response = await apiClient.get('/admin/dashboard/alerts/dismissed', { params });
    return response.data;
  },

  restoreAlert: async (alertId) => {
    const response = await apiClient.delete(`/admin/dashboard/alerts/dismissed/${alertId}`);
    return response.data;
  },
};

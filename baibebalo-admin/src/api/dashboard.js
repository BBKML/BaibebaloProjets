import apiClient from './client';

export const dashboardAPI = {
  // Obtenir les données du dashboard
  getDashboard: async () => {
    try {
      console.log('🔍 Appel API: GET /admin/dashboard');
      const token = localStorage.getItem('accessToken');
      console.log('🔑 Token présent:', !!token);
      
      const response = await apiClient.get('/admin/dashboard');
      console.log('✅ Réponse reçue:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur getDashboard:', error);
      console.error('📊 Détails erreur:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method,
        }
      });
      throw error;
    }
  },

  // Obtenir les commandes récentes
  getRecentOrders: async (params = {}) => {
    try {
      const response = await apiClient.get('/admin/orders', { 
        params: {
          limit: 10,
          ...params
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur getRecentOrders:', error);
      throw error;
    }
  },

  // Obtenir les données de revenus pour les graphiques
  getRevenueData: async (period = 'monthly') => {
    try {
      const response = await apiClient.get('/admin/analytics/revenue', {
        params: { period }
      });
      return response.data;
    } catch (error) {
      // Si l'endpoint n'existe pas encore (404), retourner des données par défaut
      if (error.response?.status === 404) {
        // Ne pas afficher le warning en production pour réduire le bruit dans la console
        if (import.meta.env.DEV) {
          console.warn('⚠️ Endpoint /admin/analytics/revenue non disponible, utilisation de données par défaut');
        }
        // Retourner un tableau vide si l'endpoint n'existe pas
        return {
          data: {
            chartData: []
          }
        };
      }
      console.error('Erreur getRevenueData:', error);
      throw error;
    }
  },

  // Obtenir les données analytics globales
  getAnalytics: async (params = {}) => {
    try {
      const response = await apiClient.get('/admin/analytics/overview', { params });
      return response.data;
    } catch (error) {
      // Si l'endpoint n'existe pas encore (404), retourner des données par défaut
      if (error.response?.status === 404) {
        // Ne pas afficher le warning en production pour réduire le bruit dans la console
        if (import.meta.env.DEV) {
          console.warn('⚠️ Endpoint /admin/analytics non disponible, utilisation de données par défaut');
        }
        // Retourner des données vides si l'endpoint n'existe pas
        return {
          data: {
            total_gmv: 0,
            total_orders: 0,
            active_users: 0,
            conversion_rate: 0,
            orders_change: 0,
            users_change: 0,
            conversion_change: 0,
            revenue_data: [],
            order_data: [],
            payment_methods: [],
          }
        };
      }
      console.error('Erreur getAnalytics:', error);
      throw error;
    }
  },

  // Obtenir les commandes en temps réel
  getRealTimeOrders: async (params = {}) => {
    try {
      const response = await apiClient.get('/admin/dashboard/realtime-orders', { params });
      return response.data;
    } catch (error) {
      console.error('Erreur getRealTimeOrders:', error);
      throw error;
    }
  },

  // Obtenir les données géographiques
  getGeographicData: async () => {
    try {
      const response = await apiClient.get('/admin/dashboard/geographic');
      return response.data;
    } catch (error) {
      console.error('Erreur getGeographicData:', error);
      throw error;
    }
  },

  // Obtenir les alertes système
  getSystemAlerts: async () => {
    try {
      const response = await apiClient.get('/admin/dashboard/alerts');
      return response.data;
    } catch (error) {
      console.error('Erreur getSystemAlerts:', error);
      throw error;
    }
  },

  // Masquer une alerte
  dismissAlert: async (alertId, alertType) => {
    try {
      const response = await apiClient.post('/admin/dashboard/alerts/dismiss', {
        alert_id: alertId,
        alert_type: alertType,
      });
      return response.data;
    } catch (error) {
      console.error('Erreur dismissAlert:', error);
      throw error;
    }
  },

  // Obtenir l'historique des alertes masquées
  getDismissedAlerts: async (params = {}) => {
    try {
      const response = await apiClient.get('/admin/dashboard/alerts/dismissed', { params });
      return response.data;
    } catch (error) {
      console.error('Erreur getDismissedAlerts:', error);
      throw error;
    }
  },

  // Restaurer une alerte masquée
  restoreAlert: async (alertId) => {
    try {
      const response = await apiClient.delete(`/admin/dashboard/alerts/dismissed/${alertId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur restoreAlert:', error);
      throw error;
    }
  },
};

import apiClient from './client';

export const supportAPI = {
  // Obtenir tous les tickets
  getTickets: async (params = {}) => {
    try {
      const response = await apiClient.get('/admin/support/tickets', { params });
      return response.data;
    } catch (error) {
      // Si l'endpoint n'existe pas encore (404/501), retourner des données par défaut
      if (error.response?.status === 404 || error.response?.status === 501) {
        if (import.meta.env.DEV) {
          console.warn('⚠️ Endpoint /admin/support/tickets non disponible, utilisation de données par défaut');
        }
        return {
          data: {
            tickets: [],
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

  // Obtenir les détails d'un ticket
  getTicketDetails: async (id) => {
    const response = await apiClient.get(`/admin/support/tickets/${id}`);
    return response.data;
  },

  // Répondre à un ticket
  replyToTicket: async (id, message) => {
    const response = await apiClient.post(`/admin/support/tickets/${id}/reply`, { message });
    return response.data;
  },

  // Fermer un ticket
  closeTicket: async (id, resolution = null) => {
    const response = await apiClient.put(`/admin/support/tickets/${id}/close`, { resolution });
    return response.data;
  },

  // Créer un ticket de support
  createTicket: async (ticketData) => {
    const response = await apiClient.post('/admin/support/tickets', ticketData);
    return response.data;
  },
};

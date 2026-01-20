import apiClient from './client';
import { API_CONFIG } from '../constants/api';

/**
 * Récupérer la liste des tickets de support
 */
export const getSupportTickets = async (params = {}) => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.USERS.SUPPORT_TICKETS, {
    params,
  });
  return response.data;
};

/**
 * Créer un ticket de support
 */
export const createSupportTicket = async (ticketData) => {
  const response = await apiClient.post(
    API_CONFIG.ENDPOINTS.USERS.SUPPORT_TICKETS,
    ticketData
  );
  return response.data;
};

/**
 * Récupérer les détails d'un ticket
 */
export const getSupportTicketById = async (ticketId) => {
  const response = await apiClient.get(
    API_CONFIG.ENDPOINTS.USERS.SUPPORT_TICKET(ticketId)
  );
  return response.data;
};

/**
 * Ajouter un message à un ticket
 */
export const addTicketMessage = async (ticketId, message) => {
  const response = await apiClient.post(
    API_CONFIG.ENDPOINTS.USERS.SUPPORT_TICKET_MESSAGES(ticketId),
    { message }
  );
  return response.data;
};

/**
 * Fermer un ticket
 */
export const closeSupportTicket = async (ticketId) => {
  const response = await apiClient.put(
    API_CONFIG.ENDPOINTS.USERS.SUPPORT_TICKET_CLOSE(ticketId)
  );
  return response.data;
};

/**
 * Exporter les données utilisateur (RGPD)
 */
export const exportUserData = async (format = 'json') => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.USERS.EXPORT_DATA, {
    params: { format },
  });
  return response.data;
};

/**
 * Supprimer le compte utilisateur (RGPD)
 */
export const deleteUserAccount = async (password, confirm) => {
  const response = await apiClient.delete(API_CONFIG.ENDPOINTS.USERS.DELETE_ACCOUNT, {
    data: {
      password,
      confirm,
    },
  });
  return response.data;
};

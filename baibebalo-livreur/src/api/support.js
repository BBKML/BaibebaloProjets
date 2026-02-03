import apiClient from './client';
import { API_ENDPOINTS } from '../constants/api';

// === Tickets de support ===
export const createTicket = async (data) => {
  const response = await apiClient.post(API_ENDPOINTS.SUPPORT.CREATE_TICKET, data);
  return response.data;
};

export const getTickets = async (status = 'all') => {
  const response = await apiClient.get(API_ENDPOINTS.SUPPORT.LIST_TICKETS, {
    params: { status },
  });
  return response.data;
};

export const getTicketDetails = async (ticketId) => {
  const response = await apiClient.get(API_ENDPOINTS.SUPPORT.TICKET_DETAILS(ticketId));
  return response.data;
};

export const sendMessage = async (ticketId, message) => {
  const response = await apiClient.post(API_ENDPOINTS.SUPPORT.SEND_MESSAGE(ticketId), { message });
  return response.data;
};

// === Urgence ===
export const reportEmergency = async (emergencyData) => {
  const response = await apiClient.post(API_ENDPOINTS.SUPPORT.EMERGENCY, emergencyData);
  return response.data;
};

// === Rapport d'incident ===
export const reportIncident = async (incidentData) => {
  const response = await apiClient.post(API_ENDPOINTS.SUPPORT.REPORT_INCIDENT, incidentData);
  return response.data;
};

export default {
  createTicket,
  getTickets,
  getTicketDetails,
  sendMessage,
  reportEmergency,
  reportIncident,
};

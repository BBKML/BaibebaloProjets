import apiClient from './client';
import { API_ENDPOINTS } from '../constants/api';

/**
 * Récupère le dashboard des gains
 * Retourne: available_balance, total_earnings, total_deliveries, today, this_week, this_month
 * @param {AbortSignal} [options.signal] - pour annuler la requête (ex. au démontage)
 */
export const getEarnings = async (period = null, startDate = null, endDate = null, options = {}) => {
  const response = await apiClient.get(API_ENDPOINTS.EARNINGS.DASHBOARD, {
    params: {
      ...(period && { period }),
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate }),
    },
    ...(options.signal && { signal: options.signal }),
  });
  return response.data;
};

/**
 * Récupère l'historique des livraisons (utilisé pour les détails des gains)
 */
export const getDeliveryHistory = async (page = 1, limit = 20, status = 'delivered') => {
  const response = await apiClient.get(API_ENDPOINTS.EARNINGS.HISTORY, {
    params: { page, limit, status },
  });
  return response.data;
};

/**
 * Demande un retrait (minimum 5000 FCFA)
 */
export const requestPayout = async (amount) => {
  const response = await apiClient.post(API_ENDPOINTS.EARNINGS.PAYOUT_REQUEST, {
    amount,
  });
  return response.data;
};

/**
 * Récupère l'historique des retraits
 */
export const getPayoutHistory = async (page = 1, limit = 20) => {
  const response = await apiClient.get(API_ENDPOINTS.EARNINGS.PAYOUT_HISTORY, {
    params: { page, limit },
  });
  return response.data;
};

/**
 * Commandes espèces livrées dont la remise n'a pas encore été validée
 */
export const getOrdersPendingCashRemittance = async () => {
  const response = await apiClient.get(API_ENDPOINTS.EARNINGS.CASH_REMITTANCE_ORDERS_PENDING);
  return response.data;
};

/**
 * Déclarer une remise espèces (remise à l'agence ou dépôt sur compte entreprise)
 */
export const createCashRemittance = async (payload) => {
  const response = await apiClient.post(API_ENDPOINTS.EARNINGS.CASH_REMITTANCES, payload);
  return response.data;
};

/**
 * Liste des remises espèces du livreur
 */
export const getMyCashRemittances = async (page = 1, limit = 20, status) => {
  const response = await apiClient.get(API_ENDPOINTS.EARNINGS.CASH_REMITTANCES, {
    params: { page, limit, ...(status && { status }) },
  });
  return response.data;
};

export default {
  getEarnings,
  getDeliveryHistory,
  requestPayout,
  getPayoutHistory,
  getOrdersPendingCashRemittance,
  createCashRemittance,
  getMyCashRemittances,
};

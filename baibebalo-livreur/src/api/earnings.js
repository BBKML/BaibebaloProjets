import apiClient from './client';
import { API_ENDPOINTS } from '../constants/api';

/**
 * Dashboard en 1 appel : gains + commandes actives + historique récent (évite 3 requêtes)
 * @param {{ signal?: AbortSignal }} [options]
 */
export const getDashboard = async (options = {}) => {
  const response = await apiClient.get(API_ENDPOINTS.DELIVERY.DASHBOARD, {
    ...(options.signal && { signal: options.signal }),
  });
  return response.data;
};

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
 * Demande un retrait avant le lundi (minimum 5000 FCFA).
 * Le paiement automatique chaque lundi est à partir de 1000 FCFA.
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
 * Obtenir les informations de remise espèces (numéro Baibebalo, etc.)
 */
export const getCashRemittanceInfo = async () => {
  const response = await apiClient.get(`${API_ENDPOINTS.EARNINGS.CASH_REMITTANCES}/info`);
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
  getDashboard,
  getEarnings,
  getDeliveryHistory,
  requestPayout,
  getPayoutHistory,
  getOrdersPendingCashRemittance,
  createCashRemittance,
  getMyCashRemittances,
};

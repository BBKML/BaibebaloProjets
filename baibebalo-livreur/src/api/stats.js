import apiClient from './client';
import { API_ENDPOINTS } from '../constants/api';

/**
 * Récupère les statistiques du livreur
 * @param {string} period - 'today', 'week', 'month', 'year'
 */
export const getStatistics = async (period = 'week') => {
  const response = await apiClient.get(API_ENDPOINTS.STATS.DASHBOARD, {
    params: { period },
  });
  return response.data;
};

/**
 * Récupère les avis/notes des clients
 */
export const getReviews = async (page = 1, limit = 20) => {
  const response = await apiClient.get(API_ENDPOINTS.STATS.REVIEWS, {
    params: { page, limit },
  });
  return response.data;
};

/**
 * Récupère le profil complet du livreur (pour les stats)
 */
export const getDeliveryProfile = async () => {
  const response = await apiClient.get('/delivery/me');
  return response.data;
};

/**
 * Récupère les gains pour calculer des stats
 */
export const getEarningsStats = async () => {
  const response = await apiClient.get('/delivery/earnings');
  return response.data;
};

/**
 * Récupère l'historique pour calculer le taux de complétion
 */
export const getDeliveryHistoryForStats = async (limit = 100) => {
  const response = await apiClient.get('/delivery/history', {
    params: { page: 1, limit },
  });
  return response.data;
};

/**
 * Récupère le classement des livreurs (leaderboard) depuis la base
 * @param {string} period - 'week' | 'month'
 */
export const getRankings = async (period = 'week', limit = 20) => {
  const response = await apiClient.get(API_ENDPOINTS.STATS.RANKINGS, {
    params: { period, limit },
  });
  return response.data;
};

export default {
  getStatistics,
  getReviews,
  getRankings,
  getDeliveryProfile,
  getEarningsStats,
  getDeliveryHistoryForStats,
};

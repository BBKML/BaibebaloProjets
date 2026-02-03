import apiClient from './client';
import { API_CONFIG } from '../constants/api';

/**
 * Recherche globale (restaurants + plats)
 */
export const searchCatalog = async (params = {}) => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.SEARCH, { params });
  return response.data;
};

import apiClient from './client';
import { API_CONFIG } from '../constants/api';

/**
 * Récupérer la liste des restaurants
 */
export const getRestaurants = async (params = {}) => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.RESTAURANTS.LIST, {
    params,
  });
  return response.data;
};

/**
 * Récupérer les détails d'un restaurant
 */
export const getRestaurantDetail = async (restaurantId) => {
  const response = await apiClient.get(
    API_CONFIG.ENDPOINTS.RESTAURANTS.DETAIL(restaurantId)
  );
  return response.data;
};

/**
 * Récupérer le menu d'un restaurant
 */
export const getRestaurantMenu = async (restaurantId) => {
  const response = await apiClient.get(
    API_CONFIG.ENDPOINTS.RESTAURANTS.MENU(restaurantId)
  );
  return response.data;
};

/**
 * Récupérer les avis d'un restaurant
 */
export const getRestaurantReviews = async (restaurantId, params = {}) => {
  const response = await apiClient.get(
    API_CONFIG.ENDPOINTS.RESTAURANTS.REVIEWS(restaurantId),
    { params }
  );
  return response.data;
};

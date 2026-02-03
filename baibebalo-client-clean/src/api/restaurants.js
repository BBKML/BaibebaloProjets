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
 * Récupérer des suggestions intelligentes de plats complémentaires
 * @param {string} restaurantId - ID du restaurant
 * @param {string[]} cartItemIds - IDs des items dans le panier
 * @param {number} limit - Nombre max de suggestions (défaut: 5)
 */
export const getSuggestedItems = async (restaurantId, cartItemIds = [], limit = 5) => {
  const response = await apiClient.get(`/restaurants/${restaurantId}/suggestions`, {
    params: {
      cart_item_ids: cartItemIds.join(','),
      limit,
    },
  });
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

/**
 * Récupérer les promotions actives
 */
export const getActivePromotions = async () => {
  const response = await apiClient.get('/restaurants/promotions/active');
  return response.data;
};

/**
 * Récupérer les catégories de restaurants
 */
export const getCategories = async () => {
  const response = await apiClient.get('/restaurants/categories');
  return response.data;
};

/**
 * Récupérer les recherches populaires
 */
export const getPopularSearches = async (limit = 5) => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.RESTAURANTS.POPULAR_SEARCHES, {
    params: { limit },
  });
  return response.data;
};

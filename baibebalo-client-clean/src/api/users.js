import apiClient from './client';
import { API_CONFIG } from '../constants/api';

/**
 * Récupérer le profil de l'utilisateur
 */
export const getMyProfile = async () => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.USERS.ME);
  return response.data;
};

/**
 * Mettre à jour le profil
 */
export const updateMyProfile = async (profileData) => {
  const response = await apiClient.put(
    API_CONFIG.ENDPOINTS.USERS.UPDATE_ME,
    profileData
  );
  return response.data;
};

/**
 * Récupérer les adresses
 */
export const getAddresses = async () => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.USERS.ADDRESSES);
  return response.data;
};

/**
 * Ajouter une adresse
 */
export const addAddress = async (addressData) => {
  const response = await apiClient.post(
    API_CONFIG.ENDPOINTS.USERS.ADDRESSES,
    addressData
  );
  return response.data;
};

/**
 * Mettre à jour une adresse
 */
export const updateAddress = async (addressId, addressData) => {
  const response = await apiClient.put(
    `${API_CONFIG.ENDPOINTS.USERS.ADDRESSES}/${addressId}`,
    addressData
  );
  return response.data;
};

/**
 * Supprimer une adresse
 */
export const deleteAddress = async (addressId) => {
  const response = await apiClient.delete(
    `${API_CONFIG.ENDPOINTS.USERS.ADDRESSES}/${addressId}`
  );
  return response.data;
};

/**
 * Récupérer les favoris
 */
export const getFavorites = async () => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.USERS.FAVORITES);
  return response.data;
};

/**
 * Ajouter un restaurant aux favoris
 */
export const addFavorite = async (restaurantId) => {
  const response = await apiClient.post(
    API_CONFIG.ENDPOINTS.USERS.FAVORITE(restaurantId)
  );
  return response.data;
};

/**
 * Retirer un restaurant des favoris
 */
export const removeFavorite = async (restaurantId) => {
  const response = await apiClient.delete(
    API_CONFIG.ENDPOINTS.USERS.FAVORITE(restaurantId)
  );
  return response.data;
};

/**
 * Récupérer les points de fidélité
 */
export const getLoyaltyPoints = async () => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.USERS.LOYALTY);
  return response.data;
};

/**
 * Récupérer les informations de parrainage
 */
export const getReferrals = async () => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.USERS.REFERRALS);
  return response.data;
};

/**
 * Valider un code promo
 */
export const validatePromoCode = async (code, restaurantId, orderAmount) => {
  const response = await apiClient.post(
    API_CONFIG.ENDPOINTS.USERS.VALIDATE_PROMO,
    {
      code,
      restaurant_id: restaurantId,
      order_amount: orderAmount,
    }
  );
  return response.data;
};
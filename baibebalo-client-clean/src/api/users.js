import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './client';
import { API_CONFIG } from '../constants/api';

const mapAddressFromApi = (address) => {
  if (!address) return address;
  return {
    ...address,
    label: address.label || address.title || '',
    street: address.street || address.address_line || '',
    city: address.city || address.district || '',
    delivery_instructions: address.delivery_instructions || address.landmark || '',
  };
};

const mapAddressToApi = (addressData) => ({
  title: addressData?.label ?? addressData?.title ?? '',
  address_line: addressData?.street ?? addressData?.address_line ?? '',
  district: addressData?.city ?? addressData?.district ?? '',
  landmark: addressData?.delivery_instructions ?? addressData?.landmark ?? '',
  latitude: addressData?.latitude ?? null,
  longitude: addressData?.longitude ?? null,
  is_default: addressData?.is_default ?? false,
});

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
  const normalizeGenderForApi = (gender) => {
    if (!gender) return null;
    const normalized = gender.toLowerCase();
    const map = { m: 'male', f: 'female', o: 'other' };
    return map[normalized] || normalized;
  };

  const normalizeDateForApi = (date) => {
    if (date == null || (typeof date === 'string' && date.trim() === '')) return null;
    const d = typeof date === 'string' ? date.trim() : String(date);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
      const [day, month, year] = d.split('/');
      return `${year}-${month}-${day}`;
    }
    return null;
  };

  const normalizedProfileData = {
    ...profileData,
    gender: normalizeGenderForApi(profileData?.gender),
    date_of_birth: normalizeDateForApi(profileData?.date_of_birth),
  };

  const response = await apiClient.put(
    API_CONFIG.ENDPOINTS.USERS.UPDATE_ME,
    normalizedProfileData
  );
  return response.data;
};

/**
 * Upload photo de profil (FormData).
 * Utilise fetch() pour le multipart (plus fiable qu'axios en React Native).
 */
export const uploadProfilePicture = async (formData) => {
  const token = await AsyncStorage.getItem('accessToken');
  const baseURL = API_CONFIG.BASE_URL.replace(/\/$/, '');
  const url = `${baseURL}${API_CONFIG.ENDPOINTS.USERS.PROFILE_PICTURE}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: formData,
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data?.error?.message || 'Échec de l\'upload');
    err.response = { data, status: response.status };
    throw err;
  }
  return data;
};

/**
 * Récupérer les adresses
 */
export const getAddresses = async () => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.USERS.ADDRESSES);
  const payload = response.data?.data || response.data;
  const addresses = (payload?.addresses || []).map(mapAddressFromApi);
  return {
    ...response.data,
    data: {
      ...(payload || {}),
      addresses,
    },
  };
};

/**
 * Ajouter une adresse
 */
export const addAddress = async (addressData) => {
  const mappedData = mapAddressToApi(addressData);
  const response = await apiClient.post(
    API_CONFIG.ENDPOINTS.USERS.ADDRESSES,
    mappedData
  );
  const payload = response.data?.data || response.data;
  return {
    ...response.data,
    data: {
      ...(payload || {}),
      address: mapAddressFromApi(payload?.address),
    },
  };
};

/**
 * Mettre à jour une adresse
 */
export const updateAddress = async (addressId, addressData) => {
  const response = await apiClient.put(
    `${API_CONFIG.ENDPOINTS.USERS.ADDRESSES}/${addressId}`,
    mapAddressToApi(addressData)
  );
  const payload = response.data?.data || response.data;
  return {
    ...response.data,
    data: {
      ...(payload || {}),
      address: mapAddressFromApi(payload?.address),
    },
  };
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
 * Récupérer l'historique des transactions de fidélité
 */
export const getLoyaltyTransactions = async (params = {}) => {
  const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.USERS.LOYALTY}/transactions`, {
    params,
  });
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

/**
 * Récupérer les préférences de notifications
 */
export const getNotificationPreferences = async () => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.USERS.NOTIFICATION_PREFERENCES);
  return response.data;
};

/**
 * Mettre à jour les préférences de notifications
 */
export const updateNotificationPreferences = async (preferences) => {
  const response = await apiClient.put(
    API_CONFIG.ENDPOINTS.USERS.NOTIFICATION_PREFERENCES,
    preferences
  );
  return response.data;
};
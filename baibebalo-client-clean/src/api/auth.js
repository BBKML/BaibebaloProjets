import apiClient from './client';
import { API_CONFIG } from '../constants/api';

/**
 * Envoyer un code OTP
 */
export const sendOTP = async (phoneNumber) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.SEND_OTP, {
    phone: phoneNumber,
  });
  if (__DEV__ && response.data?.debug_otp) {
    console.log('🔐 CODE OTP (DEV):', response.data.debug_otp);
  }
  return response.data;
};

/**
 * Vérifier le code OTP
 * @param {string} phoneNumber
 * @param {string} code
 * @param {string|null} firstName
 * @param {string|null} lastName
 * @param {string|null} fcmToken - Token FCM/Expo Push pour les notifications (optionnel)
 */
export const verifyOTP = async (phoneNumber, code, firstName = null, lastName = null, fcmToken = null) => {
  const payload = {
    phone: phoneNumber, // Le backend attend 'phone' et non 'phoneNumber'
    code,
  };

  if (firstName) payload.first_name = firstName;
  if (lastName) payload.last_name = lastName;
  if (fcmToken && typeof fcmToken === 'string' && fcmToken.trim()) {
    payload.fcm_token = fcmToken.trim();
  }

  const response = await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.VERIFY_OTP, payload);
  return response.data;
};

/**
 * Rafraîchir le token
 */
export const refreshToken = async (refreshToken) => {
  const response = await apiClient.post(
    API_CONFIG.ENDPOINTS.AUTH.REFRESH_TOKEN,
    { refreshToken }
  );
  return response.data;
};

/**
 * Récupérer le code OTP pour les tests (mode développement uniquement)
 */
export const getTestOTP = async (phoneNumber) => {
  try {
    // Essayer d'appeler un endpoint de test si disponible
    const response = await apiClient.get(`/auth/test-otp/${encodeURIComponent(phoneNumber)}`);
    return response.data;
  } catch (error) {
    if (__DEV__) console.warn('Test OTP non disponible');
    return null;
  }
};
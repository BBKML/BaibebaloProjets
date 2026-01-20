import apiClient from './client';
import { API_CONFIG } from '../constants/api';

/**
 * Envoyer un code OTP
 */
export const sendOTP = async (phoneNumber) => {
  console.log('📡 API sendOTP - Envoi requête:', {
    url: `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.SEND_OTP}`,
    phone: phoneNumber,
  });
  
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.SEND_OTP, {
    phone: phoneNumber, // Le backend attend 'phone' et non 'phoneNumber'
  });
  
  console.log('📡 API sendOTP - Réponse complète:', {
    status: response.status,
    data: response.data,
    headers: response.headers,
  });
  
  return response.data;
};

/**
 * Vérifier le code OTP
 */
export const verifyOTP = async (phoneNumber, code, firstName, lastName) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.VERIFY_OTP, {
    phone: phoneNumber, // Le backend attend 'phone' et non 'phoneNumber'
    code,
    first_name: firstName,
    last_name: lastName,
  });
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
    // Si l'endpoint n'existe pas, retourner null
    console.log('⚠️ Endpoint de test OTP non disponible. Vérifiez les logs du backend.');
    return null;
  }
};
import apiClient from './client';
import { API_ENDPOINTS } from '../constants/api';

// Envoyer OTP
export const sendOTP = async (phone) => {
  const response = await apiClient.post(API_ENDPOINTS.AUTH.SEND_OTP, {
    phone,
    role: 'delivery',
  });
  return response.data;
};

// Vérifier OTP
export const verifyOTP = async (phone, otp) => {
  const response = await apiClient.post(API_ENDPOINTS.AUTH.VERIFY_OTP, {
    phone,
    code: otp,
    role: 'delivery',
  });
  return response.data;
};

// Inscription livreur
export const registerDelivery = async (data) => {
  const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER_DELIVERY, data);
  return response.data;
};

// Inscription avec FormData (pour upload de documents)
export const registerDeliveryWithDocuments = async (formData) => {
  const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER_DELIVERY, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Rafraîchir le token
export const refreshToken = async () => {
  const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH_TOKEN);
  return response.data;
};

// Déconnexion
export const logout = async () => {
  const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  return response.data;
};

export default {
  sendOTP,
  verifyOTP,
  registerDelivery,
  registerDeliveryWithDocuments,
  refreshToken,
  logout,
};

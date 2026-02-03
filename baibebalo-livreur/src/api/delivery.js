import apiClient from './client';
import { API_ENDPOINTS } from '../constants/api';

// === Profil ===
export const getProfile = async () => {
  const response = await apiClient.get(API_ENDPOINTS.DELIVERY.PROFILE);
  return response.data;
};

/**
 * Vérifier le statut du livreur (accessible même si compte en attente)
 * Retourne { status, delivery_person? } - delivery_person présent si status === 'active'
 */
export const getCheckStatus = async () => {
  const response = await apiClient.get(API_ENDPOINTS.DELIVERY.CHECK_STATUS);
  return response.data;
};

export const updateProfile = async (data) => {
  const response = await apiClient.put(API_ENDPOINTS.DELIVERY.UPDATE_PROFILE, data);
  return response.data;
};

export const uploadDocument = async (formData) => {
  const response = await apiClient.post(API_ENDPOINTS.DELIVERY.UPLOAD_DOCUMENT, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// === Statut et Localisation ===
// Corrigé: utilise 'delivery_status' comme attendu par le backend
export const updateDeliveryStatus = async (deliveryStatus) => {
  const response = await apiClient.put(API_ENDPOINTS.DELIVERY.UPDATE_STATUS, { 
    delivery_status: deliveryStatus 
  });
  return response.data;
};

export const updateLocation = async (latitude, longitude) => {
  const response = await apiClient.put(API_ENDPOINTS.DELIVERY.UPDATE_LOCATION, {
    latitude,
    longitude,
  });
  return response.data;
};

export const updateAvailability = async (schedule) => {
  const response = await apiClient.put(API_ENDPOINTS.DELIVERY.UPDATE_AVAILABILITY, { schedule });
  return response.data;
};

export const updateVehicle = async (vehicleData) => {
  const response = await apiClient.put(API_ENDPOINTS.DELIVERY.UPDATE_VEHICLE, vehicleData);
  return response.data;
};

export const updateZones = async (zones) => {
  const response = await apiClient.put(API_ENDPOINTS.DELIVERY.UPDATE_ZONES, { zones });
  return response.data;
};

// === Onboarding / Formation ===
export const getTrainingModules = async () => {
  const response = await apiClient.get(API_ENDPOINTS.ONBOARDING.TRAINING_MODULES);
  return response.data;
};

export const getModuleDetail = async (moduleId) => {
  const response = await apiClient.get(API_ENDPOINTS.ONBOARDING.MODULE_DETAIL(moduleId));
  return response.data;
};

export const completeModule = async (moduleId) => {
  const response = await apiClient.post(API_ENDPOINTS.ONBOARDING.COMPLETE_MODULE(moduleId));
  return response.data;
};

export const getQuiz = async () => {
  const response = await apiClient.get(API_ENDPOINTS.ONBOARDING.QUIZ);
  return response.data;
};

export const submitQuiz = async (answers) => {
  const response = await apiClient.post(API_ENDPOINTS.ONBOARDING.SUBMIT_QUIZ, { answers });
  return response.data;
};

export const signContract = async (signature) => {
  const response = await apiClient.post(API_ENDPOINTS.ONBOARDING.SIGN_CONTRACT, { signature });
  return response.data;
};

export const getStarterKit = async () => {
  const response = await apiClient.get(API_ENDPOINTS.ONBOARDING.STARTER_KIT);
  return response.data;
};

export const orderStarterKit = async (items, paymentMethod) => {
  const response = await apiClient.post(API_ENDPOINTS.ONBOARDING.ORDER_STARTER_KIT, {
    items,
    payment_method: paymentMethod,
  });
  return response.data;
};

// === Mobile Money ===
export const verifyMobileMoneyAccount = async (operator, number, name) => {
  const response = await apiClient.post(API_ENDPOINTS.MOBILE_MONEY.VERIFY_ACCOUNT, {
    operator,
    number,
    holder_name: name,
  });
  return response.data;
};

export const updateMobileMoneyAccount = async (operator, number, name) => {
  const response = await apiClient.put(API_ENDPOINTS.MOBILE_MONEY.UPDATE_ACCOUNT, {
    operator,
    number,
    holder_name: name,
  });
  return response.data;
};

export default {
  getProfile,
  getCheckStatus,
  updateProfile,
  uploadDocument,
  updateDeliveryStatus,
  updateLocation,
  updateAvailability,
  updateVehicle,
  updateZones,
  getTrainingModules,
  getModuleDetail,
  completeModule,
  getQuiz,
  submitQuiz,
  signContract,
  getStarterKit,
  orderStarterKit,
  verifyMobileMoneyAccount,
  updateMobileMoneyAccount,
};

import apiClient from './client';
import { API_ENDPOINTS } from '../constants/api';

// === Courses disponibles ===
export const getAvailableOrders = async (lat, lng, radius = 5) => {
  const response = await apiClient.get(API_ENDPOINTS.ORDERS.AVAILABLE, {
    params: { lat, lng, radius },
  });
  return response.data;
};

// === Courses actives (en cours) ===
/** @param {{ signal?: AbortSignal }} [options] - option.signal pour annuler la requête */
export const getActiveOrders = async (options = {}) => {
  const response = await apiClient.get(API_ENDPOINTS.ORDERS.ACTIVE, {
    ...(options.signal && { signal: options.signal }),
  });
  return response.data;
};

// === Historique des livraisons ===
/** @param {{ signal?: AbortSignal }} [options] - option.signal pour annuler la requête */
export const getDeliveryHistory = async (page = 1, limit = 20, status = null, options = {}) => {
  const response = await apiClient.get(API_ENDPOINTS.ORDERS.HISTORY, {
    params: { page, limit, ...(status && { status }) },
    ...(options.signal && { signal: options.signal }),
  });
  return response.data;
};

// === Détail d'une commande ===
export const getOrderDetail = async (orderId) => {
  const response = await apiClient.get(API_ENDPOINTS.ORDERS.DETAIL(orderId));
  return response.data;
};

// === Actions sur les courses (PUT au lieu de POST) ===
export const acceptOrder = async (orderId, estimatedTime) => {
  const response = await apiClient.put(API_ENDPOINTS.ORDERS.ACCEPT(orderId), {
    ...(estimatedTime && { estimated_arrival_time: estimatedTime }),
  });
  return response.data;
};

export const declineOrder = async (orderId, reason) => {
  const response = await apiClient.put(API_ENDPOINTS.ORDERS.DECLINE(orderId), { 
    ...(reason && { reason }),
  });
  return response.data;
};

export const arriveAtRestaurant = async (orderId) => {
  const response = await apiClient.put(API_ENDPOINTS.ORDERS.ARRIVE_RESTAURANT(orderId));
  return response.data;
};

export const confirmPickup = async (orderId, pickupCode) => {
  const response = await apiClient.put(API_ENDPOINTS.ORDERS.PICKUP(orderId), {
    ...(pickupCode && { pickup_code: pickupCode }),
  });
  return response.data;
};

export const arriveAtCustomer = async (orderId) => {
  const response = await apiClient.put(API_ENDPOINTS.ORDERS.ARRIVE_CUSTOMER(orderId));
  return response.data;
};

export const confirmDelivery = async (orderId, deliveryData = {}) => {
  const response = await apiClient.put(API_ENDPOINTS.ORDERS.DELIVER(orderId), deliveryData);
  return response.data;
};

// === Signaler un problème ===
export const reportIssue = async (orderId, issueData) => {
  const response = await apiClient.post(API_ENDPOINTS.ORDERS.REPORT_ISSUE(orderId), issueData);
  return response.data;
};

export const reportClientAbsent = async (orderId, data) => {
  const response = await apiClient.post(API_ENDPOINTS.ORDERS.CLIENT_ABSENT(orderId), data);
  return response.data;
};

export const reportWrongAddress = async (orderId, addressData) => {
  const response = await apiClient.post(API_ENDPOINTS.ORDERS.WRONG_ADDRESS(orderId), addressData);
  return response.data;
};

export default {
  getAvailableOrders,
  getActiveOrders,
  getDeliveryHistory,
  getOrderDetail,
  acceptOrder,
  declineOrder,
  arriveAtRestaurant,
  confirmPickup,
  arriveAtCustomer,
  confirmDelivery,
  reportIssue,
  reportClientAbsent,
  reportWrongAddress,
};

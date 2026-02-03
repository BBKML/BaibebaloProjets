import apiClient from './client';
import { API_CONFIG } from '../constants/api';

/**
 * Calculer les frais de livraison et de service
 */
export const calculateFees = async (restaurantId, deliveryAddressId, subtotal) => {
  const subtotalNum = Number(subtotal);
  if (Number.isNaN(subtotalNum) || subtotalNum < 0) {
    throw new Error('Sous-total invalide');
  }
  const response = await apiClient.post('/orders/calculate-fees', {
    restaurant_id: restaurantId,
    delivery_address_id: deliveryAddressId,
    subtotal: subtotalNum,
  });
  return response.data;
};

/**
 * Créer une commande
 */
export const createOrder = async (orderData) => {
  const response = await apiClient.post(API_CONFIG.ENDPOINTS.ORDERS.CREATE, orderData);
  return response.data;
};

/**
 * Récupérer les détails d'une commande
 */
export const getOrderDetail = async (orderId) => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.ORDERS.DETAIL(orderId));
  return response.data;
};

/**
 * Annuler une commande
 */
export const cancelOrder = async (orderId) => {
  const response = await apiClient.put(API_CONFIG.ENDPOINTS.ORDERS.CANCEL(orderId));
  return response.data;
};

/**
 * Évaluer une commande
 */
export const reviewOrder = async (orderId, reviewData) => {
  const response = await apiClient.post(
    API_CONFIG.ENDPOINTS.ORDERS.REVIEW(orderId),
    reviewData
  );
  return response.data;
};

/**
 * Récupérer l'historique des commandes
 */
export const getOrderHistory = async (params = {}) => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.USERS.ORDERS, {
    params,
  });
  return response.data;
};

/**
 * Suivre une commande en temps réel
 */
export const trackOrder = async (orderId) => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.ORDERS.TRACK(orderId));
  return response.data;
};

/**
 * Signaler un problème avec une commande
 */
export const reportOrderIssue = async (orderId, issueData) => {
  const response = await apiClient.post(
    API_CONFIG.ENDPOINTS.ORDERS.REPORT(orderId),
    issueData
  );
  return response.data;
};

/**
 * Initier un paiement mobile money
 */
export const initiatePayment = async (orderId, paymentData) => {
  const response = await apiClient.post(
    API_CONFIG.ENDPOINTS.ORDERS.PAYMENT_INITIATE(orderId),
    paymentData
  );
  return response.data;
};

/**
 * Vérifier le statut d'un paiement
 */
export const checkPaymentStatus = async (orderId) => {
  const response = await apiClient.get(
    API_CONFIG.ENDPOINTS.ORDERS.PAYMENT_STATUS(orderId)
  );
  return response.data;
};

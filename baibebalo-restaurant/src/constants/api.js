// Configuration API
// En dev : EXPO_PUBLIC_API_URL dans .env, ou IP locale (téléphone = même WiFi)
// En prod : EXPO_PUBLIC_API_URL au build (EAS) ou défaut ci-dessous
// IMPORTANT: Mettez à jour l'IP ci-dessous avec l'IP affichée par le serveur backend
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL
  || (__DEV__ ? 'http://192.168.1.5:5000/api/v1' : 'https://baibebaloprojets.onrender.com/api/v1');

export const API_ENDPOINTS = {
  // Authentification
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/partner/login`,
    REGISTER: `${API_BASE_URL}/restaurants/register`,
    REFRESH_TOKEN: `${API_BASE_URL}/auth/refresh-token`,
    FORGOT_PASSWORD: `${API_BASE_URL}/auth/partner/forgot-password`,
    VERIFY_RESET_OTP: `${API_BASE_URL}/auth/partner/verify-reset-otp`,
    RESET_PASSWORD: `${API_BASE_URL}/auth/partner/reset-password`,
  },
  
  // Restaurant (routes /me nécessitent authentification)
  RESTAURANT: {
    PROFILE: `${API_BASE_URL}/restaurants/me`,
    UPDATE_PROFILE: `${API_BASE_URL}/restaurants/me`,
    TOGGLE_STATUS: `${API_BASE_URL}/restaurants/me/toggle-status`,
    STATISTICS: `${API_BASE_URL}/restaurants/me/statistics`,
    EARNINGS: `${API_BASE_URL}/restaurants/me/earnings`,
    EXPORT: `${API_BASE_URL}/restaurants/me/export`,
  },
  
  // Commandes
  ORDERS: {
    LIST: `${API_BASE_URL}/restaurants/me/orders`,
    DETAIL: (id) => `${API_BASE_URL}/restaurants/me/orders/${id}`,
    ACCEPT: (id) => `${API_BASE_URL}/orders/${id}/accept`,
    REJECT: (id) => `${API_BASE_URL}/orders/${id}/reject`,
    PREPARING: (id) => `${API_BASE_URL}/orders/${id}/preparing`,
    READY: (id) => `${API_BASE_URL}/orders/${id}/ready`,
    TRACK: (id) => `${API_BASE_URL}/orders/${id}/track`,
    // Messages de commande
    GET_MESSAGES: (id) => `${API_BASE_URL}/orders/${id}/messages`,
    SEND_MESSAGE: (id) => `${API_BASE_URL}/orders/${id}/messages`,
    MARK_MESSAGES_READ: (id) => `${API_BASE_URL}/orders/${id}/messages/read`,
  },
  
  // Menu
  MENU: {
    LIST: `${API_BASE_URL}/restaurants/me/menu`,
    CATEGORIES: `${API_BASE_URL}/restaurants/me/categories`,
    CREATE_CATEGORY: `${API_BASE_URL}/restaurants/me/categories`,
    UPDATE_CATEGORY: (id) => `${API_BASE_URL}/restaurants/me/categories/${id}`,
    DELETE_CATEGORY: (id) => `${API_BASE_URL}/restaurants/me/categories/${id}`,
    CREATE_ITEM: `${API_BASE_URL}/restaurants/me/menu`,
    UPDATE_ITEM: (id) => `${API_BASE_URL}/restaurants/me/menu/${id}`,
    DELETE_ITEM: (id) => `${API_BASE_URL}/restaurants/me/menu/${id}`,
    TOGGLE_AVAILABILITY: (id) => `${API_BASE_URL}/restaurants/me/menu/${id}/toggle-availability`,
  },
  
  // Finances
  FINANCE: {
    DASHBOARD: `${API_BASE_URL}/restaurants/me/earnings`,
    TRANSACTIONS: `${API_BASE_URL}/restaurants/me/earnings`, // Utilise earnings avec filtres
    WITHDRAWAL: `${API_BASE_URL}/restaurants/me/payout-request`,
    PAYOUT_HISTORY: `${API_BASE_URL}/restaurants/me/payout-requests`,
  },
  
  // Avis
  REVIEWS: {
    LIST: `${API_BASE_URL}/restaurants/me/reviews`,
    RESPOND: (id) => `${API_BASE_URL}/restaurants/me/reviews/${id}/respond`,
  },
  
  // Promotions
  PROMOTIONS: {
    LIST: `${API_BASE_URL}/restaurants/me/promotions`,
    CREATE: `${API_BASE_URL}/restaurants/me/promotions`,
    UPDATE: (id) => `${API_BASE_URL}/restaurants/me/promotions/${id}`,
    DELETE: (id) => `${API_BASE_URL}/restaurants/me/promotions/${id}`,
    TOGGLE: (id) => `${API_BASE_URL}/restaurants/me/promotions/${id}/toggle`,
  },
  
  // Notifications
  NOTIFICATIONS: {
    LIST: `${API_BASE_URL}/notifications`,
    MARK_READ: (id) => `${API_BASE_URL}/notifications/${id}/read`,
    SAVE_FCM_TOKEN: `${API_BASE_URL}/notifications/fcm-token`,
  },
  
  // Support
  SUPPORT: {
    CREATE_TICKET: `${API_BASE_URL}/restaurants/me/support/tickets`,
    LIST_TICKETS: `${API_BASE_URL}/restaurants/me/support/tickets`,
    TICKET_DETAILS: (id) => `${API_BASE_URL}/restaurants/me/support/tickets/${id}`,
    SEND_MESSAGE: (id) => `${API_BASE_URL}/restaurants/me/support/tickets/${id}/messages`,
  },
};

export default API_BASE_URL;

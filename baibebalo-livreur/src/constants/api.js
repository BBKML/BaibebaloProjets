// Configuration API pour l'application Livreur BAIBEBALO
// EAS build injecte EXPO_PUBLIC_API_URL depuis eas.json ; fallback pour dev et sécurité build
const PRODUCTION_API_URL = 'https://baibebaloprojets.onrender.com/api/v1';
const fromEnv = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL;
const API_BASE_URL = (typeof fromEnv === 'string' && fromEnv) ? fromEnv : (typeof __DEV__ !== 'undefined' && __DEV__ ? 'http://192.168.1.4:5000/api/v1' : PRODUCTION_API_URL);
const API_BASE_URL_SAFE = (typeof API_BASE_URL === 'string' && API_BASE_URL) ? API_BASE_URL : PRODUCTION_API_URL;

const BASE = API_BASE_URL_SAFE;

export const API_ENDPOINTS = {
  // Authentification Livreur
  AUTH: {
    SEND_OTP: `${BASE}/auth/send-otp`,
    VERIFY_OTP: `${BASE}/auth/verify-otp`,
    REGISTER_DELIVERY: `${BASE}/delivery/register`,
    REFRESH_TOKEN: `${BASE}/auth/refresh-token`,
    LOGOUT: `${BASE}/auth/logout`,
  },
  
  // Profil Livreur - Endpoints corrigés pour correspondre au backend
  DELIVERY: {
    PROFILE: `${BASE}/delivery/me`,
    CHECK_STATUS: `${BASE}/delivery/check-status`,
    UPDATE_PROFILE: `${BASE}/delivery/me`,
    UPLOAD_DOCUMENT: `${BASE}/delivery/me/documents`,
    UPDATE_STATUS: `${BASE}/delivery/status`,
    UPDATE_LOCATION: `${BASE}/delivery/location`,
    UPDATE_AVAILABILITY: `${BASE}/delivery/me/availability`,
    UPDATE_VEHICLE: `${BASE}/delivery/me/vehicle`,
    UPDATE_ZONES: `${BASE}/delivery/me/zones`,
  },
  ONBOARDING: {
    TRAINING_MODULES: `${BASE}/delivery/training/modules`,
    MODULE_DETAIL: (id) => `${BASE}/delivery/training/modules/${id}`,
    COMPLETE_MODULE: (id) => `${BASE}/delivery/training/modules/${id}/complete`,
    QUIZ: `${BASE}/delivery/training/quiz`,
    SUBMIT_QUIZ: `${BASE}/delivery/training/quiz/submit`,
    SIGN_CONTRACT: `${BASE}/delivery/contract/sign`,
    STARTER_KIT: `${BASE}/delivery/starter-kit`,
    ORDER_STARTER_KIT: `${BASE}/delivery/starter-kit/order`,
  },
  ORDERS: {
    AVAILABLE: `${BASE}/delivery/available-orders`,
    ACTIVE: `${BASE}/delivery/orders/active`,
    HISTORY: `${BASE}/delivery/history`,
    DETAIL: (id) => `${BASE}/orders/${id}`,
    ACCEPT: (id) => `${BASE}/delivery/orders/${id}/accept`,
    DECLINE: (id) => `${BASE}/delivery/orders/${id}/decline`,
    ARRIVE_RESTAURANT: (id) => `${BASE}/delivery/orders/${id}/arrive-restaurant`,
    PICKUP: (id) => `${BASE}/delivery/orders/${id}/pickup`,
    ARRIVE_CUSTOMER: (id) => `${BASE}/delivery/orders/${id}/arrive-customer`,
    DELIVER: (id) => `${BASE}/delivery/orders/${id}/deliver`,
    REPORT_ISSUE: (id) => `${BASE}/delivery/orders/${id}/report-issue`,
    CLIENT_ABSENT: (id) => `${BASE}/delivery/orders/${id}/client-absent`,
    WRONG_ADDRESS: (id) => `${BASE}/delivery/orders/${id}/wrong-address`,
  },
  EARNINGS: {
    DASHBOARD: `${BASE}/delivery/earnings`,
    HISTORY: `${BASE}/delivery/history`,
    PAYOUT_REQUEST: `${BASE}/delivery/payout-request`,
    PAYOUT_HISTORY: `${BASE}/delivery/payout-requests`,
    CASH_REMITTANCE_ORDERS_PENDING: `${BASE}/delivery/cash-remittances/orders-pending`,
    CASH_REMITTANCES: `${BASE}/delivery/cash-remittances`,
  },
  STATS: {
    DASHBOARD: `${BASE}/delivery/statistics`,
    REVIEWS: `${BASE}/delivery/reviews`,
    RANKINGS: `${BASE}/delivery/rankings`,
  },
  NOTIFICATIONS: {
    LIST: `${BASE}/notifications`,
    MARK_READ: (id) => `${BASE}/notifications/${id}/read`,
    MARK_ALL_READ: `${BASE}/notifications/read-all`,
    SAVE_FCM_TOKEN: `${BASE}/notifications/fcm-token`,
    SETTINGS: `${BASE}/notifications/settings`,
  },
  SUPPORT: {
    CONTACT: `${BASE}/delivery/support/contact`,
    EMERGENCY: `${BASE}/delivery/emergency`,
  },
  MOBILE_MONEY: {
    VERIFY_ACCOUNT: `${BASE}/delivery/mobile-money/verify`,
    UPDATE_ACCOUNT: `${BASE}/delivery/mobile-money/update`,
  },
};

export default API_BASE_URL_SAFE;

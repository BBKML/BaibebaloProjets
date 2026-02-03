// Configuration API pour l'application Livreur BAIBEBALO
// En dev : EXPO_PUBLIC_API_URL dans .env, ou IP locale (téléphone = même WiFi), ou 10.0.2.2 (émulateur Android)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL
  || (__DEV__ ? 'http://192.168.1.4:5000/api/v1' : 'https://api.baibebalo.com/api/v1');

export const API_ENDPOINTS = {
  // Authentification Livreur
  AUTH: {
    SEND_OTP: `${API_BASE_URL}/auth/send-otp`,
    VERIFY_OTP: `${API_BASE_URL}/auth/verify-otp`,
    REGISTER_DELIVERY: `${API_BASE_URL}/delivery/register`,
    REFRESH_TOKEN: `${API_BASE_URL}/auth/refresh-token`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
  },
  
  // Profil Livreur - Endpoints corrigés pour correspondre au backend
  DELIVERY: {
    PROFILE: `${API_BASE_URL}/delivery/me`,
    CHECK_STATUS: `${API_BASE_URL}/delivery/check-status`,
    UPDATE_PROFILE: `${API_BASE_URL}/delivery/me`,
    UPLOAD_DOCUMENT: `${API_BASE_URL}/delivery/me/documents`,
    UPDATE_STATUS: `${API_BASE_URL}/delivery/status`, // Corrigé
    UPDATE_LOCATION: `${API_BASE_URL}/delivery/location`, // Corrigé
    UPDATE_AVAILABILITY: `${API_BASE_URL}/delivery/me/availability`,
    UPDATE_VEHICLE: `${API_BASE_URL}/delivery/me/vehicle`,
    UPDATE_ZONES: `${API_BASE_URL}/delivery/me/zones`,
  },
  
  // Onboarding / Formation
  ONBOARDING: {
    TRAINING_MODULES: `${API_BASE_URL}/delivery/training/modules`,
    MODULE_DETAIL: (id) => `${API_BASE_URL}/delivery/training/modules/${id}`,
    COMPLETE_MODULE: (id) => `${API_BASE_URL}/delivery/training/modules/${id}/complete`,
    QUIZ: `${API_BASE_URL}/delivery/training/quiz`,
    SUBMIT_QUIZ: `${API_BASE_URL}/delivery/training/quiz/submit`,
    SIGN_CONTRACT: `${API_BASE_URL}/delivery/contract/sign`,
    STARTER_KIT: `${API_BASE_URL}/delivery/starter-kit`,
    ORDER_STARTER_KIT: `${API_BASE_URL}/delivery/starter-kit/order`,
  },
  
  // Courses / Livraisons - Endpoints corrigés pour correspondre au backend
  ORDERS: {
    AVAILABLE: `${API_BASE_URL}/delivery/available-orders`, // Corrigé
    ACTIVE: `${API_BASE_URL}/delivery/orders/active`, // Ajouté (commandes en cours)
    HISTORY: `${API_BASE_URL}/delivery/history`, // Corrigé
    DETAIL: (id) => `${API_BASE_URL}/orders/${id}`, // Détail via order routes
    ACCEPT: (id) => `${API_BASE_URL}/delivery/orders/${id}/accept`, // Corrigé (PUT)
    DECLINE: (id) => `${API_BASE_URL}/delivery/orders/${id}/decline`, // Corrigé
    ARRIVE_RESTAURANT: (id) => `${API_BASE_URL}/delivery/orders/${id}/arrive-restaurant`, // Corrigé
    PICKUP: (id) => `${API_BASE_URL}/delivery/orders/${id}/pickup`, // Corrigé
    ARRIVE_CUSTOMER: (id) => `${API_BASE_URL}/delivery/orders/${id}/arrive-customer`, // Corrigé
    DELIVER: (id) => `${API_BASE_URL}/delivery/orders/${id}/deliver`, // Corrigé
    REPORT_ISSUE: (id) => `${API_BASE_URL}/delivery/orders/${id}/report-issue`, // Corrigé
    CLIENT_ABSENT: (id) => `${API_BASE_URL}/delivery/orders/${id}/client-absent`, // Ajouté
    WRONG_ADDRESS: (id) => `${API_BASE_URL}/delivery/orders/${id}/wrong-address`, // Ajouté
  },
  
  // Gains et Paiements - Endpoints corrigés pour correspondre au backend
  EARNINGS: {
    DASHBOARD: `${API_BASE_URL}/delivery/earnings`, // Principal endpoint
    HISTORY: `${API_BASE_URL}/delivery/history`, // Utilise le même endpoint
    PAYOUT_REQUEST: `${API_BASE_URL}/delivery/payout-request`, // Corrigé
    PAYOUT_HISTORY: `${API_BASE_URL}/delivery/payout-requests`, // Corrigé
    CASH_REMITTANCE_ORDERS_PENDING: `${API_BASE_URL}/delivery/cash-remittances/orders-pending`,
    CASH_REMITTANCES: `${API_BASE_URL}/delivery/cash-remittances`,
  },
  
  // Statistiques et Performance
  STATS: {
    DASHBOARD: `${API_BASE_URL}/delivery/statistics`,
    REVIEWS: `${API_BASE_URL}/delivery/reviews`,
    RANKINGS: `${API_BASE_URL}/delivery/rankings`,
  },
  
  // Notifications
  NOTIFICATIONS: {
    LIST: `${API_BASE_URL}/notifications`,
    MARK_READ: (id) => `${API_BASE_URL}/notifications/${id}/read`,
    MARK_ALL_READ: `${API_BASE_URL}/notifications/read-all`,
    SAVE_FCM_TOKEN: `${API_BASE_URL}/notifications/fcm-token`,
    SETTINGS: `${API_BASE_URL}/notifications/settings`,
  },
  
  // Support - Endpoints corrigés
  SUPPORT: {
    CONTACT: `${API_BASE_URL}/delivery/support/contact`, // Corrigé
    EMERGENCY: `${API_BASE_URL}/delivery/emergency`, // Corrigé
  },
  
  // Mobile Money
  MOBILE_MONEY: {
    VERIFY_ACCOUNT: `${API_BASE_URL}/delivery/mobile-money/verify`,
    UPDATE_ACCOUNT: `${API_BASE_URL}/delivery/mobile-money/update`,
  },
};

export default API_BASE_URL;

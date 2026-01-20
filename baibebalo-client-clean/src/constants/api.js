// Configuration API
export const API_CONFIG = {
  // URL de base de l'API
  // Pour téléphone physique, utilisez l'IP de votre machine au lieu de localhost
  // Trouvez votre IP avec: ipconfig (Windows) ou ifconfig (Mac/Linux)
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.12:5000/api/v1',
  
  // Timeout des requêtes
  TIMEOUT: 30000,
  
  // Endpoints
  ENDPOINTS: {
    // Authentification
    AUTH: {
      SEND_OTP: '/auth/send-otp',
      VERIFY_OTP: '/auth/verify-otp',
      REFRESH_TOKEN: '/auth/refresh-token',
    },
    
    // Utilisateurs
    USERS: {
      ME: '/users/me',
      UPDATE_ME: '/users/me',
      ADDRESSES: '/users/me/addresses',
      ORDERS: '/users/me/orders',
      FAVORITES: '/users/me/favorites',
      FAVORITE: (id) => `/users/me/favorites/${id}`,
      LOYALTY: '/users/me/loyalty',
      REFERRALS: '/users/me/referrals',
      VALIDATE_PROMO: '/users/me/promotions/validate',
      SUPPORT_TICKETS: '/users/me/support/tickets',
      SUPPORT_TICKET: (id) => `/users/me/support/tickets/${id}`,
      SUPPORT_TICKET_MESSAGES: (id) => `/users/me/support/tickets/${id}/messages`,
      SUPPORT_TICKET_CLOSE: (id) => `/users/me/support/tickets/${id}/close`,
      EXPORT_DATA: '/users/me/export',
      DELETE_ACCOUNT: '/users/me',
    },
    
    // Restaurants
    RESTAURANTS: {
      LIST: '/restaurants',
      DETAIL: (id) => `/restaurants/${id}`,
      MENU: (id) => `/restaurants/${id}/menu`,
      REVIEWS: (id) => `/restaurants/${id}/reviews`,
    },
    
    // Commandes
    ORDERS: {
      CREATE: '/orders',
      DETAIL: (id) => `/orders/${id}`,
      TRACK: (id) => `/orders/${id}/track`,
      CANCEL: (id) => `/orders/${id}/cancel`,
      REVIEW: (id) => `/orders/${id}/review`,
      REPORT: (id) => `/orders/${id}/report`,
      PAYMENT_INITIATE: (id) => `/orders/${id}/payment/initiate`,
      PAYMENT_STATUS: (id) => `/orders/${id}/payment/status`,
    },
  },
};

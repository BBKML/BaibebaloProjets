/**
 * BAIBEBALO API - Configuration centrale
 * Plateforme de livraison locale - Korhogo, Côte d'Ivoire
 */

require('dotenv').config();

const config = {
  // ================================
  // ENVIRONNEMENT
  // ================================
  env: process.env.NODE_ENV || 'development',
  
  // ================================
  // SERVEUR
  // ================================
  port: parseInt(process.env.PORT, 10) || 5000,
  apiVersion: process.env.API_VERSION || 'v1',
  
  // ================================
  // BASE DE DONNÉES
  // ================================
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'baibebalo',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
    max: parseInt(process.env.DB_POOL_MAX, 10) || 20, // Taille max du pool
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT, 10) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT, 10) || 2000,
  },
  
  // ================================
  // URLS ET DOMAINES
  // ================================
  urls: {
    apiBase: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
    api: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
    frontend: process.env.CLIENT_APP_URL || 'http://localhost:5173',
    clientApp: process.env.CLIENT_APP_URL || 'http://localhost:5173',
    adminPanel: process.env.ADMIN_PANEL_URL || 'http://localhost:5174',
    corsOrigin: process.env.CORS_ORIGIN || '',
  },
  
  // ================================
  // SÉCURITÉ - JWT
  // ================================
  jwt: {
    secret: process.env.JWT_SECRET || 'baibebalo-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'baibebalo-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
  // ================================
  // SÉCURITÉ - GÉNÉRAL
  // ================================
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
  },
  
  // ================================
  // RATE LIMITING
  // ================================
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },
  
  // ================================
  // CORS
  // ================================
  cors: {
    // En développement : autoriser toutes les origines (pratique pour React Native/Expo)
    // En production : utiliser CORS_ORIGIN pour restreindre
    // Note: config.env sera défini plus haut, on utilise process.env.NODE_ENV directement
    origin: (process.env.NODE_ENV || 'development') === 'development' 
      ? true // Autoriser toutes les origines en dev (plus simple pour React Native)
      : (process.env.CORS_ORIGIN 
          ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
          : ['http://localhost:5173', 'http://localhost:5174']),
    credentials: true,
  },
  
  // ================================
  // PAIEMENTS
  // ================================
  payment: {
    // FedaPay
    fedapay: {
      apiKey: process.env.FEDAPAY_API_KEY || '',
      publicKey: process.env.FEDAPAY_PUBLIC_KEY || '',
      environment: process.env.FEDAPAY_ENV || 'sandbox', // sandbox ou live
      webhookSecret: process.env.FEDAPAY_WEBHOOK_SECRET || '',
    },
    
    // Wave
    wave: {
      apiKey: process.env.WAVE_API_KEY || '',
      apiSecret: process.env.WAVE_API_SECRET || '',
      webhookSecret: process.env.WAVE_WEBHOOK_SECRET || '',
    },
    
    // Orange Money
    orangeMoney: {
      endpoint: process.env.ORANGE_API_ENDPOINT || 'https://api.orange.com',
      merchantKey: process.env.ORANGE_MERCHANT_KEY || '',
      secret: process.env.ORANGE_MERCHANT_SECRET || '',
      merchantSecret: process.env.ORANGE_MERCHANT_SECRET || '',
    },
    
    // MTN Mobile Money
    mtnMomo: {
      endpoint: process.env.MTN_API_ENDPOINT || 'https://proxy.momoapi.mtn.com',
      apiKey: process.env.MTN_API_KEY || '',
      apiSecret: process.env.MTN_API_SECRET || '',
      subscriptionKey: process.env.MTN_SUBSCRIPTION_KEY || '',
      environment: process.env.MTN_ENVIRONMENT || 'sandbox', // sandbox ou production
    },
  },
  
  // ================================
  // SMS (UNIQUEMENT POUR OTP - Authentification)
  // ================================
  // ⚠️ OPTIMISATION COÛTS: Les SMS ne sont utilisés QUE pour les OTP
  // Toutes les autres notifications utilisent les Push Notifications (gratuites)
  // 
  // Coûts estimés par SMS:
  // - Twilio: ~50 FCFA
  // - Nexah: ~15 FCFA
  // - Orange: ~20 FCFA
  // 
  // Économie mensuelle estimée: 50 000 - 100 000 FCFA
  sms: {
    provider: process.env.SMS_PROVIDER || 'dev', // dev (gratuit), twilio, africastalking, nexah, orange
    // SMS uniquement pour OTP (authentification)
    useOnlyForOTP: true, // Ne pas changer sauf si nécessaire
    
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      phoneNumber: process.env.TWILIO_FROM || process.env.TWILIO_PHONE_NUMBER || '', // TWILIO_FROM ou TWILIO_PHONE_NUMBER
    },
    
    africasTalking: {
      apiKey: process.env.AFRICASTALKING_API_KEY || '',
      username: process.env.AFRICASTALKING_USERNAME || '',
      from: process.env.AFRICASTALKING_FROM || 'BAIBEBALO',
    },
    
    nexah: {
      apiKey: process.env.NEXAH_API_KEY || '',
      senderId: process.env.NEXAH_SENDER_ID || 'BAIBEBALO',
      endpoint: process.env.NEXAH_ENDPOINT || 'https://api.nexah.net/api/v1/sms/send',
    },
    
    orange: {
      clientId: process.env.ORANGE_SMS_CLIENT_ID || '',
      clientSecret: process.env.ORANGE_SMS_CLIENT_SECRET || '',
      sender: process.env.ORANGE_SMS_SENDER_ID || 'BAIBEBALO',
      tokenUrl: process.env.ORANGE_SMS_TOKEN_URL || 'https://api.orange.com/oauth/v3/token',
    },
  },

  // ================================
  // FIREBASE (Notifications push) - GRATUIT
  // ================================
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
  },

  // ================================
  // NOTIFICATIONS - Stratégie
  // ================================
  // ⚠️ OPTIMISATION: Utiliser Push (gratuit) au lieu de SMS (payant)
  notifications: {
    // Canaux de notification par type d'événement
    // 'push' = Firebase Cloud Messaging (GRATUIT)
    // 'sms' = SMS (PAYANT - éviter sauf OTP)
    // 'websocket' = Temps réel in-app (GRATUIT)
    channels: {
      // Authentification - SMS obligatoire pour OTP
      otp: 'sms',
      
      // Commandes - Push uniquement (économie ~15 FCFA/notification)
      order_confirmed: 'push',
      order_preparing: 'push',
      order_ready: 'push',
      order_delivering: 'push',
      order_delivered: 'push',
      order_cancelled: 'push',
      
      // Restaurant - Push + WebSocket
      new_order: 'push',
      order_accepted: 'push',
      
      // Livreur - Push + WebSocket
      delivery_assigned: 'push',
      delivery_nearby: 'push',
      delivery_completed: 'push',
      
      // Marketing - Push uniquement
      promotion: 'push',
      loyalty_reward: 'push',
      referral_bonus: 'push',
    },
    
    // Économie estimée par mois (basé sur 1000 commandes/mois)
    // Avant: ~5 SMS/commande × 15 FCFA = 75 000 FCFA/mois
    // Après: 0 SMS (sauf OTP) = économie ~70 000 FCFA/mois
    estimatedMonthlySavings: 70000, // FCFA
  },

  // ================================
  // WHATSAPP (Cloud API)
  // ================================
  whatsapp: {
    enabled: false, // Désactivé - utiliser SMS Twilio uniquement
    provider: 'dev', // Mode dev (pas Twilio)
    token: process.env.WHATSAPP_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    templateName: process.env.WHATSAPP_OTP_TEMPLATE || 'baibebalo_otp',
    languageCode: process.env.WHATSAPP_LANGUAGE_CODE || 'fr',
  },
  
  // ================================
  // EMAIL
  // ================================
  email: {
    provider: process.env.EMAIL_PROVIDER || 'smtp', // smtp, sendgrid, mailgun
    from: process.env.EMAIL_FROM || 'noreply@baibebalo.com',
    fromName: process.env.EMAIL_FROM_NAME || 'BAIBEBALO',
    
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      password: process.env.SMTP_PASSWORD || '',
    },
    
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY || '',
    },
    
    mailgun: {
      apiKey: process.env.MAILGUN_API_KEY || '',
      domain: process.env.MAILGUN_DOMAIN || '',
    },
  },
  
  // ================================
  // GÉOLOCALISATION
  // ================================
  maps: {
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    defaultCity: 'Korhogo',
    defaultCountry: 'CI',
    deliveryRadius: parseInt(process.env.DELIVERY_RADIUS_KM, 10) || 10, // km
  },
  
  // ================================
  // UPLOAD / STOCKAGE FICHIERS
  // ================================
  upload: {
    provider: process.env.UPLOAD_PROVIDER || 'local', // local (gratuit), s3, cloudinary
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
    
    local: {
      uploadDir: process.env.UPLOAD_DIR || './uploads',
      publicPath: process.env.UPLOAD_PUBLIC_PATH || '/uploads',
    },
    
    s3: {
      bucket: process.env.AWS_S3_BUCKET || '',
      region: process.env.AWS_S3_REGION || 'eu-west-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
    
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: process.env.CLOUDINARY_API_KEY || '',
      apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    },
  },
  
  // ================================
  // REDIS (Cache / Sessions)
  // ================================
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    ttl: parseInt(process.env.REDIS_TTL, 10) || 3600, // 1 heure
  },
  
  // ================================
  // CRON JOBS
  // ================================
  enableCronJobs: process.env.ENABLE_CRON_JOBS === 'true',
  
  cronJobs: {
    // Vérifier les commandes abandonnées (toutes les 5 minutes)
    checkAbandonedOrders: process.env.CRON_ABANDONED_ORDERS || '*/5 * * * *',
    
    // Nettoyer les anciennes sessions (tous les jours à 2h)
    cleanOldSessions: process.env.CRON_CLEAN_SESSIONS || '0 2 * * *',
    
    // Générer les rapports quotidiens (tous les jours à 23h)
    generateDailyReports: process.env.CRON_DAILY_REPORTS || '0 23 * * *',
    
    // Envoyer les notifications de rappel (toutes les heures)
    sendReminders: process.env.CRON_REMINDERS || '0 * * * *',
  },
  
  // ================================
  // BUSINESS LOGIC
  // ================================
  business: {
    // Frais de service (%) — désactivé : on se contente des frais livraison + commission restaurant
    serviceFee: parseFloat(process.env.SERVICE_FEE, 10) ?? 0,
    
    // TVA (%)
    vat: parseFloat(process.env.VAT, 10) || 18,
    
    // Montant minimum de commande (FCFA)
    minOrderAmount: parseInt(process.env.MIN_ORDER_AMOUNT, 10) || 1000,
    
    // Temps d'expiration du panier (minutes)
    cartExpirationMinutes: parseInt(process.env.CART_EXPIRATION, 10) || 30,
    
    // Temps maximum de préparation (minutes)
    maxPreparationTime: parseInt(process.env.MAX_PREPARATION_TIME, 10) || 60,
    
    // Temps maximum de livraison (minutes)
    maxDeliveryTime: parseInt(process.env.MAX_DELIVERY_TIME, 10) || 45,
    
    // Distance maximum de livraison (km)
    maxDeliveryDistance: parseInt(process.env.MAX_DELIVERY_DISTANCE, 10) || 10,
    
    // === FRAIS DE LIVRAISON ===
    // Frais de base (FCFA) - appliqué pour les 5 premiers km
    baseDeliveryFee: parseInt(process.env.BASE_DELIVERY_FEE, 10) || 500,
    
    // Distance incluse dans les frais de base (km)
    freeDeliveryDistanceKm: parseInt(process.env.FREE_DELIVERY_DISTANCE_KM, 10) || 5,
    
    // Prix par km supplémentaire au-delà de la distance gratuite (FCFA)
    deliveryPricePerExtraKm: parseInt(process.env.DELIVERY_PRICE_PER_EXTRA_KM, 10) || 100,
    
    // Anciens paramètres (pour compatibilité)
    deliveryPricePerKm: parseInt(process.env.DELIVERY_PRICE_PER_KM, 10) || 200,
    minDeliveryPrice: parseInt(process.env.MIN_DELIVERY_PRICE, 10) || 500,
    
    // === RÉMUNÉRATION LIVREUR ===
    // Pourcentage des frais de livraison pour le livreur (70%)
    deliveryPersonPercentage: parseInt(process.env.DELIVERY_PERSON_PERCENTAGE, 10) || 70,
    
    // Bonus distance longue (si distance > 5 km)
    deliveryBonusLongDistanceThreshold: parseInt(process.env.DELIVERY_BONUS_LONG_DISTANCE_KM, 10) || 5, // km
    deliveryBonusLongDistanceAmount: parseInt(process.env.DELIVERY_BONUS_LONG_DISTANCE_AMOUNT, 10) || 200, // FCFA
    
    // Bonus heure de pointe
    deliveryBonusPeakHourAmount: parseInt(process.env.DELIVERY_BONUS_PEAK_HOUR_AMOUNT, 10) || 100, // FCFA
    deliveryPeakHours: { // Heures de pointe
      lunch: { start: 12, end: 14 },   // 12h - 14h
      dinner: { start: 19, end: 21 },  // 19h - 21h
    },
    
    // Bonus note parfaite (5 étoiles)
    deliveryBonusPerfectRatingAmount: parseInt(process.env.DELIVERY_BONUS_PERFECT_RATING, 10) || 100, // FCFA
    
    // Bonus week-end (+10%)
    deliveryBonusWeekendPercent: parseInt(process.env.DELIVERY_BONUS_WEEKEND_PERCENT, 10) || 10, // %
    
    // Bonus objectif quotidien
    deliveryDailyGoalTarget: parseInt(process.env.DELIVERY_DAILY_GOAL_TARGET, 10) || 10, // courses
    deliveryDailyGoalBonusAmount: parseInt(process.env.DELIVERY_DAILY_GOAL_BONUS, 10) || 2000, // FCFA
    
    // Pénalités
    deliveryPenaltyLateThreshold: parseInt(process.env.DELIVERY_PENALTY_LATE_MINUTES, 10) || 15, // minutes
    deliveryPenaltyLateAmount: parseInt(process.env.DELIVERY_PENALTY_LATE_AMOUNT, 10) || 200, // FCFA
    deliveryPenaltyCancellationAmount: parseInt(process.env.DELIVERY_PENALTY_CANCELLATION, 10) || 500, // FCFA
    
    // === SEUIL LIVRAISON GRATUITE ===
    // Si le sous-total dépasse ce montant, la livraison est gratuite
    freeDeliveryThreshold: parseInt(process.env.FREE_DELIVERY_THRESHOLD, 10) || 20000, // FCFA
    freeDeliveryEnabled: process.env.FREE_DELIVERY_ENABLED !== 'false', // Activé par défaut
    
    // === OFFRES GROUPÉES (BUNDLES) ===
    // Réduction automatique quand plat + boisson sont commandés ensemble
    bundleDiscountEnabled: process.env.BUNDLE_DISCOUNT_ENABLED !== 'false', // Activé par défaut
    bundleDiscountPercent: parseInt(process.env.BUNDLE_DISCOUNT_PERCENT, 10) || 5, // % de réduction
    // Catégories considérées comme "boissons" pour les bundles
    bundleDrinkCategories: (process.env.BUNDLE_DRINK_CATEGORIES || 'boissons,drinks,beverages,sodas,jus').split(','),
    // Catégories considérées comme "plats" pour les bundles
    bundleFoodCategories: (process.env.BUNDLE_FOOD_CATEGORIES || 'plats,plat principal,entrées,grillades,poissons,viandes').split(','),
  },
  
  // ================================
  // LOGGING
  // ================================
  logging: {
    level: process.env.LOG_LEVEL || 'info', // error, warn, info, debug
    format: process.env.LOG_FORMAT || 'json', // json, simple
    logToFile: process.env.LOG_TO_FILE === 'true',
    logDir: process.env.LOG_DIR || './logs',
  },
  
  // ================================
  // FEATURES FLAGS
  // ================================
  features: {
    enableRegistration: process.env.ENABLE_REGISTRATION !== 'false',
    enableSocialLogin: process.env.ENABLE_SOCIAL_LOGIN === 'true',
    enableEmailVerification: process.env.ENABLE_EMAIL_VERIFICATION === 'true',
    enableSMSVerification: process.env.ENABLE_SMS_VERIFICATION === 'true',
    enableLoyaltyProgram: process.env.ENABLE_LOYALTY_PROGRAM === 'true',
    enableReferralSystem: process.env.ENABLE_REFERRAL_SYSTEM === 'true',
    enableReviews: process.env.ENABLE_REVIEWS !== 'false',
    enableChat: process.env.ENABLE_CHAT === 'true',
    maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
  },
};

// Validation de la configuration critique en production
if (config.env === 'production') {
  const requiredVars = [
    'JWT_SECRET',
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Variables d\'environnement manquantes en production:');
    missing.forEach(v => console.error(`   - ${v}`));
    process.exit(1);
  }
}

// Exporter la configuration
module.exports = config;
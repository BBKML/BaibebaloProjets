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
    connectionString: process.env.DATABASE_URL || null,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'baibebalo',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' || (process.env.DATABASE_URL && process.env.NODE_ENV === 'production'),
    max: Math.min(parseInt(process.env.DB_POOL_MAX, 10) || 20, 50),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT, 10) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT, 10) || 5000,
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
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },
  
  // ================================
  // CORS
  // ================================
  cors: {
    // ✅ CORRECTION : ajout de https://baibebalo-admin.onrender.com dans le fallback production
    // Si CORS_ORIGIN est défini dans les variables d'environnement Render, il sera utilisé.
    // Sinon, le fallback inclut maintenant l'URL de l'admin en production.
    origin: (process.env.NODE_ENV || 'development') === 'development'
      ? true // Autoriser toutes les origines en dev (pratique pour React Native/Expo)
      : (process.env.CORS_ORIGIN
          ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
          : [
              'http://localhost:5173',
              'http://localhost:5174',
              'https://baibebalo-admin.onrender.com', // ✅ AJOUT - Panel admin production
            ]),
    credentials: true,
  },
  
  // ================================
  // PAIEMENTS
  // ================================
  payment: {
    enabledMethods: ['cash'],
    
    fedapay: {
      apiKey: process.env.FEDAPAY_API_KEY || '',
      publicKey: process.env.FEDAPAY_PUBLIC_KEY || '',
      environment: process.env.FEDAPAY_ENV || 'sandbox',
      webhookSecret: process.env.FEDAPAY_WEBHOOK_SECRET || '',
    },
    
    wave: {
      apiKey: process.env.WAVE_API_KEY || '',
      apiSecret: process.env.WAVE_API_SECRET || '',
      webhookSecret: process.env.WAVE_WEBHOOK_SECRET || '',
    },
    
    orangeMoney: {
      enabled: false,
      endpoint: process.env.ORANGE_API_ENDPOINT || 'https://api.orange.com',
      merchantKey: process.env.ORANGE_MERCHANT_KEY || '',
      secret: process.env.ORANGE_MERCHANT_SECRET || '',
      merchantSecret: process.env.ORANGE_MERCHANT_SECRET || '',
      webhookSecret: process.env.ORANGE_WEBHOOK_SECRET || process.env.ORANGE_MERCHANT_SECRET || '',
    },

    mtnMomo: {
      enabled: false,
      endpoint: process.env.MTN_API_ENDPOINT || 'https://proxy.momoapi.mtn.com',
      apiKey: process.env.MTN_API_KEY || '',
      apiSecret: process.env.MTN_API_SECRET || '',
      subscriptionKey: process.env.MTN_SUBSCRIPTION_KEY || '',
      environment: process.env.MTN_ENVIRONMENT || 'sandbox',
      webhookSecret: process.env.MTN_WEBHOOK_SECRET || '',
    },
    
    moovMoney: {
      enabled: false,
    },
  },
  
  // ================================
  // SMS (UNIQUEMENT POUR OTP)
  // ================================
  sms: {
    provider: process.env.SMS_PROVIDER || 'dev',
    useOnlyForOTP: true,
    
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      phoneNumber: process.env.TWILIO_FROM || process.env.TWILIO_PHONE_NUMBER || '',
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
  // FIREBASE (Notifications push)
  // ================================
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
  },

  // ================================
  // NOTIFICATIONS - Stratégie
  // ================================
  notifications: {
    channels: {
      otp: 'sms',
      order_confirmed: 'push',
      order_preparing: 'push',
      order_ready: 'push',
      order_delivering: 'push',
      order_delivered: 'push',
      order_cancelled: 'push',
      new_order: 'push',
      order_accepted: 'push',
      delivery_assigned: 'push',
      delivery_nearby: 'push',
      delivery_completed: 'push',
      promotion: 'push',
      loyalty_reward: 'push',
      referral_bonus: 'push',
    },
    estimatedMonthlySavings: 70000,
  },

  // ================================
  // WHATSAPP
  // ================================
  whatsapp: {
    enabled: false,
    provider: 'dev',
    token: process.env.WHATSAPP_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    templateName: process.env.WHATSAPP_OTP_TEMPLATE || 'baibebalo_otp',
    languageCode: process.env.WHATSAPP_LANGUAGE_CODE || 'fr',
  },
  
  // ================================
  // EMAIL
  // ================================
  email: {
    provider: process.env.EMAIL_PROVIDER || 'smtp',
    from: process.env.EMAIL_FROM || 'noreply@baibebalo.com',
    fromName: process.env.EMAIL_FROM_NAME || 'BAIBEBALO',
    
    smtp: {
      host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT, 10) || 587,
      secure: process.env.EMAIL_SECURE === 'true' || process.env.SMTP_SECURE === 'true',
      user: process.env.EMAIL_USER || process.env.SMTP_USER || '',
      password: process.env.EMAIL_PASSWORD || process.env.SMTP_PASSWORD || '',
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
    deliveryRadius: parseInt(process.env.DELIVERY_RADIUS_KM, 10) || 10,
  },
  
  // ================================
  // UPLOAD / STOCKAGE FICHIERS
  // ================================
  upload: {
    provider: process.env.UPLOAD_PROVIDER || 'local',
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 5 * 1024 * 1024,
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
      endpoint: process.env.AWS_S3_ENDPOINT || '',
    },
    
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: process.env.CLOUDINARY_API_KEY || '',
      apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    },
  },
  
  // ================================
  // REDIS
  // ================================
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    ttl: parseInt(process.env.REDIS_TTL, 10) || 3600,
  },
  
  // ================================
  // CRON JOBS
  // ================================
  enableCronJobs: process.env.ENABLE_CRON_JOBS === 'true',
  
  cronJobs: {
    checkAbandonedOrders: process.env.CRON_ABANDONED_ORDERS || '*/5 * * * *',
    cleanOldSessions: process.env.CRON_CLEAN_SESSIONS || '0 2 * * *',
    generateDailyReports: process.env.CRON_DAILY_REPORTS || '0 23 * * *',
    sendReminders: process.env.CRON_REMINDERS || '0 * * * *',
  },
  
  // ================================
  // BUSINESS LOGIC
  // ================================
  business: {
    serviceFee: parseFloat(process.env.SERVICE_FEE, 10) ?? 0,
    vat: parseFloat(process.env.VAT, 10) || 18,
    minOrderAmount: parseInt(process.env.MIN_ORDER_AMOUNT, 10) || 1000,
    cartExpirationMinutes: parseInt(process.env.CART_EXPIRATION, 10) || 30,
    maxPreparationTime: parseInt(process.env.MAX_PREPARATION_TIME, 10) || 60,
    maxDeliveryTime: parseInt(process.env.MAX_DELIVERY_TIME, 10) || 45,
    maxDeliveryDistance: parseInt(process.env.MAX_DELIVERY_DISTANCE, 10) || 20,
    baseDeliveryFee: parseInt(process.env.BASE_DELIVERY_FEE, 10) || 500,
    freeDeliveryDistanceKm: parseInt(process.env.FREE_DELIVERY_DISTANCE_KM, 10) || 5,
    deliveryPricePerExtraKm: parseInt(process.env.DELIVERY_PRICE_PER_EXTRA_KM, 10) || 100,
    deliveryPricePerKm: parseInt(process.env.DELIVERY_PRICE_PER_KM, 10) || 200,
    minDeliveryPrice: parseInt(process.env.MIN_DELIVERY_PRICE, 10) || 500,
    deliveryPersonPercentage: parseInt(process.env.DELIVERY_PERSON_PERCENTAGE, 10) || 70,
    deliveryBonusLongDistanceThreshold: parseInt(process.env.DELIVERY_BONUS_LONG_DISTANCE_KM, 10) || 5,
    deliveryBonusLongDistanceAmount: parseInt(process.env.DELIVERY_BONUS_LONG_DISTANCE_AMOUNT, 10) || 200,
    deliveryBonusPeakHourAmount: parseInt(process.env.DELIVERY_BONUS_PEAK_HOUR_AMOUNT, 10) || 100,
    deliveryPeakHours: {
      lunch: { start: 12, end: 14 },
      dinner: { start: 19, end: 21 },
    },
    deliveryBonusPerfectRatingAmount: parseInt(process.env.DELIVERY_BONUS_PERFECT_RATING, 10) || 100,
    deliveryBonusWeekendPercent: parseInt(process.env.DELIVERY_BONUS_WEEKEND_PERCENT, 10) || 10,
    deliveryDailyGoalTarget: parseInt(process.env.DELIVERY_DAILY_GOAL_TARGET, 10) || 10,
    deliveryDailyGoalBonusAmount: parseInt(process.env.DELIVERY_DAILY_GOAL_BONUS, 10) || 2000,
    baibebaloMobileMoneyNumber: process.env.BAIBEBALO_MOBILE_MONEY_NUMBER || '+2250787097996',
    baibebaloMobileMoneyProvider: process.env.BAIBEBALO_MOBILE_MONEY_PROVIDER || 'orange_money',
    baibebaloContactPhone: process.env.BAIBEBALO_CONTACT_PHONE || '+2250787097996',
    baibebaloContactPhoneAlt: process.env.BAIBEBALO_CONTACT_PHONE_ALT || '+2250585670940',
    deliveryPenaltyLateThreshold: parseInt(process.env.DELIVERY_PENALTY_LATE_MINUTES, 10) || 15,
    deliveryPenaltyLateAmount: parseInt(process.env.DELIVERY_PENALTY_LATE_AMOUNT, 10) || 200,
    deliveryPenaltyCancellationAmount: parseInt(process.env.DELIVERY_PENALTY_CANCELLATION, 10) || 500,
    deliveryProposalExpirySeconds: parseInt(process.env.DELIVERY_PROPOSAL_EXPIRY_SECONDS, 10) || 120,
    freeDeliveryThreshold: parseInt(process.env.FREE_DELIVERY_THRESHOLD, 10) || 20000,
    freeDeliveryEnabled: process.env.FREE_DELIVERY_ENABLED !== 'false',
    freeDeliveryDriverFee: parseInt(process.env.FREE_DELIVERY_DRIVER_FEE, 10) || 500,
    bundleDiscountEnabled: process.env.BUNDLE_DISCOUNT_ENABLED !== 'false',
    bundleDiscountPercent: parseInt(process.env.BUNDLE_DISCOUNT_PERCENT, 10) || 5,
    bundleDrinkCategories: (process.env.BUNDLE_DRINK_CATEGORIES || 'boissons,drinks,beverages,sodas,jus').split(','),
    bundleFoodCategories: (process.env.BUNDLE_FOOD_CATEGORIES || 'plats,plat principal,entrées,grillades,poissons,viandes').split(','),
  },
  
  // ================================
  // LOGGING
  // ================================
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
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
  const missing = [];
  if (!process.env.JWT_SECRET) {
    missing.push('JWT_SECRET');
  }
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const hasDbVars = !!(process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD);
  if (!hasDatabaseUrl && !hasDbVars) {
    missing.push('DATABASE_URL ou (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD)');
  }
  if (missing.length > 0) {
    console.error('❌ Variables d\'environnement manquantes en production:');
    missing.forEach(v => console.error(`   - ${v}`));
    process.exit(1);
  }
}

module.exports = config;

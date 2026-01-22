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
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : ['http://localhost:5173', 'http://localhost:5174'],
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
      merchantKey: process.env.ORANGE_MERCHANT_KEY || '',
      merchantSecret: process.env.ORANGE_MERCHANT_SECRET || '',
    },
    
    // MTN Mobile Money
    mtnMomo: {
      apiKey: process.env.MTN_API_KEY || '',
      apiSecret: process.env.MTN_API_SECRET || '',
      subscriptionKey: process.env.MTN_SUBSCRIPTION_KEY || '',
    },
  },
  
  // ================================
  // SMS (Pour notifications)
  // ================================
  sms: {
    provider: process.env.SMS_PROVIDER || 'dev', // dev (gratuit), twilio, africastalking, nexah, orange
    
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
    // Frais de service (%)
    serviceFee: parseFloat(process.env.SERVICE_FEE, 10) || 10,
    
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
    
    // Prix de livraison par km (FCFA)
    deliveryPricePerKm: parseInt(process.env.DELIVERY_PRICE_PER_KM, 10) || 200,
    
    // Prix de livraison minimum (FCFA)
    minDeliveryPrice: parseInt(process.env.MIN_DELIVERY_PRICE, 10) || 500,
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
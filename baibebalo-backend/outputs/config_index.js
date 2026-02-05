/**
 * Configuration centralisée de l'application BAIBEBALO
 * Toutes les variables d'environnement sont chargées ici
 */

require('dotenv').config();

const config = {
  // Environnement
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiVersion: process.env.API_VERSION || 'v1',

  // Base de données PostgreSQL
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'baibebalo',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  // JWT Authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'baibebalo_secret_key_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'baibebalo_refresh_secret_change_in_production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Firebase (Notifications Push)
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  },

  // SMS
  sms: {
    provider: process.env.SMS_PROVIDER || 'dev', // twilio, nexah, orange, dev
    
    // Twilio
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },

    // Nexah (Côte d'Ivoire)
    nexah: {
      apiKey: process.env.NEXAH_API_KEY,
      senderId: process.env.NEXAH_SENDER_ID || 'BAIBEBALO',
      endpoint: process.env.NEXAH_ENDPOINT || 'https://api.nexah.net/api/v1/sms/send',
    },

    // Orange SMS API
    orange: {
      token: process.env.ORANGE_SMS_TOKEN,
      senderId: process.env.ORANGE_SMS_SENDER_ID || 'BAIBEBALO',
      endpoint: process.env.ORANGE_SMS_ENDPOINT,
    },
  },

  // Email (Nodemailer)
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'BAIBEBALO <noreply@baibebalo.ci>',
  },

  // Paiements Mobile Money
  payment: {
    // Orange Money
    orangeMoney: {
      endpoint: process.env.ORANGE_MONEY_ENDPOINT || 'https://api.orange.com/orange-money-webpay/ci/v1',
      merchantKey: process.env.ORANGE_MONEY_MERCHANT_KEY,
      secret: process.env.ORANGE_MONEY_SECRET,
    },

    // MTN Mobile Money
    mtnMomo: {
      endpoint: process.env.MTN_MOMO_ENDPOINT || 'https://sandbox.momodeveloper.mtn.com',
      apiKey: process.env.MTN_MOMO_API_KEY,
      secret: process.env.MTN_MOMO_SECRET,
      subscriptionKey: process.env.MTN_MOMO_SUBSCRIPTION_KEY,
    },

    // Moov Money
    moovMoney: {
      endpoint: process.env.MOOV_MONEY_ENDPOINT,
      merchantId: process.env.MOOV_MONEY_MERCHANT_ID,
      apiKey: process.env.MOOV_MONEY_API_KEY,
    },
  },

  // AWS S3 (Stockage fichiers)
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'eu-west-1',
    s3Bucket: process.env.AWS_S3_BUCKET || 'baibebalo-uploads',
  },

  // Cloudinary (Alternative pour images)
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  // Google Maps
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
  },

  // Limites et sécurité
  limits: {
    otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5,
    otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 3,
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024, // 5MB
    maxOrderItems: parseInt(process.env.MAX_ORDER_ITEMS, 10) || 50,
  },

  // Sécurité
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15 * 60 * 1000, // 15 min
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },

  // URLs
  urls: {
    api: process.env.API_URL || 'http://localhost:3000',
    frontend: process.env.FRONTEND_URL || 'http://localhost:3001',
    admin: process.env.ADMIN_URL || 'http://localhost:3002',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:3001', 'http://localhost:3002'],
    credentials: true,
  },

  // Livraison
  delivery: {
    baseFee: parseFloat(process.env.DELIVERY_BASE_FEE) || 500, // FCFA
    feePerKm: parseFloat(process.env.DELIVERY_FEE_PER_KM) || 100, // FCFA
    maxRadius: parseFloat(process.env.MAX_DELIVERY_RADIUS) || 10, // km
    livreurCommission: parseFloat(process.env.LIVREUR_COMMISSION) || 70, // %
  },

  // Commission restaurant (par défaut)
  restaurant: {
    defaultCommission: parseFloat(process.env.RESTAURANT_COMMISSION) || 15, // %
  },

  // Programme de fidélité
  loyalty: {
    pointsPerCFA: parseFloat(process.env.LOYALTY_POINTS_PER_CFA) || 0.01, // 1 point par 100 FCFA
    pointsExpiryMonths: parseInt(process.env.LOYALTY_POINTS_EXPIRY_MONTHS, 10) || 6,
  },

  // Parrainage
  referral: {
    referrerReward: parseFloat(process.env.REFERRER_REWARD) || 500, // FCFA
    refereeDiscount: parseFloat(process.env.REFEREE_DISCOUNT) || 50, // %
  },

  // Features toggles
  features: {
    emailEnabled: process.env.FEATURE_EMAIL_ENABLED !== 'false',
    smsEnabled: process.env.FEATURE_SMS_ENABLED !== 'false',
    pushEnabled: process.env.FEATURE_PUSH_ENABLED !== 'false',
    paymentEnabled: process.env.FEATURE_PAYMENT_ENABLED !== 'false',
  },
};

// Validation des configurations critiques en production
if (config.env === 'production') {
  const requiredConfigs = [
    'database.password',
    'jwt.secret',
    'jwt.refreshSecret',
  ];

  const missingConfigs = requiredConfigs.filter(key => {
    const keys = key.split('.');
    let value = config;
    for (const k of keys) {
      value = value[k];
      if (!value) return true;
    }
    return false;
  });

  if (missingConfigs.length > 0) {
    console.error('❌ Configuration manquante en production:', missingConfigs);
    process.exit(1);
  }
}

module.exports = config;
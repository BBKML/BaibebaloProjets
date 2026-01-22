const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../utils/logger');
const { query: dbQuery } = require('../database/db');

/**
 * Middleware pour vérifier les erreurs de validation
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Erreurs de validation', {
      errors: errors.array(),
      path: req.path,
      method: req.method,
      ip: req.ip,
      // Ne pas logger body complet pour sécurité
    });
    
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Erreurs de validation',
        details: errors.array().map(err => ({
          field: err.path || err.param,
          message: err.msg,
          value: err.value,
        })),
      },
    });
  }
  
  next();
};

/**
 * Sanitize et trim tous les champs string
 */
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  next();
};

/**
 * Validation du numéro de téléphone (Côte d'Ivoire)
 */
const phoneValidator = body('phone')
  .trim()
  .matches(/^\+225(0[157]|[4-7])\d{8}$/)
  .withMessage('Format de téléphone invalide. Ex: +2250712345678 ou +22527123456')
  .customSanitizer(value => value.replace(/\s+/g, ''));

/**
 * Validation de l'email avec DNS check optionnel
 */
const emailValidator = (required = false) => {
  const validator = body('email');
  
  if (!required) {
    validator.optional({ nullable: true, checkFalsy: true });
  }
  
  return validator
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Format d\'email invalide')
    .isLength({ max: 255 })
    .withMessage('Email trop long (max 255 caractères)');
};

/**
 * Validation du code OTP
 */
const otpValidator = body('code')
  .trim()
  .isLength({ min: 4, max: 6 })
  .withMessage('Le code doit contenir entre 4 et 6 chiffres')
  .isNumeric()
  .withMessage('Le code doit contenir uniquement des chiffres');

/**
 * Validation UUID avec custom message
 */
const uuidValidator = (field, fieldName) => 
  param(field)
    .isUUID(4)
    .withMessage(`${fieldName || field} doit être un UUID valide`);

/**
 * Validation query UUID
 */
const queryUuidValidator = (field, fieldName) =>
  query(field)
    .optional()
    .isUUID(4)
    .withMessage(`${fieldName || field} doit être un UUID valide`);

/**
 * Validation de coordonnées GPS
 */
const coordinatesValidator = [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude invalide (-90 à 90)')
    .toFloat(),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude invalide (-180 à 180)')
    .toFloat(),
];

/**
 * Validation de coordonnées GPS optionnelles
 */
const optionalCoordinatesValidator = [
  body('latitude')
    .optional({ nullable: true })
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude invalide (-90 à 90)')
    .toFloat(),
  body('longitude')
    .optional({ nullable: true })
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude invalide (-180 à 180)')
    .toFloat(),
];

/**
 * Validation de pagination
 */
const paginationValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page doit être >= 1')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit doit être entre 1 et 100')
    .toInt(),
];

/**
 * Rate limiter général (100 req/15min par IP)
 */
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs || 15 * 60 * 1000,
  max: config.rateLimit.maxRequests || 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Trop de requêtes. Veuillez réessayer dans quelques minutes.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Ne pas limiter les admins
    return req.user?.type === 'admin';
  },
});

/**
 * Rate limiter pour l'authentification (5 req/15min)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT',
      message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
    },
  },
  skipSuccessfulRequests: true, // Ne compter que les échecs
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter pour l'envoi de SMS (1 req/min par téléphone)
 */
const smsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  message: {
    success: false,
    error: {
      code: 'SMS_RATE_LIMIT',
      message: 'Veuillez attendre 1 minute avant de demander un nouveau code.',
    },
  },
  keyGenerator: (req) => req.body.phone || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter pour les uploads (10 req/heure)
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: {
      code: 'UPLOAD_RATE_LIMIT',
      message: 'Trop d\'uploads. Réessayez plus tard.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Validators pour l'inscription client
 */
const registerValidators = [
  phoneValidator,
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le prénom doit contenir entre 2 et 100 caractères')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('Le prénom contient des caractères invalides'),
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('Le nom contient des caractères invalides'),
  emailValidator(false),
  body('referral_code')
    .optional()
    .trim()
    .isLength({ min: 4, max: 20 })
    .withMessage('Code de parrainage invalide'),
  validate,
];

/**
 * Validators pour la vérification OTP
 */
const verifyOtpValidators = [
  phoneValidator,
  otpValidator,
  // first_name et last_name sont optionnels lors de la vérification OTP
  body('first_name')
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le prénom doit contenir entre 2 et 100 caractères')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('Le prénom contient des caractères invalides'),
  body('last_name')
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('Le nom contient des caractères invalides'),
  validate,
];

/**
 * Validators pour la création d'adresse
 */
const createAddressValidators = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Le titre ne doit pas dépasser 100 caractères')
    .matches(/^[a-zA-Z0-9À-ÿ\s'-]+$/)
    .withMessage('Le titre contient des caractères invalides'),
  body('address_line')
    .trim()
    .notEmpty()
    .withMessage('L\'adresse est requise')
    .isLength({ min: 5, max: 500 })
    .withMessage('L\'adresse doit contenir entre 5 et 500 caractères'),
  body('district')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Le quartier ne doit pas dépasser 100 caractères'),
  body('landmark')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Le point de repère ne doit pas dépasser 200 caractères'),
  ...optionalCoordinatesValidator,
  body('is_default')
    .optional()
    .isBoolean()
    .withMessage('is_default doit être un booléen')
    .toBoolean(),
  validate,
];

/**
 * Validators pour la création de commande
 */
const createOrderValidators = [
  body().custom((value, { req }) => {
    if (req.body?.delivery_address_id || req.body?.delivery_address) {
      return true;
    }
    throw new Error('Adresse de livraison requise');
  }),
  body('restaurant_id')
    .isUUID()
    .withMessage('ID restaurant invalide')
    .custom(async (value) => {
      const result = await dbQuery(
        'SELECT id, status, is_open FROM restaurants WHERE id = $1',
        [value]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Restaurant non trouvé');
      }
      
      if (result.rows[0].status !== 'active') {
        throw new Error('Ce restaurant n\'est pas actif');
      }
      
      if (!result.rows[0].is_open) {
        throw new Error('Ce restaurant est actuellement fermé');
      }
      
      return true;
    }),
  body('items')
    .isArray({ min: 1, max: 50 })
    .withMessage('La commande doit contenir entre 1 et 50 articles'),
  body('items.*.menu_item_id')
    .isUUID()
    .withMessage('ID article invalide'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 20 })
    .withMessage('Quantité invalide (1-20 par article)')
    .toInt(),
  body('items.*.selected_options')
    .optional()
    .isObject()
    .withMessage('Options sélectionnées invalides'),
  body('items.*.special_notes')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Note spéciale trop longue (max 200 caractères)'),
  body('delivery_address_id')
    .optional()
    .isUUID()
    .withMessage('ID adresse invalide'),
  body('delivery_address')
    .optional()
    .isObject()
    .withMessage('Adresse de livraison invalide'),
  body('delivery_address.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude invalide')
    .toFloat(),
  body('delivery_address.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude invalide')
    .toFloat(),
  body('payment_method')
    .isIn(['cash', 'orange_money', 'mtn_money', 'moov_money', 'waves'])
    .withMessage('Mode de paiement invalide'),
  body('special_instructions')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Instructions trop longues (max 500 caractères)'),
  body('promo_code')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Code promo invalide')
    .toUpperCase(),
  validate,
];

/**
 * Validators pour l'inscription restaurant
 */
const registerRestaurantValidators = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom est requis')
    .isLength({ min: 3, max: 255 })
    .withMessage('Le nom doit contenir entre 3 et 255 caractères')
    .custom(async (value) => {
      const result = await dbQuery(
        'SELECT id FROM restaurants WHERE LOWER(name) = LOWER($1)',
        [value]
      );
      if (result.rows.length > 0) {
        throw new Error('Ce nom de restaurant existe déjà');
      }
      return true;
    }),
  phoneValidator,
  emailValidator(true),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'),
  body('category')
    .notEmpty()
    .withMessage('La catégorie est requise')
    .isIn(['Restaurant', 'Maquis', 'Fast-food', 'Boulangerie', 'Pâtisserie', 'Grillades', 'Bar-restaurant'])
    .withMessage('Catégorie invalide'),
  body('cuisine_type')
    .optional()
    .trim()
    .isIn(['Sénoufo', 'Ivoirienne', 'Africaine', 'Internationale', 'Fast-food', 'Grillades', 'Pizza', 'Asiatique'])
    .withMessage('Type de cuisine invalide'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description trop longue (max 1000 caractères)'),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('L\'adresse est requise')
    .isLength({ min: 10, max: 500 })
    .withMessage('L\'adresse doit contenir entre 10 et 500 caractères'),
  body('district')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Le quartier ne doit pas dépasser 100 caractères'),
  ...coordinatesValidator,
  body('delivery_radius')
    .optional()
    .isFloat({ min: 1, max: 20 })
    .withMessage('Rayon de livraison invalide (1-20 km)')
    .toFloat(),
  body('mobile_money_number')
    .optional()
    .matches(/^\+225(0[157]|[4-7])\d{8}$/)
    .withMessage('Numéro Mobile Money invalide'),
  body('mobile_money_provider')
    .optional()
    .isIn(['orange_money', 'mtn_money', 'moov_money'])
    .withMessage('Opérateur Mobile Money invalide'),
  validate,
];

/**
 * Validators pour l'ajout d'article au menu
 */
const createMenuItemValidators = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom est requis')
    .isLength({ min: 3, max: 255 })
    .withMessage('Le nom doit contenir entre 3 et 255 caractères'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description trop longue (max 1000 caractères)'),
  body('price')
    .isFloat({ min: 100, max: 1000000 })
    .withMessage('Prix invalide (100 - 1,000,000 FCFA)')
    .toFloat(),
  body('category_id')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('ID catégorie invalide'),
  body('preparation_time')
    .optional()
    .isInt({ min: 5, max: 180 })
    .withMessage('Temps de préparation invalide (5-180 minutes)')
    .toInt(),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options invalides'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags doit être un tableau'),
  body('allergens')
    .optional()
    .isArray()
    .withMessage('Allergènes doit être un tableau'),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantité en stock invalide')
    .toInt(),
  validate,
];

/**
 * Validators pour l'inscription livreur
 */
const registerDeliveryValidators = [
  phoneValidator,
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'),
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('Le prénom est requis')
    .isLength({ min: 2, max: 100 })
    .withMessage('Le prénom doit contenir entre 2 et 100 caractères')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('Le prénom contient des caractères invalides'),
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Le nom est requis')
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('Le nom contient des caractères invalides'),
  body('vehicle_type')
    .isIn(['moto', 'bike', 'foot'])
    .withMessage('Type de véhicule invalide'),
  body('vehicle_plate')
    .if(body('vehicle_type').equals('moto'))
    .trim()
    .notEmpty()
    .withMessage('Plaque d\'immatriculation requise pour les motos')
    .isLength({ min: 3, max: 20 })
    .withMessage('Plaque invalide'),
  body('mobile_money_number')
    .optional()
    .matches(/^\+225(0[157]|[4-7])\d{8}$/)
    .withMessage('Numéro Mobile Money invalide'),
  body('mobile_money_provider')
    .optional()
    .isIn(['orange_money', 'mtn_money', 'moov_money'])
    .withMessage('Opérateur Mobile Money invalide'),
  validate,
];

/**
 * Validators pour la mise à jour de position GPS
 */
const updateLocationValidators = [
  ...coordinatesValidator,
  validate,
];

/**
 * Validators pour l'ajout d'avis
 */
const createReviewValidators = [
  body('order_id')
    .isUUID()
    .withMessage('ID commande invalide'),
  body('restaurant_rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Note restaurant invalide (1-5)')
    .toInt(),
  body('delivery_rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Note livreur invalide (1-5)')
    .toInt(),
  body('food_quality')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Note qualité invalide (1-5)')
    .toInt(),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Commentaire trop long (max 1000 caractères)'),
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Maximum 10 tags'),
  validate,
];

/**
 * Validators pour recherche restaurants
 */
const searchRestaurantsValidators = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Recherche invalide (2-100 caractères)'),
  query('category')
    .optional()
    .trim(),
  query('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .toFloat(),
  query('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .toFloat(),
  query('radius')
    .optional()
    .isFloat({ min: 1, max: 20 })
    .withMessage('Rayon invalide (1-20 km)')
    .toFloat(),
  query('min_rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .toFloat(),
  query('sort')
    .optional()
    .isIn(['distance', 'rating', 'popularity', 'newest'])
    .withMessage('Tri invalide'),
  ...paginationValidator,
  validate,
];

/**
 * Validators pour création de promotion
 */
const createPromotionValidators = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Code promo requis')
    .isLength({ min: 3, max: 50 })
    .withMessage('Code doit contenir entre 3 et 50 caractères')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Code doit contenir uniquement des lettres majuscules et chiffres')
    .toUpperCase(),
  body('type')
    .isIn(['percentage', 'fixed_amount', 'free_delivery', 'loyalty_points'])
    .withMessage('Type de promotion invalide'),
  body('value')
    .isFloat({ min: 0 })
    .withMessage('Valeur invalide')
    .toFloat(),
  body('min_order_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Montant minimum invalide')
    .toFloat(),
  body('valid_from')
    .isISO8601()
    .withMessage('Date de début invalide')
    .toDate(),
  body('valid_until')
    .isISO8601()
    .withMessage('Date de fin invalide')
    .toDate()
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.valid_from)) {
        throw new Error('La date de fin doit être après la date de début');
      }
      return true;
    }),
  body('usage_limit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Limite d\'utilisation invalide')
    .toInt(),
  validate,
];

module.exports = {
  validate,
  sanitizeBody,
  phoneValidator,
  emailValidator,
  otpValidator,
  uuidValidator,
  queryUuidValidator,
  coordinatesValidator,
  optionalCoordinatesValidator,
  paginationValidator,
  generalLimiter,
  authLimiter,
  smsLimiter,
  uploadLimiter,
  registerValidators,
  verifyOtpValidators,
  createAddressValidators,
  createOrderValidators,
  registerRestaurantValidators,
  createMenuItemValidators,
  registerDeliveryValidators,
  updateLocationValidators,
  createReviewValidators,
  searchRestaurantsValidators,
  createPromotionValidators,
};
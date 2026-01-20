const express = require('express');
const { body, query } = require('express-validator');
const { 
  authenticate, 
  authorize, 
  authenticateOptional,
  requireActiveRestaurant 
} = require('../middlewares/auth');
const { 
  validate, 
  registerRestaurantValidators,
  createMenuItemValidators,
  uuidValidator,
  paginationValidator
} = require('../middlewares/validators');
const restaurantController = require('../controllers/restaurant.controller');

const router = express.Router();

/**
 * ═══════════════════════════════════════════════════════════
 * ROUTES PUBLIQUES (sans authentification)
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   GET /api/v1/restaurants
 * @desc    Lister tous les restaurants
 * @access  Public (optional auth pour favoris)
 */
router.get('/', 
  authenticateOptional,
  [
    query('search').optional().trim().isLength({ min: 2, max: 100 }),
    query('category').optional().trim(),
    query('latitude').optional().isFloat({ min: -90, max: 90 }).toFloat(),
    query('longitude').optional().isFloat({ min: -180, max: 180 }).toFloat(),
    query('radius').optional().isFloat({ min: 1, max: 20 }).toFloat(),
    query('min_rating').optional().isFloat({ min: 0, max: 5 }).toFloat(),
    query('sort').optional().isIn(['distance', 'rating', 'popularity', 'newest']),
    paginationValidator,
  ],
  validate,
  restaurantController.getRestaurants
);

/**
 * @route   GET /api/v1/restaurants/:id
 * @desc    Détails d'un restaurant
 * @access  Public (optional auth pour favoris)
 */
router.get('/:id', 
  authenticateOptional,
  uuidValidator('id', 'Restaurant ID'),
  restaurantController.getRestaurantById
);

/**
 * @route   GET /api/v1/restaurants/:id/menu
 * @desc    Menu complet d'un restaurant
 * @access  Public
 */
router.get('/:id/menu', 
  uuidValidator('id', 'Restaurant ID'),
  restaurantController.getRestaurantMenu
);

/**
 * @route   GET /api/v1/restaurants/:id/reviews
 * @desc    Avis d'un restaurant
 * @access  Public
 */
router.get('/:id/reviews', 
  uuidValidator('id', 'Restaurant ID'),
  paginationValidator,
  restaurantController.getRestaurantReviews
);

/**
 * @route   POST /api/v1/restaurants/register
 * @desc    Inscription d'un nouveau restaurant
 * @access  Public
 */
router.post('/register', 
  registerRestaurantValidators,
  restaurantController.registerRestaurant
);

/**
 * ═══════════════════════════════════════════════════════════
 * ROUTES RESTAURANT AUTHENTIFIÉ (avec /me)
 * ═══════════════════════════════════════════════════════════
 */

// Toutes les routes /me nécessitent authentification restaurant
router.use('/me', authenticate);
router.use('/me', authorize('restaurant'));
router.use('/me', requireActiveRestaurant);

/**
 * @route   GET /api/v1/restaurants/me
 * @desc    Profil du restaurant connecté
 * @access  Private (Restaurant)
 */
router.get('/me', restaurantController.getMyProfile);

/**
 * @route   PUT /api/v1/restaurants/me
 * @desc    Mettre à jour le profil
 * @access  Private (Restaurant)
 */
router.put('/me', 
  [
    body('name').optional().trim().isLength({ min: 3, max: 255 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('phone').optional().matches(/^\+225(0[1457]|[4-7])\d{8}$/),
    body('email').optional().isEmail().normalizeEmail(),
    body('address').optional().trim().isLength({ min: 10, max: 500 }),
    body('district').optional().trim().isLength({ max: 100 }),
    body('latitude').optional().isFloat({ min: -90, max: 90 }).toFloat(),
    body('longitude').optional().isFloat({ min: -180, max: 180 }).toFloat(),
    body('delivery_radius').optional().isFloat({ min: 1, max: 20 }).toFloat(),
    body('cuisine_type').optional().trim(),
    body('mobile_money_number').optional().matches(/^\+225(0[1457]|[4-7])\d{8}$/),
    body('mobile_money_provider').optional().isIn(['orange_money', 'mtn_money', 'moov_money']),
  ],
  validate,
  restaurantController.updateMyProfile
);

/**
 * @route   PUT /api/v1/restaurants/me/toggle-status
 * @desc    Ouvrir/fermer le restaurant
 * @access  Private (Restaurant)
 */
router.put('/me/toggle-status', 
  [
    body('is_open').isBoolean().withMessage('is_open doit être un booléen')
  ],
  validate,
  restaurantController.toggleOpenStatus
);

/**
 * ═══════════════════════════════════════════════════════════
 * GESTION DES CATÉGORIES DE MENU
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   GET /api/v1/restaurants/me/categories
 * @desc    Lister les catégories du menu
 * @access  Private (Restaurant)
 */
router.get('/me/categories', restaurantController.getMyCategories);

/**
 * @route   POST /api/v1/restaurants/me/categories
 * @desc    Créer une catégorie de menu
 * @access  Private (Restaurant)
 */
router.post('/me/categories', 
  [
    body('name').trim().notEmpty().isLength({ min: 2, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('display_order').optional().isInt({ min: 0 }),
  ],
  validate,
  restaurantController.createMenuCategory
);

/**
 * @route   PUT /api/v1/restaurants/me/categories/:categoryId
 * @desc    Mettre à jour une catégorie
 * @access  Private (Restaurant)
 */
router.put('/me/categories/:categoryId', 
  uuidValidator('categoryId', 'Category ID'),
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('display_order').optional().isInt({ min: 0 }),
  ],
  validate,
  restaurantController.updateMenuCategory
);

/**
 * @route   DELETE /api/v1/restaurants/me/categories/:categoryId
 * @desc    Supprimer une catégorie (si vide)
 * @access  Private (Restaurant)
 */
router.delete('/me/categories/:categoryId', 
  uuidValidator('categoryId', 'Category ID'),
  restaurantController.deleteMenuCategory
);

/**
 * ═══════════════════════════════════════════════════════════
 * GESTION DU MENU
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   GET /api/v1/restaurants/me/menu
 * @desc    Menu complet du restaurant connecté
 * @access  Private (Restaurant)
 */
router.get('/me/menu', restaurantController.getMyMenu);

/**
 * @route   POST /api/v1/restaurants/me/menu
 * @desc    Ajouter un article au menu
 * @access  Private (Restaurant)
 */
router.post('/me/menu', 
  createMenuItemValidators,
  restaurantController.createMenuItem
);

/**
 * @route   PUT /api/v1/restaurants/me/menu/:itemId
 * @desc    Mettre à jour un article du menu
 * @access  Private (Restaurant)
 */
router.put('/me/menu/:itemId', 
  uuidValidator('itemId', 'Menu Item ID'),
  [
    body('name').optional().trim().isLength({ min: 3, max: 255 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('price').optional().isFloat({ min: 100 }).toFloat(),
    body('category_id').optional().isUUID(),
    body('preparation_time').optional().isInt({ min: 5, max: 180 }).toInt(),
    body('is_available').optional().isBoolean(),
    body('stock_quantity').optional().isInt({ min: 0 }).toInt(),
  ],
  validate,
  restaurantController.updateMenuItem
);

/**
 * @route   DELETE /api/v1/restaurants/me/menu/:itemId
 * @desc    Supprimer un article du menu
 * @access  Private (Restaurant)
 */
router.delete('/me/menu/:itemId', 
  uuidValidator('itemId', 'Menu Item ID'),
  restaurantController.deleteMenuItem
);

/**
 * @route   PUT /api/v1/restaurants/me/menu/:itemId/toggle-availability
 * @desc    Activer/désactiver un article
 * @access  Private (Restaurant)
 */
router.put('/me/menu/:itemId/toggle-availability', 
  uuidValidator('itemId', 'Menu Item ID'),
  restaurantController.toggleItemAvailability
);

/**
 * ═══════════════════════════════════════════════════════════
 * GESTION DES COMMANDES
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   GET /api/v1/restaurants/me/orders
 * @desc    Commandes du restaurant
 * @access  Private (Restaurant)
 */
router.get('/me/orders', 
  [
    query('status').optional().isIn(['new', 'accepted', 'preparing', 'ready', 'cancelled']),
    paginationValidator,
  ],
  validate,
  restaurantController.getMyOrders
);

/**
 * @route   GET /api/v1/restaurants/me/orders/:orderId
 * @desc    Détails d'une commande
 * @access  Private (Restaurant)
 */
router.get('/me/orders/:orderId', 
  uuidValidator('orderId', 'Order ID'),
  restaurantController.getMyOrderById
);

/**
 * ═══════════════════════════════════════════════════════════
 * STATISTIQUES & RAPPORTS
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   GET /api/v1/restaurants/me/statistics
 * @desc    Statistiques du restaurant
 * @access  Private (Restaurant)
 */
router.get('/me/statistics', 
  [
    query('period').optional().isIn(['today', 'week', 'month', 'year']),
  ],
  validate,
  restaurantController.getMyStatistics
);

/**
 * @route   GET /api/v1/restaurants/me/earnings
 * @desc    Gains du restaurant
 * @access  Private (Restaurant)
 */
router.get('/me/earnings', 
  [
    query('start_date').optional().isISO8601().toDate(),
    query('end_date').optional().isISO8601().toDate(),
  ],
  validate,
  restaurantController.getMyEarnings
);

/**
 * @route   GET /api/v1/restaurants/me/reviews
 * @desc    Avis reçus
 * @access  Private (Restaurant)
 */
router.get('/me/reviews', 
  paginationValidator,
  restaurantController.getMyReviews
);

/**
 * @route   PUT /api/v1/restaurants/me/reviews/:reviewId/respond
 * @desc    Répondre à un avis
 * @access  Private (Restaurant)
 */
router.put('/me/reviews/:reviewId/respond',
  uuidValidator('reviewId', 'Review ID'),
  [
    body('response')
      .trim()
      .isLength({ min: 5, max: 500 })
      .withMessage('Réponse requise (5-500 caractères)'),
  ],
  validate,
  restaurantController.respondToReview
);

/**
 * @route   GET /api/v1/restaurants/me/export
 * @desc    Exporter les données du restaurant (RGPD)
 * @access  Private (Restaurant)
 * @query   format - Format d'export: 'json' (défaut) ou 'csv'
 */
router.get('/me/export',
  [
    query('format')
      .optional()
      .isIn(['json', 'csv'])
      .withMessage('Format invalide (json ou csv)'),
  ],
  validate,
  restaurantController.exportRestaurantData
);

/**
 * ═══════════════════════════════════════════════════════════
 * DEMANDES DE RETRAIT
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   POST /api/v1/restaurants/me/payout-request
 * @desc    Demander un retrait
 * @access  Private (Restaurant)
 */
router.post('/me/payout-request', 
  [
    body('amount').isFloat({ min: 5000 }).withMessage('Montant minimum: 5000 FCFA'),
  ],
  validate,
  restaurantController.requestPayout
);

/**
 * @route   GET /api/v1/restaurants/me/payout-requests
 * @desc    Historique des retraits
 * @access  Private (Restaurant)
 */
router.get('/me/payout-requests', 
  paginationValidator,
  restaurantController.getMyPayoutRequests
);

/**
 * ═══════════════════════════════════════════════════════════
 * PROMOTIONS & MARKETING
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   GET /api/v1/restaurants/me/promotions
 * @desc    Lister les promotions du restaurant
 * @access  Private (Restaurant)
 */
router.get('/me/promotions',
  paginationValidator,
  restaurantController.getMyPromotions
);

/**
 * @route   POST /api/v1/restaurants/me/promotions
 * @desc    Créer une promotion
 * @access  Private (Restaurant)
 */
router.post('/me/promotions',
  [
    body('type')
      .isIn(['percentage', 'fixed_amount', 'free_delivery', 'bundle'])
      .withMessage('Type de promotion invalide'),
    body('value')
      .isFloat({ min: 0 })
      .withMessage('Valeur invalide')
      .toFloat(),
    body('menu_item_id')
      .optional()
      .isUUID()
      .withMessage('ID article invalide'),
    body('valid_from')
      .isISO8601()
      .toDate()
      .withMessage('Date de début invalide'),
    body('valid_until')
      .isISO8601()
      .toDate()
      .withMessage('Date de fin invalide'),
    body('min_order_amount')
      .optional()
      .isFloat({ min: 0 })
      .toFloat(),
    body('usage_limit')
      .optional()
      .isInt({ min: 1 })
      .toInt(),
    body('code')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .matches(/^[A-Z0-9_-]+$/)
      .withMessage('Code promo invalide (lettres majuscules, chiffres, tirets et underscores)'),
  ],
  validate,
  restaurantController.createPromotion
);

/**
 * @route   PUT /api/v1/restaurants/me/promotions/:promotionId
 * @desc    Mettre à jour une promotion
 * @access  Private (Restaurant)
 */
router.put('/me/promotions/:promotionId',
  uuidValidator('promotionId', 'Promotion ID'),
  [
    body('value')
      .optional()
      .isFloat({ min: 0 })
      .toFloat(),
    body('valid_from')
      .optional()
      .isISO8601()
      .toDate(),
    body('valid_until')
      .optional()
      .isISO8601()
      .toDate(),
    body('is_active')
      .optional()
      .isBoolean(),
  ],
  validate,
  restaurantController.updatePromotion
);

/**
 * @route   DELETE /api/v1/restaurants/me/promotions/:promotionId
 * @desc    Supprimer une promotion
 * @access  Private (Restaurant)
 */
router.delete('/me/promotions/:promotionId',
  uuidValidator('promotionId', 'Promotion ID'),
  restaurantController.deletePromotion
);

/**
 * @route   PUT /api/v1/restaurants/me/promotions/:promotionId/toggle
 * @desc    Activer/désactiver une promotion
 * @access  Private (Restaurant)
 */
router.put('/me/promotions/:promotionId/toggle',
  uuidValidator('promotionId', 'Promotion ID'),
  restaurantController.togglePromotion
);

module.exports = router;
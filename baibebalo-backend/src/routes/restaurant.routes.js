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
const { uploadMiddleware } = require('../services/upload.service');
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
    query('cuisine_type').optional().trim(),
    query('latitude').optional().isFloat({ min: -90, max: 90 }).toFloat(),
    query('longitude').optional().isFloat({ min: -180, max: 180 }).toFloat(),
    query('radius').optional().isFloat({ min: 1, max: 20 }).toFloat(),
    query('min_rating').optional().isFloat({ min: 0, max: 5 }).toFloat(),
    query('min_price').optional().isFloat({ min: 0 }).toFloat(),
    query('max_price').optional().isFloat({ min: 0 }).toFloat(),
    query('max_delivery_time').optional().isFloat({ min: 1 }).toFloat(),
    query('free_delivery').optional().isBoolean().toBoolean(),
    query('promotions').optional().isBoolean().toBoolean(),
    query('mobile_money').optional().isBoolean().toBoolean(),
    query('new_restaurants').optional().isBoolean().toBoolean(),
    query('tags').optional(),
    query('sort').optional().isIn(['distance', 'rating', 'popularity', 'newest']),
    paginationValidator,
  ],
  validate,
  restaurantController.getRestaurants
);

/**
 * @route   GET /api/v1/restaurants/promotions/active
 * @desc    Obtenir les promotions actives pour les clients
 * @access  Public
 * IMPORTANT: Cette route doit être AVANT /:id pour éviter les conflits
 */
router.get('/promotions/active', restaurantController.getActivePromotions);

/**
 * @route   GET /api/v1/restaurants/categories
 * @desc    Obtenir les catégories de restaurants disponibles
 * @access  Public
 * IMPORTANT: Cette route doit être AVANT /:id pour éviter les conflits
 */
router.get('/categories', restaurantController.getCategories);

/**
 * @route   GET /api/v1/restaurants/popular-searches
 * @desc    Obtenir les recherches populaires (plats les plus commandés)
 * @access  Public
 * IMPORTANT: Cette route doit être AVANT /:id pour éviter les conflits
 */
router.get('/popular-searches', 
  [
    query('limit').optional().isInt({ min: 1, max: 20 }).toInt(),
  ],
  validate,
  restaurantController.getPopularSearches
);

/**
 * @route   POST /api/v1/restaurants/register
 * @desc    Inscription d'un nouveau restaurant
 * @access  Public
 * IMPORTANT: Cette route doit être AVANT /:id pour éviter les conflits
 */
router.post('/register', 
  uploadMiddleware.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
    { name: 'id_card_front', maxCount: 1 },
    { name: 'id_card_back', maxCount: 1 },
    { name: 'document_rccm', maxCount: 1 },
    { name: 'document_id', maxCount: 1 },
    { name: 'document_facade', maxCount: 1 },
    { name: 'document_menu', maxCount: 1 },
    { name: 'document_hygiene', maxCount: 1 },
    { name: 'photos', maxCount: 5 },
    { name: 'dish_photos', maxCount: 10 },
  ]),
  registerRestaurantValidators,
  restaurantController.registerRestaurant
);

/**
 * ═══════════════════════════════════════════════════════════
 * ROUTES RESTAURANT AUTHENTIFIÉ (avec /me)
 * ═══════════════════════════════════════════════════════════
 * IMPORTANT: Toutes les routes /me doivent être AVANT /:id pour éviter les conflits
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
  uploadMiddleware.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
    { name: 'photos', maxCount: 10 },
  ]),
  [
    body('name').optional({ nullable: true, checkFalsy: true }).trim().isLength({ min: 3, max: 255 }),
    body('description').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 1000 }),
    body('phone').optional({ nullable: true, checkFalsy: true }).trim().custom((value) => {
      if (!value || value === '') return true; // Accepter les valeurs vides
      return /^\+225(0[1457]|[4-7])\d{8}$/.test(value);
    }).withMessage('Format de téléphone invalide. Ex: +2250712345678'),
    body('email').optional({ nullable: true, checkFalsy: true }).isEmail().normalizeEmail(),
    body('address').optional({ nullable: true, checkFalsy: true }).trim().custom((value) => {
      if (!value || value === '') return true; // Accepter les valeurs vides
      return value.length >= 10 && value.length <= 500;
    }).withMessage('L\'adresse doit contenir entre 10 et 500 caractères'),
    body('district').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }),
    body('latitude').optional({ nullable: true, checkFalsy: true }).isFloat({ min: -90, max: 90 }).toFloat(),
    body('longitude').optional({ nullable: true, checkFalsy: true }).isFloat({ min: -180, max: 180 }).toFloat(),
    body('delivery_radius').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 1, max: 20 }).toFloat(),
    body('cuisine_type').optional({ nullable: true, checkFalsy: true }).trim(),
    body('mobile_money_number').optional({ nullable: true, checkFalsy: true }).trim().custom((value) => {
      if (!value || value === '') return true; // Accepter les valeurs vides
      return /^\+225(0[1457]|[4-7])\d{8}$/.test(value);
    }).withMessage('Format de Mobile Money invalide. Ex: +2250712345678'),
    body('mobile_money_provider').optional({ nullable: true, checkFalsy: true }).isIn(['orange_money', 'mtn_money', 'moov_money']),
    body('account_holder_name').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 255 }),
    body('bank_rib').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }),
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
  uploadMiddleware.single('photo'),
  createMenuItemValidators,
  restaurantController.createMenuItem
);

/**
 * @route   PUT /api/v1/restaurants/me/menu/:itemId
 * @desc    Mettre à jour un article du menu
 * @access  Private (Restaurant)
 */
router.put('/me/menu/:itemId', 
  uploadMiddleware.single('photo'),
  uuidValidator('itemId', 'Menu Item ID'),
  [
    body('name').optional().trim().isLength({ min: 3, max: 255 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('price').optional().isFloat({ min: 100 }).toFloat(),
    body('category_id').optional().isUUID(),
    body('preparation_time').optional().isInt({ min: 5, max: 180 }).toInt(),
    body('is_available').optional().isBoolean(),
    // stock_quantity peut être null (stock illimité) ou un entier >= 0
    body('stock_quantity').optional({ nullable: true }).custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      const intVal = parseInt(value, 10);
      if (isNaN(intVal) || intVal < 0) {
        throw new Error('stock_quantity doit être un entier positif ou null');
      }
      return true;
    }),
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
 * PROMOTIONS SUR LES PLATS
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   PUT /api/v1/restaurants/me/menu/:itemId/promotion
 * @desc    Activer/désactiver une promotion sur un plat
 * @access  Private (Restaurant)
 * 
 * @body {
 *   is_promotional: boolean,
 *   discount_type: 'percentage' | 'fixed_amount',
 *   discount_value: number,
 *   promotion_start?: Date,
 *   promotion_end?: Date,
 *   promotion_description?: string
 * }
 * 
 * Exemple pourcentage: { is_promotional: true, discount_type: 'percentage', discount_value: 20 }
 * => Réduction de 20%, prix 3000 FCFA devient 2400 FCFA
 * 
 * Exemple montant fixe: { is_promotional: true, discount_type: 'fixed_amount', discount_value: 300 }
 * => Réduction de 300 FCFA, prix 1500 FCFA devient 1200 FCFA
 */
router.put('/me/menu/:itemId/promotion', 
  uuidValidator('itemId', 'Menu Item ID'),
  [
    body('is_promotional').isBoolean().withMessage('is_promotional doit être un booléen'),
    body('discount_type').optional().isIn(['percentage', 'fixed_amount'])
      .withMessage('discount_type doit être "percentage" ou "fixed_amount"'),
    body('discount_value').optional().isFloat({ min: 0 })
      .withMessage('discount_value doit être un nombre positif'),
  ],
  validate,
  restaurantController.setItemPromotion
);

/**
 * @route   GET /api/v1/restaurants/me/menu/promotional
 * @desc    Obtenir tous les plats en promotion
 * @access  Private (Restaurant)
 */
router.get('/me/menu/promotional', restaurantController.getPromotionalItems);

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
    query('status').optional().isIn(['new', 'pending', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled']),
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
    query('period').optional().isIn(['today', 'week', 'month', 'year', 'custom', 'all']),
    query('start_date').optional().isISO8601().toDate(),
    query('end_date').optional().isISO8601().toDate(),
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

/**
 * ═══════════════════════════════════════════════════════════
 * SUPPORT & TICKETS
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   POST /api/v1/restaurants/me/support/tickets
 * @desc    Créer un ticket de support (signaler un problème)
 * @access  Private (Restaurant)
 */
router.post('/me/support/tickets',
  [
    body('type')
      .isIn(['orders', 'payments', 'app', 'account', 'other'])
      .withMessage('Type de problème invalide'),
    body('description')
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Description requise (10-2000 caractères)'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Email invalide'),
  ],
  validate,
  restaurantController.createSupportTicket
);

/**
 * @route   GET /api/v1/restaurants/me/support/tickets
 * @desc    Lister les tickets de support du restaurant
 * @access  Private (Restaurant)
 */
router.get('/me/support/tickets',
  paginationValidator,
  restaurantController.getMySupportTickets
);

/**
 * @route   GET /api/v1/restaurants/me/support/tickets/:ticketId
 * @desc    Détails d'un ticket de support
 * @access  Private (Restaurant)
 */
router.get('/me/support/tickets/:ticketId',
  uuidValidator('ticketId', 'Ticket ID'),
  restaurantController.getSupportTicketDetails
);

/**
 * @route   POST /api/v1/restaurants/me/support/tickets/:ticketId/messages
 * @desc    Envoyer un message dans un ticket existant (style WhatsApp)
 * @access  Private (Restaurant)
 */
router.post('/me/support/tickets/:ticketId/messages',
  uuidValidator('ticketId', 'Ticket ID'),
  [
    body('message')
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Message requis (1-2000 caractères)'),
  ],
  validate,
  restaurantController.addMessageToTicket
);

/**
 * ═══════════════════════════════════════════════════════════
 * ROUTES PUBLIQUES AVEC PARAMÈTRE ID (doivent être APRÈS /me)
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   GET /api/v1/restaurants/:id
 * @desc    Détails d'un restaurant
 * @access  Public (optional auth pour favoris)
 * IMPORTANT: Cette route doit être APRÈS toutes les routes /me pour éviter les conflits
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
 * IMPORTANT: Cette route doit être APRÈS /me/menu pour éviter les conflits
 */
router.get('/:id/menu', 
  uuidValidator('id', 'Restaurant ID'),
  restaurantController.getRestaurantMenu
);

/**
 * @route   GET /api/v1/restaurants/:id/suggestions
 * @desc    Suggestions intelligentes de plats complémentaires
 * @access  Public (authentification optionnelle pour personnalisation)
 * 
 * @query {string} cart_item_ids - IDs des items dans le panier (séparés par virgule)
 * @query {number} limit - Nombre max de suggestions (défaut: 5)
 * 
 * Suggestions basées sur:
 * - Items fréquemment achetés ensemble
 * - Items populaires du restaurant
 * - Complémentarité (plat → boisson, dessert)
 * - Historique de l'utilisateur (si authentifié)
 */
router.get('/:id/suggestions', 
  uuidValidator('id', 'Restaurant ID'),
  restaurantController.getSuggestedItems
);

/**
 * @route   GET /api/v1/restaurants/:id/reviews
 * @desc    Avis d'un restaurant
 * @access  Public
 * IMPORTANT: Cette route doit être APRÈS /me/reviews pour éviter les conflits
 */
router.get('/:id/reviews', 
  uuidValidator('id', 'Restaurant ID'),
  paginationValidator,
  restaurantController.getRestaurantReviews
);

module.exports = router;
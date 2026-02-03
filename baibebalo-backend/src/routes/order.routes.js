const express = require('express');
const { body, query } = require('express-validator');
const { authenticate, authorize } = require('../middlewares/auth');
const { 
  validate, 
  createOrderValidators,
  uuidValidator,
  paginationValidator 
} = require('../middlewares/validators');
const orderController = require('../controllers/order.controller');

const router = express.Router();

// Toutes les routes nécessitent authentification
router.use(authenticate);

/**
 * ═══════════════════════════════════════════════════════════
 * ROUTES CLIENT (Utilisateurs)
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   POST /api/v1/orders/calculate-fees
 * @desc    Calculer les frais de livraison et de service
 * @access  Private (User)
 */
router.post('/calculate-fees',
  authorize('user', 'client'),
  [
    body('restaurant_id').isUUID().withMessage('ID restaurant invalide'),
    body('delivery_address_id').isUUID().withMessage('ID adresse invalide'),
    body('subtotal').toFloat().isFloat({ min: 0 }).withMessage('Sous-total invalide'),
  ],
  validate,
  orderController.calculateFees
);

/**
 * @route   POST /api/v1/orders
 * @desc    Créer une nouvelle commande
 * @access  Private (User)
 */
router.post('/', 
  authorize('user', 'client'), // Accepter 'user' et 'client' (synonymes)
  createOrderValidators, // ✅ Validation complète (définie en Phase 3)
  orderController.createOrder
);

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Détails d'une commande
 * @access  Private (User, Restaurant, Delivery, Admin)
 */
router.get('/:id', 
  uuidValidator('id', 'Order ID'),
  orderController.getOrderById
);

/**
 * @route   GET /api/v1/orders/:id/track
 * @desc    Suivre une commande en temps réel
 * @access  Private (User, Restaurant, Delivery)
 */
router.get('/:id/track',
  uuidValidator('id', 'Order ID'),
  orderController.trackOrder
);

/**
 * @route   PUT /api/v1/orders/:id/cancel
 * @desc    Annuler une commande
 * @access  Private (User)
 */
router.put('/:id/cancel', 
  authorize('user', 'client'), // Accepter 'user' et 'client' (synonymes)
  uuidValidator('id', 'Order ID'),
  [
    body('reason')
      .trim()
      .isLength({ min: 5, max: 500 })
      .withMessage('Raison requise (5-500 caractères)'),
    body('cancellation_type')
      .optional()
      .isIn(['change_mind', 'wrong_order', 'too_long', 'other'])
      .withMessage('Type d\'annulation invalide'),
  ],
  validate,
  orderController.cancelOrder
);

/**
 * @route   POST /api/v1/orders/:id/review
 * @desc    Laisser un avis sur la commande
 * @access  Private (User)
 */
router.post('/:id/review', 
  authorize('user', 'client'), // Accepter 'user' et 'client' (synonymes)
  uuidValidator('id', 'Order ID'),
  [
    body('restaurant_rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Note restaurant invalide (1-5)')
      .toInt(),
    body('delivery_rating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Note livraison invalide (1-5)')
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
  ],
  validate,
  orderController.reviewOrder
);

/**
 * @route   POST /api/v1/orders/:id/report
 * @desc    Signaler un problème avec la commande
 * @access  Private (User)
 */
router.post('/:id/report',
  authorize('user', 'client'), // Accepter 'user' et 'client' (synonymes)
  uuidValidator('id', 'Order ID'),
  [
    body('issue_type')
      .isIn(['wrong_items', 'missing_items', 'quality_issue', 'late_delivery', 'damaged', 'other'])
      .withMessage('Type de problème invalide'),
    body('description')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Description requise (10-1000 caractères)'),
  ],
  validate,
  orderController.reportIssue
);

/**
 * ═══════════════════════════════════════════════════════════
 * ROUTES RESTAURANT
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   PUT /api/v1/orders/:id/accept
 * @desc    Accepter une commande
 * @access  Private (Restaurant)
 */
router.put('/:id/accept', 
  authorize('restaurant'),
  uuidValidator('id', 'Order ID'),
  [
    body('estimated_preparation_time')
      .optional()
      .isInt({ min: 5, max: 180 })
      .withMessage('Temps de préparation invalide (5-180 minutes)')
      .toInt(),
  ],
  validate,
  orderController.acceptOrder
);

/**
 * @route   PUT /api/v1/orders/:id/reject
 * @desc    Rejeter une commande
 * @access  Private (Restaurant)
 */
router.put('/:id/reject', 
  authorize('restaurant'),
  uuidValidator('id', 'Order ID'),
  [
    body('reason')
      .trim()
      .notEmpty()
      .isLength({ min: 5, max: 500 })
      .withMessage('Raison requise (5-500 caractères)'),
    body('rejection_type')
      .optional()
      .isIn(['out_of_stock', 'closing_soon', 'too_busy', 'other'])
      .withMessage('Type de rejet invalide'),
  ],
  validate,
  orderController.rejectOrder
);

/**
 * @route   PUT /api/v1/orders/:id/preparing
 * @desc    Marquer la commande en préparation
 * @access  Private (Restaurant)
 */
router.put('/:id/preparing',
  authorize('restaurant'),
  uuidValidator('id', 'Order ID'),
  orderController.markOrderPreparing
);

/**
 * @route   PUT /api/v1/orders/:id/ready
 * @desc    Marquer la commande prête
 * @access  Private (Restaurant)
 */
router.put('/:id/ready', 
  authorize('restaurant'),
  uuidValidator('id', 'Order ID'),
  orderController.markOrderReady
);

/**
 * ═══════════════════════════════════════════════════════════
 * ROUTES LIVREUR
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   PUT /api/v1/orders/:id/pickup
 * @desc    Confirmer récupération de la commande
 * @access  Private (Delivery Person)
 */
router.put('/:id/pickup',
  authorize('delivery_person'),
  uuidValidator('id', 'Order ID'),
  [
    body('pickup_code')
      .optional()
      .trim()
      .isLength({ min: 4, max: 6 })
      .withMessage('Code de récupération invalide'),
  ],
  validate,
  orderController.confirmPickup
);

/**
 * @route   PUT /api/v1/orders/:id/delivering
 * @desc    Marquer la commande en cours de livraison
 * @access  Private (Delivery Person)
 */
router.put('/:id/delivering',
  authorize('delivery_person'),
  uuidValidator('id', 'Order ID'),
  orderController.markOrderDelivering
);

/**
 * @route   PUT /api/v1/orders/:id/deliver
 * @desc    Confirmer livraison de la commande
 * @access  Private (Delivery Person)
 */
router.put('/:id/deliver',
  authorize('delivery_person'),
  uuidValidator('id', 'Order ID'),
  [
    body('delivery_code')
      .optional()
      .trim()
      .isLength({ min: 4, max: 6 })
      .withMessage('Code de livraison invalide'),
    body('delivery_proof')
      .optional()
      .trim()
      .isURL()
      .withMessage('Preuve de livraison invalide (URL image)'),
  ],
  validate,
  orderController.confirmDelivery
);

/**
 * ═══════════════════════════════════════════════════════════
 * PAIEMENT
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   POST /api/v1/orders/:id/payment/initiate
 * @desc    Initier un paiement mobile money
 * @access  Private (User)
 */
router.post('/:id/payment/initiate',
  authorize('user', 'client'), // Accepter 'user' et 'client' (synonymes)
  uuidValidator('id', 'Order ID'),
  [
    body('payment_method')
      .isIn(['orange_money', 'mtn_money', 'moov_money'])
      .withMessage('Mode de paiement invalide'),
    body('phone_number')
      .trim()
      .matches(/^\+225(0[1457]|[4-7])\d{8}$/)
      .withMessage('Numéro de téléphone invalide'),
  ],
  validate,
  orderController.initiatePayment
);

/**
 * @route   GET /api/v1/orders/:id/payment/status
 * @desc    Vérifier le statut du paiement
 * @access  Private (User, Restaurant, Delivery)
 */
router.get('/:id/payment/status',
  uuidValidator('id', 'Order ID'),
  orderController.checkPaymentStatus
);

/**
 * ═══════════════════════════════════════════════════════════
 * CHAT CLIENT ↔ RESTAURANT
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   GET /api/v1/orders/:id/messages
 * @desc    Récupérer les messages d'une commande
 * @access  Private (User, Restaurant)
 */
router.get('/:id/messages',
  authorize('user', 'client', 'restaurant'),
  uuidValidator('id', 'Order ID'),
  orderController.getOrderMessages
);

/**
 * @route   POST /api/v1/orders/:id/messages
 * @desc    Envoyer un message sur une commande
 * @access  Private (User, Restaurant)
 */
router.post('/:id/messages',
  authorize('user', 'client', 'restaurant'),
  uuidValidator('id', 'Order ID'),
  [
    body('message')
      .trim()
      .notEmpty()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message requis (1-1000 caractères)'),
  ],
  validate,
  orderController.sendOrderMessage
);

/**
 * @route   PUT /api/v1/orders/:id/messages/read
 * @desc    Marquer les messages comme lus
 * @access  Private (User, Restaurant)
 */
router.put('/:id/messages/read',
  authorize('user', 'client', 'restaurant'),
  uuidValidator('id', 'Order ID'),
  orderController.markMessagesRead
);

/**
 * ═══════════════════════════════════════════════════════════
 * RECHERCHE & FILTRES
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   GET /api/v1/orders/search
 * @desc    Rechercher des commandes
 * @access  Private (Admin, Restaurant, Delivery)
 */
router.get('/search',
  authorize('admin', 'restaurant', 'delivery_person'),
  [
    query('order_number').optional().trim(),
    query('user_phone').optional().trim(),
    query('status').optional().isIn(['new', 'accepted', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled']),
    query('start_date').optional().isISO8601().toDate(),
    query('end_date').optional().isISO8601().toDate(),
    paginationValidator,
  ],
  validate,
  orderController.searchOrders
);

module.exports = router;
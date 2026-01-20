const express = require('express');
const { body, query } = require('express-validator');
const { 
  authenticate, 
  authorize, 
  requireActiveDelivery 
} = require('../middlewares/auth');
const { 
  validate, 
  registerDeliveryValidators,
  updateLocationValidators,
  uuidValidator,
  paginationValidator 
} = require('../middlewares/validators');
const deliveryController = require('../controllers/delivery.controller');

const router = express.Router();

/**
 * ═══════════════════════════════════════════════════════════
 * INSCRIPTION LIVREUR (Public)
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   POST /api/v1/delivery/register
 * @desc    Inscription d'un nouveau livreur
 * @access  Public
 */
router.post('/register', 
  registerDeliveryValidators, // Défini en Phase 3
  deliveryController.registerDeliveryPerson
);

/**
 * ═══════════════════════════════════════════════════════════
 * ROUTES LIVREUR AUTHENTIFIÉ
 * ═══════════════════════════════════════════════════════════
 */

// Toutes les routes suivantes nécessitent authentification livreur
router.use(authenticate);
router.use(authorize('delivery_person')); // ✅ CORRIGÉ : 'delivery_person' au lieu de 'delivery'
router.use(requireActiveDelivery); // Vérifier que le livreur est actif

/**
 * @route   GET /api/v1/delivery/me
 * @desc    Profil du livreur connecté
 * @access  Private (Delivery Person)
 */
router.get('/me', deliveryController.getMyProfile);

/**
 * @route   PUT /api/v1/delivery/me
 * @desc    Mettre à jour le profil
 * @access  Private (Delivery Person)
 */
router.put('/me',
  [
    body('first_name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Prénom invalide'),
    body('last_name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Nom invalide'),
    body('vehicle_type')
      .optional()
      .isIn(['moto', 'bike', 'foot'])
      .withMessage('Type de véhicule invalide'),
    body('vehicle_plate')
      .optional()
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('Plaque d\'immatriculation invalide'),
    body('mobile_money_number')
      .optional()
      .matches(/^\+225(0[1457]|[4-7])\d{8}$/)
      .withMessage('Numéro Mobile Money invalide'),
    body('mobile_money_provider')
      .optional()
      .isIn(['orange_money', 'mtn_money', 'moov_money'])
      .withMessage('Opérateur Mobile Money invalide'),
  ],
  validate,
  deliveryController.updateMyProfile
);

/**
 * ═══════════════════════════════════════════════════════════
 * STATUT & DISPONIBILITÉ
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   PUT /api/v1/delivery/status
 * @desc    Changer le statut de disponibilité
 * @access  Private (Delivery Person)
 */
router.put('/status', 
  [
    body('delivery_status')
      .isIn(['available', 'busy', 'offline'])
      .withMessage('Statut invalide (available, busy, offline)'),
  ],
  validate,
  deliveryController.updateDeliveryStatus
);

/**
 * @route   PUT /api/v1/delivery/location
 * @desc    Mettre à jour la position GPS
 * @access  Private (Delivery Person)
 */
router.put('/location', 
  updateLocationValidators, // Défini en Phase 3
  deliveryController.updateLocation
);

/**
 * ═══════════════════════════════════════════════════════════
 * GESTION DES COMMANDES
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   GET /api/v1/delivery/available-orders
 * @desc    Obtenir les commandes disponibles à proximité
 * @access  Private (Delivery Person)
 */
router.get('/available-orders',
  [
    query('radius')
      .optional()
      .isFloat({ min: 1, max: 20 })
      .withMessage('Rayon invalide (1-20 km)')
      .toFloat(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limite invalide (1-50)')
      .toInt(),
  ],
  validate,
  deliveryController.getAvailableOrders
);

/**
 * @route   GET /api/v1/delivery/orders/active
 * @desc    Obtenir les commandes en cours
 * @access  Private (Delivery Person)
 */
router.get('/orders/active', deliveryController.getActiveOrders);

/**
 * @route   PUT /api/v1/delivery/orders/:id/accept
 * @desc    Accepter une livraison
 * @access  Private (Delivery Person)
 */
router.put('/orders/:id/accept',
  uuidValidator('id', 'Order ID'),
  [
    body('estimated_arrival_time')
      .optional()
      .isInt({ min: 5, max: 60 })
      .withMessage('Temps d\'arrivée estimé invalide (5-60 minutes)')
      .toInt(),
  ],
  validate,
  deliveryController.acceptDelivery
);

/**
 * @route   PUT /api/v1/delivery/orders/:id/decline
 * @desc    Refuser une livraison
 * @access  Private (Delivery Person)
 */
router.put('/orders/:id/decline',
  uuidValidator('id', 'Order ID'),
  [
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Raison trop longue (max 200 caractères)'),
  ],
  validate,
  deliveryController.declineDelivery
);

/**
 * @route   PUT /api/v1/delivery/orders/:id/arrive-restaurant
 * @desc    Signaler arrivée au restaurant
 * @access  Private (Delivery Person)
 */
router.put('/orders/:id/arrive-restaurant',
  uuidValidator('id', 'Order ID'),
  deliveryController.arriveAtRestaurant
);

/**
 * @route   PUT /api/v1/delivery/orders/:id/pickup
 * @desc    Confirmer récupération de la commande
 * @access  Private (Delivery Person)
 */
router.put('/orders/:id/pickup',
  uuidValidator('id', 'Order ID'),
  [
    body('pickup_code')
      .optional()
      .trim()
      .isLength({ min: 4, max: 6 })
      .isNumeric()
      .withMessage('Code de récupération invalide'),
  ],
  validate,
  deliveryController.confirmPickup
);

/**
 * @route   PUT /api/v1/delivery/orders/:id/arrive-customer
 * @desc    Signaler arrivée chez le client
 * @access  Private (Delivery Person)
 */
router.put('/orders/:id/arrive-customer',
  uuidValidator('id', 'Order ID'),
  deliveryController.arriveAtCustomer
);

/**
 * @route   PUT /api/v1/delivery/orders/:id/deliver
 * @desc    Confirmer livraison au client
 * @access  Private (Delivery Person)
 */
router.put('/orders/:id/deliver',
  uuidValidator('id', 'Order ID'),
  [
    body('delivery_code')
      .optional()
      .trim()
      .isLength({ min: 4, max: 6 })
      .isNumeric()
      .withMessage('Code de livraison invalide'),
    body('signature')
      .optional()
      .trim()
      .isURL()
      .withMessage('Signature invalide (URL image)'),
    body('photo')
      .optional()
      .trim()
      .isURL()
      .withMessage('Photo invalide (URL image)'),
  ],
  validate,
  deliveryController.confirmDelivery
);

/**
 * ═══════════════════════════════════════════════════════════
 * GAINS & PAIEMENTS
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   GET /api/v1/delivery/earnings
 * @desc    Obtenir les gains du livreur
 * @access  Private (Delivery Person)
 */
router.get('/earnings',
  [
    query('period')
      .optional()
      .isIn(['today', 'week', 'month', 'year', 'all'])
      .withMessage('Période invalide'),
    query('start_date')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Date de début invalide'),
    query('end_date')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Date de fin invalide'),
  ],
  validate,
  deliveryController.getEarnings
);

/**
 * @route   POST /api/v1/delivery/payout-request
 * @desc    Demander un retrait
 * @access  Private (Delivery Person)
 */
router.post('/payout-request', 
  [
    body('amount')
      .isFloat({ min: 5000 })
      .withMessage('Montant minimum: 5000 FCFA')
      .toFloat(),
  ],
  validate,
  deliveryController.requestPayout
);

/**
 * @route   GET /api/v1/delivery/payout-requests
 * @desc    Historique des retraits
 * @access  Private (Delivery Person)
 */
router.get('/payout-requests',
  paginationValidator,
  deliveryController.getPayoutRequests
);

/**
 * ═══════════════════════════════════════════════════════════
 * HISTORIQUE & STATISTIQUES
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   GET /api/v1/delivery/history
 * @desc    Historique des livraisons
 * @access  Private (Delivery Person)
 */
router.get('/history',
  [
    query('status')
      .optional()
      .isIn(['delivered', 'cancelled'])
      .withMessage('Statut invalide'),
    paginationValidator,
  ],
  validate,
  deliveryController.getDeliveryHistory
);

/**
 * @route   GET /api/v1/delivery/statistics
 * @desc    Statistiques du livreur
 * @access  Private (Delivery Person)
 */
router.get('/statistics',
  [
    query('period')
      .optional()
      .isIn(['today', 'week', 'month', 'year'])
      .withMessage('Période invalide'),
  ],
  validate,
  deliveryController.getStatistics
);

/**
 * @route   GET /api/v1/delivery/reviews
 * @desc    Avis reçus
 * @access  Private (Delivery Person)
 */
router.get('/reviews',
  paginationValidator,
  deliveryController.getMyReviews
);

/**
 * ═══════════════════════════════════════════════════════════
 * GESTION DES PROBLÈMES
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   POST /api/v1/delivery/orders/:id/report-issue
 * @desc    Signaler un problème avec une commande
 * @access  Private (Delivery Person)
 */
router.post('/orders/:id/report-issue',
  uuidValidator('id', 'Order ID'),
  [
    body('issue_type')
      .isIn(['client_absent', 'wrong_address', 'damaged_order', 'accident', 'vehicle_breakdown', 'security_issue', 'health_issue', 'other'])
      .withMessage('Type de problème invalide'),
    body('description')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Description requise (10-1000 caractères)'),
    body('photos')
      .optional()
      .isArray()
      .withMessage('Photos doit être un tableau'),
    body('latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude invalide'),
    body('longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude invalide'),
  ],
  validate,
  deliveryController.reportIssue
);

/**
 * @route   POST /api/v1/delivery/orders/:id/client-absent
 * @desc    Signaler client absent (procédure complète)
 * @access  Private (Delivery Person)
 */
router.post('/orders/:id/client-absent',
  uuidValidator('id', 'Order ID'),
  [
    body('attempts')
      .isInt({ min: 1, max: 3 })
      .withMessage('Nombre de tentatives invalide (1-3)')
      .toInt(),
    body('wait_time_minutes')
      .optional()
      .isInt({ min: 0, max: 30 })
      .withMessage('Temps d\'attente invalide')
      .toInt(),
    body('action')
      .isIn(['return_restaurant', 'leave_neighbor', 'cancel', 'wait_more'])
      .withMessage('Action invalide'),
    body('neighbor_info')
      .optional()
      .isObject()
      .withMessage('Informations voisin invalides'),
  ],
  validate,
  deliveryController.handleClientAbsent
);

/**
 * @route   POST /api/v1/delivery/orders/:id/wrong-address
 * @desc    Signaler adresse incorrecte
 * @access  Private (Delivery Person)
 */
router.post('/orders/:id/wrong-address',
  uuidValidator('id', 'Order ID'),
  [
    body('correct_address')
      .trim()
      .isLength({ min: 5 })
      .withMessage('Adresse correcte requise'),
    body('correct_latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude invalide'),
    body('correct_longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude invalide'),
    body('additional_distance_km')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Distance supplémentaire invalide')
      .toFloat(),
  ],
  validate,
  deliveryController.handleWrongAddress
);

/**
 * @route   POST /api/v1/delivery/emergency
 * @desc    Bouton d'urgence (accident, sécurité, santé)
 * @access  Private (Delivery Person)
 */
router.post('/emergency',
  [
    body('emergency_type')
      .isIn(['accident', 'security', 'health', 'vehicle_breakdown', 'other'])
      .withMessage('Type d\'urgence invalide'),
    body('description')
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage('Description requise (10-500 caractères)'),
    body('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude invalide'),
    body('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude invalide'),
    body('order_id')
      .optional()
      .isUUID()
      .withMessage('ID commande invalide'),
    body('phone_number')
      .optional()
      .trim()
      .matches(/^\+225(0[1457]|[4-7])\d{8}$/)
      .withMessage('Numéro de téléphone invalide'),
  ],
  validate,
  deliveryController.reportEmergency
);

/**
 * ═══════════════════════════════════════════════════════════
 * SUPPORT
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   POST /api/v1/delivery/support/contact
 * @desc    Contacter le support
 * @access  Private (Delivery Person)
 */
router.post('/support/contact',
  [
    body('subject')
      .trim()
      .notEmpty()
      .isLength({ min: 5, max: 200 })
      .withMessage('Sujet requis (5-200 caractères)'),
    body('message')
      .trim()
      .notEmpty()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Message requis (10-1000 caractères)'),
    body('order_id')
      .optional()
      .isUUID()
      .withMessage('ID commande invalide'),
  ],
  validate,
  deliveryController.contactSupport
);

module.exports = router;
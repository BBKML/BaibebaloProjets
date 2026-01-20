const express = require('express');
const { body, query } = require('express-validator');
const { authenticate, authorize } = require('../middlewares/auth');
const { 
  validate, 
  paginationValidator,
  uuidValidator 
} = require('../middlewares/validators');
const userController = require('../controllers/user.controller');

const router = express.Router();

// Toutes ces routes nécessitent une authentification en tant qu'utilisateur
router.use(authenticate);
router.use(authorize('user'));

/**
 * @route   GET /api/v1/users/me
 * @desc    Obtenir le profil de l'utilisateur connecté
 * @access  Private (Client)
 */
router.get('/me', userController.getProfile);

/**
 * @route   PUT /api/v1/users/me
 * @desc    Mettre à jour le profil
 * @access  Private (Client)
 */
router.put(
  '/me',
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
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Email invalide'),
    body('gender')
      .optional()
      .isIn(['male', 'female', 'other'])
      .withMessage('Genre invalide'),
    body('date_of_birth')
      .optional()
      .isISO8601()
      .withMessage('Date de naissance invalide'),
  ],
  validate,
  userController.updateProfile
);

/**
 * @route   GET /api/v1/users/me/addresses
 * @desc    Obtenir toutes les adresses de l'utilisateur
 * @access  Private (Client)
 */
router.get('/me/addresses', userController.getAddresses);

/**
 * @route   POST /api/v1/users/me/addresses
 * @desc    Ajouter une nouvelle adresse
 * @access  Private (Client)
 */
router.post(
  '/me/addresses',
  [
    body('title')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Titre requis'),
    body('address_line')
      .trim()
      .isLength({ min: 5 })
      .withMessage('Adresse complète requise'),
    body('district')
      .optional()
      .trim(),
    body('landmark')
      .optional()
      .trim(),
    body('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude invalide'),
    body('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude invalide'),
    body('is_default')
      .optional()
      .isBoolean(),
  ],
  validate,
  userController.addAddress
);

/**
 * @route   PUT /api/v1/users/me/addresses/:id
 * @desc    Mettre à jour une adresse
 * @access  Private (Client)
 */
router.put(
  '/me/addresses/:id',
  [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }),
    body('address_line')
      .optional()
      .trim()
      .isLength({ min: 5 }),
    body('latitude')
      .optional()
      .isFloat({ min: -90, max: 90 }),
    body('longitude')
      .optional()
      .isFloat({ min: -180, max: 180 }),
    body('is_default')
      .optional()
      .isBoolean(),
  ],
  validate,
  userController.updateAddress
);

/**
 * @route   DELETE /api/v1/users/me/addresses/:id
 * @desc    Supprimer une adresse
 * @access  Private (Client)
 */
router.delete('/me/addresses/:id', userController.deleteAddress);

/**
 * @route   GET /api/v1/users/me/orders
 * @desc    Obtenir l'historique des commandes
 * @access  Private (Client)
 */
router.get(
  '/me/orders',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page invalide'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limite invalide'),
    query('status')
      .optional()
      .isIn(['new', 'accepted', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'])
      .withMessage('Statut invalide'),
  ],
  validate,
  userController.getOrders
);

/**
 * @route   GET /api/v1/users/me/favorites
 * @desc    Obtenir les restaurants favoris
 * @access  Private (Client)
 */
router.get('/me/favorites', userController.getFavorites);

/**
 * @route   POST /api/v1/users/me/favorites/:restaurantId
 * @desc    Ajouter un restaurant aux favoris
 * @access  Private (Client)
 */
router.post('/me/favorites/:restaurantId', userController.addFavorite);

/**
 * @route   DELETE /api/v1/users/me/favorites/:restaurantId
 * @desc    Retirer un restaurant des favoris
 * @access  Private (Client)
 */
router.delete('/me/favorites/:restaurantId', userController.removeFavorite);

/**
 * @route   GET /api/v1/users/me/loyalty
 * @desc    Obtenir les points de fidélité
 * @access  Private (Client)
 */
router.get('/me/loyalty', userController.getLoyaltyPoints);

/**
 * @route   GET /api/v1/users/me/referrals
 * @desc    Obtenir les informations de parrainage
 * @access  Private (Client)
 */
router.get('/me/referrals', userController.getReferrals);

/**
 * ═══════════════════════════════════════════════════════════
 * CODES PROMO
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   POST /api/v1/users/me/promotions/validate
 * @desc    Valider un code promo
 * @access  Private (User)
 */
router.post('/me/promotions/validate',
  [
    body('code')
      .trim()
      .notEmpty()
      .isLength({ min: 3, max: 50 })
      .withMessage('Code promo requis'),
    body('restaurant_id')
      .optional()
      .isUUID()
      .withMessage('ID restaurant invalide'),
    body('order_amount')
      .optional()
      .isFloat({ min: 0 })
      .toFloat()
      .withMessage('Montant de commande invalide'),
  ],
  validate,
  userController.validatePromoCode
);

/**
 * ═══════════════════════════════════════════════════════════
 * SUPPORT & TICKETS
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   GET /api/v1/users/me/support/tickets
 * @desc    Lister les tickets de support de l'utilisateur
 * @access  Private (User)
 */
router.get('/me/support/tickets',
  paginationValidator,
  userController.getSupportTickets
);

/**
 * @route   POST /api/v1/users/me/support/tickets
 * @desc    Créer un ticket de support
 * @access  Private (User)
 */
router.post('/me/support/tickets',
  [
    body('category')
      .isIn(['order', 'payment', 'account', 'technical', 'other'])
      .withMessage('Catégorie invalide'),
    body('subject')
      .trim()
      .notEmpty()
      .isLength({ min: 5, max: 200 })
      .withMessage('Sujet requis (5-200 caractères)'),
    body('message')
      .trim()
      .notEmpty()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Message requis (10-2000 caractères)'),
    body('order_id')
      .optional()
      .isUUID()
      .withMessage('ID commande invalide'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Priorité invalide'),
  ],
  validate,
  userController.createSupportTicket
);

/**
 * @route   GET /api/v1/users/me/support/tickets/:ticketId
 * @desc    Détails d'un ticket de support
 * @access  Private (User)
 */
router.get('/me/support/tickets/:ticketId',
  uuidValidator('ticketId', 'Ticket ID'),
  userController.getSupportTicketById
);

/**
 * @route   POST /api/v1/users/me/support/tickets/:ticketId/messages
 * @desc    Ajouter un message à un ticket
 * @access  Private (User)
 */
router.post('/me/support/tickets/:ticketId/messages',
  uuidValidator('ticketId', 'Ticket ID'),
  [
    body('message')
      .trim()
      .notEmpty()
      .isLength({ min: 5, max: 2000 })
      .withMessage('Message requis (5-2000 caractères)'),
  ],
  validate,
  userController.addTicketMessage
);

/**
 * @route   PUT /api/v1/users/me/support/tickets/:ticketId/close
 * @desc    Fermer un ticket de support
 * @access  Private (User)
 */
router.put('/me/support/tickets/:ticketId/close',
  uuidValidator('ticketId', 'Ticket ID'),
  userController.closeSupportTicket
);

/**
 * ═══════════════════════════════════════════════════════════
 * RGPD - EXPORT ET SUPPRESSION DES DONNÉES
 * ═══════════════════════════════════════════════════════════
 */

/**
 * @route   GET /api/v1/users/me/export
 * @desc    Exporter toutes les données utilisateur (RGPD - Droit d'accès)
 * @access  Private (User)
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
  userController.exportUserData
);

/**
 * @route   DELETE /api/v1/users/me
 * @desc    Supprimer le compte utilisateur (RGPD - Droit à l'oubli)
 * @access  Private (User)
 * @note    Soft delete avec anonymisation des données personnelles
 */
router.delete('/me',
  [
    body('password')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Mot de passe requis pour confirmation'),
    body('confirm')
      .equals('DELETE')
      .withMessage('Vous devez confirmer en écrivant "DELETE"'),
  ],
  validate,
  userController.deleteUserAccount
);

module.exports = router;
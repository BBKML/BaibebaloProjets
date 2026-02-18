const express = require('express');
const { query, body } = require('express-validator');
const { authenticate, authorize, requireAdminPermission } = require('../middlewares/auth');
const { paginationValidator, uuidValidator, validate } = require('../middlewares/validators');
const adminController = require('../controllers/admin.controller');

const router = express.Router();

// Toutes les routes nécessitent authentification admin
router.use(authenticate);
router.use(authorize('admin'));

/**
 * ═══════════════════════════════════════════════════════════
 * DASHBOARD (Tous les admins)
 * ═══════════════════════════════════════════════════════════
 */
router.get('/dashboard', adminController.getDashboard);
router.get('/dashboard/realtime-orders', adminController.getRealTimeOrders);
router.get('/dashboard/geographic', adminController.getGeographicData);
router.get('/dashboard/alerts', adminController.getSystemAlerts);
router.post('/dashboard/alerts/dismiss', adminController.dismissAlert);
router.get('/dashboard/alerts/dismissed', adminController.getDismissedAlerts);
router.delete('/dashboard/alerts/dismissed/:alert_id', adminController.restoreAlert);

/**
 * ═══════════════════════════════════════════════════════════
 * GESTION UTILISATEURS
 * ═══════════════════════════════════════════════════════════
 */

// Lister les utilisateurs
router.get('/users', 
  requireAdminPermission('view_users'),
  paginationValidator,
  adminController.getUsers
);

// Détails d'un utilisateur
router.get('/users/:id', 
  requireAdminPermission('view_users'),
  uuidValidator('id', 'User ID'),
  adminController.getUserById
);

// Suspendre/activer un utilisateur
router.put('/users/:id/suspend', 
  requireAdminPermission('manage_users'),
  uuidValidator('id', 'User ID'),
  adminController.suspendUser
);

router.put('/users/:id/activate', 
  requireAdminPermission('manage_users'),
  uuidValidator('id', 'User ID'),
  adminController.activateUser
);

// Actions en masse sur les utilisateurs
router.post('/users/bulk-action', 
  requireAdminPermission('manage_users'),
  adminController.bulkActionUsers
);

/**
 * ═══════════════════════════════════════════════════════════
 * GESTION RESTAURANTS
 * ═══════════════════════════════════════════════════════════
 */

// Lister les restaurants
router.get('/restaurants', 
  requireAdminPermission('view_restaurants'),
  paginationValidator,
  adminController.getRestaurants
);

// Statistiques détaillées d'un restaurant (doit être avant /:id)
router.get('/restaurants/:id/statistics', 
  requireAdminPermission('view_restaurants'),
  uuidValidator('id', 'Restaurant ID'),
  adminController.getRestaurantStatistics
);

// Menu d'un restaurant (doit être avant /:id pour éviter les conflits)
router.get('/restaurants/:id/menu', 
  requireAdminPermission('view_restaurants'),
  uuidValidator('id', 'Restaurant ID'),
  adminController.getRestaurantMenu
);

// Détails d'un restaurant
router.get('/restaurants/:id', 
  requireAdminPermission('view_restaurants'),
  uuidValidator('id', 'Restaurant ID'),
  adminController.getRestaurantById
);

// Mettre à jour la commission d'un restaurant
router.put('/restaurants/:id/commission', 
  requireAdminPermission('approve_restaurants'),
  uuidValidator('id', 'Restaurant ID'),
  body('commission_rate').isFloat({ min: 0, max: 100 }).toFloat().withMessage('La commission doit être entre 0 et 100'),
  validate,
  adminController.updateRestaurantCommission
);

// Approuver un restaurant
router.put('/restaurants/:id/approve', 
  requireAdminPermission('approve_restaurants'),
  uuidValidator('id', 'Restaurant ID'),
  adminController.approveRestaurant
);

// Rejeter un restaurant
router.put('/restaurants/:id/reject', 
  requireAdminPermission('approve_restaurants'),
  uuidValidator('id', 'Restaurant ID'),
  adminController.rejectRestaurant
);

// Suspendre un restaurant
router.put('/restaurants/:id/suspend', 
  requireAdminPermission('approve_restaurants'),
  uuidValidator('id', 'Restaurant ID'),
  adminController.suspendRestaurant
);

// Obtenir les restaurants suspendus
router.get('/restaurants/suspended', 
  requireAdminPermission('view_restaurants'),
  paginationValidator,
  adminController.getSuspendedRestaurants
);

// Réactiver un restaurant
router.put('/restaurants/:id/reactivate', 
  requireAdminPermission('approve_restaurants'),
  uuidValidator('id', 'Restaurant ID'),
  adminController.reactivateRestaurant
);

// Supprimer un restaurant
router.delete('/restaurants/:id', 
  requireAdminPermission('approve_restaurants'),
  uuidValidator('id', 'Restaurant ID'),
  adminController.deleteRestaurant
);

// Demander des corrections à un restaurant
router.post('/restaurants/:id/request-corrections', 
  requireAdminPermission('approve_restaurants'),
  uuidValidator('id', 'Restaurant ID'),
  adminController.requestRestaurantCorrections
);

/**
 * ═══════════════════════════════════════════════════════════
 * GESTION LIVREURS
 * ═══════════════════════════════════════════════════════════
 */

// Lister les livreurs
router.get('/delivery-persons', 
  requireAdminPermission('view_deliveries'),
  paginationValidator,
  adminController.getDeliveryPersons
);

// Créer un livreur (admin)
router.post('/delivery-persons', 
  requireAdminPermission('approve_deliveries'),
  adminController.createDeliveryPerson
);

// Détails d'un livreur
router.get('/delivery-persons/:id', 
  requireAdminPermission('view_deliveries'),
  uuidValidator('id', 'Delivery Person ID'),
  adminController.getDeliveryPersonById
);

// Modifier un livreur
router.put('/delivery-persons/:id', 
  requireAdminPermission('approve_deliveries'),
  uuidValidator('id', 'Delivery Person ID'),
  adminController.updateDeliveryPerson
);

// Supprimer un livreur
router.delete('/delivery-persons/:id', 
  requireAdminPermission('approve_deliveries'),
  uuidValidator('id', 'Delivery Person ID'),
  adminController.deleteDeliveryPerson
);

// Approuver un livreur
router.put('/delivery-persons/:id/approve', 
  requireAdminPermission('approve_deliveries'),
  uuidValidator('id', 'Delivery Person ID'),
  adminController.approveDeliveryPerson
);

// Rejeter un livreur
router.put('/delivery-persons/:id/reject', 
  requireAdminPermission('approve_deliveries'),
  uuidValidator('id', 'Delivery Person ID'),
  adminController.rejectDeliveryPerson
);

// Suspendre un livreur
router.put('/delivery-persons/:id/suspend', 
  requireAdminPermission('approve_deliveries'),
  uuidValidator('id', 'Delivery Person ID'),
  adminController.suspendDeliveryPerson
);

// Demander des informations complémentaires à un livreur
router.post('/delivery-persons/:id/request-info', 
  requireAdminPermission('approve_deliveries'),
  uuidValidator('id', 'Delivery Person ID'),
  adminController.requestDeliveryPersonInfo
);

// Classement des livreurs
router.get('/delivery-persons/leaderboard', 
  requireAdminPermission('view_delivery_persons'),
  [
    query('period')
      .optional()
      .isIn(['today', 'week', 'month', 'year', 'all'])
      .withMessage('Période invalide'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limite invalide (1-100)')
      .toInt(),
  ],
  validate,
  adminController.getDeliveryLeaderboard
);

/**
 * ═══════════════════════════════════════════════════════════
 * GESTION COMMANDES
 * ═══════════════════════════════════════════════════════════
 */

// Lister toutes les commandes
router.get('/orders', 
  requireAdminPermission('view_orders'),
  paginationValidator,
  adminController.getOrders
);

// Exporter les commandes (CSV, Excel, PDF) - DOIT être avant /orders/:id
router.get('/orders/export', 
  requireAdminPermission('view_orders'),
  adminController.exportOrders
);

// Détails d'une commande
router.get('/orders/:id', 
  requireAdminPermission('view_orders'),
  uuidValidator('id', 'Order ID'),
  adminController.getOrderById
);

// Mettre à jour le statut d'une commande (admin)
router.patch('/orders/:id/status',
  requireAdminPermission('manage_orders'),
  uuidValidator('id', 'Order ID'),
  [
    body('status')
      .isIn(['new', 'accepted', 'preparing', 'ready', 'cancelled', 'assigned', 'picked_up', 'delivering', 'delivered'])
      .withMessage('Statut invalide'),
  ],
  validate,
  adminController.updateOrderStatus
);

// Annuler une commande (en cas de litige)
router.put('/orders/:id/cancel', 
  requireAdminPermission('manage_orders'),
  uuidValidator('id', 'Order ID'),
  adminController.cancelOrder
);

// Réassigner un livreur à une commande
router.put('/orders/:id/assign-delivery',
  requireAdminPermission('manage_orders'),
  uuidValidator('id', 'Order ID'),
  adminController.reassignDeliveryPerson
);

// Résoudre un litige
router.put('/orders/:id/resolve-dispute', 
  requireAdminPermission('manage_orders'),
  uuidValidator('id', 'Order ID'),
  adminController.resolveDispute
);

// Obtenir les commandes problématiques
router.get('/orders/problematic', 
  requireAdminPermission('view_orders'),
  paginationValidator,
  adminController.getProblematicOrders
);

/**
 * ═══════════════════════════════════════════════════════════
 * GESTION FINANCIÈRE
 * ═══════════════════════════════════════════════════════════
 */

// Solde espèces dû par chaque livreur (DOIT être avant /finances/delivery/:id)
router.get('/finances/delivery-payment-summary',
  requireAdminPermission('view_finances'),
  adminController.getDeliveryPaymentSummary
);

router.get('/finances/delivery-cash-owed',
  requireAdminPermission('view_finances'),
  adminController.getDeliveryCashOwed
);

// Vue d'ensemble financière
router.get('/finances/overview', 
  requireAdminPermission('view_finances'),
  adminController.getFinancialOverview
);

// Obtenir les dépenses
router.get('/finances/expenses', 
  requireAdminPermission('view_finances'),
  adminController.getExpenses
);

// Transactions
router.get('/finances/transactions', 
  requireAdminPermission('view_finances'),
  paginationValidator,
  adminController.getTransactions
);

// Paiements des livreurs
router.get('/finances/payments/delivery', 
  requireAdminPermission('view_finances'),
  paginationValidator,
  adminController.getDeliveryPayments
);

// Paiements des restaurants
router.get('/finances/payments/restaurants', 
  requireAdminPermission('view_finances'),
  paginationValidator,
  adminController.getRestaurantPayments
);

// Demandes de retrait (payouts)
router.get('/finances/payouts', 
  requireAdminPermission('view_finances'),
  paginationValidator,
  adminController.getPayoutRequests
);

// Traiter une demande de retrait
router.put('/finances/payouts/:id/process', 
  requireAdminPermission('process_payouts'),
  uuidValidator('id', 'Payout ID'),
  adminController.processPayout
);

// Marquer un payout comme payé (après versement effectué)
router.put('/finances/payouts/:id/mark-paid', 
  requireAdminPermission('process_payouts'),
  uuidValidator('id', 'Payout ID'),
  adminController.markPayoutAsPaid
);

// Actualiser le solde d'un livreur
router.put('/finances/delivery/:id/refresh-balance', 
  requireAdminPermission('process_payouts'),
  uuidValidator('id', 'Delivery Person ID'),
  adminController.refreshDeliveryBalance
);

// Recalculer les soldes de tous les livreurs (synchroniser admin / app)
router.post('/finances/delivery/refresh-all-balances',
  requireAdminPermission('process_payouts'),
  adminController.refreshAllDeliveryBalances
);

// Actualiser le solde d'un restaurant
router.put('/finances/restaurant/:id/refresh-balance', 
  requireAdminPermission('process_payouts'),
  uuidValidator('id', 'Restaurant ID'),
  adminController.refreshRestaurantBalance
);

// Générer manuellement les payouts
router.post('/finances/generate-payouts',
  requireAdminPermission('process_payouts'),
  [
    body('user_type').optional().isIn(['delivery', 'restaurant']).withMessage('user_type doit être delivery ou restaurant'),
  ],
  adminController.generatePayouts
);

// Rejeter une demande de retrait
router.put('/finances/payouts/:id/reject', 
  requireAdminPermission('process_payouts'),
  uuidValidator('id', 'Payout ID'),
  adminController.rejectPayout
);

// Remises espèces (livreurs remettent l'argent à l'agence ou dépôt sur compte)
router.get('/finances/cash-remittances',
  requireAdminPermission('view_finances'),
  paginationValidator,
  adminController.getCashRemittances
);
router.put('/finances/cash-remittances/:id/confirm',
  requireAdminPermission('process_payouts'),
  uuidValidator('id', 'Remise ID'),
  adminController.confirmCashRemittance
);
router.put('/finances/cash-remittances/:id/reject',
  requireAdminPermission('process_payouts'),
  uuidValidator('id', 'Remise ID'),
  adminController.rejectCashRemittance
);

// Commission settings
router.get('/finances/commission-settings', 
  requireAdminPermission('view_finances'),
  adminController.getCommissionSettings
);

router.put('/finances/commission-settings', 
  requireAdminPermission('process_payouts'), // Super admin seulement
  adminController.updateCommissionSettings
);

/**
 * ═══════════════════════════════════════════════════════════
 * REMBOURSEMENTS
 * ═══════════════════════════════════════════════════════════
 */

// Obtenir les remboursements
router.get('/refunds', 
  requireAdminPermission('view_finances'),
  paginationValidator,
  adminController.getRefunds
);

// Approuver un remboursement
router.put('/refunds/:id/approve', 
  requireAdminPermission('process_payouts'),
  uuidValidator('id', 'Refund ID'),
  adminController.approveRefund
);

// Rejeter un remboursement
router.put('/refunds/:id/reject', 
  requireAdminPermission('process_payouts'),
  uuidValidator('id', 'Refund ID'),
  adminController.rejectRefund
);

/**
 * ═══════════════════════════════════════════════════════════
 * PROMOTIONS & CODES PROMO
 * ═══════════════════════════════════════════════════════════
 */

// Lister les promotions
router.get('/promotions', 
  requireAdminPermission('view_restaurants'), // Permission de base
  paginationValidator,
  adminController.getPromotions
);

// Créer une promotion
router.post('/promotions', 
  requireAdminPermission('approve_restaurants'),
  adminController.createPromotion
);

// Activer/désactiver une promotion
router.put('/promotions/:id/toggle', 
  requireAdminPermission('approve_restaurants'),
  uuidValidator('id', 'Promotion ID'),
  adminController.togglePromotion
);

/**
 * ═══════════════════════════════════════════════════════════
 * NOTIFICATIONS PUSH
 * ═══════════════════════════════════════════════════════════
 */

// Envoyer une notification à un utilisateur
router.post('/notifications/send', 
  requireAdminPermission('manage_users'),
  adminController.sendNotification
);

// Envoyer une notification à plusieurs utilisateurs
router.post('/notifications/broadcast', 
  requireAdminPermission('manage_users'),
  adminController.broadcastNotification
);

// Envoyer une notification promotionnelle à tous les clients
router.post('/notifications/promotional', 
  requireAdminPermission('approve_restaurants'),
  adminController.sendPromotionalNotification
);

/**
 * ═══════════════════════════════════════════════════════════
 * ANALYTICS & RAPPORTS
 * ═══════════════════════════════════════════════════════════
 */

// Vue d'ensemble analytics
router.get('/analytics/overview', 
  adminController.getAnalytics
);

// Revenus analytics
router.get('/analytics/revenue', 
  requireAdminPermission('view_finances'),
  adminController.getRevenue
);

// Rapport des ventes
router.get('/analytics/sales', 
  requireAdminPermission('view_finances'),
  adminController.getSalesReport
);

// Rapport des utilisateurs
router.get('/analytics/users', 
  requireAdminPermission('view_users'),
  adminController.getUsersReport
);

// Rapport des restaurants
router.get('/analytics/restaurants', 
  requireAdminPermission('view_restaurants'),
  adminController.getRestaurantsReport
);

// Rapport des livreurs
router.get('/analytics/deliveries', 
  requireAdminPermission('view_deliveries'),
  adminController.getDeliveriesReport
);

// Statistiques globales des notes (restaurants et livreurs)
router.get('/analytics/ratings', 
  adminController.getGlobalRatings
);

/**
 * ═══════════════════════════════════════════════════════════
 * SUPPORT & TICKETS
 * ═══════════════════════════════════════════════════════════
 */

// Lister les tickets support
router.get('/support/tickets', 
  paginationValidator,
  adminController.getSupportTickets
);

// Créer un ticket de support (admin)
router.post('/support/tickets', 
  requireAdminPermission('view_support'),
  adminController.createSupportTicket
);

// Détails d'un ticket
router.get('/support/tickets/:id', 
  uuidValidator('id', 'Ticket ID'),
  adminController.getTicketById
);

// Répondre à un ticket
router.post('/support/tickets/:id/reply', 
  uuidValidator('id', 'Ticket ID'),
  adminController.replyToTicket
);

// Fermer un ticket
router.put('/support/tickets/:id/close', 
  requireAdminPermission('view_support'),
  uuidValidator('id', 'Ticket ID'),
  adminController.closeTicket
);

/**
 * ═══════════════════════════════════════════════════════════
 * PARAMÈTRES APPLICATION
 * ═══════════════════════════════════════════════════════════
 */

// Obtenir les paramètres
router.get('/settings', 
  requireAdminPermission('view_finances'), // Super admin
  adminController.getAppSettings
);

// Mettre à jour les paramètres
router.put('/settings', 
  requireAdminPermission('process_payouts'), // Super admin seulement
  adminController.updateAppSettings
);

/**
 * ═══════════════════════════════════════════════════════════
 * GESTION DES ADMINS (Super admin seulement)
 * ═══════════════════════════════════════════════════════════
 */

// Lister les admins
router.get('/admins', 
  requireAdminPermission('process_payouts'), // Super admin
  adminController.getAdmins
);

// Créer un admin
router.post('/admins', 
  requireAdminPermission('process_payouts'), // Super admin
  adminController.createAdmin
);

// Mettre à jour permissions admin
router.put('/admins/:id/permissions', 
  requireAdminPermission('process_payouts'), // Super admin
  uuidValidator('id', 'Admin ID'),
  adminController.updateAdminPermissions
);

// Désactiver un admin
router.put('/admins/:id/deactivate', 
  requireAdminPermission('process_payouts'), // Super admin
  uuidValidator('id', 'Admin ID'),
  adminController.deactivateAdmin
);

/**
 * ═══════════════════════════════════════════════════════════
 * GESTION DU COMPTE ADMIN (Profil admin connecté)
 * ═══════════════════════════════════════════════════════════
 */

// Changer le mot de passe de l'admin connecté
router.put('/account/change-password', 
  adminController.changePassword
);

// Mettre à jour l'email de l'admin connecté
router.put('/account/update-email', 
  adminController.updateEmail
);

// Obtenir les sessions actives de l'admin connecté
router.get('/account/sessions', 
  adminController.getActiveSessions
);

// Révoquer une session spécifique
router.delete('/account/sessions/:id', 
  adminController.revokeSession
);

// Déconnexion de tous les appareils
router.post('/account/logout-all', 
  adminController.logoutAll
);

// Supprimer le compte admin connecté
router.delete('/account', 
  adminController.deleteAccount
);

// Upload photo de profil
const { uploadMiddleware } = require('../services/upload.service');
const logger = require('../utils/logger');

// Middleware de debug pour l'upload
const debugUpload = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Upload debug:', {
      hasFile: !!req.file,
      file: req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        hasBuffer: !!req.file.buffer,
        bufferLength: req.file.buffer?.length,
      } : null,
      body: req.body,
      contentType: req.headers['content-type'],
    });
  }
  next();
};

router.post('/account/profile-picture', 
  authenticate,
  uploadMiddleware.single('profile_picture'),
  debugUpload,
  adminController.uploadProfilePicture
);

// Supprimer photo de profil
router.delete('/account/profile-picture', 
  authenticate,
  adminController.deleteProfilePicture
);

/**
 * ═══════════════════════════════════════════════════════════
 * QUIZ DE VALIDATION
 * ═══════════════════════════════════════════════════════════
 */

// Obtenir les quiz disponibles
router.get('/quizzes', 
  requireAdminPermission('approve_restaurants'), // Permission pour valider
  adminController.getQuizzes
);

// Soumettre les réponses d'un quiz
router.post('/quizzes/submit', 
  requireAdminPermission('approve_restaurants'),
  adminController.submitQuiz
);

module.exports = router;
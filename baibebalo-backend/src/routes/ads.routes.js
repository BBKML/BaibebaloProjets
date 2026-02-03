/**
 * Routes pour la gestion des publicités restaurants
 * 
 * Tarifs:
 * - Bannière homepage: 5 000 FCFA/jour
 * - Badge "Sponsorisé": 3 000 FCFA/jour
 * - Notification push ciblée: 10 000 FCFA
 */

const express = require('express');
const router = express.Router();
const adsController = require('../controllers/ads.controller');
const { authenticate, authenticateRestaurant, authenticateAdmin } = require('../middlewares/auth');

// ======================================
// ROUTES PUBLIQUES
// ======================================

/**
 * @route   GET /api/v1/ads/pricing
 * @desc    Obtenir les tarifs de publicité
 * @access  Public
 */
router.get('/pricing', adsController.getAdPricing);

/**
 * @route   GET /api/v1/ads/banners
 * @desc    Obtenir les bannières actives pour la homepage
 * @access  Public
 */
router.get('/banners', adsController.getActiveHomepageBanners);

/**
 * @route   GET /api/v1/ads/sponsored
 * @desc    Obtenir les restaurants sponsorisés
 * @access  Public
 */
router.get('/sponsored', adsController.getSponsoredRestaurants);

/**
 * @route   POST /api/v1/ads/:adId/click
 * @desc    Enregistrer un clic sur une publicité
 * @access  Public
 */
router.post('/:adId/click', adsController.recordAdClick);

// ======================================
// ROUTES RESTAURANT
// ======================================

/**
 * @route   POST /api/v1/ads/restaurant/create
 * @desc    Créer une demande de publicité
 * @access  Restaurant authentifié
 */
router.post('/restaurant/create', authenticateRestaurant, adsController.createAdRequest);

/**
 * @route   GET /api/v1/ads/restaurant/my-ads
 * @desc    Obtenir mes publicités
 * @access  Restaurant authentifié
 */
router.get('/restaurant/my-ads', authenticateRestaurant, adsController.getRestaurantAds);

/**
 * @route   DELETE /api/v1/ads/restaurant/:adId
 * @desc    Annuler une publicité (avant paiement)
 * @access  Restaurant authentifié
 */
router.delete('/restaurant/:adId', authenticateRestaurant, adsController.cancelAd);

// ======================================
// ROUTES ADMIN
// ======================================

/**
 * @route   GET /api/v1/ads/admin/all
 * @desc    Obtenir toutes les publicités
 * @access  Admin
 */
router.get('/admin/all', authenticateAdmin, adsController.getAllAds);

/**
 * @route   POST /api/v1/ads/admin/:adId/approve
 * @desc    Approuver une publicité
 * @access  Admin
 */
router.post('/admin/:adId/approve', authenticateAdmin, adsController.approveAd);

/**
 * @route   POST /api/v1/ads/admin/:adId/reject
 * @desc    Rejeter une publicité
 * @access  Admin
 */
router.post('/admin/:adId/reject', authenticateAdmin, adsController.rejectAd);

/**
 * @route   POST /api/v1/ads/admin/:adId/confirm-payment
 * @desc    Confirmer le paiement d'une publicité
 * @access  Admin
 */
router.post('/admin/:adId/confirm-payment', authenticateAdmin, adsController.confirmAdPayment);

/**
 * @route   POST /api/v1/ads/admin/:adId/send-notification
 * @desc    Envoyer une notification push ciblée
 * @access  Admin
 */
router.post('/admin/:adId/send-notification', authenticateAdmin, adsController.sendPushNotificationAd);

/**
 * @route   GET /api/v1/ads/admin/revenue-stats
 * @desc    Statistiques de revenus publicitaires
 * @access  Admin
 */
router.get('/admin/revenue-stats', authenticateAdmin, adsController.getAdRevenueStats);

module.exports = router;

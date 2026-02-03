const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const {
  registerValidators,
  verifyOtpValidators,
  authLimiter,
  smsLimiter,
} = require('../middlewares/validators');

// Envoyer OTP
router.post('/send-otp', smsLimiter, registerValidators, authController.sendOTP);

// Vérifier OTP
router.post('/verify-otp', authLimiter, verifyOtpValidators, authController.verifyOTP);

// Connexion restaurant
router.post('/partner/login', authLimiter, authController.partnerLogin);

// Mot de passe oublié partenaire - Étape 1: Demander OTP
router.post('/partner/forgot-password', smsLimiter, authController.partnerForgotPassword);

// Mot de passe oublié partenaire - Étape 2: Vérifier OTP
router.post('/partner/verify-reset-otp', authLimiter, authController.partnerVerifyResetOtp);

// Mot de passe oublié partenaire - Étape 3: Réinitialiser mot de passe
router.post('/partner/reset-password', authLimiter, authController.partnerResetPassword);

// Connexion livreur
router.post('/delivery/login', authLimiter, authController.deliveryLogin);

// Connexion admin
router.post('/admin/login', authLimiter, authController.adminLogin);

// Rafraîchir le token
router.post('/refresh-token', authController.refreshToken);

module.exports = router;
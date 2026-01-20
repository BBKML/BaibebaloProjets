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

// Connexion livreur
router.post('/delivery/login', authLimiter, authController.deliveryLogin);

// Connexion admin
router.post('/admin/login', authLimiter, authController.adminLogin);

// Rafraîchir le token
router.post('/refresh-token', authController.refreshToken);

module.exports = router;
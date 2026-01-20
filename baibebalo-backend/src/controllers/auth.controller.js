const authService = require('../services/auth.service');
const smsService = require('../services/sms.service');
const { generateAccessToken, generateRefreshToken } = require('../middlewares/auth');
const { query } = require('../database/db');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');

class AuthController {
  /**
   * Envoyer un code OTP
   */
  async sendOTP(req, res, next) {
    try {
      const { phone } = req.body;

      // Générer et sauvegarder l'OTP
      const code = await authService.createOTP(phone);

      // Envoyer par SMS
      await smsService.sendOTP(phone, code);

      res.json({
        success: true,
        message: 'Code OTP envoyé par SMS',
      });
    } catch (error) {
      logger.error('Erreur sendOTP', { error: error.message });
      
      // Détecter les erreurs de rate limiting et retourner un 429
      if (error.message && error.message.includes('attendre') && error.message.includes('minute')) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: error.message,
          },
        });
      }
      
      // Pour les autres erreurs, passer au middleware d'erreur
      next(error);
    }
  }

  /**
   * Vérifier l'OTP et créer/connecter l'utilisateur
   */
  async verifyOTP(req, res, next) {
    try {
      const { phone, code, first_name, last_name } = req.body;

      // Vérifier l'OTP
      const otp = await authService.verifyOTP(phone, code);
      
      if (!otp || !otp.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_OTP',
            message: 'Code OTP invalide ou expiré',
          },
        });
      }

      // Trouver ou créer l'utilisateur
      const { user, isNew } = await authService.findOrCreateUser(phone, {
        first_name,
        last_name,
      });

      // Générer les tokens
      const accessToken = generateAccessToken({
        id: user.id,
        phone: user.phone,
        type: 'client',
      });

      const refreshToken = generateRefreshToken({
        id: user.id,
        phone: user.phone,
        type: 'client',
      });

      res.json({
        success: true,
        message: isNew ? 'Compte créé avec succès' : 'Connexion réussie',
        data: {
          user: {
            id: user.id,
            phone: user.phone,
            first_name: user.first_name,
            last_name: user.last_name,
            referral_code: user.referral_code,
            loyalty_points: user.loyalty_points,
          },
          accessToken,
          refreshToken,
          isNewUser: isNew,
        },
      });
    } catch (error) {
      logger.error('Erreur verifyOTP', { error: error.message });
      next(error);
    }
  }

  /**
   * Connexion restaurant/partenaire
   */
  async partnerLogin(req, res, next) {
    try {
      const { email, password } = req.body;

      // Trouver le restaurant
      const result = await query(
        'SELECT * FROM restaurants WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email ou mot de passe incorrect',
          },
        });
      }

      const restaurant = result.rows[0];

      // Vérifier le mot de passe
      const isValid = await bcrypt.compare(password, restaurant.password_hash);
      
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email ou mot de passe incorrect',
          },
        });
      }

      // Vérifier que le restaurant est actif
      if (restaurant.status !== 'active') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCOUNT_NOT_ACTIVE',
            message: 'Votre compte n\'est pas encore activé',
          },
        });
      }

      // Générer les tokens
      const accessToken = generateAccessToken({
        id: restaurant.id,
        email: restaurant.email,
        type: 'restaurant',
      });

      const refreshToken = generateRefreshToken({
        id: restaurant.id,
        email: restaurant.email,
        type: 'restaurant',
      });

      res.json({
        success: true,
        message: 'Connexion réussie',
        data: {
          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
            email: restaurant.email,
            status: restaurant.status,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      logger.error('Erreur partnerLogin', { error: error.message });
      next(error);
    }
  }

  /**
   * Connexion livreur
   */
  async deliveryLogin(req, res, next) {
    try {
      const { phone, password } = req.body;

      // Trouver le livreur
      const result = await query(
        'SELECT * FROM delivery_persons WHERE phone = $1',
        [phone]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Téléphone ou mot de passe incorrect',
          },
        });
      }

      const delivery = result.rows[0];

      // Vérifier le mot de passe
      const isValid = await bcrypt.compare(password, delivery.password_hash);
      
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Téléphone ou mot de passe incorrect',
          },
        });
      }

      // Vérifier que le livreur est actif
      if (delivery.status !== 'active') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCOUNT_NOT_ACTIVE',
            message: 'Votre compte n\'est pas encore activé',
          },
        });
      }

      // Générer les tokens
      const accessToken = generateAccessToken({
        id: delivery.id,
        phone: delivery.phone,
        type: 'delivery_person',
      });

      const refreshToken = generateRefreshToken({
        id: delivery.id,
        phone: delivery.phone,
        type: 'delivery_person',
      });

      res.json({
        success: true,
        message: 'Connexion réussie',
        data: {
          delivery_person: {
            id: delivery.id,
            first_name: delivery.first_name,
            last_name: delivery.last_name,
            phone: delivery.phone,
            status: delivery.status,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      logger.error('Erreur deliveryLogin', { error: error.message });
      next(error);
    }
  }

  /**
   * Connexion admin
   */
  async adminLogin(req, res) {
    try {
      const { email, password } = req.body;

      // Trouver l'admin
      const result = await query(
        'SELECT * FROM admins WHERE email = $1 AND is_active = true',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email ou mot de passe incorrect',
          },
        });
      }

      const admin = result.rows[0];

      // Vérifier le mot de passe
      const isValid = await bcrypt.compare(password, admin.password_hash);
      
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email ou mot de passe incorrect',
          },
        });
      }

      // Mettre à jour last_login
      await query(
        'UPDATE admins SET last_login = NOW() WHERE id = $1',
        [admin.id]
      );

      // Générer les tokens
      const accessToken = generateAccessToken({
        id: admin.id,
        email: admin.email,
        type: 'admin',
        role: admin.role,
      });

      const refreshToken = generateRefreshToken({
        id: admin.id,
        email: admin.email,
        type: 'admin',
      });

      res.json({
        success: true,
        message: 'Connexion admin réussie',
        data: {
          admin: {
            id: admin.id,
            email: admin.email,
            full_name: admin.full_name,
            role: admin.role,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      logger.error('Erreur adminLogin', {
        message: error.message,
        stack: error.stack,
        code: error.code,
      });
      
      // En développement, retourner plus de détails
      const isDev = process.env.NODE_ENV !== 'production';
      
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message: 'Erreur lors de la connexion',
          ...(isDev && {
            details: error.message,
            hint: error.hint || 'Vérifiez que la table admins existe et que la base de données est accessible',
          }),
        },
      });
    }
  }

  /**
   * Rafraîchir le token d'accès
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'REFRESH_TOKEN_REQUIRED',
            message: 'Refresh token requis',
          },
        });
      }

      const { verifyRefreshToken } = require('../middlewares/auth');
      const decoded = verifyRefreshToken(refreshToken);

      // Générer un nouveau access token
      const newAccessToken = generateAccessToken({
        id: decoded.id,
        phone: decoded.phone,
        email: decoded.email,
        type: decoded.type,
      });

      res.json({
        success: true,
        data: {
          accessToken: newAccessToken,
        },
      });
    } catch (error) {
      logger.error('Erreur refreshToken', { error: error.message });
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token invalide',
        },
      });
    }
  }
}

module.exports = new AuthController();
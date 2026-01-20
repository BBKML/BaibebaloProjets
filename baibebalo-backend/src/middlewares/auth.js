const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const { query } = require('../database/db');

// Cache en mémoire pour la blacklist des tokens (à remplacer par Redis en prod)
const tokenBlacklist = new Set();

/**
 * Génère un access token JWT
 */
const generateAccessToken = (payload) => {
  const tokenPayload = {
    id: payload.id,
    type: payload.type,
    phone: payload.phone,
    ...(payload.email && { email: payload.email }),
  };

  return jwt.sign(tokenPayload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: 'baibebalo-api',
    audience: 'baibebalo-client',
  });
};

/**
 * Génère un refresh token JWT
 */
const generateRefreshToken = (payload) => {
  const tokenPayload = {
    id: payload.id,
    type: payload.type,
    tokenVersion: payload.tokenVersion || 0, // Pour invalidation
  };

  return jwt.sign(tokenPayload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
    issuer: 'baibebalo-api',
    audience: 'baibebalo-client',
  });
};

/**
 * Génère les deux tokens
 */
const generateTokens = (payload) => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

/**
 * Vérifie un access token
 */
const verifyAccessToken = (token) => {
  try {
    // Vérifier si le token est blacklisté
    if (tokenBlacklist.has(token)) {
      throw new Error('Token révoqué');
    }

    return jwt.verify(token, config.jwt.secret, {
      issuer: 'baibebalo-api',
      audience: 'baibebalo-client',
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expiré');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Token invalide');
    }
    throw error;
  }
};

/**
 * Vérifie un refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    if (tokenBlacklist.has(token)) {
      throw new Error('Token révoqué');
    }

    return jwt.verify(token, config.jwt.refreshSecret, {
      issuer: 'baibebalo-api',
      audience: 'baibebalo-client',
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expiré');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Refresh token invalide');
    }
    throw error;
  }
};

/**
 * Révoque un token (blacklist)
 */
const revokeToken = (token) => {
  tokenBlacklist.add(token);
  
  // Nettoyer automatiquement après expiration (24h pour access, 7j pour refresh)
  setTimeout(() => {
    tokenBlacklist.delete(token);
  }, 7 * 24 * 60 * 60 * 1000); // 7 jours
  
  logger.info('Token révoqué', { tokenPrefix: token.substring(0, 20) });
};

/**
 * Middleware d'authentification obligatoire
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Token d\'authentification manquant',
        },
      });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);
    
    // Vérifier que l'utilisateur existe toujours
    let userExists = false;
    let userStatus = null;

    switch (decoded.type) {
      case 'user':
      case 'client': {
        const userResult = await query(
          'SELECT id, status FROM users WHERE id = $1',
          [decoded.id]
        );
        userExists = userResult.rows.length > 0;
        userStatus = userResult.rows[0]?.status;
        break;
      }

      case 'restaurant': {
        const restResult = await query(
          'SELECT id, status FROM restaurants WHERE id = $1',
          [decoded.id]
        );
        userExists = restResult.rows.length > 0;
        userStatus = restResult.rows[0]?.status;
        break;
      }

      case 'delivery_person': {
        const deliveryResult = await query(
          'SELECT id, status FROM delivery_persons WHERE id = $1',
          [decoded.id]
        );
        userExists = deliveryResult.rows.length > 0;
        userStatus = deliveryResult.rows[0]?.status;
        break;
      }

      case 'admin': {
        const adminResult = await query(
          'SELECT id, is_active FROM admins WHERE id = $1',
          [decoded.id]
        );
        userExists = adminResult.rows.length > 0;
        userStatus = adminResult.rows[0]?.is_active ? 'active' : 'inactive';
        break;
      }
    }

    if (!userExists) {
      logger.warn('Token valide mais utilisateur inexistant', {
        userId: decoded.id,
        userType: decoded.type,
      });
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    // Vérifier que le compte n'est pas suspendu
    if (userStatus === 'suspended') {
      logger.warn('Tentative d\'accès avec compte suspendu', {
        userId: decoded.id,
        userType: decoded.type,
      });
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: 'Votre compte a été suspendu. Contactez le support.',
        },
      });
    }

    if (userStatus === 'deleted') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DELETED',
          message: 'Ce compte a été supprimé',
        },
      });
    }
    
    // Attacher les infos utilisateur à la requête
    req.user = {
      id: decoded.id,
      type: decoded.type,
      phone: decoded.phone,
      email: decoded.email,
      status: userStatus,
    };

    // Stocker le token pour pouvoir le révoquer si nécessaire
    req.token = token;
    
    logger.debug('Utilisateur authentifié', {
      userId: req.user.id,
      userType: req.user.type,
      path: req.path,
    });
    
    next();
  } catch (error) {
    logger.warn('Échec d\'authentification', {
      error: error.message,
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent'),
    });
    
    const statusCode = error.message.includes('expiré') ? 401 : 401;
    const errorCode = error.message.includes('expiré') ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    
    return res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: error.message,
      },
    });
  }
};

/**
 * Middleware d'authentification optionnelle
 */
const authenticateOptional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = verifyAccessToken(token);
        
        req.user = {
          id: decoded.id,
          type: decoded.type,
          phone: decoded.phone,
          email: decoded.email,
        };
        req.token = token;
      } catch (error) {
        // En cas d'erreur, on continue sans utilisateur
        logger.debug('Auth optionnelle échouée, continuation sans user', {
          error: error.message,
        });
      }
    }
    
    next();
  } catch (error) {
    // Toujours continuer en cas d'erreur
    next();
  }
};

/**
 * Middleware de vérification de rôle
 */
const authorize = (...allowedTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentification requise',
        },
      });
    }
    
    if (!allowedTypes.includes(req.user.type)) {
      logger.warn('Accès refusé - rôle insuffisant', {
        userId: req.user.id,
        userType: req.user.type,
        allowedTypes,
        path: req.path,
        method: req.method,
      });
      
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Vous n\'avez pas les permissions nécessaires',
        },
      });
    }
    
    next();
  };
};

/**
 * Middleware pour vérifier que le restaurant est actif
 */
const requireActiveRestaurant = async (req, res, next) => {
  try {
    if (req.user.type !== 'restaurant') {
      return next();
    }
    
    const result = await query(
      'SELECT status, is_open FROM restaurants WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RESTAURANT_NOT_FOUND',
          message: 'Restaurant non trouvé',
        },
      });
    }

    const { status, is_open } = result.rows[0];

    if (status === 'pending') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'RESTAURANT_PENDING',
          message: 'Votre compte est en attente d\'approbation',
        },
      });
    }

    if (status === 'rejected') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'RESTAURANT_REJECTED',
          message: 'Votre demande a été rejetée. Contactez le support.',
        },
      });
    }

    if (status !== 'active') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'RESTAURANT_NOT_ACTIVE',
          message: 'Votre compte restaurant n\'est pas actif',
        },
      });
    }

    // Attacher les infos restaurant
    req.restaurant = { status, is_open };
    
    next();
  } catch (error) {
    logger.error('Erreur vérification restaurant actif', { 
      error: error.message,
      userId: req.user?.id,
    });
    next(error);
  }
};

/**
 * Middleware pour vérifier que le livreur est actif
 */
const requireActiveDelivery = async (req, res, next) => {
  try {
    if (req.user.type !== 'delivery_person') {
      return next();
    }
    
    const result = await query(
      'SELECT status, delivery_status FROM delivery_persons WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DELIVERY_NOT_FOUND',
          message: 'Livreur non trouvé',
        },
      });
    }

    const { status, delivery_status } = result.rows[0];

    if (status === 'pending') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'DELIVERY_PENDING',
          message: 'Votre compte est en attente d\'approbation',
        },
      });
    }

    if (status === 'rejected') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'DELIVERY_REJECTED',
          message: 'Votre demande a été rejetée. Contactez le support.',
        },
      });
    }

    if (status !== 'active') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'DELIVERY_NOT_ACTIVE',
          message: 'Votre compte livreur n\'est pas actif',
        },
      });
    }

    // Attacher les infos livreur
    req.delivery = { status, delivery_status };
    
    next();
  } catch (error) {
    logger.error('Erreur vérification livreur actif', { 
      error: error.message,
      userId: req.user?.id,
    });
    next(error);
  }
};

/**
 * Middleware pour vérifier que l'utilisateur est propriétaire de la ressource
 */
const requireOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;

      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_RESOURCE_ID',
            message: 'ID de ressource manquant',
          },
        });
      }

      let isOwner = false;
      let query_text = '';
      let query_params = [];

      switch (resourceType) {
        case 'order': {
          query_text = 'SELECT user_id FROM orders WHERE id = $1';
          query_params = [resourceId];
          const orderResult = await query(query_text, query_params);
          isOwner = orderResult.rows.length > 0 && 
                    orderResult.rows[0].user_id === req.user.id;
          break;
        }

        case 'address': {
          query_text = 'SELECT user_id FROM addresses WHERE id = $1';
          query_params = [resourceId];
          const addressResult = await query(query_text, query_params);
          isOwner = addressResult.rows.length > 0 && 
                    addressResult.rows[0].user_id === req.user.id;
          break;
        }

        case 'review': {
          query_text = 'SELECT user_id FROM reviews WHERE id = $1';
          query_params = [resourceId];
          const reviewResult = await query(query_text, query_params);
          isOwner = reviewResult.rows.length > 0 && 
                    reviewResult.rows[0].user_id === req.user.id;
          break;
        }

        default:
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_RESOURCE_TYPE',
              message: 'Type de ressource invalide',
            },
          });
      }

      if (!isOwner) {
        logger.warn('Tentative d\'accès à une ressource non possédée', {
          userId: req.user.id,
          resourceType,
          resourceId,
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'NOT_OWNER',
            message: 'Vous n\'êtes pas autorisé à accéder à cette ressource',
          },
        });
      }

      next();
    } catch (error) {
      logger.error('Erreur vérification ownership', { 
        error: error.message,
        resourceType,
      });
      next(error);
    }
  };
};

/**
 * Middleware pour les permissions admin
 */
const requireAdminPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (req.user.type !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'NOT_ADMIN',
            message: 'Accès administrateur requis',
          },
        });
      }

      const result = await query(
        'SELECT role, permissions FROM admins WHERE id = $1',
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ADMIN_NOT_FOUND',
            message: 'Administrateur non trouvé',
          },
        });
      }

      const { role, permissions } = result.rows[0];

      // Super admin a tous les droits
      if (role === 'super_admin') {
        return next();
      }

      // Vérifier la permission spécifique
      if (permissions && permissions[permission]) {
        return next();
      }

      logger.warn('Permission admin insuffisante', {
        adminId: req.user.id,
        role,
        requiredPermission: permission,
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Permissions insuffisantes',
        },
      });

    } catch (error) {
      logger.error('Erreur vérification permission admin', { 
        error: error.message,
      });
      next(error);
    }
  };
};

/**
 * Nettoyer périodiquement la blacklist (à exécuter via cron)
 */
const cleanupTokenBlacklist = () => {
  const initialSize = tokenBlacklist.size;
  // En production, implémenter avec Redis et TTL automatique
  tokenBlacklist.clear();
  logger.info('Blacklist de tokens nettoyée', { 
    tokensRemoved: initialSize,
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  revokeToken,
  authenticate,
  authenticateOptional,
  authorize,
  requireActiveRestaurant,
  requireActiveDelivery,
  requireOwnership,
  requireAdminPermission,
  cleanupTokenBlacklist,
};
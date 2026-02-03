const { query, transaction } = require('../database/db');
const logger = require('../utils/logger');
const mapsService = require('../services/maps.service');

const hasTicketMessagesColumn = async (runner, columnName) => {
  const execute = typeof runner === 'function' ? runner : runner.query.bind(runner);
  const result = await execute(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'ticket_messages' 
      AND column_name = $1
    ) as exists`,
    [columnName]
  );
  return result.rows?.[0]?.exists === true;
};

/**
 * Obtenir le profil de l'utilisateur connecté
 */
exports.getProfile = async (req, res) => {
  try {
    const requestBaseUrl = `${req.protocol}://${req.get('host')}`;
    const normalizeUploadsPath = (path) => {
      if (!path) return path;
      return path.replace(/\/api\/v\d+(?=\/uploads)/i, '');
    };
    const normalizeProfileUrl = (url) => {
      if (!url) return url;
      try {
        const parsed = new URL(url);
        const normalizedPath = normalizeUploadsPath(parsed.pathname);
        if (['localhost', '127.0.0.1'].includes(parsed.hostname)) {
          return `${requestBaseUrl}${normalizedPath}`;
        }
        if (normalizedPath !== parsed.pathname) {
          return `${parsed.origin}${normalizedPath}`;
        }
        return url;
      } catch (error) {
        if (url.startsWith('/')) {
          return `${requestBaseUrl}${normalizeUploadsPath(url)}`;
        }
        if (url.startsWith('uploads/')) {
          return `${requestBaseUrl}/${url}`;
        }
        return url;
      }
    };

    const result = await query(
      `SELECT id, phone, email, first_name, last_name, profile_picture, 
              gender, date_of_birth, referral_code, loyalty_points, 
              status, created_at
       FROM users 
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          ...result.rows[0],
          profile_picture: normalizeProfileUrl(result.rows[0]?.profile_picture),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getProfile:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erreur lors de la récupération du profil',
      },
    });
  }
};

const defaultNotificationPreferences = {
  orderUpdates: true,
  promotions: true,
  newRestaurants: false,
  deliveryStatus: true,
  paymentReminders: true,
  marketing: false,
  sound: true,
  vibration: true,
};

const sanitizeNotificationPreferences = (payload = {}) => ({
  orderUpdates: payload.orderUpdates ?? defaultNotificationPreferences.orderUpdates,
  promotions: payload.promotions ?? defaultNotificationPreferences.promotions,
  newRestaurants: payload.newRestaurants ?? defaultNotificationPreferences.newRestaurants,
  deliveryStatus: payload.deliveryStatus ?? defaultNotificationPreferences.deliveryStatus,
  paymentReminders: payload.paymentReminders ?? defaultNotificationPreferences.paymentReminders,
  marketing: payload.marketing ?? defaultNotificationPreferences.marketing,
  sound: payload.sound ?? defaultNotificationPreferences.sound,
  vibration: payload.vibration ?? defaultNotificationPreferences.vibration,
});

exports.getNotificationPreferences = async (req, res) => {
  try {
    const result = await query(
      'SELECT notification_preferences FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    const stored = result.rows[0]?.notification_preferences || {};

    res.json({
      success: true,
      data: {
        preferences: sanitizeNotificationPreferences(stored),
      },
    });
  } catch (error) {
    logger.error('Erreur getNotificationPreferences:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erreur lors de la récupération des préférences',
      },
    });
  }
};

exports.updateNotificationPreferences = async (req, res) => {
  try {
    const sanitized = sanitizeNotificationPreferences(req.body || {});

    const result = await query(
      `UPDATE users
       SET notification_preferences = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING notification_preferences`,
      [sanitized, req.user.id]
    );

    res.json({
      success: true,
      message: 'Préférences mises à jour',
      data: {
        preferences: sanitizeNotificationPreferences(
          result.rows[0]?.notification_preferences
        ),
      },
    });
  } catch (error) {
    logger.error('Erreur updateNotificationPreferences:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Erreur lors de la mise à jour des préférences',
      },
    });
  }
};

/**
 * Mettre à jour le profil
 */
exports.updateProfile = async (req, res) => {
  try {
    const normalizeOptionalField = (value) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      if (typeof value === 'string' && value.trim() === '') return null;
      return value;
    };

    const normalizedBody = {
      first_name: normalizeOptionalField(req.body.first_name),
      last_name: normalizeOptionalField(req.body.last_name),
      email: normalizeOptionalField(req.body.email),
      gender: normalizeOptionalField(req.body.gender),
      date_of_birth: normalizeOptionalField(req.body.date_of_birth),
      profile_picture: normalizeOptionalField(req.body.profile_picture),
    };

    const { first_name, last_name, email, gender, date_of_birth, profile_picture } = normalizedBody;
    
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (first_name !== undefined) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(last_name);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (gender !== undefined) {
      updates.push(`gender = $${paramCount++}`);
      values.push(gender);
    }
    if (date_of_birth !== undefined) {
      updates.push(`date_of_birth = $${paramCount++}`);
      values.push(date_of_birth);
    }
    if (profile_picture !== undefined) {
      updates.push(`profile_picture = $${paramCount++}`);
      values.push(profile_picture);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_UPDATES',
          message: 'Aucune mise à jour fournie',
        },
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.user.id);

    const result = await query(
      `UPDATE users 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, phone, email, first_name, last_name, profile_picture, 
                 gender, date_of_birth, referral_code, loyalty_points`,
      values
    );

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: {
        user: result.rows[0],
      },
    });
  } catch (error) {
    logger.error('Erreur updateProfile:', error);
    
    if (error.code === '23505') { // Violation de contrainte unique
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Cet email est déjà utilisé',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Erreur lors de la mise à jour',
      },
    });
  }
};

/**
 * Upload photo de profil utilisateur
 */
exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      logger.warn('Upload photo user: aucun fichier reçu', {
        body: req.body,
        files: req.files,
        headers: req.headers['content-type'],
      });
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'Aucun fichier fourni',
        },
      });
    }

    if (!req.file.buffer) {
      logger.error('Upload photo user: fichier sans buffer', {
        file: {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          fieldname: req.file.fieldname,
        },
      });
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE',
          message: 'Fichier invalide: buffer manquant',
        },
      });
    }

    const { uploadService } = require('../services/upload.service');
    const config = require('../config');
    const requestBaseUrl = `${req.protocol}://${req.get('host')}`;
    const normalizeLocalUrl = (url) => {
      if (!url) return url;
      try {
        const parsed = new URL(url);
        if (['localhost', '127.0.0.1'].includes(parsed.hostname)) {
          return `${requestBaseUrl}${parsed.pathname}`;
        }
      } catch (error) {
        if (url.startsWith('/')) {
          return `${requestBaseUrl}${url}`;
        }
      }
      return url;
    };

    return await transaction(async (client) => {
      const uploadProvider = config.upload?.provider || 'local';
      let uploadResult;

      if (uploadProvider === 's3') {
        try {
          uploadResult = await uploadService.uploadToS3(req.file, 'user-profiles');
        } catch (error) {
          logger.error('Erreur upload S3 (user), tentative Cloudinary:', error);
          if (config.upload?.cloudinary?.cloudName) {
            uploadResult = await uploadService.uploadToCloudinary(req.file, 'user-profiles');
          } else {
            throw error;
          }
        }
      } else if (uploadProvider === 'cloudinary') {
        uploadResult = await uploadService.uploadToCloudinary(req.file, 'user-profiles');
      } else {
        uploadResult = await uploadService.uploadToLocal(
          req.file,
          'user-profiles',
          { baseUrl: requestBaseUrl }
        );
      }

      const publicUrl = normalizeLocalUrl(uploadResult.url);

      await client.query(
        'UPDATE users SET profile_picture = $1, updated_at = NOW() WHERE id = $2',
        [publicUrl, req.user.id]
      );

      const updatedUser = await client.query(
        'SELECT id, phone, email, first_name, last_name, profile_picture, gender, date_of_birth FROM users WHERE id = $1',
        [req.user.id]
      );

      res.json({
        success: true,
        message: 'Photo de profil mise à jour avec succès',
        data: {
          profile_picture: publicUrl,
          user: {
            ...updatedUser.rows[0],
            profile_picture: publicUrl,
          },
        },
      });
    });
  } catch (error) {
    logger.error('Erreur uploadProfilePicture user:', {
      message: error.message,
      stack: error.stack,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        hasBuffer: !!req.file.buffer,
      } : 'No file',
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: error.message || 'Erreur lors de l\'upload de la photo',
      },
    });
  }
};

/**
 * Supprimer la photo de profil utilisateur
 */
exports.deleteProfilePicture = async (req, res) => {
  try {
    const result = await query(
      'UPDATE users SET profile_picture = NULL, updated_at = NOW() WHERE id = $1 RETURNING id, profile_picture',
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'Photo de profil supprimée',
      data: {
        user: result.rows[0],
      },
    });
  } catch (error) {
    logger.error('Erreur deleteProfilePicture user:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Erreur lors de la suppression de la photo',
      },
    });
  }
};

/**
 * Obtenir toutes les adresses
 */
exports.getAddresses = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM addresses 
       WHERE user_id = $1 
       ORDER BY is_default DESC, created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        addresses: result.rows,
      },
    });
  } catch (error) {
    logger.error('Erreur getAddresses:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erreur lors de la récupération des adresses',
      },
    });
  }
};

/**
 * Ajouter une nouvelle adresse
 */
exports.addAddress = async (req, res) => {
  try {
    const { title, address_line, district, landmark, latitude, longitude, is_default } = req.body;

    return await transaction(async (client) => {
      // Si latitude/longitude ne sont pas fournis, utiliser geocoding gratuit (OpenStreetMap)
      let finalLat = latitude;
      let finalLon = longitude;
      
      if (!finalLat || !finalLon) {
        const fullAddress = `${address_line}${district ? `, ${district}` : ''}, Korhogo, Côte d'Ivoire`;
        logger.info('Geocoding adresse avec OpenStreetMap', { address: fullAddress });
        
        const geocodeResult = await mapsService.geocode(fullAddress);
        if (geocodeResult) {
          finalLat = geocodeResult.latitude;
          finalLon = geocodeResult.longitude;
          logger.info('Geocoding réussi', { 
            address: fullAddress,
            coordinates: `${finalLat}, ${finalLon}`
          });
        } else {
          // Si geocoding échoue, utiliser les coordonnées par défaut de Korhogo
          logger.warn('Geocoding échoué, utilisation des coordonnées par défaut de Korhogo', { address: fullAddress });
          finalLat = 9.4581; // Coordonnées de Korhogo
          finalLon = -5.6296;
        }
      }

      // Si nouvelle adresse par défaut, retirer le défaut des autres
      if (is_default) {
        await client.query(
          'UPDATE addresses SET is_default = false WHERE user_id = $1',
          [req.user.id]
        );
      }

      const result = await client.query(
        `INSERT INTO addresses 
         (user_id, title, address_line, district, landmark, latitude, longitude, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [req.user.id, title, address_line, district, landmark, finalLat, finalLon, is_default || false]
      );

      res.json({
        success: true,
        message: 'Adresse ajoutée avec succès',
        data: {
          address: result.rows[0],
        },
      });
    });
  } catch (error) {
    logger.error('Erreur addAddress:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADD_ERROR',
        message: 'Erreur lors de l\'ajout de l\'adresse',
      },
    });
  }
};

/**
 * Mettre à jour une adresse
 */
exports.updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, address_line, district, landmark, latitude, longitude, is_default } = req.body;

    return await transaction(async (client) => {
      // Vérifier que l'adresse appartient à l'utilisateur
      const checkResult = await client.query(
        'SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ADDRESS_NOT_FOUND',
            message: 'Adresse non trouvée',
          },
        });
      }

      // Si nouvelle adresse par défaut, retirer le défaut des autres
      if (is_default) {
        await client.query(
          'UPDATE addresses SET is_default = false WHERE user_id = $1 AND id != $2',
          [req.user.id, id]
        );
      }

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (title !== undefined) {
        updates.push(`title = $${paramCount++}`);
        values.push(title);
      }
      if (address_line !== undefined) {
        updates.push(`address_line = $${paramCount++}`);
        values.push(address_line);
      }
      if (district !== undefined) {
        updates.push(`district = $${paramCount++}`);
        values.push(district);
      }
      if (landmark !== undefined) {
        updates.push(`landmark = $${paramCount++}`);
        values.push(landmark);
      }
      if (latitude !== undefined) {
        updates.push(`latitude = $${paramCount++}`);
        values.push(latitude);
      }
      if (longitude !== undefined) {
        updates.push(`longitude = $${paramCount++}`);
        values.push(longitude);
      }
      if (is_default !== undefined) {
        updates.push(`is_default = $${paramCount++}`);
        values.push(is_default);
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const result = await client.query(
        `UPDATE addresses 
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );

      res.json({
        success: true,
        message: 'Adresse mise à jour avec succès',
        data: {
          address: result.rows[0],
        },
      });
    });
  } catch (error) {
    logger.error('Erreur updateAddress:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Erreur lors de la mise à jour',
      },
    });
  }
};

/**
 * Supprimer une adresse
 */
exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ADDRESS_NOT_FOUND',
          message: 'Adresse non trouvée',
        },
      });
    }

    res.json({
      success: true,
      message: 'Adresse supprimée avec succès',
    });
  } catch (error) {
    logger.error('Erreur deleteAddress:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Erreur lors de la suppression',
      },
    });
  }
};

/**
 * Obtenir l'historique des commandes
 */
exports.getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT o.*, 
             r.name as restaurant_name, 
             r.logo as restaurant_logo,
             r.banner as restaurant_banner,
             r.average_rating as restaurant_rating
      FROM orders o
      LEFT JOIN restaurants r ON o.restaurant_id = r.id
      WHERE o.user_id = $1
    `;
    const values = [req.user.id];

    if (status) {
      queryText += ` AND o.status = $2`;
      values.push(status);
    }

    queryText += ` ORDER BY o.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await query(queryText, values);

    // Compter le total
    const countResult = await query(
      status 
        ? 'SELECT COUNT(*) FROM orders WHERE user_id = $1 AND status = $2' 
        : 'SELECT COUNT(*) FROM orders WHERE user_id = $1',
      status ? [req.user.id, status] : [req.user.id]
    );

    const total = parseInt(countResult.rows[0].count);

    // Formater les commandes avec les infos restaurant
    const formattedOrders = result.rows.map(order => ({
      ...order,
      restaurant: {
        id: order.restaurant_id,
        name: order.restaurant_name,
        logo: order.restaurant_logo,
        banner: order.restaurant_banner,
        rating: order.restaurant_rating || 4.0,
      },
    }));

    res.json({
      success: true,
      data: {
        orders: formattedOrders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getOrders:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erreur lors de la récupération des commandes',
      },
    });
  }
};

/**
 * Obtenir les favoris
 */
exports.getFavorites = async (req, res) => {
  try {
    const result = await query(
      `SELECT r.* 
       FROM restaurants r
       INNER JOIN favorites f ON r.id = f.restaurant_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        favorites: result.rows,
      },
    });
  } catch (error) {
    logger.error('Erreur getFavorites:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erreur lors de la récupération des favoris',
      },
    });
  }
};

/**
 * Ajouter aux favoris
 */
exports.addFavorite = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    await query(
      `INSERT INTO favorites (user_id, restaurant_id) 
       VALUES ($1, $2)
       ON CONFLICT (user_id, restaurant_id) DO NOTHING`,
      [req.user.id, restaurantId]
    );

    res.json({
      success: true,
      message: 'Ajouté aux favoris',
    });
  } catch (error) {
    logger.error('Erreur addFavorite:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADD_ERROR',
        message: 'Erreur lors de l\'ajout aux favoris',
      },
    });
  }
};

/**
 * Retirer des favoris
 */
exports.removeFavorite = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    await query(
      'DELETE FROM favorites WHERE user_id = $1 AND restaurant_id = $2',
      [req.user.id, restaurantId]
    );

    res.json({
      success: true,
      message: 'Retiré des favoris',
    });
  } catch (error) {
    logger.error('Erreur removeFavorite:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Erreur lors de la suppression',
      },
    });
  }
};

/**
 * Obtenir les points de fidélité
 */
exports.getLoyaltyPoints = async (req, res) => {
  try {
    const result = await query(
      'SELECT loyalty_points, total_orders, total_spent FROM users WHERE id = $1',
      [req.user.id]
    );

    const points = result.rows[0]?.loyalty_points || 0;
    
    // === CALCUL DU NIVEAU DE FIDÉLITÉ ===
    // Paliers:
    // - Bronze: 0 à 100 points (5% de réduction)
    // - Argent: 101 à 500 points (10% de réduction)
    // - Or: 501 points et plus (15% de réduction)
    let level = 'bronze';
    let discount = 5;
    let nextLevel = 'argent';
    let pointsToNextLevel = 101 - points;
    let progress = Math.min((points / 101) * 100, 100);

    if (points > 500) {
      level = 'or';
      discount = 15;
      nextLevel = null;
      pointsToNextLevel = 0;
      progress = 100;
    } else if (points > 100) {
      level = 'argent';
      discount = 10;
      nextLevel = 'or';
      pointsToNextLevel = 501 - points;
      progress = ((points - 100) / 400) * 100;
    }

    // Valeur en FCFA des points (1 point = 5 FCFA)
    const pointsValue = points * 5;

    res.json({
      success: true,
      data: {
        points,
        level,
        level_name: level === 'bronze' ? 'Bronze' : level === 'argent' ? 'Argent' : 'Or',
        discount_percent: discount,
        next_level: nextLevel ? (nextLevel === 'argent' ? 'Argent' : 'Or') : null,
        points_to_next_level: Math.max(0, pointsToNextLevel),
        progress_percent: Math.round(progress),
        points_value_fcfa: pointsValue,
        // Avantages par niveau
        benefits: {
          bronze: {
            discount: 5,
            description: '5% de réduction sur toutes les commandes',
          },
          argent: {
            discount: 10,
            description: '10% de réduction sur toutes les commandes',
          },
          or: {
            discount: 15,
            description: '15% de réduction + livraison prioritaire',
          },
        },
        // Statistiques
        total_orders: result.rows[0]?.total_orders || 0,
        total_spent: result.rows[0]?.total_spent || 0,
      },
    });
  } catch (error) {
    logger.error('Erreur getLoyaltyPoints:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erreur lors de la récupération des points',
      },
    });
  }
};

/**
 * Obtenir l'historique des transactions de fidélité
 */
exports.getLoyaltyTransactions = async (req, res) => {
  try {
    const { limit = 30, offset = 0 } = req.query;
    
    // Vérifier si une table loyalty_transactions existe
    // Si elle n'existe pas, retourner un tableau vide pour l'instant
    let transactions = [];
    
    try {
      // Essayer de récupérer depuis une table loyalty_transactions si elle existe
      const result = await query(
        `SELECT 
          id, 
          type, 
          amount, 
          points,
          reason,
          description,
          created_at
         FROM loyalty_transactions 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [req.user.id, parseInt(limit), parseInt(offset)]
      );
      transactions = result.rows;
    } catch (tableError) {
      // Si la table n'existe pas, on retourne un tableau vide
      // Cela permet au code client de fonctionner même si la table n'est pas encore créée
      logger.warn('Table loyalty_transactions n\'existe pas encore, retour d\'un tableau vide');
      transactions = [];
    }

    res.json({
      success: true,
      data: {
        transactions,
        total: transactions.length,
      },
    });
  } catch (error) {
    logger.error('Erreur getLoyaltyTransactions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erreur lors de la récupération des transactions',
      },
    });
  }
};

/**
 * Obtenir les informations de parrainage
 */
exports.getReferrals = async (req, res) => {
  try {
    const result = await query(
      `SELECT r.*, u.first_name, u.last_name, u.phone
       FROM referrals r
       LEFT JOIN users u ON r.referee_id = u.id
       WHERE r.referrer_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    const userResult = await query(
      'SELECT referral_code FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        referral_code: userResult.rows[0].referral_code,
        referrals: result.rows,
        total_referrals: result.rows.length,
        completed_referrals: result.rows.filter(r => r.status === 'completed').length,
      },
    });
  } catch (error) {
    logger.error('Erreur getReferrals:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erreur lors de la récupération des parrainages',
      },
    });
  }
};

/**
 * Valider un code promo
 */
exports.validatePromoCode = async (req, res) => {
  try {
    // eslint-disable-next-line no-unused-vars
    const { code, restaurant_id, order_amount } = req.body;

    // TODO: Implémenter la validation du code promo
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Fonctionnalité en cours de développement',
      },
    });
  } catch (error) {
    logger.error('Erreur validatePromoCode:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Erreur lors de la validation du code promo',
      },
    });
  }
};

/**
 * Obtenir les tickets de support
 */
exports.getSupportTickets = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority, category } = req.query;
    const offset = (page - 1) * limit;
    const userType = req.user.type === 'client' ? 'user' : req.user.type;

    let queryText = `
      SELECT t.*
      FROM support_tickets t
      WHERE t.user_id = $1 AND t.user_type = $2
    `;
    const values = [req.user.id, userType];
    let paramIndex = 3;

    if (status) {
      queryText += ` AND t.status = $${paramIndex++}`;
      values.push(status);
    }
    if (priority) {
      queryText += ` AND t.priority = $${paramIndex++}`;
      values.push(priority);
    }
    if (category) {
      queryText += ` AND t.category = $${paramIndex++}`;
      values.push(category);
    }

    queryText += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await query(queryText, values);

    let countQuery = `
      SELECT COUNT(*) 
      FROM support_tickets t
      WHERE t.user_id = $1 AND t.user_type = $2
    `;
    const countValues = [req.user.id, userType];
    let countParamIndex = 3;

    if (status) {
      countQuery += ` AND t.status = $${countParamIndex++}`;
      countValues.push(status);
    }
    if (priority) {
      countQuery += ` AND t.priority = $${countParamIndex++}`;
      countValues.push(priority);
    }
    if (category) {
      countQuery += ` AND t.category = $${countParamIndex++}`;
      countValues.push(category);
    }

    const countResult = await query(countQuery, countValues);

    res.json({
      success: true,
      data: {
        tickets: result.rows,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: parseInt(countResult.rows[0].count, 10),
          pages: Math.ceil(countResult.rows[0].count / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getSupportTickets:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erreur lors de la récupération des tickets',
      },
    });
  }
};

/**
 * Créer un ticket de support
 */
exports.createSupportTicket = async (req, res) => {
  try {
    const { category, subject, message, order_id, priority, photos } = req.body;
    const userType = req.user.type === 'client' ? 'user' : req.user.type;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Champs requis manquants: subject, message',
        },
      });
    }

    return await transaction(async (client) => {
      const ticketNumberResult = await client.query(
        'SELECT generate_ticket_number() AS ticket_number'
      );
      const ticketNumber = ticketNumberResult.rows?.[0]?.ticket_number;

      const insertColumns = [
        'ticket_number',
        'subject',
        'description',
        'priority',
        'category',
        'user_type',
        'user_id',
        'order_id',
        'status',
      ];
      const insertValues = [
        ticketNumber,
        subject,
        message,
        priority || 'medium',
        category || null,
        userType,
        req.user.id,
        order_id || null,
        'open',
      ];
      const placeholders = insertValues.map((_, index) => `$${index + 1}`);

      if (Array.isArray(photos)) {
        insertColumns.push('photos');
        insertValues.push(photos.filter((photo) => typeof photo === 'string' && photo.trim()));
        placeholders.push(`$${placeholders.length + 1}`);
      }

      const result = await client.query(
        `INSERT INTO support_tickets (${insertColumns.join(', ')})
         VALUES (${placeholders.join(', ')})
         RETURNING id, ticket_number, subject, description, priority, category, status, created_at, order_id`,
        insertValues
      );

      const hasIsInternal = await hasTicketMessagesColumn(client, 'is_internal');
      const insertMessageQuery = hasIsInternal
        ? `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message, is_internal)
           VALUES ($1, $2, $3, $4, false)`
        : `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message)
           VALUES ($1, $2, $3, $4)`;
      await client.query(insertMessageQuery, [result.rows[0].id, userType, req.user.id, message]);

      res.status(201).json({
        success: true,
        message: 'Ticket de support créé avec succès',
        data: {
          ticket: result.rows[0],
        },
      });
    });
  } catch (error) {
    logger.error('Erreur createSupportTicket:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Erreur lors de la création du ticket',
      },
    });
  }
};

/**
 * Obtenir un ticket de support par ID
 */
exports.getSupportTicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userType = req.user.type === 'client' ? 'user' : req.user.type;

    const ticketResult = await query(
      `SELECT *
       FROM support_tickets
       WHERE id = $1 AND user_id = $2 AND user_type = $3`,
      [ticketId, req.user.id, userType]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'TICKET_NOT_FOUND', message: 'Ticket non trouvé' },
      });
    }

    const hasIsInternal = await hasTicketMessagesColumn(query, 'is_internal');
    const messagesQuery = hasIsInternal
      ? `SELECT id, sender_type, message, created_at
         FROM ticket_messages
         WHERE ticket_id = $1 AND (is_internal = false OR is_internal IS NULL)
         ORDER BY created_at ASC`
      : `SELECT id, sender_type, message, created_at
         FROM ticket_messages
         WHERE ticket_id = $1
         ORDER BY created_at ASC`;
    const messagesResult = await query(messagesQuery, [ticketId]);

    const ticket = ticketResult.rows[0];
    const messages = messagesResult.rows.map((message) => ({
      id: message.id,
      sender: message.sender_type,
      text: message.message,
      timestamp: message.created_at,
    }));

    res.json({
      success: true,
      data: {
        ticket: {
          ...ticket,
          messages,
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getSupportTicketById:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erreur lors de la récupération du ticket',
      },
    });
  }
};

/**
 * Ajouter un message à un ticket
 */
exports.addTicketMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;
    const userType = req.user.type === 'client' ? 'user' : req.user.type;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_MESSAGE', message: 'Message requis' },
      });
    }

    const ticketResult = await query(
      `SELECT id, status
       FROM support_tickets
       WHERE id = $1 AND user_id = $2 AND user_type = $3`,
      [ticketId, req.user.id, userType]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'TICKET_NOT_FOUND', message: 'Ticket non trouvé' },
      });
    }

    if (ticketResult.rows[0].status === 'closed') {
      return res.status(400).json({
        success: false,
        error: { code: 'TICKET_CLOSED', message: 'Ticket fermé' },
      });
    }

    const hasIsInternal = await hasTicketMessagesColumn(query, 'is_internal');
    const insertMessageQuery = hasIsInternal
      ? `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message, is_internal)
         VALUES ($1, $2, $3, $4, false)
         RETURNING id, sender_type, message, created_at`
      : `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message)
         VALUES ($1, $2, $3, $4)
         RETURNING id, sender_type, message, created_at`;
    const result = await query(insertMessageQuery, [ticketId, userType, req.user.id, message.trim()]);

    await query(
      `UPDATE support_tickets 
       SET status = CASE 
         WHEN status = 'open' THEN 'waiting_customer'
         WHEN status = 'in_progress' THEN 'waiting_customer'
         ELSE status
       END,
       updated_at = NOW()
       WHERE id = $1`,
      [ticketId]
    );

    res.json({
      success: true,
      message: 'Message envoyé',
      data: {
        message: {
          id: result.rows[0].id,
          sender: result.rows[0].sender_type,
          text: result.rows[0].message,
          timestamp: result.rows[0].created_at,
        },
      },
    });
  } catch (error) {
    logger.error('Erreur addTicketMessage:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADD_ERROR',
        message: 'Erreur lors de l\'ajout du message',
      },
    });
  }
};

/**
 * Fermer un ticket de support
 */
exports.closeSupportTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userType = req.user.type === 'client' ? 'user' : req.user.type;

    const result = await query(
      `UPDATE support_tickets
       SET status = 'closed', closed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND user_type = $3
       RETURNING id, status, closed_at`,
      [ticketId, req.user.id, userType]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'TICKET_NOT_FOUND', message: 'Ticket non trouvé' },
      });
    }

    res.json({
      success: true,
      message: 'Ticket fermé',
      data: {
        ticket: result.rows[0],
      },
    });
  } catch (error) {
    logger.error('Erreur closeSupportTicket:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Erreur lors de la fermeture du ticket',
      },
    });
  }
};

/**
 * ═══════════════════════════════════════════════════════════
 * RGPD - EXPORT ET SUPPRESSION DES DONNÉES
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Exporter toutes les données utilisateur (RGPD - Droit d'accès)
 * Format JSON ou CSV
 */
exports.exportUserData = async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const userId = req.user.id;

    // Récupérer toutes les données utilisateur
    const userData = await query(
      `SELECT id, phone, email, first_name, last_name, profile_picture,
              gender, date_of_birth, referral_code, loyalty_points,
              total_spent, total_orders, status, created_at, updated_at, last_login
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userData.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    const user = userData.rows[0];

    // Récupérer les adresses
    const addresses = await query(
      'SELECT * FROM addresses WHERE user_id = $1',
      [userId]
    );

    // Récupérer les commandes
    const orders = await query(
      `SELECT o.*, r.name as restaurant_name
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [userId]
    );

    // Récupérer les avis
    const reviews = await query(
      'SELECT * FROM reviews WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    // Récupérer les favoris
    const favorites = await query(
      `SELECT f.*, r.name as restaurant_name
       FROM favorites f
       LEFT JOIN restaurants r ON f.restaurant_id = r.id
       WHERE f.user_id = $1`,
      [userId]
    );

    // Récupérer les tickets support
    const tickets = await query(
      'SELECT * FROM support_tickets WHERE user_id = $1 AND user_type = $2 ORDER BY created_at DESC',
      [userId, 'user']
    );

    // Récupérer les transactions
    const transactions = await query(
      `SELECT * FROM transactions 
       WHERE (from_user_id = $1 AND from_user_type = 'user') 
          OR (to_user_id = $1 AND to_user_type = 'user')
       ORDER BY created_at DESC`,
      [userId]
    );

    // Compiler toutes les données
    const exportData = {
      user: user,
      addresses: addresses.rows,
      orders: orders.rows,
      reviews: reviews.rows,
      favorites: favorites.rows,
      support_tickets: tickets.rows,
      transactions: transactions.rows,
      exported_at: new Date().toISOString(),
      export_format: format,
    };

    // Si format CSV
    if (format === 'csv') {
      // Convertir en CSV simple (juste les commandes pour l'exemple)
      const csvHeader = 'ID,Numéro,Date,Montant,Restaurant,Statut\n';
      const csvRows = orders.rows.map(order => 
        `${order.id},${order.order_number},${order.placed_at},${order.total},${order.restaurant_name || 'N/A'},${order.status}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="baibebalo-data-${userId}-${Date.now()}.csv"`);
      return res.send(csvHeader + csvRows);
    }

    // Format JSON par défaut
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="baibebalo-data-${userId}-${Date.now()}.json"`);
    res.json({
      success: true,
      data: exportData,
      message: 'Données exportées avec succès',
    });

  } catch (error) {
    logger.error('Erreur exportUserData:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EXPORT_ERROR',
        message: 'Erreur lors de l\'export des données',
      },
    });
  }
};

/**
 * Supprimer le compte utilisateur (RGPD - Droit à l'oubli)
 * Soft delete avec anonymisation des données
 */
exports.deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    // Note: password pourrait être utilisé pour vérification future

    // Vérifier que l'utilisateur n'a pas de commandes en cours
    const activeOrders = await query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE user_id = $1 
       AND status IN ('new', 'accepted', 'preparing', 'ready', 'delivering')`,
      [userId]
    );

    if (parseInt(activeOrders.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ACTIVE_ORDERS',
          message: 'Impossible de supprimer le compte avec des commandes en cours',
        },
      });
    }

    // Anonymiser les données (soft delete)
    await transaction(async (client) => {
      // Anonymiser le profil utilisateur
      await client.query(
        `UPDATE users 
         SET phone = 'ANONYMIZED_' || id::text,
             email = NULL,
             first_name = 'Utilisateur',
             last_name = 'Supprimé',
             profile_picture = NULL,
             status = 'deleted',
             updated_at = NOW()
         WHERE id = $1`,
        [userId]
      );

      // Anonymiser les adresses (garder pour historique commandes)
      await client.query(
        `UPDATE addresses 
         SET address_line = 'Adresse supprimée',
             landmark = NULL,
             updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

      // Anonymiser les avis (garder les notes mais anonymiser commentaires)
      await client.query(
        `UPDATE reviews 
         SET comment = NULL,
             photos = '{}',
             is_visible = false,
             updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

      // Supprimer les favoris
      await client.query(
        'DELETE FROM favorites WHERE user_id = $1',
        [userId]
      );

      // Anonymiser les tickets support (garder pour historique)
      await client.query(
        `UPDATE support_tickets 
         SET description = 'Ticket anonymisé',
             photos = '{}',
             updated_at = NOW()
         WHERE user_id = $1 AND user_type = 'user'`,
        [userId]
      );

      // Logger l'action
      await client.query(
        `INSERT INTO audit_logs (user_type, user_id, action, resource_type, resource_id, new_values)
         VALUES ('user', $1, 'account_deleted', 'user', $1, $2)`,
        [userId, JSON.stringify({ deleted_at: new Date().toISOString() })]
      );
    });

    logger.info(`Compte utilisateur supprimé (anonymisé): ${userId}`);

    res.json({
      success: true,
      message: 'Votre compte a été supprimé avec succès. Toutes vos données personnelles ont été anonymisées.',
      data: {
        deleted_at: new Date().toISOString(),
      },
    });

  } catch (error) {
    logger.error('Erreur deleteUserAccount:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Erreur lors de la suppression du compte',
      },
    });
  }
};
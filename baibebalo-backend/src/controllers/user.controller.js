const { query, transaction } = require('../database/db');
const logger = require('../utils/logger');
const mapsService = require('../services/maps.service');

/**
 * Obtenir le profil de l'utilisateur connecté
 */
exports.getProfile = async (req, res) => {
  try {
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
        user: result.rows[0],
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

/**
 * Mettre à jour le profil
 */
exports.updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, email, gender, date_of_birth, profile_picture } = req.body;
    
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
          logger.warn('Geocoding échoué, coordonnées manquantes', { address: fullAddress });
          return res.status(400).json({
            success: false,
            error: {
              code: 'GEOCODING_FAILED',
              message: 'Impossible de localiser l\'adresse. Veuillez fournir les coordonnées GPS.',
            },
          });
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
      SELECT o.*, r.name as restaurant_name, r.logo as restaurant_logo
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

    res.json({
      success: true,
      data: {
        orders: result.rows,
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
      'SELECT loyalty_points FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        points: result.rows[0].loyalty_points,
        // TODO: Ajouter historique des points
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
    // TODO: Implémenter la récupération des tickets
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Fonctionnalité en cours de développement',
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
    // TODO: Implémenter la création de ticket
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Fonctionnalité en cours de développement',
      },
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
    // TODO: Implémenter la récupération d'un ticket
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Fonctionnalité en cours de développement',
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
    // TODO: Implémenter l'ajout de message
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Fonctionnalité en cours de développement',
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
    // TODO: Implémenter la fermeture de ticket
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Fonctionnalité en cours de développement',
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
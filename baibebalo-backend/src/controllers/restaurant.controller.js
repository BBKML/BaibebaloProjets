const { query } = require('../database/db');
const logger = require('../utils/logger');

/**
 * Obtenir la liste des restaurants avec géolocalisation
 */
exports.getRestaurants = async (req, res) => {
  try {
    const {
      category,
      search,
      sort = 'distance',
      page = 1,
      limit = 20,
      min_rating,
      is_open,
      radius,
      min_price,
      max_price,
      cuisine_type,
      free_delivery,
      promotions,
      mobile_money,
      new_restaurants,
      max_delivery_time,
      tags,
    } = req.query;

    const latitude = req.query.latitude || req.query.lat;
    const longitude = req.query.longitude || req.query.lng;
    const parsedLatitude = latitude !== undefined ? parseFloat(latitude) : null;
    const parsedLongitude = longitude !== undefined ? parseFloat(longitude) : null;
    const hasCoords = Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude);

    const offset = (page - 1) * limit;
    const values = [];
    let paramIndex = 1;

    const parsedTags = Array.isArray(tags)
      ? tags.filter(Boolean)
      : typeof tags === 'string'
        ? tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : [];

    const boolFromQuery = (value) => value === true || value === 'true';

    const distanceExpression = hasCoords
      ? `earth_distance(
          ll_to_earth(r.latitude, r.longitude),
          ll_to_earth($1, $2)
        ) / 1000`
      : null;

    if (hasCoords) {
      values.push(parsedLatitude, parsedLongitude);
      paramIndex = 3;
    }

    const whereClauses = [`r.status = 'active'`];

    if (hasCoords) {
      whereClauses.push(`${distanceExpression} <= r.delivery_radius`);
      if (radius) {
        whereClauses.push(`${distanceExpression} <= $${paramIndex}`);
        values.push(parseFloat(radius));
        paramIndex++;
      }
    }

    if (category) {
      whereClauses.push(`r.category = $${paramIndex}`);
      values.push(category);
      paramIndex++;
    }

    if (cuisine_type) {
      whereClauses.push(`r.cuisine_type = $${paramIndex}`);
      values.push(cuisine_type);
      paramIndex++;
    }

    if (search) {
      whereClauses.push(`(
        r.name ILIKE $${paramIndex} OR 
        r.description ILIKE $${paramIndex} OR
        r.cuisine_type ILIKE $${paramIndex} OR
        EXISTS (
          SELECT 1 FROM menu_items mi 
          WHERE mi.restaurant_id = r.id 
          AND mi.is_available = true
          AND (mi.name ILIKE $${paramIndex} OR mi.description ILIKE $${paramIndex})
        )
      )`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (min_rating) {
      whereClauses.push(`r.average_rating >= $${paramIndex}`);
      values.push(parseFloat(min_rating));
      paramIndex++;
    }

    if (is_open === 'true') {
      whereClauses.push(`r.is_open = true`);
    }

    if (min_price || max_price) {
      const priceConditions = [];
      if (min_price) {
        priceConditions.push(`mi.price >= $${paramIndex}`);
        values.push(parseFloat(min_price));
        paramIndex++;
      }
      if (max_price) {
        priceConditions.push(`mi.price <= $${paramIndex}`);
        values.push(parseFloat(max_price));
        paramIndex++;
      }
      whereClauses.push(`EXISTS (
        SELECT 1 FROM menu_items mi 
        WHERE mi.restaurant_id = r.id 
        AND mi.is_available = true
        AND ${priceConditions.join(' AND ')}
      )`);
    }

    if (parsedTags.length > 0) {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM menu_items mi
        WHERE mi.restaurant_id = r.id
        AND mi.is_available = true
        AND mi.tags && $${paramIndex}::text[]
      )`);
      values.push(parsedTags);
      paramIndex++;
    }

    if (boolFromQuery(promotions)) {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM promotions p
        WHERE p.restaurant_id = r.id
        AND p.is_active = true
        AND p.valid_from <= NOW()
        AND p.valid_until >= NOW()
      )`);
    }

    if (boolFromQuery(free_delivery)) {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM promotions p
        WHERE p.restaurant_id = r.id
        AND p.is_active = true
        AND p.type = 'free_delivery'
        AND p.valid_from <= NOW()
        AND p.valid_until >= NOW()
      )`);
    }

    if (boolFromQuery(mobile_money)) {
      whereClauses.push(`r.mobile_money_provider IS NOT NULL`);
    }

    if (boolFromQuery(new_restaurants)) {
      whereClauses.push(`r.created_at >= NOW() - INTERVAL '30 days'`);
    }

    if (max_delivery_time && hasCoords) {
      whereClauses.push(`(15 + (${distanceExpression} * 3)) <= $${paramIndex}`);
      values.push(parseFloat(max_delivery_time));
      paramIndex++;
    }

    let queryText = `
      SELECT r.*,
        ${hasCoords ? `${distanceExpression} as distance_km` : 'NULL as distance_km'},
        (SELECT MIN(price) FROM menu_items mi WHERE mi.restaurant_id = r.id AND mi.is_available = true) as min_price,
        (SELECT MAX(price) FROM menu_items mi WHERE mi.restaurant_id = r.id AND mi.is_available = true) as max_price,
        EXISTS (
          SELECT 1 FROM promotions p
          WHERE p.restaurant_id = r.id
          AND p.is_active = true
          AND p.valid_from <= NOW()
          AND p.valid_until >= NOW()
        ) as has_promotions,
        EXISTS (
          SELECT 1 FROM promotions p
          WHERE p.restaurant_id = r.id
          AND p.is_active = true
          AND p.type = 'free_delivery'
          AND p.valid_from <= NOW()
          AND p.valid_until >= NOW()
        ) as has_free_delivery,
        (r.mobile_money_provider IS NOT NULL) as accepts_mobile_money
      FROM restaurants r
      WHERE ${whereClauses.join(' AND ')}
    `;

    if (sort === 'distance' && hasCoords) {
      queryText += ' ORDER BY distance_km ASC';
    } else if (sort === 'rating') {
      queryText += ' ORDER BY r.average_rating DESC, r.total_reviews DESC';
    } else if (sort === 'popularity') {
      queryText += ' ORDER BY r.total_orders DESC';
    } else {
      queryText += ' ORDER BY r.created_at DESC';
    }

    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(parseInt(limit), offset);

    const result = await query(queryText, values);

    const countQuery = `
      SELECT COUNT(*) FROM restaurants r
      WHERE ${whereClauses.join(' AND ')}
    `;
    const countResult = await query(countQuery, values.slice(0, values.length - 2));
    const total = parseInt(countResult.rows[0].count);

    let restaurants = result.rows.map((restaurant) => ({
      ...restaurant,
      estimated_delivery_time:
        hasCoords && restaurant.distance_km !== null
          ? Math.ceil(15 + restaurant.distance_km * 3)
          : null,
    }));

    if (req.user?.id) {
      const favoritesResult = await query(
        'SELECT restaurant_id FROM favorites WHERE user_id = $1',
        [req.user.id]
      );
      const favoriteIds = favoritesResult.rows.map((f) => f.restaurant_id);

      restaurants = restaurants.map((restaurant) => ({
        ...restaurant,
        is_favorite: favoriteIds.includes(restaurant.id),
      }));
    }

    res.json({
      success: true,
      data: {
        restaurants,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getRestaurants:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erreur lors de la récupération des restaurants',
      },
    });
  }
};

/**
 * Obtenir les détails d'un restaurant
 */
exports.getRestaurantById = async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.query;
    
    let queryText = `
      SELECT r.*,
        ${lat && lng ? `
          earth_distance(
            ll_to_earth(r.latitude, r.longitude),
            ll_to_earth($2, $3)
          ) / 1000 as distance_km
        ` : 'NULL as distance_km'}
      FROM restaurants r
      WHERE r.id = $1 AND r.status = 'active'
    `;
    
    const values = [id];
    if (lat && lng) {
      values.push(parseFloat(lat), parseFloat(lng));
    }
    
    const result = await query(queryText, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RESTAURANT_NOT_FOUND',
          message: 'Restaurant non trouvé',
        },
      });
    }
    
    const restaurant = result.rows[0];
    
    // Vérifier si c'est un favori
    if (req.user?.id) {
      const favResult = await query(
        'SELECT id FROM favorites WHERE user_id = $1 AND restaurant_id = $2',
        [req.user.id, id]
      );
      restaurant.is_favorite = favResult.rows.length > 0;
    }
    
    // Récupérer les derniers avis
    const reviewsResult = await query(
      `SELECT r.*, u.first_name, u.last_name, u.profile_picture
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.restaurant_id = $1
       ORDER BY r.created_at DESC
       LIMIT 5`,
      [id]
    );
    
    restaurant.recent_reviews = reviewsResult.rows;
    
    res.json({
      success: true,
      data: {
        restaurant,
      },
    });
  } catch (error) {
    logger.error('Erreur getRestaurantById:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erreur lors de la récupération du restaurant',
      },
    });
  }
};

/**
 * Obtenir le menu d'un restaurant
 */
exports.getRestaurantMenu = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier que le restaurant existe
    const restaurantResult = await query(
      'SELECT id, name FROM restaurants WHERE id = $1 AND status = $2',
      [id, 'active']
    );
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RESTAURANT_NOT_FOUND',
          message: 'Restaurant non trouvé',
        },
      });
    }
    
    // Récupérer les catégories
    const categoriesResult = await query(
      `SELECT * FROM menu_categories 
       WHERE restaurant_id = $1 AND is_active = true
       ORDER BY display_order ASC, name ASC`,
      [id]
    );
    
    // Récupérer tous les items du menu
    const itemsResult = await query(
      `SELECT * FROM menu_items 
       WHERE restaurant_id = $1 AND is_available = true
       ORDER BY category_id, name ASC`,
      [id]
    );
    
    // Organiser les items par catégorie
    const categories = categoriesResult.rows.map(cat => ({
      ...cat,
      items: itemsResult.rows.filter(item => item.category_id === cat.id),
    }));
    
    res.json({
      success: true,
      data: {
        restaurant: restaurantResult.rows[0],
        categories,
        total_items: itemsResult.rows.length,
      },
    });
  } catch (error) {
    logger.error('Erreur getRestaurantMenu:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erreur lors de la récupération du menu',
      },
    });
  }
};

/**
 * Obtenir les avis d'un restaurant
 */
exports.getRestaurantReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, sort = 'recent' } = req.query;
    const offset = (page - 1) * limit;
    
    let orderBy = 'r.created_at DESC';
    if (sort === 'highest') {
      orderBy = 'r.restaurant_rating DESC, r.created_at DESC';
    } else if (sort === 'lowest') {
      orderBy = 'r.restaurant_rating ASC, r.created_at DESC';
    }
    
    const reviewsResult = await query(
      `SELECT r.*, 
              u.first_name, u.last_name, u.profile_picture,
              o.order_number
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN orders o ON r.order_id = o.id
       WHERE r.restaurant_id = $1
       ORDER BY ${orderBy}
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );
    
    const countResult = await query(
      'SELECT COUNT(*) FROM reviews WHERE restaurant_id = $1',
      [id]
    );
    
    // Statistiques des notes
    const statsResult = await query(
      `SELECT 
        AVG(restaurant_rating) as avg_rating,
        COUNT(*) as total_reviews,
        COUNT(CASE WHEN restaurant_rating = 5 THEN 1 END) as five_stars,
        COUNT(CASE WHEN restaurant_rating = 4 THEN 1 END) as four_stars,
        COUNT(CASE WHEN restaurant_rating = 3 THEN 1 END) as three_stars,
        COUNT(CASE WHEN restaurant_rating = 2 THEN 1 END) as two_stars,
        COUNT(CASE WHEN restaurant_rating = 1 THEN 1 END) as one_star
       FROM reviews 
       WHERE restaurant_id = $1`,
      [id]
    );
    
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      data: {
        reviews: reviewsResult.rows,
        stats: statsResult.rows[0],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getRestaurantReviews:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erreur lors de la récupération des avis',
      },
    });
  }
};

/**
 * Inscription d'un nouveau restaurant
 */
exports.registerRestaurant = async (req, res) => {
  try {
    const {
      name,
      category,
      cuisine_type,
      description,
      phone,
      email,
      password,
      address,
      district,
      latitude,
      longitude,
      opening_hours,
      delivery_radius,
      mobile_money_number,
      mobile_money_provider,
      documents,
    } = req.body;
    
    // Vérifier si email existe déjà
    const existingResult = await query(
      'SELECT id FROM restaurants WHERE email = $1',
      [email]
    );
    
    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Un restaurant avec cet email existe déjà',
        },
      });
    }
    
    // Hasher le mot de passe
    const bcrypt = require('bcrypt');
    const config = require('../config');
    const password_hash = await bcrypt.hash(password, config.security.bcryptRounds);
    
    // Générer un slug
    const slug = name.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim() + '-' + Date.now();
    
    const result = await query(
      `INSERT INTO restaurants (
        name, slug, category, cuisine_type, description,
        phone, email, password_hash, address, district,
        latitude, longitude, opening_hours, delivery_radius,
        mobile_money_number, mobile_money_provider, documents,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id, name, email, status`,
      [
        name, slug, category, cuisine_type, description,
        phone, email, password_hash, address, district,
        latitude, longitude, JSON.stringify(opening_hours), delivery_radius || 10,
        mobile_money_number, mobile_money_provider, JSON.stringify(documents || {}),
        'pending'
      ]
    );
    
    logger.info(`Nouveau restaurant inscrit: ${result.rows[0].id}`);
    
    // TODO: Envoyer email de confirmation
    // TODO: Notifier admin pour validation
    
    res.status(201).json({
      success: true,
      message: 'Inscription réussie. Votre demande sera examinée sous 24-48h.',
      data: {
        restaurant: result.rows[0],
      },
    });
  } catch (error) {
    logger.error('Erreur registerRestaurant:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_ERROR',
        message: 'Erreur lors de l\'inscription',
      },
    });
  }
};

/**
 * Mettre à jour les informations du restaurant (propriétaire)
 */
exports.updateRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier que le restaurant appartient à l'utilisateur
    if (req.user.id !== id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Accès interdit',
        },
      });
    }
    
    const allowedFields = [
      'description', 'phone', 'opening_hours', 'delivery_radius',
      'is_open', 'logo', 'banner', 'photos'
    ];
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIndex++}`);
        values.push(req.body[key]);
      }
    });
    
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
    values.push(id);
    
    const result = await query(
      `UPDATE restaurants 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    delete result.rows[0].password_hash;
    
    res.json({
      success: true,
      message: 'Restaurant mis à jour avec succès',
      data: {
        restaurant: result.rows[0],
      },
    });
  } catch (error) {
    logger.error('Erreur updateRestaurant:', error);
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
 * Créer une catégorie de menu
 */
exports.createMenuCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, display_order } = req.body;
    
    if (req.user.id !== id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Accès interdit' },
      });
    }
    
    const result = await query(
      `INSERT INTO menu_categories (restaurant_id, name, icon, display_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, name, icon, display_order || 0]
    );
    
    res.status(201).json({
      success: true,
      message: 'Catégorie créée avec succès',
      data: { category: result.rows[0] },
    });
  } catch (error) {
    logger.error('Erreur createMenuCategory:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'Erreur lors de la création' },
    });
  }
};

/**
 * Créer un item de menu
 */
exports.createMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category_id, name, description, photo, price,
      options, preparation_time, tags, stock_quantity
    } = req.body;
    
    if (req.user.id !== id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Accès interdit' },
      });
    }
    
    const result = await query(
      `INSERT INTO menu_items (
        restaurant_id, category_id, name, description, photo,
        price, options, preparation_time, tags, stock_quantity
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id, category_id, name, description, photo,
        price, JSON.stringify(options || {}), preparation_time,
        tags || [], stock_quantity
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'Article créé avec succès',
      data: { item: result.rows[0] },
    });
  } catch (error) {
    logger.error('Erreur createMenuItem:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'Erreur lors de la création' },
    });
  }
};

/**
 * Mettre à jour un item de menu
 */
exports.updateMenuItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    
    if (req.user.id !== id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Accès interdit' },
      });
    }
    
    const allowedFields = [
      'name', 'description', 'photo', 'price', 'options',
      'preparation_time', 'is_available', 'stock_quantity', 'tags'
    ];
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIndex++}`);
        values.push(req.body[key]);
      }
    });
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_UPDATES', message: 'Aucune mise à jour fournie' },
      });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(itemId, id);
    
    const result = await query(
      `UPDATE menu_items 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND restaurant_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ITEM_NOT_FOUND', message: 'Article non trouvé' },
      });
    }
    
    res.json({
      success: true,
      message: 'Article mis à jour avec succès',
      data: { item: result.rows[0] },
    });
  } catch (error) {
    logger.error('Erreur updateMenuItem:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' },
    });
  }
};

/**
 * Supprimer un item de menu
 */
exports.deleteMenuItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    
    if (req.user.id !== id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Accès interdit' },
      });
    }
    
    const result = await query(
      'DELETE FROM menu_items WHERE id = $1 AND restaurant_id = $2 RETURNING id',
      [itemId, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ITEM_NOT_FOUND', message: 'Article non trouvé' },
      });
    }
    
    res.json({
      success: true,
      message: 'Article supprimé avec succès',
    });
  } catch (error) {
    logger.error('Erreur deleteMenuItem:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: 'Erreur lors de la suppression' },
    });
  }
};

/**
 * Obtenir le profil du restaurant connecté
 */
exports.getMyProfile = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM restaurants WHERE id = $1',
      [req.user.restaurant_id || req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant non trouvé' },
      });
    }

    res.json({
      success: true,
      data: { restaurant: result.rows[0] },
    });
  } catch (error) {
    logger.error('Erreur getMyProfile:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Mettre à jour le profil du restaurant
 */
exports.updateMyProfile = async (req, res) => {
  try {
    // TODO: Implémenter la mise à jour
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur updateMyProfile:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' },
    });
  }
};

/**
 * Basculer le statut ouvert/fermé
 */
exports.toggleOpenStatus = async (req, res) => {
  try {
    // TODO: Implémenter le toggle
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur toggleOpenStatus:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' },
    });
  }
};

/**
 * Obtenir les catégories du menu
 */
exports.getMyCategories = async (req, res) => {
  try {
    // TODO: Implémenter la récupération
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur getMyCategories:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Mettre à jour une catégorie
 */
exports.updateMenuCategory = async (req, res) => {
  try {
    // TODO: Implémenter la mise à jour
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur updateMenuCategory:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' },
    });
  }
};

/**
 * Supprimer une catégorie
 */
exports.deleteMenuCategory = async (req, res) => {
  try {
    // TODO: Implémenter la suppression
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur deleteMenuCategory:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: 'Erreur lors de la suppression' },
    });
  }
};

/**
 * Obtenir le menu complet
 */
exports.getMyMenu = async (req, res) => {
  try {
    // TODO: Implémenter la récupération
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur getMyMenu:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Basculer la disponibilité d'un article
 */
exports.toggleItemAvailability = async (req, res) => {
  try {
    // TODO: Implémenter le toggle
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur toggleItemAvailability:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' },
    });
  }
};

/**
 * Obtenir les commandes du restaurant
 */
exports.getMyOrders = async (req, res) => {
  try {
    // TODO: Implémenter la récupération
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur getMyOrders:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Obtenir une commande par ID
 */
exports.getMyOrderById = async (req, res) => {
  try {
    // TODO: Implémenter la récupération
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur getMyOrderById:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Obtenir les statistiques
 */
exports.getMyStatistics = async (req, res) => {
  try {
    // TODO: Implémenter la récupération
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur getMyStatistics:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Obtenir les gains
 */
exports.getMyEarnings = async (req, res) => {
  try {
    // TODO: Implémenter la récupération
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur getMyEarnings:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Obtenir les avis
 */
exports.getMyReviews = async (req, res) => {
  try {
    // TODO: Implémenter la récupération
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur getMyReviews:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Demander un paiement
 */
exports.requestPayout = async (req, res) => {
  try {
    // TODO: Implémenter la demande
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur requestPayout:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'Erreur lors de la demande' },
    });
  }
};

/**
 * Obtenir les demandes de paiement
 */
exports.getMyPayoutRequests = async (req, res) => {
  try {
    // TODO: Implémenter la récupération
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur getMyPayoutRequests:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Obtenir les promotions
 */
exports.getMyPromotions = async (req, res) => {
  try {
    // TODO: Implémenter la récupération
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur getMyPromotions:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Créer une promotion
 */
exports.createPromotion = async (req, res) => {
  try {
    // TODO: Implémenter la création
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur createPromotion:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'Erreur lors de la création' },
    });
  }
};

/**
 * Mettre à jour une promotion
 */
exports.updatePromotion = async (req, res) => {
  try {
    // TODO: Implémenter la mise à jour
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur updatePromotion:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' },
    });
  }
};

/**
 * Supprimer une promotion
 */
exports.deletePromotion = async (req, res) => {
  try {
    // TODO: Implémenter la suppression
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur deletePromotion:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: 'Erreur lors de la suppression' },
    });
  }
};

/**
 * Basculer une promotion
 */
exports.togglePromotion = async (req, res) => {
  try {
    // TODO: Implémenter le toggle
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur togglePromotion:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' },
    });
  }
};

/**
 * Répondre à un avis
 */
exports.respondToReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { response } = req.body;
    const restaurantId = req.user.id;

    // Vérifier que l'avis appartient au restaurant
    const reviewResult = await query(
      'SELECT * FROM reviews WHERE id = $1 AND restaurant_id = $2',
      [reviewId, restaurantId]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REVIEW_NOT_FOUND',
          message: 'Avis non trouvé ou ne vous appartient pas',
        },
      });
    }

    // Mettre à jour la réponse (délai de 24h pour modification)
    const review = reviewResult.rows[0];
    const hoursSinceCreation = (new Date() - new Date(review.created_at)) / (1000 * 60 * 60);

    if (review.admin_response && hoursSinceCreation > 24) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EDIT_TIMEOUT',
          message: 'Impossible de modifier la réponse après 24h',
        },
      });
    }

    await query(
      `UPDATE reviews 
       SET admin_response = $1, updated_at = NOW()
       WHERE id = $2`,
      [response, reviewId]
    );

    logger.info(`Restaurant ${restaurantId} a répondu à l'avis ${reviewId}`);

    res.json({
      success: true,
      message: 'Réponse ajoutée avec succès',
      data: {
        review_id: reviewId,
        response,
      },
    });

  } catch (error) {
    logger.error('Erreur respondToReview:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Erreur lors de l\'ajout de la réponse',
      },
    });
  }
};

/**
 * Exporter les données du restaurant (RGPD)
 */
exports.exportRestaurantData = async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const restaurantId = req.user.id;

    // Récupérer les données du restaurant
    const restaurantResult = await query(
      `SELECT * FROM restaurants WHERE id = $1`,
      [restaurantId]
    );

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant non trouvé' },
      });
    }

    const restaurant = restaurantResult.rows[0];

    // Récupérer le menu
    const menuResult = await query(
      `SELECT mc.*, 
              json_agg(
                json_build_object(
                  'id', mi.id,
                  'name', mi.name,
                  'price', mi.price,
                  'description', mi.description,
                  'photo', mi.photo,
                  'is_available', mi.is_available,
                  'total_sold', mi.total_sold
                )
              ) as items
       FROM menu_categories mc
       LEFT JOIN menu_items mi ON mc.id = mi.category_id
       WHERE mc.restaurant_id = $1
       GROUP BY mc.id
       ORDER BY mc.display_order`,
      [restaurantId]
    );

    // Récupérer les commandes
    const ordersResult = await query(
      `SELECT o.*, u.first_name || ' ' || u.last_name as customer_name
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.restaurant_id = $1
       ORDER BY o.created_at DESC`,
      [restaurantId]
    );

    // Récupérer les avis
    const reviewsResult = await query(
      `SELECT r.*, u.first_name || ' ' || u.last_name as customer_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.restaurant_id = $1
       ORDER BY r.created_at DESC`,
      [restaurantId]
    );

    // Récupérer les transactions
    const transactionsResult = await query(
      `SELECT * FROM transactions 
       WHERE (from_user_id = $1 AND from_user_type = 'restaurant') 
          OR (to_user_id = $1 AND to_user_type = 'restaurant')
       ORDER BY created_at DESC`,
      [restaurantId]
    );

    // Compiler les données
    const exportData = {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        category: restaurant.category,
        address: restaurant.address,
        phone: restaurant.phone,
        email: restaurant.email,
        created_at: restaurant.created_at,
      },
      menu: menuResult.rows,
      orders: ordersResult.rows,
      reviews: reviewsResult.rows,
      transactions: transactionsResult.rows,
      exported_at: new Date().toISOString(),
      export_format: format,
    };

    // Format CSV (simplifié - commandes seulement)
    if (format === 'csv') {
      const csvHeader = 'ID,Numéro,Date,Client,Montant,Statut\n';
      const csvRows = ordersResult.rows.map(order => 
        `${order.id},${order.order_number},${order.placed_at},${order.customer_name || 'N/A'},${order.total},${order.status}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="restaurant-data-${restaurantId}-${Date.now()}.csv"`);
      return res.send(csvHeader + csvRows);
    }

    // Format JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="restaurant-data-${restaurantId}-${Date.now()}.json"`);
    res.json({
      success: true,
      data: exportData,
      message: 'Données exportées avec succès',
    });

  } catch (error) {
    logger.error('Erreur exportRestaurantData:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EXPORT_ERROR',
        message: 'Erreur lors de l\'export des données',
      },
    });
  }
};

module.exports = exports;
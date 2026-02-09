const { query } = require('../database/db');
const logger = require('../utils/logger');
const config = require('../config');
const { uploadService } = require('../services/upload.service');

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
        (r.mobile_money_provider IS NOT NULL) as accepts_mobile_money,
        -- Statut sponsorisé (actif si is_sponsored = true ET sponsor_expires_at >= NOW())
        CASE WHEN r.is_sponsored = true AND r.sponsor_expires_at >= NOW() THEN true ELSE false END as is_sponsored,
        COALESCE(r.sponsor_priority, 0) as sponsor_priority
      FROM restaurants r
      WHERE ${whereClauses.join(' AND ')}
    `;

    // Tri: Les restaurants sponsorisés apparaissent en premier, puis tri normal
    if (sort === 'distance' && hasCoords) {
      queryText += ' ORDER BY (CASE WHEN r.is_sponsored = true AND r.sponsor_expires_at >= NOW() THEN 0 ELSE 1 END), r.sponsor_priority DESC, distance_km ASC';
    } else if (sort === 'rating') {
      queryText += ' ORDER BY (CASE WHEN r.is_sponsored = true AND r.sponsor_expires_at >= NOW() THEN 0 ELSE 1 END), r.sponsor_priority DESC, r.average_rating DESC, r.total_reviews DESC';
    } else if (sort === 'popularity') {
      queryText += ' ORDER BY (CASE WHEN r.is_sponsored = true AND r.sponsor_expires_at >= NOW() THEN 0 ELSE 1 END), r.sponsor_priority DESC, r.total_orders DESC';
    } else {
      queryText += ' ORDER BY (CASE WHEN r.is_sponsored = true AND r.sponsor_expires_at >= NOW() THEN 0 ELSE 1 END), r.sponsor_priority DESC, r.created_at DESC';
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
      image_url: restaurant.banner || restaurant.logo || null,
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
 * Obtenir les promotions actives pour les clients
 */
exports.getActivePromotions = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        p.id,
        p.code,
        p.type,
        p.value,
        p.min_order_amount,
        p.max_discount,
        p.valid_from,
        p.valid_until,
        r.id as restaurant_id,
        r.name as restaurant_name,
        r.logo as restaurant_logo,
        r.banner as restaurant_banner
       FROM promotions p
       LEFT JOIN restaurants r ON p.restaurant_id = r.id
       WHERE p.is_active = true
         AND p.valid_from <= NOW()
         AND p.valid_until >= NOW()
         AND (p.applicable_to = 'all' OR p.applicable_to = 'new_users')
       ORDER BY p.created_at DESC
       LIMIT 10`
    );

    const promotions = result.rows.map((p) => ({
      id: p.id,
      code: p.code,
      type: p.type,
      value: parseFloat(p.value),
      min_order_amount: parseFloat(p.min_order_amount || 0),
      max_discount: p.max_discount ? parseFloat(p.max_discount) : null,
      title: p.type === 'percentage' 
        ? `-${p.value}% de réduction`
        : p.type === 'fixed_amount'
        ? `-${p.value} FCFA`
        : p.type === 'free_delivery'
        ? 'Livraison gratuite'
        : 'Promotion spéciale',
      subtitle: p.restaurant_name 
        ? `Chez ${p.restaurant_name}`
        : 'Sur toutes vos commandes',
      restaurant: p.restaurant_id ? {
        id: p.restaurant_id,
        name: p.restaurant_name,
        logo: p.restaurant_logo,
        banner: p.restaurant_banner,
      } : null,
      valid_until: p.valid_until,
    }));

    res.json({
      success: true,
      data: {
        promotions,
      },
    });
  } catch (error) {
    logger.error('Erreur getActivePromotions:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erreur lors de la récupération des promotions',
      },
    });
  }
};

/**
 * Obtenir les catégories de restaurants disponibles
 */
exports.getCategories = async (req, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT 
        r.category,
        COUNT(*) as restaurant_count
       FROM restaurants r
       WHERE r.status = 'active'
       GROUP BY r.category
       ORDER BY restaurant_count DESC, r.category ASC`
    );

    // Mapping des catégories avec icônes fiables (Flaticon CDN)
    const categoryImages = {
      'Restaurant': 'https://cdn-icons-png.flaticon.com/128/3448/3448609.png',
      'Restaurants': 'https://cdn-icons-png.flaticon.com/128/3448/3448609.png',
      'Fast-food': 'https://cdn-icons-png.flaticon.com/128/3595/3595458.png',
      'Fast-Food': 'https://cdn-icons-png.flaticon.com/128/3595/3595458.png',
      'Fast Food': 'https://cdn-icons-png.flaticon.com/128/3595/3595458.png',
      'Pizza': 'https://cdn-icons-png.flaticon.com/128/3595/3595455.png',
      'Grillades': 'https://cdn-icons-png.flaticon.com/128/1046/1046751.png',
      'Maquis': 'https://cdn-icons-png.flaticon.com/128/2082/2082063.png',
      'Bar-restaurant': 'https://cdn-icons-png.flaticon.com/128/931/931949.png',
      'Boulangerie': 'https://cdn-icons-png.flaticon.com/128/3081/3081967.png',
      'Café': 'https://cdn-icons-png.flaticon.com/128/924/924514.png',
      'Plats légers': 'https://cdn-icons-png.flaticon.com/128/2515/2515183.png',
      'Épicerie': 'https://cdn-icons-png.flaticon.com/128/2331/2331970.png',
      'Pharmacie': 'https://cdn-icons-png.flaticon.com/128/2913/2913461.png',
      'Africain': 'https://cdn-icons-png.flaticon.com/128/2082/2082063.png',
      'Européen': 'https://cdn-icons-png.flaticon.com/128/3448/3448609.png',
      'Asiatique': 'https://cdn-icons-png.flaticon.com/128/2276/2276931.png',
      'Livraison colis': 'https://cdn-icons-png.flaticon.com/128/2830/2830312.png',
    };

    const categories = result.rows.map((row) => ({
      id: row.category.toLowerCase().replace(/\s+/g, '_'),
      label: row.category,
      image: categoryImages[row.category] || 'https://cdn-icons-png.flaticon.com/128/3448/3448609.png',
      restaurant_count: parseInt(row.restaurant_count),
    }));

    res.json({
      success: true,
      data: {
        categories,
      },
    });
  } catch (error) {
    logger.error('Erreur getCategories:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erreur lors de la récupération des catégories',
      },
    });
  }
};

/**
 * Obtenir les recherches populaires (plats les plus commandés)
 */
exports.getPopularSearches = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    // Récupérer les noms de plats les plus commandés depuis order_items
    const result = await query(
      `SELECT 
        COALESCE(oi.menu_item_snapshot->>'name', mi.name) as name,
        COUNT(*) as order_count
       FROM order_items oi
       LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
       LEFT JOIN orders o ON oi.order_id = o.id
       WHERE o.status IN ('delivered', 'completed')
         AND COALESCE(oi.menu_item_snapshot->>'name', mi.name) IS NOT NULL
       GROUP BY COALESCE(oi.menu_item_snapshot->>'name', mi.name)
       ORDER BY order_count DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    const popularSearches = result.rows.map((row) => row.name).filter(Boolean);

    // Si pas assez de résultats, ajouter des valeurs par défaut
    const defaultSearches = ['Pizza', 'Burger', 'Choucouya', 'Alloco', 'Boissons'];
    const finalSearches = popularSearches.length > 0 
      ? [...popularSearches, ...defaultSearches.filter(s => !popularSearches.includes(s))].slice(0, parseInt(limit))
      : defaultSearches.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        searches: finalSearches,
      },
    });
  } catch (error) {
    logger.error('Erreur getPopularSearches:', error);
    // En cas d'erreur, retourner des valeurs par défaut
    res.json({
      success: true,
      data: {
        searches: ['Pizza', 'Burger', 'Choucouya', 'Alloco', 'Boissons'],
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
    
    // Ajouter image_url comme fallback pour la compatibilité
    restaurant.image_url = restaurant.banner || restaurant.logo || null;
    
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
    
    // Formater les items avec image_url et prix effectif
    const now = new Date();
    const formattedItems = itemsResult.rows.map(item => {
      // Vérifier si la promotion est active (dans la période si définie)
      const isPromotionActive = item.is_promotional && 
        item.promotional_price &&
        (!item.promotion_start || new Date(item.promotion_start) <= now) &&
        (!item.promotion_end || new Date(item.promotion_end) >= now);
      
      return {
        ...item,
        image_url: item.photo || item.photos?.[0] || null,
        // Prix effectif = prix promo si actif, sinon prix normal
        effective_price: isPromotionActive ? parseFloat(item.promotional_price) : parseFloat(item.price),
        original_price: parseFloat(item.price),
        is_promotion_active: isPromotionActive,
        savings: isPromotionActive ? parseFloat(item.price) - parseFloat(item.promotional_price) : 0,
        savings_percent: isPromotionActive ? 
          Math.round((1 - parseFloat(item.promotional_price) / parseFloat(item.price)) * 100) : 0,
      };
    });
    
    // Organiser les items par catégorie
    const categories = categoriesResult.rows.map(cat => ({
      ...cat,
      items: formattedItems.filter(item => item.category_id === cat.id),
    }));
    
    res.json({
      success: true,
      data: {
        restaurant: restaurantResult.rows[0],
        categories,
        total_items: formattedItems.length,
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
 * Obtenir des suggestions intelligentes de plats complémentaires
 * Basé sur:
 * 1. Items fréquemment achetés ensemble (analyse des paniers)
 * 2. Items populaires du restaurant
 * 3. Complémentarité (plat → boisson, etc.)
 */
exports.getSuggestedItems = async (req, res) => {
  try {
    const { id } = req.params; // restaurant_id
    const { cart_item_ids, limit = 5 } = req.query;
    const userId = req.user?.id;
    
    // Parser les IDs du panier
    let cartItemIds = [];
    if (cart_item_ids) {
      cartItemIds = Array.isArray(cart_item_ids) ? cart_item_ids : cart_item_ids.split(',');
    }
    
    // 1. Items fréquemment achetés ensemble avec les items du panier
    let frequentlyBoughtTogether = [];
    if (cartItemIds.length > 0) {
      const fbtResult = await query(`
        WITH cart_orders AS (
          -- Trouver les commandes qui contiennent les items du panier
          SELECT DISTINCT oi.order_id
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          WHERE oi.menu_item_id = ANY($1::uuid[])
          AND o.status = 'delivered'
          AND o.restaurant_id = $2
        )
        SELECT 
          mi.id,
          mi.name,
          mi.price,
          mi.photo,
          mi.promotional_price,
          mi.is_promotional,
          COUNT(*) as frequency,
          mc.name as category_name
        FROM order_items oi
        JOIN cart_orders co ON oi.order_id = co.order_id
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        LEFT JOIN menu_categories mc ON mi.category_id = mc.id
        WHERE mi.id != ALL($1::uuid[])  -- Exclure les items déjà dans le panier
        AND mi.is_available = true
        GROUP BY mi.id, mi.name, mi.price, mi.photo, mi.promotional_price, mi.is_promotional, mc.name
        ORDER BY frequency DESC
        LIMIT $3
      `, [cartItemIds, id, parseInt(limit)]);
      
      frequentlyBoughtTogether = fbtResult.rows;
    }
    
    // 2. Items populaires du restaurant (si pas assez de suggestions)
    let popularItems = [];
    if (frequentlyBoughtTogether.length < parseInt(limit)) {
      const remaining = parseInt(limit) - frequentlyBoughtTogether.length;
      const excludeIds = [...cartItemIds, ...frequentlyBoughtTogether.map(i => i.id)];
      
      const popularResult = await query(`
        SELECT 
          mi.id,
          mi.name,
          mi.price,
          mi.photo,
          mi.promotional_price,
          mi.is_promotional,
          mi.total_sold,
          mc.name as category_name
        FROM menu_items mi
        LEFT JOIN menu_categories mc ON mi.category_id = mc.id
        WHERE mi.restaurant_id = $1
        AND mi.is_available = true
        AND (array_length($2::uuid[], 1) IS NULL OR mi.id != ALL($2::uuid[]))
        ORDER BY mi.total_sold DESC, mi.created_at DESC
        LIMIT $3
      `, [id, excludeIds.length > 0 ? excludeIds : null, remaining]);
      
      popularItems = popularResult.rows;
    }
    
    // 3. Suggestions de complémentarité (si panier contient plat mais pas boisson)
    let complementaryItems = [];
    if (cartItemIds.length > 0) {
      // Vérifier les catégories des items dans le panier
      const cartCategoriesResult = await query(`
        SELECT DISTINCT mc.name as category_name
        FROM menu_items mi
        JOIN menu_categories mc ON mi.category_id = mc.id
        WHERE mi.id = ANY($1::uuid[])
      `, [cartItemIds]);
      
      const cartCategories = cartCategoriesResult.rows.map(r => r.category_name?.toLowerCase() || '');
      const drinkCategories = ['boissons', 'drinks', 'beverages', 'sodas', 'jus'];
      const foodCategories = ['plats', 'plat principal', 'entrées', 'grillades', 'poissons', 'viandes'];
      
      const hasDrink = cartCategories.some(cat => drinkCategories.some(d => cat.includes(d)));
      const hasFood = cartCategories.some(cat => foodCategories.some(f => cat.includes(f)));
      
      // Si pas de boisson, suggérer des boissons
      if (hasFood && !hasDrink) {
        const drinksResult = await query(`
          SELECT 
            mi.id,
            mi.name,
            mi.price,
            mi.photo,
            mi.promotional_price,
            mi.is_promotional,
            'Complétez avec une boisson' as suggestion_reason,
            mc.name as category_name
          FROM menu_items mi
          JOIN menu_categories mc ON mi.category_id = mc.id
          WHERE mi.restaurant_id = $1
          AND mi.is_available = true
          AND LOWER(mc.name) SIMILAR TO '%(boisson|drink|soda|jus|beverage)%'
          ORDER BY mi.total_sold DESC
          LIMIT 3
        `, [id]);
        complementaryItems = drinksResult.rows;
      }
      
      // Si pas de dessert, suggérer des desserts
      const dessertCategories = ['desserts', 'dessert', 'sucré', 'pâtisseries'];
      const hasDessert = cartCategories.some(cat => dessertCategories.some(d => cat.includes(d)));
      
      if (hasFood && !hasDessert && complementaryItems.length < 2) {
        const dessertsResult = await query(`
          SELECT 
            mi.id,
            mi.name,
            mi.price,
            mi.photo,
            mi.promotional_price,
            mi.is_promotional,
            'Terminez avec un dessert' as suggestion_reason,
            mc.name as category_name
          FROM menu_items mi
          JOIN menu_categories mc ON mi.category_id = mc.id
          WHERE mi.restaurant_id = $1
          AND mi.is_available = true
          AND LOWER(mc.name) SIMILAR TO '%(dessert|sucré|pâtisserie)%'
          ORDER BY mi.total_sold DESC
          LIMIT 2
        `, [id]);
        complementaryItems = [...complementaryItems, ...dessertsResult.rows];
      }
    }
    
    // 4. Suggestions personnalisées basées sur l'historique de l'utilisateur
    let personalizedSuggestions = [];
    if (userId) {
      const personalizedResult = await query(`
        SELECT 
          mi.id,
          mi.name,
          mi.price,
          mi.photo,
          mi.promotional_price,
          mi.is_promotional,
          COUNT(*) as times_ordered,
          'Vous aimez ce plat' as suggestion_reason,
          mc.name as category_name
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        LEFT JOIN menu_categories mc ON mi.category_id = mc.id
        WHERE o.user_id = $1
        AND o.restaurant_id = $2
        AND o.status = 'delivered'
        AND mi.is_available = true
        AND (array_length($3::uuid[], 1) IS NULL OR mi.id != ALL($3::uuid[]))
        GROUP BY mi.id, mi.name, mi.price, mi.photo, mi.promotional_price, mi.is_promotional, mc.name
        ORDER BY times_ordered DESC
        LIMIT 3
      `, [userId, id, cartItemIds.length > 0 ? cartItemIds : null]);
      
      personalizedSuggestions = personalizedResult.rows;
    }
    
    // Combiner toutes les suggestions (sans doublons)
    const allSuggestions = [];
    const seenIds = new Set(cartItemIds);
    
    const addSuggestions = (items, reason) => {
      for (const item of items) {
        if (!seenIds.has(item.id) && allSuggestions.length < parseInt(limit)) {
          seenIds.add(item.id);
          allSuggestions.push({
            ...item,
            suggestion_reason: item.suggestion_reason || reason,
            effective_price: item.is_promotional && item.promotional_price 
              ? parseFloat(item.promotional_price) 
              : parseFloat(item.price),
          });
        }
      }
    };
    
    // Priorité: complémentaire > fréquemment achetés > personnalisé > populaire
    addSuggestions(complementaryItems, 'Complément idéal');
    addSuggestions(frequentlyBoughtTogether, 'Souvent commandé avec');
    addSuggestions(personalizedSuggestions, 'Basé sur vos commandes');
    addSuggestions(popularItems, 'Populaire');
    
    // Informations sur le seuil de livraison gratuite
    const config = require('../config');
    const freeDeliveryThreshold = config.business.freeDeliveryThreshold || 5000;
    const bundleDiscountPercent = config.business.bundleDiscountPercent || 5;
    
    res.json({
      success: true,
      data: {
        suggestions: allSuggestions,
        tips: {
          free_delivery_threshold: freeDeliveryThreshold,
          bundle_discount_percent: bundleDiscountPercent,
          bundle_message: `Ajoutez une boisson pour -${bundleDiscountPercent}% sur votre commande`,
          free_delivery_message: `Livraison gratuite à partir de ${freeDeliveryThreshold} FCFA`,
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getSuggestedItems:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des suggestions' },
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
      landmark,
      latitude,
      longitude,
      opening_hours,
      delivery_radius,
      mobile_money_number,
      mobile_money_provider,
      account_holder_name,
      bank_rib,
    } = req.body;
    
    // Vérifier si email existe déjà
    const existingEmailResult = await query(
      'SELECT id FROM restaurants WHERE email = $1',
      [email]
    );
    
    if (existingEmailResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Un restaurant avec cet email existe déjà',
        },
      });
    }
    
    // Vérifier si téléphone existe déjà
    const existingPhoneResult = await query(
      'SELECT id FROM restaurants WHERE phone = $1',
      [phone]
    );
    
    if (existingPhoneResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PHONE_EXISTS',
          message: 'Un restaurant avec ce numéro de téléphone existe déjà',
        },
      });
    }
    
    // Hasher le mot de passe
    const bcrypt = require('bcrypt');
    const BCRYPT_ROUNDS = 10; // Valeur standard
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    
    // Générer un slug
    const slug = name.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim() + '-' + Date.now();
    
    // Traiter les fichiers uploadés
    // uploadService est déjà importé en haut du fichier
    let logoUrl = null;
    let bannerUrl = null;
    let idCardFrontUrl = null;
    let idCardBackUrl = null;
    const documents = {};
    const photos = [];
    
    if (req.files) {
      // Déterminer le provider d'upload
      const uploadProvider = config.upload?.provider || 'local';
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      // Fonction helper pour upload
      const uploadFile = async (file, folder) => {
        try {
          if (uploadProvider === 's3' && uploadService.uploadToS3) {
            return await uploadService.uploadToS3(file, folder);
          } else if (uploadProvider === 'cloudinary' && uploadService.uploadToCloudinary) {
            return await uploadService.uploadToCloudinary(file, folder);
          } else {
            return await uploadService.uploadToLocal(file, folder, { baseUrl });
          }
        } catch (uploadError) {
          logger.warn(`Erreur upload ${uploadProvider}, fallback local:`, uploadError.message);
          return await uploadService.uploadToLocal(file, folder, { baseUrl });
        }
      };
      
      // Logo
      if (req.files.logo && req.files.logo[0]) {
        const logoResult = await uploadFile(req.files.logo[0], 'restaurant-logos');
        logoUrl = logoResult.url;
      }
      
      // Bannière
      if (req.files.banner && req.files.banner[0]) {
        const bannerResult = await uploadFile(req.files.banner[0], 'restaurant-banners');
        bannerUrl = bannerResult.url;
      }
      
      // Carte d'identité recto/verso
      if (req.files.id_card_front && req.files.id_card_front[0]) {
        const idFrontResult = await uploadFile(req.files.id_card_front[0], 'restaurant-documents');
        idCardFrontUrl = idFrontResult.url;
      }
      
      if (req.files.id_card_back && req.files.id_card_back[0]) {
        const idBackResult = await uploadFile(req.files.id_card_back[0], 'restaurant-documents');
        idCardBackUrl = idBackResult.url;
      }
      
      // Documents
      const documentFields = ['document_rccm', 'document_id', 'document_facade', 'document_menu', 'document_hygiene'];
      for (const field of documentFields) {
        if (req.files[field] && req.files[field][0]) {
          const docResult = await uploadFile(req.files[field][0], 'restaurant-documents');
          documents[field.replace('document_', '')] = docResult.url;
        }
      }
      
      // Photos du restaurant
      if (req.files.photos) {
        for (const photo of req.files.photos) {
          const photoResult = await uploadFile(photo, 'restaurant-photos');
          photos.push(photoResult.url);
        }
      }
      
      // Photos de plats
      if (req.files.dish_photos) {
        for (const photo of req.files.dish_photos) {
          const photoResult = await uploadFile(photo, 'restaurant-dish-photos');
          photos.push(photoResult.url);
        }
      }
    }
    
    // Parser opening_hours si c'est une chaîne JSON
    let parsedOpeningHours = opening_hours;
    if (typeof opening_hours === 'string') {
      try {
        parsedOpeningHours = JSON.parse(opening_hours);
      } catch (e) {
        parsedOpeningHours = {};
      }
    }
    
    const result = await query(
      `INSERT INTO restaurants (
        name, slug, category, cuisine_type, description,
        phone, email, password_hash, address, district, landmark,
        latitude, longitude, opening_hours, delivery_radius,
        mobile_money_number, mobile_money_provider, account_holder_name, bank_rib,
        documents, logo, banner, photos, id_card_front, id_card_back, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
      RETURNING id, name, email, phone, status`,
      [
        name, slug, category, cuisine_type || null, description,
        phone, email, password_hash, address, district, landmark || null,
        parseFloat(latitude) || null, parseFloat(longitude) || null, 
        JSON.stringify(parsedOpeningHours || {}), parseInt(delivery_radius) || 5,
        mobile_money_number, mobile_money_provider, account_holder_name || null, bank_rib || null,
        JSON.stringify(documents), logoUrl, bannerUrl, 
        photos.length > 0 ? photos : null, // PostgreSQL array format
        idCardFrontUrl, idCardBackUrl,
        'pending'
      ]
    );
    
    logger.info(`Nouveau restaurant inscrit: ${result.rows[0].id} - ${result.rows[0].name}`);
    
    // Notifier l'admin via Socket.IO si disponible
    try {
      const io = req.app.get('io');
      if (io) {
        io.to('admin_dashboard').emit('new_restaurant_registration', {
          restaurant_id: result.rows[0].id,
          name: result.rows[0].name,
          email: result.rows[0].email,
          phone: result.rows[0].phone,
        });
      }
    } catch (socketError) {
      logger.warn('Impossible de notifier l\'admin:', socketError.message);
    }
    
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
        message: 'Erreur lors de l\'inscription: ' + error.message,
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
    const restaurantId = req.user.id;
    const { name, description, display_order } = req.body;
    
    const result = await query(
      `INSERT INTO menu_categories (restaurant_id, name, description, display_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [restaurantId, name, description || null, display_order || 0]
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
 * Créer un item de menu (avec support upload photo)
 */
exports.createMenuItem = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    const {
      category_id, name, description, price,
      options, preparation_time, tags, stock_quantity, is_available
    } = req.body;
    
    // Vérifier que la catégorie appartient au restaurant
    if (category_id) {
      const categoryCheck = await query(
        'SELECT id FROM menu_categories WHERE id = $1 AND restaurant_id = $2',
        [category_id, restaurantId]
      );
      if (categoryCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'CATEGORY_NOT_FOUND', message: 'Catégorie non trouvée' },
        });
      }
    }
    
    // Gérer l'upload de la photo si présente
    let photoUrl = req.body.photo || null;
    if (req.file) {
      logger.debug('📸 Upload photo article détecté:', {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });
      
      const uploadProvider = config.upload?.provider || 'local';
      const requestBaseUrl = `${req.protocol}://${req.get('host')}`;
      
      try {
        let uploadResult;
        if (uploadProvider === 's3') {
          uploadResult = await uploadService.uploadToS3(req.file, 'menu-items');
        } else if (uploadProvider === 'cloudinary') {
          uploadResult = await uploadService.uploadToCloudinary(req.file, 'menu-items');
        } else {
          uploadResult = await uploadService.uploadToLocal(req.file, 'menu-items', { baseUrl: requestBaseUrl });
        }
        photoUrl = uploadResult.url;
        logger.info('✅ Photo article uploadée:', photoUrl);
      } catch (uploadError) {
        logger.error('❌ Erreur upload photo article:', uploadError);
        // Continuer sans photo si l'upload échoue
      }
    }
    
    // Parser les tags si c'est une chaîne JSON
    let parsedTags = tags || [];
    if (typeof tags === 'string') {
      try {
        parsedTags = JSON.parse(tags);
      } catch (e) {
        parsedTags = [];
      }
    }
    
    const result = await query(
      `INSERT INTO menu_items (
        restaurant_id, category_id, name, description, photo,
        price, options, preparation_time, tags, stock_quantity, is_available
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        restaurantId, 
        category_id || null, 
        name, 
        description || null, 
        photoUrl,
        parseFloat(price), 
        JSON.stringify(options || {}), 
        parseInt(preparation_time) || 20,
        parsedTags, 
        stock_quantity ? parseInt(stock_quantity) : null,
        is_available !== 'false' && is_available !== false
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'Article créé avec succès',
      data: { item: result.rows[0], menu_item: result.rows[0] },
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
 * Mettre à jour un item de menu (avec support upload photo)
 */
exports.updateMenuItem = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    const { itemId } = req.params;
    
    const allowedFields = [
      'name', 'description', 'photo', 'price', 'options', 'customization_options',
      'preparation_time', 'is_available', 'stock_quantity', 'tags', 'category_id',
      // Champs de promotion sur plat individuel
      'is_promotional', 'discount_type', 'discount_value', 'promotion_start', 'promotion_end', 'promotion_description'
    ];
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    // Gérer l'upload de la photo si présente
    if (req.file) {
      logger.debug('📸 Upload nouvelle photo article:', {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });
      
      const uploadProvider = config.upload?.provider || 'local';
      const requestBaseUrl = `${req.protocol}://${req.get('host')}`;
      
      try {
        let uploadResult;
        if (uploadProvider === 's3') {
          uploadResult = await uploadService.uploadToS3(req.file, 'menu-items');
        } else if (uploadProvider === 'cloudinary') {
          uploadResult = await uploadService.uploadToCloudinary(req.file, 'menu-items');
        } else {
          uploadResult = await uploadService.uploadToLocal(req.file, 'menu-items', { baseUrl: requestBaseUrl });
        }
        updates.push(`photo = $${paramIndex++}`);
        values.push(uploadResult.url);
        logger.info('✅ Photo article mise à jour:', uploadResult.url);
      } catch (uploadError) {
        logger.error('❌ Erreur upload photo article:', uploadError);
      }
    }
    
    // Options / customization_options : la table menu_items n'a que la colonne "options"
    const optionsValue = req.body.options ?? req.body.customization_options;
    if (optionsValue !== undefined && optionsValue !== '' && optionsValue !== null && optionsValue !== 'null' && optionsValue !== 'undefined') {
      const hasOptions = updates.some(u => u.startsWith('options ='));
      if (!hasOptions) {
        updates.push(`options = $${paramIndex++}`);
        values.push(typeof optionsValue === 'string' ? optionsValue : JSON.stringify(optionsValue));
      }
    }

    // Gérer les autres champs (sauf options/customization_options déjà traité)
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key) && key !== 'photo' && key !== 'options' && key !== 'customization_options') {
        const value = req.body[key];
        // Ignorer les valeurs vides/null pour ne pas écraser
        if (value === '' || value === null || value === undefined || value === 'null' || value === 'undefined') {
          return;
        }
        if (key === 'tags' && typeof value === 'string') {
          updates.push(`${key} = $${paramIndex++}`);
          try {
            values.push(JSON.parse(value));
          } catch (e) {
            values.push([]);
          }
        } else if (key === 'price') {
          updates.push(`${key} = $${paramIndex++}`);
          values.push(parseFloat(value));
        } else if (key === 'preparation_time' || key === 'stock_quantity') {
          updates.push(`${key} = $${paramIndex++}`);
          values.push(value ? parseInt(value) : null);
        } else if (key === 'is_available' || key === 'is_promotional') {
          updates.push(`${key} = $${paramIndex++}`);
          values.push(value === true || value === 'true');
        } else if (key === 'discount_value') {
          updates.push(`${key} = $${paramIndex++}`);
          values.push(value ? parseFloat(value) : null);
        } else if (key === 'promotion_start' || key === 'promotion_end') {
          updates.push(`${key} = $${paramIndex++}`);
          values.push(value ? new Date(value) : null);
        } else {
          updates.push(`${key} = $${paramIndex++}`);
          values.push(value);
        }
      }
    });
    
    // Calculer le prix promotionnel si les champs de promotion sont définis
    // Note: Le trigger PostgreSQL fera ce calcul automatiquement, mais on le fait aussi ici pour la réponse immédiate
    const isPromotional = req.body.is_promotional === true || req.body.is_promotional === 'true';
    const discountType = req.body.discount_type;
    const discountValue = req.body.discount_value ? parseFloat(req.body.discount_value) : null;
    const price = req.body.price ? parseFloat(req.body.price) : null;
    
    if (isPromotional && discountValue && discountType) {
      // Si le prix n'est pas dans la requête, on doit le récupérer de la DB
      // Le trigger PostgreSQL calculera le prix promotionnel automatiquement
      logger.info(`Promotion activée: type=${discountType}, value=${discountValue}`);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_UPDATES', message: 'Aucune mise à jour fournie' },
      });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(itemId, restaurantId);
    
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
      data: { item: result.rows[0], menu_item: result.rows[0] },
    });
  } catch (error) {
    logger.error('Erreur updateMenuItem:', { message: error.message, code: error.code, stack: error.stack });
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' },
    });
  }
};

/**
 * Supprimer un item de menu
 * Si l'article est référencé dans des commandes, il sera désactivé au lieu d'être supprimé
 */
exports.deleteMenuItem = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    const { itemId } = req.params;
    
    // D'abord, essayer de supprimer l'article
    try {
      const result = await query(
        'DELETE FROM menu_items WHERE id = $1 AND restaurant_id = $2 RETURNING id',
        [itemId, restaurantId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'ITEM_NOT_FOUND', message: 'Article non trouvé' },
        });
      }
      
      return res.json({
        success: true,
        message: 'Article supprimé avec succès',
      });
    } catch (deleteError) {
      // Si erreur de contrainte de clé étrangère (article référencé dans des commandes)
      if (deleteError.code === '23503') {
        logger.info('Article référencé dans des commandes, désactivation au lieu de suppression:', itemId);
        
        // Désactiver l'article au lieu de le supprimer (soft delete)
        const softDeleteResult = await query(
          `UPDATE menu_items 
           SET is_available = false, 
               name = name || ' [SUPPRIMÉ]',
               updated_at = NOW()
           WHERE id = $1 AND restaurant_id = $2 
           RETURNING id`,
          [itemId, restaurantId]
        );
        
        if (softDeleteResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: { code: 'ITEM_NOT_FOUND', message: 'Article non trouvé' },
          });
        }
        
        return res.json({
          success: true,
          message: 'Article désactivé avec succès (historique des commandes préservé)',
          softDeleted: true,
        });
      }
      
      // Relancer l'erreur si ce n'est pas une erreur de contrainte
      throw deleteError;
    }
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
    const restaurantId = req.user.id;
    
    const result = await query(
      `SELECT id, name, slug, category, cuisine_type, description, 
              phone, email, address, district, latitude, longitude,
              opening_hours, delivery_radius, is_open, commission_rate,
              mobile_money_number, mobile_money_provider, account_holder_name, bank_rib,
              logo, banner, photos,
              status, average_rating, total_reviews, total_orders, total_revenue,
              balance, created_at, updated_at
       FROM restaurants WHERE id = $1`,
      [restaurantId]
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
    const restaurantId = req.user.id;
    const { uploadService } = require('../services/upload.service');
    const config = require('../config');
    const requestBaseUrl = `${req.protocol}://${req.get('host')}`;
    
    // Log pour déboguer
    logger.debug('updateMyProfile - Fichiers reçus:', {
      hasFiles: !!req.files,
      filesKeys: req.files ? Object.keys(req.files) : [],
      bodyKeys: Object.keys(req.body),
      logoInFiles: !!(req.files && req.files.logo),
      bannerInFiles: !!(req.files && req.files.banner),
      photosInFiles: !!(req.files && req.files.photos),
      logoFileCount: req.files?.logo ? req.files.logo.length : 0,
      bannerFileCount: req.files?.banner ? req.files.banner.length : 0,
      photosFileCount: req.files?.photos ? req.files.photos.length : 0,
      contentType: req.headers['content-type'],
      bodyLogo: req.body.logo ? (typeof req.body.logo === 'string' ? 'string URL' : 'object') : 'none',
      bodyBanner: req.body.banner ? (typeof req.body.banner === 'string' ? 'string URL' : 'object') : 'none',
      bodyPhotos: req.body.photos ? (Array.isArray(req.body.photos) ? `array[${req.body.photos.length}]` : typeof req.body.photos) : 'none',
      existingPhotos: req.body.existingPhotos ? (typeof req.body.existingPhotos === 'string' ? 'JSON string' : 'array') : 'none',
    });
    
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
    
    const allowedFields = [
      'name', 'description', 'phone', 'email', 'address', 'district',
      'latitude', 'longitude', 'delivery_radius', 'cuisine_type',
      'mobile_money_number', 'mobile_money_provider', 'opening_hours',
      'account_holder_name', 'bank_rib',
      'logo', 'banner', 'photos'
    ];
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    // Gérer l'upload du logo
    if (req.files && req.files.logo && req.files.logo.length > 0) {
      logger.debug('📷 Upload logo détecté:', {
        filename: req.files.logo[0].originalname,
        mimetype: req.files.logo[0].mimetype,
        size: req.files.logo[0].size,
        hasBuffer: !!req.files.logo[0].buffer,
        bufferLength: req.files.logo[0].buffer?.length,
      });
      const uploadProvider = config.upload?.provider || 'local';
      let uploadResult;
      
      if (uploadProvider === 's3') {
        try {
          uploadResult = await uploadService.uploadToS3(req.files.logo[0], 'restaurant-logos');
        } catch (error) {
          logger.error('Erreur upload S3 (logo), tentative Cloudinary:', error);
          if (config.upload?.cloudinary?.cloudName) {
            uploadResult = await uploadService.uploadToCloudinary(req.files.logo[0], 'restaurant-logos');
          } else {
            throw error;
          }
        }
      } else if (uploadProvider === 'cloudinary') {
        uploadResult = await uploadService.uploadToCloudinary(req.files.logo[0], 'restaurant-logos');
      } else {
        uploadResult = await uploadService.uploadToLocal(
          req.files.logo[0],
          'restaurant-logos',
          { baseUrl: requestBaseUrl }
        );
      }
      
      const logoUrl = normalizeLocalUrl(uploadResult.url);
      updates.push(`logo = $${paramIndex++}`);
      values.push(logoUrl);
    } else if (req.body.logo !== undefined && req.body.logo !== null && req.body.logo !== '') {
      // Si c'est une URL string (image existante), la garder
      updates.push(`logo = $${paramIndex++}`);
      values.push(req.body.logo);
    }
    
    // Gérer l'upload de la bannière
    if (req.files && req.files.banner && req.files.banner.length > 0) {
      const uploadProvider = config.upload?.provider || 'local';
      let uploadResult;
      
      if (uploadProvider === 's3') {
        try {
          uploadResult = await uploadService.uploadToS3(req.files.banner[0], 'restaurant-banners');
        } catch (error) {
          logger.error('Erreur upload S3 (banner), tentative Cloudinary:', error);
          if (config.upload?.cloudinary?.cloudName) {
            uploadResult = await uploadService.uploadToCloudinary(req.files.banner[0], 'restaurant-banners');
          } else {
            throw error;
          }
        }
      } else if (uploadProvider === 'cloudinary') {
        uploadResult = await uploadService.uploadToCloudinary(req.files.banner[0], 'restaurant-banners');
      } else {
        uploadResult = await uploadService.uploadToLocal(
          req.files.banner[0],
          'restaurant-banners',
          { baseUrl: requestBaseUrl }
        );
      }
      
      const bannerUrl = normalizeLocalUrl(uploadResult.url);
      updates.push(`banner = $${paramIndex++}`);
      values.push(bannerUrl);
    } else if (req.body.banner !== undefined && req.body.banner !== null && req.body.banner !== '') {
      updates.push(`banner = $${paramIndex++}`);
      values.push(req.body.banner);
    }
    
    // Gérer l'upload des photos
    if (req.files && req.files.photos && Array.isArray(req.files.photos)) {
      logger.debug('📸 Upload photos détecté:', {
        count: req.files.photos.length,
        photos: req.files.photos.map((p, i) => ({
          index: i,
          filename: p.originalname,
          mimetype: p.mimetype,
          size: p.size,
          hasBuffer: !!p.buffer,
          bufferLength: p.buffer?.length,
        })),
      });
      const uploadProvider = config.upload?.provider || 'local';
      const photoUrls = [];
      
      for (const photoFile of req.files.photos) {
        let uploadResult;
        
        if (uploadProvider === 's3') {
          try {
            uploadResult = await uploadService.uploadToS3(photoFile, 'restaurant-photos');
          } catch (error) {
            logger.error('Erreur upload S3 (photo), tentative Cloudinary:', error);
            if (config.upload?.cloudinary?.cloudName) {
              uploadResult = await uploadService.uploadToCloudinary(photoFile, 'restaurant-photos');
            } else {
              throw error;
            }
          }
        } else if (uploadProvider === 'cloudinary') {
          uploadResult = await uploadService.uploadToCloudinary(photoFile, 'restaurant-photos');
        } else {
          uploadResult = await uploadService.uploadToLocal(
            photoFile,
            'restaurant-photos',
            { baseUrl: requestBaseUrl }
          );
        }
        
        photoUrls.push(normalizeLocalUrl(uploadResult.url));
      }
      
      // Récupérer les photos existantes
      const existingRestaurant = await query('SELECT photos FROM restaurants WHERE id = $1', [restaurantId]);
      const existingPhotos = existingRestaurant.rows[0]?.photos || [];
      // Si photos est un JSON string, le parser
      let parsedExistingPhotos = [];
      if (typeof existingPhotos === 'string') {
        try {
          parsedExistingPhotos = JSON.parse(existingPhotos);
        } catch (e) {
          parsedExistingPhotos = [];
        }
      } else if (Array.isArray(existingPhotos)) {
        parsedExistingPhotos = existingPhotos;
      }
      
      // Ajouter les photos existantes depuis req.body.existingPhotos si fourni
      if (req.body.existingPhotos) {
        let existingFromBody = [];
        if (typeof req.body.existingPhotos === 'string') {
          try {
            existingFromBody = JSON.parse(req.body.existingPhotos);
          } catch (e) {
            existingFromBody = [];
          }
        } else if (Array.isArray(req.body.existingPhotos)) {
          existingFromBody = req.body.existingPhotos;
        }
        // Fusionner avec les nouvelles photos uploadées
        const allPhotos = [...existingFromBody, ...photoUrls];
        updates.push(`photos = $${paramIndex++}`);
        values.push(JSON.stringify(allPhotos));
      } else {
        // Sinon, ajouter aux existantes
        const allPhotos = [...parsedExistingPhotos, ...photoUrls];
        updates.push(`photos = $${paramIndex++}`);
        values.push(JSON.stringify(allPhotos));
      }
    } else if (req.body.photos !== undefined) {
      // Si c'est un tableau d'URLs (photos existantes), les garder
      let photosArray = [];
      if (Array.isArray(req.body.photos)) {
        // Extraire les URIs si ce sont des objets avec uri
        photosArray = req.body.photos.map(photo => 
          typeof photo === 'string' ? photo : (photo.uri || photo)
        );
      } else if (typeof req.body.photos === 'string') {
        // Si c'est une string JSON, essayer de la parser
        try {
          photosArray = JSON.parse(req.body.photos);
        } catch (e) {
          photosArray = [req.body.photos];
        }
      }
      updates.push(`photos = $${paramIndex++}`);
      values.push(JSON.stringify(photosArray));
    }
    
    // Gérer les autres champs
    // IMPORTANT: Ignorer les valeurs null/vides/undefined pour ne pas écraser les valeurs existantes
    // et éviter les violations de contraintes NOT NULL
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key) && !['logo', 'banner', 'photos'].includes(key)) {
        const value = req.body[key];
        // IGNORER les valeurs vides/null/undefined - ne pas les inclure dans la mise à jour
        // Cela préserve les valeurs existantes en base de données
        if (value === '' || value === null || value === undefined || value === 'null' || value === 'undefined') {
          // Ne rien faire - ignorer ce champ pour préserver la valeur existante
          return;
        } else if (key === 'opening_hours') {
          updates.push(`${key} = $${paramIndex++}`);
          values.push(JSON.stringify(value));
        } else {
          updates.push(`${key} = $${paramIndex++}`);
          values.push(value);
        }
      }
    });
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_UPDATES', message: 'Aucune mise à jour fournie' },
      });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(restaurantId);
    
    const result = await query(
      `UPDATE restaurants 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, email, phone, address, district, latitude, longitude, 
                  delivery_radius, cuisine_type, description, is_open, status,
                  mobile_money_number, mobile_money_provider, opening_hours,
                  logo, banner, photos, average_rating, total_reviews`,
      values
    );
    
    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: { restaurant: result.rows[0] },
    });
  } catch (error) {
    logger.error('Erreur updateMyProfile:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      hasFiles: !!req.files,
      filesKeys: req.files ? Object.keys(req.files) : [],
      bodyKeys: Object.keys(req.body || {}),
    });
    res.status(500).json({
      success: false,
      error: { 
        code: 'UPDATE_ERROR', 
        message: error.message || 'Erreur lors de la mise à jour',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
    });
  }
};

/**
 * Basculer le statut ouvert/fermé
 */
exports.toggleOpenStatus = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    const { is_open } = req.body;
    
    if (typeof is_open !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_VALUE', message: 'is_open doit être un booléen' },
      });
    }
    
    const result = await query(
      `UPDATE restaurants 
       SET is_open = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, is_open`,
      [is_open, restaurantId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant non trouvé' },
      });
    }
    
    res.json({
      success: true,
      message: `Restaurant ${is_open ? 'ouvert' : 'fermé'}`,
      data: { restaurant: result.rows[0] },
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
    const restaurantId = req.user.id;
    
    const result = await query(
      `SELECT * FROM menu_categories 
       WHERE restaurant_id = $1
       ORDER BY display_order ASC, name ASC`,
      [restaurantId]
    );
    
    res.json({
      success: true,
      data: {
        categories: result.rows,
      },
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
    const restaurantId = req.user.id;
    const { categoryId } = req.params;
    const { name, description, display_order } = req.body;
    
    // Vérifier que la catégorie appartient au restaurant
    const categoryCheck = await query(
      'SELECT id FROM menu_categories WHERE id = $1 AND restaurant_id = $2',
      [categoryId, restaurantId]
    );
    
    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'CATEGORY_NOT_FOUND', message: 'Catégorie non trouvée' },
      });
    }
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (display_order !== undefined) {
      updates.push(`display_order = $${paramIndex++}`);
      values.push(display_order);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_UPDATES', message: 'Aucune mise à jour fournie' },
      });
    }
    
    values.push(categoryId, restaurantId);
    
    const result = await query(
      `UPDATE menu_categories 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND restaurant_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );
    
    res.json({
      success: true,
      message: 'Catégorie mise à jour avec succès',
      data: { category: result.rows[0] },
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
    const restaurantId = req.user.id;
    const { categoryId } = req.params;
    
    // Vérifier que la catégorie appartient au restaurant
    const categoryCheck = await query(
      'SELECT id FROM menu_categories WHERE id = $1 AND restaurant_id = $2',
      [categoryId, restaurantId]
    );
    
    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'CATEGORY_NOT_FOUND', message: 'Catégorie non trouvée' },
      });
    }
    
    // Vérifier qu'il n'y a pas d'items dans la catégorie
    const itemsCheck = await query(
      'SELECT COUNT(*) as count FROM menu_items WHERE category_id = $1',
      [categoryId]
    );
    
    if (parseInt(itemsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'CATEGORY_NOT_EMPTY', 
          message: 'Impossible de supprimer une catégorie contenant des articles' 
        },
      });
    }
    
    await query(
      'DELETE FROM menu_categories WHERE id = $1 AND restaurant_id = $2',
      [categoryId, restaurantId]
    );
    
    res.json({
      success: true,
      message: 'Catégorie supprimée avec succès',
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
    const restaurantId = req.user.id;
    
    // Récupérer tous les items du menu (tous, pas seulement disponibles)
    const itemsResult = await query(
      `SELECT * FROM menu_items 
       WHERE restaurant_id = $1
       ORDER BY category_id, name ASC`,
      [restaurantId]
    );
    
    res.json({
      success: true,
      data: {
        menu: itemsResult.rows,
      },
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
    const restaurantId = req.user.id;
    const { itemId } = req.params;
    
    // Vérifier que l'article appartient au restaurant
    const itemResult = await query(
      'SELECT * FROM menu_items WHERE id = $1 AND restaurant_id = $2',
      [itemId, restaurantId]
    );
    
    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ITEM_NOT_FOUND', message: 'Article non trouvé' },
      });
    }
    
    const item = itemResult.rows[0];
    const newAvailability = !item.is_available;
    
    await query(
      'UPDATE menu_items SET is_available = $1, updated_at = NOW() WHERE id = $2',
      [newAvailability, itemId]
    );
    
    res.json({
      success: true,
      message: `Article ${newAvailability ? 'activé' : 'désactivé'}`,
      data: {
        item: {
          id: item.id,
          name: item.name,
          is_available: newAvailability,
        },
      },
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
 * Activer/désactiver une promotion sur un plat
 * 
 * Types de réduction:
 * - percentage: Prix promo = Prix × (1 - pourcentage/100)
 *   Exemple: 3000 FCFA avec -20% = 3000 × 0.80 = 2400 FCFA
 * 
 * - fixed_amount: Prix promo = Prix - montant fixe
 *   Exemple: 1500 FCFA avec -300 FCFA = 1200 FCFA
 */
exports.setItemPromotion = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    const { itemId } = req.params;
    const { 
      is_promotional,
      discount_type, // 'percentage' ou 'fixed_amount'
      discount_value,
      promotion_start,
      promotion_end,
      promotion_description 
    } = req.body;
    
    // Vérifier que l'article appartient au restaurant
    const itemResult = await query(
      'SELECT * FROM menu_items WHERE id = $1 AND restaurant_id = $2',
      [itemId, restaurantId]
    );
    
    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ITEM_NOT_FOUND', message: 'Article non trouvé' },
      });
    }
    
    const item = itemResult.rows[0];
    const enablePromotion = is_promotional === true || is_promotional === 'true';
    
    if (enablePromotion) {
      // Validation des champs requis pour activer une promotion
      if (!discount_type || !['percentage', 'fixed_amount'].includes(discount_type)) {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'INVALID_DISCOUNT_TYPE', 
            message: 'Type de réduction invalide. Utilisez "percentage" ou "fixed_amount"' 
          },
        });
      }
      
      if (!discount_value || parseFloat(discount_value) <= 0) {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'INVALID_DISCOUNT_VALUE', 
            message: 'La valeur de réduction doit être supérieure à 0' 
          },
        });
      }
      
      // Vérifier que la réduction n'est pas supérieure au prix
      const discountVal = parseFloat(discount_value);
      if (discount_type === 'percentage' && discountVal >= 100) {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'INVALID_PERCENTAGE', 
            message: 'Le pourcentage de réduction doit être inférieur à 100%' 
          },
        });
      }
      
      if (discount_type === 'fixed_amount' && discountVal >= parseFloat(item.price)) {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'INVALID_FIXED_AMOUNT', 
            message: 'Le montant de réduction doit être inférieur au prix du plat' 
          },
        });
      }
      
      // Calculer le prix promotionnel
      let promotionalPrice;
      if (discount_type === 'percentage') {
        promotionalPrice = parseFloat(item.price) * (1 - discountVal / 100);
      } else {
        promotionalPrice = parseFloat(item.price) - discountVal;
      }
      promotionalPrice = Math.round(promotionalPrice * 100) / 100; // Arrondir à 2 décimales
      
      // Mettre à jour l'article avec la promotion
      const result = await query(
        `UPDATE menu_items SET 
          is_promotional = true,
          discount_type = $1,
          discount_value = $2,
          promotional_price = $3,
          promotion_start = $4,
          promotion_end = $5,
          promotion_description = $6,
          updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [
          discount_type,
          discountVal,
          promotionalPrice,
          promotion_start ? new Date(promotion_start) : null,
          promotion_end ? new Date(promotion_end) : null,
          promotion_description || null,
          itemId
        ]
      );
      
      logger.info(`Promotion activée sur ${item.name}: ${discount_type} ${discountVal} => ${promotionalPrice} FCFA`);
      
      res.json({
        success: true,
        message: 'Promotion activée',
        data: {
          item: {
            ...result.rows[0],
            original_price: item.price,
            savings: parseFloat(item.price) - promotionalPrice,
            savings_percent: discount_type === 'percentage' ? discountVal : 
              Math.round((1 - promotionalPrice / parseFloat(item.price)) * 100),
          },
        },
      });
      
    } else {
      // Désactiver la promotion
      const result = await query(
        `UPDATE menu_items SET 
          is_promotional = false,
          discount_type = NULL,
          discount_value = NULL,
          promotional_price = NULL,
          promotion_start = NULL,
          promotion_end = NULL,
          promotion_description = NULL,
          updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [itemId]
      );
      
      logger.info(`Promotion désactivée sur ${item.name}`);
      
      res.json({
        success: true,
        message: 'Promotion désactivée',
        data: {
          item: result.rows[0],
        },
      });
    }
    
  } catch (error) {
    logger.error('Erreur setItemPromotion:', error);
    res.status(500).json({
      success: false,
      error: { code: 'PROMOTION_ERROR', message: 'Erreur lors de la mise à jour de la promotion' },
    });
  }
};

/**
 * Obtenir tous les plats en promotion du restaurant
 */
exports.getPromotionalItems = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    
    const result = await query(
      `SELECT m.*, c.name as category_name
       FROM menu_items m
       LEFT JOIN menu_categories c ON m.category_id = c.id
       WHERE m.restaurant_id = $1 
         AND m.is_promotional = true
         AND (m.promotion_end IS NULL OR m.promotion_end > NOW())
       ORDER BY m.updated_at DESC`,
      [restaurantId]
    );
    
    // Calculer les économies pour chaque plat
    const items = result.rows.map(item => ({
      ...item,
      original_price: item.price,
      current_price: item.promotional_price || item.price,
      savings: item.promotional_price ? parseFloat(item.price) - parseFloat(item.promotional_price) : 0,
      savings_percent: item.promotional_price ? 
        Math.round((1 - parseFloat(item.promotional_price) / parseFloat(item.price)) * 100) : 0,
    }));
    
    res.json({
      success: true,
      data: {
        items,
        total: items.length,
      },
    });
    
  } catch (error) {
    logger.error('Erreur getPromotionalItems:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Obtenir les commandes du restaurant
 */
exports.getMyOrders = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // Validation des statuts
    const validStatuses = ['new', 'pending', 'accepted', 'preparing', 'ready', 'picked_up', 'delivering', 'delivered', 'cancelled'];
    if (status) {
      const statusesToCheck = status.includes(',') 
        ? status.split(',').map(s => s.trim()).filter(s => s)
        : [status.trim()];
      
      const invalidStatuses = statusesToCheck.filter(s => !validStatuses.includes(s));
      if (invalidStatuses.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Statuts invalides: ${invalidStatuses.join(', ')}`,
            details: [{
              field: 'status',
              message: `Statuts valides: ${validStatuses.join(', ')}`,
              value: status,
            }],
          },
        });
      }
    }
    
    let queryText = `
      SELECT o.*, 
             u.first_name || ' ' || u.last_name as customer_name,
             u.phone as customer_phone,
             (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count,
             (SELECT COALESCE(oi.menu_item_snapshot->>'photo', oi.menu_item_snapshot->>'image_url', mi.photo)
              FROM order_items oi 
              LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
              WHERE oi.order_id = o.id 
              LIMIT 1) as first_item_image,
             -- Recalculer le sous-total à partir des items (source de vérité)
             (SELECT COALESCE(SUM((oi.unit_price * oi.quantity)), 0)
              FROM order_items oi
              WHERE oi.order_id = o.id) as recalculated_subtotal
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.restaurant_id = $1
    `;
    const values = [restaurantId];
    let paramIndex = 2;
    
    // Gérer les statuts multiples pour "En cours"
    if (status) {
      // Si le statut est une chaîne contenant plusieurs valeurs séparées par des virgules
      if (status.includes(',')) {
        const statuses = status.split(',').map(s => s.trim()).filter(s => s);
        if (statuses.length > 0) {
          const placeholders = statuses.map((_, i) => `$${paramIndex + i}`).join(',');
          queryText += ` AND o.status IN (${placeholders})`;
          values.push(...statuses);
          paramIndex += statuses.length;
        }
      } else {
        queryText += ` AND o.status = $${paramIndex}`;
        values.push(status);
        paramIndex++;
      }
    }
    
    queryText += ` ORDER BY o.placed_at DESC, o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(parseInt(limit), offset);
    
    const result = await query(queryText, values);
    
    // Compter le total
    let countQuery = 'SELECT COUNT(*) FROM orders WHERE restaurant_id = $1';
    const countValues = [restaurantId];
    let countParamIndex = 2;
    if (status) {
      if (status.includes(',')) {
        const statuses = status.split(',').map(s => s.trim()).filter(s => s);
        if (statuses.length > 0) {
          const placeholders = statuses.map((_, i) => `$${countParamIndex + i}`).join(',');
          countQuery += ` AND status IN (${placeholders})`;
          countValues.push(...statuses);
        }
      } else {
        countQuery += ` AND status = $${countParamIndex}`;
        countValues.push(status);
      }
    }
    const countResult = await query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);
    
    // Calculer le revenu net pour chaque commande
    const { getCommission } = require('../utils/commission');
    
    // Formater les commandes pour l'application
    const orders = result.rows.map(order => {
      // Utiliser le sous-total recalculé si disponible (plus fiable que celui stocké)
      // Sinon utiliser celui de la base de données
      const recalculatedSubtotal = order.recalculated_subtotal !== null && order.recalculated_subtotal !== undefined
        ? parseFloat(order.recalculated_subtotal)
        : null;
      // Utiliser le recalculé s'il est disponible (même s'il est 0, c'est la source de vérité)
      const subtotal = recalculatedSubtotal !== null && !isNaN(recalculatedSubtotal)
        ? recalculatedSubtotal
        : (parseFloat(order.subtotal) || 0);
      
      // Déterminer le taux de commission à utiliser
      let commissionRate = 15; // Défaut
      if (order.commission_rate !== null && order.commission_rate !== undefined) {
        commissionRate = parseFloat(order.commission_rate);
      }
      
      // Calculer la commission à partir du sous-total recalculé (source de vérité)
      // Si la commission stockée existe et correspond au sous-total stocké, on peut l'utiliser
      // Sinon, recalculer à partir du sous-total recalculé
      let commission = 0;
      if (order.commission !== null && order.commission !== undefined && recalculatedSubtotal === null) {
        // Utiliser la commission stockée seulement si on n'a pas de sous-total recalculé
        commission = parseFloat(order.commission);
      } else {
        // Toujours recalculer à partir du sous-total recalculé pour garantir l'exactitude
        const commissionResult = getCommission(subtotal, commissionRate);
        commission = commissionResult.commission;
      }
      
      // Revenu net = subtotal - commission (utilise le sous-total recalculé)
      const netRevenue = Math.max(0, subtotal - commission);
      
      return {
        ...order,
        orderNumber: order.order_number,
        customerName: order.customer_name || 'Client',
        itemsCount: parseInt(order.items_count) || 0,
        createdAt: order.placed_at || order.created_at,
        firstItemImage: order.first_item_image || null,
        netRevenue: netRevenue, // Ajouter le revenu net calculé
        net_revenue: netRevenue, // Alias pour compatibilité
      };
    });
    
    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
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
    const restaurantId = req.user.id;
    const { orderId } = req.params;
    
    const result = await query(
      `SELECT o.*, 
              o.commission_rate as order_commission_rate,
              r.commission_rate as restaurant_commission_rate,
              COALESCE(o.commission_rate, r.commission_rate, 15) as commission_rate,
              u.first_name || ' ' || u.last_name as customer_name,
              u.phone as customer_phone
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = $1 AND o.restaurant_id = $2`,
      [orderId, restaurantId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
      });
    }
    
    // Récupérer les items de la commande
    const itemsResult = await query(
      `SELECT oi.*, 
              COALESCE(oi.menu_item_snapshot->>'name', mi.name) as item_name,
              COALESCE(oi.menu_item_snapshot->>'photo', mi.photo) as item_photo
       FROM order_items oi
       LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE oi.order_id = $1`,
      [orderId]
    );
    
    const order = result.rows[0];
    
    // Formater les items avec les noms corrects
    const formattedItems = itemsResult.rows.map(item => ({
      ...item,
      name: item.item_name || item.menu_item_snapshot?.name || 'Article',
      price: item.unit_price,
    }));
    order.items = formattedItems;
    
    // RECALCULER le sous-total à partir des items pour garantir l'exactitude
    // C'est la source de vérité car les items contiennent les quantités réelles
    // IMPORTANT: Toujours recalculer unit_price * quantity pour éviter d'utiliser un subtotal incorrect stocké
    const recalculatedSubtotal = formattedItems.reduce((sum, item) => {
      // TOUJOURS recalculer à partir de unit_price * quantity (source de vérité)
      const unitPrice = parseFloat(item.unit_price || item.price || 0);
      const quantity = parseInt(item.quantity) || 1;
      const itemSubtotal = unitPrice * quantity;
      
      // Vérifier si le subtotal stocké diffère du recalculé
      const storedItemSubtotal = item.subtotal !== null && item.subtotal !== undefined
        ? parseFloat(item.subtotal)
        : null;
      
      if (storedItemSubtotal !== null && Math.abs(storedItemSubtotal - itemSubtotal) > 0.01) {
        logger.warn('Sous-total item incorrect détecté:', {
          orderId: order.id,
          itemName: item.name,
          unitPrice,
          quantity,
          storedSubtotal: storedItemSubtotal,
          recalculatedSubtotal: itemSubtotal,
          difference: Math.abs(storedItemSubtotal - itemSubtotal),
        });
      }
      
      return sum + (isNaN(itemSubtotal) ? 0 : itemSubtotal);
    }, 0);
    
    // Utiliser le sous-total recalculé comme source de vérité
    // Le recalcul à partir des items est plus fiable car il prend en compte les quantités réelles
    // Si on a des items, toujours utiliser le recalculé (même s'il est 0, c'est la source de vérité)
    // Sinon, utiliser celui de la base de données
    const subtotal = formattedItems.length > 0 
      ? recalculatedSubtotal 
      : (parseFloat(order.subtotal) || 0);
    
    // Logger si le sous-total diffère
    if (Math.abs(recalculatedSubtotal - parseFloat(order.subtotal || 0)) > 0.01) {
      logger.warn('Sous-total recalculé diffère de celui en base:', {
        orderId: order.id,
        orderNumber: order.order_number,
        subtotalInDB: parseFloat(order.subtotal || 0),
        recalculatedSubtotal,
        itemsCount: formattedItems.length,
        itemsDetails: formattedItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          item_subtotal: item.subtotal,
        })),
      });
    }
    
    // Formater l'adresse de livraison
    let deliveryAddress = '';
    let deliveryLatitude = null;
    let deliveryLongitude = null;
    let deliveryLandmark = '';
    
    if (order.delivery_address) {
      const deliveryAddr = typeof order.delivery_address === 'string' 
        ? JSON.parse(order.delivery_address) 
        : order.delivery_address;
      
      deliveryAddress = [
        deliveryAddr.address_line,
        deliveryAddr.district,
        deliveryAddr.city
      ].filter(Boolean).join(', ') || deliveryAddr.street || '';
      
      deliveryLatitude = parseFloat(deliveryAddr.latitude) || null;
      deliveryLongitude = parseFloat(deliveryAddr.longitude) || null;
      deliveryLandmark = deliveryAddr.landmark || '';
    }
    
    // Calculer le revenu net (subtotal - commission)
    // IMPORTANT: TOUJOURS recalculer la commission à partir du sous-total recalculé
    // pour éviter d'utiliser une commission stockée basée sur un mauvais sous-total
    const total = parseFloat(order.total) || 0;
    
    // Utiliser la fonction getCommission() pour garantir la cohérence avec le reste du système
    const { getCommission } = require('../utils/commission');
    
    // Déterminer le taux de commission à utiliser (priorité: order.commission_rate > restaurant.commission_rate > 15%)
    let commissionRate = 15; // Défaut
    if (order.order_commission_rate !== null && order.order_commission_rate !== undefined) {
      commissionRate = parseFloat(order.order_commission_rate);
    } else if (order.restaurant_commission_rate !== null && order.restaurant_commission_rate !== undefined) {
      commissionRate = parseFloat(order.restaurant_commission_rate);
    }
    
    // TOUJOURS recalculer la commission à partir du sous-total recalculé (source de vérité)
    const { commission, rate: finalCommissionRate } = getCommission(subtotal, commissionRate);
    
    // Vérifier si la commission stockée correspond au sous-total recalculé
    const storedCommission = order.commission !== null && order.commission !== undefined 
      ? parseFloat(order.commission) 
      : null;
    
    // Logger si la commission stockée diffère significativement de celle recalculée
    if (storedCommission !== null && !isNaN(storedCommission) && storedCommission > 0) {
      const difference = Math.abs(storedCommission - commission);
      const tolerance = 0.01; // Tolérance de 1 centime
      
      if (difference > tolerance) {
        logger.warn('Commission stockée diffère de celle recalculée:', {
          orderId: order.id,
          orderNumber: order.order_number,
          subtotalRecalculated: subtotal,
          subtotalInDB: parseFloat(order.subtotal || 0),
          storedCommission,
          recalculatedCommission: commission,
          difference,
          commissionRate: finalCommissionRate,
        });
      }
    }
    
    // Le restaurant reçoit: subtotal - commission (pas les frais de livraison/service)
    const netRevenue = subtotal - commission;
    
    // Logger pour déboguer les valeurs calculées
    logger.info('Calcul commission et revenu net pour commande:', {
      orderId: order.id,
      orderNumber: order.order_number,
      subtotalRecalculated: subtotal,
      subtotalInDB: parseFloat(order.subtotal || 0),
      storedCommission: order.commission,
      recalculatedCommission: commission,
      commissionRate: finalCommissionRate,
      netRevenue,
      orderCommissionRate: order.order_commission_rate,
      restaurantCommissionRate: order.restaurant_commission_rate,
      itemsCount: formattedItems.length,
      itemsTotal: recalculatedSubtotal,
    });
    
    // Formater les données pour le frontend
    const formattedOrder = {
      ...order,
      customerName: order.customer_name || 'Client',
      customerPhone: order.customer_phone || '',
      deliveryAddress: deliveryAddress,
      deliveryLatitude: deliveryLatitude,
      deliveryLongitude: deliveryLongitude,
      deliveryLandmark: deliveryLandmark,
      subtotal: subtotal, // Utiliser le sous-total recalculé (source de vérité)
      deliveryFee: parseFloat(order.delivery_fee) || 0,
      commission: Math.max(0, commission), // Commission recalculée à partir du sous-total recalculé
      commissionRate: finalCommissionRate, // Taux utilisé pour le calcul
      netRevenue: Math.max(0, netRevenue), // Revenu net = subtotal - commission
      total: total,
      items: formattedItems,
    };
    
    res.json({
      success: true,
      data: {
        order: formattedOrder,
      },
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
    const restaurantId = req.user.id;
    const { period = 'today' } = req.query;
    
    let dateFilter = '';
    let dateFilterSubquery = '';
    let daysCount = 7;
    const values = [restaurantId];
    
    if (period === 'today') {
      dateFilter = "AND DATE(o.placed_at) = CURRENT_DATE";
      dateFilterSubquery = "AND DATE(placed_at) = CURRENT_DATE";
      daysCount = 1;
    } else if (period === 'week') {
      dateFilter = "AND o.placed_at >= CURRENT_DATE - INTERVAL '7 days'";
      dateFilterSubquery = "AND placed_at >= CURRENT_DATE - INTERVAL '7 days'";
      daysCount = 7;
    } else if (period === 'month') {
      dateFilter = "AND o.placed_at >= CURRENT_DATE - INTERVAL '30 days'";
      dateFilterSubquery = "AND placed_at >= CURRENT_DATE - INTERVAL '30 days'";
      daysCount = 30;
    }
    
    // Statistiques générales - Utiliser des sous-requêtes pour éviter la syntaxe FILTER
    // IMPORTANT: Revenu = sous-total - commission (revenu net du restaurant)
    const statsResult = await query(
      `SELECT 
        (SELECT COUNT(*) FROM orders WHERE restaurant_id = r.id AND DATE(placed_at) = CURRENT_DATE) as today_orders,
        COALESCE((SELECT SUM(o.subtotal - COALESCE(o.commission, o.subtotal * COALESCE(o.commission_rate, r.commission_rate, 15.0) / 100.0)) FROM orders o WHERE o.restaurant_id = r.id AND DATE(o.placed_at) = CURRENT_DATE AND o.status = 'delivered'), 0) as today_revenue,
        (SELECT COUNT(*) FROM orders WHERE restaurant_id = r.id AND (status = 'new' OR status = 'pending')) as pending_orders,
        (SELECT COUNT(*) FROM orders WHERE restaurant_id = r.id AND status = 'delivered' ${dateFilterSubquery}) as delivered_orders,
        (SELECT COUNT(*) FROM orders WHERE restaurant_id = r.id AND (status = 'cancelled' OR status = 'refused') ${dateFilterSubquery}) as cancelled_orders,
        COALESCE((SELECT AVG(EXTRACT(EPOCH FROM (ready_at - accepted_at)) / 60) FROM orders WHERE restaurant_id = r.id AND ready_at IS NOT NULL AND accepted_at IS NOT NULL ${dateFilterSubquery}), 0) as average_preparation_time,
        r.average_rating,
        r.total_reviews,
        r.commission_rate
       FROM restaurants r
       WHERE r.id = $1`,
      values
    );
    
    const stats = statsResult.rows[0] || {
      today_orders: 0,
      today_revenue: 0,
      pending_orders: 0,
      delivered_orders: 0,
      cancelled_orders: 0,
      average_preparation_time: 0,
      average_rating: 0,
      total_reviews: 0,
    };
    
    // Revenus par jour (7 ou 30 derniers jours) - utilise revenu NET (subtotal - commission)
    const revenueByDayResult = await query(
      `SELECT 
        DATE(o.placed_at) as date,
        COALESCE(SUM(o.subtotal - COALESCE(o.commission, o.subtotal * COALESCE(o.commission_rate, r.commission_rate, 15.0) / 100.0)), 0) as revenue,
        COUNT(*) as orders_count
       FROM orders o
       LEFT JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.restaurant_id = $1 AND o.status = 'delivered' ${dateFilter}
       GROUP BY DATE(o.placed_at)
       ORDER BY DATE(o.placed_at) DESC
       LIMIT $2`,
      [restaurantId, daysCount]
    );
    
    // Heures de pointe (commandes par heure sur la période)
    const peakHoursResult = await query(
      `SELECT 
        EXTRACT(HOUR FROM o.placed_at) as hour,
        COUNT(*) as orders_count
       FROM orders o
       WHERE o.restaurant_id = $1 ${dateFilter}
       GROUP BY EXTRACT(HOUR FROM o.placed_at)
       ORDER BY EXTRACT(HOUR FROM o.placed_at)`,
      values
    );
    
    // Acceptées vs Refusées vs Total
    // Taux d'acceptation = Commandes acceptées / Toutes commandes reçues × 100
    const acceptedRefusedResult = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE o.status IN ('accepted', 'preparing', 'ready', 'delivering', 'delivered')) as accepted,
        COUNT(*) FILTER (WHERE o.status = 'refused') as refused,
        COUNT(*) FILTER (WHERE o.status = 'cancelled') as cancelled,
        COUNT(*) as total_received
       FROM orders o
       WHERE o.restaurant_id = $1 ${dateFilter}`,
      values
    );
    
    // Top plats vendus
    const topDishesResult = await query(
      `SELECT 
        COALESCE(oi.menu_item_snapshot->>'name', mi.name) as dish_name,
        COUNT(*) as sales_count,
        COALESCE(SUM(oi.subtotal), 0) as revenue
       FROM order_items oi
       LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
       LEFT JOIN orders o ON oi.order_id = o.id
       WHERE o.restaurant_id = $1 ${dateFilter}
         AND o.status = 'delivered'
       GROUP BY COALESCE(oi.menu_item_snapshot->>'name', mi.name)
       ORDER BY sales_count DESC
       LIMIT 5`,
      values
    );
    
    // Préparer les données pour les graphiques
    const revenueByDay = revenueByDayResult.rows.map(row => ({
      date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date).split('T')[0],
      revenue: Number.parseFloat(row.revenue || 0),
      orders_count: Number.parseInt(row.orders_count || 0),
    })).reverse(); // Du plus ancien au plus récent
    
    // Remplir les jours manquants avec 0
    const revenueData = [];
    const ordersData = [];
    const dayLabels = [];
    const today = new Date();
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    
    for (let i = daysCount - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = revenueByDay.find(d => d.date === dateStr);
      revenueData.push(dayData?.revenue || 0);
      ordersData.push(dayData?.orders_count || 0);
      dayLabels.push(days[date.getDay()]);
    }
    
    // Heures de pointe (24 heures)
    const peakHoursData = Array.from({ length: 24 }, (_, hour) => {
      const hourData = peakHoursResult.rows.find(h => Number.parseInt(h.hour) === hour);
      return Number.parseInt(hourData?.orders_count || 0);
    });
    
    const acceptedRefused = acceptedRefusedResult.rows[0] || { accepted: 0, refused: 0, cancelled: 0, total_received: 0 };
    // Taux d'acceptation = Commandes acceptées / Toutes commandes reçues × 100
    const totalOrdersForRatio = Number.parseInt(acceptedRefused.total_received) || 0;
    
    res.json({
      success: true,
      data: {
        statistics: {
          today_orders: Number.parseInt(stats.today_orders) || 0,
          today_revenue: Number.parseFloat(stats.today_revenue) || 0, // Revenu NET (après commission)
          pending_orders: Number.parseInt(stats.pending_orders) || 0,
          delivered_orders: Number.parseInt(stats.delivered_orders) || 0,
          cancelled_orders: Number.parseInt(stats.cancelled_orders) || 0,
          average_rating: Number.parseFloat(stats.average_rating) || 0,
          total_reviews: Number.parseInt(stats.total_reviews) || 0,
          average_preparation_time: Math.round(Number.parseFloat(stats.average_preparation_time) || 0),
          commission_rate: Number.parseFloat(stats.commission_rate) || 15.0, // Taux de commission du restaurant
          // Données pour graphiques
          revenue_evolution: {
            labels: dayLabels,
            datasets: [{ data: revenueData }],
          },
          orders_per_day: {
            labels: dayLabels,
            datasets: [{ data: ordersData }],
          },
          peak_hours: {
            labels: Array.from({ length: 24 }, (_, i) => i.toString()),
            datasets: [{ data: peakHoursData }],
          },
          accepted_vs_refused: [
            { 
              name: 'Acceptées', 
              population: Number.parseInt(acceptedRefused.accepted) || 0, 
              color: '#10B981',
            },
            { 
              name: 'Refusées', 
              population: Number.parseInt(acceptedRefused.refused) || 0, 
              color: '#EF4444',
            },
            { 
              name: 'Annulées', 
              population: Number.parseInt(acceptedRefused.cancelled) || 0, 
              color: '#F59E0B',
            },
          ],
          // Taux d'acceptation global = (Acceptées / Total reçues) × 100
          acceptance_rate: totalOrdersForRatio > 0 
            ? Math.round((Number.parseInt(acceptedRefused.accepted) / totalOrdersForRatio) * 100)
            : 0,
          total_orders_received: totalOrdersForRatio,
          top_dishes: topDishesResult.rows.map((dish, index) => ({
            name: dish.dish_name || 'Plat',
            sales: Number.parseInt(dish.sales_count) || 0,
            revenue: Number.parseFloat(dish.revenue) || 0,
          })),
          daily_stats: revenueByDay.map(day => {
            const dateObj = new Date(day.date);
            return {
              date: dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
              orders: day.orders_count || 0,
              revenue: day.revenue || 0,
              acceptanceRate: totalOrdersForRatio > 0 
                ? Math.round((Number.parseInt(acceptedRefused.accepted) / totalOrdersForRatio) * 100)
                : 0,
            };
          }),
        },
      },
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
    const restaurantId = req.user.id;
    const { start_date, end_date } = req.query;
    
    let dateFilter = '';
    const values = [restaurantId];
    
    if (start_date && end_date) {
      dateFilter = "AND o.placed_at BETWEEN $2 AND $3";
      values.push(new Date(start_date), new Date(end_date));
    } else if (start_date) {
      dateFilter = "AND o.placed_at >= $2";
      values.push(new Date(start_date));
    } else if (end_date) {
      dateFilter = "AND o.placed_at <= $2";
      values.push(new Date(end_date));
    }
    
    // Récupérer les gains (revenus articles moins commission plateforme)
    // Le restaurant reçoit: subtotal (prix articles) - commission
    // Il ne reçoit PAS les frais de livraison (vont au livreur) ni frais de service (vont à la plateforme)
    // Utiliser la même logique de calcul de commission que partout ailleurs :
    // 1. o.commission si disponible
    // 2. Sinon o.commission_rate
    // 3. Sinon r.commission_rate
    // 4. Sinon défaut 15%
    const earningsResult = await query(
      `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(o.subtotal), 0) as total_revenue,
        COALESCE(SUM(
          CASE 
            WHEN o.commission IS NOT NULL THEN o.commission
            WHEN o.commission_rate IS NOT NULL THEN o.subtotal * o.commission_rate / 100.0
            WHEN r.commission_rate IS NOT NULL THEN o.subtotal * r.commission_rate / 100.0
            ELSE o.subtotal * 15.0 / 100.0
          END
        ), 0) as total_commission,
        COALESCE(SUM(
          o.subtotal - CASE 
            WHEN o.commission IS NOT NULL THEN o.commission
            WHEN o.commission_rate IS NOT NULL THEN o.subtotal * o.commission_rate / 100.0
            WHEN r.commission_rate IS NOT NULL THEN o.subtotal * r.commission_rate / 100.0
            ELSE o.subtotal * 15.0 / 100.0
          END
        ), 0) as net_earnings,
        r.balance
       FROM restaurants r
       LEFT JOIN orders o ON o.restaurant_id = r.id AND o.status = 'delivered' ${dateFilter}
       WHERE r.id = $1
       GROUP BY r.id, r.balance`,
      values
    );
    
    const earnings = earningsResult.rows[0] || {
      total_orders: 0,
      total_revenue: 0,
      total_commission: 0,
      net_earnings: 0,
      balance: 0,
    };
    
    res.json({
      success: true,
      data: {
        earnings: {
          total_orders: parseInt(earnings.total_orders) || 0,
          total_revenue: parseFloat(earnings.total_revenue) || 0,
          total_commission: parseFloat(earnings.total_commission) || 0,
          net_earnings: parseFloat(earnings.net_earnings) || 0,
          balance: parseFloat(earnings.balance) || 0,
        },
      },
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
    const restaurantId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Récupérer les avis (commandes avec une note)
    const result = await query(`
      SELECT 
        o.id,
        o.order_number,
        o.restaurant_rating as rating,
        o.restaurant_review as comment,
        o.delivered_at as created_at,
        u.first_name as customer_name,
        u.profile_picture as customer_avatar
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.restaurant_id = $1 
        AND o.restaurant_rating IS NOT NULL
      ORDER BY o.delivered_at DESC
      LIMIT $2 OFFSET $3
    `, [restaurantId, limit, offset]);

    // Compter le total
    const countResult = await query(`
      SELECT COUNT(*) FROM orders 
      WHERE restaurant_id = $1 AND restaurant_rating IS NOT NULL
    `, [restaurantId]);

    // Calculer les statistiques
    const statsResult = await query(`
      SELECT 
        COALESCE(AVG(restaurant_rating), 0) as avg_rating,
        COUNT(*) as total_reviews,
        COUNT(*) FILTER (WHERE restaurant_rating = 5) as five_star,
        COUNT(*) FILTER (WHERE restaurant_rating = 4) as four_star,
        COUNT(*) FILTER (WHERE restaurant_rating = 3) as three_star,
        COUNT(*) FILTER (WHERE restaurant_rating = 2) as two_star,
        COUNT(*) FILTER (WHERE restaurant_rating = 1) as one_star
      FROM orders 
      WHERE restaurant_id = $1 AND restaurant_rating IS NOT NULL
    `, [restaurantId]);

    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: {
        reviews: result.rows,
        statistics: {
          avg_rating: parseFloat(stats.avg_rating) || 0,
          total_reviews: parseInt(stats.total_reviews) || 0,
          distribution: {
            5: parseInt(stats.five_star) || 0,
            4: parseInt(stats.four_star) || 0,
            3: parseInt(stats.three_star) || 0,
            2: parseInt(stats.two_star) || 0,
            1: parseInt(stats.one_star) || 0,
          },
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getMyReviews:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des avis' },
    });
  }
};

/**
 * Demander un paiement
 */
exports.requestPayout = async (req, res) => {
  try {
    const { amount, payment_method, account_number, account_name } = req.body;
    const restaurantId = req.user.id;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Le montant doit être supérieur à 0' },
      });
    }

    const MIN_PAYOUT = 10000; // 10,000 FCFA minimum
    if (amount < MIN_PAYOUT) {
      return res.status(400).json({
        success: false,
        error: { code: 'AMOUNT_TOO_LOW', message: `Le montant minimum de retrait est de ${MIN_PAYOUT} FCFA` },
      });
    }

    if (!payment_method || !account_number) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Méthode de paiement et numéro de compte requis' },
      });
    }

    // Vérifier le solde disponible
    const balanceResult = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN to_user_id = $1 THEN amount ELSE 0 END), 0) as credits,
        COALESCE(SUM(CASE WHEN from_user_id = $1 THEN amount ELSE 0 END), 0) as debits
      FROM transactions
      WHERE (to_user_id = $1 OR from_user_id = $1)
        AND status = 'completed'
    `, [restaurantId]);

    const balance = parseFloat(balanceResult.rows[0].credits) - parseFloat(balanceResult.rows[0].debits);

    // Vérifier les demandes en cours
    const pendingResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as pending_amount
      FROM payout_requests
      WHERE user_id = $1 AND user_type = 'restaurant' AND status IN ('pending', 'processing')
    `, [restaurantId]);

    const pendingAmount = parseFloat(pendingResult.rows[0].pending_amount);
    const availableBalance = balance - pendingAmount;

    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'INSUFFICIENT_BALANCE', 
          message: `Solde insuffisant. Disponible: ${availableBalance.toFixed(0)} FCFA` 
        },
      });
    }

    // Créer la demande de payout
    const result = await query(`
      INSERT INTO payout_requests (
        user_type, user_id, amount, payment_method, account_number, account_name, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `, ['restaurant', restaurantId, amount, payment_method, account_number, account_name || null]);

    logger.info(`Demande de payout créée pour restaurant ${restaurantId}: ${amount} FCFA`);

    res.status(201).json({
      success: true,
      data: {
        payout: result.rows[0],
        message: 'Votre demande de retrait a été enregistrée. Elle sera traitée dans un délai de 24-48h.',
      },
    });
  } catch (error) {
    logger.error('Erreur requestPayout:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'Erreur lors de la demande de retrait' },
    });
  }
};

/**
 * Obtenir les demandes de paiement
 */
exports.getMyPayoutRequests = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = $1 AND user_type = $2';
    const params = [restaurantId, 'restaurant'];

    if (status) {
      whereClause += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    // Obtenir les demandes
    const result = await query(`
      SELECT 
        pr.*,
        a.first_name as processed_by_name
      FROM payout_requests pr
      LEFT JOIN admins a ON pr.processed_by = a.id
      ${whereClause}
      ORDER BY pr.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    // Compter le total
    const countResult = await query(`
      SELECT COUNT(*) FROM payout_requests ${whereClause}
    `, params);

    // Calculer le solde disponible
    const balanceResult = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN to_user_id = $1 THEN amount ELSE 0 END), 0) as credits,
        COALESCE(SUM(CASE WHEN from_user_id = $1 THEN amount ELSE 0 END), 0) as debits
      FROM transactions
      WHERE (to_user_id = $1 OR from_user_id = $1)
        AND status = 'completed'
    `, [restaurantId]);

    const pendingResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as pending_amount
      FROM payout_requests
      WHERE user_id = $1 AND user_type = 'restaurant' AND status IN ('pending', 'processing')
    `, [restaurantId]);

    const totalBalance = parseFloat(balanceResult.rows[0].credits) - parseFloat(balanceResult.rows[0].debits);
    const pendingAmount = parseFloat(pendingResult.rows[0].pending_amount);
    const availableBalance = totalBalance - pendingAmount;

    res.json({
      success: true,
      data: {
        payouts: result.rows,
        balance: {
          total: totalBalance,
          pending: pendingAmount,
          available: availableBalance,
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getMyPayoutRequests:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des demandes' },
    });
  }
};

/**
 * Obtenir les promotions
 */
exports.getMyPromotions = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    
    // Récupérer les codes promo du restaurant
    const promotionsResult = await query(
      `SELECT * FROM promotions 
       WHERE restaurant_id = $1 
       ORDER BY created_at DESC`,
      [restaurantId]
    );
    
    // Récupérer aussi les promotions sur les items du menu
    const menuPromotionsResult = await query(
      `SELECT 
        id,
        name,
        price as original_price,
        promotional_price,
        is_promotional,
        promotion_start,
        promotion_end,
        promotion_description,
        CASE 
          WHEN is_promotional = true 
            AND promotional_price IS NOT NULL
            AND (promotion_start IS NULL OR promotion_start <= NOW())
            AND (promotion_end IS NULL OR promotion_end >= NOW())
          THEN true
          ELSE false
        END as is_active,
        CASE 
          WHEN is_promotional = true 
            AND promotional_price IS NOT NULL
            AND (promotion_start IS NULL OR promotion_start <= NOW())
            AND (promotion_end IS NULL OR promotion_end >= NOW())
          THEN promotional_price
          ELSE price
        END as effective_price,
        CASE 
          WHEN is_promotional = true 
            AND promotional_price IS NOT NULL
            AND (promotion_start IS NULL OR promotion_start <= NOW())
            AND (promotion_end IS NULL OR promotion_end >= NOW())
          THEN price - promotional_price
          ELSE 0
        END as savings,
        CASE 
          WHEN is_promotional = true 
            AND promotional_price IS NOT NULL
            AND (promotion_start IS NULL OR promotion_start <= NOW())
            AND (promotion_end IS NULL OR promotion_end >= NOW())
          THEN ROUND((1 - promotional_price / price) * 100)
          ELSE 0
        END as discount_percent
       FROM menu_items 
       WHERE restaurant_id = $1 
         AND is_promotional = true
       ORDER BY name ASC`,
      [restaurantId]
    );
    
    res.json({
      success: true,
      data: {
        promo_codes: promotionsResult.rows.map(promo => ({
          id: promo.id,
          code: promo.code,
          type: promo.type,
          value: parseFloat(promo.value),
          min_order_amount: parseFloat(promo.min_order_amount || 0),
          max_discount: promo.max_discount ? parseFloat(promo.max_discount) : null,
          usage_limit: promo.usage_limit,
          used_count: promo.used_count || 0,
          valid_from: promo.valid_from,
          valid_until: promo.valid_until,
          is_active: promo.is_active,
          created_at: promo.created_at,
        })),
        menu_item_promotions: menuPromotionsResult.rows.map(item => ({
          id: item.id,
          name: item.name,
          original_price: parseFloat(item.original_price),
          promotional_price: item.promotional_price ? parseFloat(item.promotional_price) : null,
          effective_price: parseFloat(item.effective_price),
          is_active: item.is_active,
          promotion_start: item.promotion_start,
          promotion_end: item.promotion_end,
          promotion_description: item.promotion_description,
          savings: parseFloat(item.savings || 0),
          discount_percent: parseInt(item.discount_percent || 0),
        })),
      },
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
 * Créer une promotion (code promo)
 */
exports.createPromotion = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    const {
      code,
      type,
      value,
      min_order_amount = 0,
      max_discount,
      usage_limit,
      valid_from,
      valid_until,
    } = req.body;

    // Validation
    if (!code || !type || value === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'code, type et value sont requis',
        },
      });
    }

    if (!['percentage', 'fixed_amount', 'free_delivery'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Type invalide. Types acceptés: percentage, fixed_amount, free_delivery',
        },
      });
    }

    // Validation des valeurs selon le type
    if (type === 'percentage' && (value < 0 || value > 100)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Pour un pourcentage, la valeur doit être entre 0 et 100',
        },
      });
    }

    if (type === 'fixed_amount' && value < 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Le montant fixe doit être positif',
        },
      });
    }

    // Dates de validité (optionnelles, par défaut maintenant jusqu'à 30 jours)
    const now = new Date();
    const defaultValidFrom = valid_from ? new Date(valid_from) : now;
    const defaultValidUntil = valid_until ? new Date(valid_until) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (defaultValidFrom >= defaultValidUntil) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'valid_until doit être après valid_from',
        },
      });
    }

    // Vérifier que le code n'existe pas déjà
    const existingPromo = await query(
      'SELECT id FROM promotions WHERE code = $1',
      [code.toUpperCase().trim()]
    );

    if (existingPromo.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PROMOTION_EXISTS',
          message: 'Un code promotion avec ce nom existe déjà',
        },
      });
    }

    // Créer la promotion
    const result = await query(
      `INSERT INTO promotions (
        code, type, value, min_order_amount, max_discount, usage_limit,
        valid_from, valid_until, applicable_to, restaurant_id, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      RETURNING *`,
      [
        code.toUpperCase().trim(),
        type,
        value,
        min_order_amount || 0,
        max_discount || null,
        usage_limit || null,
        defaultValidFrom,
        defaultValidUntil,
        'specific_restaurant',
        restaurantId,
      ]
    );

    logger.info(`Promotion créée par restaurant ${restaurantId}`, { code: code.toUpperCase() });

    res.status(201).json({
      success: true,
      message: 'Promotion créée avec succès',
      data: {
        promotion: {
          id: result.rows[0].id,
          code: result.rows[0].code,
          type: result.rows[0].type,
          value: parseFloat(result.rows[0].value),
          min_order_amount: parseFloat(result.rows[0].min_order_amount || 0),
          max_discount: result.rows[0].max_discount ? parseFloat(result.rows[0].max_discount) : null,
          usage_limit: result.rows[0].usage_limit,
          used_count: result.rows[0].used_count || 0,
          valid_from: result.rows[0].valid_from,
          valid_until: result.rows[0].valid_until,
          is_active: result.rows[0].is_active,
          created_at: result.rows[0].created_at,
        },
      },
    });
  } catch (error) {
    logger.error('Erreur createPromotion:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({
        success: false,
        error: {
          code: 'PROMOTION_EXISTS',
          message: 'Un code promotion avec ce nom existe déjà',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: { 
        code: 'CREATE_ERROR', 
        message: 'Erreur lors de la création',
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
        }),
      },
    });
  }
};

/**
 * Mettre à jour une promotion
 */
exports.updatePromotion = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    const { promotionId } = req.params;
    const {
      value,
      min_order_amount,
      max_discount,
      usage_limit,
      valid_from,
      valid_until,
      is_active,
    } = req.body;

    // Vérifier que la promotion appartient au restaurant
    const existingPromo = await query(
      'SELECT * FROM promotions WHERE id = $1 AND restaurant_id = $2',
      [promotionId, restaurantId]
    );

    if (existingPromo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROMOTION_NOT_FOUND', message: 'Promotion non trouvée' },
      });
    }

    // Construire la requête de mise à jour dynamiquement
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (value !== undefined) {
      updates.push(`value = $${paramIndex++}`);
      values.push(value);
    }
    if (min_order_amount !== undefined) {
      updates.push(`min_order_amount = $${paramIndex++}`);
      values.push(min_order_amount);
    }
    if (max_discount !== undefined) {
      updates.push(`max_discount = $${paramIndex++}`);
      values.push(max_discount);
    }
    if (usage_limit !== undefined) {
      updates.push(`usage_limit = $${paramIndex++}`);
      values.push(usage_limit);
    }
    if (valid_from !== undefined) {
      updates.push(`valid_from = $${paramIndex++}`);
      values.push(new Date(valid_from));
    }
    if (valid_until !== undefined) {
      updates.push(`valid_until = $${paramIndex++}`);
      values.push(new Date(valid_until));
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Aucun champ à mettre à jour' },
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(promotionId, restaurantId);

    const result = await query(
      `UPDATE promotions 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex++} AND restaurant_id = $${paramIndex++}
       RETURNING *`,
      values
    );

    logger.info(`Promotion mise à jour par restaurant ${restaurantId}`, { promotionId });

    res.json({
      success: true,
      message: 'Promotion mise à jour avec succès',
      data: {
        promotion: {
          id: result.rows[0].id,
          code: result.rows[0].code,
          type: result.rows[0].type,
          value: parseFloat(result.rows[0].value),
          min_order_amount: parseFloat(result.rows[0].min_order_amount || 0),
          max_discount: result.rows[0].max_discount ? parseFloat(result.rows[0].max_discount) : null,
          usage_limit: result.rows[0].usage_limit,
          used_count: result.rows[0].used_count || 0,
          valid_from: result.rows[0].valid_from,
          valid_until: result.rows[0].valid_until,
          is_active: result.rows[0].is_active,
          updated_at: result.rows[0].updated_at,
        },
      },
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
    const restaurantId = req.user.id;
    const { promotionId } = req.params;

    // Vérifier que la promotion appartient au restaurant
    const existingPromo = await query(
      'SELECT id, code FROM promotions WHERE id = $1 AND restaurant_id = $2',
      [promotionId, restaurantId]
    );

    if (existingPromo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROMOTION_NOT_FOUND', message: 'Promotion non trouvée' },
      });
    }

    // Supprimer la promotion
    await query(
      'DELETE FROM promotions WHERE id = $1 AND restaurant_id = $2',
      [promotionId, restaurantId]
    );

    logger.info(`Promotion supprimée par restaurant ${restaurantId}`, { 
      promotionId, 
      code: existingPromo.rows[0].code 
    });

    res.json({
      success: true,
      message: 'Promotion supprimée avec succès',
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
 * Basculer une promotion (activer/désactiver)
 */
exports.togglePromotion = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    const { promotionId } = req.params;

    // Vérifier que la promotion appartient au restaurant
    const existingPromo = await query(
      'SELECT id, code, is_active FROM promotions WHERE id = $1 AND restaurant_id = $2',
      [promotionId, restaurantId]
    );

    if (existingPromo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROMOTION_NOT_FOUND', message: 'Promotion non trouvée' },
      });
    }

    const newStatus = !existingPromo.rows[0].is_active;

    // Basculer le statut
    const result = await query(
      `UPDATE promotions 
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND restaurant_id = $3
       RETURNING *`,
      [newStatus, promotionId, restaurantId]
    );

    logger.info(`Promotion ${newStatus ? 'activée' : 'désactivée'} par restaurant ${restaurantId}`, { 
      promotionId, 
      code: existingPromo.rows[0].code 
    });

    res.json({
      success: true,
      message: `Promotion ${newStatus ? 'activée' : 'désactivée'} avec succès`,
      data: {
        promotion: {
          id: result.rows[0].id,
          code: result.rows[0].code,
          is_active: result.rows[0].is_active,
        },
      },
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

/**
 * ═══════════════════════════════════════════════════════════
 * SUPPORT & TICKETS
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Créer un ticket de support (signaler un problème)
 */
exports.createSupportTicket = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    const { type, description, email } = req.body;
    
    // Récupérer les infos du restaurant
    const restaurantResult = await query(
      'SELECT name, email, phone FROM restaurants WHERE id = $1',
      [restaurantId]
    );
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant non trouvé' },
      });
    }
    
    const restaurant = restaurantResult.rows[0];
    
    // Mapper le type de problème vers une catégorie (valeurs valides: order, payment, delivery, account, technical, other)
    const categoryMap = {
      'orders': 'order',
      'payments': 'payment',
      'app': 'technical',
      'account': 'account',
      'other': 'other',
    };
    
    // Mapper la priorité selon le type
    const priorityMap = {
      'orders': 'high',
      'payments': 'high',
      'app': 'medium',
      'account': 'medium',
      'other': 'low',
    };
    
    // Construire la description avec l'email de contact si fourni
    const fullDescription = email 
      ? `${description}\n\n---\nEmail de contact: ${email}`
      : `${description}\n\n---\nEmail restaurant: ${restaurant.email}`;
    
    // Générer le ticket_number en utilisant la fonction SQL
    const ticketNumResult = await query(`SELECT generate_ticket_number() as ticket_number`);
    const ticketNumber = ticketNumResult.rows[0].ticket_number;
    
    // Créer le ticket avec le ticket_number généré
    const result = await query(
      `INSERT INTO support_tickets (
        ticket_number, user_type, user_id, category, subject, description, 
        priority, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'open')
      RETURNING *`,
      [
        ticketNumber,
        'restaurant',
        restaurantId,
        categoryMap[type] || 'other',
        `[${type.toUpperCase()}] Problème signalé par ${restaurant.name}`,
        fullDescription,
        priorityMap[type] || 'medium',
      ]
    );
    
    const ticket = result.rows[0];
    
    logger.info('Ticket de support créé par restaurant:', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      restaurantId,
      restaurantName: restaurant.name,
      type,
    });
    
    res.status(201).json({
      success: true,
      message: 'Votre problème a été signalé avec succès',
      data: {
        ticket: {
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          status: ticket.status,
          created_at: ticket.created_at,
        },
      },
    });
  } catch (error) {
    logger.error('Erreur createSupportTicket:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'Erreur lors de la création du ticket' },
    });
  }
};

/**
 * Lister les tickets de support du restaurant
 */
exports.getMySupportTickets = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const result = await query(
      `SELECT * FROM support_tickets 
       WHERE user_type = 'restaurant' AND user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [restaurantId, limit, offset]
    );
    
    const countResult = await query(
      `SELECT COUNT(*) as total FROM support_tickets 
       WHERE user_type = 'restaurant' AND user_id = $1`,
      [restaurantId]
    );
    
    res.json({
      success: true,
      data: {
        tickets: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(countResult.rows[0].total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getMySupportTickets:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des tickets' },
    });
  }
};

/**
 * Détails d'un ticket de support
 */
exports.getSupportTicketDetails = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    const { ticketId } = req.params;
    
    // Récupérer le ticket
    const ticketResult = await query(
      `SELECT * FROM support_tickets 
       WHERE id = $1 AND user_type = 'restaurant' AND user_id = $2`,
      [ticketId, restaurantId]
    );
    
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'TICKET_NOT_FOUND', message: 'Ticket non trouvé' },
      });
    }
    
    // Vérifier si la colonne is_internal existe
    const hasIsInternal = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ticket_messages' 
        AND column_name = 'is_internal'
      ) as exists
    `);
    
    // Récupérer les messages du ticket (exclure les messages internes si la colonne existe)
    let messagesQuery;
    if (hasIsInternal.rows[0].exists) {
      messagesQuery = `
        SELECT id, ticket_id, sender_type, sender_id, message, created_at 
        FROM ticket_messages 
        WHERE ticket_id = $1 AND (is_internal = false OR is_internal IS NULL)
        ORDER BY created_at ASC
      `;
    } else {
      messagesQuery = `
        SELECT id, ticket_id, sender_type, sender_id, message, created_at 
        FROM ticket_messages 
        WHERE ticket_id = $1
        ORDER BY created_at ASC
      `;
    }
    
    const messagesResult = await query(messagesQuery, [ticketId]);
    
    logger.info('Récupération ticket details:', {
      ticketId,
      restaurantId,
      ticketFound: true,
      messagesCount: messagesResult.rows.length,
      messages: messagesResult.rows.map(m => ({
        id: m.id,
        sender_type: m.sender_type,
        messagePreview: m.message?.substring(0, 50),
      })),
    });
    
    res.json({
      success: true,
      data: {
        ticket: ticketResult.rows[0],
        messages: messagesResult.rows,
      },
    });
  } catch (error) {
    logger.error('Erreur getSupportTicketDetails:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération du ticket' },
    });
  }
};

/**
 * Ajouter un message à un ticket existant (style WhatsApp)
 */
exports.addMessageToTicket = async (req, res) => {
  try {
    const restaurantId = req.user.id;
    const { ticketId } = req.params;
    const { message } = req.body;
    
    // Vérifier que le ticket appartient au restaurant
    const ticketResult = await query(
      `SELECT * FROM support_tickets 
       WHERE id = $1 AND user_type = 'restaurant' AND user_id = $2`,
      [ticketId, restaurantId]
    );
    
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'TICKET_NOT_FOUND', message: 'Ticket non trouvé' },
      });
    }
    
    const ticket = ticketResult.rows[0];
    
    // Vérifier que le ticket n'est pas fermé
    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      return res.status(400).json({
        success: false,
        error: { code: 'TICKET_CLOSED', message: 'Ce ticket est fermé. Créez un nouveau ticket.' },
      });
    }
    
    // Ajouter le message
    const messageResult = await query(
      `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message)
       VALUES ($1, 'restaurant', $2, $3)
       RETURNING *`,
      [ticketId, restaurantId, message.trim()]
    );
    
    // Mettre à jour le ticket (remettre en attente si nécessaire)
    await query(
      `UPDATE support_tickets 
       SET updated_at = NOW(), 
           status = CASE WHEN status = 'in_progress' THEN 'waiting_customer' ELSE status END
       WHERE id = $1`,
      [ticketId]
    );
    
    logger.info('Message ajouté au ticket par restaurant:', {
      ticketId,
      restaurantId,
      messageId: messageResult.rows[0].id,
    });
    
    // Émettre une notification Socket.IO pour l'admin
    const io = req.app.get('io');
    if (io) {
      io.to('admin_dashboard').emit('new_support_message', {
        ticket_id: ticketId,
        ticket_number: ticket.ticket_number,
        message: messageResult.rows[0],
        sender_type: 'restaurant',
        restaurant_name: ticket.subject.replace(/\[.*\] Problème signalé par /, ''),
      });
      logger.debug('Notification Socket.IO envoyée aux admins pour nouveau message support');
    }
    
    res.status(201).json({
      success: true,
      message: 'Message envoyé',
      data: {
        message: messageResult.rows[0],
      },
    });
  } catch (error) {
    logger.error('Erreur addMessageToTicket:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SEND_ERROR', message: 'Erreur lors de l\'envoi du message' },
    });
  }
};

module.exports = exports;
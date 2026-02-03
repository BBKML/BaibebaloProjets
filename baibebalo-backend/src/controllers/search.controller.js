const { query } = require('../database/db');
const logger = require('../utils/logger');

const parseBoolean = (value) => value === true || value === 'true';

const parseTags = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
};

exports.search = async (req, res) => {
  try {
    const {
      q,
      category,
      cuisine_type,
      min_rating,
      min_price,
      max_price,
      max_delivery_time,
      free_delivery,
      promotions,
      mobile_money,
      new_restaurants,
      tags,
      sort = 'distance',
      page = 1,
      limit = 20,
    } = req.query;

    const latitude = req.query.latitude || req.query.lat;
    const longitude = req.query.longitude || req.query.lng;
    const parsedLatitude = latitude !== undefined ? parseFloat(latitude) : null;
    const parsedLongitude = longitude !== undefined ? parseFloat(longitude) : null;
    const hasCoords = Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude);

    const offset = (page - 1) * limit;
    const parsedTags = parseTags(tags);

    const distanceExpression = hasCoords
      ? `earth_distance(
          ll_to_earth(r.latitude, r.longitude),
          ll_to_earth($1, $2)
        ) / 1000`
      : null;

    const baseValues = [];
    let baseParamIndex = 1;

    if (hasCoords) {
      baseValues.push(parsedLatitude, parsedLongitude);
      baseParamIndex = 3;
    }

    const restaurantWhere = [`r.status = 'active'`];
    const restaurantValues = [...baseValues];
    let paramIndex = baseParamIndex;

    if (category) {
      restaurantWhere.push(`r.category = $${paramIndex}`);
      restaurantValues.push(category);
      paramIndex++;
    }

    if (cuisine_type) {
      restaurantWhere.push(`r.cuisine_type = $${paramIndex}`);
      restaurantValues.push(cuisine_type);
      paramIndex++;
    }

    if (q) {
      restaurantWhere.push(`(
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
      restaurantValues.push(`%${q}%`);
      paramIndex++;
    }

    if (min_rating) {
      restaurantWhere.push(`r.average_rating >= $${paramIndex}`);
      restaurantValues.push(parseFloat(min_rating));
      paramIndex++;
    }

    if (min_price || max_price) {
      const priceConditions = [];
      if (min_price) {
        priceConditions.push(`mi.price >= $${paramIndex}`);
        restaurantValues.push(parseFloat(min_price));
        paramIndex++;
      }
      if (max_price) {
        priceConditions.push(`mi.price <= $${paramIndex}`);
        restaurantValues.push(parseFloat(max_price));
        paramIndex++;
      }
      restaurantWhere.push(`EXISTS (
        SELECT 1 FROM menu_items mi
        WHERE mi.restaurant_id = r.id
        AND mi.is_available = true
        AND ${priceConditions.join(' AND ')}
      )`);
    }

    if (parsedTags.length > 0) {
      restaurantWhere.push(`EXISTS (
        SELECT 1 FROM menu_items mi
        WHERE mi.restaurant_id = r.id
        AND mi.is_available = true
        AND mi.tags && $${paramIndex}::text[]
      )`);
      restaurantValues.push(parsedTags);
      paramIndex++;
    }

    if (parseBoolean(promotions)) {
      restaurantWhere.push(`EXISTS (
        SELECT 1 FROM promotions p
        WHERE p.restaurant_id = r.id
        AND p.is_active = true
        AND p.valid_from <= NOW()
        AND p.valid_until >= NOW()
      )`);
    }

    if (parseBoolean(free_delivery)) {
      restaurantWhere.push(`EXISTS (
        SELECT 1 FROM promotions p
        WHERE p.restaurant_id = r.id
        AND p.is_active = true
        AND p.type = 'free_delivery'
        AND p.valid_from <= NOW()
        AND p.valid_until >= NOW()
      )`);
    }

    if (parseBoolean(mobile_money)) {
      restaurantWhere.push(`r.mobile_money_provider IS NOT NULL`);
    }

    if (parseBoolean(new_restaurants)) {
      restaurantWhere.push(`r.created_at >= NOW() - INTERVAL '30 days'`);
    }

    if (max_delivery_time && hasCoords) {
      restaurantWhere.push(`(15 + (${distanceExpression} * 3)) <= $${paramIndex}`);
      restaurantValues.push(parseFloat(max_delivery_time));
      paramIndex++;
    }

    let restaurantQuery = `
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
      WHERE ${restaurantWhere.join(' AND ')}
    `;

    if (sort === 'distance' && hasCoords) {
      restaurantQuery += ' ORDER BY distance_km ASC';
    } else if (sort === 'rating') {
      restaurantQuery += ' ORDER BY r.average_rating DESC, r.total_reviews DESC';
    } else if (sort === 'popularity') {
      restaurantQuery += ' ORDER BY r.total_orders DESC';
    } else {
      restaurantQuery += ' ORDER BY r.created_at DESC';
    }

    restaurantQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    restaurantValues.push(parseInt(limit, 10), offset);

    const restaurantsResult = await query(restaurantQuery, restaurantValues);
    const restaurants = restaurantsResult.rows.map((restaurant) => ({
      ...restaurant,
      estimated_delivery_time:
        hasCoords && restaurant.distance_km !== null
          ? Math.ceil(15 + restaurant.distance_km * 3)
          : null,
    }));

    const restaurantCountResult = await query(
      `SELECT COUNT(*) FROM restaurants r WHERE ${restaurantWhere.join(' AND ')}`,
      restaurantValues.slice(0, restaurantValues.length - 2)
    );

    const dishWhere = [`mi.is_available = true`, `r.status = 'active'`];
    const dishValues = [...baseValues];
    let dishParamIndex = baseParamIndex;

    if (q) {
      dishWhere.push(`(
        mi.name ILIKE $${dishParamIndex} OR
        mi.description ILIKE $${dishParamIndex} OR
        r.name ILIKE $${dishParamIndex}
      )`);
      dishValues.push(`%${q}%`);
      dishParamIndex++;
    }

    if (category) {
      dishWhere.push(`r.category = $${dishParamIndex}`);
      dishValues.push(category);
      dishParamIndex++;
    }

    if (cuisine_type) {
      dishWhere.push(`r.cuisine_type = $${dishParamIndex}`);
      dishValues.push(cuisine_type);
      dishParamIndex++;
    }

    if (min_rating) {
      dishWhere.push(`r.average_rating >= $${dishParamIndex}`);
      dishValues.push(parseFloat(min_rating));
      dishParamIndex++;
    }

    if (min_price) {
      dishWhere.push(`mi.price >= $${dishParamIndex}`);
      dishValues.push(parseFloat(min_price));
      dishParamIndex++;
    }

    if (max_price) {
      dishWhere.push(`mi.price <= $${dishParamIndex}`);
      dishValues.push(parseFloat(max_price));
      dishParamIndex++;
    }

    if (parsedTags.length > 0) {
      dishWhere.push(`mi.tags && $${dishParamIndex}::text[]`);
      dishValues.push(parsedTags);
      dishParamIndex++;
    }

    if (parseBoolean(promotions)) {
      dishWhere.push(`EXISTS (
        SELECT 1 FROM promotions p
        WHERE p.restaurant_id = r.id
        AND p.is_active = true
        AND p.valid_from <= NOW()
        AND p.valid_until >= NOW()
      )`);
    }

    if (parseBoolean(free_delivery)) {
      dishWhere.push(`EXISTS (
        SELECT 1 FROM promotions p
        WHERE p.restaurant_id = r.id
        AND p.is_active = true
        AND p.type = 'free_delivery'
        AND p.valid_from <= NOW()
        AND p.valid_until >= NOW()
      )`);
    }

    if (parseBoolean(mobile_money)) {
      dishWhere.push(`r.mobile_money_provider IS NOT NULL`);
    }

    if (parseBoolean(new_restaurants)) {
      dishWhere.push(`r.created_at >= NOW() - INTERVAL '30 days'`);
    }

    if (max_delivery_time && hasCoords) {
      dishWhere.push(`(15 + (${distanceExpression} * 3)) <= $${dishParamIndex}`);
      dishValues.push(parseFloat(max_delivery_time));
      dishParamIndex++;
    }

    let dishQuery = `
      SELECT mi.*, 
        r.name as restaurant_name,
        r.average_rating as restaurant_rating,
        r.category as restaurant_category,
        r.cuisine_type as restaurant_cuisine_type,
        ${hasCoords ? `${distanceExpression} as distance_km` : 'NULL as distance_km'}
      FROM menu_items mi
      JOIN restaurants r ON mi.restaurant_id = r.id
      WHERE ${dishWhere.join(' AND ')}
      ORDER BY mi.total_sold DESC, mi.created_at DESC
      LIMIT $${dishParamIndex} OFFSET $${dishParamIndex + 1}
    `;
    dishValues.push(parseInt(limit, 10), offset);

    const dishesResult = await query(dishQuery, dishValues);

    const dishCountResult = await query(
      `SELECT COUNT(*) FROM menu_items mi
       JOIN restaurants r ON mi.restaurant_id = r.id
       WHERE ${dishWhere.join(' AND ')}`,
      dishValues.slice(0, dishValues.length - 2)
    );

    res.json({
      success: true,
      data: {
        restaurants,
        dishes: dishesResult.rows,
        totals: {
          restaurants: parseInt(restaurantCountResult.rows[0].count, 10),
          dishes: parseInt(dishCountResult.rows[0].count, 10),
        },
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur search:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: 'Erreur lors de la recherche',
      },
    });
  }
};

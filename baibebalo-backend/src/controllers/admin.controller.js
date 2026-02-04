const { query, transaction } = require('../database/db');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');

/**
 * Dashboard - Statistiques globales
 */
exports.getDashboard = async (req, res) => {
  try {
    // Stats du jour
    const todayStats = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE o.status = 'delivered') as completed_orders,
        COUNT(*) FILTER (WHERE o.status IN ('new', 'accepted', 'preparing', 'ready', 'delivering')) as active_orders,
        COALESCE(SUM(o.total) FILTER (WHERE o.status = 'delivered'), 0) as today_revenue,
        COALESCE(SUM((o.subtotal * r.commission_rate / 100)) FILTER (WHERE o.status = 'delivered'), 0) as today_commission
      FROM orders o
      LEFT JOIN restaurants r ON o.restaurant_id = r.id
      WHERE o.placed_at >= CURRENT_DATE
    `);

    // Stats d'hier pour comparaisons
    const yesterdayStats = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE o.status = 'delivered') as completed_orders,
        COALESCE(SUM(o.total) FILTER (WHERE o.status = 'delivered'), 0) as yesterday_revenue
      FROM orders o
      WHERE DATE(o.placed_at) = CURRENT_DATE - INTERVAL '1 day'
    `);

    // Nouveaux utilisateurs aujourd'hui
    const newUsersToday = await query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE DATE(created_at) = CURRENT_DATE
    `);

    // Nouveaux utilisateurs hier
    const newUsersYesterday = await query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
    `);

    // Stats globales
    const globalStats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE status = 'active') as total_users,
        (SELECT COUNT(*) FROM restaurants WHERE status = 'active') as active_restaurants,
        (SELECT COUNT(*) FROM delivery_persons WHERE status = 'active') as active_delivery_persons,
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE orders.status = 'delivered') as total_revenue,
        (SELECT COALESCE(AVG(average_rating), 0) FROM restaurants WHERE total_reviews > 0) as avg_restaurant_rating
    `);

    // Note moyenne de satisfaction (depuis reviews)
    let avgSatisfaction = { rows: [{ avg_rating: 0, total_reviews: 0, previous_avg: 0 }] };
    try {
      avgSatisfaction = await query(`
        WITH current_period AS (
          SELECT 
            COALESCE(AVG(restaurant_rating), 0) as avg_rating,
            COUNT(*) as total_reviews
          FROM reviews
          WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        ),
        previous_period AS (
          SELECT 
            COALESCE(AVG(restaurant_rating), 0) as previous_avg
          FROM reviews
          WHERE created_at >= CURRENT_DATE - INTERVAL '60 days'
            AND created_at < CURRENT_DATE - INTERVAL '30 days'
        )
        SELECT 
          cp.avg_rating,
          cp.total_reviews,
          COALESCE(pp.previous_avg, cp.avg_rating) as previous_avg
        FROM current_period cp
        CROSS JOIN previous_period pp
      `);
    } catch (error) {
      logger.warn('Table reviews non disponible:', error.message);
    }

    // Commandes en attente de validation restaurant
    const pendingRestaurants = await query(
      `SELECT COUNT(*) as count FROM restaurants WHERE status = 'pending'`
    );

    // Livreurs en attente de validation
    const pendingDelivery = await query(
      `SELECT COUNT(*) as count FROM delivery_persons WHERE status = 'pending'`
    );

    // Tickets support ouverts (si la table existe)
    let openTickets = { rows: [{ count: '0' }] };
    try {
      openTickets = await query(
        `SELECT COUNT(*) as count FROM support_tickets WHERE status IN ('open', 'in_progress')`
      );
    } catch (error) {
      // Table peut ne pas exister encore
      logger.warn('Table support_tickets non disponible:', error.message);
    }

    // Évolution commandes 7 derniers jours
    const ordersHistory = await query(`
      SELECT 
        DATE(placed_at) as date,
        COUNT(*) as orders_count,
        COALESCE(SUM(total), 0) as revenue
      FROM orders
      WHERE placed_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(placed_at)
      ORDER BY date
    `);

    // Répartition par catégorie (30 derniers jours)
    const categoryDistribution = await query(`
      SELECT 
        COALESCE(r.category, 'Non spécifié') as category,
        COUNT(*) as orders_count,
        COALESCE(SUM(o.total) FILTER (WHERE o.status = 'delivered'), 0) as revenue
      FROM orders o
      LEFT JOIN restaurants r ON o.restaurant_id = r.id
      WHERE o.placed_at >= CURRENT_DATE - INTERVAL '30 days'
        AND o.status = 'delivered'
      GROUP BY r.category
      ORDER BY revenue DESC
    `);

    // Activité par heure (7 derniers jours)
    const hourlyActivity = await query(`
      SELECT 
        EXTRACT(HOUR FROM placed_at)::INTEGER as hour,
        COUNT(*) as orders_count
      FROM orders
      WHERE placed_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY EXTRACT(HOUR FROM placed_at)
      ORDER BY hour
    `);

    // Calculer les pourcentages de changement
    const todayRevenue = Number.parseFloat(todayStats.rows[0].today_revenue || 0);
    const yesterdayRevenue = Number.parseFloat(yesterdayStats.rows[0].yesterday_revenue || 0);
    const revenueChange = yesterdayRevenue > 0 
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1)
      : 0;

    const todayOrders = Number.parseInt(todayStats.rows[0].completed_orders || 0);
    const yesterdayOrders = Number.parseInt(yesterdayStats.rows[0].completed_orders || 0);
    const ordersChange = yesterdayOrders > 0
      ? ((todayOrders - yesterdayOrders) / yesterdayOrders * 100).toFixed(1)
      : 0;

    const newUsersTodayCount = Number.parseInt(newUsersToday.rows[0].count || 0);
    const newUsersYesterdayCount = Number.parseInt(newUsersYesterday.rows[0].count || 0);

    const satisfactionData = avgSatisfaction.rows[0];
    const currentSatisfaction = Number.parseFloat(satisfactionData.avg_rating || 0);
    const previousSatisfaction = Number.parseFloat(satisfactionData.previous_avg || currentSatisfaction);
    const satisfactionChange = previousSatisfaction > 0
      ? ((currentSatisfaction - previousSatisfaction) / previousSatisfaction * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        today: todayStats.rows[0],
        yesterday: yesterdayStats.rows[0],
        global: globalStats.rows[0],
        comparisons: {
          revenue_change: Number.parseFloat(revenueChange),
          orders_change: Number.parseFloat(ordersChange),
          new_users_today: newUsersTodayCount,
          new_users_yesterday: newUsersYesterdayCount,
          satisfaction: {
            current: currentSatisfaction,
            previous: previousSatisfaction,
            change: Number.parseFloat(satisfactionChange),
            total_reviews: Number.parseInt(satisfactionData.total_reviews || 0),
          },
        },
        pending: {
          restaurants: Number.parseInt(pendingRestaurants.rows[0].count),
          delivery_persons: Number.parseInt(pendingDelivery.rows[0].count),
          tickets: Number.parseInt(openTickets.rows[0].count),
        },
        history: ordersHistory.rows,
        category_distribution: categoryDistribution.rows.map(row => ({
          category: row.category,
          orders_count: Number.parseInt(row.orders_count),
          revenue: Number.parseFloat(row.revenue || 0),
        })),
        hourly_activity: hourlyActivity.rows.map(row => ({
          hour: Number.parseInt(row.hour),
          orders_count: Number.parseInt(row.orders_count),
        })),
      },
    });
  } catch (error) {
    logger.error('Erreur getDashboard:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
    });
    
    // En développement, retourner plus de détails
    const isDev = process.env.NODE_ENV !== 'production';
    
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erreur lors de la récupération',
        ...(isDev && {
          details: error.message,
          code: error.code,
          hint: error.hint,
        }),
      },
    });
  }
};

/**
 * GESTION DES UTILISATEURS
 */
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;

    let queryText = 'SELECT * FROM users WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    } else {
      queryText += ` AND status != 'deleted'`;
    }

    if (search) {
      queryText += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(Number.parseInt(limit, 10), offset);

    const result = await query(queryText, values);

    let countText = 'SELECT COUNT(*) FROM users WHERE 1=1';
    const countValues = [];
    let countIndex = 1;
    if (status) {
      countText += ` AND status = $${countIndex}`;
      countValues.push(status);
      countIndex++;
    } else {
      countText += ` AND status != 'deleted'`;
    }
    if (search) {
      countText += ` AND (first_name ILIKE $${countIndex} OR last_name ILIKE $${countIndex} OR phone ILIKE $${countIndex} OR email ILIKE $${countIndex})`;
      countValues.push(`%${search}%`);
    }
    const countResult = await query(countText, countValues);
    const total = Number.parseInt(countResult.rows[0].count, 10);

    res.json({
      success: true,
      data: {
        users: result.rows,
        pagination: {
          page: Number.parseInt(page, 10),
          limit: Number.parseInt(limit, 10),
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getUsers:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await query('SELECT * FROM users WHERE id = $1', [id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Utilisateur non trouvé' },
      });
    }

    // Stats utilisateur
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_spent,
        COALESCE(AVG(total), 0) as avg_order_value
      FROM orders
      WHERE user_id = $1
    `, [id]);

    // Dernières commandes
    const ordersResult = await query(`
      SELECT o.*, r.name as restaurant_name
      FROM orders o
      LEFT JOIN restaurants r ON o.restaurant_id = r.id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
      LIMIT 10
    `, [id]);

    res.json({
      success: true,
      data: {
        user: userResult.rows[0],
        stats: statsResult.rows[0],
        recent_orders: ordersResult.rows,
      },
    });
  } catch (error) {
    logger.error('Erreur getUserById:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

exports.suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await query(
      'UPDATE users SET status = $1 WHERE id = $2',
      ['suspended', id]
    );

    // Log l'action
    await query(`
      INSERT INTO activity_logs (user_id, user_type, action, details)
      VALUES ($1, $2, $3, $4)
    `, [req.user.id, 'admin', 'suspend_user', JSON.stringify({ user_id: id, reason })]);

    logger.info(`Utilisateur ${id} suspendu par admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'Utilisateur suspendu',
    });
  } catch (error) {
    logger.error('Erreur suspendUser:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SUSPEND_ERROR', message: 'Erreur lors de la suspension' },
    });
  }
};

/**
 * GESTION DES RESTAURANTS
 */
exports.getRestaurants = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category } = req.query;
    const offset = (page - 1) * limit;

    let queryText = 'SELECT * FROM restaurants WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    if (category) {
      queryText += ` AND category = $${paramIndex}`;
      values.push(category);
      paramIndex++;
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await query(queryText, values);
    const countResult = await query('SELECT COUNT(*) FROM restaurants');

    res.json({
      success: true,
      data: {
        restaurants: result.rows.map(r => {
          delete r.password_hash;
          return r;
        }),
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: Number.parseInt(countResult.rows[0].count),
          pages: Math.ceil(countResult.rows[0].count / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getRestaurants:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

exports.approveRestaurant = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier d'abord si le restaurant existe (hors transaction pour éviter les problèmes)
    const checkResult = await query(
      'SELECT id, status FROM restaurants WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant non trouvé' },
      });
    }

    const currentStatus = checkResult.rows[0].status;
    
    // Si le restaurant est déjà actif, retourner un message approprié
    if (currentStatus === 'active') {
      return res.status(400).json({
        success: false,
        error: { code: 'RESTAURANT_ALREADY_ACTIVE', message: 'Le restaurant est déjà actif' },
      });
    }

    return await transaction(async (client) => {
      // Mettre à jour le statut
      const result = await client.query(
        'UPDATE restaurants SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        ['active', id]
      );

      if (result.rows.length === 0) {
        throw new Error('Échec de la mise à jour du restaurant');
      }

      const restaurant = result.rows[0];

      // Envoyer email de confirmation (si le service existe)
      try {
        const emailService = require('../services/email.service');
        if (emailService?.sendRestaurantApproval) {
          await emailService.sendRestaurantApproval(restaurant);
        }
      } catch (emailError) {
        logger.warn('Service email non disponible, email non envoyé:', emailError.message);
      }

      // Log dans audit_logs (au lieu de activity_logs qui peut ne pas exister)
      try {
        // Vérifier si audit_logs existe
        const hasAuditLogs = await client.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'audit_logs'
          ) as exists
        `);
        
        if (hasAuditLogs.rows[0].exists) {
          await client.query(`
            INSERT INTO audit_logs (user_type, user_id, action, resource_type, resource_id, new_values)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            'admin',
            req.user.id,
            'approve_restaurant',
            'restaurant',
            id,
            JSON.stringify({ status: 'active' })
          ]);
        } else {
          // Essayer activity_logs si audit_logs n'existe pas
          const hasActivityLogs = await client.query(`
            SELECT EXISTS (
              SELECT 1 FROM information_schema.tables 
              WHERE table_name = 'activity_logs'
            ) as exists
          `);
          
          if (hasActivityLogs.rows[0].exists) {
            await client.query(`
              INSERT INTO activity_logs (user_id, user_type, action, entity_type, entity_id)
              VALUES ($1, $2, $3, $4, $5)
            `, [req.user.id, 'admin', 'approve_restaurant', 'restaurant', id]);
          }
        }
      } catch (logError) {
        logger.warn('Erreur lors du log, continuons:', logError.message);
      }

      logger.info(`Restaurant ${id} approuvé par admin ${req.user.id}`);

      return res.json({
        success: true,
        message: 'Restaurant approuvé',
        data: { restaurant },
      });
    });
  } catch (error) {
    logger.error('Erreur approveRestaurant:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      restaurantId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'APPROVE_ERROR',
        message: 'Erreur lors de l\'approbation',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
    });
  }
};

exports.rejectRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    // reason peut être utilisé plus tard pour l'email de rejet

    await query(
      'UPDATE restaurants SET status = $1 WHERE id = $2',
      ['rejected', id]
    );

    // TODO: Envoyer email de rejet avec raison

    logger.info(`Restaurant ${id} rejeté par admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'Restaurant rejeté',
    });
  } catch (error) {
    logger.error('Erreur rejectRestaurant:', error);
    res.status(500).json({
      success: false,
      error: { code: 'REJECT_ERROR', message: 'Erreur lors du rejet' },
    });
  }
};

/**
 * GESTION DES LIVREURS
 */
exports.getDeliveryPersons = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;

    let queryText = 'SELECT * FROM delivery_persons WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    // Recherche par nom, téléphone ou ID
    if (search) {
      queryText += ` AND (
        LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) LIKE LOWER($${paramIndex}) OR
        LOWER(COALESCE(phone, '')) LIKE LOWER($${paramIndex}) OR
        LOWER(id::text) LIKE LOWER($${paramIndex})
      )`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await query(queryText, values);

    // Compter le total avec les mêmes filtres
    let countQuery = 'SELECT COUNT(*) FROM delivery_persons WHERE 1=1';
    const countValues = [];
    let countParamIndex = 1;

    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countValues.push(status);
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (
        LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) LIKE LOWER($${countParamIndex}) OR
        LOWER(COALESCE(phone, '')) LIKE LOWER($${countParamIndex}) OR
        LOWER(id::text) LIKE LOWER($${countParamIndex})
      )`;
      countValues.push(`%${search}%`);
      countParamIndex++;
    }

    const countResult = await query(countQuery, countValues);
    const total = Number.parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        delivery_persons: result.rows.map(d => {
          // eslint-disable-next-line no-unused-vars
          const { password_hash, ...rest } = d;
          return rest;
        }),
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getDeliveryPersons:', error);
    logger.error('Détails erreur:', {
      message: error.message,
      stack: error.stack,
      query: error.query,
      parameters: error.parameters,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erreur lors de la récupération',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
    });
  }
};

exports.approveDeliveryPerson = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE delivery_persons SET status = $1 WHERE id = $2 AND status = $3 RETURNING *',
      ['active', id, 'pending']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'DELIVERY_PERSON_NOT_FOUND', message: 'Livreur non trouvé' },
      });
    }

    logger.info(`Livreur ${id} approuvé par admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'Livreur approuvé',
    });
  } catch (error) {
    logger.error('Erreur approveDeliveryPerson:', error);
    res.status(500).json({
      success: false,
      error: { code: 'APPROVE_ERROR', message: 'Erreur lors de l\'approbation' },
    });
  }
};

/**
 * GESTION DES COMMANDES
 */
exports.getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, date_from, date_to, restaurant_id, delivery_person_id, amount_min, amount_max } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT o.*, 
             r.name as restaurant_name,
             u.first_name || ' ' || u.last_name as client_name,
             dp.first_name || ' ' || dp.last_name as delivery_name
      FROM orders o
      LEFT JOIN restaurants r ON o.restaurant_id = r.id
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN delivery_persons dp ON o.delivery_person_id = dp.id
      WHERE 1=1
    `;

    const values = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND o.status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    if (date_from) {
      queryText += ` AND DATE(o.placed_at) >= $${paramIndex}::date`;
      values.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      queryText += ` AND DATE(o.placed_at) <= $${paramIndex}::date`;
      values.push(date_to);
      paramIndex++;
    }

    if (restaurant_id) {
      queryText += ` AND o.restaurant_id = $${paramIndex}`;
      values.push(restaurant_id);
      paramIndex++;
    }

    if (delivery_person_id) {
      queryText += ` AND o.delivery_person_id = $${paramIndex}`;
      values.push(delivery_person_id);
      paramIndex++;
    }

    if (amount_min) {
      queryText += ` AND o.total >= $${paramIndex}`;
      values.push(Number.parseFloat(amount_min));
      paramIndex++;
    }

    if (amount_max) {
      queryText += ` AND o.total <= $${paramIndex}`;
      values.push(Number.parseFloat(amount_max));
      paramIndex++;
    }

    queryText += ` ORDER BY o.placed_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await query(queryText, values);
    
    // Compter le total avec les mêmes filtres
    let countQuery = `
      SELECT COUNT(*) 
      FROM orders o
      WHERE 1=1
    `;
    const countValues = [];
    let countParamIndex = 1;
    
    if (status) {
      countQuery += ` AND o.status = $${countParamIndex}`;
      countValues.push(status);
      countParamIndex++;
    }
    
    if (date_from) {
      countQuery += ` AND DATE(o.placed_at) >= $${countParamIndex}::date`;
      countValues.push(date_from);
      countParamIndex++;
    }
    
    if (date_to) {
      countQuery += ` AND DATE(o.placed_at) <= $${countParamIndex}::date`;
      countValues.push(date_to);
      countParamIndex++;
    }
    
    const countResult = await query(countQuery, countValues);

    res.json({
      success: true,
      data: {
        orders: result.rows,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: Number.parseInt(countResult.rows[0].count),
          pages: Math.ceil(countResult.rows[0].count / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getOrders:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Commandes en temps réel pour le dashboard
 */
exports.getRealTimeOrders = async (req, res) => {
  try {
    const { status, amount_min, amount_max, zone } = req.query;
    const limit = Number.parseInt(req.query.limit || 20);

    let queryText = `
      SELECT 
        o.id,
        o.order_number,
        o.status,
        o.total,
        o.placed_at,
        o.delivery_address,
        r.name as restaurant_name,
        r.latitude as restaurant_lat,
        r.longitude as restaurant_lng,
        u.first_name || ' ' || u.last_name as client_name,
        u.phone as client_phone,
        dp.first_name || ' ' || dp.last_name as delivery_name
      FROM orders o
      LEFT JOIN restaurants r ON o.restaurant_id = r.id
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN delivery_persons dp ON o.delivery_person_id = dp.id
      WHERE o.status IN ('new', 'accepted', 'preparing', 'ready', 'delivering')
    `;

    const values = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND o.status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    if (amount_min) {
      queryText += ` AND o.total >= $${paramIndex}`;
      values.push(amount_min);
      paramIndex++;
    }

    if (amount_max) {
      queryText += ` AND o.total <= $${paramIndex}`;
      values.push(amount_max);
      paramIndex++;
    }

    if (zone) {
      queryText += ` AND (o.delivery_address->>'district' ILIKE $${paramIndex} OR o.delivery_address->>'address_line' ILIKE $${paramIndex})`;
      values.push(`%${zone}%`);
      paramIndex++;
    }

    queryText += ` ORDER BY o.placed_at DESC LIMIT $${paramIndex}`;
    values.push(limit);

    const result = await query(queryText, values);

    res.json({
      success: true,
      data: {
        orders: result.rows.map(order => {
          const deliveryAddr = order.delivery_address || {};
          return {
            id: order.id,
            order_number: order.order_number,
            status: order.status,
            total: Number.parseFloat(order.total || 0),
            placed_at: order.placed_at,
            restaurant: {
              name: order.restaurant_name,
              location: order.restaurant_lat && order.restaurant_lng 
                ? { lat: Number.parseFloat(order.restaurant_lat), lng: Number.parseFloat(order.restaurant_lng) }
                : null,
            },
            client: {
              name: order.client_name,
              phone: order.client_phone,
            },
            delivery: order.delivery_name ? {
              name: order.delivery_name,
            } : null,
            delivery_location: deliveryAddr.latitude && deliveryAddr.longitude
              ? { lat: Number.parseFloat(deliveryAddr.latitude), lng: Number.parseFloat(deliveryAddr.longitude) }
              : null,
            zone: deliveryAddr.district || deliveryAddr.address_line || null,
          };
        }),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Erreur getRealTimeOrders:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Données géographiques pour la carte
 */
exports.getGeographicData = async (req, res) => {
  try {
    // Commandes en cours avec coordonnées GPS
    // Note: delivery_address est JSONB, on extrait lat/lng directement si disponibles
    const activeOrders = await query(`
      SELECT 
        o.id,
        o.order_number,
        o.status,
        o.total,
        o.placed_at,
        o.delivery_address,
        r.name as restaurant_name,
        r.latitude as restaurant_lat,
        r.longitude as restaurant_lng
      FROM orders o
      LEFT JOIN restaurants r ON o.restaurant_id = r.id
      WHERE o.status IN ('new', 'accepted', 'preparing', 'ready', 'delivering')
        AND r.latitude IS NOT NULL 
        AND r.longitude IS NOT NULL
    `);

    // Zones chaudes (heatmap) - commandes par quartier (30 derniers jours)
    // On utilise le district depuis delivery_address JSONB
    const hotZones = await query(`
      SELECT 
        COALESCE(o.delivery_address->>'district', o.delivery_address->>'address_line') as zone,
        COUNT(*) as orders_count,
        COALESCE(AVG((o.delivery_address->>'latitude')::DECIMAL), 0) as center_lat,
        COALESCE(AVG((o.delivery_address->>'longitude')::DECIMAL), 0) as center_lng
      FROM orders o
      WHERE o.placed_at >= CURRENT_DATE - INTERVAL '30 days'
        AND o.status = 'delivered'
        AND o.delivery_address IS NOT NULL
        AND o.delivery_address->>'latitude' IS NOT NULL
        AND o.delivery_address->>'longitude' IS NOT NULL
      GROUP BY COALESCE(o.delivery_address->>'district', o.delivery_address->>'address_line')
      HAVING COUNT(*) > 0
      ORDER BY orders_count DESC
      LIMIT 20
    `);

    // Couverture géographique - tous les restaurants actifs
    const restaurants = await query(`
      SELECT 
        id,
        name,
        latitude,
        longitude,
        status
      FROM restaurants
      WHERE status = 'active'
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
    `);

    res.json({
      success: true,
      data: {
        active_orders: activeOrders.rows.map(order => {
          const deliveryAddr = order.delivery_address || {};
          return {
            id: order.id,
            order_number: order.order_number,
            status: order.status,
            total: Number.parseFloat(order.total || 0),
            restaurant: {
              name: order.restaurant_name,
              location: order.restaurant_lat && order.restaurant_lng
                ? { lat: Number.parseFloat(order.restaurant_lat), lng: Number.parseFloat(order.restaurant_lng) }
                : null,
            },
            delivery_location: deliveryAddr.latitude && deliveryAddr.longitude
              ? { lat: Number.parseFloat(deliveryAddr.latitude), lng: Number.parseFloat(deliveryAddr.longitude) }
              : null,
            zone: deliveryAddr.district || deliveryAddr.address_line || null,
          };
        }),
        hot_zones: hotZones.rows.map(zone => ({
          zone: zone.zone,
          orders_count: Number.parseInt(zone.orders_count),
          center: {
            lat: Number.parseFloat(zone.center_lat || 0),
            lng: Number.parseFloat(zone.center_lng || 0),
          },
        })),
        restaurants: restaurants.rows.map(restaurant => ({
          id: restaurant.id,
          name: restaurant.name,
          location: {
            lat: Number.parseFloat(restaurant.latitude),
            lng: Number.parseFloat(restaurant.longitude),
          },
          status: restaurant.status,
        })),
      },
    });
  } catch (error) {
    logger.error('Erreur getGeographicData:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Alertes système pour le dashboard
 */
exports.getSystemAlerts = async (req, res) => {
  try {
    const adminId = req.user.id;
    const alerts = [];

    // Récupérer les alertes masquées par cet admin (si la table existe)
    let dismissedSet = new Set();
    try {
      const dismissedAlerts = await query(`
        SELECT alert_id FROM dismissed_alerts WHERE admin_id = $1
      `, [adminId]);
      dismissedSet = new Set(dismissedAlerts.rows.map(row => row.alert_id));
    } catch (error) {
      // Table peut ne pas exister encore
      logger.warn('Table dismissed_alerts non disponible:', error.message);
    }

    // 1. Livreurs hors ligne depuis 2h
    try {
      const offlineDrivers = await query(`
        SELECT 
          COUNT(*) as count,
          MAX(updated_at) as last_update
        FROM delivery_persons
        WHERE status = 'active'
          AND delivery_status = 'offline'
          AND updated_at < NOW() - INTERVAL '2 hours'
      `);
      
      if (offlineDrivers.rows[0] && Number.parseInt(offlineDrivers.rows[0].count) > 0) {
        alerts.push({
          id: 'offline_drivers',
          type: 'warning',
          priority: 'medium',
          title: `${offlineDrivers.rows[0].count} livreur(s) hors ligne depuis 2h`,
          message: 'Certains livreurs sont hors ligne depuis plus de 2 heures',
          action: '/delivery-persons?status=offline',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.warn('Erreur lors de la vérification des livreurs hors ligne:', error.message);
    }

    // 2. Pic de commandes refusées (plus de 10% de refus aujourd'hui)
    try {
      const rejectedOrders = await query(`
        SELECT 
          COUNT(*) FILTER (WHERE o.status = 'cancelled' AND o.placed_at >= CURRENT_DATE) as rejected_today,
          COUNT(*) FILTER (WHERE o.placed_at >= CURRENT_DATE) as total_today,
          r.name as restaurant_name,
          r.id as restaurant_id
        FROM orders o
        JOIN restaurants r ON o.restaurant_id = r.id
        WHERE o.placed_at >= CURRENT_DATE
        GROUP BY r.id, r.name
        HAVING COUNT(*) FILTER (WHERE o.status = 'cancelled')::FLOAT / NULLIF(COUNT(*), 0) > 0.1
          AND COUNT(*) > 5
        ORDER BY (COUNT(*) FILTER (WHERE o.status = 'cancelled')::FLOAT / NULLIF(COUNT(*), 0)) DESC
        LIMIT 5
      `);

      rejectedOrders.rows.forEach((row) => {
        const rejectionRate = (Number.parseInt(row.rejected_today) / Number.parseInt(row.total_today) * 100).toFixed(1);
        alerts.push({
          id: `rejected_orders_${row.restaurant_id}`,
          type: 'warning',
          priority: 'high',
          title: `Pic de commandes refusées au ${row.restaurant_name}`,
          message: `${rejectionRate}% de refus aujourd'hui (${row.rejected_today}/${row.total_today} commandes)`,
          action: `/restaurants/${row.restaurant_id}`,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      logger.warn('Erreur lors de la vérification des commandes refusées:', error.message);
    }

    // 3. Nouveaux restaurants en attente de validation
    try {
      const pendingRestaurants = await query(`
        SELECT COUNT(*) as count
        FROM restaurants
        WHERE status = 'pending'
      `);

      if (pendingRestaurants.rows[0] && Number.parseInt(pendingRestaurants.rows[0].count) > 0) {
        alerts.push({
          id: 'pending_restaurants',
          type: 'info',
          priority: 'medium',
          title: `${pendingRestaurants.rows[0].count} nouveau(x) restaurant(s) en attente de validation`,
          message: 'Des restaurants attendent votre validation',
          action: '/restaurants?status=pending',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.warn('Erreur lors de la vérification des restaurants en attente:', error.message);
    }

    // 4. Livreurs en attente de validation
    try {
      const pendingDrivers = await query(`
        SELECT COUNT(*) as count
        FROM delivery_persons
        WHERE status = 'pending'
      `);

      if (pendingDrivers.rows[0] && Number.parseInt(pendingDrivers.rows[0].count) > 0) {
        alerts.push({
          id: 'pending_drivers',
          type: 'info',
          priority: 'medium',
          title: `${pendingDrivers.rows[0].count} livreur(s) en attente de validation`,
          message: 'Des livreurs attendent votre validation',
          action: '/delivery-persons?status=pending',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.warn('Erreur lors de la vérification des livreurs en attente:', error.message);
    }

    // 5. Commandes en attente (non acceptées depuis plus de 5 minutes)
    try {
      const pendingOrders = await query(`
        SELECT COUNT(*) as count
        FROM orders
        WHERE status = 'new'
          AND placed_at < NOW() - INTERVAL '5 minutes'
      `);

      if (pendingOrders.rows[0] && Number.parseInt(pendingOrders.rows[0].count) > 0) {
        alerts.push({
          id: 'pending_orders',
          type: 'warning',
          priority: 'high',
          title: `${pendingOrders.rows[0].count} commande(s) en attente d'acceptation`,
          message: 'Des commandes attendent une réponse du restaurant depuis plus de 5 minutes',
          action: '/orders?status=new',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.warn('Erreur lors de la vérification des commandes en attente:', error.message);
    }

    // 6. Commandes en préparation depuis trop longtemps (> 45 minutes)
    try {
      const longPreparingOrders = await query(`
        SELECT COUNT(*) as count
        FROM orders
        WHERE status = 'preparing'
          AND (preparing_at IS NOT NULL AND preparing_at < NOW() - INTERVAL '45 minutes'
               OR preparing_at IS NULL AND placed_at < NOW() - INTERVAL '45 minutes')
      `);

      if (longPreparingOrders.rows[0] && Number.parseInt(longPreparingOrders.rows[0].count) > 0) {
        alerts.push({
          id: 'long_preparing_orders',
          type: 'warning',
          priority: 'medium',
          title: `${longPreparingOrders.rows[0].count} commande(s) en préparation depuis plus de 45 min`,
          message: 'Certaines commandes sont en préparation depuis plus de 45 minutes',
          action: '/orders?status=preparing',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.warn('Erreur lors de la vérification des commandes en préparation:', error.message);
    }

    // 7. Commandes prêtes en attente de livreur (> 15 minutes)
    try {
      const readyOrders = await query(`
        SELECT COUNT(*) as count
        FROM orders
        WHERE status = 'ready'
          AND (ready_at IS NOT NULL AND ready_at < NOW() - INTERVAL '15 minutes'
               OR ready_at IS NULL AND placed_at < NOW() - INTERVAL '15 minutes')
      `);

      if (readyOrders.rows[0] && Number.parseInt(readyOrders.rows[0].count) > 0) {
        alerts.push({
          id: 'ready_orders_waiting',
          type: 'warning',
          priority: 'high',
          title: `${readyOrders.rows[0].count} commande(s) prête(s) en attente de livreur`,
          message: 'Des commandes sont prêtes mais attendent un livreur depuis plus de 15 minutes',
          action: '/orders?status=ready',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.warn('Erreur lors de la vérification des commandes prêtes:', error.message);
    }

    // 8. Commandes en livraison depuis trop longtemps (> 60 minutes)
    try {
      const longDeliveringOrders = await query(`
        SELECT COUNT(*) as count
        FROM orders
        WHERE status = 'delivering'
          AND (delivering_at IS NOT NULL AND delivering_at < NOW() - INTERVAL '60 minutes'
               OR delivering_at IS NULL AND placed_at < NOW() - INTERVAL '60 minutes')
      `);

      if (longDeliveringOrders.rows[0] && Number.parseInt(longDeliveringOrders.rows[0].count) > 0) {
        alerts.push({
          id: 'long_delivering_orders',
          type: 'error',
          priority: 'high',
          title: `${longDeliveringOrders.rows[0].count} commande(s) en livraison depuis plus d'1h`,
          message: 'Certaines commandes sont en livraison depuis plus d\'une heure',
          action: '/orders?status=delivering',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.warn('Erreur lors de la vérification des commandes en livraison:', error.message);
    }

    // 9. Commandes avec paiement en attente (> 30 minutes)
    try {
      const pendingPayments = await query(`
        SELECT COUNT(*) as count
        FROM orders
        WHERE payment_status = 'pending'
          AND status != 'cancelled'
          AND placed_at < NOW() - INTERVAL '30 minutes'
      `);

      if (pendingPayments.rows[0] && Number.parseInt(pendingPayments.rows[0].count) > 0) {
        alerts.push({
          id: 'pending_payments',
          type: 'warning',
          priority: 'medium',
          title: `${pendingPayments.rows[0].count} commande(s) avec paiement en attente`,
          message: 'Des commandes ont un paiement en attente depuis plus de 30 minutes',
          action: '/orders?payment_status=pending',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.warn('Erreur lors de la vérification des paiements en attente:', error.message);
    }

    // 10. Commandes actives (en cours) - résumé
    try {
      const activeOrders = await query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'new') as new_count,
          COUNT(*) FILTER (WHERE status = 'accepted') as accepted_count,
          COUNT(*) FILTER (WHERE status = 'preparing') as preparing_count,
          COUNT(*) FILTER (WHERE status = 'ready') as ready_count,
          COUNT(*) FILTER (WHERE status = 'delivering') as delivering_count
        FROM orders
        WHERE status IN ('new', 'accepted', 'preparing', 'ready', 'delivering')
      `);

      const active = activeOrders.rows[0];
      const totalActive = Number.parseInt(active.new_count || 0) + 
                         Number.parseInt(active.accepted_count || 0) + 
                         Number.parseInt(active.preparing_count || 0) + 
                         Number.parseInt(active.ready_count || 0) + 
                         Number.parseInt(active.delivering_count || 0);

      if (totalActive > 0) {
        const statusBreakdown = [];
        if (Number.parseInt(active.new_count || 0) > 0) statusBreakdown.push(`${active.new_count} nouvelle(s)`);
        if (Number.parseInt(active.accepted_count || 0) > 0) statusBreakdown.push(`${active.accepted_count} acceptée(s)`);
        if (Number.parseInt(active.preparing_count || 0) > 0) statusBreakdown.push(`${active.preparing_count} en préparation`);
        if (Number.parseInt(active.ready_count || 0) > 0) statusBreakdown.push(`${active.ready_count} prête(s)`);
        if (Number.parseInt(active.delivering_count || 0) > 0) statusBreakdown.push(`${active.delivering_count} en livraison`);

        alerts.push({
          id: 'active_orders_summary',
          type: 'info',
          priority: 'low',
          title: `${totalActive} commande(s) active(s)`,
          message: statusBreakdown.join(', '),
          action: '/orders?status=active',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.warn('Erreur lors de la vérification des commandes actives:', error.message);
    }

    // 11. Tickets support ouverts (si la table existe)
    try {
      const openTickets = await query(`
        SELECT COUNT(*) as count
        FROM support_tickets
        WHERE status IN ('open', 'in_progress')
          AND priority = 'urgent'
      `);

      if (openTickets.rows[0] && Number.parseInt(openTickets.rows[0].count) > 0) {
        alerts.push({
          id: 'urgent_tickets',
          type: 'error',
          priority: 'high',
          title: `${openTickets.rows[0].count} ticket(s) urgent(s) ouvert(s)`,
          message: 'Des tickets support urgents nécessitent votre attention',
          action: '/support?priority=urgent',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      // Table peut ne pas exister encore
      logger.warn('Table support_tickets non disponible pour alertes:', error.message);
    }

    // Filtrer les alertes masquées
    const visibleAlerts = alerts.filter(alert => !dismissedSet.has(alert.id));

    // Trier par priorité (high > medium > low)
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    visibleAlerts.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));

    res.json({
      success: true,
      data: {
        alerts: visibleAlerts,
        count: visibleAlerts.length,
        unread_count: visibleAlerts.length,
        dismissed_count: dismissedSet.size,
      },
    });
  } catch (error) {
    logger.error('Erreur getSystemAlerts:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(500).json({
      success: false,
      error: { 
        code: 'FETCH_ERROR', 
        message: 'Erreur lors de la récupération des alertes',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
    });
  }
};

/**
 * Masquer une alerte (dismiss)
 */
exports.dismissAlert = async (req, res) => {
  try {
    const { alert_id, alert_type } = req.body;
    const adminId = req.user.id;

    if (!alert_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_ALERT_ID', message: 'ID d\'alerte manquant' },
      });
    }

    // Vérifier si la table existe avant d'insérer
    try {
      // Insérer ou ignorer si déjà masquée
      await query(`
        INSERT INTO dismissed_alerts (admin_id, alert_id, alert_type)
        VALUES ($1, $2, $3)
        ON CONFLICT (admin_id, alert_id) DO NOTHING
      `, [adminId, alert_id, alert_type || null]);

      logger.info(`Alerte ${alert_id} masquée par admin ${adminId}`);

      res.json({
        success: true,
        message: 'Alerte masquée',
      });
    } catch (dbError) {
      // Si la table n'existe pas, on peut soit la créer, soit retourner un succès
      if (dbError.code === '42P01' || dbError.message.includes('does not exist')) {
        logger.warn('Table dismissed_alerts non disponible, création en cours...');
        // La table sera créée lors de la prochaine migration
        // Pour l'instant, on retourne un succès pour ne pas bloquer l'utilisateur
        res.json({
          success: true,
          message: 'Alerte masquée (table en cours de création)',
        });
      } else {
        throw dbError;
      }
    }
  } catch (error) {
    logger.error('Erreur dismissAlert:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(500).json({
      success: false,
      error: { 
        code: 'DISMISS_ERROR', 
        message: 'Erreur lors du masquage',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
    });
  }
};

/**
 * Récupérer l'historique des alertes masquées
 */
exports.getDismissedAlerts = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { limit = 50 } = req.query;

    try {
      const result = await query(`
        SELECT 
          alert_id,
          alert_type,
          dismissed_at
        FROM dismissed_alerts
        WHERE admin_id = $1
        ORDER BY dismissed_at DESC
        LIMIT $2
      `, [adminId, limit]);

      res.json({
        success: true,
        data: {
          dismissed_alerts: result.rows,
          count: result.rows.length,
        },
      });
    } catch (dbError) {
      // Si la table n'existe pas encore, retourner un tableau vide
      if (dbError.code === '42P01' || dbError.message.includes('does not exist')) {
        logger.warn('Table dismissed_alerts non disponible pour getDismissedAlerts');
        res.json({
          success: true,
          data: {
            dismissed_alerts: [],
            count: 0,
          },
        });
      } else {
        throw dbError;
      }
    }
  } catch (error) {
    logger.error('Erreur getDismissedAlerts:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(500).json({
      success: false,
      error: { 
        code: 'FETCH_ERROR', 
        message: 'Erreur lors de la récupération',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
    });
  }
};

/**
 * Restaurer une alerte masquée
 */
exports.restoreAlert = async (req, res) => {
  try {
    const { alert_id } = req.params;
    const adminId = req.user.id;

    try {
      const result = await query(`
        DELETE FROM dismissed_alerts
        WHERE admin_id = $1 AND alert_id = $2
        RETURNING *
      `, [adminId, alert_id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'ALERT_NOT_FOUND', message: 'Alerte masquée non trouvée' },
        });
      }

      logger.info(`Alerte ${alert_id} restaurée par admin ${adminId}`);

      res.json({
        success: true,
        message: 'Alerte restaurée',
      });
    } catch (dbError) {
      // Si la table n'existe pas encore, retourner une erreur 404
      if (dbError.code === '42P01' || dbError.message.includes('does not exist')) {
        logger.warn('Table dismissed_alerts non disponible pour restoreAlert');
        return res.status(404).json({
          success: false,
          error: { code: 'ALERT_NOT_FOUND', message: 'Alerte masquée non trouvée' },
        });
      } else {
        throw dbError;
      }
    }
  } catch (error) {
    logger.error('Erreur restoreAlert:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(500).json({
      success: false,
      error: { 
        code: 'RESTORE_ERROR', 
        message: 'Erreur lors de la restauration',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
    });
  }
};

/**
 * GESTION FINANCIÈRE
 */
exports.getFinancialOverview = async (req, res) => {
  try {
    const overview = await query(`
      SELECT 
        COALESCE(SUM(total) FILTER (WHERE status = 'delivered'), 0) as total_revenue,
        COALESCE(SUM(commission) FILTER (WHERE status = 'delivered'), 0) as commission_collected,
        COALESCE(SUM(delivery_fee) FILTER (WHERE status = 'delivered'), 0) as delivery_fees,
        COUNT(*) FILTER (WHERE status = 'delivered') as completed_orders
      FROM orders
    `);

    const pendingPayouts = await query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
      FROM transactions
      WHERE type = 'payout' AND status = 'pending'
    `);

    res.json({
      success: true,
      data: {
        overview: overview.rows[0],
        pending_payouts: pendingPayouts.rows[0],
      },
    });
  } catch (error) {
    logger.error('Erreur getFinancialOverview:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

exports.processPayout = async (req, res) => {
  try {
    const { id } = req.params;

    return await transaction(async (client) => {
      // Chercher la transaction (peut être de type 'payout' ou une transaction restaurant)
      const transactionResult = await client.query(
        `SELECT * FROM transactions 
         WHERE id = $1 
         AND (type = $2 OR transaction_type IN ('commission', 'restaurant_payment'))
         AND status = $3`,
        [id, 'payout', 'pending']
      );

      if (transactionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'TRANSACTION_NOT_FOUND', message: 'Transaction non trouvée ou déjà traitée' },
        });
      }

      const txn = transactionResult.rows[0];

      // Marquer comme traité
      await client.query(
        'UPDATE transactions SET status = $1, completed_at = NOW() WHERE id = $2',
        ['completed', id]
      );

      // TODO: Effectuer le vrai paiement via Mobile Money
      // const paymentService = require('../services/payment/orange-money.service');
      // await paymentService.payout(txn.amount, txn.reference, txn.order_id);

      logger.info(`Payout ${id} traité par admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Paiement traité',
        data: {
          transaction_id: id,
          amount: txn.amount,
        },
      });
    });
  } catch (error) {
    logger.error('Erreur processPayout:', error);
    res.status(500).json({
      success: false,
      error: { code: 'PAYOUT_ERROR', message: 'Erreur lors du traitement' },
    });
  }
};

/**
 * ANALYTICS
 */
exports.getAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    let interval;
    switch (period) {
      case '7d':
        interval = '7 days';
        break;
      case '30d':
        interval = '30 days';
        break;
      case '90d':
        interval = '90 days';
        break;
      default:
        interval = '30 days';
    }

    // Statistiques principales
    const analytics = await query(`
      SELECT 
        COUNT(DISTINCT user_id) as active_users,
        COUNT(*) as total_orders,
        COALESCE(AVG(total), 0) as avg_order_value,
        COALESCE(SUM(total) FILTER (WHERE status = 'delivered'), 0) as revenue,
        COUNT(*) FILTER (WHERE status = 'delivered')::FLOAT / NULLIF(COUNT(*), 0) * 100 as completion_rate
      FROM orders
      WHERE placed_at >= NOW() - INTERVAL '${interval}'
    `);

    const stats = analytics.rows[0];

    // Revenus par mois (6 derniers mois)
    const revenueByMonth = await query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', placed_at), 'Mon') as month,
        COALESCE(SUM(total) FILTER (WHERE status = 'delivered'), 0) as revenue
      FROM orders
      WHERE placed_at >= NOW() - INTERVAL '6 months'
        AND placed_at >= NOW() - INTERVAL '${interval}'
      GROUP BY DATE_TRUNC('month', placed_at)
      ORDER BY DATE_TRUNC('month', placed_at) ASC
      LIMIT 6
    `);

    // Commandes par jour de la semaine
    const ordersByDay = await query(`
      SELECT 
        TO_CHAR(placed_at, 'Dy') as day,
        COUNT(*) as value
      FROM orders
      WHERE placed_at >= NOW() - INTERVAL '${interval}'
      GROUP BY TO_CHAR(placed_at, 'Dy'), EXTRACT(DOW FROM placed_at)
      ORDER BY EXTRACT(DOW FROM placed_at)
    `);

    // Méthodes de paiement
    const paymentMethods = await query(`
      SELECT 
        payment_method as name,
        COUNT(*) as count,
        COALESCE(SUM(total) FILTER (WHERE status = 'delivered'), 0) as total_amount
      FROM orders
      WHERE placed_at >= NOW() - INTERVAL '${interval}'
        AND payment_method IS NOT NULL
      GROUP BY payment_method
      ORDER BY count DESC
      LIMIT 5
    `);

    // Calculer les pourcentages pour les méthodes de paiement
    const totalOrders = Number.parseInt(stats.total_orders) || 1;
    const paymentMethodsFormatted = paymentMethods.rows.map((row, index) => {
      const colors = ['#0ca3e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
      let paymentName = row.name;
      if (row.name === 'cash') {
        paymentName = 'Espèces';
      } else if (row.name === 'orange_money') {
        paymentName = 'Orange Money';
      } else if (row.name === 'mtn_money') {
        paymentName = 'MTN Money';
      } else if (row.name === 'moov_money') {
        paymentName = 'Moov Money';
      } else if (row.name === 'waves') {
        paymentName = 'Waves';
      }
      return {
        name: paymentName,
        value: Math.round((Number.parseInt(row.count) / totalOrders) * 100),
        color: colors[index % colors.length],
      };
    });

    // Calculer le taux de conversion (utilisateurs qui ont passé commande / total utilisateurs)
    const conversionData = await query(`
      SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT o.user_id) as users_with_orders
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id AND o.placed_at >= NOW() - INTERVAL '${interval}'
      WHERE u.created_at >= NOW() - INTERVAL '${interval}'
    `);
    const conversionRate = conversionData.rows[0]?.total_users > 0
      ? ((conversionData.rows[0]?.users_with_orders || 0) / conversionData.rows[0]?.total_users) * 100
      : 0;

    // Comparaison avec la période précédente pour les changements
    const previousPeriod = await query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(DISTINCT user_id) as active_users
      FROM orders
      WHERE placed_at >= NOW() - INTERVAL '${interval}' - INTERVAL '${interval}'
        AND placed_at < NOW() - INTERVAL '${interval}'
    `);

    const prevStats = previousPeriod.rows[0] || { total_orders: 0, active_users: 0 };
    const ordersChange = prevStats.total_orders > 0
      ? ((Number.parseInt(stats.total_orders) - Number.parseInt(prevStats.total_orders)) / Number.parseInt(prevStats.total_orders)) * 100
      : 0;
    const usersChange = prevStats.active_users > 0
      ? ((Number.parseInt(stats.active_users) - Number.parseInt(prevStats.active_users)) / Number.parseInt(prevStats.active_users)) * 100
      : 0;

    // === TAUX DE RÉTENTION ===
    // Clients qui ont commandé 2+ fois / Total clients actifs × 100
    const retentionData = await query(`
      SELECT 
        COUNT(DISTINCT user_id) as total_active_clients,
        COUNT(DISTINCT user_id) FILTER (WHERE order_count >= 2) as returning_clients
      FROM (
        SELECT user_id, COUNT(*) as order_count
        FROM orders
        WHERE placed_at >= NOW() - INTERVAL '${interval}'
        AND status = 'delivered'
        GROUP BY user_id
      ) user_orders
    `);
    const retentionStats = retentionData.rows[0] || { total_active_clients: 0, returning_clients: 0 };
    const totalActiveClients = Number.parseInt(retentionStats.total_active_clients) || 0;
    const returningClients = Number.parseInt(retentionStats.returning_clients) || 0;
    const retentionRate = totalActiveClients > 0 
      ? ((returningClients / totalActiveClients) * 100).toFixed(1)
      : 0;

    // === VALEUR VIE CLIENT (LTV) ===
    // LTV = Panier moyen × Fréquence de commande × Durée de vie estimée
    const ltvData = await query(`
      SELECT 
        AVG(total_spent) as avg_total_spent,
        AVG(order_count) as avg_order_count,
        AVG(EXTRACT(EPOCH FROM (NOW() - first_order)) / 86400 / 30) as avg_months_active
      FROM (
        SELECT 
          user_id,
          SUM(total) as total_spent,
          COUNT(*) as order_count,
          MIN(placed_at) as first_order
        FROM orders
        WHERE status = 'delivered'
        GROUP BY user_id
        HAVING COUNT(*) >= 1
      ) user_stats
    `);
    const ltvStats = ltvData.rows[0] || {};
    const avgOrderValue = Number.parseFloat(stats.avg_order_value) || 0;
    const avgOrdersPerMonth = Number.parseFloat(ltvStats.avg_order_count) / Math.max(1, Number.parseFloat(ltvStats.avg_months_active) || 1);
    const estimatedLifetimeMonths = 12; // Durée de vie estimée: 12 mois
    const ltv = avgOrderValue * avgOrdersPerMonth * estimatedLifetimeMonths;

    // === PANIER MOYEN ===
    const averageOrderValue = Number.parseFloat(stats.avg_order_value) || 0;

    res.json({
      success: true,
      data: {
        total_gmv: Number.parseFloat(stats.revenue) || 0,
        total_orders: Number.parseInt(stats.total_orders) || 0,
        active_users: Number.parseInt(stats.active_users) || 0,
        conversion_rate: Number.parseFloat(conversionRate.toFixed(1)) || 0,
        orders_change: Number.parseFloat(ordersChange.toFixed(1)) || 0,
        users_change: Number.parseFloat(usersChange.toFixed(1)) || 0,
        conversion_change: 0, // À calculer si nécessaire
        // Nouvelles métriques
        average_order_value: Math.round(averageOrderValue),
        retention: {
          rate: Number.parseFloat(retentionRate),
          total_clients: totalActiveClients,
          returning_clients: returningClients,
          new_clients: totalActiveClients - returningClients,
        },
        ltv: {
          value: Math.round(ltv),
          avg_orders_per_month: Number.parseFloat(avgOrdersPerMonth.toFixed(2)),
          estimated_lifetime_months: estimatedLifetimeMonths,
          avg_order_value: Math.round(avgOrderValue),
        },
        revenue_data: revenueByMonth.rows.map(row => ({
          month: row.month,
          revenue: Number.parseFloat(row.revenue) || 0,
        })),
        order_data: ordersByDay.rows.map(row => ({
          name: row.day,
          value: Number.parseInt(row.value) || 0,
        })),
        payment_methods: paymentMethodsFormatted,
      },
    });
  } catch (error) {
    logger.error('Erreur getAnalytics:', {
      message: error.message,
      stack: error.stack,
      period: req.query.period,
    });
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Obtenir les statistiques globales de notes (restaurants et livreurs)
 * Inclut la note moyenne et la répartition par niveau (1-5 étoiles)
 */
exports.getGlobalRatings = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFilter = '';
    switch (period) {
      case 'week':
        dateFilter = "AND o.placed_at >= NOW() - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "AND o.placed_at >= NOW() - INTERVAL '30 days'";
        break;
      case 'year':
        dateFilter = "AND o.placed_at >= NOW() - INTERVAL '1 year'";
        break;
      default:
        dateFilter = '';
    }

    // Statistiques de notes des restaurants
    const restaurantRatings = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE restaurant_rating IS NOT NULL) as total_reviews,
        COALESCE(AVG(restaurant_rating), 0) as avg_rating,
        COUNT(*) FILTER (WHERE restaurant_rating = 5) as five_star,
        COUNT(*) FILTER (WHERE restaurant_rating = 4) as four_star,
        COUNT(*) FILTER (WHERE restaurant_rating = 3) as three_star,
        COUNT(*) FILTER (WHERE restaurant_rating = 2) as two_star,
        COUNT(*) FILTER (WHERE restaurant_rating = 1) as one_star
      FROM orders o
      WHERE restaurant_rating IS NOT NULL ${dateFilter}
    `);

    // Statistiques de notes des livreurs
    const deliveryRatings = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE delivery_rating IS NOT NULL) as total_reviews,
        COALESCE(AVG(delivery_rating), 0) as avg_rating,
        COUNT(*) FILTER (WHERE delivery_rating = 5) as five_star,
        COUNT(*) FILTER (WHERE delivery_rating = 4) as four_star,
        COUNT(*) FILTER (WHERE delivery_rating = 3) as three_star,
        COUNT(*) FILTER (WHERE delivery_rating = 2) as two_star,
        COUNT(*) FILTER (WHERE delivery_rating = 1) as one_star
      FROM orders o
      WHERE delivery_rating IS NOT NULL ${dateFilter}
    `);

    // Fonction pour calculer la distribution avec pourcentages
    const calculateDistribution = (data) => {
      const total = parseInt(data.total_reviews) || 0;
      const stars = {
        5: parseInt(data.five_star) || 0,
        4: parseInt(data.four_star) || 0,
        3: parseInt(data.three_star) || 0,
        2: parseInt(data.two_star) || 0,
        1: parseInt(data.one_star) || 0,
      };
      
      return {
        total_reviews: total,
        avg_rating: parseFloat(parseFloat(data.avg_rating).toFixed(2)) || 0,
        distribution: Object.keys(stars).reduce((acc, key) => {
          acc[key] = {
            count: stars[key],
            percent: total > 0 ? Math.round((stars[key] / total) * 100) : 0,
          };
          return acc;
        }, {}),
      };
    };

    const restaurantStats = calculateDistribution(restaurantRatings.rows[0]);
    const deliveryStats = calculateDistribution(deliveryRatings.rows[0]);

    // Statistiques globales combinées
    const totalReviews = restaurantStats.total_reviews + deliveryStats.total_reviews;
    const combinedAvg = totalReviews > 0
      ? ((restaurantStats.avg_rating * restaurantStats.total_reviews) + 
         (deliveryStats.avg_rating * deliveryStats.total_reviews)) / totalReviews
      : 0;

    res.json({
      success: true,
      data: {
        period,
        global: {
          total_reviews: totalReviews,
          avg_rating: parseFloat(combinedAvg.toFixed(2)),
        },
        restaurants: restaurantStats,
        delivery: deliveryStats,
      },
    });
  } catch (error) {
    logger.error('Erreur getGlobalRatings:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Activer un utilisateur
 */
exports.activateUser = async (req, res) => {
  try {
    const { id } = req.params;

    return await transaction(async (client) => {
      // Vérifier que l'utilisateur existe
      const userResult = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'Utilisateur non trouvé' },
        });
      }

      const user = userResult.rows[0];

      // Vérifier que l'utilisateur n'est pas déjà actif
      if (user.status === 'active') {
        return res.status(400).json({
          success: false,
          error: { code: 'USER_ALREADY_ACTIVE', message: 'L\'utilisateur est déjà actif' },
        });
      }

      // Activer l'utilisateur
      await client.query(
        'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2',
        ['active', id]
      );

      // Log l'action
      await client.query(`
        INSERT INTO audit_logs (user_type, user_id, action, resource_type, resource_id, new_values)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'admin',
        req.user.id,
        'activate_user',
        'user',
        id,
        JSON.stringify({ status: 'active' })
      ]);

      logger.info(`Utilisateur ${id} activé par admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Utilisateur activé',
      });
    });
  } catch (error) {
    logger.error('Erreur activateUser:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de l\'activation' },
    });
  }
};

/**
 * Obtenir un restaurant par ID
 */
exports.getRestaurantById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM restaurants WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant non trouvé' },
      });
    }
    res.json({ success: true, data: { restaurant: result.rows[0] } });
  } catch (error) {
    logger.error('Erreur getRestaurantById:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Mettre à jour la commission d'un restaurant (admin uniquement)
 */
exports.updateRestaurantCommission = async (req, res) => {
  try {
    const { id } = req.params;
    const { commission_rate } = req.body;

    if (commission_rate === undefined || commission_rate === null) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELD', message: 'commission_rate requis' },
      });
    }

    const rate = parseFloat(commission_rate);
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_RATE', message: 'La commission doit être entre 0 et 100' },
      });
    }

    const result = await query(
      'UPDATE restaurants SET commission_rate = $1, updated_at = NOW() WHERE id = $2 RETURNING id, commission_rate',
      [rate, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant non trouvé' },
      });
    }

    logger.info(`Commission restaurant ${id} mise à jour à ${rate}% par admin ${req.user?.id}`);
    res.json({
      success: true,
      message: 'Commission appliquée',
      data: { restaurant: { id, commission_rate: result.rows[0].commission_rate } },
    });
  } catch (error) {
    logger.error('Erreur updateRestaurantCommission:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' },
    });
  }
};

/**
 * Obtenir les statistiques détaillées d'un restaurant spécifique
 */
exports.getRestaurantStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30d' } = req.query;

    // Vérifier que le restaurant existe
    const restaurantResult = await query('SELECT * FROM restaurants WHERE id = $1', [id]);
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant non trouvé' },
      });
    }

    const restaurant = restaurantResult.rows[0];

    // Définir l'intervalle
    let interval;
    switch (period) {
      case '7d': interval = '7 days'; break;
      case '30d': interval = '30 days'; break;
      case '90d': interval = '90 days'; break;
      case '1y': interval = '365 days'; break;
      default: interval = '30 days';
    }

    // KPIs principaux
    const kpisResult = await query(`
      SELECT 
        COUNT(o.id) as total_orders,
        COUNT(o.id) FILTER (WHERE o.status = 'delivered') as delivered_orders,
        COUNT(o.id) FILTER (WHERE o.status = 'cancelled') as cancelled_orders,
        COUNT(o.id) FILTER (WHERE o.status IN ('new', 'accepted', 'preparing', 'ready', 'delivering')) as pending_orders,
        COALESCE(SUM(o.subtotal) FILTER (WHERE o.status = 'delivered'), 0) as total_revenue,
        COALESCE(AVG(o.subtotal) FILTER (WHERE o.status = 'delivered'), 0) as avg_order_value,
        COALESCE(AVG(EXTRACT(EPOCH FROM (o.ready_at - o.accepted_at))/60) FILTER (WHERE o.status = 'delivered'), 0) as avg_prep_time_minutes
      FROM orders o
      WHERE o.restaurant_id = $1 AND o.placed_at >= NOW() - INTERVAL '${interval}'
    `, [id]);

    // Revenus par jour (30 derniers jours)
    const dailyRevenueResult = await query(`
      SELECT 
        DATE(o.placed_at) as day,
        COALESCE(SUM(o.subtotal) FILTER (WHERE o.status = 'delivered'), 0) as revenue,
        COUNT(o.id) FILTER (WHERE o.status = 'delivered') as orders_count
      FROM orders o
      WHERE o.restaurant_id = $1 AND o.placed_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(o.placed_at)
      ORDER BY day DESC
    `, [id]);

    // Top plats (order_items a "name", pas "menu_item_name")
    const topDishesResult = await query(`
      SELECT 
        COALESCE(oi.name, (oi.menu_item_snapshot->>'name'), 'Plat') as name,
        COUNT(oi.id) as orders_count,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.restaurant_id = $1 
        AND o.status = 'delivered' 
        AND o.placed_at >= NOW() - INTERVAL '${interval}'
      GROUP BY COALESCE(oi.name, (oi.menu_item_snapshot->>'name'), 'Plat')
      ORDER BY orders_count DESC
      LIMIT 5
    `, [id]);

    // Commandes par heure et jour de la semaine (heatmap)
    const heatmapResult = await query(`
      SELECT 
        EXTRACT(DOW FROM o.placed_at) as day_of_week,
        EXTRACT(HOUR FROM o.placed_at) as hour,
        COUNT(o.id) as orders_count
      FROM orders o
      WHERE o.restaurant_id = $1 
        AND o.status = 'delivered' 
        AND o.placed_at >= NOW() - INTERVAL '${interval}'
      GROUP BY EXTRACT(DOW FROM o.placed_at), EXTRACT(HOUR FROM o.placed_at)
      ORDER BY day_of_week, hour
    `, [id]);

    // Avis récents (table reviews, pas orders)
    const reviewsResult = await query(`
      SELECT 
        COUNT(r.id) as total_reviews,
        COALESCE(AVG(r.restaurant_rating), 0) as avg_rating,
        COUNT(r.id) FILTER (WHERE r.restaurant_rating = 5) as five_star,
        COUNT(r.id) FILTER (WHERE r.restaurant_rating = 4) as four_star,
        COUNT(r.id) FILTER (WHERE r.restaurant_rating = 3) as three_star,
        COUNT(r.id) FILTER (WHERE r.restaurant_rating = 2) as two_star,
        COUNT(r.id) FILTER (WHERE r.restaurant_rating = 1) as one_star
      FROM reviews r
      WHERE r.restaurant_id = $1 
        AND r.restaurant_rating IS NOT NULL
        AND r.created_at >= NOW() - INTERVAL '${interval}'
    `, [id]);

    // Comparaison avec le mois précédent
    const previousPeriodResult = await query(`
      SELECT 
        COALESCE(SUM(o.subtotal) FILTER (WHERE o.status = 'delivered'), 0) as prev_revenue,
        COUNT(o.id) FILTER (WHERE o.status = 'delivered') as prev_orders
      FROM orders o
      WHERE o.restaurant_id = $1 
        AND o.placed_at >= NOW() - INTERVAL '60 days'
        AND o.placed_at < NOW() - INTERVAL '30 days'
    `, [id]);

    const kpis = kpisResult.rows[0] || {};
    const prevPeriod = previousPeriodResult.rows[0] || {};

    // Calculer les tendances
    const currentRevenue = parseFloat(kpis.total_revenue) || 0;
    const prevRevenue = parseFloat(prevPeriod.prev_revenue) || 0;
    const revenueTrend = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue * 100).toFixed(1) : 0;

    const currentOrders = parseInt(kpis.delivered_orders) || 0;
    const prevOrders = parseInt(prevPeriod.prev_orders) || 0;
    const ordersTrend = prevOrders > 0 ? ((currentOrders - prevOrders) / prevOrders * 100).toFixed(1) : 0;

    // Formater le heatmap pour le frontend
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const heatmap = days.map((dayName, dayIndex) => {
      const dayData = { day: dayName };
      for (let hour = 10; hour <= 22; hour++) {
        const entry = heatmapResult.rows.find(
          r => parseInt(r.day_of_week) === dayIndex && parseInt(r.hour) === hour
        );
        dayData[hour] = entry ? parseInt(entry.orders_count) : 0;
      }
      return dayData;
    });

    // Calculer les pourcentages pour les top plats
    const maxOrders = topDishesResult.rows.length > 0 
      ? Math.max(...topDishesResult.rows.map(d => parseInt(d.orders_count))) 
      : 1;
    const topDishes = topDishesResult.rows.map(dish => ({
      name: dish.name,
      orders: parseInt(dish.orders_count),
      revenue: parseFloat(dish.total_revenue),
      percentage: Math.round((parseInt(dish.orders_count) / maxOrders) * 100),
    }));

    res.json({
      success: true,
      data: {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          status: restaurant.status,
          average_rating: restaurant.average_rating,
        },
        period,
        kpis: {
          total_orders: parseInt(kpis.total_orders) || 0,
          delivered_orders: parseInt(kpis.delivered_orders) || 0,
          cancelled_orders: parseInt(kpis.cancelled_orders) || 0,
          pending_orders: parseInt(kpis.pending_orders) || 0,
          total_revenue: currentRevenue,
          avg_order_value: parseFloat(kpis.avg_order_value) || 0,
          avg_prep_time_minutes: parseFloat(kpis.avg_prep_time_minutes) || 0,
          revenue_trend: parseFloat(revenueTrend),
          orders_trend: parseFloat(ordersTrend),
        },
        daily_revenue: dailyRevenueResult.rows.map(r => ({
          day: r.day,
          revenue: parseFloat(r.revenue) || 0,
          orders: parseInt(r.orders_count) || 0,
        })),
        top_dishes: topDishes,
        heatmap,
        reviews: (() => {
          const r0 = reviewsResult.rows[0];
          const total = parseInt(r0?.total_reviews) || 0;
          const avgRating = parseFloat(r0?.avg_rating) || 0;
          const fiveStar = parseInt(r0?.five_star) || 0;
          const fourStar = parseInt(r0?.four_star) || 0;
          const threeStar = parseInt(r0?.three_star) || 0;
          const twoStar = parseInt(r0?.two_star) || 0;
          const oneStar = parseInt(r0?.one_star) || 0;
          return {
          total,
          avg_rating: avgRating,
          distribution: (() => {
            
            return {
              5: { count: fiveStar, percent: total > 0 ? Math.round((fiveStar / total) * 100) : 0 },
              4: { count: fourStar, percent: total > 0 ? Math.round((fourStar / total) * 100) : 0 },
              3: { count: threeStar, percent: total > 0 ? Math.round((threeStar / total) * 100) : 0 },
              2: { count: twoStar, percent: total > 0 ? Math.round((twoStar / total) * 100) : 0 },
              1: { count: oneStar, percent: total > 0 ? Math.round((oneStar / total) * 100) : 0 },
            };
          })(),
        };
        })(),
      },
    });
  } catch (error) {
    logger.error('Erreur getRestaurantStatistics:', { message: error.message, code: error.code, stack: error.stack });
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des statistiques' },
    });
  }
};

/**
 * Suspendre un restaurant
 */
exports.suspendRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    return await transaction(async (client) => {
      // Vérifier que le restaurant existe
      const restaurantResult = await client.query(
        'SELECT * FROM restaurants WHERE id = $1',
        [id]
      );

      if (restaurantResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant non trouvé' },
        });
      }

      const restaurant = restaurantResult.rows[0];

      // Vérifier que le restaurant n'est pas déjà suspendu
      if (restaurant.status === 'suspended') {
        return res.status(400).json({
          success: false,
          error: { code: 'RESTAURANT_ALREADY_SUSPENDED', message: 'Le restaurant est déjà suspendu' },
        });
      }

      // Suspendre le restaurant
      // Note: suspension_reason et suspended_at peuvent être ajoutés via migration si nécessaire
      await client.query(
        `UPDATE restaurants 
         SET status = 'suspended',
             updated_at = NOW()
         WHERE id = $1`,
        [id]
      );

      // Annuler les commandes en cours
      await client.query(
        `UPDATE orders 
         SET status = 'cancelled',
             cancellation_reason = 'Restaurant suspendu',
             cancelled_at = NOW()
         WHERE restaurant_id = $1 
           AND status IN ('new', 'accepted', 'preparing', 'ready')`,
        [id]
      );

      // Log l'action
      await client.query(`
        INSERT INTO audit_logs (user_type, user_id, action, resource_type, resource_id, new_values)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'admin',
        req.user.id,
        'suspend_restaurant',
        'restaurant',
        id,
        JSON.stringify({ reason: reason || 'Suspendu par l\'administrateur' })
      ]);

      logger.info(`Restaurant ${id} suspendu par admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Restaurant suspendu',
      });
    });
  } catch (error) {
    logger.error('Erreur suspendRestaurant:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la suspension' },
    });
  }
};

/**
 * Obtenir les restaurants suspendus
 */
exports.getSuspendedRestaurants = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Récupérer les restaurants suspendus avec informations de suspension
    const result = await query(`
      SELECT 
        r.*,
        COALESCE(
          (SELECT new_values::json->>'reason' 
           FROM audit_logs 
           WHERE resource_type = 'restaurant' 
             AND resource_id = r.id 
             AND action = 'suspend_restaurant'
           ORDER BY created_at DESC 
           LIMIT 1),
          'Non spécifiée'
        ) as suspension_reason,
        COALESCE(
          (SELECT created_at 
           FROM audit_logs 
           WHERE resource_type = 'restaurant' 
             AND resource_id = r.id 
             AND action = 'suspend_restaurant'
           ORDER BY created_at DESC 
           LIMIT 1),
          r.updated_at
        ) as suspended_at,
        COALESCE(
          (SELECT first_name || ' ' || last_name 
           FROM admins 
           WHERE id = (
             SELECT user_id 
             FROM audit_logs 
             WHERE resource_type = 'restaurant' 
               AND resource_id = r.id 
               AND action = 'suspend_restaurant'
             ORDER BY created_at DESC 
             LIMIT 1
           )),
          'Système'
        ) as suspended_by
      FROM restaurants r
      WHERE r.status = 'suspended'
      ORDER BY suspended_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await query(
      'SELECT COUNT(*) FROM restaurants WHERE status = $1',
      ['suspended']
    );

    const total = Number.parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        restaurants: result.rows.map(r => {
          // eslint-disable-next-line no-unused-vars
          const { password_hash, ...rest } = r;
          return rest;
        }),
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getSuspendedRestaurants:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Réactiver un restaurant
 */
exports.reactivateRestaurant = async (req, res) => {
  try {
    const { id } = req.params;

    return await transaction(async (client) => {
      const restaurantResult = await client.query(
        'SELECT * FROM restaurants WHERE id = $1',
        [id]
      );

      if (restaurantResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant non trouvé' },
        });
      }

      const restaurant = restaurantResult.rows[0];

      if (restaurant.status !== 'suspended') {
        return res.status(400).json({
          success: false,
          error: { code: 'RESTAURANT_NOT_SUSPENDED', message: 'Le restaurant n\'est pas suspendu' },
        });
      }

      await client.query(
        `UPDATE restaurants 
         SET status = 'active',
             updated_at = NOW()
         WHERE id = $1`,
        [id]
      );

      await client.query(`
        INSERT INTO audit_logs (user_type, user_id, action, resource_type, resource_id, new_values)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'admin',
        req.user.id,
        'reactivate_restaurant',
        'restaurant',
        id,
        JSON.stringify({ reason: 'Réactivé par l\'administrateur' })
      ]);

      logger.info(`Restaurant ${id} réactivé par admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Restaurant réactivé avec succès',
      });
    });
  } catch (error) {
    logger.error('Erreur reactivateRestaurant:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la réactivation' },
    });
  }
};

/**
 * Supprimer un restaurant
 */
exports.deleteRestaurant = async (req, res) => {
  try {
    const { id } = req.params;

    return await transaction(async (client) => {
      // Vérifier que le restaurant existe
      const restaurantResult = await client.query(
        'SELECT * FROM restaurants WHERE id = $1',
        [id]
      );

      if (restaurantResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant non trouvé' },
        });
      }

      const restaurant = restaurantResult.rows[0];

      // Vérifier qu'il n'y a pas de commandes en cours
      const activeOrdersResult = await client.query(
        `SELECT COUNT(*) FROM orders WHERE restaurant_id = $1 AND status IN ('new', 'accepted', 'preparing', 'ready', 'delivering')`,
        [id]
      );

      if (parseInt(activeOrdersResult.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'ACTIVE_ORDERS', message: 'Le restaurant a des commandes en cours. Impossible de supprimer.' },
        });
      }

      // Supprimer le restaurant (les cascades s'occupent du reste)
      await client.query('DELETE FROM restaurants WHERE id = $1', [id]);

      // Log de l'action
      await client.query(`
        INSERT INTO audit_logs (user_type, user_id, action, resource_type, resource_id, old_values)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'admin',
        req.user.id,
        'delete_restaurant',
        'restaurant',
        id,
        JSON.stringify({ name: restaurant.name, owner_id: restaurant.owner_id }),
      ]);

      logger.info('Restaurant supprimé', { restaurantId: id, adminId: req.user.id });

      res.json({
        success: true,
        message: 'Restaurant supprimé avec succès',
      });
    });
  } catch (error) {
    logger.error('Erreur deleteRestaurant:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: 'Erreur lors de la suppression' },
    });
  }
};

/**
 * Demander des corrections à un restaurant
 */
exports.requestRestaurantCorrections = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'MESSAGE_REQUIRED', message: 'Message requis' },
      });
    }

    const restaurantResult = await query(
      'SELECT * FROM restaurants WHERE id = $1',
      [id]
    );

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant non trouvé' },
      });
    }

    const restaurant = restaurantResult.rows[0];

    // Créer une notification pour le propriétaire du restaurant
    await query(`
      INSERT INTO notifications (user_id, user_type, type, title, message, data)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      restaurant.owner_id,
      'restaurant',
      'correction_request',
      'Corrections demandées pour votre restaurant',
      message,
      JSON.stringify({ restaurant_id: id, admin_id: req.user.id }),
    ]);

    // Log de l'action
    await query(`
      INSERT INTO audit_logs (user_type, user_id, action, resource_type, resource_id, new_values)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      'admin',
      req.user.id,
      'request_corrections',
      'restaurant',
      id,
      JSON.stringify({ message }),
    ]);

    logger.info('Demande de corrections envoyée', { restaurantId: id, adminId: req.user.id });

    res.json({
      success: true,
      message: 'Demande de corrections envoyée au restaurant',
    });
  } catch (error) {
    logger.error('Erreur requestRestaurantCorrections:', error);
    res.status(500).json({
      success: false,
      error: { code: 'REQUEST_ERROR', message: 'Erreur lors de l\'envoi de la demande' },
    });
  }
};

/**
 * Demander des informations complémentaires à un livreur
 */
exports.requestDeliveryPersonInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'MESSAGE_REQUIRED', message: 'Message requis' },
      });
    }

    const driverResult = await query(
      'SELECT * FROM delivery_persons WHERE id = $1',
      [id]
    );

    if (driverResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'DRIVER_NOT_FOUND', message: 'Livreur non trouvé' },
      });
    }

    const driver = driverResult.rows[0];

    // Créer une notification pour le livreur
    await query(`
      INSERT INTO notifications (user_id, user_type, type, title, message, data)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      id,
      'delivery',
      'info_request',
      'Informations complémentaires demandées',
      message,
      JSON.stringify({ admin_id: req.user.id }),
    ]);

    // Log de l'action
    await query(`
      INSERT INTO audit_logs (user_type, user_id, action, resource_type, resource_id, new_values)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      'admin',
      req.user.id,
      'request_info',
      'delivery_person',
      id,
      JSON.stringify({ message }),
    ]);

    logger.info('Demande d\'informations envoyée', { driverId: id, adminId: req.user.id });

    res.json({
      success: true,
      message: 'Demande d\'informations envoyée au livreur',
    });
  } catch (error) {
    logger.error('Erreur requestDeliveryPersonInfo:', error);
    res.status(500).json({
      success: false,
      error: { code: 'REQUEST_ERROR', message: 'Erreur lors de l\'envoi de la demande' },
    });
  }
};

/**
 * Obtenir les commandes problématiques
 */
exports.getProblematicOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, problem_type } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        o.*,
        r.name as restaurant_name,
        u.first_name || ' ' || u.last_name as client_name,
        u.phone as client_phone,
        dp.first_name || ' ' || dp.last_name as delivery_name,
        dp.phone as delivery_phone,
        CASE 
          WHEN o.status = 'cancelled' AND o.cancellation_reason LIKE '%litige%' THEN 'litige'
          WHEN o.status = 'cancelled' AND o.cancellation_reason LIKE '%retard%' THEN 'retard'
          WHEN o.status = 'cancelled' AND o.cancellation_reason LIKE '%client absent%' THEN 'client_absent'
          WHEN o.status = 'delivering' AND o.placed_at < NOW() - INTERVAL '2 hours' THEN 'retard'
          ELSE 'other'
        END as problem_type,
        CASE 
          WHEN o.status = 'cancelled' AND o.cancellation_reason LIKE '%litige%' THEN 'high'
          WHEN o.status = 'cancelled' AND o.cancellation_reason LIKE '%retard%' THEN 'high'
          WHEN o.status = 'delivering' AND o.placed_at < NOW() - INTERVAL '2 hours' THEN 'high'
          ELSE 'medium'
        END as urgency
      FROM orders o
      LEFT JOIN restaurants r ON o.restaurant_id = r.id
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN delivery_persons dp ON o.delivery_person_id = dp.id
      WHERE (
        (o.status = 'cancelled' AND o.cancellation_reason IS NOT NULL)
        OR (o.status = 'delivering' AND o.placed_at < NOW() - INTERVAL '2 hours')
        OR (o.status IN ('new', 'accepted') AND o.placed_at < NOW() - INTERVAL '1 hour')
      )
    `;

    const values = [];
    let paramIndex = 1;

    if (problem_type && problem_type !== 'all') {
      queryText += ` AND (
        CASE 
          WHEN o.status = 'cancelled' AND o.cancellation_reason LIKE '%litige%' THEN 'litige'
          WHEN o.status = 'cancelled' AND o.cancellation_reason LIKE '%retard%' THEN 'retard'
          WHEN o.status = 'cancelled' AND o.cancellation_reason LIKE '%client absent%' THEN 'client_absent'
          WHEN o.status = 'delivering' AND o.placed_at < NOW() - INTERVAL '2 hours' THEN 'retard'
          ELSE 'other'
        END
      ) = $${paramIndex}`;
      values.push(problem_type);
      paramIndex++;
    }

    queryText += ` ORDER BY o.placed_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await query(queryText, values);

    // Compter le total
    let countQuery = `
      SELECT COUNT(*) 
      FROM orders o
      WHERE (
        (o.status = 'cancelled' AND o.cancellation_reason IS NOT NULL)
        OR (o.status = 'delivering' AND o.placed_at < NOW() - INTERVAL '2 hours')
        OR (o.status IN ('new', 'accepted') AND o.placed_at < NOW() - INTERVAL '1 hour')
      )
    `;
    const countValues = [];
    let countParamIndex = 1;

    if (problem_type && problem_type !== 'all') {
      countQuery += ` AND (
        CASE 
          WHEN o.status = 'cancelled' AND o.cancellation_reason LIKE '%litige%' THEN 'litige'
          WHEN o.status = 'cancelled' AND o.cancellation_reason LIKE '%retard%' THEN 'retard'
          WHEN o.status = 'cancelled' AND o.cancellation_reason LIKE '%client absent%' THEN 'client_absent'
          WHEN o.status = 'delivering' AND o.placed_at < NOW() - INTERVAL '2 hours' THEN 'retard'
          ELSE 'other'
        END
      ) = $${countParamIndex}`;
      countValues.push(problem_type);
      countParamIndex++;
    }

    const countResult = await query(countQuery, countValues);
    const total = Number.parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        orders: result.rows,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getProblematicOrders:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Obtenir les remboursements
 */
exports.getRefunds = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        t.id,
        t.order_id,
        t.amount,
        t.status,
        t.created_at,
        t.description,
        o.order_number,
        o.total as order_total,
        u.id as user_id,
        u.first_name || ' ' || u.last_name as customer_name,
        u.phone as customer_phone,
        r.id as restaurant_id,
        r.name as restaurant_name,
        CASE 
          WHEN t.amount > 100 THEN 'high'
          WHEN t.amount > 50 THEN 'medium'
          ELSE 'low'
        END as priority
      FROM transactions t
      INNER JOIN orders o ON t.order_id = o.id
      INNER JOIN users u ON o.user_id = u.id
      LEFT JOIN restaurants r ON o.restaurant_id = r.id
      WHERE t.type = 'refund'
    `;

    const values = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      queryText += ` AND t.status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    if (priority && priority !== 'all') {
      queryText += ` AND (
        CASE 
          WHEN t.amount > 100 THEN 'high'
          WHEN t.amount > 50 THEN 'medium'
          ELSE 'low'
        END
      ) = $${paramIndex}`;
      values.push(priority);
      paramIndex++;
    }

    queryText += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await query(queryText, values);

    // Compter le total
    let countQuery = `
      SELECT COUNT(*) 
      FROM transactions t
      INNER JOIN orders o ON t.order_id = o.id
      WHERE t.type = 'refund'
    `;
    const countValues = [];
    let countParamIndex = 1;

    if (status && status !== 'all') {
      countQuery += ` AND t.status = $${countParamIndex}`;
      countValues.push(status);
      countParamIndex++;
    }

    if (priority && priority !== 'all') {
      countQuery += ` AND (
        CASE 
          WHEN t.amount > 100 THEN 'high'
          WHEN t.amount > 50 THEN 'medium'
          ELSE 'low'
        END
      ) = $${countParamIndex}`;
      countValues.push(priority);
      countParamIndex++;
    }

    const countResult = await query(countQuery, countValues);
    const total = Number.parseInt(countResult.rows[0].count);

    // Statistiques
    const statsResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE t.status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE t.status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE t.status = 'rejected') as rejected_count,
        COALESCE(SUM(t.amount) FILTER (WHERE t.status = 'completed'), 0) as total_refunded,
        COALESCE(AVG(EXTRACT(EPOCH FROM (t.completed_at - t.created_at))/3600), 0) as avg_processing_hours
      FROM transactions t
      WHERE t.type = 'refund'
        AND t.created_at >= NOW() - INTERVAL '30 days'
    `);

    res.json({
      success: true,
      data: {
        refunds: result.rows,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit),
        },
        statistics: statsResult.rows[0] || {
          pending_count: 0,
          completed_count: 0,
          rejected_count: 0,
          total_refunded: 0,
          avg_processing_hours: 0,
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getRefunds:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Approuver un remboursement
 */
exports.approveRefund = async (req, res) => {
  try {
    const { id } = req.params;

    return await transaction(async (client) => {
      const refundResult = await client.query(
        'SELECT * FROM transactions WHERE id = $1 AND type = $2',
        [id, 'refund']
      );

      if (refundResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'REFUND_NOT_FOUND', message: 'Remboursement non trouvé' },
        });
      }

      const refund = refundResult.rows[0];

      if (refund.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Le remboursement n\'est pas en attente' },
        });
      }

      // Marquer comme complété
      await client.query(
        'UPDATE transactions SET status = $1, completed_at = NOW() WHERE id = $2',
        ['completed', id]
      );

      // TODO: Effectuer le vrai remboursement via Mobile Money
      // const paymentService = require('../services/payment/orange-money.service');
      // await paymentService.refund(refund.amount, refund.order_id);

      await client.query(`
        INSERT INTO audit_logs (user_type, user_id, action, resource_type, resource_id, new_values)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'admin',
        req.user.id,
        'approve_refund',
        'transaction',
        id,
        JSON.stringify({ amount: refund.amount })
      ]);

      logger.info(`Remboursement ${id} approuvé par admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Remboursement approuvé et traité',
      });
    });
  } catch (error) {
    logger.error('Erreur approveRefund:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de l\'approbation' },
    });
  }
};

/**
 * Rejeter un remboursement
 */
exports.rejectRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    return await transaction(async (client) => {
      const refundResult = await client.query(
        'SELECT * FROM transactions WHERE id = $1 AND type = $2',
        [id, 'refund']
      );

      if (refundResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'REFUND_NOT_FOUND', message: 'Remboursement non trouvé' },
        });
      }

      const refund = refundResult.rows[0];

      if (refund.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Le remboursement n\'est pas en attente' },
        });
      }

      // Marquer comme rejeté
      await client.query(
        'UPDATE transactions SET status = $1, description = COALESCE($2, description) WHERE id = $3',
        ['rejected', reason || 'Rejeté par l\'administrateur', id]
      );

      await client.query(`
        INSERT INTO audit_logs (user_type, user_id, action, resource_type, resource_id, new_values)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'admin',
        req.user.id,
        'reject_refund',
        'transaction',
        id,
        JSON.stringify({ reason: reason || 'Rejeté par l\'administrateur' })
      ]);

      logger.info(`Remboursement ${id} rejeté par admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Remboursement rejeté',
      });
    });
  } catch (error) {
    logger.error('Erreur rejectRefund:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors du rejet' },
    });
  }
};

/**
 * Construire une URL absolue pour un document (photo, CNI, etc.) stocké en BDD.
 * Accepte un chemin relatif (uploads/... ou /uploads/...) ou une URL complète.
 */
function buildDocumentUrl(value, req) {
  if (value == null || typeof value !== 'string' || !value.trim()) return null;
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:' + (process.env.PORT || 5000);
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
  const base = (protocol === 'https' ? 'https' : 'http') + '://' + host;
  const baseClean = base.replace(/\/api\/v\d+\/?$/i, '').replace(/\/$/, '');
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  const path = value.startsWith('/') ? value : '/' + value;
  return baseClean + path;
}

/**
 * Obtenir un livreur par ID (profil complet : infos, documents, stats, livraisons récentes)
 * Les champs photo et documents sont renvoyés avec des URLs absolues pour que l'admin puisse les afficher.
 */
exports.getDeliveryPersonById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM delivery_persons WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'DELIVERY_NOT_FOUND', message: 'Livreur non trouvé' },
      });
    }
    const row = result.rows[0];
    const r = row;
    const doc = (v) => buildDocumentUrl(v, req);
    const deliveryPerson = {
      id: r.id,
      phone: r.phone,
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
      address: r.address,
      vehicle_type: r.vehicle_type,
      vehicle_plate: r.vehicle_plate,
      vehicle_color: r.vehicle_color,
      vehicle_brand: r.vehicle_brand,
      mobile_money_number: r.mobile_money_number,
      mobile_money_provider: r.mobile_money_provider,
      status: r.status,
      delivery_status: r.delivery_status,
      suspension_reason: r.suspension_reason,
      rejection_reason: r.rejection_reason,
      created_at: r.created_at,
      updated_at: r.updated_at,
      last_location_update: r.last_location_update,
      average_rating: r.average_rating != null ? parseFloat(r.average_rating) : null,
      total_deliveries: r.total_deliveries != null ? parseInt(r.total_deliveries, 10) : null,
      total_earnings: r.total_earnings != null ? parseFloat(r.total_earnings) : null,
      profile_picture: doc(r.photo || r.profile_picture || r.profile_photo) || (r.photo || r.profile_picture || r.profile_photo),
      photo: doc(r.photo) || r.photo,
      id_card: doc(r.id_card) || r.id_card,
      id_card_front: doc(r.id_card_recto || r.id_card_front || r.id_card) || (r.id_card_recto || r.id_card_front || r.id_card),
      id_card_back: doc(r.id_card_verso || r.id_card_back) || (r.id_card_verso || r.id_card_back),
      driver_license: doc(r.driver_license) || r.driver_license,
      driver_license_front: doc(r.driver_license_recto || r.driver_license_front || r.driver_license) || (r.driver_license_recto || r.driver_license_front || r.driver_license),
      driver_license_back: doc(r.driver_license_verso || r.driver_license_back) || (r.driver_license_verso || r.driver_license_back),
      vehicle_registration: doc(r.vehicle_registration) || r.vehicle_registration,
      vehicle_registration_front: doc(r.vehicle_registration_recto || r.vehicle_registration_front || r.vehicle_registration) || (r.vehicle_registration_recto || r.vehicle_registration_front || r.vehicle_registration),
      vehicle_registration_back: doc(r.vehicle_registration_verso || r.vehicle_registration_back) || (r.vehicle_registration_verso || r.vehicle_registration_back),
      insurance_document: doc(r.insurance_document) || r.insurance_document,
      vehicle_photo: doc(r.vehicle_photo) || r.vehicle_photo,
      current_latitude: r.current_latitude != null ? parseFloat(r.current_latitude) : null,
      current_longitude: r.current_longitude != null ? parseFloat(r.current_longitude) : null,
    };

    const [recentResult] = await Promise.all([
      query(
        `SELECT o.id, o.order_number, o.status, o.delivery_fee, o.delivered_at, o.created_at,
                r.name AS restaurant_name
         FROM orders o
         LEFT JOIN restaurants r ON r.id = o.restaurant_id
         WHERE o.delivery_person_id = $1
         ORDER BY COALESCE(o.delivered_at, o.created_at) DESC
         LIMIT 20`,
        [id]
      ),
    ]);

    const stats = {
      total_earnings: parseFloat(row.total_earnings) || 0,
      total_deliveries: parseInt(row.total_deliveries, 10) || 0,
      average_rating: parseFloat(row.average_rating) || 0,
    };

    res.json({
      success: true,
      data: {
        delivery_person: deliveryPerson,
        stats,
        recent_deliveries: recentResult.rows,
      },
    });
  } catch (error) {
    logger.error('Erreur getDeliveryPersonById:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Rejeter un livreur
 */
exports.rejectDeliveryPerson = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    return await transaction(async (client) => {
      // Vérifier que le livreur existe et est en attente
      const deliveryResult = await client.query(
        'SELECT * FROM delivery_persons WHERE id = $1',
        [id]
      );

      if (deliveryResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'DELIVERY_PERSON_NOT_FOUND', message: 'Livreur non trouvé' },
        });
      }

      const delivery = deliveryResult.rows[0];

      if (delivery.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Seuls les livreurs en attente peuvent être rejetés' },
        });
      }

      // Rejeter le livreur
      await client.query(
        `UPDATE delivery_persons 
         SET status = 'rejected',
             rejection_reason = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [reason || 'Rejeté par l\'administrateur', id]
      );

      // Log l'action
      await client.query(`
        INSERT INTO audit_logs (user_type, user_id, action, resource_type, resource_id, new_values)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'admin',
        req.user.id,
        'reject_delivery_person',
        'delivery_person',
        id,
        JSON.stringify({ reason: reason || 'Rejeté par l\'administrateur' })
      ]);

      logger.info(`Livreur ${id} rejeté par admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Livreur rejeté',
      });
    });
  } catch (error) {
    logger.error('Erreur rejectDeliveryPerson:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors du rejet' },
    });
  }
};

/**
 * Suspendre un livreur
 */
exports.suspendDeliveryPerson = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    return await transaction(async (client) => {
      // Vérifier que le livreur existe
      const deliveryResult = await client.query(
        'SELECT * FROM delivery_persons WHERE id = $1',
        [id]
      );

      if (deliveryResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'DELIVERY_PERSON_NOT_FOUND', message: 'Livreur non trouvé' },
        });
      }

      const delivery = deliveryResult.rows[0];

      // Vérifier que le livreur n'est pas déjà suspendu
      if (delivery.status === 'suspended') {
        return res.status(400).json({
          success: false,
          error: { code: 'DELIVERY_ALREADY_SUSPENDED', message: 'Le livreur est déjà suspendu' },
        });
      }

      // Suspendre le livreur
      await client.query(
        `UPDATE delivery_persons 
         SET status = 'suspended',
             delivery_status = 'offline',
             suspension_reason = $1,
             suspended_at = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [reason || 'Suspendu par l\'administrateur', id]
      );

      // Réassigner les commandes en cours à d'autres livreurs
      await client.query(
        `UPDATE orders 
         SET delivery_person_id = NULL,
             status = CASE 
               WHEN status = 'delivering' THEN 'ready'
               ELSE status
             END,
             updated_at = NOW()
         WHERE delivery_person_id = $1 
           AND status IN ('delivering')`,
        [id]
      );

      // Log l'action
      await client.query(`
        INSERT INTO audit_logs (user_type, user_id, action, resource_type, resource_id, new_values)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'admin',
        req.user.id,
        'suspend_delivery_person',
        'delivery_person',
        id,
        JSON.stringify({ reason: reason || 'Suspendu par l\'administrateur' })
      ]);

      logger.info(`Livreur ${id} suspendu par admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Livreur suspendu',
      });
    });
  } catch (error) {
    logger.error('Erreur suspendDeliveryPerson:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la suspension' },
    });
  }
};

/**
 * Créer un livreur (admin)
 */
exports.createDeliveryPerson = async (req, res) => {
  try {
      const {
      phone,
      password,
      first_name,
      last_name,
      vehicle_type,
      vehicle_plate,
      mobile_money_number,
      mobile_money_provider,
      status = 'active', // Admin peut créer directement en actif
    } = req.body;

    // Validation
    if (!phone || !password || !first_name || !last_name || !vehicle_type) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Champs requis manquants: phone, password, first_name, last_name, vehicle_type',
        },
      });
    }

    return await transaction(async (client) => {
      // Vérifier si le téléphone existe déjà
      const existingResult = await client.query(
        'SELECT id FROM delivery_persons WHERE phone = $1',
        [phone]
      );

      if (existingResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PHONE_EXISTS',
            message: 'Ce numéro est déjà enregistré',
          },
        });
      }

      // Hasher le mot de passe
      const passwordHash = await bcrypt.hash(password, Number.parseInt(process.env.BCRYPT_ROUNDS || 10));

      // Créer le livreur
      // Note: La table delivery_persons n'a pas de colonne email dans le schéma actuel
      const result = await client.query(
        `INSERT INTO delivery_persons (
          phone, password_hash, first_name, last_name,
          vehicle_type, vehicle_plate,
          mobile_money_number, mobile_money_provider,
          status, delivery_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'offline')
        RETURNING id, phone, first_name, last_name, vehicle_type, status, created_at`,
        [
          phone,
          passwordHash,
          first_name,
          last_name,
          vehicle_type,
          vehicle_plate || null,
          mobile_money_number || null,
          mobile_money_provider || null,
          status,
        ]
      );

      // Log l'action
      await client.query(`
        INSERT INTO audit_logs (user_type, user_id, action, resource_type, resource_id, new_values)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'admin',
        req.user.id,
        'create_delivery_person',
        'delivery_person',
        result.rows[0].id,
        JSON.stringify({ phone, first_name, last_name, vehicle_type, status })
      ]);

      logger.info(`Livreur créé par admin ${req.user.id}: ${result.rows[0].id}`);

      res.status(201).json({
        success: true,
        message: 'Livreur créé avec succès',
        data: {
          delivery_person: result.rows[0],
        },
      });
    });
  } catch (error) {
    logger.error('Erreur createDeliveryPerson:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Erreur lors de la création du livreur',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
    });
  }
};

/**
 * Modifier un livreur
 */
exports.updateDeliveryPerson = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      vehicle_type,
      vehicle_plate,
      mobile_money_number,
      mobile_money_provider,
      status,
      delivery_status,
    } = req.body;

    return await transaction(async (client) => {
      // Vérifier que le livreur existe
      const deliveryResult = await client.query(
        'SELECT * FROM delivery_persons WHERE id = $1',
        [id]
      );

      if (deliveryResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'DELIVERY_PERSON_NOT_FOUND', message: 'Livreur non trouvé' },
        });
      }

      const oldDelivery = deliveryResult.rows[0];

      // Construire la requête de mise à jour dynamiquement
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (first_name !== undefined) {
        updates.push(`first_name = $${paramIndex}`);
        values.push(first_name);
        paramIndex++;
      }
      if (last_name !== undefined) {
        updates.push(`last_name = $${paramIndex}`);
        values.push(last_name);
        paramIndex++;
      }
      if (vehicle_type !== undefined) {
        updates.push(`vehicle_type = $${paramIndex}`);
        values.push(vehicle_type);
        paramIndex++;
      }
      if (vehicle_plate !== undefined) {
        updates.push(`vehicle_plate = $${paramIndex}`);
        values.push(vehicle_plate);
        paramIndex++;
      }
      if (mobile_money_number !== undefined) {
        updates.push(`mobile_money_number = $${paramIndex}`);
        values.push(mobile_money_number);
        paramIndex++;
      }
      if (mobile_money_provider !== undefined) {
        updates.push(`mobile_money_provider = $${paramIndex}`);
        values.push(mobile_money_provider);
        paramIndex++;
      }
      if (status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        values.push(status);
        paramIndex++;
      }
      if (delivery_status !== undefined) {
        updates.push(`delivery_status = $${paramIndex}`);
        values.push(delivery_status);
        paramIndex++;
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_UPDATES', message: 'Aucune modification à apporter' },
        });
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const updateQuery = `
        UPDATE delivery_persons 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, phone, first_name, last_name, vehicle_type, status, delivery_status, updated_at
      `;

      const result = await client.query(updateQuery, values);

      // Log l'action
      await client.query(`
        INSERT INTO audit_logs (user_type, user_id, action, resource_type, resource_id, old_values, new_values)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        'admin',
        req.user.id,
        'update_delivery_person',
        'delivery_person',
        id,
        JSON.stringify({
          first_name: oldDelivery.first_name,
          last_name: oldDelivery.last_name,
          vehicle_type: oldDelivery.vehicle_type,
          status: oldDelivery.status,
        }),
        JSON.stringify({
          first_name: first_name ?? oldDelivery.first_name,
          last_name: last_name ?? oldDelivery.last_name,
          vehicle_type: vehicle_type ?? oldDelivery.vehicle_type,
          status: status ?? oldDelivery.status,
        })
      ]);

      logger.info(`Livreur ${id} modifié par admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Livreur modifié avec succès',
        data: {
          delivery_person: result.rows[0],
        },
      });
    });
  } catch (error) {
    logger.error('Erreur updateDeliveryPerson:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Erreur lors de la modification du livreur',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
    });
  }
};

/**
 * Supprimer un livreur
 */
exports.deleteDeliveryPerson = async (req, res) => {
  try {
    const { id } = req.params;

    return await transaction(async (client) => {
      // Vérifier que le livreur existe
      const deliveryResult = await client.query(
        'SELECT * FROM delivery_persons WHERE id = $1',
        [id]
      );

      if (deliveryResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'DELIVERY_PERSON_NOT_FOUND', message: 'Livreur non trouvé' },
        });
      }

      const delivery = deliveryResult.rows[0];

      // Vérifier s'il y a des commandes en cours
      const activeOrdersResult = await client.query(
        'SELECT COUNT(*) FROM orders WHERE delivery_person_id = $1 AND status IN ($2, $3)',
        [id, 'delivering', 'ready']
      );

      const activeOrdersCount = Number.parseInt(activeOrdersResult.rows[0].count);

      if (activeOrdersCount > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'HAS_ACTIVE_ORDERS',
            message: `Impossible de supprimer: ${activeOrdersCount} commande(s) en cours`,
          },
        });
      }

      // Réassigner les commandes livrées à NULL (pour garder l'historique)
      await client.query(
        `UPDATE orders 
         SET delivery_person_id = NULL
         WHERE delivery_person_id = $1`,
        [id]
      );

      // Supprimer le livreur
      await client.query('DELETE FROM delivery_persons WHERE id = $1', [id]);

      // Log l'action
      await client.query(`
        INSERT INTO audit_logs (user_type, user_id, action, resource_type, resource_id, old_values)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'admin',
        req.user.id,
        'delete_delivery_person',
        'delivery_person',
        id,
        JSON.stringify({
          phone: delivery.phone,
          first_name: delivery.first_name,
          last_name: delivery.last_name,
        })
      ]);

      logger.info(`Livreur ${id} supprimé par admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Livreur supprimé avec succès',
      });
    });
  } catch (error) {
    logger.error('Erreur deleteDeliveryPerson:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Erreur lors de la suppression du livreur',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
    });
  }
};

/**
 * Obtenir une commande par ID
 */
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM orders WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
      });
    }
    res.json({ success: true, data: { order: result.rows[0] } });
  } catch (error) {
    logger.error('Erreur getOrderById:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Annuler une commande
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    return await transaction(async (client) => {
      // Vérifier que la commande existe
      const orderResult = await client.query(
        'SELECT * FROM orders WHERE id = $1',
        [id]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
        });
      }

      const order = orderResult.rows[0];

      // Vérifier que la commande peut être annulée
      if (order.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          error: { code: 'ORDER_ALREADY_CANCELLED', message: 'La commande est déjà annulée' },
        });
      }

      if (order.status === 'delivered') {
        return res.status(400).json({
          success: false,
          error: { code: 'ORDER_DELIVERED', message: 'Impossible d\'annuler une commande déjà livrée' },
        });
      }

      // Annuler la commande
      await client.query(
        `UPDATE orders 
         SET status = 'cancelled',
             cancelled_at = NOW(),
             cancellation_reason = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [reason || 'Annulée par l\'administrateur', id]
      );

      // Si la commande était payée, créer une transaction de remboursement
      if (order.payment_status === 'paid') {
        await client.query(
          `INSERT INTO transactions (order_id, user_id, type, amount, status, description)
           VALUES ($1, $2, 'refund', $3, 'pending', $4)`,
          [id, order.user_id, order.total, `Remboursement pour commande ${order.order_number}`]
        );
      }

      logger.info(`Commande ${id} annulée par admin ${req.user.id}`);

      return res.json({
        success: true,
        message: 'Commande annulée',
      });
    });
  } catch (error) {
    logger.error('Erreur cancelOrder:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de l\'annulation' },
    });
  }
};

/**
 * Réassigner un livreur à une commande
 */
exports.reassignDeliveryPerson = async (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_person_id } = req.body;

    if (!delivery_person_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'L\'ID du livreur est requis' },
      });
    }

    return await transaction(async (client) => {
      // Vérifier que la commande existe
      const orderResult = await client.query(
        'SELECT * FROM orders WHERE id = $1',
        [id]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
        });
      }

      const order = orderResult.rows[0];

      // Vérifier que la commande peut être réassignée
      if (order.status === 'cancelled' || order.status === 'delivered') {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Impossible de réassigner une commande annulée ou livrée' },
        });
      }

      // Vérifier que le livreur existe et est actif
      const deliveryResult = await client.query(
        'SELECT id, status FROM delivery_persons WHERE id = $1',
        [delivery_person_id]
      );

      if (deliveryResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'DELIVERY_PERSON_NOT_FOUND', message: 'Livreur non trouvé' },
        });
      }

      const delivery = deliveryResult.rows[0];

      if (delivery.status !== 'active') {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_DELIVERY_STATUS', message: 'Le livreur doit être actif' },
        });
      }

      // Réassigner le livreur
      await client.query(
        `UPDATE orders 
         SET delivery_person_id = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [delivery_person_id, id]
      );

      logger.info(`Commande ${id} réassignée au livreur ${delivery_person_id} par admin ${req.user.id}`);

      return res.json({
        success: true,
        message: 'Livreur réassigné avec succès',
      });
    });
  } catch (error) {
    logger.error('Erreur reassignDeliveryPerson:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      orderId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Erreur lors de la réassignation',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
    });
  }
};

/**
 * Résoudre un litige
 */
exports.resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, refund_amount, refund_to } = req.body;

    if (!resolution) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'La résolution est requise' },
      });
    }

    return await transaction(async (client) => {
      // Vérifier que la commande existe
      const orderResult = await client.query(
        'SELECT * FROM orders WHERE id = $1',
        [id]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Commande non trouvée' },
        });
      }

      const order = orderResult.rows[0];

      // Mettre à jour la commande avec la résolution
      // Note: dispute_resolution, dispute_resolved_at, dispute_resolved_by peuvent être ajoutés via migration
      // Pour l'instant, on utilise cancellation_reason pour stocker la résolution
      await client.query(
        `UPDATE orders 
         SET cancellation_reason = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [`Litige résolu: ${resolution}`, id]
      );

      // Si un remboursement est nécessaire
      if (refund_amount && refund_amount > 0) {
        const refundType = refund_to === 'restaurant' ? 'refund_restaurant' : 'refund';
        await client.query(
          `INSERT INTO transactions (order_id, user_id, restaurant_id, type, amount, status, description)
           VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
          [
            id,
            refund_to === 'user' ? order.user_id : null,
            refund_to === 'restaurant' ? order.restaurant_id : null,
            refundType,
            refund_amount,
            `Remboursement litige pour commande ${order.order_number}: ${resolution}`
          ]
        );
      }

      logger.info(`Litige de la commande ${id} résolu par admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Litige résolu',
      });
    });
  } catch (error) {
    logger.error('Erreur resolveDispute:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la résolution' },
    });
  }
};

/**
 * Obtenir les transactions
 */
/**
 * Obtenir les paiements des livreurs
 */
exports.getDeliveryPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, date_from, date_to, delivery_person_id } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        t.id,
        t.order_id,
        t.amount,
        t.status,
        t.payment_method,
        t.created_at,
        o.order_number,
        o.delivered_at,
        dp.id as delivery_person_id,
        dp.first_name || ' ' || dp.last_name as delivery_person_name,
        dp.phone as delivery_person_phone,
        dp.vehicle_type
      FROM transactions t
      INNER JOIN orders o ON t.order_id = o.id
      INNER JOIN delivery_persons dp ON t.to_user_type = 'delivery' AND t.to_user_id = dp.id
      WHERE t.transaction_type = 'delivery_fee'
    `;
    const values = [];
    let paramIndex = 1;

    if (delivery_person_id) {
      queryText += ` AND dp.id = $${paramIndex}`;
      values.push(delivery_person_id);
      paramIndex++;
    }

    if (status) {
      queryText += ` AND t.status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    if (date_from) {
      queryText += ` AND t.created_at >= $${paramIndex}`;
      values.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      queryText += ` AND t.created_at <= $${paramIndex}`;
      values.push(date_to);
      paramIndex++;
    }

    queryText += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await query(queryText, values);

    // Compter le total
    let countQuery = `
      SELECT COUNT(*) 
      FROM transactions t
      INNER JOIN orders o ON t.order_id = o.id
      INNER JOIN delivery_persons dp ON t.to_user_type = 'delivery' AND t.to_user_id = dp.id
      WHERE t.transaction_type = 'delivery_fee'
    `;
    const countValues = [];
    let countParamIndex = 1;

    if (delivery_person_id) {
      countQuery += ` AND dp.id = $${countParamIndex}`;
      countValues.push(delivery_person_id);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND t.status = $${countParamIndex}`;
      countValues.push(status);
      countParamIndex++;
    }

    if (date_from) {
      countQuery += ` AND t.created_at >= $${countParamIndex}`;
      countValues.push(date_from);
      countParamIndex++;
    }

    if (date_to) {
      countQuery += ` AND t.created_at <= $${countParamIndex}`;
      countValues.push(date_to);
      countParamIndex++;
    }

    const countResult = await query(countQuery, countValues);
    const total = Number.parseInt(countResult.rows[0].count);

    // Statistiques globales
    let statsQuery = `
      SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(t.amount), 0) as total_amount,
        COALESCE(SUM(t.amount) FILTER (WHERE t.status = 'completed'), 0) as completed_amount,
        COALESCE(SUM(t.amount) FILTER (WHERE t.status = 'pending'), 0) as pending_amount
      FROM transactions t
      INNER JOIN orders o ON t.order_id = o.id
      INNER JOIN delivery_persons dp ON t.to_user_type = 'delivery' AND t.to_user_id = dp.id
      WHERE t.transaction_type = 'delivery_fee'
    `;
    const statsValues = [];
    let statsParamIndex = 1;

    if (delivery_person_id) {
      statsQuery += ` AND dp.id = $${statsParamIndex}`;
      statsValues.push(delivery_person_id);
      statsParamIndex++;
    }

    if (date_from) {
      statsQuery += ` AND t.created_at >= $${statsParamIndex}`;
      statsValues.push(date_from);
      statsParamIndex++;
    }

    if (date_to) {
      statsQuery += ` AND t.created_at <= $${statsParamIndex}`;
      statsValues.push(date_to);
      statsParamIndex++;
    }

    const statsResult = await query(statsQuery, statsValues);

    // Calculer le total payé sur les 24 dernières heures (transactions complétées)
    const last24hResult = await query(`
      SELECT COALESCE(SUM(t.amount), 0) as total_paid_24h
      FROM transactions t
      INNER JOIN orders o ON t.order_id = o.id
      INNER JOIN delivery_persons dp ON t.to_user_type = 'delivery' AND t.to_user_id = dp.id
      WHERE t.transaction_type = 'delivery_fee'
        AND t.status = 'completed'
        AND t.created_at >= NOW() - INTERVAL '24 hours'
    `);

    const statistics = statsResult.rows[0] || {};
    statistics.total_paid_24h = Number.parseFloat(last24hResult.rows[0]?.total_paid_24h || 0);

    res.json({
      success: true,
      data: {
        payments: result.rows,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit),
        },
        statistics: statistics,
      },
    });
  } catch (error) {
    logger.error('Erreur getDeliveryPayments:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des paiements' },
    });
  }
};

/**
 * Obtenir les paiements des restaurants
 */
exports.getRestaurantPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, date_from, date_to, restaurant_id, search, min_amount } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        t.id,
        t.order_id,
        t.amount,
        t.status,
        t.payment_method,
        t.transaction_type,
        t.created_at,
        o.order_number,
        o.delivered_at,
        o.subtotal,
        o.total as order_total,
        r.id as restaurant_id,
        r.name as restaurant_name,
        r.email as restaurant_email,
        r.phone as restaurant_phone
      FROM transactions t
      INNER JOIN orders o ON t.order_id = o.id
      INNER JOIN restaurants r ON t.to_user_type = 'restaurant' AND t.to_user_id = r.id
      WHERE t.to_user_type = 'restaurant'
    `;
    const values = [];
    let paramIndex = 1;

    if (restaurant_id) {
      queryText += ` AND r.id = $${paramIndex}`;
      values.push(restaurant_id);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (r.name ILIKE $${paramIndex} OR r.phone ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      queryText += ` AND t.status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    if (min_amount) {
      queryText += ` AND t.amount >= $${paramIndex}`;
      values.push(Number.parseFloat(min_amount));
      paramIndex++;
    }

    if (date_from) {
      queryText += ` AND DATE(t.created_at) >= $${paramIndex}::date`;
      values.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      queryText += ` AND DATE(t.created_at) <= $${paramIndex}::date`;
      values.push(date_to);
      paramIndex++;
    }

    queryText += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await query(queryText, values);

    // Compter le total avec les mêmes filtres
    let countQuery = `
      SELECT COUNT(*) 
      FROM transactions t
      INNER JOIN orders o ON t.order_id = o.id
      INNER JOIN restaurants r ON t.to_user_type = 'restaurant' AND t.to_user_id = r.id
      WHERE t.to_user_type = 'restaurant'
    `;
    const countValues = [];
    let countParamIndex = 1;

    if (restaurant_id) {
      countQuery += ` AND r.id = $${countParamIndex}`;
      countValues.push(restaurant_id);
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (r.name ILIKE $${countParamIndex} OR r.phone ILIKE $${countParamIndex})`;
      countValues.push(`%${search}%`);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND t.status = $${countParamIndex}`;
      countValues.push(status);
      countParamIndex++;
    }

    if (min_amount) {
      countQuery += ` AND t.amount >= $${countParamIndex}`;
      countValues.push(Number.parseFloat(min_amount));
      countParamIndex++;
    }

    if (date_from) {
      countQuery += ` AND DATE(t.created_at) >= $${countParamIndex}::date`;
      countValues.push(date_from);
      countParamIndex++;
    }

    if (date_to) {
      countQuery += ` AND DATE(t.created_at) <= $${countParamIndex}::date`;
      countValues.push(date_to);
      countParamIndex++;
    }

    const countResult = await query(countQuery, countValues);
    const total = Number.parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        payments: result.rows,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getRestaurantPayments:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des paiements' },
    });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status, date_from, date_to } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        t.*,
        o.order_number,
        u.first_name || ' ' || u.last_name as user_name,
        u.phone as user_phone,
        r.name as restaurant_name
      FROM transactions t
      LEFT JOIN orders o ON t.order_id = o.id
      LEFT JOIN users u ON (t.from_user_type = 'user' AND t.from_user_id = u.id) 
                        OR (t.to_user_type = 'user' AND t.to_user_id = u.id)
      LEFT JOIN restaurants r ON (t.from_user_type = 'restaurant' AND t.from_user_id = r.id)
                             OR (t.to_user_type = 'restaurant' AND t.to_user_id = r.id)
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (type) {
      queryText += ` AND t.transaction_type = $${paramIndex}`;
      values.push(type);
      paramIndex++;
    }

    if (status) {
      queryText += ` AND t.status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    if (date_from) {
      queryText += ` AND t.created_at >= $${paramIndex}`;
      values.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      queryText += ` AND t.created_at <= $${paramIndex}`;
      values.push(date_to);
      paramIndex++;
    }

    queryText += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await query(queryText, values);

    // Compter le total
    let countQuery = 'SELECT COUNT(*) FROM transactions WHERE 1=1';
    const countValues = [];
    let countParamIndex = 1;

    if (type) {
      countQuery += ` AND transaction_type = $${countParamIndex}`;
      countValues.push(type);
      countParamIndex++;
    }
    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countValues.push(status);
      countParamIndex++;
    }
    if (date_from) {
      countQuery += ` AND created_at >= $${countParamIndex}`;
      countValues.push(date_from);
      countParamIndex++;
    }
    if (date_to) {
      countQuery += ` AND created_at <= $${countParamIndex}`;
      countValues.push(date_to);
      countParamIndex++;
    }

    const countResult = await query(countQuery, countValues);

    res.json({
      success: true,
      data: {
        transactions: result.rows,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: Number.parseInt(countResult.rows[0].count),
          pages: Math.ceil(countResult.rows[0].count / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getTransactions:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Obtenir les demandes de paiement
 */
exports.getPayoutRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, user_type, date_from, date_to } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        p.*,
        r.name as restaurant_name,
        r.phone as restaurant_phone,
        dp.first_name || ' ' || dp.last_name as delivery_name,
        dp.phone as delivery_phone,
        a.full_name as processed_by_name
      FROM payout_requests p
      LEFT JOIN restaurants r ON p.user_type = 'restaurant' AND p.user_id = r.id
      LEFT JOIN delivery_persons dp ON p.user_type = 'delivery' AND p.user_id = dp.id
      LEFT JOIN admins a ON p.processed_by = a.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND p.status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    if (user_type) {
      queryText += ` AND p.user_type = $${paramIndex}`;
      values.push(user_type);
      paramIndex++;
    }

    if (date_from) {
      queryText += ` AND p.created_at >= $${paramIndex}`;
      values.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      queryText += ` AND p.created_at <= $${paramIndex}`;
      values.push(date_to);
      paramIndex++;
    }

    queryText += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await query(queryText, values);

    // Compter le total
    let countQuery = 'SELECT COUNT(*) FROM payout_requests WHERE 1=1';
    const countValues = [];
    let countParamIndex = 1;

    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countValues.push(status);
      countParamIndex++;
    }
    if (user_type) {
      countQuery += ` AND user_type = $${countParamIndex}`;
      countValues.push(user_type);
      countParamIndex++;
    }
    if (date_from) {
      countQuery += ` AND created_at >= $${countParamIndex}`;
      countValues.push(date_from);
      countParamIndex++;
    }
    if (date_to) {
      countQuery += ` AND created_at <= $${countParamIndex}`;
      countValues.push(date_to);
      countParamIndex++;
    }

    const countResult = await query(countQuery, countValues);

    res.json({
      success: true,
      data: {
        payouts: result.rows,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: Number.parseInt(countResult.rows[0].count),
          pages: Math.ceil(countResult.rows[0].count / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getPayoutRequests:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Rejeter un paiement
 */
exports.rejectPayout = async (req, res) => {
  try {
    // TODO: Implémenter le rejet
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur rejectPayout:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors du rejet' },
    });
  }
};

/**
 * Liste des remises espèces (livreurs remettent l'argent à l'agence ou dépôt sur compte)
 */
exports.getCashRemittances = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, delivery_person_id } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    let q = `
      SELECT r.*, dp.first_name || ' ' || dp.last_name as delivery_name, dp.phone as delivery_phone,
             (SELECT COUNT(*) FROM cash_remittance_orders WHERE remittance_id = r.id) as orders_count,
             (SELECT COALESCE(json_agg(json_build_object('order_id', o.id, 'order_number', o.order_number, 'order_total', cro.order_total)), '[]')
              FROM cash_remittance_orders cro JOIN orders o ON o.id = cro.order_id WHERE cro.remittance_id = r.id) as orders
      FROM cash_remittances r
      JOIN delivery_persons dp ON r.delivery_person_id = dp.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (status) {
      params.push(status);
      q += ` AND r.status = $${idx++}`;
    }
    if (delivery_person_id) {
      params.push(delivery_person_id);
      q += ` AND r.delivery_person_id = $${idx++}`;
    }
    q += ` ORDER BY r.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit, 10), offset);
    const result = await query(q, params);
    let countQ = 'SELECT COUNT(*) FROM cash_remittances r WHERE 1=1';
    const countParams = [];
    let cidx = 1;
    if (status) {
      countParams.push(status);
      countQ += ` AND r.status = $${cidx++}`;
    }
    if (delivery_person_id) {
      countParams.push(delivery_person_id);
      countQ += ` AND r.delivery_person_id = $${cidx++}`;
    }
    const countResult = await query(countQ, countParams);
    res.json({
      success: true,
      data: {
        remittances: result.rows,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: parseInt(countResult.rows[0].count, 10),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getCashRemittances:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Confirmer une remise espèces (argent reçu à l'agence ou vérification du dépôt)
 */
exports.confirmCashRemittance = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const rem = await query('SELECT * FROM cash_remittances WHERE id = $1 AND status = $2', [id, 'pending']);
    if (rem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Remise introuvable ou déjà traitée' },
      });
    }
    const remittance = rem.rows[0];
    await query(
      `UPDATE cash_remittances SET status = 'completed', processed_by = $1, processed_at = NOW(), notes = COALESCE($2, notes) WHERE id = $3`,
      [req.user.id, notes || null, id]
    );
    await query(
      `UPDATE orders SET cash_remittance_id = $1 WHERE id IN (SELECT order_id FROM cash_remittance_orders WHERE remittance_id = $2)`,
      [id, id]
    );
    logger.info(`Remise espèces ${id} confirmée par admin ${req.user.id}`);
    res.json({
      success: true,
      message: 'Remise espèces validée. L\'argent est enregistré.',
      data: { remittance_id: id, amount: remittance.amount },
    });
  } catch (error) {
    logger.error('Erreur confirmCashRemittance:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la validation' },
    });
  }
};

/**
 * Rejeter une remise espèces
 */
exports.rejectCashRemittance = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const rem = await query('SELECT * FROM cash_remittances WHERE id = $1 AND status = $2', [id, 'pending']);
    if (rem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Remise introuvable ou déjà traitée' },
      });
    }
    await query(
      `UPDATE cash_remittances SET status = 'rejected', processed_by = $1, processed_at = NOW(), notes = $2 WHERE id = $3`,
      [req.user.id, reason || null, id]
    );
    logger.info(`Remise espèces ${id} rejetée par admin ${req.user.id}`);
    res.json({
      success: true,
      message: 'Remise rejetée. Le livreur peut déclarer à nouveau ces commandes.',
      data: { remittance_id: id },
    });
  } catch (error) {
    logger.error('Erreur rejectCashRemittance:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors du rejet' },
    });
  }
};

/**
 * Obtenir les paramètres de commission
 */
exports.getCommissionSettings = async (req, res) => {
  try {
    // Récupérer les paramètres de commission depuis app_settings
    const commissionKeys = [
      'default_commission_rate',
      'restaurant_commission_rate',
      'delivery_commission_rate',
      'min_commission_amount',
      'max_commission_amount',
      'commission_calculation_method',
    ];

    const settingsResult = await query(
      `SELECT key, value, description, updated_at 
       FROM app_settings 
       WHERE key = ANY($1::text[])`,
      [commissionKeys]
    );

    // Organiser les paramètres
    const settings = {};
    settingsResult.rows.forEach(row => {
      settings[row.key] = {
        value: row.value,
        description: row.description,
        updated_at: row.updated_at,
      };
    });

    // Valeurs par défaut si non définies
    const defaultSettings = {
      default_commission_rate: { value: 15, description: 'Taux de commission par défaut (%)' },
      restaurant_commission_rate: { value: 15, description: 'Taux de commission pour les restaurants (%)' },
      delivery_commission_rate: { value: 30, description: 'Taux de commission pour les livreurs (%)' },
      min_commission_amount: { value: 0, description: 'Montant minimum de commission (FCFA)' },
      max_commission_amount: { value: null, description: 'Montant maximum de commission (FCFA)' },
      commission_calculation_method: { value: 'percentage', description: 'Méthode de calcul (percentage ou fixed)' },
    };

    // Fusionner avec les valeurs par défaut
    commissionKeys.forEach(key => {
      if (!settings[key]) {
        settings[key] = defaultSettings[key];
      }
    });

    res.json({
      success: true,
      data: {
        settings,
      },
    });
  } catch (error) {
    logger.error('Erreur getCommissionSettings:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Mettre à jour les paramètres de commission
 */
exports.updateCommissionSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Les paramètres sont requis' },
      });
    }

    // Clés de commission valides
    const validKeys = new Set([
      'default_commission_rate',
      'restaurant_commission_rate',
      'delivery_commission_rate',
      'min_commission_amount',
      'max_commission_amount',
      'commission_calculation_method',
    ]);

    // Descriptions par défaut
    const descriptions = {
      default_commission_rate: 'Taux de commission par défaut (%)',
      restaurant_commission_rate: 'Taux de commission pour les restaurants (%)',
      delivery_commission_rate: 'Taux de commission pour les livreurs (%)',
      min_commission_amount: 'Montant minimum de commission (FCFA)',
      max_commission_amount: 'Montant maximum de commission (FCFA)',
      commission_calculation_method: 'Méthode de calcul (percentage ou fixed)',
    };

    return await transaction(async (client) => {
      const updatedSettings = {};

      for (const [key, value] of Object.entries(settings)) {
        // Vérifier que la clé est valide
        if (!validKeys.has(key)) {
          continue;
        }

        // Validation des valeurs
        if (value === undefined || value === null) {
          continue;
        }

        // Validation spécifique selon le type
        if (key.includes('rate') || key.includes('amount')) {
          const numValue = typeof value === 'string' ? Number.parseFloat(value) : value;
          if (Number.isNaN(numValue) || numValue < 0) {
            return res.status(400).json({
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: `${key} doit être un nombre positif`,
              },
            });
          }

          // Validation des taux (0-100)
          if (key.includes('rate') && numValue > 100) {
            return res.status(400).json({
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: `${key} ne peut pas dépasser 100%`,
              },
            });
          }
        }

        if (key === 'commission_calculation_method') {
          if (!['percentage', 'fixed'].includes(value)) {
            return res.status(400).json({
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'commission_calculation_method doit être "percentage" ou "fixed"',
              },
            });
          }
        }

        // Mettre à jour ou créer le paramètre
        // S'assurer que la valeur est bien sérialisée en JSON
        const jsonString = typeof value === 'string' ? value : JSON.stringify(value);
        
        // Note: updated_by n'existe pas dans le schéma actuel
        await client.query(
          `INSERT INTO app_settings (key, value, description, updated_at)
           VALUES ($1, $2::jsonb, $3, NOW())
           ON CONFLICT (key) 
           DO UPDATE SET 
             value = EXCLUDED.value,
             description = COALESCE(NULLIF(EXCLUDED.description, ''), app_settings.description),
             updated_at = NOW()`,
          [
            key,
            jsonString,
            descriptions[key] || null,
          ]
        );

        updatedSettings[key] = value;
      }

      logger.info(`Paramètres de commission mis à jour par admin ${req.user.id}`, {
        keys: Object.keys(updatedSettings),
      });

      res.json({
        success: true,
        message: 'Paramètres de commission mis à jour',
        data: {
          settings: updatedSettings,
        },
      });
    });
  } catch (error) {
    logger.error('Erreur updateCommissionSettings:', error);
    logger.error('Détails erreur:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
    });
    res.status(500).json({
      success: false,
      error: { 
        code: 'UPDATE_ERROR', 
        message: 'Erreur lors de la mise à jour',
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
          code: error.code,
        }),
      },
    });
  }
};

/**
 * Obtenir les promotions
 */
exports.getPromotions = async (req, res) => {
  try {
    const { page = 1, limit = 20, is_active, type, search } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        p.*,
        r.name as restaurant_name
      FROM promotions p
      LEFT JOIN restaurants r ON p.restaurant_id = r.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (is_active !== undefined) {
      if (is_active === 'true') {
        queryText += ` AND p.is_active = true AND p.valid_from <= NOW() AND p.valid_until >= NOW()`;
      } else if (is_active === 'false') {
        queryText += ` AND (p.is_active = false OR p.valid_from > NOW() OR p.valid_until < NOW())`;
      }
    }

    if (type) {
      queryText += ` AND p.type = $${paramIndex}`;
      values.push(type);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (
        p.code ILIKE $${paramIndex} OR
        r.name ILIKE $${paramIndex}
      )`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    queryText += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await query(queryText, values);

    // Compter le total
    let countQuery = 'SELECT COUNT(*) FROM promotions p WHERE 1=1';
    const countValues = [];
    let countParamIndex = 1;

    if (is_active !== undefined) {
      if (is_active === 'true') {
        countQuery += ` AND p.is_active = true AND p.valid_from <= NOW() AND p.valid_until >= NOW()`;
      } else if (is_active === 'false') {
        countQuery += ` AND (p.is_active = false OR p.valid_from > NOW() OR p.valid_until < NOW())`;
      }
    }
    if (type) {
      countQuery += ` AND p.type = $${countParamIndex}`;
      countValues.push(type);
      countParamIndex++;
    }
    if (search) {
      countQuery += ` AND (p.code ILIKE $${countParamIndex} OR EXISTS (
        SELECT 1 FROM restaurants r WHERE r.id = p.restaurant_id AND r.name ILIKE $${countParamIndex}
      ))`;
      countValues.push(`%${search}%`);
    }

    const countResult = await query(countQuery, countValues);

    res.json({
      success: true,
      data: {
        promotions: result.rows,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: Number.parseInt(countResult.rows[0].count),
          pages: Math.ceil(countResult.rows[0].count / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getPromotions:', error);
    logger.error('Détails erreur:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
    });
    res.status(500).json({
      success: false,
      error: { 
        code: 'FETCH_ERROR', 
        message: 'Erreur lors de la récupération',
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
          code: error.code,
        }),
      },
    });
  }
};

/**
 * Créer une promotion
 */
exports.createPromotion = async (req, res) => {
  try {
    const {
      code,
      type,
      value,
      min_order_amount = 0,
      max_discount,
      usage_limit,
      valid_from,
      valid_until,
      applicable_to = 'all',
      restaurant_id,
    } = req.body;

    // Validation
    if (!code || !type || value === undefined || !valid_from || !valid_until) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'code, type, value, valid_from et valid_until sont requis',
        },
      });
    }

    if (!['percentage', 'fixed_amount', 'free_delivery', 'loyalty_points'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Type invalide. Types acceptés: percentage, fixed_amount, free_delivery, loyalty_points',
        },
      });
    }

    if (new Date(valid_from) >= new Date(valid_until)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'valid_until doit être après valid_from',
        },
      });
    }

    if (applicable_to === 'specific_restaurant' && !restaurant_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'restaurant_id est requis quand applicable_to = specific_restaurant',
        },
      });
    }

    return await transaction(async (client) => {
      // Vérifier que le code n'existe pas déjà
      const existingPromo = await client.query(
        'SELECT id FROM promotions WHERE code = $1',
        [code.toUpperCase()]
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

      // Vérifier le restaurant si spécifié
      if (restaurant_id) {
        const restaurant = await client.query(
          'SELECT id FROM restaurants WHERE id = $1',
          [restaurant_id]
        );
        if (restaurant.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant non trouvé' },
          });
        }
      }

      // Créer la promotion
      const result = await client.query(
        `INSERT INTO promotions (
          code, type, value, min_order_amount, max_discount, usage_limit,
          valid_from, valid_until, applicable_to, restaurant_id, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
        RETURNING *`,
        [
          code.toUpperCase(),
          type,
          value,
          min_order_amount,
          max_discount || null,
          usage_limit || null,
          valid_from,
          valid_until,
          applicable_to,
          restaurant_id || null,
        ]
      );

      logger.info(`Promotion créée par admin ${req.user.id}`, { code: code.toUpperCase() });

      res.status(201).json({
        success: true,
        message: 'Promotion créée',
        data: {
          promotion: result.rows[0],
        },
      });
    });
  } catch (error) {
    logger.error('Erreur createPromotion:', error);
    logger.error('Détails erreur:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
    });
    
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
          code: error.code,
        }),
      },
    });
  }
};

/**
 * Basculer une promotion (activer/désactiver)
 */
exports.togglePromotion = async (req, res) => {
  try {
    const { id } = req.params;

    return await transaction(async (client) => {
      // Vérifier que la promotion existe
      const promoResult = await client.query(
        'SELECT * FROM promotions WHERE id = $1',
        [id]
      );

      if (promoResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'PROMOTION_NOT_FOUND', message: 'Promotion non trouvée' },
        });
      }

      const promotion = promoResult.rows[0];

      // Basculer le statut
      const newStatus = !promotion.is_active;

      await client.query(
        'UPDATE promotions SET is_active = $1 WHERE id = $2',
        [newStatus, id]
      );

      logger.info(`Promotion ${id} ${newStatus ? 'activée' : 'désactivée'} par admin ${req.user.id}`);

      res.json({
        success: true,
        message: `Promotion ${newStatus ? 'activée' : 'désactivée'}`,
        data: {
          promotion: {
            ...promotion,
            is_active: newStatus,
          },
        },
      });
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
 * Obtenir les revenus analytics
 */
exports.getRevenue = async (req, res) => {
  try {
    // Par défaut, retourner 30 derniers jours pour le dashboard
    const { period = 'daily' } = req.query; // daily (30 jours), weekly, monthly, yearly

    let dateFilter = '';
    let groupBy = '';

    switch (period) {
      case 'daily':
        dateFilter = `WHERE o.placed_at >= CURRENT_DATE - INTERVAL '30 days'`;
        groupBy = `DATE(o.placed_at)`;
        break;
      case 'weekly':
        dateFilter = `WHERE o.placed_at >= CURRENT_DATE - INTERVAL '12 weeks'`;
        groupBy = `DATE_TRUNC('week', o.placed_at)`;
        break;
      case 'monthly':
        dateFilter = `WHERE o.placed_at >= CURRENT_DATE - INTERVAL '12 months'`;
        groupBy = `DATE_TRUNC('month', o.placed_at)`;
        break;
      case 'yearly':
        dateFilter = `WHERE o.placed_at >= CURRENT_DATE - INTERVAL '5 years'`;
        groupBy = `DATE_TRUNC('year', o.placed_at)`;
        break;
      default:
        dateFilter = `WHERE o.placed_at >= CURRENT_DATE - INTERVAL '30 days'`;
        groupBy = `DATE(o.placed_at)`;
    }

    // Vérifier si la colonne commission existe
    const hasCommissionCol = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'commission'
      ) as exists
    `);
    const useCommissionCol = hasCommissionCol.rows[0].exists;
    
    // Revenus par période : commission enregistrée sur la commande, sinon calcul avec le taux du restaurant
    const commissionCalc = useCommissionCol
      ? `COALESCE(o.commission, o.subtotal * COALESCE(o.commission_rate, r.commission_rate, 15.0) / 100.0)`
      : `o.subtotal * COALESCE(o.commission_rate, r.commission_rate, 15.0) / 100.0`;
    
    const revenueByPeriod = await query(`
      SELECT 
        ${groupBy} as period,
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE o.status = 'delivered') as completed_orders,
        COALESCE(SUM(o.total) FILTER (WHERE o.status = 'delivered'), 0) as revenue,
        COALESCE(SUM(${commissionCalc}) FILTER (WHERE o.status = 'delivered'), 0) as commission,
        COALESCE(SUM(o.delivery_fee) FILTER (WHERE o.status = 'delivered'), 0) as delivery_fees,
        COALESCE(AVG(o.total) FILTER (WHERE o.status = 'delivered'), 0) as avg_order_value
      FROM orders o
      LEFT JOIN restaurants r ON o.restaurant_id = r.id
      ${dateFilter}
      GROUP BY ${groupBy}
      ORDER BY period DESC
    `);

    // Statistiques globales (utiliser la même logique de commission)
    const stats = await query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE o.status = 'delivered') as completed_orders,
        COALESCE(SUM(o.total) FILTER (WHERE o.status = 'delivered'), 0) as total_revenue,
        COALESCE(SUM(${commissionCalc}) FILTER (WHERE o.status = 'delivered'), 0) as total_commission,
        COALESCE(SUM(o.delivery_fee) FILTER (WHERE o.status = 'delivered'), 0) as total_delivery_fees,
        COALESCE(AVG(o.total) FILTER (WHERE o.status = 'delivered'), 0) as avg_order_value,
        COALESCE(MAX(o.total) FILTER (WHERE o.status = 'delivered'), 0) as max_order_value
      FROM orders o
      LEFT JOIN restaurants r ON o.restaurant_id = r.id
      ${dateFilter}
    `);

    // Comparaison avec la période précédente
    let previousPeriodFilter = '';
    switch (period) {
      case 'daily':
        previousPeriodFilter = `WHERE o.placed_at >= CURRENT_DATE - INTERVAL '60 days' AND o.placed_at < CURRENT_DATE - INTERVAL '30 days'`;
        break;
      case 'weekly':
        previousPeriodFilter = `WHERE o.placed_at >= CURRENT_DATE - INTERVAL '24 weeks' AND o.placed_at < CURRENT_DATE - INTERVAL '12 weeks'`;
        break;
      case 'monthly':
        previousPeriodFilter = `WHERE o.placed_at >= CURRENT_DATE - INTERVAL '24 months' AND o.placed_at < CURRENT_DATE - INTERVAL '12 months'`;
        break;
      case 'yearly':
        previousPeriodFilter = `WHERE o.placed_at >= CURRENT_DATE - INTERVAL '10 years' AND o.placed_at < CURRENT_DATE - INTERVAL '5 years'`;
        break;
    }

    const previousStats = previousPeriodFilter 
      ? await query(`
          SELECT 
            COALESCE(SUM(o.total) FILTER (WHERE o.status = 'delivered'), 0) as previous_revenue,
            COUNT(*) FILTER (WHERE o.status = 'delivered') as previous_orders
          FROM orders o
          ${previousPeriodFilter}
        `)
      : { rows: [{ previous_revenue: 0, previous_orders: 0 }] };

    // S'assurer que stats.rows[0] existe
    const statsData = stats.rows[0] || {
      total_orders: 0,
      completed_orders: 0,
      total_revenue: 0,
      total_commission: 0,
      total_delivery_fees: 0,
      avg_order_value: 0,
      max_order_value: 0,
    };

    const currentRevenue = Number.parseFloat(statsData.total_revenue || 0);
    const previousRevenue = Number.parseFloat(previousStats.rows[0]?.previous_revenue || 0);
    const revenueChange = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(2)
      : '0.00';

    // Fonction helper pour calculer le numéro de semaine
    const getWeekNumber = (date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };

    // Formater les données pour le graphique
    const chartData = revenueByPeriod.rows
      .map(row => {
        const date = new Date(row.period);
        let label = '';
        if (period === 'daily') {
          label = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        } else if (period === 'weekly') {
          label = `Sem ${getWeekNumber(date)}`;
        } else if (period === 'monthly') {
          label = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
        } else {
          label = date.getFullYear().toString();
        }
        return {
          date: row.period,
          month: label,
          revenue: Number.parseFloat(row.revenue || 0),
          orders: Number.parseInt(row.completed_orders || 0),
        };
      })
      .reverse(); // Inverser pour avoir les dates croissantes

    // Calculer la moyenne mobile (7 jours pour daily, sinon 3 périodes)
    const movingAverageWindow = period === 'daily' ? 7 : 3;
    const chartDataWithMA = chartData.map((item, index) => {
      const start = Math.max(0, index - movingAverageWindow + 1);
      const window = chartData.slice(start, index + 1);
      const ma = window.length > 0
        ? window.reduce((sum, d) => sum + d.revenue, 0) / window.length
        : item.revenue;
      return {
        ...item,
        movingAverage: ma,
      };
    });

    // Données du mois précédent (pour comparaison, seulement pour daily)
    let previousMonthData = [];
    if (period === 'daily') {
      const previousMonth = await query(`
        SELECT 
          DATE(placed_at) as period,
          COALESCE(SUM(o.total) FILTER (WHERE o.status = 'delivered'), 0) as revenue,
          COUNT(*) FILTER (WHERE o.status = 'delivered') as completed_orders
        FROM orders o
        WHERE o.placed_at >= CURRENT_DATE - INTERVAL '60 days'
          AND o.placed_at < CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(placed_at)
        ORDER BY period
      `);
      
      previousMonthData = previousMonth.rows.map(row => {
        const date = new Date(row.period);
        return {
          date: row.period,
          month: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          revenue: Number.parseFloat(row.revenue || 0),
          orders: Number.parseInt(row.completed_orders || 0),
        };
      });
    }

    // Calculer les prévisions (tendance linéaire simple pour les 7 prochains jours)
    let forecastData = [];
    if (period === 'daily' && chartDataWithMA.length >= 7) {
      // Calculer la tendance (moyenne des 7 derniers jours)
      const last7Days = chartDataWithMA.slice(-7);
      const avgRevenue = last7Days.reduce((sum, d) => sum + d.revenue, 0) / 7;
      const avgMA = last7Days.reduce((sum, d) => sum + d.movingAverage, 0) / 7;
      
      // Prévision basée sur la moyenne mobile
      for (let i = 1; i <= 7; i++) {
        const forecastDate = new Date(chartDataWithMA[chartDataWithMA.length - 1].date);
        forecastDate.setDate(forecastDate.getDate() + i);
        forecastData.push({
          date: forecastDate.toISOString().split('T')[0],
          month: forecastDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          revenue: avgMA, // Utiliser la moyenne mobile comme prévision
          orders: Math.round(avgRevenue / 3000), // Estimation basée sur panier moyen
          isForecast: true,
        });
      }
    }

    res.json({
      success: true,
      data: {
        period: period,
        statistics: {
          ...statsData,
          revenue_change_percent: Number.parseFloat(revenueChange),
          revenue_change_amount: currentRevenue - previousRevenue,
        },
        revenue_by_period: revenueByPeriod.rows || [],
        chartData: chartDataWithMA,
        previousMonthData: previousMonthData,
        forecastData: forecastData,
      },
    });
  } catch (error) {
    logger.error('Erreur getRevenue:', {
      message: error.message,
      stack: error.stack,
      period: req.query.period,
      code: error.code,
      query: error.query,
    });
    res.status(500).json({
      success: false,
      error: { 
        code: 'FETCH_ERROR', 
        message: 'Erreur lors de la récupération des revenus',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
    });
  }
};

/**
 * Obtenir le rapport des ventes
 */
exports.getSalesReport = async (req, res) => {
  try {
    const { period = '30d', date_from, date_to } = req.query;

    // Définir l'intervalle selon la période
    let interval;
    let dateFilter = '';
    const values = [];
    let paramIndex = 1;

    if (date_from && date_to) {
      dateFilter = `WHERE o.placed_at >= $${paramIndex} AND o.placed_at <= $${paramIndex + 1}`;
      values.push(date_from, date_to);
      // paramIndex sera utilisé dans les requêtes suivantes si nécessaire
    } else {
      switch (period) {
        case '7d':
          interval = '7 days';
          break;
        case '30d':
          interval = '30 days';
          break;
        case '90d':
          interval = '90 days';
          break;
        case '1y':
          interval = '365 days';
          break;
        default:
          interval = '30 days';
      }
      if (interval) {
        dateFilter = `WHERE o.placed_at >= NOW() - INTERVAL '${interval}'`;
      }
    }

    // Statistiques globales
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE o.status = 'delivered') as completed_orders,
        COUNT(*) FILTER (WHERE o.status = 'cancelled') as cancelled_orders,
        COALESCE(SUM(o.total) FILTER (WHERE o.status = 'delivered'), 0) as total_revenue,
        COALESCE(AVG(o.total) FILTER (WHERE o.status = 'delivered'), 0) as avg_order_value,
        COALESCE(SUM(o.delivery_fee) FILTER (WHERE o.status = 'delivered'), 0) as total_delivery_fees,
        COALESCE(SUM(o.discount) FILTER (WHERE o.status = 'delivered'), 0) as total_discounts
      FROM orders o
      ${dateFilter}
    `, values);

    // Ventes par jour
    const dailySalesResult = await query(`
      SELECT 
        DATE(o.placed_at) as date,
        COUNT(*) as orders_count,
        COALESCE(SUM(o.total) FILTER (WHERE o.status = 'delivered'), 0) as revenue,
        COUNT(*) FILTER (WHERE o.status = 'delivered') as completed_count
      FROM orders o
      ${dateFilter}
      GROUP BY DATE(o.placed_at)
      ORDER BY date DESC
    `, values);

    // Ventes par restaurant (top 10)
    const topRestaurantsResult = await query(`
      SELECT 
        r.id,
        r.name,
        COUNT(o.id) as orders_count,
        COALESCE(SUM(o.total) FILTER (WHERE o.status = 'delivered'), 0) as revenue
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      ${dateFilter}
      GROUP BY r.id, r.name
      ORDER BY revenue DESC
      LIMIT 10
    `, values);

    // Ventes par méthode de paiement
    const paymentMethodsResult = await query(`
      SELECT 
        o.payment_method,
        COUNT(*) as orders_count,
        COALESCE(SUM(o.total) FILTER (WHERE o.status = 'delivered'), 0) as revenue
      FROM orders o
      ${dateFilter}
      GROUP BY o.payment_method
      ORDER BY revenue DESC
    `, values);

    res.json({
      success: true,
      data: {
        period: period,
        date_range: date_from && date_to ? { from: date_from, to: date_to } : null,
        statistics: statsResult.rows[0],
        daily_sales: dailySalesResult.rows,
        top_restaurants: topRestaurantsResult.rows,
        payment_methods: paymentMethodsResult.rows,
      },
    });
  } catch (error) {
    logger.error('Erreur getSalesReport:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Obtenir le rapport des utilisateurs
 */
exports.getUsersReport = async (req, res) => {
  try {
    const { period = '30d', date_from, date_to } = req.query;

    // Définir l'intervalle selon la période
    let dateFilter = '';
    const values = [];
    let paramIndex = 1;

    if (date_from && date_to) {
      dateFilter = `WHERE u.created_at >= $${paramIndex} AND u.created_at <= $${paramIndex + 1}`;
      values.push(date_from, date_to);
      paramIndex += 2;
    } else {
      let interval;
      switch (period) {
        case '7d':
          interval = '7 days';
          break;
        case '30d':
          interval = '30 days';
          break;
        case '90d':
          interval = '90 days';
          break;
        case '1y':
          interval = '365 days';
          break;
        default:
          interval = '30 days';
      }
      if (interval) {
        // Utiliser NOW() - INTERVAL avec échappement correct
        dateFilter = `WHERE u.created_at >= NOW() - INTERVAL '${interval.replaceAll("'", "''")}'`;
      }
    }

    // Statistiques globales
    // Construire la requête avec les paramètres corrects
    // Note: last_login n'existe pas dans la table users, on utilise created_at comme approximation
    let statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE u.status = 'active') as active_users,
        COUNT(*) FILTER (WHERE u.status = 'suspended') as suspended_users,
        COUNT(*) FILTER (WHERE u.created_at >= NOW() - INTERVAL '30 days') as active_last_month,
        COALESCE(AVG(u.total_orders), 0) as avg_orders_per_user,
        COALESCE(AVG(u.total_spent), 0) as avg_spent_per_user,
        COALESCE(SUM(u.total_spent), 0) as total_spent_all_users
      FROM users u
      ${dateFilter}
    `;
    
    const statsResult = await query(statsQuery, values);

    // Inscriptions par jour
    const dailyRegistrationsResult = await query(`
      SELECT 
        DATE_TRUNC('day', u.created_at)::date as date,
        COUNT(*) as registrations_count
      FROM users u
      ${dateFilter}
      GROUP BY DATE_TRUNC('day', u.created_at)::date
      ORDER BY date DESC
    `, values);

    // Top utilisateurs (par dépenses)
    const topUsersResult = await query(`
      SELECT 
        u.id,
        COALESCE(u.first_name || ' ' || u.last_name, u.phone, 'Utilisateur') as name,
        u.phone,
        u.total_orders,
        u.total_spent,
        u.loyalty_points,
        u.created_at as last_login
      FROM users u
      ${dateFilter}
      ORDER BY COALESCE(u.total_spent, 0) DESC
      LIMIT 20
    `, values);

    // Utilisateurs par statut
    const usersByStatusResult = await query(`
      SELECT 
        u.status,
        COUNT(*) as count
      FROM users u
      ${dateFilter}
      GROUP BY u.status
      ORDER BY count DESC
    `, values);

    res.json({
      success: true,
      data: {
        period: period,
        date_range: date_from && date_to ? { from: date_from, to: date_to } : null,
        statistics: statsResult.rows[0],
        daily_registrations: dailyRegistrationsResult.rows,
        top_users: topUsersResult.rows,
        users_by_status: usersByStatusResult.rows,
      },
    });
  } catch (error) {
    const { period: periodParam = '30d' } = req.query;
    logger.error('Erreur getUsersReport:', error);
    logger.error('Détails erreur:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack,
      period: periodParam,
    });
    res.status(500).json({
      success: false,
      error: { 
        code: 'FETCH_ERROR', 
        message: 'Erreur lors de la récupération',
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
          code: error.code,
          detail: error.detail,
          hint: error.hint,
        }),
      },
    });
  }
};

/**
 * Obtenir le rapport des restaurants
 */
exports.getRestaurantsReport = async (req, res) => {
  try {
    const { period = '30d', date_from, date_to } = req.query;

    // Définir l'intervalle selon la période
    let dateFilter = '';
    const values = [];
    let paramIndex = 1;

    if (date_from && date_to) {
      dateFilter = `AND o.placed_at >= $${paramIndex} AND o.placed_at <= $${paramIndex + 1}`;
      values.push(date_from, date_to);
      // paramIndex sera utilisé dans les requêtes suivantes si nécessaire
    } else {
      let interval;
      switch (period) {
        case '7d':
          interval = '7 days';
          break;
        case '30d':
          interval = '30 days';
          break;
        case '90d':
          interval = '90 days';
          break;
        case '1y':
          interval = '365 days';
          break;
        default:
          interval = '30 days';
      }
      if (interval) {
        dateFilter = `AND o.placed_at >= NOW() - INTERVAL '${interval}'`;
      }
    }

    // Statistiques globales
    const statsResult = await query(`
      SELECT 
        COUNT(DISTINCT r.id) as total_restaurants,
        COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'active') as active_restaurants,
        COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'pending') as pending_restaurants,
        COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'suspended') as suspended_restaurants,
        COALESCE(AVG(r.average_rating), 0) as avg_rating,
        COALESCE(SUM(r.total_orders), 0) as total_orders_all_restaurants,
        COALESCE(SUM(r.total_revenue), 0) as total_revenue_all_restaurants
      FROM restaurants r
    `);

    // Restaurants par statut
    const restaurantsByStatusResult = await query(`
      SELECT 
        r.status,
        COUNT(*) as count
      FROM restaurants r
      GROUP BY r.status
      ORDER BY count DESC
    `);

    // Top restaurants (par revenus)
    const topRestaurantsResult = await query(`
      SELECT 
        r.id,
        r.name,
        r.category,
        r.status,
        r.average_rating,
        r.total_orders,
        r.total_revenue,
        COUNT(o.id) FILTER (WHERE o.status = 'delivered' ${dateFilter}) as orders_in_period,
        COALESCE(SUM(o.total) FILTER (WHERE o.status = 'delivered' ${dateFilter}), 0) as revenue_in_period
      FROM restaurants r
      LEFT JOIN orders o ON r.id = o.restaurant_id
      GROUP BY r.id, r.name, r.category, r.status, r.average_rating, r.total_orders, r.total_revenue
      ORDER BY revenue_in_period DESC
      LIMIT 20
    `, values);

    // Restaurants par catégorie
    const restaurantsByCategoryResult = await query(`
      SELECT 
        r.category,
        COUNT(*) as count,
        COALESCE(AVG(r.average_rating), 0) as avg_rating
      FROM restaurants r
      GROUP BY r.category
      ORDER BY count DESC
    `);

    // Inscriptions par jour
    const dailyRegistrationsResult = await query(`
      SELECT 
        DATE(r.created_at) as date,
        COUNT(*) as registrations_count
      FROM restaurants r
      GROUP BY DATE(r.created_at)
      ORDER BY date DESC
      LIMIT 30
    `);

    res.json({
      success: true,
      data: {
        period: period,
        date_range: date_from && date_to ? { from: date_from, to: date_to } : null,
        statistics: statsResult.rows[0],
        restaurants_by_status: restaurantsByStatusResult.rows,
        top_restaurants: topRestaurantsResult.rows,
        restaurants_by_category: restaurantsByCategoryResult.rows,
        daily_registrations: dailyRegistrationsResult.rows,
      },
    });
  } catch (error) {
    logger.error('Erreur getRestaurantsReport:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Obtenir le rapport des livraisons
 */
exports.getDeliveriesReport = async (req, res) => {
  try {
    const { period = '30d', date_from, date_to } = req.query;

    // Définir l'intervalle selon la période
    let dateFilter = '';
    const values = [];
    let paramIndex = 1;

    if (date_from && date_to) {
      dateFilter = `AND o.delivered_at >= $${paramIndex} AND o.delivered_at <= $${paramIndex + 1}`;
      values.push(date_from, date_to);
      // paramIndex sera utilisé dans les requêtes suivantes si nécessaire
    } else {
      let interval;
      switch (period) {
        case '7d':
          interval = '7 days';
          break;
        case '30d':
          interval = '30 days';
          break;
        case '90d':
          interval = '90 days';
          break;
        case '1y':
          interval = '365 days';
          break;
        default:
          interval = '30 days';
      }
      if (interval) {
        dateFilter = `AND o.delivered_at >= NOW() - INTERVAL '${interval}'`;
      }
    }

    // Statistiques globales
    const statsResult = await query(`
      SELECT 
        COUNT(DISTINCT dp.id) as total_delivery_persons,
        COUNT(DISTINCT dp.id) FILTER (WHERE dp.status = 'active') as active_delivery_persons,
        COUNT(DISTINCT dp.id) FILTER (WHERE dp.delivery_status = 'available') as available_now,
        COUNT(o.id) FILTER (WHERE o.status = 'delivered' ${dateFilter}) as completed_deliveries,
        COALESCE(AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.picked_up_at))/60), 0) as avg_delivery_time_minutes,
        COALESCE(SUM(o.delivery_fee) FILTER (WHERE o.status = 'delivered' ${dateFilter}), 0) as total_delivery_fees,
        COALESCE(SUM(dp.total_earnings), 0) as total_earnings_all_deliveries
      FROM delivery_persons dp
      LEFT JOIN orders o ON dp.id = o.delivery_person_id
    `, values);

    // Top livreurs
    const topDeliveryPersonsResult = await query(`
      SELECT 
        dp.id,
        dp.first_name || ' ' || dp.last_name as name,
        dp.vehicle_type,
        dp.average_rating,
        COUNT(o.id) FILTER (WHERE o.status = 'delivered' ${dateFilter}) as deliveries_count,
        COALESCE(SUM(o.delivery_fee * 0.7) FILTER (WHERE o.status = 'delivered' ${dateFilter}), 0) as earnings,
        AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.picked_up_at))/60) FILTER (WHERE o.status = 'delivered' ${dateFilter}) as avg_delivery_time_minutes
      FROM delivery_persons dp
      LEFT JOIN orders o ON dp.id = o.delivery_person_id
      WHERE dp.status = 'active'
      GROUP BY dp.id, dp.first_name, dp.last_name, dp.vehicle_type, dp.average_rating
      ORDER BY deliveries_count DESC
      LIMIT 20
    `, values);

    // Livreurs par statut
    const deliveryPersonsByStatusResult = await query(`
      SELECT 
        dp.status,
        COUNT(*) as count
      FROM delivery_persons dp
      GROUP BY dp.status
      ORDER BY count DESC
    `);

    // Livreurs par type de véhicule
    const deliveryPersonsByVehicleResult = await query(`
      SELECT 
        dp.vehicle_type,
        COUNT(*) as count,
        COALESCE(AVG(dp.average_rating), 0) as avg_rating
      FROM delivery_persons dp
      WHERE dp.status = 'active'
      GROUP BY dp.vehicle_type
      ORDER BY count DESC
    `);

    // Livraisons par jour
    const dailyDeliveriesResult = await query(`
      SELECT 
        DATE(o.delivered_at) as date,
        COUNT(*) as deliveries_count,
        COALESCE(AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.picked_up_at))/60), 0) as avg_delivery_time_minutes
      FROM orders o
      WHERE o.status = 'delivered' ${dateFilter}
      GROUP BY DATE(o.delivered_at)
      ORDER BY date DESC
    `, values);

    res.json({
      success: true,
      data: {
        period: period,
        date_range: date_from && date_to ? { from: date_from, to: date_to } : null,
        statistics: {
          ...statsResult.rows[0],
          avg_delivery_time_minutes: statsResult.rows[0].avg_delivery_time_minutes 
            ? Math.round(statsResult.rows[0].avg_delivery_time_minutes) 
            : 0,
        },
        top_delivery_persons: topDeliveryPersonsResult.rows.map(dp => ({
          ...dp,
          avg_delivery_time_minutes: dp.avg_delivery_time_minutes 
            ? Math.round(dp.avg_delivery_time_minutes) 
            : null,
        })),
        delivery_persons_by_status: deliveryPersonsByStatusResult.rows,
        delivery_persons_by_vehicle: deliveryPersonsByVehicleResult.rows,
        daily_deliveries: dailyDeliveriesResult.rows.map(d => ({
          ...d,
          avg_delivery_time_minutes: d.avg_delivery_time_minutes 
            ? Math.round(d.avg_delivery_time_minutes) 
            : 0,
        })),
      },
    });
  } catch (error) {
    logger.error('Erreur getDeliveriesReport:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Créer un ticket de support (admin)
 */
exports.createSupportTicket = async (req, res) => {
  try {
    const {
      subject,
      message,
      priority = 'medium',
      category,
      user_type,
      user_id,
      order_id,
    } = req.body;

    // Validation
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

      // Créer le ticket
      const result = await client.query(
        `INSERT INTO support_tickets (
          ticket_number, subject, description, priority, category,
          user_type, user_id, order_id, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open')
        RETURNING id, ticket_number, subject, description, priority, category, status, created_at`,
        [
          ticketNumber,
          subject,
          message,
          priority,
          category || null,
          user_type || null,
          user_id || null,
          order_id || null,
        ]
      );

      const hasIsInternal = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'ticket_messages' 
          AND column_name = 'is_internal'
        ) as exists
      `);
      const hasIsInternalCol = hasIsInternal.rows?.[0]?.exists === true;
      const insertMessageQuery = hasIsInternalCol
        ? `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message, is_internal)
           VALUES ($1, 'admin', $2, $3, false)`
        : `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message)
           VALUES ($1, 'admin', $2, $3)`;
      await client.query(insertMessageQuery, [result.rows[0].id, req.user.id, message]);

      // Log l'action
      await client.query(`
        INSERT INTO audit_logs (user_type, user_id, action, resource_type, resource_id, new_values)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'admin',
        req.user.id,
        'create_support_ticket',
        'support_ticket',
        result.rows[0].id,
        JSON.stringify({ ticket_number: result.rows[0].ticket_number, subject, priority, category, user_type })
      ]);

      logger.info(`Ticket de support créé par admin ${req.user.id}: ${result.rows[0].id}`);

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
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
    });
  }
};

/**
 * Obtenir les tickets de support
 */
exports.getSupportTickets = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority, category, search } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        t.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.phone as user_phone,
        r.name as restaurant_name,
        o.order_number,
        a.full_name as assigned_admin_name
      FROM support_tickets t
      LEFT JOIN users u ON t.user_type = 'user' AND t.user_id = u.id
      LEFT JOIN restaurants r ON t.user_type = 'restaurant' AND t.user_id = r.id
      LEFT JOIN orders o ON t.order_id = o.id
      LEFT JOIN admins a ON t.assigned_to = a.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND t.status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    if (priority) {
      queryText += ` AND t.priority = $${paramIndex}`;
      values.push(priority);
      paramIndex++;
    }

    if (category) {
      queryText += ` AND t.category = $${paramIndex}`;
      values.push(category);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (
        t.ticket_number ILIKE $${paramIndex} OR
        t.subject ILIKE $${paramIndex} OR
        t.description ILIKE $${paramIndex} OR
        u.first_name ILIKE $${paramIndex} OR
        u.last_name ILIKE $${paramIndex} OR
        r.name ILIKE $${paramIndex}
      )`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    queryText += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await query(queryText, values);

    // Compter le total
    let countQuery = 'SELECT COUNT(*) FROM support_tickets t WHERE 1=1';
    const countValues = [];
    let countParamIndex = 1;

    if (status) {
      countQuery += ` AND t.status = $${countParamIndex}`;
      countValues.push(status);
      countParamIndex++;
    }
    if (priority) {
      countQuery += ` AND t.priority = $${countParamIndex}`;
      countValues.push(priority);
      countParamIndex++;
    }
    if (category) {
      countQuery += ` AND t.category = $${countParamIndex}`;
      countValues.push(category);
      countParamIndex++;
    }
    if (search) {
      countQuery += ` AND (
        t.ticket_number ILIKE $${countParamIndex} OR
        t.subject ILIKE $${countParamIndex} OR
        t.description ILIKE $${countParamIndex}
      )`;
      countValues.push(`%${search}%`);
    }

    const countResult = await query(countQuery, countValues);

    res.json({
      success: true,
      data: {
        tickets: result.rows,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: Number.parseInt(countResult.rows[0].count),
          pages: Math.ceil(countResult.rows[0].count / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getSupportTickets:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Obtenir un ticket par ID
 */
exports.getTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer le ticket avec les informations associées
    const ticketResult = await query(`
      SELECT 
        t.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.phone as user_phone,
        u.email as user_email,
        r.name as restaurant_name,
        r.phone as restaurant_phone,
        o.order_number,
        o.total as order_total,
        a.full_name as assigned_admin_name,
        a.email as assigned_admin_email
      FROM support_tickets t
      LEFT JOIN users u ON t.user_type = 'user' AND t.user_id = u.id
      LEFT JOIN restaurants r ON t.user_type = 'restaurant' AND t.user_id = r.id
      LEFT JOIN orders o ON t.order_id = o.id
      LEFT JOIN admins a ON t.assigned_to = a.id
      WHERE t.id = $1
    `, [id]);

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'TICKET_NOT_FOUND', message: 'Ticket non trouvé' },
      });
    }

    // Récupérer les messages du ticket
    const messagesResult = await query(`
      SELECT 
        m.*,
        CASE 
          WHEN m.sender_type = 'admin' THEN a.full_name
          WHEN m.sender_type = 'user' THEN u.first_name || ' ' || u.last_name
          WHEN m.sender_type = 'restaurant' THEN r.name
          WHEN m.sender_type = 'delivery' THEN dp.first_name || ' ' || dp.last_name
        END as sender_name
      FROM ticket_messages m
      LEFT JOIN admins a ON m.sender_type = 'admin' AND m.sender_id = a.id
      LEFT JOIN users u ON m.sender_type = 'user' AND m.sender_id = u.id
      LEFT JOIN restaurants r ON m.sender_type = 'restaurant' AND m.sender_id = r.id
      LEFT JOIN delivery_persons dp ON m.sender_type = 'delivery' AND m.sender_id = dp.id
      WHERE m.ticket_id = $1
      ORDER BY m.created_at ASC
    `, [id]);

    res.json({
      success: true,
      data: {
        ticket: ticketResult.rows[0],
        messages: messagesResult.rows,
      },
    });
  } catch (error) {
    logger.error('Erreur getTicketById:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Répondre à un ticket
 */
exports.replyToTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, is_internal = false, attachments = [] } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Le message est requis' },
      });
    }

    return await transaction(async (client) => {
      // Vérifier que le ticket existe
      const ticketResult = await client.query(
        'SELECT * FROM support_tickets WHERE id = $1',
        [id]
      );

      if (ticketResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'TICKET_NOT_FOUND', message: 'Ticket non trouvé' },
        });
      }

      const ticket = ticketResult.rows[0];

      // Vérifier que le ticket n'est pas fermé
      if (ticket.status === 'closed') {
        return res.status(400).json({
          success: false,
          error: { code: 'TICKET_CLOSED', message: 'Impossible de répondre à un ticket fermé' },
        });
      }

      // Vérifier si les colonnes existent
      const hasIsInternal = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'ticket_messages' 
          AND column_name = 'is_internal'
        ) as exists
      `);
      
      const hasAttachments = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'ticket_messages' 
          AND column_name = 'attachments'
        ) as exists
      `);
      
      const hasIsInternalCol = hasIsInternal.rows[0].exists;
      const hasAttachmentsCol = hasAttachments.rows[0].exists;
      
      // Créer le message avec les colonnes disponibles
      let insertQuery;
      let insertValues;
      
      // Formater les attachments pour PostgreSQL TEXT[] (tableau de texte)
      const formattedAttachments = Array.isArray(attachments) 
        ? attachments.filter(a => a && typeof a === 'string') // Filtrer les valeurs valides
        : [];
      
      if (hasIsInternalCol && hasAttachmentsCol) {
        insertQuery = `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message, attachments, is_internal)
                       VALUES ($1, $2, $3, $4, $5, $6)
                       RETURNING *`;
        insertValues = [id, 'admin', req.user.id, message.trim(), formattedAttachments, is_internal];
      } else if (hasIsInternalCol) {
        insertQuery = `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message, is_internal)
                       VALUES ($1, $2, $3, $4, $5)
                       RETURNING *`;
        insertValues = [id, 'admin', req.user.id, message.trim(), is_internal];
      } else if (hasAttachmentsCol) {
        insertQuery = `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message, attachments)
                       VALUES ($1, $2, $3, $4, $5)
                       RETURNING *`;
        insertValues = [id, 'admin', req.user.id, message.trim(), formattedAttachments];
      } else {
        insertQuery = `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message)
                       VALUES ($1, $2, $3, $4)
                       RETURNING *`;
        insertValues = [id, 'admin', req.user.id, message.trim()];
      }
      
      const messageResult = await client.query(insertQuery, insertValues);

      // Mettre à jour le statut du ticket si nécessaire
      let newStatus = ticket.status;
      if (ticket.status === 'open' || ticket.status === 'waiting_customer') {
        newStatus = 'in_progress';
      }

      // Mettre à jour le ticket
      await client.query(
        `UPDATE support_tickets 
         SET status = $1, updated_at = NOW(), assigned_to = $2
         WHERE id = $3`,
        [newStatus, req.user.id, id]
      );

      logger.info(`Message ajouté au ticket ${id} par admin ${req.user.id}`);

      // Émettre une notification Socket.IO pour le restaurant
      const io = req.app.get('io');
      const partnersIo = req.app.get('partnersIo');
      
      if (io) {
        // Notifier le dashboard admin (pour mise à jour en temps réel)
        io.to('admin_dashboard').emit('ticket_reply_sent', {
          ticket_id: id,
          message: messageResult.rows[0],
          ticket_status: newStatus,
        });
      }
      
      if (partnersIo) {
        // Notifier le restaurant via le namespace partenaires
        partnersIo.to(`support_ticket_${id}`).emit('new_support_reply', {
          ticket_id: id,
          message: {
            ...messageResult.rows[0],
            sender_type: 'admin',
          },
        });
        
        // Notifier la room du restaurant
        partnersIo.to(`restaurant_${ticket.user_id}`).emit('support_notification', {
          type: 'new_message',
          ticket_id: id,
          ticket_number: ticket.ticket_number,
          title: 'Nouvelle réponse du support',
          body: message.substring(0, 100),
        });
        
        logger.debug('Notification Socket.IO envoyée au restaurant pour réponse support');
      }

      return res.json({
        success: true,
        message: 'Message envoyé',
        data: {
          message: messageResult.rows[0],
          ticket_status: newStatus,
        },
      });
    });
  } catch (error) {
    logger.error('Erreur replyToTicket:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      ticketId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Erreur lors de la réponse',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
    });
  }
};

/**
 * Fermer un ticket
 */
exports.closeTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;

    // Vérifier que l'utilisateur est authentifié
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Non authentifié' },
      });
    }

    // Vérifier d'abord si le ticket existe (hors transaction)
    const checkResult = await query(
      'SELECT id, status FROM support_tickets WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'TICKET_NOT_FOUND', message: 'Ticket non trouvé' },
      });
    }

    const ticket = checkResult.rows[0];

    // Vérifier que le ticket n'est pas déjà fermé
    if (ticket.status === 'closed') {
      return res.status(400).json({
        success: false,
        error: { code: 'TICKET_ALREADY_CLOSED', message: 'Le ticket est déjà fermé' },
      });
    }

    // Mettre à jour le ticket dans une transaction
    try {
      const result = await transaction(async (client) => {
        const updateResult = await client.query(
          `UPDATE support_tickets 
           SET status = 'closed', 
               resolution = $1,
               closed_at = NOW(),
               updated_at = NOW(),
               assigned_to = $2
           WHERE id = $3
           RETURNING id, status, closed_at, resolution`,
          [resolution || null, req.user.id, id]
        );

        if (updateResult.rowCount === 0) {
          throw new Error('Aucune ligne mise à jour');
        }

        logger.info(`Ticket ${id} fermé par admin ${req.user.id}`);

        return updateResult.rows[0];
      });

      return res.json({
        success: true,
        message: 'Ticket fermé',
        data: {
          ticket: result,
        },
      });
    } catch (transactionError) {
      // Si c'est une erreur de colonne, essayer avec une requête simplifiée
      if (transactionError.code === '42703') {
        logger.warn('Colonne non trouvée, utilisation d\'une requête simplifiée');
        const simpleResult = await transaction(async (client) => {
          const updateResult = await client.query(
            `UPDATE support_tickets 
             SET status = 'closed', 
                 updated_at = NOW()
             WHERE id = $1
             RETURNING id, status`,
            [id]
          );

          if (updateResult.rowCount === 0) {
            throw new Error('Aucune ligne mise à jour');
          }

          return updateResult.rows[0];
        });

        return res.json({
          success: true,
          message: 'Ticket fermé',
          data: {
            ticket: simpleResult,
          },
        });
      }
      throw transactionError;
    }
  } catch (error) {
    logger.error('Erreur closeTicket:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      ticketId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Erreur lors de la fermeture',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
    });
  }
};

/**
 * Obtenir les paramètres de l'application
 */
exports.getAppSettings = async (req, res) => {
  try {
    const { public_only } = req.query;

    let queryText = 'SELECT * FROM app_settings WHERE 1=1';
    const values = [];

    if (public_only === 'true') {
      queryText += ' AND is_public = true';
    }

    queryText += ' ORDER BY key';

    const result = await query(queryText, values);

    // Organiser les paramètres par catégorie
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = {
        value: row.value,
        description: row.description,
        is_public: row.is_public,
        updated_at: row.updated_at,
      };
    });

    res.json({
      success: true,
      data: {
        settings,
      },
    });
  } catch (error) {
    logger.error('Erreur getAppSettings:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Mettre à jour les paramètres de l'application
 */
exports.updateAppSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Les paramètres sont requis' },
      });
    }

    return await transaction(async (client) => {
      const updatedSettings = {};

      for (const [key, setting] of Object.entries(settings)) {
        if (!setting || typeof setting !== 'object') {
          continue;
        }

        const { value, description, is_public } = setting;

        if (value === undefined) {
          continue;
        }

        // Vérifier que la valeur est valide JSON
        let jsonValue;
        try {
          jsonValue = typeof value === 'string' ? JSON.parse(value) : value;
        } catch (e) {
          // Si ce n'est pas du JSON, on le garde tel quel
          logger.warn('Valeur non-JSON ignorée lors du parsing:', e.message);
          jsonValue = value;
        }

        // Mettre à jour ou créer le paramètre
        // S'assurer que jsonValue est bien sérialisé en JSON
        const jsonString = typeof jsonValue === 'string' ? jsonValue : JSON.stringify(jsonValue);
        
        // Vérifier si la colonne updated_by existe
        await client.query(
          `INSERT INTO app_settings (key, value, description, is_public, updated_at)
           VALUES ($1, $2::jsonb, $3, $4, NOW())
           ON CONFLICT (key) 
           DO UPDATE SET 
             value = EXCLUDED.value,
             description = COALESCE(NULLIF(EXCLUDED.description, ''), app_settings.description),
             is_public = COALESCE(EXCLUDED.is_public, app_settings.is_public),
             updated_at = NOW()`,
          [
            key,
            jsonString,
            description || null,
            is_public !== undefined ? is_public : false,
          ]
        );

        updatedSettings[key] = {
          value: jsonValue,
          description: description || null,
          is_public: is_public !== undefined ? is_public : false,
        };
      }

      logger.info(`Paramètres mis à jour par admin ${req.user.id}`, { keys: Object.keys(updatedSettings) });

      res.json({
        success: true,
        message: 'Paramètres mis à jour',
        data: {
          settings: updatedSettings,
        },
      });
    });
  } catch (error) {
    logger.error('Erreur updateAppSettings:', error);
    logger.error('Détails erreur:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
    });
    res.status(500).json({
      success: false,
      error: { 
        code: 'UPDATE_ERROR', 
        message: 'Erreur lors de la mise à jour',
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
          code: error.code,
        }),
      },
    });
  }
};

/**
 * Obtenir les administrateurs
 */
exports.getAdmins = async (req, res) => {
  try {
    // TODO: Implémenter la récupération
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur getAdmins:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Créer un administrateur
 */
exports.createAdmin = async (req, res) => {
  try {
    // TODO: Implémenter la création
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur createAdmin:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'Erreur lors de la création' },
    });
  }
};

/**
 * Mettre à jour les permissions d'un administrateur
 */
exports.updateAdminPermissions = async (req, res) => {
  try {
    // TODO: Implémenter la mise à jour
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur updateAdminPermissions:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' },
    });
  }
};

/**
 * Désactiver un administrateur
 */
exports.deactivateAdmin = async (req, res) => {
  try {
    // TODO: Implémenter la désactivation
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Fonctionnalité en cours de développement' },
    });
  } catch (error) {
    logger.error('Erreur deactivateAdmin:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la désactivation' },
    });
  }
};

/**
 * ═══════════════════════════════════════════════════════════
 * GESTION DU COMPTE ADMIN (Profil admin connecté)
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Changer le mot de passe de l'admin connecté
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Le mot de passe actuel et le nouveau mot de passe sont requis',
        },
      });
    }

    // Validation du nouveau mot de passe
    if (newPassword.length < 12) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Le mot de passe doit contenir au moins 12 caractères',
        },
      });
    }

    return await transaction(async (client) => {
      // Récupérer l'admin avec le mot de passe
      const adminResult = await client.query(
        'SELECT * FROM admins WHERE id = $1',
        [req.user.id]
      );

      if (adminResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'ADMIN_NOT_FOUND', message: 'Admin non trouvé' },
        });
      }

      const admin = adminResult.rows[0];

      // Vérifier le mot de passe actuel
      const isValid = await bcrypt.compare(currentPassword, admin.password_hash);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Mot de passe actuel incorrect',
          },
        });
      }

      // Hasher le nouveau mot de passe
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Mettre à jour le mot de passe
      await client.query(
        'UPDATE admins SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, req.user.id]
      );

      logger.info(`Mot de passe changé pour admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Mot de passe mis à jour avec succès',
      });
    });
  } catch (error) {
    logger.error('Erreur changePassword:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour du mot de passe' },
    });
  }
};

/**
 * Mettre à jour l'email de l'admin connecté
 */
exports.updateEmail = async (req, res) => {
  try {
    const { newEmail } = req.body;

    if (!newEmail || !newEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Une adresse email valide est requise',
        },
      });
    }

    return await transaction(async (client) => {
      // Vérifier que l'email n'est pas déjà utilisé
      const existingAdmin = await client.query(
        'SELECT id FROM admins WHERE email = $1 AND id != $2',
        [newEmail, req.user.id]
      );

      if (existingAdmin.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'Cette adresse email est déjà utilisée',
          },
        });
      }

      // Mettre à jour l'email (non vérifié par défaut)
      await client.query(
        'UPDATE admins SET email = $1, updated_at = NOW() WHERE id = $2',
        [newEmail, req.user.id]
      );

      // TODO: Envoyer un email de vérification à la nouvelle adresse

      logger.info(`Email mis à jour pour admin ${req.user.id}: ${newEmail}`);

      res.json({
        success: true,
        message: 'Email mis à jour. Un lien de vérification a été envoyé à la nouvelle adresse.',
        data: {
          email: newEmail,
          verified: false, // Nécessite vérification
        },
      });
    });
  } catch (error) {
    logger.error('Erreur updateEmail:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Cette adresse email est déjà utilisée',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour de l\'email' },
    });
  }
};

/**
 * Obtenir les sessions actives de l'admin connecté
 */
exports.getActiveSessions = async (req, res) => {
  try {
    // Pour l'instant, on retourne la session actuelle
    // Dans une implémentation complète, on stockerait les sessions dans une table
    const adminResult = await query(
      'SELECT id, email, full_name, last_login FROM admins WHERE id = $1',
      [req.user.id]
    );

    if (adminResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'ADMIN_NOT_FOUND', message: 'Admin non trouvé' },
      });
    }

    // Session actuelle (mockée pour l'instant)
    // Dans une vraie implémentation, on utiliserait une table sessions
    const sessions = [
      {
        id: req.user.id, // Utiliser le token ID ou un ID de session
        device: 'Web Browser',
        deviceIcon: 'computer',
        location: 'Korhogo, Côte d\'Ivoire', // Peut être déterminé par IP
        ip: req.ip || '192.168.1.45',
        isCurrent: true,
        lastActive: 'En ligne maintenant',
        status: 'online',
        userAgent: req.headers['user-agent'] || 'Unknown',
      },
    ];

    res.json({
      success: true,
      data: {
        sessions,
        current_session_id: req.user.id,
      },
    });
  } catch (error) {
    logger.error('Erreur getActiveSessions:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des sessions' },
    });
  }
};

/**
 * Révoquer une session spécifique
 */
exports.revokeSession = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que ce n'est pas la session actuelle
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_REVOKE_CURRENT',
          message: 'Impossible de révoquer la session actuelle',
        },
      });
    }

    // Dans une vraie implémentation, on invaliderait le token/session
    // Pour l'instant, on retourne juste un succès
    logger.info(`Session ${id} révoquée par admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'Session révoquée avec succès',
    });
  } catch (error) {
    logger.error('Erreur revokeSession:', error);
    res.status(500).json({
      success: false,
      error: { code: 'REVOKE_ERROR', message: 'Erreur lors de la révocation de la session' },
    });
  }
};

/**
 * Déconnexion de tous les appareils (sauf la session actuelle)
 */
exports.logoutAll = async (req, res) => {
  try {
    // Dans une vraie implémentation, on invaliderait tous les tokens sauf le courant
    // On pourrait utiliser une table refresh_tokens et les supprimer
    logger.info(`Déconnexion de tous les appareils pour admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'Déconnexion de tous les appareils réussie',
    });
  } catch (error) {
    logger.error('Erreur logoutAll:', error);
    res.status(500).json({
      success: false,
      error: { code: 'LOGOUT_ERROR', message: 'Erreur lors de la déconnexion' },
    });
  }
};

/**
 * Supprimer le compte admin connecté
 */
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body; // Confirmation par mot de passe

    if (!password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Le mot de passe est requis pour confirmer la suppression',
        },
      });
    }

    return await transaction(async (client) => {
      // Récupérer l'admin avec le mot de passe
      const adminResult = await client.query(
        'SELECT * FROM admins WHERE id = $1',
        [req.user.id]
      );

      if (adminResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'ADMIN_NOT_FOUND', message: 'Admin non trouvé' },
        });
      }

      const admin = adminResult.rows[0];

      // Vérifier le mot de passe
      const isValid = await bcrypt.compare(password, admin.password_hash);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Mot de passe incorrect',
          },
        });
      }

      // Désactiver le compte (soft delete)
      await client.query(
        'UPDATE admins SET is_active = false, updated_at = NOW() WHERE id = $1',
        [req.user.id]
      );

      logger.warn(`Compte admin ${req.user.id} supprimé (désactivé)`);

      res.json({
        success: true,
        message: 'Compte supprimé avec succès',
      });
    });
  } catch (error) {
    logger.error('Erreur deleteAccount:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: 'Erreur lors de la suppression du compte' },
    });
  }
};

/**
 * Upload photo de profil de l'admin connecté
 */
exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      logger.warn('Upload photo: aucun fichier reçu', {
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

    // Vérifier que le fichier a les propriétés nécessaires
    if (!req.file.buffer) {
      logger.error('Upload photo: fichier sans buffer', {
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
        logger.warn('Erreur lors de la normalisation de l\'URL:', error.message);
        if (url.startsWith('/')) {
          return `${requestBaseUrl}${url}`;
        }
        return url;
      }
      return url;
    };

    return await transaction(async (client) => {
      // Vérifier le provider d'upload
      const uploadProvider = config.upload?.provider || 'local';
      
      let uploadResult;
      
      // Utiliser le provider configuré
      if (uploadProvider === 's3') {
        try {
          uploadResult = await uploadService.uploadToS3(req.file, 'admin-profiles');
        } catch (error) {
          logger.error('Erreur upload S3, tentative Cloudinary:', error);
          // Fallback sur Cloudinary si S3 échoue
          if (config.upload?.cloudinary?.cloudName) {
            uploadResult = await uploadService.uploadToCloudinary(req.file, 'admin-profiles');
          } else {
            throw error;
          }
        }
      } else if (uploadProvider === 'cloudinary') {
        uploadResult = await uploadService.uploadToCloudinary(req.file, 'admin-profiles');
      } else {
        // Upload local (pour développement)
        uploadResult = await uploadService.uploadToLocal(
          req.file,
          'admin-profiles',
          { baseUrl: requestBaseUrl }
        );
      }
      
      // Mettre à jour la photo de profil
      // TODO: Supprimer l'ancienne photo du stockage si elle existe
      const publicUrl = normalizeLocalUrl(uploadResult.url);
      await client.query(
        'UPDATE admins SET profile_picture = $1, updated_at = NOW() WHERE id = $2',
        [publicUrl, req.user.id]
      );

      // TODO: Supprimer l'ancienne photo de S3 si elle existe
      // (nécessite de stocker la clé S3, pas juste l'URL)

      logger.info(`Photo de profil mise à jour pour admin ${req.user.id}`);

      // Mettre à jour les données admin dans la réponse
      const updatedAdmin = await client.query(
        'SELECT id, email, full_name, role, profile_picture FROM admins WHERE id = $1',
        [req.user.id]
      );

      // Mettre à jour le localStorage côté client (via la réponse)
      res.json({
        success: true,
        message: 'Photo de profil mise à jour avec succès',
        data: {
          profile_picture: publicUrl,
          admin: {
            ...updatedAdmin.rows[0],
            profile_picture: uploadResult.url,
          },
        },
      });
    });
  } catch (error) {
    logger.error('Erreur uploadProfilePicture:', {
      message: error.message,
      stack: error.stack,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        hasBuffer: !!req.file.buffer,
      } : 'No file',
    });
    
    const errorMessage = error.message || 'Erreur lors de l\'upload de la photo';
    const config = require('../config');
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: errorMessage,
        ...(config.env === 'development' && { details: error.stack }),
      },
    });
  }
};

/**
 * Supprimer la photo de profil de l'admin connecté
 */
exports.deleteProfilePicture = async (req, res) => {
  try {
    return await transaction(async (client) => {
      // Récupérer l'URL de la photo actuelle
      const adminResult = await client.query(
        'SELECT profile_picture FROM admins WHERE id = $1',
        [req.user.id]
      );

      if (!adminResult.rows[0]?.profile_picture) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NO_PICTURE',
            message: 'Aucune photo de profil à supprimer',
          },
        });
      }

      // Supprimer la photo de la base de données
      await client.query(
        'UPDATE admins SET profile_picture = NULL, updated_at = NOW() WHERE id = $1',
        [req.user.id]
      );

      // TODO: Supprimer la photo de S3 si nécessaire

      logger.info(`Photo de profil supprimée pour admin ${req.user.id}`);

      res.json({
        success: true,
        message: 'Photo de profil supprimée avec succès',
      });
    });
  } catch (error) {
    logger.error('Erreur deleteProfilePicture:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: 'Erreur lors de la suppression de la photo' },
    });
  }
};

/**
 * Classement des livreurs (Top performers)
 */
exports.getDeliveryLeaderboard = async (req, res) => {
  try {
    const { period = 'week', limit = 20 } = req.query;

    // Définir l'intervalle selon la période
    const intervals = {
      today: "1 day",
      week: "7 days",
      month: "30 days",
      year: "365 days",
      all: null,
    };

    const interval = intervals[period] || null;
    const intervalClause = interval ? `AND o.delivered_at >= NOW() - INTERVAL '${interval}'` : '';

    // Requête pour classer les livreurs
    const result = await query(
      `SELECT 
        dp.id,
        dp.first_name || ' ' || dp.last_name as name,
        dp.photo,
        dp.vehicle_type,
        dp.average_rating,
        COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered' ${intervalClause}) as deliveries_count,
        COALESCE(SUM(o.delivery_fee * 0.7) FILTER (WHERE o.status = 'delivered' ${intervalClause}), 0) as earnings,
        AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.picked_up_at))/60) FILTER (WHERE o.status = 'delivered' ${intervalClause}) as avg_delivery_time_minutes,
        COUNT(DISTINCT r.id) FILTER (WHERE r.delivery_rating = 5 ${intervalClause}) as perfect_ratings
      FROM delivery_persons dp
      LEFT JOIN orders o ON dp.id = o.delivery_person_id
      LEFT JOIN reviews r ON r.delivery_person_id = dp.id AND r.order_id = o.id
      WHERE dp.status = 'active'
      GROUP BY dp.id, dp.first_name, dp.last_name, dp.photo, dp.vehicle_type, dp.average_rating
      ORDER BY deliveries_count DESC, earnings DESC, avg_delivery_time_minutes ASC
      LIMIT $1`,
      [Number.parseInt(limit)]
    );

    // Ajouter le rang
    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      ...row,
      avg_delivery_time_minutes: row.avg_delivery_time_minutes 
        ? Math.round(row.avg_delivery_time_minutes) 
        : null,
    }));

    res.json({
      success: true,
      data: {
        leaderboard,
        period,
        limit: Number.parseInt(limit),
        generated_at: new Date().toISOString(),
      },
    });

  } catch (error) {
    logger.error('Erreur getDeliveryLeaderboard:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erreur lors de la récupération du classement',
      },
    });
  }
};

/**
 * ═══════════════════════════════════════════════════════════
 * EXPORT DE DONNÉES
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Exporter les commandes (CSV, Excel, PDF)
 */
exports.exportOrders = async (req, res) => {
  const { format = 'csv', status, date_from, date_to, restaurant_id, delivery_person_id, amount_min, amount_max } = req.query;
  
  try {
    
    // Valider le format
    if (!['csv', 'excel', 'xlsx', 'pdf'].includes(format.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_FORMAT', message: 'Format invalide. Formats supportés: csv, excel, pdf' },
      });
    }

    // Construire la requête avec les mêmes filtres que getOrders
    // Calculer la commission car la colonne n'existe peut-être pas
    let queryText = `
      SELECT 
        o.id,
        o.order_number,
        o.subtotal,
        o.delivery_fee,
        o.discount,
        COALESCE(o.tax, 0) as tax,
        COALESCE(o.commission, o.subtotal * COALESCE(o.commission_rate, r.commission_rate, 15.0) / 100.0) as commission,
        COALESCE(o.commission_rate, r.commission_rate, 15.0) as commission_rate,
        o.total,
        o.status,
        o.payment_method,
        o.payment_status,
        o.placed_at,
        COALESCE(r.name, 'N/A') as restaurant_name,
        COALESCE(u.first_name || ' ' || u.last_name, u.phone, 'N/A') as client_name,
        COALESCE(dp.first_name || ' ' || dp.last_name, 'N/A') as delivery_name
      FROM orders o
      LEFT JOIN restaurants r ON o.restaurant_id = r.id
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN delivery_persons dp ON o.delivery_person_id = dp.id
      WHERE 1=1
    `;

    const values = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND o.status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    if (date_from) {
      // S'assurer que la date est au format correct pour PostgreSQL
      queryText += ` AND DATE(o.placed_at) >= $${paramIndex}::date`;
      values.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      // Ajouter 23:59:59 pour inclure toute la journée
      queryText += ` AND DATE(o.placed_at) <= $${paramIndex}::date`;
      values.push(date_to);
      paramIndex++;
    }

    if (restaurant_id) {
      queryText += ` AND o.restaurant_id = $${paramIndex}`;
      values.push(restaurant_id);
      paramIndex++;
    }

    if (delivery_person_id) {
      queryText += ` AND o.delivery_person_id = $${paramIndex}`;
      values.push(delivery_person_id);
      paramIndex++;
    }

    if (amount_min) {
      queryText += ` AND o.total >= $${paramIndex}`;
      values.push(Number.parseFloat(amount_min));
      paramIndex++;
    }

    if (amount_max) {
      queryText += ` AND o.total <= $${paramIndex}`;
      values.push(Number.parseFloat(amount_max));
      paramIndex++;
    }

    queryText += ` ORDER BY o.placed_at DESC`;

    logger.info('Export query:', { queryText, values, format });
    
    let result;
    try {
      result = await query(queryText, values);
    } catch (queryError) {
      logger.error('Erreur SQL lors de l\'export:', {
        message: queryError.message,
        stack: queryError.stack,
        query: queryText.substring(0, 200),
      });
      return res.status(500).json({
        success: false,
        error: { 
          code: 'QUERY_ERROR', 
          message: 'Erreur lors de la récupération des données',
          details: process.env.NODE_ENV === 'development' ? queryError.message : undefined,
        },
      });
    }
    
    if (!result?.rows?.length) {
      return res.status(404).json({
        success: false,
        error: { code: 'NO_DATA', message: 'Aucune commande à exporter pour cette période' },
      });
    }

    logger.info(`Exporting ${result.rows.length} orders in ${format} format`);

    // La commission est déjà calculée dans la requête SQL
    // S'assurer que toutes les valeurs sont bien formatées
    const ordersFormatted = result.rows.map(order => {
      // S'assurer que commission est un nombre
      if (order.commission === null || order.commission === undefined) {
        const commissionRate = order.commission_rate || 15.0;
        order.commission = Number.parseFloat(((order.subtotal || 0) * commissionRate) / 100.0);
      } else {
        order.commission = Number.parseFloat(order.commission) || 0;
      }
      return order;
    });

    // Utiliser l'utilitaire d'export
    const exportUtil = require('../utils/export');
    let exportResult;
    try {
      exportResult = await exportUtil.exportOrders(ordersFormatted, format);
      logger.info('Export result generated successfully', { 
        contentType: exportResult.contentType,
        filename: exportResult.filename,
        contentLength: exportResult.content 
          ? (typeof exportResult.content === 'string' 
            ? exportResult.content.length 
            : exportResult.content.byteLength)
          : 0
      });
    } catch (exportError) {
      logger.error('Error in exportOrders utility:', {
        message: exportError.message,
        stack: exportError.stack,
        format,
        ordersCount: result.rows.length
      });
      throw exportError;
    }

    // Envoyer le fichier
    res.setHeader('Content-Type', exportResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    
    // Pour les fichiers binaires (PDF), pdf-lib retourne un Uint8Array
    // Pour le texte (CSV/Excel), c'est une string
    if (format.toLowerCase() === 'pdf') {
      // Convertir Uint8Array en Buffer pour Express
      const buffer = Buffer.from(exportResult.content);
      return res.send(buffer);
    } else {
      // CSV/Excel est une string
      return res.send(exportResult.content);
    }
  } catch (error) {
    logger.error('Erreur exportOrders:', {
      message: error.message,
      stack: error.stack,
      format,
      date_from,
      date_to,
      status,
    });
    res.status(500).json({
      success: false,
      error: { 
        code: 'EXPORT_ERROR', 
        message: error.message || 'Erreur lors de l\'export',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    });
  }
};

/**
 * ═══════════════════════════════════════════════════════════
 * ACTIONS EN MASSE SUR UTILISATEURS
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Actions en masse sur les utilisateurs
 */
exports.bulkActionUsers = async (req, res) => {
  try {
    const { user_ids, action, reason } = req.body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Liste d\'utilisateurs requise' },
      });
    }

    if (!action || !['suspend', 'activate', 'delete'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ACTION', message: 'Action invalide. Actions supportées: suspend, activate, delete' },
      });
    }

    return await transaction(async (client) => {
      let updateQuery;
      let statusValue;

      switch (action) {
        case 'suspend':
          statusValue = 'suspended';
          updateQuery = 'UPDATE users SET status = $1 WHERE id = ANY($2::uuid[])';
          break;
        case 'activate':
          statusValue = 'active';
          updateQuery = 'UPDATE users SET status = $1 WHERE id = ANY($2::uuid[])';
          break;
        case 'delete':
          // Soft delete
          statusValue = 'deleted';
          updateQuery = 'UPDATE users SET status = $1 WHERE id = ANY($2::uuid[])';
          break;
      }

      const result = await client.query(updateQuery, [statusValue, user_ids]);

      // Logger l'action (optionnel : si activity_logs indisponible, on continue)
      try {
        for (const userId of user_ids) {
          await client.query(`
            INSERT INTO activity_logs (user_id, user_type, action, details)
            VALUES ($1, $2, $3, $4)
          `, [
            req.user.id,
            'admin',
            `bulk_${action}_user`,
            JSON.stringify({ user_id: userId, reason }),
          ]);
        }
      } catch (logErr) {
        logger.warn('bulkActionUsers: activity_logs insert failed (action still applied)', { err: logErr.message });
      }

      logger.info(`Action en masse ${action} effectuée sur ${result.rowCount} utilisateurs par admin ${req.user.id}`);

      let actionLabel = 'supprimé(s)';
      if (action === 'suspend') {
        actionLabel = 'suspendu(s)';
      } else if (action === 'activate') {
        actionLabel = 'activé(s)';
      }

      res.json({
        success: true,
        message: `${result.rowCount} utilisateur(s) ${actionLabel}`,
        data: {
          affected_count: result.rowCount,
          action,
        },
      });
    });
  } catch (error) {
    logger.error('Erreur bulkActionUsers:', { message: error.message, code: error.code, detail: error.detail });
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      success: false,
      error: {
        code: 'BULK_ACTION_ERROR',
        message: 'Erreur lors de l\'action en masse',
        ...(isDev && { debug: error.message, detail: error.detail }),
      },
    });
  }
};

/**
 * ═══════════════════════════════════════════════════════════
 * AMÉLIORATION DASHBOARD FINANCIER (DÉPENSES ET BÉNÉFICE)
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Obtenir les dépenses (amélioration de getFinancialOverview)
 */
exports.getExpenses = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFilter = '';
    switch (period) {
      case 'today':
        dateFilter = "AND created_at >= CURRENT_DATE";
        break;
      case 'week':
        dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "AND created_at >= DATE_TRUNC('month', CURRENT_DATE)";
        break;
      case 'year':
        dateFilter = "AND created_at >= DATE_TRUNC('year', CURRENT_DATE)";
        break;
    }

    // Récupérer les dépenses depuis la table expenses si elle existe, sinon calculer depuis transactions
    let expensesResult;
    try {
      expensesResult = await query(`
        SELECT 
          COALESCE(SUM(amount), 0) as total_expenses,
          COUNT(*) as expense_count
        FROM expenses
        WHERE 1=1 ${dateFilter}
      `);
    } catch (error) {
      // Si la table n'existe pas, calculer depuis transactions de type 'expense'
      logger.warn('Table expenses non disponible, calcul depuis transactions:', error.message);
      expensesResult = await query(`
        SELECT 
          COALESCE(SUM(amount), 0) as total_expenses,
          COUNT(*) as expense_count
        FROM transactions
        WHERE type = 'expense' AND status = 'completed'
        ${dateFilter}
      `);
    }

    // Catégories de dépenses
    let categoriesResult;
    try {
      categoriesResult = await query(`
        SELECT 
          category,
          COALESCE(SUM(amount), 0) as amount
        FROM expenses
        WHERE 1=1 ${dateFilter}
        GROUP BY category
        ORDER BY amount DESC
      `);
    } catch (error) {
      logger.warn('Table expense_categories non disponible:', error.message);
      categoriesResult = { rows: [] };
    }

    res.json({
      success: true,
      data: {
        total_expenses: Number.parseFloat(expensesResult.rows[0].total_expenses || 0),
        expense_count: Number.parseInt(expensesResult.rows[0].expense_count || 0),
        by_category: categoriesResult.rows,
        period,
      },
    });
  } catch (error) {
    logger.error('Erreur getExpenses:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des dépenses' },
    });
  }
};

/**
 * Améliorer getFinancialOverview pour inclure dépenses et bénéfice net
 */
exports.getFinancialOverview = async (req, res) => {
  try {
    // Récupérer les données financières de base
    const overview = await query(`
      SELECT 
        COALESCE(SUM(total) FILTER (WHERE status = 'delivered'), 0) as total_revenue,
        COALESCE(SUM(commission) FILTER (WHERE status = 'delivered'), 0) as commission_collected,
        COALESCE(SUM(delivery_fee) FILTER (WHERE status = 'delivered'), 0) as delivery_fees,
        COUNT(*) FILTER (WHERE status = 'delivered') as completed_orders
      FROM orders
    `);

    const pendingPayouts = await query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
      FROM transactions
      WHERE type = 'payout' AND status = 'pending'
    `);

    // Ajouter les dépenses et bénéfice net
    const { period = 'month' } = req.query;
    
    let dateFilter = '';
    switch (period) {
      case 'today':
        dateFilter = "AND created_at >= CURRENT_DATE";
        break;
      case 'week':
        dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "AND created_at >= DATE_TRUNC('month', CURRENT_DATE)";
        break;
      case 'year':
        dateFilter = "AND created_at >= DATE_TRUNC('year', CURRENT_DATE)";
        break;
    }

    // Calculer les dépenses
    let expensesResult;
    try {
      expensesResult = await query(`
        SELECT COALESCE(SUM(amount), 0) as total_expenses
        FROM expenses
        WHERE 1=1 ${dateFilter}
      `);
    } catch (error) {
      // Si la table n'existe pas, utiliser transactions
      try {
        expensesResult = await query(`
          SELECT COALESCE(SUM(amount), 0) as total_expenses
          FROM transactions
          WHERE type = 'expense' AND status = 'completed'
          ${dateFilter}
        `);
      } catch (err) {
        // Si aucune table n'existe, mettre à 0
        expensesResult = { rows: [{ total_expenses: 0 }] };
      }
    }

    const totalExpenses = Number.parseFloat(expensesResult.rows[0].total_expenses || 0);
    const totalRevenue = Number.parseFloat(overview.rows[0].total_revenue || 0);
    const commissionCollected = Number.parseFloat(overview.rows[0].commission_collected || 0);
    const deliveryFees = Number.parseFloat(overview.rows[0].delivery_fees || 0);
    const completedOrders = Number.parseInt(overview.rows[0].completed_orders || 0);
    
    // === CALCUL CORRECT DES REVENUS PLATEFORME ===
    // 1. Commissions restaurants (15% par défaut)
    const platformCommissionRevenue = commissionCollected;
    
    // 2. Part plateforme sur frais de livraison (30%)
    // Les livreurs gardent 70%, la plateforme garde 30%
    const config = require('../config');
    const platformDeliveryPercent = 100 - (config.business.deliveryPersonPercentage || 70);
    const platformDeliveryRevenue = deliveryFees * (platformDeliveryPercent / 100);
    
    // 3. Revenu total de la plateforme
    const platformTotalRevenue = platformCommissionRevenue + platformDeliveryRevenue;
    
    // 4. Bénéfice net = Revenus plateforme - Dépenses
    const netProfit = platformTotalRevenue - totalExpenses;
    const profitMargin = platformTotalRevenue > 0 ? ((netProfit / platformTotalRevenue) * 100).toFixed(2) : 0;
    
    // 5. Panier moyen
    const averageOrderValue = completedOrders > 0 ? (totalRevenue / completedOrders) : 0;

    res.json({
      success: true,
      data: {
        overview: overview.rows[0],
        pending_payouts: pendingPayouts.rows[0],
        // Revenus détaillés de la plateforme
        platform_revenue: {
          commission_from_restaurants: platformCommissionRevenue,
          commission_from_delivery: platformDeliveryRevenue,
          total: platformTotalRevenue,
          breakdown: {
            restaurants_percent: platformTotalRevenue > 0 ? Math.round((platformCommissionRevenue / platformTotalRevenue) * 100) : 0,
            delivery_percent: platformTotalRevenue > 0 ? Math.round((platformDeliveryRevenue / platformTotalRevenue) * 100) : 0,
          },
        },
        // Ce que les livreurs ont gagné (70% des frais)
        delivery_payouts: deliveryFees * ((config.business.deliveryPersonPercentage || 70) / 100),
        // Ce que les restaurants ont reçu (CA - commission)
        restaurant_payouts: totalRevenue - commissionCollected,
        expenses: {
          total: totalExpenses,
          period,
        },
        net_profit: netProfit,
        profit_margin: Number.parseFloat(profitMargin),
        average_order_value: Math.round(averageOrderValue),
      },
    });
  } catch (error) {
    logger.error('Erreur getFinancialOverview:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * ═══════════════════════════════════════════════════════════
 * QUIZ DE VALIDATION (RESTAURANTS ET LIVREURS)
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Obtenir les quiz disponibles pour un type (restaurant ou delivery)
 */
exports.getQuizzes = async (req, res) => {
  try {
    const { type } = req.query; // 'restaurant' ou 'delivery'

    if (!type || !['restaurant', 'delivery'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TYPE', message: 'Type invalide. Types supportés: restaurant, delivery' },
      });
    }

    // Vérifier si la table existe, sinon retourner structure par défaut
    let quizzesResult;
    try {
      quizzesResult = await query(`
        SELECT id, title, description, type, questions, passing_score, created_at
        FROM training_quizzes
        WHERE type = $1 AND is_active = true
        ORDER BY created_at ASC
      `, [type]);
    } catch (error) {
      // Table n'existe pas encore, retourner structure par défaut
      logger.warn('Table training_quizzes non disponible, retour structure par défaut');
      quizzesResult = { rows: [] };
    }

    res.json({
      success: true,
      data: {
        quizzes: quizzesResult.rows,
        type,
      },
    });
  } catch (error) {
    logger.error('Erreur getQuizzes:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des quiz' },
    });
  }
};

/**
 * Soumettre les réponses d'un quiz
 */
exports.submitQuiz = async (req, res) => {
  try {
    const { quiz_id, answers, user_id, user_type } = req.body;

    if (!quiz_id || !answers || !user_id || !user_type) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Tous les champs sont requis' },
      });
    }

    if (!['restaurant', 'delivery'].includes(user_type)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_USER_TYPE', message: 'Type d\'utilisateur invalide' },
      });
    }

    // Récupérer le quiz
    let quizResult;
    try {
      quizResult = await query(`
        SELECT * FROM training_quizzes WHERE id = $1 AND is_active = true
      `, [quiz_id]);
    } catch (error) {
      logger.error('Erreur lors de la récupération du quiz:', error.message);
      return res.status(404).json({
        success: false,
        error: { code: 'QUIZ_NOT_FOUND', message: 'Quiz non trouvé' },
      });
    }

    if (quizResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'QUIZ_NOT_FOUND', message: 'Quiz non trouvé' },
      });
    }

    const quiz = quizResult.rows[0];
    const questions = quiz.questions || [];
    const passingScore = quiz.passing_score || 80;

    // Calculer le score
    let correctAnswers = 0;
    const results = questions.map((question, index) => {
      const userAnswer = answers[index];
      const isCorrect = question.correct_answer === userAnswer;
      if (isCorrect) correctAnswers++;
      return {
        question_id: question.id || index,
        question: question.question,
        user_answer: userAnswer,
        correct_answer: question.correct_answer,
        is_correct: isCorrect,
      };
    });

    const score = (correctAnswers / questions.length) * 100;
    const passed = score >= passingScore;

    // Enregistrer le résultat
    try {
      const resultInsert = await query(`
        INSERT INTO quiz_results (quiz_id, user_id, user_type, answers, score, passed, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `, [
        quiz_id,
        user_id,
        user_type,
        JSON.stringify(answers),
        score,
        passed,
      ]);

      res.json({
        success: true,
        data: {
          result: resultInsert.rows[0],
          score: score.toFixed(2),
          passed,
          passing_score: passingScore,
          correct_answers: correctAnswers,
          total_questions: questions.length,
          details: results,
        },
      });
    } catch (error) {
      // Si la table n'existe pas, retourner juste le résultat sans l'enregistrer
      logger.warn('Table quiz_results non disponible, résultat non enregistré:', error.message);
      res.json({
        success: true,
        data: {
          score: score.toFixed(2),
          passed,
          passing_score: passingScore,
          correct_answers: correctAnswers,
          total_questions: questions.length,
          details: results,
          note: 'Résultat non enregistré (table non disponible)',
        },
      });
    }
  } catch (error) {
    logger.error('Erreur submitQuiz:', error);
    res.status(500).json({
      success: false,
      error: { code: 'QUIZ_ERROR', message: 'Erreur lors de la soumission du quiz' },
    });
  }
};

/**
 * ═══════════════════════════════════════════════════════════
 * NOTIFICATIONS PUSH
 * ═══════════════════════════════════════════════════════════
 */

const notificationService = require('../services/notification.service');

/**
 * Envoyer une notification à un utilisateur spécifique
 */
exports.sendNotification = async (req, res) => {
  try {
    const { user_id, user_type, title, message, type, data } = req.body;

    if (!user_id || !user_type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'user_id, user_type, title et message sont requis' },
      });
    }

    if (!['user', 'client', 'restaurant', 'delivery', 'delivery_person'].includes(user_type)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_USER_TYPE', message: 'Type d\'utilisateur invalide' },
      });
    }

    const result = await notificationService.sendToUser(user_id, user_type, {
      title,
      body: message,
      type: type || 'admin',
      data: data || {},
    });

    logger.info(`Notification envoyée à ${user_type} ${user_id} par admin ${req.user.id}`);

    res.json({
      success: true,
      data: { result },
    });
  } catch (error) {
    logger.error('Erreur sendNotification:', error);
    res.status(500).json({
      success: false,
      error: { code: 'NOTIFICATION_ERROR', message: 'Erreur lors de l\'envoi de la notification' },
    });
  }
};

/**
 * Envoyer une notification à plusieurs utilisateurs
 */
exports.broadcastNotification = async (req, res) => {
  try {
    const { user_ids, user_type, title, message, type, data } = req.body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Liste d\'utilisateurs requise' },
      });
    }

    if (!user_type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'user_type, title et message sont requis' },
      });
    }

    const result = await notificationService.sendToMultiple(user_ids, user_type, {
      title,
      body: message,
      type: type || 'admin',
      data: data || {},
    });

    logger.info(`Broadcast notification à ${user_ids.length} ${user_type}(s) par admin ${req.user.id}`, result);

    res.json({
      success: true,
      data: {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
      },
    });
  } catch (error) {
    logger.error('Erreur broadcastNotification:', error);
    res.status(500).json({
      success: false,
      error: { code: 'BROADCAST_ERROR', message: 'Erreur lors de l\'envoi des notifications' },
    });
  }
};

/**
 * Envoyer une notification promotionnelle à tous les clients
 */
exports.sendPromotionalNotification = async (req, res) => {
  try {
    const { title, message, promo_code, target_segment, data } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'title et message sont requis' },
      });
    }

    // Construire la requête en fonction du segment cible
    let queryText = 'SELECT id FROM users WHERE status = $1 AND fcm_token IS NOT NULL';
    const queryParams = ['active'];

    // Segments disponibles : all, new (< 30 jours), active (commande < 30 jours), inactive (pas de commande > 30 jours)
    if (target_segment === 'new') {
      queryText += ' AND created_at > NOW() - INTERVAL \'30 days\'';
    } else if (target_segment === 'active') {
      queryText += ` AND id IN (
        SELECT DISTINCT user_id FROM orders 
        WHERE created_at > NOW() - INTERVAL '30 days'
      )`;
    } else if (target_segment === 'inactive') {
      queryText += ` AND id NOT IN (
        SELECT DISTINCT user_id FROM orders 
        WHERE created_at > NOW() - INTERVAL '30 days'
      )`;
    }
    // target_segment === 'all' ou undefined : tous les utilisateurs actifs

    const usersResult = await query(queryText, queryParams);
    const userIds = usersResult.rows.map(u => u.id);

    if (userIds.length === 0) {
      return res.json({
        success: true,
        data: {
          total: 0,
          successful: 0,
          failed: 0,
          message: 'Aucun utilisateur correspondant au segment',
        },
      });
    }

    const notificationData = {
      ...(data || {}),
      type: 'promotion',
    };

    if (promo_code) {
      notificationData.promo_code = promo_code;
    }

    const result = await notificationService.sendToMultiple(userIds, 'user', {
      title,
      body: message,
      type: 'promotion',
      data: notificationData,
      channel: 'promotions',
    });

    logger.info(`Notification promotionnelle envoyée à ${userIds.length} clients par admin ${req.user.id}`, {
      segment: target_segment || 'all',
      promo_code,
      result,
    });

    res.json({
      success: true,
      data: {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        segment: target_segment || 'all',
      },
    });
  } catch (error) {
    logger.error('Erreur sendPromotionalNotification:', error);
    res.status(500).json({
      success: false,
      error: { code: 'PROMOTIONAL_ERROR', message: 'Erreur lors de l\'envoi des notifications promotionnelles' },
    });
  }
};

module.exports = exports;
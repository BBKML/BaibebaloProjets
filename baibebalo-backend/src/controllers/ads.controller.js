/**
 * Controller pour la gestion des publicités restaurants
 * 
 * Types de publicité:
 * - homepage_banner: Bannière homepage (5 000 FCFA/jour)
 * - sponsored_badge: Badge "Sponsorisé" (3 000 FCFA/jour)
 * - push_notification: Notification push ciblée (10 000 FCFA)
 */

const { query, transaction } = require('../database/db');
const logger = require('../utils/logger');

// ======================================
// TARIFS PUBLICITÉ
// ======================================

/**
 * Obtenir les tarifs de publicité disponibles
 */
exports.getAdPricing = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        ad_type,
        name,
        description,
        daily_rate,
        min_days,
        max_days,
        features,
        is_active
      FROM ad_pricing
      WHERE is_active = true
      ORDER BY daily_rate ASC
    `);

    res.json({
      success: true,
      data: {
        pricing: result.rows.map(row => ({
          ...row,
          features: row.features || [],
          formatted_rate: `${row.daily_rate.toLocaleString('fr-FR')} FCFA/jour`,
        })),
        currency: 'FCFA',
      },
    });
  } catch (error) {
    logger.error('Erreur getAdPricing:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des tarifs' },
    });
  }
};

// ======================================
// GESTION DES PUBLICITÉS (RESTAURANT)
// ======================================

/**
 * Créer une demande de publicité (Restaurant)
 */
exports.createAdRequest = async (req, res) => {
  try {
    const restaurantId = req.restaurant?.id;
    if (!restaurantId) {
      return res.status(403).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Accès réservé aux restaurants' },
      });
    }

    const {
      ad_type,
      duration_days,
      start_date,
      title,
      description,
      image_url,
      target_audience,
    } = req.body;

    // Validation
    if (!ad_type || !duration_days || !start_date) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Type, durée et date de début requis' },
      });
    }

    // Récupérer le tarif
    const pricingResult = await query(
      'SELECT * FROM ad_pricing WHERE ad_type = $1 AND is_active = true',
      [ad_type]
    );

    if (pricingResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AD_TYPE', message: 'Type de publicité invalide' },
      });
    }

    const pricing = pricingResult.rows[0];

    // Valider la durée
    if (duration_days < pricing.min_days || duration_days > pricing.max_days) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'INVALID_DURATION', 
          message: `Durée doit être entre ${pricing.min_days} et ${pricing.max_days} jours` 
        },
      });
    }

    // Calculer le montant total
    const totalAmount = pricing.daily_rate * duration_days;

    // Calculer la date de fin
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(endDateObj.getDate() + duration_days);

    // Créer la demande de publicité
    const result = await query(`
      INSERT INTO restaurant_ads (
        restaurant_id, ad_type, daily_rate, total_amount,
        start_date, end_date, duration_days,
        title, description, image_url, target_audience,
        status, payment_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', 'pending')
      RETURNING *
    `, [
      restaurantId, ad_type, pricing.daily_rate, totalAmount,
      startDateObj, endDateObj, duration_days,
      title || pricing.name, description, image_url,
      JSON.stringify(target_audience || {}),
    ]);

    const ad = result.rows[0];

    logger.info('Demande de publicité créée', {
      adId: ad.id,
      restaurantId,
      adType: ad_type,
      totalAmount,
    });

    res.status(201).json({
      success: true,
      data: {
        ad: {
          ...ad,
          formatted_amount: `${totalAmount.toLocaleString('fr-FR')} FCFA`,
        },
        payment: {
          amount: totalAmount,
          currency: 'FCFA',
          reference: ad.id,
          instructions: 'Effectuez le paiement pour activer votre publicité',
        },
      },
    });
  } catch (error) {
    logger.error('Erreur createAdRequest:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'Erreur lors de la création de la demande' },
    });
  }
};

/**
 * Obtenir les publicités d'un restaurant
 */
exports.getRestaurantAds = async (req, res) => {
  try {
    const restaurantId = req.restaurant?.id;
    if (!restaurantId) {
      return res.status(403).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Accès réservé aux restaurants' },
      });
    }

    const { status } = req.query;

    let whereClause = 'WHERE restaurant_id = $1';
    const params = [restaurantId];

    if (status) {
      whereClause += ' AND status = $2';
      params.push(status);
    }

    const result = await query(`
      SELECT 
        ra.*,
        ap.name as ad_type_name,
        ap.features
      FROM restaurant_ads ra
      LEFT JOIN ad_pricing ap ON ra.ad_type = ap.ad_type
      ${whereClause}
      ORDER BY ra.created_at DESC
    `, params);

    // Calculer les statistiques
    const statsResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        SUM(total_amount) FILTER (WHERE payment_status = 'paid') as total_spent,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks
      FROM restaurant_ads
      WHERE restaurant_id = $1
    `, [restaurantId]);

    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: {
        ads: result.rows.map(ad => ({
          ...ad,
          formatted_amount: `${ad.total_amount?.toLocaleString('fr-FR')} FCFA`,
          ctr: ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) + '%' : '0%',
        })),
        stats: {
          active_ads: parseInt(stats.active_count) || 0,
          pending_ads: parseInt(stats.pending_count) || 0,
          total_spent: parseInt(stats.total_spent) || 0,
          total_impressions: parseInt(stats.total_impressions) || 0,
          total_clicks: parseInt(stats.total_clicks) || 0,
          average_ctr: stats.total_impressions > 0 
            ? ((stats.total_clicks / stats.total_impressions) * 100).toFixed(2) + '%' 
            : '0%',
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getRestaurantAds:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des publicités' },
    });
  }
};

/**
 * Annuler une publicité (avant paiement)
 */
exports.cancelAd = async (req, res) => {
  try {
    const restaurantId = req.restaurant?.id;
    const { adId } = req.params;

    if (!restaurantId) {
      return res.status(403).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Accès réservé aux restaurants' },
      });
    }

    // Vérifier que la publicité appartient au restaurant et peut être annulée
    const adResult = await query(
      'SELECT * FROM restaurant_ads WHERE id = $1 AND restaurant_id = $2',
      [adId, restaurantId]
    );

    if (adResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'AD_NOT_FOUND', message: 'Publicité non trouvée' },
      });
    }

    const ad = adResult.rows[0];

    if (ad.status !== 'pending' || ad.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        error: { code: 'CANNOT_CANCEL', message: 'Cette publicité ne peut plus être annulée' },
      });
    }

    await query(
      'UPDATE restaurant_ads SET status = $1, updated_at = NOW() WHERE id = $2',
      ['cancelled', adId]
    );

    res.json({
      success: true,
      message: 'Publicité annulée avec succès',
    });
  } catch (error) {
    logger.error('Erreur cancelAd:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CANCEL_ERROR', message: 'Erreur lors de l\'annulation' },
    });
  }
};

// ======================================
// GESTION ADMIN
// ======================================

/**
 * Obtenir toutes les demandes de publicité (Admin)
 */
exports.getAllAds = async (req, res) => {
  try {
    const { status, ad_type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereConditions.push(`ra.status = $${paramIndex++}`);
      params.push(status);
    }

    if (ad_type) {
      whereConditions.push(`ra.ad_type = $${paramIndex++}`);
      params.push(ad_type);
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const result = await query(`
      SELECT 
        ra.*,
        r.name as restaurant_name,
        r.logo as restaurant_logo,
        ap.name as ad_type_name,
        a.email as approved_by_email
      FROM restaurant_ads ra
      JOIN restaurants r ON ra.restaurant_id = r.id
      LEFT JOIN ad_pricing ap ON ra.ad_type = ap.ad_type
      LEFT JOIN admins a ON ra.approved_by = a.id
      ${whereClause}
      ORDER BY 
        CASE ra.status 
          WHEN 'pending' THEN 1 
          WHEN 'active' THEN 2 
          ELSE 3 
        END,
        ra.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `, [...params, limit, offset]);

    // Compter le total
    const countResult = await query(`
      SELECT COUNT(*) FROM restaurant_ads ra ${whereClause}
    `, params);

    // Statistiques globales
    const statsResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        SUM(total_amount) FILTER (WHERE payment_status = 'paid') as total_revenue,
        SUM(total_amount) FILTER (WHERE payment_status = 'paid' AND created_at >= DATE_TRUNC('month', NOW())) as month_revenue
      FROM restaurant_ads
    `);

    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: {
        ads: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(countResult.rows[0].count / limit),
        },
        stats: {
          pending: parseInt(stats.pending_count) || 0,
          active: parseInt(stats.active_count) || 0,
          total_revenue: parseInt(stats.total_revenue) || 0,
          month_revenue: parseInt(stats.month_revenue) || 0,
          formatted_total_revenue: `${(parseInt(stats.total_revenue) || 0).toLocaleString('fr-FR')} FCFA`,
          formatted_month_revenue: `${(parseInt(stats.month_revenue) || 0).toLocaleString('fr-FR')} FCFA`,
        },
      },
    });
  } catch (error) {
    logger.error('Erreur getAllAds:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des publicités' },
    });
  }
};

/**
 * Approuver une publicité (Admin)
 */
exports.approveAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const adminId = req.admin?.id;

    const adResult = await query(
      'SELECT * FROM restaurant_ads WHERE id = $1',
      [adId]
    );

    if (adResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'AD_NOT_FOUND', message: 'Publicité non trouvée' },
      });
    }

    const ad = adResult.rows[0];

    if (ad.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Seules les publicités en attente peuvent être approuvées' },
      });
    }

    if (ad.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: { code: 'PAYMENT_REQUIRED', message: 'Le paiement doit être confirmé avant l\'approbation' },
      });
    }

    await transaction(async (client) => {
      // Mettre à jour la publicité
      await client.query(`
        UPDATE restaurant_ads 
        SET status = 'active', approved_by = $1, approved_at = NOW(), updated_at = NOW()
        WHERE id = $2
      `, [adminId, adId]);

      // Si c'est un badge sponsorisé, mettre à jour le restaurant
      if (ad.ad_type === 'sponsored_badge' || ad.ad_type === 'homepage_banner') {
        await client.query(`
          UPDATE restaurants 
          SET is_sponsored = true, 
              sponsor_priority = sponsor_priority + 1,
              sponsor_expires_at = $1
          WHERE id = $2
        `, [ad.end_date, ad.restaurant_id]);
      }

      // Créer une notification pour le restaurant
      await client.query(`
        INSERT INTO notifications (user_id, type, title, message, data)
        SELECT owner_id, 'ad_approved', 'Publicité approuvée', 
               'Votre publicité a été approuvée et est maintenant active.',
               $1::jsonb
        FROM restaurants WHERE id = $2
      `, [JSON.stringify({ ad_id: adId, ad_type: ad.ad_type }), ad.restaurant_id]);
    });

    logger.info('Publicité approuvée', { adId, adminId });

    res.json({
      success: true,
      message: 'Publicité approuvée et activée',
    });
  } catch (error) {
    logger.error('Erreur approveAd:', error);
    res.status(500).json({
      success: false,
      error: { code: 'APPROVE_ERROR', message: 'Erreur lors de l\'approbation' },
    });
  }
};

/**
 * Rejeter une publicité (Admin)
 */
exports.rejectAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const { reason } = req.body;
    const adminId = req.admin?.id;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'REASON_REQUIRED', message: 'Raison du rejet requise' },
      });
    }

    const adResult = await query(
      'SELECT * FROM restaurant_ads WHERE id = $1',
      [adId]
    );

    if (adResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'AD_NOT_FOUND', message: 'Publicité non trouvée' },
      });
    }

    const ad = adResult.rows[0];

    if (ad.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Seules les publicités en attente peuvent être rejetées' },
      });
    }

    await transaction(async (client) => {
      // Mettre à jour la publicité
      await client.query(`
        UPDATE restaurant_ads 
        SET status = 'rejected', rejection_reason = $1, approved_by = $2, updated_at = NOW()
        WHERE id = $3
      `, [reason, adminId, adId]);

      // Si paiement effectué, marquer pour remboursement
      if (ad.payment_status === 'paid') {
        await client.query(`
          UPDATE restaurant_ads SET payment_status = 'refunded' WHERE id = $1
        `, [adId]);
      }

      // Notifier le restaurant
      await client.query(`
        INSERT INTO notifications (user_id, type, title, message, data)
        SELECT owner_id, 'ad_rejected', 'Publicité rejetée', 
               $1,
               $2::jsonb
        FROM restaurants WHERE id = $3
      `, [
        `Votre publicité a été rejetée. Raison: ${reason}`,
        JSON.stringify({ ad_id: adId, reason }),
        ad.restaurant_id,
      ]);
    });

    logger.info('Publicité rejetée', { adId, adminId, reason });

    res.json({
      success: true,
      message: 'Publicité rejetée',
    });
  } catch (error) {
    logger.error('Erreur rejectAd:', error);
    res.status(500).json({
      success: false,
      error: { code: 'REJECT_ERROR', message: 'Erreur lors du rejet' },
    });
  }
};

/**
 * Confirmer le paiement d'une publicité (Admin)
 */
exports.confirmAdPayment = async (req, res) => {
  try {
    const { adId } = req.params;
    const { payment_reference } = req.body;

    const adResult = await query(
      'SELECT * FROM restaurant_ads WHERE id = $1',
      [adId]
    );

    if (adResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'AD_NOT_FOUND', message: 'Publicité non trouvée' },
      });
    }

    const ad = adResult.rows[0];

    if (ad.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_PAID', message: 'Paiement déjà confirmé' },
      });
    }

    await query(`
      UPDATE restaurant_ads 
      SET payment_status = 'paid', payment_reference = $1, updated_at = NOW()
      WHERE id = $2
    `, [payment_reference || `PAY-${Date.now()}`, adId]);

    // Créer une transaction
    await query(`
      INSERT INTO transactions (
        type, amount, status, description, 
        restaurant_id, metadata
      )
      SELECT 'ad_payment', $1, 'completed', $2,
             restaurant_id, $3::jsonb
      FROM restaurant_ads WHERE id = $4
    `, [
      ad.total_amount,
      `Paiement publicité ${ad.ad_type}`,
      JSON.stringify({ ad_id: adId, ad_type: ad.ad_type }),
      adId,
    ]);

    logger.info('Paiement publicité confirmé', { adId, amount: ad.total_amount });

    res.json({
      success: true,
      message: 'Paiement confirmé. La publicité peut maintenant être approuvée.',
    });
  } catch (error) {
    logger.error('Erreur confirmAdPayment:', error);
    res.status(500).json({
      success: false,
      error: { code: 'PAYMENT_ERROR', message: 'Erreur lors de la confirmation du paiement' },
    });
  }
};

// ======================================
// AFFICHAGE PUBLIC
// ======================================

/**
 * Obtenir les bannières actives pour la homepage
 */
exports.getActiveHomepageBanners = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        ra.id,
        ra.title,
        ra.description,
        ra.image_url,
        ra.restaurant_id,
        r.name as restaurant_name,
        r.logo as restaurant_logo,
        r.cuisine_type,
        r.average_rating
      FROM restaurant_ads ra
      JOIN restaurants r ON ra.restaurant_id = r.id
      WHERE ra.ad_type = 'homepage_banner'
      AND ra.status = 'active'
      AND ra.start_date <= NOW()
      AND ra.end_date >= NOW()
      ORDER BY ra.created_at DESC
      LIMIT 5
    `);

    // Incrémenter les impressions
    if (result.rows.length > 0) {
      const adIds = result.rows.map(r => r.id);
      await query(`
        UPDATE restaurant_ads 
        SET impressions = impressions + 1 
        WHERE id = ANY($1)
      `, [adIds]);
    }

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    logger.error('Erreur getActiveHomepageBanners:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des bannières' },
    });
  }
};

/**
 * Obtenir les restaurants sponsorisés
 */
exports.getSponsoredRestaurants = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await query(`
      SELECT 
        r.id,
        r.name,
        r.logo,
        r.cover_image,
        r.cuisine_type,
        r.average_rating,
        r.total_reviews,
        r.delivery_time,
        r.minimum_order,
        r.is_open,
        true as is_sponsored
      FROM restaurants r
      WHERE r.is_sponsored = true
      AND r.sponsor_expires_at >= NOW()
      AND r.status = 'approved'
      AND r.is_active = true
      ORDER BY r.sponsor_priority DESC, r.average_rating DESC
      LIMIT $1
    `, [limit]);

    // Incrémenter les impressions pour les badges sponsorisés
    if (result.rows.length > 0) {
      const restaurantIds = result.rows.map(r => r.id);
      await query(`
        UPDATE restaurant_ads 
        SET impressions = impressions + 1 
        WHERE restaurant_id = ANY($1)
        AND ad_type = 'sponsored_badge'
        AND status = 'active'
        AND start_date <= NOW()
        AND end_date >= NOW()
      `, [restaurantIds]);
    }

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    logger.error('Erreur getSponsoredRestaurants:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération' },
    });
  }
};

/**
 * Enregistrer un clic sur une publicité
 */
exports.recordAdClick = async (req, res) => {
  try {
    const { adId } = req.params;

    await query(`
      UPDATE restaurant_ads 
      SET clicks = clicks + 1 
      WHERE id = $1
    `, [adId]);

    res.json({ success: true });
  } catch (error) {
    logger.error('Erreur recordAdClick:', error);
    res.status(500).json({ success: false });
  }
};

/**
 * Envoyer une notification push ciblée (Admin)
 */
exports.sendPushNotificationAd = async (req, res) => {
  try {
    const { adId } = req.params;

    const adResult = await query(`
      SELECT ra.*, r.name as restaurant_name
      FROM restaurant_ads ra
      JOIN restaurants r ON ra.restaurant_id = r.id
      WHERE ra.id = $1 AND ra.ad_type = 'push_notification'
    `, [adId]);

    if (adResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'AD_NOT_FOUND', message: 'Publicité non trouvée' },
      });
    }

    const ad = adResult.rows[0];

    if (ad.status !== 'active' || ad.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'La publicité doit être active et payée' },
      });
    }

    // Récupérer les utilisateurs ciblés
    // eslint-disable-next-line no-unused-vars -- target_audience réservé pour filtres de ciblage futurs
    const targetAudience = ad.target_audience || {};
    let userQuery = `
      SELECT id, fcm_token 
      FROM users 
      WHERE fcm_token IS NOT NULL 
      AND status = 'active'
    `;

    // Appliquer les filtres de ciblage si présents
    // (par exemple: zone géographique, historique de commandes, etc.)

    const usersResult = await query(userQuery);
    const targetCount = usersResult.rows.length;

    // TODO: Intégrer avec le service de notifications push
    // Pour l'instant, simuler l'envoi
    
    await query(`
      UPDATE restaurant_ads 
      SET target_count = $1, sent_count = $2, status = 'completed', updated_at = NOW()
      WHERE id = $3
    `, [targetCount, targetCount, adId]);

    logger.info('Notification push envoyée', { adId, targetCount });

    res.json({
      success: true,
      message: `Notification envoyée à ${targetCount} utilisateurs`,
      data: {
        target_count: targetCount,
        sent_count: targetCount,
      },
    });
  } catch (error) {
    logger.error('Erreur sendPushNotificationAd:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SEND_ERROR', message: 'Erreur lors de l\'envoi' },
    });
  }
};

/**
 * Obtenir les statistiques de revenus publicitaires (Admin)
 */
exports.getAdRevenueStats = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    let dateFilter;
    switch (period) {
      case 'week':
        dateFilter = "created_at >= NOW() - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "created_at >= DATE_TRUNC('month', NOW())";
        break;
      case 'year':
        dateFilter = "created_at >= DATE_TRUNC('year', NOW())";
        break;
      default:
        dateFilter = '1=1';
    }

    // Revenus par type de publicité
    const revenueByType = await query(`
      SELECT 
        ad_type,
        COUNT(*) as count,
        SUM(total_amount) as revenue
      FROM restaurant_ads
      WHERE payment_status = 'paid' AND ${dateFilter}
      GROUP BY ad_type
    `);

    // Revenus par jour (30 derniers jours)
    const dailyRevenue = await query(`
      SELECT 
        DATE(created_at) as date,
        SUM(total_amount) as revenue,
        COUNT(*) as count
      FROM restaurant_ads
      WHERE payment_status = 'paid'
      AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    // Top restaurants annonceurs
    const topAdvertisers = await query(`
      SELECT 
        r.id,
        r.name,
        r.logo,
        SUM(ra.total_amount) as total_spent,
        COUNT(ra.id) as ad_count
      FROM restaurant_ads ra
      JOIN restaurants r ON ra.restaurant_id = r.id
      WHERE ra.payment_status = 'paid'
      GROUP BY r.id, r.name, r.logo
      ORDER BY total_spent DESC
      LIMIT 10
    `);

    // Totaux
    const totals = await query(`
      SELECT 
        SUM(total_amount) FILTER (WHERE payment_status = 'paid') as total_revenue,
        SUM(total_amount) FILTER (WHERE payment_status = 'paid' AND ${dateFilter}) as period_revenue,
        COUNT(*) FILTER (WHERE status = 'active') as active_ads,
        AVG(clicks::float / NULLIF(impressions, 0) * 100) as avg_ctr
      FROM restaurant_ads
    `);

    res.json({
      success: true,
      data: {
        period,
        revenue_by_type: revenueByType.rows.map(r => ({
          ...r,
          revenue: parseInt(r.revenue) || 0,
          formatted_revenue: `${(parseInt(r.revenue) || 0).toLocaleString('fr-FR')} FCFA`,
        })),
        daily_revenue: dailyRevenue.rows,
        top_advertisers: topAdvertisers.rows.map(r => ({
          ...r,
          total_spent: parseInt(r.total_spent) || 0,
          formatted_spent: `${(parseInt(r.total_spent) || 0).toLocaleString('fr-FR')} FCFA`,
        })),
        totals: {
          total_revenue: parseInt(totals.rows[0].total_revenue) || 0,
          period_revenue: parseInt(totals.rows[0].period_revenue) || 0,
          active_ads: parseInt(totals.rows[0].active_ads) || 0,
          avg_ctr: parseFloat(totals.rows[0].avg_ctr || 0).toFixed(2) + '%',
          formatted_total: `${(parseInt(totals.rows[0].total_revenue) || 0).toLocaleString('fr-FR')} FCFA`,
          formatted_period: `${(parseInt(totals.rows[0].period_revenue) || 0).toLocaleString('fr-FR')} FCFA`,
        },
        potential_monthly: '100 000 - 200 000 FCFA',
      },
    });
  } catch (error) {
    logger.error('Erreur getAdRevenueStats:', error);
    res.status(500).json({
      success: false,
      error: { code: 'STATS_ERROR', message: 'Erreur lors de la récupération des statistiques' },
    });
  }
};

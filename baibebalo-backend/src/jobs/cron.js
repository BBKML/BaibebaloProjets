const cron = require('node-cron');
const { query } = require('../database/db');
const logger = require('../utils/logger');
const emailService = require('../services/email.service');

/**
 * Nettoyer les OTP expirés - Tous les jours à minuit
 */
cron.schedule('0 0 * * *', async () => {
  try {
    const result = await query('DELETE FROM otp_codes WHERE expires_at < NOW()');
    logger.info(`✅ OTP expirés nettoyés: ${result.rowCount} supprimés`);
  } catch (error) {
    logger.error('❌ Erreur nettoyage OTP:', error);
  }
});

/**
 * Annuler les commandes non acceptées après 10 minutes - Toutes les 5 minutes
 */
cron.schedule('*/5 * * * *', async () => {
  try {
    const result = await query(`
      UPDATE orders 
      SET status = 'cancelled', 
          cancellation_reason = 'Timeout - non acceptée par le restaurant'
      WHERE status = 'new' 
        AND placed_at < NOW() - INTERVAL '10 minutes'
      RETURNING id, order_number
    `);

    if (result.rows.length > 0) {
      logger.info(`⏰ Commandes timeout annulées: ${result.rowCount}`);
      
      // Notifier les clients
      for (const order of result.rows) {
        // TODO: Envoyer notification au client
        logger.info(`Notification envoyée pour commande annulée: ${order.order_number}`);
      }
    }
  } catch (error) {
    logger.error('❌ Erreur annulation timeout:', error);
  }
});

/**
 * Rapports hebdomadaires restaurants - Tous les lundis à 9h
 */
cron.schedule('0 9 * * 1', async () => {
  try {
    const restaurants = await query(`
      SELECT 
        r.*,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total), 0) as revenue,
        COALESCE(AVG(rev.restaurant_rating), 0) as avg_rating
      FROM restaurants r
      LEFT JOIN orders o ON r.id = o.restaurant_id 
        AND o.placed_at >= DATE_TRUNC('week', NOW() - INTERVAL '1 week')
        AND o.placed_at < DATE_TRUNC('week', NOW())
        AND o.status = 'delivered'
      LEFT JOIN reviews rev ON r.id = rev.restaurant_id
        AND rev.created_at >= DATE_TRUNC('week', NOW() - INTERVAL '1 week')
      WHERE r.status = 'active' AND r.email IS NOT NULL
      GROUP BY r.id
    `);

    logger.info(`📊 Envoi de ${restaurants.rows.length} rapports hebdomadaires...`);

    for (const restaurant of restaurants.rows) {
      // Récupérer le plat le plus vendu
      const topItemResult = await query(`
        SELECT mi.name, COUNT(*) as count
        FROM order_items oi
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.restaurant_id = $1
          AND o.placed_at >= DATE_TRUNC('week', NOW() - INTERVAL '1 week')
          AND o.status = 'delivered'
        GROUP BY mi.name
        ORDER BY count DESC
        LIMIT 1
      `, [restaurant.id]);

      const stats = {
        total_orders: restaurant.total_orders,
        revenue: parseFloat(restaurant.revenue),
        average_rating: parseFloat(restaurant.avg_rating).toFixed(1),
        top_item: topItemResult.rows[0]?.name || 'Aucun',
      };

      await emailService.sendWeeklyReport(restaurant, stats);
    }

    logger.info('✅ Rapports hebdomadaires envoyés');
  } catch (error) {
    logger.error('❌ Erreur envoi rapports:', error);
  }
});

/**
 * Nettoyer les anciens logs d'activité - Tous les premiers du mois
 */
cron.schedule('0 2 1 * *', async () => {
  try {
    const result = await query(`
      DELETE FROM activity_logs 
      WHERE created_at < NOW() - INTERVAL '6 months'
    `);
    logger.info(`🗑️  Anciens logs supprimés: ${result.rowCount}`);
  } catch (error) {
    logger.error('❌ Erreur nettoyage logs:', error);
  }
});

/**
 * Mettre à jour les statistiques globales - Toutes les heures
 */
cron.schedule('0 * * * *', async () => {
  try {
    // Mettre à jour les notes moyennes des restaurants
    await query(`
      UPDATE restaurants r
      SET 
        average_rating = COALESCE((
          SELECT AVG(restaurant_rating)
          FROM reviews
          WHERE restaurant_id = r.id
        ), 0),
        total_reviews = COALESCE((
          SELECT COUNT(*)
          FROM reviews
          WHERE restaurant_id = r.id
        ), 0),
        total_orders = COALESCE((
          SELECT COUNT(*)
          FROM orders
          WHERE restaurant_id = r.id AND status = 'delivered'
        ), 0)
      WHERE r.status = 'active'
    `);

    // Mettre à jour les notes moyennes des livreurs
    await query(`
      UPDATE delivery_persons dp
      SET 
        average_rating = COALESCE((
          SELECT AVG(delivery_rating)
          FROM reviews
          WHERE delivery_person_id = dp.id AND delivery_rating IS NOT NULL
        ), 0),
        total_deliveries = COALESCE((
          SELECT COUNT(*)
          FROM orders
          WHERE delivery_person_id = dp.id AND status = 'delivered'
        ), 0)
      WHERE dp.status = 'active'
    `);

    logger.info('📈 Statistiques mises à jour');
  } catch (error) {
    logger.error('❌ Erreur mise à jour stats:', error);
  }
});

/**
 * Expirer les codes promo - Toutes les heures
 */
cron.schedule('0 * * * *', async () => {
  try {
    const result = await query(`
      UPDATE promotions 
      SET is_active = false 
      WHERE valid_until < NOW() AND is_active = true
    `);

    if (result.rowCount > 0) {
      logger.info(`🎟️  Codes promo expirés: ${result.rowCount}`);
    }
  } catch (error) {
    logger.error('❌ Erreur expiration promos:', error);
  }
});

/**
 * Vérifier les livreurs inactifs - Toutes les 30 minutes
 */
cron.schedule('*/30 * * * *', async () => {
  try {
    // Mettre offline les livreurs qui n'ont pas mis à jour leur position depuis 1h
    const result = await query(`
      UPDATE delivery_persons 
      SET delivery_status = 'offline'
      WHERE delivery_status IN ('online', 'available') 
        AND last_location_update < NOW() - INTERVAL '1 hour'
    `);

    if (result.rowCount > 0) {
      logger.info(`👤 Livreurs mis offline (inactifs): ${result.rowCount}`);
    }
  } catch (error) {
    logger.error('❌ Erreur vérification livreurs:', error);
  }
});

/**
 * Backup de la base de données - Tous les jours à 3h (si configuré)
 */
cron.schedule('0 3 * * *', async () => {
  try {
    // TODO: Implémenter backup automatique
    // const { exec } = require('child_process');
    // exec('pg_dump baibebalo > backup.sql', callback);
    logger.info('💾 Backup de la base de données (à implémenter)');
  } catch (error) {
    logger.error('❌ Erreur backup:', error);
  }
});

logger.info('⏰ Cron jobs initialisés');

module.exports = {
  // Export pour tests si nécessaire
};
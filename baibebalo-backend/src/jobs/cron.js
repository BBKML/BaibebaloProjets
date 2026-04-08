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
 * Paiement hebdomadaire automatique - Tous les lundis à 9h
 * Génère automatiquement les demandes de retrait pour livreurs et restaurants
 */
cron.schedule('0 9 * * 1', async () => {
  try {
    logger.info('💰 Début du paiement hebdomadaire automatique...');

    // === LIVREURS ===
    const deliveryPersons = await query(`
      SELECT id, first_name, last_name, phone, available_balance, mobile_money_number, mobile_money_provider
      FROM delivery_persons
      WHERE status = 'active' 
        AND COALESCE(available_balance, 0) > 0
        AND mobile_money_number IS NOT NULL
    `);

    logger.info(`📦 ${deliveryPersons.rows.length} livreur(s) avec solde > 0`);

    for (const dp of deliveryPersons.rows) {
      const amount = parseFloat(dp.available_balance);
      
      // Vérifier s'il n'y a pas déjà une demande en cours
      const existingPayout = await query(
        `SELECT id FROM payout_requests 
         WHERE user_type = 'delivery' AND user_id = $1 
         AND status IN ('pending', 'paid') 
         AND created_at >= DATE_TRUNC('week', CURRENT_DATE)`,
        [dp.id]
      );

      if (existingPayout.rows.length === 0 && amount >= 1000) {
        await query(
          `INSERT INTO payout_requests (
            user_type, user_id, amount, payment_method, account_number, status
          ) VALUES ($1, $2, $3, $4, $5, 'pending')`,
          ['delivery', dp.id, amount, dp.mobile_money_provider || 'mobile_money', dp.mobile_money_number]
        );
        logger.info(`✅ Payout créé pour livreur ${dp.first_name} ${dp.last_name}: ${amount} FCFA`);
      }
    }

    // === RESTAURANTS ===
    // Calculer le solde de chaque restaurant depuis les transactions
    // NOTE: Les commandes payées par livreur (restaurant_paid_by_delivery = true) sont automatiquement exclues
    // car confirmDelivery ne crée pas de transaction order_payment pour ces commandes
    const restaurants = await query(`
      SELECT 
        r.id, r.name, r.phone, r.mobile_money_number, r.mobile_money_provider,
        COALESCE(SUM(CASE WHEN t.to_user_id = r.id AND t.to_user_type = 'restaurant' AND t.transaction_type = 'order_payment' THEN t.amount ELSE 0 END), 0) as credits,
        COALESCE(SUM(CASE WHEN t.from_user_id = r.id AND t.from_user_type = 'restaurant' THEN t.amount ELSE 0 END), 0) as debits
      FROM restaurants r
      LEFT JOIN transactions t ON (t.to_user_id = r.id OR t.from_user_id = r.id) AND t.status = 'completed'
      WHERE r.status = 'active'
      GROUP BY r.id, r.name, r.phone, r.mobile_money_number, r.mobile_money_provider
      HAVING COALESCE(SUM(CASE WHEN t.to_user_id = r.id AND t.to_user_type = 'restaurant' AND t.transaction_type = 'order_payment' THEN t.amount ELSE 0 END), 0) - 
             COALESCE(SUM(CASE WHEN t.from_user_id = r.id AND t.from_user_type = 'restaurant' THEN t.amount ELSE 0 END), 0) > 0
    `);

    logger.info(`🍽️  ${restaurants.rows.length} restaurant(s) avec solde > 0`);

    for (const rest of restaurants.rows) {
      const credits = parseFloat(rest.credits) || 0;
      const debits = parseFloat(rest.debits) || 0;
      const balance = credits - debits;

      // Vérifier les demandes en cours
      const pendingPayouts = await query(
        `SELECT COALESCE(SUM(amount), 0) as pending_amount
         FROM payout_requests 
         WHERE user_type = 'restaurant' AND user_id = $1 
         AND status IN ('pending', 'paid')`,
        [rest.id]
      );

      const pendingAmount = parseFloat(pendingPayouts.rows[0].pending_amount) || 0;
      const availableBalance = balance - pendingAmount;

      // Vérifier s'il n'y a pas déjà une demande cette semaine
      const existingPayout = await query(
        `SELECT id FROM payout_requests 
         WHERE user_type = 'restaurant' AND user_id = $1 
         AND status IN ('pending', 'paid') 
         AND created_at >= DATE_TRUNC('week', CURRENT_DATE)`,
        [rest.id]
      );

      if (existingPayout.rows.length === 0 && availableBalance >= 10000 && rest.mobile_money_number) {
        await query(
          `INSERT INTO payout_requests (
            user_type, user_id, amount, payment_method, account_number, status
          ) VALUES ($1, $2, $3, $4, $5, 'pending')`,
          ['restaurant', rest.id, availableBalance, rest.mobile_money_provider || 'mobile_money', rest.mobile_money_number]
        );
        logger.info(`✅ Payout créé pour restaurant ${rest.name}: ${availableBalance} FCFA`);
      }
    }

    logger.info('✅ Paiement hebdomadaire automatique terminé');
  } catch (error) {
    logger.error('❌ Erreur paiement hebdomadaire:', error);
  }
});

/**
 * Rapports hebdomadaires restaurants - Tous les lundis à 9h30 (après paiements)
 */
cron.schedule('30 9 * * 1', async () => {
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

/**
 * Propositions de course expirées — proposer au livreur suivant (attribution auto type Glovo)
 * Nécessite app pour Socket.IO / push. Schedulé via init(app) appelé par server.js
 */
function init(app) {
  if (!app) return;
  cron.schedule('* * * * *', async () => {
    try {
      const { query } = require('../database/db');
      const deliveryProposalService = require('../services/deliveryProposal.service');
      const expired = await query(
        `SELECT o.id, o.order_number FROM orders o
         WHERE o.status = 'ready' AND o.delivery_person_id IS NULL
           AND EXISTS (SELECT 1 FROM order_delivery_proposals p WHERE p.order_id = o.id)
           AND NOT EXISTS (SELECT 1 FROM order_delivery_proposals p WHERE p.order_id = o.id AND p.expires_at > NOW())`
      );
      for (const row of expired.rows) {
        await deliveryProposalService.clearProposalAndProposeNext(row.id, app);
        logger.info(`Proposition expirée pour ${row.order_number}, passage au livreur suivant`);
      }
    } catch (error) {
      logger.error('❌ Erreur cron propositions expirées:', error);
    }
  });
  logger.info('⏰ Cron propositions livreur (attribution auto) initialisé');
}

/**
 * Bonus performance livreurs — Tous les jours à 23h30
 * Si un livreur fait 10+ livraisons dans la journée → +500 FCFA bonus
 * Si 20+ livraisons → +1500 FCFA bonus
 */
cron.schedule('30 23 * * *', async () => {
  try {
    logger.info('🏆 Calcul des bonus performance livreurs...');
    const today = new Date().toISOString().split('T')[0];

    const performers = await query(`
      SELECT dp.id, dp.first_name, dp.last_name,
             COUNT(o.id) AS deliveries_count
      FROM delivery_persons dp
      JOIN orders o ON o.delivery_person_id = dp.id
        AND o.status = 'delivered'
        AND DATE(o.delivered_at) = $1
      WHERE dp.status = 'active'
      GROUP BY dp.id, dp.first_name, dp.last_name
      HAVING COUNT(o.id) >= 10
    `, [today]);

    for (const dp of performers.rows) {
      const count = parseInt(dp.deliveries_count);
      const bonusAmount = count >= 20 ? 1500 : 500;

      // Insérer le bonus (UNIQUE sur delivery_person_id + bonus_date évite les doublons)
      const inserted = await query(`
        INSERT INTO delivery_performance_bonuses
          (delivery_person_id, bonus_date, deliveries_count, bonus_amount, status)
        VALUES ($1, $2, $3, $4, 'paid')
        ON CONFLICT (delivery_person_id, bonus_date) DO NOTHING
        RETURNING id
      `, [dp.id, today, count, bonusAmount]);

      if (inserted.rowCount > 0) {
        // Créditer le solde du livreur
        await query(
          `UPDATE delivery_persons SET available_balance = COALESCE(available_balance, 0) + $1 WHERE id = $2`,
          [bonusAmount, dp.id]
        );
        // Enregistrer la transaction
        await query(`
          INSERT INTO transactions (from_user_type, to_user_id, to_user_type, amount, transaction_type, status, description)
          VALUES ('platform', $1, 'delivery', $2, 'bonus', 'completed', $3)
        `, [dp.id, bonusAmount, `Bonus performance: ${count} livraisons le ${today}`]);

        logger.info(`🏆 Bonus ${bonusAmount} FCFA attribué à ${dp.first_name} ${dp.last_name} (${count} livraisons)`);
      }
    }

    logger.info(`✅ Bonus performance traités: ${performers.rows.length} livreur(s)`);
  } catch (error) {
    logger.error('❌ Erreur cron bonus performance:', error);
  }
});

/**
 * Commandes programmées — Toutes les minutes
 * Active les commandes avec scheduled_at <= NOW() qui sont en statut 'scheduled'
 */
cron.schedule('* * * * *', async () => {
  try {
    const result = await query(`
      UPDATE orders
      SET status = 'new', placed_at = NOW()
      WHERE status = 'scheduled'
        AND scheduled_at IS NOT NULL
        AND scheduled_at <= NOW()
      RETURNING id, order_number, user_id
    `);

    if (result.rowCount > 0) {
      logger.info(`⏰ ${result.rowCount} commande(s) programmée(s) activée(s)`);
      for (const order of result.rows) {
        try {
          const notificationService = require('../services/notification.service');
          await notificationService.sendOrderNotification(order.id, 'client', 'order_confirmed');
        } catch (e) {
          logger.warn(`Notification commande programmée ${order.order_number} ignorée`);
        }
      }
    }
  } catch (error) {
    logger.error('❌ Erreur cron commandes programmées:', error);
  }
});

/**
 * Réinitialiser le statut "plat du jour" — Tous les jours à minuit
 * Les plats du jour ne sont valables que pour la journée courante
 */
cron.schedule('1 0 * * *', async () => {
  try {
    const result = await query(`
      UPDATE menu_items
      SET is_daily_special = false
      WHERE is_daily_special = true
        AND (daily_special_date IS NULL OR daily_special_date < CURRENT_DATE)
    `);
    if (result.rowCount > 0) {
      logger.info(`🍽️ Plats du jour réinitialisés: ${result.rowCount}`);
    }
  } catch (error) {
    logger.error('❌ Erreur cron plat du jour reset:', error);
  }
});

logger.info('⏰ Cron jobs initialisés');

module.exports = {
  init,
};
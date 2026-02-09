/**
 * Script de test pour vérifier les calculs de commission des livreurs
 * 
 * Usage:
 * node scripts/test-commission-livreurs.js [delivery_person_id]
 */

const { Pool } = require('pg');
const config = require('../src/config');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || config.database.url,
});

async function testCommissionCalculations(deliveryPersonId) {
  console.log('🧪 Test des calculs de commission pour le livreur:', deliveryPersonId || 'TOUS');
  console.log('=' .repeat(80));

  try {
    // 1. Récupérer les informations du livreur
    const deliveryPersonQuery = deliveryPersonId
      ? `SELECT id, first_name, last_name, total_earnings, total_deliveries FROM delivery_persons WHERE id = $1`
      : `SELECT id, first_name, last_name, total_earnings, total_deliveries FROM delivery_persons LIMIT 5`;
    
    const deliveryPersons = await pool.query(
      deliveryPersonQuery,
      deliveryPersonId ? [deliveryPersonId] : []
    );

    if (deliveryPersons.rows.length === 0) {
      console.log('❌ Aucun livreur trouvé');
      return;
    }

    for (const dp of deliveryPersons.rows) {
      console.log(`\n📦 Livreur: ${dp.first_name} ${dp.last_name} (ID: ${dp.id})`);
      console.log(`   Gains totaux (table): ${dp.total_earnings} FCFA`);
      console.log(`   Livraisons totales: ${dp.total_deliveries}`);

      // 2. Calculer les gains réels depuis les transactions
      const earningsQuery = `
        SELECT 
          COALESCE(SUM(t.amount) FILTER (
            WHERE t.transaction_type = 'delivery_fee' 
            AND (t.order_id IS NOT NULL AND o.delivered_at >= CURRENT_DATE - INTERVAL '30 days')
            OR (t.order_id IS NULL AND t.created_at >= CURRENT_DATE - INTERVAL '30 days')
          ), 0) as earnings_30d,
          COALESCE(SUM(t.amount) FILTER (
            WHERE t.transaction_type = 'delivery_fee' 
            AND (t.order_id IS NOT NULL AND o.delivered_at >= CURRENT_DATE - INTERVAL '7 days')
            OR (t.order_id IS NULL AND t.created_at >= CURRENT_DATE - INTERVAL '7 days')
          ), 0) as earnings_7d,
          COALESCE(SUM(t.amount) FILTER (
            WHERE t.transaction_type = 'delivery_fee' 
            AND (t.order_id IS NOT NULL AND DATE(o.delivered_at) = CURRENT_DATE)
            OR (t.order_id IS NULL AND DATE(t.created_at) = CURRENT_DATE)
          ), 0) as earnings_today,
          COALESCE(SUM(t.amount) FILTER (WHERE t.transaction_type = 'delivery_fee'), 0) as total_earnings_all_time,
          COUNT(*) FILTER (
            WHERE t.transaction_type = 'delivery_fee' 
            AND (t.order_id IS NOT NULL AND o.delivered_at >= CURRENT_DATE - INTERVAL '30 days')
            OR (t.order_id IS NULL AND t.created_at >= CURRENT_DATE - INTERVAL '30 days')
          ) as deliveries_30d
        FROM transactions t
        LEFT JOIN orders o ON t.order_id = o.id AND o.status = 'delivered'
        WHERE t.to_user_id = $1 
          AND t.to_user_type = 'delivery' 
          AND t.transaction_type = 'delivery_fee' 
          AND t.status = 'completed'
      `;

      const earningsResult = await pool.query(earningsQuery, [dp.id]);
      const earnings = earningsResult.rows[0];

      // 3. Calculer les frais de livraison totaux
      const deliveryFeesQuery = `
        SELECT 
          COALESCE(SUM(delivery_fee) FILTER (WHERE status = 'delivered' AND delivered_at >= CURRENT_DATE - INTERVAL '30 days'), 0) as delivery_fees_30d,
          COALESCE(SUM(delivery_fee) FILTER (WHERE status = 'delivered' AND delivered_at >= CURRENT_DATE - INTERVAL '7 days'), 0) as delivery_fees_7d,
          COALESCE(SUM(delivery_fee) FILTER (WHERE status = 'delivered' AND DATE(delivered_at) = CURRENT_DATE), 0) as delivery_fees_today,
          COALESCE(SUM(delivery_fee) FILTER (WHERE status = 'delivered'), 0) as delivery_fees_all_time
        FROM orders
        WHERE delivery_person_id = $1 AND status = 'delivered'
      `;

      const deliveryFeesResult = await pool.query(deliveryFeesQuery, [dp.id]);
      const deliveryFees = deliveryFeesResult.rows[0];

      // 4. Calculer les gains liés uniquement aux commandes (pour la commission)
      const earningsFromOrdersQuery = `
        SELECT 
          COALESCE(SUM(t.amount) FILTER (WHERE o.delivered_at >= CURRENT_DATE - INTERVAL '30 days'), 0) as earnings_30d,
          COALESCE(SUM(t.amount) FILTER (WHERE o.delivered_at >= CURRENT_DATE - INTERVAL '7 days'), 0) as earnings_7d,
          COALESCE(SUM(t.amount) FILTER (WHERE DATE(o.delivered_at) = CURRENT_DATE), 0) as earnings_today,
          COALESCE(SUM(t.amount), 0) as total_earnings_all_time
        FROM transactions t
        INNER JOIN orders o ON t.order_id = o.id
        WHERE t.to_user_id = $1 
          AND t.to_user_type = 'delivery' 
          AND t.transaction_type = 'delivery_fee' 
          AND t.status = 'completed'
          AND o.status = 'delivered'
      `;

      const earningsFromOrdersResult = await pool.query(earningsFromOrdersQuery, [dp.id]);
      const earningsFromOrders = earningsFromOrdersResult.rows[0];

      // 5. Calculer les commissions
      const deliveryFees30d = parseFloat(deliveryFees.delivery_fees_30d || 0);
      const deliveryFees7d = parseFloat(deliveryFees.delivery_fees_7d || 0);
      const deliveryFeesToday = parseFloat(deliveryFees.delivery_fees_today || 0);
      const deliveryFeesAllTime = parseFloat(deliveryFees.delivery_fees_all_time || 0);

      const earnings30d = parseFloat(earningsFromOrders.earnings_30d || 0);
      const earnings7d = parseFloat(earningsFromOrders.earnings_7d || 0);
      const earningsToday = parseFloat(earningsFromOrders.earnings_today || 0);
      const earningsAllTime = parseFloat(earningsFromOrders.total_earnings_all_time || 0);

      const commission30d = Math.max(0, deliveryFees30d - earnings30d);
      const commission7d = Math.max(0, deliveryFees7d - earnings7d);
      const commissionToday = Math.max(0, deliveryFeesToday - earningsToday);
      const commissionAllTime = Math.max(0, deliveryFeesAllTime - earningsAllTime);

      // 6. Afficher les résultats
      console.log('\n📊 RÉSULTATS PAR PÉRIODE:');
      console.log('─'.repeat(80));
      
      console.log('\n📅 AUJOURD\'HUI:');
      console.log(`   Frais de livraison: ${deliveryFeesToday.toFixed(2)} FCFA`);
      console.log(`   Gains livreur: ${earningsToday.toFixed(2)} FCFA`);
      console.log(`   Commission Baibebalo: ${commissionToday.toFixed(2)} FCFA`);
      if (deliveryFeesToday > 0) {
        const percentage = ((commissionToday / deliveryFeesToday) * 100).toFixed(2);
        console.log(`   Pourcentage commission: ${percentage}%`);
      }

      console.log('\n📅 7 DERNIERS JOURS:');
      console.log(`   Frais de livraison: ${deliveryFees7d.toFixed(2)} FCFA`);
      console.log(`   Gains livreur: ${earnings7d.toFixed(2)} FCFA`);
      console.log(`   Commission Baibebalo: ${commission7d.toFixed(2)} FCFA`);
      if (deliveryFees7d > 0) {
        const percentage = ((commission7d / deliveryFees7d) * 100).toFixed(2);
        console.log(`   Pourcentage commission: ${percentage}%`);
      }

      console.log('\n📅 30 DERNIERS JOURS:');
      console.log(`   Frais de livraison: ${deliveryFees30d.toFixed(2)} FCFA`);
      console.log(`   Gains livreur: ${earnings30d.toFixed(2)} FCFA`);
      console.log(`   Commission Baibebalo: ${commission30d.toFixed(2)} FCFA`);
      if (deliveryFees30d > 0) {
        const percentage = ((commission30d / deliveryFees30d) * 100).toFixed(2);
        console.log(`   Pourcentage commission: ${percentage}%`);
      }

      console.log('\n📅 TOUT LE TEMPS:');
      console.log(`   Frais de livraison: ${deliveryFeesAllTime.toFixed(2)} FCFA`);
      console.log(`   Gains livreur: ${earningsAllTime.toFixed(2)} FCFA`);
      console.log(`   Commission Baibebalo: ${commissionAllTime.toFixed(2)} FCFA`);
      if (deliveryFeesAllTime > 0) {
        const percentage = ((commissionAllTime / deliveryFeesAllTime) * 100).toFixed(2);
        console.log(`   Pourcentage commission: ${percentage}%`);
      }

      // 7. Vérifications
      console.log('\n✅ VÉRIFICATIONS:');
      console.log('─'.repeat(80));
      
      const totalEarningsFromTransactions = parseFloat(earnings.total_earnings_all_time || 0);
      const diff = Math.abs(dp.total_earnings - totalEarningsFromTransactions);
      
      if (diff < 1) {
        console.log(`✅ Gains totaux cohérents: ${dp.total_earnings} FCFA (table) = ${totalEarningsFromTransactions.toFixed(2)} FCFA (transactions)`);
      } else {
        console.log(`⚠️  Écart détecté: ${dp.total_earnings} FCFA (table) vs ${totalEarningsFromTransactions.toFixed(2)} FCFA (transactions)`);
        console.log(`   Différence: ${diff.toFixed(2)} FCFA`);
      }

      // Vérifier les transactions sans order_id
      const transactionsWithoutOrderQuery = `
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE to_user_id = $1 
          AND to_user_type = 'delivery' 
          AND transaction_type = 'delivery_fee' 
          AND status = 'completed'
          AND order_id IS NULL
      `;
      const transactionsWithoutOrder = await pool.query(transactionsWithoutOrderQuery, [dp.id]);
      
      if (parseInt(transactionsWithoutOrder.rows[0].count) > 0) {
        console.log(`⚠️  Transactions sans order_id: ${transactionsWithoutOrder.rows[0].count} (${parseFloat(transactionsWithoutOrder.rows[0].total).toFixed(2)} FCFA)`);
        console.log(`   Ces transactions ne sont pas incluses dans le calcul de la commission`);
      } else {
        console.log(`✅ Toutes les transactions sont liées à des commandes`);
      }

      // Vérifier les commandes sans delivered_at
      const ordersWithoutDeliveredAtQuery = `
        SELECT COUNT(*) as count
        FROM orders
        WHERE delivery_person_id = $1 
          AND status = 'delivered'
          AND delivered_at IS NULL
      `;
      const ordersWithoutDeliveredAt = await pool.query(ordersWithoutDeliveredAtQuery, [dp.id]);
      
      if (parseInt(ordersWithoutDeliveredAt.rows[0].count) > 0) {
        console.log(`⚠️  Commandes livrées sans delivered_at: ${ordersWithoutDeliveredAt.rows[0].count}`);
      } else {
        console.log(`✅ Toutes les commandes livrées ont un delivered_at`);
      }

      console.log('\n' + '='.repeat(80));
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await pool.end();
  }
}

// Exécuter le test
const deliveryPersonId = process.argv[2];
testCommissionCalculations(deliveryPersonId);

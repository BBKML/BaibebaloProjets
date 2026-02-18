/**
 * Script pour générer manuellement les payouts pour livreurs et restaurants
 * Utile si le cron job n'a pas encore été exécuté
 */

const { query } = require('./src/database/db');

async function generatePayouts() {
  try {
    console.log('💰 Génération manuelle des payouts...\n');

    // === LIVREURS ===
    const deliveryPersons = await query(`
      SELECT id, first_name, last_name, phone, available_balance, mobile_money_number, mobile_money_provider
      FROM delivery_persons
      WHERE status = 'active' 
        AND available_balance > 0
        AND mobile_money_number IS NOT NULL
    `);

    console.log(`📦 ${deliveryPersons.rows.length} livreur(s) avec solde > 0`);

    let deliveryPayoutsCreated = 0;
    for (const dp of deliveryPersons.rows) {
      const amount = parseFloat(dp.available_balance);
      
      // Vérifier s'il n'y a pas déjà une demande en cours
      const existingPayout = await query(
        `SELECT id FROM payout_requests 
         WHERE user_type = 'delivery' AND user_id = $1 
         AND status IN ('pending', 'paid')`,
        [dp.id]
      );

      if (existingPayout.rows.length === 0 && amount >= 1000) {
        await query(
          `INSERT INTO payout_requests (
            user_type, user_id, amount, payment_method, account_number, status
          ) VALUES ($1, $2, $3, $4, $5, 'pending')`,
          ['delivery', dp.id, amount, dp.mobile_money_provider || 'mobile_money', dp.mobile_money_number]
        );
        console.log(`✅ Payout créé pour livreur ${dp.first_name} ${dp.last_name}: ${amount} FCFA`);
        deliveryPayoutsCreated++;
      } else if (existingPayout.rows.length > 0) {
        console.log(`⏭️  Livreur ${dp.first_name} ${dp.last_name} a déjà un payout en cours`);
      } else if (amount < 1000) {
        console.log(`⏭️  Livreur ${dp.first_name} ${dp.last_name}: solde trop faible (${amount} < 1000)`);
      }
    }

    // === RESTAURANTS ===
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

    console.log(`\n🍽️  ${restaurants.rows.length} restaurant(s) avec solde > 0`);

    let restaurantPayoutsCreated = 0;
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

      // Vérifier s'il n'y a pas déjà une demande
      const existingPayout = await query(
        `SELECT id FROM payout_requests 
         WHERE user_type = 'restaurant' AND user_id = $1 
         AND status IN ('pending', 'paid')`,
        [rest.id]
      );

      if (existingPayout.rows.length === 0 && availableBalance >= 10000 && rest.mobile_money_number) {
        await query(
          `INSERT INTO payout_requests (
            user_type, user_id, amount, payment_method, account_number, status
          ) VALUES ($1, $2, $3, $4, $5, 'pending')`,
          ['restaurant', rest.id, availableBalance, rest.mobile_money_provider || 'mobile_money', rest.mobile_money_number]
        );
        console.log(`✅ Payout créé pour restaurant ${rest.name}: ${availableBalance} FCFA`);
        restaurantPayoutsCreated++;
      } else if (existingPayout.rows.length > 0) {
        console.log(`⏭️  Restaurant ${rest.name} a déjà un payout en cours`);
      } else if (availableBalance < 10000) {
        console.log(`⏭️  Restaurant ${rest.name}: solde trop faible (${availableBalance} < 10000)`);
      } else if (!rest.mobile_money_number) {
        console.log(`⏭️  Restaurant ${rest.name}: pas de numéro Mobile Money`);
      }
    }

    console.log(`\n✅ Génération terminée:`);
    console.log(`   - ${deliveryPayoutsCreated} payout(s) livreur créé(s)`);
    console.log(`   - ${restaurantPayoutsCreated} payout(s) restaurant créé(s)`);
    console.log(`\n💡 Vous pouvez maintenant voir les payouts dans l'admin !`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
    process.exit(1);
  }
}

generatePayouts();

/**
 * Script de correction : créer les transactions payout manquantes
 * pour les payouts déjà marqués comme payés (markPayoutAsPaid) sans transaction.
 * 
 * Problème : avant la correction, markPayoutAsPaid déduisait le solde mais ne créait
 * pas de transaction. Le recalcul (refresh) réinjectait alors l'ancien solde.
 * 
 * Usage : node scripts/fix-missing-payout-transactions.js
 */
require('dotenv').config();
const { query } = require('../src/database/db');

async function main() {
  console.log('Recherche des payouts livreurs payés sans transaction...');
  
  // Seulement les payouts marqués via markPayoutAsPaid (status='paid') sans transaction
  // processPayout met status='completed' et crée déjà une transaction
  const payouts = await query(`
    SELECT pr.id, pr.user_id, pr.amount, pr.user_type, pr.payment_method, pr.account_number
    FROM payout_requests pr
    WHERE pr.user_type = 'delivery' 
      AND pr.status = 'paid'
  `);

  let created = 0;
  for (const p of payouts.rows) {
    const ref = `payout_request_${p.id}`;
    const existing = await query(
      `SELECT 1 FROM transactions 
       WHERE to_user_type = 'delivery' AND to_user_id = $1 
       AND transaction_type = 'payout' AND payment_reference = $2`,
      [p.user_id, ref]
    );
    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO transactions (
          transaction_type, amount,
          from_user_type, from_user_id,
          to_user_type, to_user_id,
          status, payment_method, payment_reference
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          'payout', parseFloat(p.amount),
          'platform', null,
          'delivery', p.user_id,
          'completed', p.payment_method || 'mobile_money', ref
        ]
      );
      console.log(`  + Transaction créée pour payout ${p.id} (livreur ${p.user_id}) : ${p.amount} FCFA`);
      created++;
    }
  }

  console.log(`\nTerminé. ${created} transaction(s) créée(s) sur ${payouts.rows.length} payout(s) payé(s).`);
  console.log('Exécutez ensuite "Recalculer soldes" dans l\'admin pour synchroniser les soldes.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Erreur:', err);
  process.exit(1);
});

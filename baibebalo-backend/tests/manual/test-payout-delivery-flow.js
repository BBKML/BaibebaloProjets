/**
 * Test manuel du flux : profil livreur (Mobile Money) + génération payouts
 * Usage: depuis baibebalo-backend :
 *   node tests/manual/test-payout-delivery-flow.js
 *
 * Prérequis: .env avec DB et au moins 1 livreur actif.
 * Le script :
 * 1) Met à jour un livreur actif avec un numéro Mobile Money
 * 2) Met son available_balance à 5000 (pour test)
 * 3) Appelle generate-payouts (nécessite token admin - le script utilise la DB directement pour le test)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { query } = require('../../src/database/db');

const BASE = process.env.API_BASE_URL || 'http://localhost:5000';
const API = `${BASE}/api/v1`;

async function main() {
  console.log('=== Test flux paiement livreurs ===\n');

  // 1) Récupérer un livreur actif
  const drivers = await query(`
    SELECT id, first_name, last_name, phone, available_balance, mobile_money_number, mobile_money_provider, status
    FROM delivery_persons
    WHERE status = 'active'
    LIMIT 3
  `);

  if (!drivers.rows.length) {
    console.log('Aucun livreur actif en base. Créez-en un (statut actif) puis relancez.');
    process.exit(1);
  }

  const driver = drivers.rows[0];
  console.log('Livreur trouvé:', driver.first_name, driver.last_name, driver.phone);
  console.log('  available_balance:', driver.available_balance);
  console.log('  mobile_money_number:', driver.mobile_money_number || '(vide)');
  console.log('  mobile_money_provider:', driver.mobile_money_provider || '(vide)');

  // 2) Mettre à jour Mobile Money et solde pour le test
  const testNumber = '+2250712345678';
  await query(
    `UPDATE delivery_persons 
     SET mobile_money_number = $1, mobile_money_provider = $2, available_balance = 5000 
     WHERE id = $3`,
    [testNumber, 'orange_money', driver.id]
  );
  console.log('\n→ Profil mis à jour: mobile_money_number =', testNumber, ', available_balance = 5000');

  // 3) Supprimer un éventuel payout en attente pour ce livreur (pour pouvoir en créer un)
  const deleted = await query(
    `DELETE FROM payout_requests 
     WHERE user_type = 'delivery' AND user_id = $1 AND status IN ('pending', 'paid')`,
    [driver.id]
  );
  if (deleted.rowCount > 0) {
    console.log('→ Ancienne demande de payout supprimée pour ce livreur (test propre)');
  }

  // 4) Vérifier les critères côté SQL (même logique que generatePayouts)
  const check = await query(`
    SELECT id, available_balance, mobile_money_number
    FROM delivery_persons
    WHERE id = $1
      AND status = 'active'
      AND COALESCE(available_balance, 0) > 0
      AND mobile_money_number IS NOT NULL
  `, [driver.id]);

  if (check.rows.length === 0) {
    console.log('\n❌ Le livreur ne remplit pas les critères (active, solde > 0, mobile_money renseigné). Vérifiez la mise à jour.');
    process.exit(1);
  }

  const existingPayout = await query(
    `SELECT id FROM payout_requests 
     WHERE user_type = 'delivery' AND user_id = $1 AND status IN ('pending', 'paid')`,
    [driver.id]
  );

  if (existingPayout.rows.length > 0) {
    console.log('\n⚠️ Ce livreur a déjà une demande de payout en cours. Suppression effectuée ci-dessus; relancez le script ou appelez generate-payouts côté admin.');
  }

  console.log('\n✅ Critères OK pour génération d’un payout.');
  console.log('   → Dans l’admin : cliquez sur « Générer les payouts » (Vue paiement livreurs ou Finances).');
  console.log('   → Vous devriez voir 1 payout créé pour', driver.first_name, driver.last_name);
  console.log('\nPour tester l’API generate-payouts en HTTP, il faut un token admin (login admin puis POST /admin/finances/generate-payouts avec user_type: delivery).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

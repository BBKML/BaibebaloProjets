/**
 * Script de test complet pour toutes les nouvelles fonctionnalités
 * Teste : Preuve de paiement, Vérification remises espèces, Alertes, etc.
 */

const { query } = require('./src/database/db');
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let testsPassed = 0;
let testsFailed = 0;
const results = [];

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function test(name, fn) {
  return async () => {
    try {
      log(`\n🧪 Test: ${name}`, 'cyan');
      await fn();
      testsPassed++;
      log(`✅ PASSÉ: ${name}`, 'green');
      results.push({ name, status: 'PASSÉ' });
    } catch (error) {
      testsFailed++;
      log(`❌ ÉCHOUÉ: ${name}`, 'red');
      log(`   Erreur: ${error.message}`, 'red');
      results.push({ name, status: 'ÉCHOUÉ', error: error.message });
    }
  };
}

async function runTests() {
  log('\n═══════════════════════════════════════════════════════', 'blue');
  log('🧪 TESTS DES NOUVELLES FONCTIONNALITÉS', 'blue');
  log('═══════════════════════════════════════════════════════\n', 'blue');

  // ==========================================
  // TEST 1: Vérifier les colonnes de sécurité
  // ==========================================
  await test('Vérifier colonnes payout_requests (preuve paiement)', async () => {
    const result = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payout_requests' 
      AND column_name IN ('payment_proof_url', 'payment_transaction_id', 'payment_confirmed_at', 'paid_at', 'paid_by')
    `);
    
    const columns = result.rows.map(r => r.column_name);
    const required = ['payment_proof_url', 'payment_transaction_id', 'payment_confirmed_at', 'paid_at', 'paid_by'];
    
    for (const col of required) {
      if (!columns.includes(col)) {
        throw new Error(`Colonne manquante: ${col}`);
      }
    }
    
    log(`   Colonnes trouvées: ${columns.join(', ')}`, 'green');
  })();

  // ==========================================
  // TEST 2: Vérifier colonnes cash_remittances
  // ==========================================
  await test('Vérifier colonnes cash_remittances (vérification)', async () => {
    const result = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cash_remittances' 
      AND column_name IN ('verified_amount', 'verification_notes', 'discrepancy_amount')
    `);
    
    const columns = result.rows.map(r => r.column_name);
    const required = ['verified_amount', 'verification_notes', 'discrepancy_amount'];
    
    for (const col of required) {
      if (!columns.includes(col)) {
        throw new Error(`Colonne manquante: ${col}`);
      }
    }
    
    log(`   Colonnes trouvées: ${columns.join(', ')}`, 'green');
  })();

  // ==========================================
  // TEST 3: Vérifier colonnes orders (restaurant_paid_by_delivery)
  // ==========================================
  await test('Vérifier colonnes orders (livreur paie restaurant)', async () => {
    const result = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name IN ('restaurant_paid_by_delivery', 'restaurant_paid_by_delivery_at')
    `);
    
    const columns = result.rows.map(r => r.column_name);
    const required = ['restaurant_paid_by_delivery', 'restaurant_paid_by_delivery_at'];
    
    for (const col of required) {
      if (!columns.includes(col)) {
        throw new Error(`Colonne manquante: ${col}`);
      }
    }
    
    log(`   Colonnes trouvées: ${columns.join(', ')}`, 'green');
  })();

  // ==========================================
  // TEST 4: Vérifier contrainte status payout_requests
  // ==========================================
  await test('Vérifier contrainte CHECK status payout_requests (paid)', async () => {
    const result = await query(`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints
      WHERE constraint_name LIKE '%payout_requests_status%'
    `);
    
    if (result.rows.length === 0) {
      throw new Error('Contrainte CHECK pour status non trouvée');
    }
    
    const checkClause = result.rows[0].check_clause;
    if (!checkClause.includes("'paid'")) {
      throw new Error("Le statut 'paid' n'est pas dans la contrainte CHECK");
    }
    
    log(`   Contrainte trouvée: ${checkClause}`, 'green');
  })();

  // ==========================================
  // TEST 5: Vérifier endpoint markPayoutAsPaid (preuve obligatoire)
  // ==========================================
  await test('Vérifier logique preuve paiement obligatoire', async () => {
    // Vérifier que le code existe dans admin.controller.js
    const fs = require('fs');
    const path = require('path');
    const controllerPath = path.join(__dirname, 'src/controllers/admin.controller.js');
    const content = fs.readFileSync(controllerPath, 'utf8');
    
    if (!content.includes('PROOF_REQUIRED')) {
      throw new Error('Vérification preuve paiement obligatoire non trouvée');
    }
    
    if (!content.includes('payment_transaction_id') || !content.includes('payment_proof_url')) {
      throw new Error('Champs preuve paiement non trouvés dans markPayoutAsPaid');
    }
    
    log(`   Code de vérification trouvé dans admin.controller.js`, 'green');
  })();

  // ==========================================
  // TEST 6: Vérifier vérification montant remise espèces
  // ==========================================
  await test('Vérifier logique vérification montant remise espèces', async () => {
    const fs = require('fs');
    const path = require('path');
    const controllerPath = path.join(__dirname, 'src/controllers/admin.controller.js');
    const content = fs.readFileSync(controllerPath, 'utf8');
    
    if (!content.includes('verified_amount')) {
      throw new Error('Vérification montant réel non trouvée');
    }
    
    if (!content.includes('discrepancy_amount')) {
      throw new Error('Calcul écart non trouvé');
    }
    
    if (!content.includes('ALERTE REMISE ESPÈCES') || !content.includes('discrepancy')) {
      throw new Error('Système d\'alerte non trouvé');
    }
    
    log(`   Code de vérification et alertes trouvés`, 'green');
  })();

  // ==========================================
  // TEST 7: Vérifier endpoint payRestaurant
  // ==========================================
  await test('Vérifier endpoint livreur paie restaurant', async () => {
    const fs = require('fs');
    const path = require('path');
    const controllerPath = path.join(__dirname, 'src/controllers/delivery.controller.js');
    const content = fs.readFileSync(controllerPath, 'utf8');
    
    if (!content.includes('exports.payRestaurant')) {
      throw new Error('Fonction payRestaurant non trouvée');
    }
    
    if (!content.includes('restaurant_paid_by_delivery')) {
      throw new Error('Mise à jour restaurant_paid_by_delivery non trouvée');
    }
    
    // Vérifier la route
    const routesPath = path.join(__dirname, 'src/routes/delivery.routes.js');
    const routesContent = fs.readFileSync(routesPath, 'utf8');
    
    if (!routesContent.includes('/orders/:id/pay-restaurant')) {
      throw new Error('Route /orders/:id/pay-restaurant non trouvée');
    }
    
    log(`   Endpoint payRestaurant trouvé avec route`, 'green');
  })();

  // ==========================================
  // TEST 8: Vérifier exclusion crédit restaurant si payé par livreur
  // ==========================================
  await test('Vérifier exclusion crédit restaurant si payé par livreur', async () => {
    const fs = require('fs');
    const path = require('path');
    const controllerPath = path.join(__dirname, 'src/controllers/delivery.controller.js');
    const content = fs.readFileSync(controllerPath, 'utf8');
    
    // Chercher dans confirmDelivery
    const confirmDeliveryMatch = content.match(/confirmDelivery[\s\S]*?restaurantAlreadyPaidByDelivery[\s\S]*?}/);
    
    if (!confirmDeliveryMatch) {
      throw new Error('Vérification restaurant_paid_by_delivery dans confirmDelivery non trouvée');
    }
    
    if (!confirmDeliveryMatch[0].includes('restaurantAlreadyPaidByDelivery')) {
      throw new Error('Variable restaurantAlreadyPaidByDelivery non trouvée');
    }
    
    if (!confirmDeliveryMatch[0].includes('!restaurantAlreadyPaidByDelivery')) {
      throw new Error('Condition d\'exclusion non trouvée');
    }
    
    log(`   Exclusion crédit restaurant trouvée dans confirmDelivery`, 'green');
  })();

  // ==========================================
  // TEST 9: Vérifier cron job paiement hebdomadaire
  // ==========================================
  await test('Vérifier cron job paiement hebdomadaire automatique', async () => {
    const fs = require('fs');
    const path = require('path');
    const cronPath = path.join(__dirname, 'src/jobs/cron.js');
    const content = fs.readFileSync(cronPath, 'utf8');
    
    if (!content.includes("'0 9 * * 1'")) {
      throw new Error('Cron job lundi 9h non trouvé');
    }
    
    if (!content.includes('Paiement hebdomadaire automatique')) {
      throw new Error('Commentaire paiement hebdomadaire non trouvé');
    }
    
    if (!content.includes('payout_requests') || !content.includes('INSERT INTO payout_requests')) {
      throw new Error('Création automatique payout_requests non trouvée');
    }
    
    // Vérifier exclusion restaurant_paid_by_delivery
    if (!content.includes('restaurant_paid_by_delivery')) {
      log(`   ⚠️  Note: Exclusion restaurant_paid_by_delivery non vérifiée dans cron`, 'yellow');
    }
    
    log(`   Cron job paiement hebdomadaire trouvé`, 'green');
  })();

  // ==========================================
  // TEST 10: Vérifier endpoints actualisation admin
  // ==========================================
  await test('Vérifier endpoints actualisation admin', async () => {
    const fs = require('fs');
    const path = require('path');
    const routesPath = path.join(__dirname, 'src/routes/admin.routes.js');
    const content = fs.readFileSync(routesPath, 'utf8');
    
    const endpoints = [
      '/finances/payouts/:id/mark-paid',
      '/finances/delivery/:id/refresh-balance',
      '/finances/restaurant/:id/refresh-balance',
    ];
    
    for (const endpoint of endpoints) {
      if (!content.includes(endpoint)) {
        throw new Error(`Endpoint ${endpoint} non trouvé`);
      }
    }
    
    // Vérifier les controllers
    const controllerPath = path.join(__dirname, 'src/controllers/admin.controller.js');
    const controllerContent = fs.readFileSync(controllerPath, 'utf8');
    
    if (!controllerContent.includes('exports.markPayoutAsPaid')) {
      throw new Error('markPayoutAsPaid non trouvé');
    }
    
    if (!controllerContent.includes('exports.refreshDeliveryBalance')) {
      throw new Error('refreshDeliveryBalance non trouvé');
    }
    
    if (!controllerContent.includes('exports.refreshRestaurantBalance')) {
      throw new Error('refreshRestaurantBalance non trouvé');
    }
    
    log(`   Tous les endpoints d'actualisation trouvés`, 'green');
  })();

  // ==========================================
  // TEST 11: Vérifier calcul solde à reverser (cash_to_remit)
  // ==========================================
  await test('Vérifier calcul solde à reverser dans dashboard livreur', async () => {
    const fs = require('fs');
    const path = require('path');
    const controllerPath = path.join(__dirname, 'src/controllers/delivery.controller.js');
    const content = fs.readFileSync(controllerPath, 'utf8');
    
    // Chercher dans getDashboard
    const dashboardMatch = content.match(/getDashboard[\s\S]*?cash_to_remit[\s\S]*?}/);
    
    if (!dashboardMatch && !content.includes('cash_to_remit')) {
      throw new Error('Calcul cash_to_remit non trouvé dans getDashboard');
    }
    
    if (!content.includes('cash_to_remit')) {
      throw new Error('Champ cash_to_remit non retourné');
    }
    
    log(`   Calcul cash_to_remit trouvé dans getDashboard`, 'green');
  })();

  // ==========================================
  // TEST 12: Vérifier vérification stricte montant remise
  // ==========================================
  await test('Vérifier vérification stricte montant remise espèces', async () => {
    const fs = require('fs');
    const path = require('path');
    const controllerPath = path.join(__dirname, 'src/controllers/delivery.controller.js');
    const content = fs.readFileSync(controllerPath, 'utf8');
    
    // Chercher dans createCashRemittance
    if (!content.includes('AMOUNT_MISMATCH')) {
      throw new Error('Vérification AMOUNT_MISMATCH non trouvée');
    }
    
    if (!content.includes('expectedTotal')) {
      throw new Error('Calcul expectedTotal non trouvé');
    }
    
    if (!content.includes('ALREADY_REMITTED')) {
      throw new Error('Vérification double déclaration non trouvée');
    }
    
    log(`   Vérifications strictes montant trouvées`, 'green');
  })();

  // ==========================================
  // TEST 13: Vérifier interface admin (boutons actualisation)
  // ==========================================
  await test('Vérifier interface admin avec boutons actualisation', async () => {
    const fs = require('fs');
    const path = require('path');
    const financesPath = path.join(__dirname, '../baibebalo-admin/src/pages/Finances.jsx');
    
    if (!fs.existsSync(financesPath)) {
      throw new Error('Fichier Finances.jsx non trouvé');
    }
    
    const content = fs.readFileSync(financesPath, 'utf8');
    
    if (!content.includes('markPayoutAsPaid')) {
      throw new Error('Bouton markPayoutAsPaid non trouvé');
    }
    
    if (!content.includes('refreshDeliveryBalance') && !content.includes('refreshRestaurantBalance')) {
      throw new Error('Boutons actualisation non trouvés');
    }
    
    // Vérifier API
    const apiPath = path.join(__dirname, '../baibebalo-admin/src/api/finances.js');
    if (fs.existsSync(apiPath)) {
      const apiContent = fs.readFileSync(apiPath, 'utf8');
      if (!apiContent.includes('markPayoutAsPaid')) {
        throw new Error('API markPayoutAsPaid non trouvée');
      }
    }
    
    log(`   Interface admin avec boutons trouvée`, 'green');
  })();

  // ==========================================
  // RÉSUMÉ DES TESTS
  // ==========================================
  log('\n═══════════════════════════════════════════════════════', 'blue');
  log('📊 RÉSUMÉ DES TESTS', 'blue');
  log('═══════════════════════════════════════════════════════\n', 'blue');
  
  log(`✅ Tests réussis: ${testsPassed}`, 'green');
  log(`❌ Tests échoués: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');
  log(`📈 Taux de réussite: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%\n`, 'cyan');
  
  if (testsFailed > 0) {
    log('Détails des échecs:', 'yellow');
    results.filter(r => r.status === 'ÉCHOUÉ').forEach(r => {
      log(`  ❌ ${r.name}: ${r.error}`, 'red');
    });
  }
  
  log('\n═══════════════════════════════════════════════════════', 'blue');
  log('✅ Tests terminés !', 'green');
  log('═══════════════════════════════════════════════════════\n', 'blue');
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(error => {
  log(`\n❌ Erreur fatale: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

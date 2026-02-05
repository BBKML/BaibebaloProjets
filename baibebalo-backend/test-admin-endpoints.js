/**
 * 🧪 SCRIPT DE TEST POUR LES ENDPOINTS ADMIN
 * 
 * Ce script teste tous les nouveaux endpoints admin implémentés
 * 
 * Usage: node test-admin-endpoints.js
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1`;

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let accessToken = null;
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
};

// Fonction pour afficher les résultats
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Fonction pour tester un endpoint
async function testEndpoint(name, method, url, data = null, expectedStatus = 200) {
  testResults.total++;
  try {
    const config = {
      method,
      url: `${API_BASE}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      ...(data && { data }),
    };

    const response = await axios(config);

    if (response.status === expectedStatus) {
      log(`✓ ${name}`, 'green');
      testResults.passed++;
      return { success: true, data: response.data };
    } else {
      log(`✗ ${name} - Status attendu: ${expectedStatus}, reçu: ${response.status}`, 'red');
      testResults.failed++;
      return { success: false, error: `Status ${response.status}` };
    }
  } catch (error) {
    if (error.response && error.response.status === expectedStatus) {
      log(`✓ ${name} (erreur attendue)`, 'green');
      testResults.passed++;
      // Essayer de parser la réponse si c'est du JSON
      let responseData = null;
      try {
        if (typeof error.response.data === 'object') {
          responseData = error.response.data;
        } else if (typeof error.response.data === 'string') {
          responseData = JSON.parse(error.response.data);
        }
      } catch (e) {
        // Si ce n'est pas du JSON, on retourne juste le status
        responseData = { status: error.response.status };
      }
      return { success: true, data: responseData };
    } else {
      const errorMessage = error.response?.data?.error?.message 
        || error.response?.data?.message 
        || error.message;
      log(`✗ ${name} - ${errorMessage}`, 'red');
      if (error.response?.data) {
        log(`  Détails: ${JSON.stringify(error.response.data).substring(0, 200)}`, 'yellow');
      }
      testResults.failed++;
      return { success: false, error: errorMessage, fullError: error };
    }
  }
}

// Fonction pour tester avec validation de données
async function testEndpointWithValidation(name, method, url, data = null, validator = null) {
  const result = await testEndpoint(name, method, url, data);
  if (result.success && validator) {
    try {
      validator(result.data);
      log(`  ✓ Validation des données réussie`, 'cyan');
    } catch (error) {
      log(`  ✗ Validation échouée: ${error.message}`, 'yellow');
      result.success = false;
      testResults.passed--;
      testResults.failed++;
    }
  }
  return result;
}

// ============================================
// TESTS D'AUTHENTIFICATION
// ============================================

async function testAuth() {
  log('\n🔐 TEST D\'AUTHENTIFICATION', 'blue');
  log('════════════════════════════════════════');

  const loginResult = await testEndpoint(
    'Connexion admin',
    'POST',
    '/auth/admin/login',
    {
      email: 'admin@baibebalo.ci',
      password: 'Admin@2025!',
    }
  );

  if (loginResult.success && loginResult.data?.data?.accessToken) {
    accessToken = loginResult.data.data.accessToken;
    log(`  Token obtenu: ${accessToken.substring(0, 20)}...`, 'cyan');
  } else {
    log('  ⚠️ Impossible d\'obtenir le token, certains tests vont échouer', 'yellow');
  }
}

// ============================================
// TESTS SUPPORT TICKETS
// ============================================

async function testSupportTickets() {
  log('\n🎫 TESTS SUPPORT TICKETS', 'blue');
  log('════════════════════════════════════════');

  // Lister les tickets
  await testEndpointWithValidation(
    'GET /admin/support/tickets - Liste des tickets',
    'GET',
    '/admin/support/tickets?page=1&limit=10',
    null,
    (data) => {
      if (!data.success) throw new Error('Response success should be true');
      if (!data.data.tickets) throw new Error('Missing tickets array');
      if (!data.data.pagination) throw new Error('Missing pagination');
    }
  );

  // Lister avec filtres
  await testEndpoint(
    'GET /admin/support/tickets - Avec filtres (status=open)',
    'GET',
    '/admin/support/tickets?status=open&page=1&limit=10'
  );

  // Détails d'un ticket (peut échouer si aucun ticket n'existe)
  await testEndpoint(
    'GET /admin/support/tickets/:id - Détails ticket',
    'GET',
    '/admin/support/tickets/00000000-0000-0000-0000-000000000000',
    404
  );

  // Répondre à un ticket (peut échouer si aucun ticket n'existe)
  await testEndpoint(
    'POST /admin/support/tickets/:id/reply - Répondre',
    'POST',
    '/admin/support/tickets/00000000-0000-0000-0000-000000000000',
    { message: 'Test de réponse' },
    404
  );

  // Fermer un ticket (peut échouer si aucun ticket n'existe)
  await testEndpoint(
    'PUT /admin/support/tickets/:id/close - Fermer ticket',
    'PUT',
    '/admin/support/tickets/00000000-0000-0000-0000-000000000000',
    { resolution: 'Test de résolution' },
    404
  );
}

// ============================================
// TESTS FINANCES
// ============================================

async function testFinances() {
  log('\n💰 TESTS FINANCES', 'blue');
  log('════════════════════════════════════════');

  // Transactions
  await testEndpointWithValidation(
    'GET /admin/finances/transactions - Liste des transactions',
    'GET',
    '/admin/finances/transactions?page=1&limit=10',
    null,
    (data) => {
      if (!data.success) throw new Error('Response success should be true');
      if (!data.data.transactions) throw new Error('Missing transactions array');
      if (!data.data.pagination) throw new Error('Missing pagination');
    }
  );

  // Transactions avec filtres
  await testEndpoint(
    'GET /admin/finances/transactions - Avec filtres',
    'GET',
    '/admin/finances/transactions?type=payment&status=completed&page=1&limit=10'
  );

  // Demandes de paiement
  await testEndpointWithValidation(
    'GET /admin/finances/payouts - Liste des payouts',
    'GET',
    '/admin/finances/payouts?page=1&limit=10',
    null,
    (data) => {
      if (!data.success) throw new Error('Response success should be true');
      if (!data.data.payouts) throw new Error('Missing payouts array');
      if (!data.data.pagination) throw new Error('Missing pagination');
    }
  );

  // Commission settings
  await testEndpointWithValidation(
    'GET /admin/finances/commission-settings - Paramètres commission',
    'GET',
    '/admin/finances/commission-settings',
    null,
    (data) => {
      if (!data.success) throw new Error('Response success should be true');
      if (!data.data.settings) throw new Error('Missing settings object');
    }
  );

  // Mettre à jour commission settings
  await testEndpointWithValidation(
    'PUT /admin/finances/commission-settings - Mettre à jour commission',
    'PUT',
    '/admin/finances/commission-settings',
    {
      settings: {
        default_commission_rate: 18.0,
        restaurant_commission_rate: 18.0,
      },
    },
    (data) => {
      if (!data.success) throw new Error('Response success should be true');
    }
  );
}

// ============================================
// TESTS COMMANDES
// ============================================

async function testOrders() {
  log('\n📦 TESTS COMMANDES', 'blue');
  log('════════════════════════════════════════');

  // Annuler une commande (peut échouer si aucune commande n'existe)
  await testEndpoint(
    'PUT /admin/orders/:id/cancel - Annuler commande',
    'PUT',
    '/admin/orders/00000000-0000-0000-0000-000000000000',
    { reason: 'Test d\'annulation' },
    404
  );

  // Résoudre un litige (peut échouer si aucune commande n'existe)
  await testEndpoint(
    'PUT /admin/orders/:id/resolve-dispute - Résoudre litige',
    'PUT',
    '/admin/orders/00000000-0000-0000-0000-000000000000',
    {
      resolution: 'Litige résolu',
      refund_amount: 5000,
      refund_to: 'user',
    },
    404
  );
}

// ============================================
// TESTS GESTION ENTITÉS
// ============================================

async function testEntityManagement() {
  log('\n👥 TESTS GESTION ENTITÉS', 'blue');
  log('════════════════════════════════════════');

  // Activer un utilisateur (peut échouer si aucun utilisateur n'existe)
  await testEndpoint(
    'PUT /admin/users/:id/activate - Activer utilisateur',
    'PUT',
    '/admin/users/00000000-0000-0000-0000-000000000000',
    null,
    404
  );

  // Suspendre un restaurant (peut échouer si aucun restaurant n'existe)
  await testEndpoint(
    'PUT /admin/restaurants/:id/suspend - Suspendre restaurant',
    'PUT',
    '/admin/restaurants/00000000-0000-0000-0000-000000000000',
    { reason: 'Test de suspension' },
    404
  );

  // Suspendre un livreur (peut échouer si aucun livreur n'existe)
  await testEndpoint(
    'PUT /admin/delivery-persons/:id/suspend - Suspendre livreur',
    'PUT',
    '/admin/delivery-persons/00000000-0000-0000-0000-000000000000',
    { reason: 'Test de suspension' },
    404
  );

  // Rejeter un livreur (peut échouer si aucun livreur n'existe)
  await testEndpoint(
    'PUT /admin/delivery-persons/:id/reject - Rejeter livreur',
    'PUT',
    '/admin/delivery-persons/00000000-0000-0000-0000-000000000000',
    { reason: 'Test de rejet' },
    404
  );
}

// ============================================
// TESTS ANALYTICS
// ============================================

async function testAnalytics() {
  log('\n📊 TESTS ANALYTICS', 'blue');
  log('════════════════════════════════════════');

  // Rapport des ventes
  await testEndpointWithValidation(
    'GET /admin/analytics/sales - Rapport ventes',
    'GET',
    '/admin/analytics/sales?period=30d',
    null,
    (data) => {
      if (!data.success) throw new Error('Response success should be true');
      if (!data.data.statistics) throw new Error('Missing statistics');
      if (!data.data.daily_sales) throw new Error('Missing daily_sales');
    }
  );

  // Rapport des ventes avec dates personnalisées
  await testEndpoint(
    'GET /admin/analytics/sales - Avec dates personnalisées',
    'GET',
    '/admin/analytics/sales?date_from=2025-01-01&date_to=2025-01-31'
  );

  // Rapport des utilisateurs
  await testEndpointWithValidation(
    'GET /admin/analytics/users - Rapport utilisateurs',
    'GET',
    '/admin/analytics/users?period=30d',
    null,
    (data) => {
      if (!data.success) throw new Error('Response success should be true');
      if (!data.data.statistics) throw new Error('Missing statistics');
    }
  );

  // Rapport des restaurants
  await testEndpointWithValidation(
    'GET /admin/analytics/restaurants - Rapport restaurants',
    'GET',
    '/admin/analytics/restaurants?period=30d',
    null,
    (data) => {
      if (!data.success) throw new Error('Response success should be true');
      if (!data.data.statistics) throw new Error('Missing statistics');
    }
  );

  // Rapport des livraisons
  await testEndpointWithValidation(
    'GET /admin/analytics/deliveries - Rapport livraisons',
    'GET',
    '/admin/analytics/deliveries?period=30d',
    null,
    (data) => {
      if (!data.success) throw new Error('Response success should be true');
      if (!data.data.statistics) throw new Error('Missing statistics');
    }
  );
}

// ============================================
// TESTS SETTINGS
// ============================================

async function testSettings() {
  log('\n⚙️ TESTS SETTINGS', 'blue');
  log('════════════════════════════════════════');

  // Obtenir les paramètres
  await testEndpointWithValidation(
    'GET /admin/settings - Obtenir paramètres',
    'GET',
    '/admin/settings',
    null,
    (data) => {
      if (!data.success) throw new Error('Response success should be true');
      if (!data.data.settings) throw new Error('Missing settings object');
    }
  );

  // Obtenir paramètres publics uniquement
  await testEndpoint(
    'GET /admin/settings - Paramètres publics uniquement',
    'GET',
    '/admin/settings?public_only=true'
  );

  // Mettre à jour les paramètres
  await testEndpointWithValidation(
    'PUT /admin/settings - Mettre à jour paramètres',
    'PUT',
    '/admin/settings',
    {
      settings: {
        app_name: {
          value: 'Baibebalo Test',
          description: 'Nom de l\'application',
          is_public: true,
        },
        test_setting: {
          value: { test: true },
          description: 'Paramètre de test',
        },
      },
    },
    (data) => {
      if (!data.success) throw new Error('Response success should be true');
    }
  );
}

// ============================================
// TESTS PROMOTIONS
// ============================================

async function testPromotions() {
  log('\n🎁 TESTS PROMOTIONS', 'blue');
  log('════════════════════════════════════════');

  // Lister les promotions
  await testEndpointWithValidation(
    'GET /admin/promotions - Liste des promotions',
    'GET',
    '/admin/promotions?page=1&limit=10',
    null,
    (data) => {
      if (!data.success) throw new Error('Response success should be true');
      if (!data.data.promotions) throw new Error('Missing promotions array');
      if (!data.data.pagination) throw new Error('Missing pagination');
    }
  );

  // Lister avec filtres
  await testEndpoint(
    'GET /admin/promotions - Avec filtres (is_active=true)',
    'GET',
    '/admin/promotions?is_active=true&type=percentage&page=1&limit=10'
  );

  // Créer une promotion
  const createPromoResult = await testEndpointWithValidation(
    'POST /admin/promotions - Créer promotion',
    'POST',
    '/admin/promotions',
    {
      code: `TEST${Date.now()}`,
      type: 'percentage',
      value: 10,
      min_order_amount: 5000,
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      applicable_to: 'all',
    },
    (data) => {
      if (!data.success) throw new Error('Response success should be true');
      if (!data.data.promotion) throw new Error('Missing promotion object');
      if (!data.data.promotion.id) throw new Error('Missing promotion id');
    }
  );

  // Toggle promotion (si création réussie)
  if (createPromoResult.success && createPromoResult.data?.data?.promotion?.id) {
    const promoId = createPromoResult.data.data.promotion.id;
    await testEndpointWithValidation(
      'PUT /admin/promotions/:id/toggle - Désactiver promotion',
      'PUT',
      `/admin/promotions/${promoId}/toggle`,
      null,
      (data) => {
        if (!data.success) throw new Error('Response success should be true');
        if (!data.data.promotion) throw new Error('Missing promotion object');
      }
    );

    // Réactiver
    await testEndpoint(
      'PUT /admin/promotions/:id/toggle - Réactiver promotion',
      'PUT',
      `/admin/promotions/${promoId}/toggle`
    );
  } else {
    log('  ⚠️ Impossible de tester toggle (création échouée)', 'yellow');
  }

  // Tester création avec données invalides
  await testEndpoint(
    'POST /admin/promotions - Données invalides (devrait échouer)',
    'POST',
    '/admin/promotions',
    {
      code: 'INVALID',
      type: 'invalid_type',
      value: -10,
    },
    400
  );
}

// ============================================
// FONCTION PRINCIPALE
// ============================================

async function runAllTests() {
  log('\n╔════════════════════════════════════════╗', 'cyan');
  log('║   TESTS DES ENDPOINTS ADMIN            ║', 'cyan');
  log('╚════════════════════════════════════════╝', 'cyan');
  log(`\n📍 URL: ${API_BASE}`, 'cyan');
  log(`⏰ Démarrage: ${new Date().toLocaleString()}\n`, 'cyan');

  try {
    // Test de connexion au serveur
    try {
      await axios.get(`${BASE_URL}/health`);
      log('✓ Serveur accessible', 'green');
    } catch (error) {
      log('✗ Serveur non accessible. Assurez-vous que le serveur est démarré.', 'red');
      process.exit(1);
    }

    // Authentification
    await testAuth();

    if (!accessToken) {
      log('\n⚠️  Aucun token obtenu. Les tests vont échouer.', 'yellow');
      log('   Vérifiez les identifiants admin dans le fichier de test.\n', 'yellow');
    }

    // Tests par module
    await testSupportTickets();
    await testFinances();
    await testOrders();
    await testEntityManagement();
    await testAnalytics();
    await testSettings();
    await testPromotions();

    // Résumé
    log('\n╔════════════════════════════════════════╗', 'cyan');
    log('║         RÉSUMÉ DES TESTS               ║', 'cyan');
    log('╚════════════════════════════════════════╝', 'cyan');
    log(`\n✅ Tests réussis: ${testResults.passed}`, 'green');
    log(`❌ Tests échoués: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
    log(`📊 Total: ${testResults.total}`, 'cyan');
    log(`📈 Taux de réussite: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%\n`, 'cyan');

    if (testResults.failed === 0) {
      log('🎉 Tous les tests sont passés !', 'green');
      process.exit(0);
    } else {
      log('⚠️  Certains tests ont échoué. Vérifiez les erreurs ci-dessus.', 'yellow');
      process.exit(1);
    }
  } catch (error) {
    log(`\n❌ Erreur fatale: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Lancer les tests
runAllTests();

/**
 * Script de test rapide pour vérifier la connexion au backend
 * 
 * Usage:
 *   node test-api-connection.js
 * 
 * Assurez-vous d'avoir modifié l'IP dans src/constants/api.js avant de tester
 */

const axios = require('axios');

// ⚠️ MODIFIEZ CETTE IP par la vôtre
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.12:5000/api/v1';

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testConnection() {
  log('\n🧪 TEST DE CONNEXION BACKEND\n', 'blue');
  log('═══════════════════════════════════════════════════════════\n', 'blue');

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Vérifier que le backend répond
  log('📡 Test 1: Vérification de la connexion au backend...', 'yellow');
  try {
    // Essayer un endpoint de santé si disponible, sinon un endpoint public
    const response = await axios.get(`${API_BASE_URL.replace('/api/v1', '')}/health`, {
      timeout: 5000,
    });
    log('   ✅ Backend accessible (Status: ' + response.status + ')', 'green');
    testsPassed++;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log('   ❌ Impossible de se connecter au backend', 'red');
      log('   💡 Vérifiez que le backend est démarré: cd baibebalo-backend && npm start', 'yellow');
    } else if (error.code === 'ENOTFOUND' || error.code === 'EADDRNOTAVAIL') {
      log('   ❌ IP incorrecte ou backend inaccessible', 'red');
      log('   💡 Vérifiez votre IP locale: ipconfig (Windows) ou ifconfig (Mac/Linux)', 'yellow');
      log('   💡 Modifiez l\'IP dans src/constants/api.js', 'yellow');
    } else {
      log('   ⚠️  Backend accessible mais endpoint /health non disponible', 'yellow');
      log('   💡 C\'est normal si le backend n\'a pas d\'endpoint /health', 'yellow');
    }
    testsFailed++;
  }

  // Test 2: Vérifier l'endpoint de login (sans authentification)
  log('\n🔐 Test 2: Vérification de l\'endpoint de login...', 'yellow');
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/partner/login`,
      {
        email: 'test@example.com',
        password: 'wrongpassword',
      },
      {
        validateStatus: (status) => status < 500, // Accepter 400/401 mais pas 500
        timeout: 5000,
      }
    );
    
    if (response.status === 401 || response.status === 400) {
      log('   ✅ Endpoint de login accessible (Erreur attendue: identifiants invalides)', 'green');
      testsPassed++;
    } else if (response.status === 200) {
      log('   ⚠️  Login réussi avec de mauvais identifiants (anormal)', 'yellow');
      testsFailed++;
    } else {
      log(`   ⚠️  Status inattendu: ${response.status}`, 'yellow');
      testsFailed++;
    }
  } catch (error) {
    if (error.response) {
      if (error.response.status === 401 || error.response.status === 400) {
        log('   ✅ Endpoint de login accessible (Erreur attendue)', 'green');
        testsPassed++;
      } else {
        log(`   ❌ Erreur ${error.response.status}: ${error.response.statusText}`, 'red');
        testsFailed++;
      }
    } else {
      log('   ❌ Erreur de connexion: ' + error.message, 'red');
      testsFailed++;
    }
  }

  // Test 3: Vérifier l'endpoint de profil (nécessite authentification)
  log('\n👤 Test 3: Vérification de l\'endpoint de profil (sans token)...', 'yellow');
  try {
    const response = await axios.get(
      `${API_BASE_URL}/restaurants/me`,
      {
        validateStatus: (status) => status < 500,
        timeout: 5000,
      }
    );
    
    if (response.status === 401) {
      log('   ✅ Endpoint de profil accessible (Erreur attendue: non authentifié)', 'green');
      testsPassed++;
    } else {
      log(`   ⚠️  Status inattendu: ${response.status}`, 'yellow');
      testsFailed++;
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      log('   ✅ Endpoint de profil accessible (Erreur attendue)', 'green');
      testsPassed++;
    } else {
      log('   ❌ Erreur: ' + (error.response?.status || error.message), 'red');
      testsFailed++;
    }
  }

  // Test 4: Vérifier l'endpoint de menu
  log('\n🍽️  Test 4: Vérification de l\'endpoint de menu...', 'yellow');
  try {
    const response = await axios.get(
      `${API_BASE_URL}/restaurants/me/menu`,
      {
        validateStatus: (status) => status < 500,
        timeout: 5000,
      }
    );
    
    if (response.status === 401) {
      log('   ✅ Endpoint de menu accessible (Erreur attendue: non authentifié)', 'green');
      testsPassed++;
    } else {
      log(`   ⚠️  Status inattendu: ${response.status}`, 'yellow');
      testsFailed++;
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      log('   ✅ Endpoint de menu accessible (Erreur attendue)', 'green');
      testsPassed++;
    } else {
      log('   ❌ Erreur: ' + (error.response?.status || error.message), 'red');
      testsFailed++;
    }
  }

  // Résumé
  log('\n═══════════════════════════════════════════════════════════', 'blue');
  log(`\n📊 RÉSUMÉ DES TESTS:`, 'blue');
  log(`   ✅ Tests réussis: ${testsPassed}`, 'green');
  log(`   ❌ Tests échoués: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');
  
  if (testsFailed === 0) {
    log('\n🎉 Tous les tests sont passés ! Le backend est accessible.', 'green');
    log('   Vous pouvez maintenant tester l\'application mobile.\n', 'green');
  } else {
    log('\n⚠️  Certains tests ont échoué.', 'yellow');
    log('   Vérifiez la configuration avant de tester l\'application.\n', 'yellow');
  }

  return testsFailed === 0;
}

// Exécuter les tests
testConnection().catch((error) => {
  log('\n❌ Erreur fatale: ' + error.message, 'red');
  process.exit(1);
});

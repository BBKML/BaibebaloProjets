/**
 * Script de test complet pour les fonctionnalités de promotion
 * 
 * Ce script teste :
 * 1. La création de codes promo
 * 2. La récupération des promotions
 * 3. La mise à jour des promotions
 * 4. L'activation/désactivation des promotions
 * 5. La suppression des promotions
 * 6. L'affichage des promotions dans le menu
 * 7. L'utilisation du prix promotionnel dans les commandes
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let restaurantToken = null;
let restaurantId = null;
let createdPromotionId = null;
let testResults = {
  passed: 0,
  failed: 0,
  errors: [],
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, error = null) {
  if (passed) {
    log(`✅ ${name}`, 'green');
    testResults.passed++;
  } else {
    log(`❌ ${name}`, 'red');
    testResults.failed++;
    if (error) {
      let errorStr = '';
      if (typeof error === 'string') {
        errorStr = error;
      } else if (error.message) {
        errorStr = error.message;
      } else if (error.response) {
        errorStr = JSON.stringify(error.response.data || error.response.statusText);
      } else {
        errorStr = JSON.stringify(error);
      }
      testResults.errors.push({ test: name, error: errorStr });
      log(`   Erreur: ${errorStr}`, 'red');
    }
  }
}

/**
 * Test 1: Connexion restaurant
 */
async function testRestaurantLogin() {
  try {
    log('\n📋 Test 1: Connexion restaurant', 'cyan');
    log(`   URL: ${BASE_URL}/auth/partner/login`, 'blue');
    
    const response = await axios.post(`${BASE_URL}/auth/partner/login`, {
      email: 'restaurant@test.ci',
      password: 'restaurant123',
    }, {
      timeout: 10000,
      validateStatus: function (status) {
        return status < 500; // Ne pas rejeter pour les erreurs 4xx
      }
    });

    if (response.status === 200 && response.data.success && response.data.data?.accessToken) {
      restaurantToken = response.data.data.accessToken;
      restaurantId = response.data.data.restaurant?.id || response.data.data.id;
      logTest('Connexion restaurant réussie', true);
      log(`   Token: ${restaurantToken.substring(0, 20)}...`, 'blue');
      log(`   Restaurant ID: ${restaurantId}`, 'blue');
      return true;
    } else {
      const errorMsg = response.data?.error?.message || response.data?.message || `Status: ${response.status}`;
      logTest('Connexion restaurant réussie', false, errorMsg);
      log(`   Réponse complète: ${JSON.stringify(response.data, null, 2)}`, 'yellow');
      return false;
    }
  } catch (error) {
    let errorMsg = 'Erreur inconnue';
    if (error.response) {
      errorMsg = error.response.data?.error?.message || error.response.data?.message || `Status: ${error.response.status}`;
      log(`   Réponse d'erreur: ${JSON.stringify(error.response.data, null, 2)}`, 'yellow');
    } else if (error.request) {
      errorMsg = 'Aucune réponse du serveur. Vérifiez que le serveur backend est démarré.';
      log(`   URL tentée: ${error.config?.url}`, 'yellow');
      log(`   Erreur réseau: ${error.message}`, 'yellow');
    } else {
      errorMsg = error.message;
    }
    logTest('Connexion restaurant réussie', false, errorMsg);
    return false;
  }
}

/**
 * Test 2: Créer une promotion (code promo)
 */
async function testCreatePromotion() {
  try {
    log('\n📋 Test 2: Créer une promotion', 'cyan');
    const promotionData = {
      code: 'TEST2026',
      type: 'percentage',
      value: 20,
      min_order_amount: 5000,
      max_discount: 2000,
      usage_limit: 100,
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const response = await axios.post(
      `${BASE_URL}/restaurants/me/promotions`,
      promotionData,
      {
        headers: { Authorization: `Bearer ${restaurantToken}` },
      }
    );

    if (response.data.success && response.data.data.promotion) {
      createdPromotionId = response.data.data.promotion.id;
      logTest('Création de promotion réussie', true);
      log(`   Promotion ID: ${createdPromotionId}`, 'blue');
      log(`   Code: ${response.data.data.promotion.code}`, 'blue');
      log(`   Type: ${response.data.data.promotion.type}`, 'blue');
      log(`   Valeur: ${response.data.data.promotion.value}`, 'blue');
      return true;
    } else {
      logTest('Création de promotion réussie', false, 'Promotion non créée');
      return false;
    }
  } catch (error) {
    logTest('Création de promotion réussie', false, error.response?.data || error);
    return false;
  }
}

/**
 * Test 3: Récupérer les promotions
 */
async function testGetPromotions() {
  try {
    log('\n📋 Test 3: Récupérer les promotions', 'cyan');
    const response = await axios.get(`${BASE_URL}/restaurants/me/promotions`, {
      headers: { Authorization: `Bearer ${restaurantToken}` },
    });

    if (response.data.success && response.data.data) {
      const { promo_codes, menu_item_promotions } = response.data.data;
      logTest('Récupération des promotions réussie', true);
      log(`   Codes promo: ${promo_codes.length}`, 'blue');
      log(`   Promotions menu: ${menu_item_promotions.length}`, 'blue');
      
      // Vérifier que la promotion créée est dans la liste
      const foundPromo = promo_codes.find(p => p.id === createdPromotionId);
      if (foundPromo) {
        logTest('Promotion créée trouvée dans la liste', true);
      } else {
        logTest('Promotion créée trouvée dans la liste', false, 'Promotion non trouvée');
      }
      
      return true;
    } else {
      logTest('Récupération des promotions réussie', false, 'Données non reçues');
      return false;
    }
  } catch (error) {
    logTest('Récupération des promotions réussie', false, error.response?.data || error);
    return false;
  }
}

/**
 * Test 4: Mettre à jour une promotion
 */
async function testUpdatePromotion() {
  try {
    log('\n📋 Test 4: Mettre à jour une promotion', 'cyan');
    if (!createdPromotionId) {
      logTest('Mise à jour de promotion', false, 'Aucune promotion créée');
      return false;
    }

    const updateData = {
      value: 25,
      min_order_amount: 3000,
    };

    const response = await axios.put(
      `${BASE_URL}/restaurants/me/promotions/${createdPromotionId}`,
      updateData,
      {
        headers: { Authorization: `Bearer ${restaurantToken}` },
      }
    );

    if (response.data.success && response.data.data.promotion) {
      const updatedPromo = response.data.data.promotion;
      logTest('Mise à jour de promotion réussie', true);
      log(`   Nouvelle valeur: ${updatedPromo.value}`, 'blue');
      log(`   Nouveau min_order_amount: ${updatedPromo.min_order_amount}`, 'blue');
      
      // Vérifier que les valeurs ont été mises à jour
      if (updatedPromo.value === 25 && updatedPromo.min_order_amount === 3000) {
        logTest('Valeurs correctement mises à jour', true);
      } else {
        logTest('Valeurs correctement mises à jour', false, 'Valeurs incorrectes');
      }
      
      return true;
    } else {
      logTest('Mise à jour de promotion réussie', false, 'Promotion non mise à jour');
      return false;
    }
  } catch (error) {
    logTest('Mise à jour de promotion réussie', false, error.response?.data || error);
    return false;
  }
}

/**
 * Test 5: Activer/désactiver une promotion
 */
async function testTogglePromotion() {
  try {
    log('\n📋 Test 5: Activer/désactiver une promotion', 'cyan');
    if (!createdPromotionId) {
      logTest('Toggle promotion', false, 'Aucune promotion créée');
      return false;
    }

    // Désactiver
    const response1 = await axios.put(
      `${BASE_URL}/restaurants/me/promotions/${createdPromotionId}/toggle`,
      {},
      {
        headers: { Authorization: `Bearer ${restaurantToken}` },
      }
    );

    if (response1.data.success && !response1.data.data.promotion.is_active) {
      logTest('Désactivation de promotion réussie', true);
      
      // Réactiver
      const response2 = await axios.put(
        `${BASE_URL}/restaurants/me/promotions/${createdPromotionId}/toggle`,
        {},
        {
          headers: { Authorization: `Bearer ${restaurantToken}` },
        }
      );

      if (response2.data.success && response2.data.data.promotion.is_active) {
        logTest('Réactivation de promotion réussie', true);
        return true;
      } else {
        logTest('Réactivation de promotion réussie', false, 'Promotion non réactivée');
        return false;
      }
    } else {
      logTest('Désactivation de promotion réussie', false, 'Promotion non désactivée');
      return false;
    }
  } catch (error) {
    logTest('Toggle promotion', false, error.response?.data || error);
    return false;
  }
}

/**
 * Test 6: Vérifier les promotions dans le menu
 */
async function testMenuPromotions() {
  try {
    log('\n📋 Test 6: Vérifier les promotions dans le menu', 'cyan');
    if (!restaurantId) {
      logTest('Vérification menu avec promotions', false, 'Restaurant ID manquant');
      return false;
    }

    const response = await axios.get(`${BASE_URL}/restaurants/${restaurantId}/menu`);

    if (response.data.success && response.data.data.categories) {
      const categories = response.data.data.categories;
      let itemsWithPromotion = 0;
      let itemsWithoutPromotion = 0;

      categories.forEach(cat => {
        if (cat.items && Array.isArray(cat.items)) {
          cat.items.forEach(item => {
            if (item.is_promotion_active && item.effective_price && item.effective_price < item.original_price) {
              itemsWithPromotion++;
              log(`   ✅ Item en promotion: ${item.name}`, 'green');
              log(`      Prix original: ${item.original_price} FCFA`, 'blue');
              log(`      Prix promo: ${item.effective_price} FCFA`, 'blue');
              log(`      Réduction: ${item.savings_percent}%`, 'blue');
            } else {
              itemsWithoutPromotion++;
            }
          });
        }
      });

      logTest('Récupération du menu réussie', true);
      log(`   Items avec promotion: ${itemsWithPromotion}`, 'blue');
      log(`   Items sans promotion: ${itemsWithoutPromotion}`, 'blue');
      
      // Vérifier que les champs de promotion sont présents
      const hasPromotionFields = categories.some(cat => 
        cat.items?.some(item => 
          item.hasOwnProperty('is_promotion_active') &&
          item.hasOwnProperty('effective_price') &&
          item.hasOwnProperty('original_price')
        )
      );
      
      if (hasPromotionFields) {
        logTest('Champs de promotion présents dans le menu', true);
      } else {
        logTest('Champs de promotion présents dans le menu', false, 'Champs manquants');
      }
      
      return true;
    } else {
      logTest('Récupération du menu réussie', false, 'Menu non reçu');
      return false;
    }
  } catch (error) {
    logTest('Vérification menu avec promotions', false, error.response?.data || error);
    return false;
  }
}

/**
 * Test 7: Créer une promotion sur un item du menu
 */
async function testCreateMenuItemPromotion() {
  try {
    log('\n📋 Test 7: Créer une promotion sur un item du menu', 'cyan');
    if (!restaurantId) {
      logTest('Création promotion item menu', false, 'Restaurant ID manquant');
      return false;
    }

    // Récupérer un item du menu
    const menuResponse = await axios.get(`${BASE_URL}/restaurants/${restaurantId}/menu`);
    if (!menuResponse.data.success) {
      logTest('Création promotion item menu', false, 'Impossible de récupérer le menu');
      return false;
    }

    const categories = menuResponse.data.data.categories;
    let menuItem = null;
    
    for (const cat of categories) {
      if (cat.items && cat.items.length > 0) {
        menuItem = cat.items[0];
        break;
      }
    }

    if (!menuItem) {
      logTest('Création promotion item menu', false, 'Aucun item trouvé dans le menu');
      return false;
    }

    // Créer une promotion sur cet item
    const discountPercent = 20; // 20% de réduction
    const promotionalPrice = Math.round(menuItem.price * (1 - discountPercent / 100));
    const response = await axios.put(
      `${BASE_URL}/restaurants/me/menu/${menuItem.id}/promotion`,
      {
        is_promotional: true,
        discount_type: 'percentage',
        discount_value: discountPercent,
        promotion_start: new Date().toISOString(),
        promotion_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        promotion_description: 'Promotion de test - 20% de réduction',
      },
      {
        headers: { Authorization: `Bearer ${restaurantToken}` },
      }
    );

    if (response.data.success) {
      logTest('Création promotion item menu réussie', true);
      log(`   Item: ${menuItem.name}`, 'blue');
      log(`   Prix original: ${menuItem.price} FCFA`, 'blue');
      log(`   Prix promo: ${promotionalPrice} FCFA`, 'blue');
      log(`   Réduction: ${Math.round((1 - promotionalPrice / menuItem.price) * 100)}%`, 'blue');
      return true;
    } else {
      logTest('Création promotion item menu réussie', false, 'Promotion non créée');
      return false;
    }
  } catch (error) {
    logTest('Création promotion item menu', false, error.response?.data || error);
    return false;
  }
}

/**
 * Test 8: Supprimer une promotion
 */
async function testDeletePromotion() {
  try {
    log('\n📋 Test 8: Supprimer une promotion', 'cyan');
    if (!createdPromotionId) {
      logTest('Suppression de promotion', false, 'Aucune promotion créée');
      return false;
    }

    const response = await axios.delete(
      `${BASE_URL}/restaurants/me/promotions/${createdPromotionId}`,
      {
        headers: { Authorization: `Bearer ${restaurantToken}` },
      }
    );

    if (response.data.success) {
      logTest('Suppression de promotion réussie', true);
      
      // Vérifier que la promotion a bien été supprimée
      const getResponse = await axios.get(`${BASE_URL}/restaurants/me/promotions`, {
        headers: { Authorization: `Bearer ${restaurantToken}` },
      });

      if (getResponse.data.success) {
        const foundPromo = getResponse.data.data.promo_codes.find(p => p.id === createdPromotionId);
        if (!foundPromo) {
          logTest('Promotion bien supprimée de la liste', true);
        } else {
          logTest('Promotion bien supprimée de la liste', false, 'Promotion toujours présente');
        }
      }
      
      return true;
    } else {
      logTest('Suppression de promotion réussie', false, 'Promotion non supprimée');
      return false;
    }
  } catch (error) {
    logTest('Suppression de promotion', false, error.response?.data || error);
    return false;
  }
}

/**
 * Test 9: Test de validation des erreurs
 */
async function testValidationErrors() {
  try {
    log('\n📋 Test 9: Test de validation des erreurs', 'cyan');
    
    // Test 1: Créer une promotion sans code
    try {
      await axios.post(
        `${BASE_URL}/restaurants/me/promotions`,
        {
          type: 'percentage',
          value: 20,
        },
        {
          headers: { Authorization: `Bearer ${restaurantToken}` },
        }
      );
      logTest('Validation: code requis', false, 'La requête aurait dû échouer');
    } catch (error) {
      if (error.response?.status === 400) {
        logTest('Validation: code requis', true);
      } else {
        logTest('Validation: code requis', false, error.response?.data || error);
      }
    }

    // Test 2: Créer une promotion avec un code existant
    try {
      await axios.post(
        `${BASE_URL}/restaurants/me/promotions`,
        {
          code: 'TEST2026',
          type: 'percentage',
          value: 20,
        },
        {
          headers: { Authorization: `Bearer ${restaurantToken}` },
        }
      );
      logTest('Validation: code unique', false, 'La requête aurait dû échouer');
    } catch (error) {
      if (error.response?.status === 400) {
        logTest('Validation: code unique', true);
      } else {
        logTest('Validation: code unique', false, error.response?.data || error);
      }
    }

    // Test 3: Créer une promotion avec un type invalide
    try {
      await axios.post(
        `${BASE_URL}/restaurants/me/promotions`,
        {
          code: 'TEST999',
          type: 'invalid_type',
          value: 20,
        },
        {
          headers: { Authorization: `Bearer ${restaurantToken}` },
        }
      );
      logTest('Validation: type invalide', false, 'La requête aurait dû échouer');
    } catch (error) {
      if (error.response?.status === 400) {
        logTest('Validation: type invalide', true);
      } else {
        logTest('Validation: type invalide', false, error.response?.data || error);
      }
    }

    return true;
  } catch (error) {
    logTest('Test de validation', false, error);
    return false;
  }
}

/**
 * Vérifier que le serveur est accessible
 */
async function checkServerConnection() {
  try {
    log('\n🔍 Vérification de la connexion au serveur...', 'cyan');
    const response = await axios.get(`${BASE_URL.replace('/api/v1', '')}/health`, {
      timeout: 3000,
      validateStatus: () => true, // Accepter tous les statuts
    });
    log('✅ Serveur accessible', 'green');
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      log('❌ Serveur non accessible', 'red');
      log(`\n⚠️  Le serveur backend n'est pas démarré.`, 'yellow');
      log(`   Veuillez démarrer le serveur avec :`, 'yellow');
      log(`   cd baibebalo-backend`, 'yellow');
      log(`   npm run dev`, 'yellow');
      log(`\n   Ou vérifiez que le serveur écoute sur le port 5000.`, 'yellow');
      return false;
    }
    // Si c'est une autre erreur (404 par exemple), le serveur répond au moins
    log('✅ Serveur accessible (même si /health n\'existe pas)', 'green');
    return true;
  }
}

/**
 * Exécuter tous les tests
 */
async function runAllTests() {
  log('\n🚀 Démarrage des tests complets de promotion', 'cyan');
  log('='.repeat(60), 'cyan');

  // Vérifier que le serveur est accessible
  const serverAvailable = await checkServerConnection();
  if (!serverAvailable) {
    log('\n❌ Arrêt des tests. Veuillez démarrer le serveur backend.', 'red');
    process.exit(1);
  }

  // Test 1: Connexion
  const loginSuccess = await testRestaurantLogin();
  if (!loginSuccess) {
    log('\n❌ Impossible de se connecter. Arrêt des tests.', 'red');
    log('   Vérifiez que:', 'yellow');
    log('   1. Le serveur backend est démarré', 'yellow');
    log('   2. Les données de test sont chargées (npm run seed:test)', 'yellow');
    log('   3. Les identifiants sont corrects (restaurant@test.ci / restaurant123)', 'yellow');
    return;
  }

  // Test 2: Créer une promotion
  await testCreatePromotion();

  // Test 3: Récupérer les promotions
  await testGetPromotions();

  // Test 4: Mettre à jour une promotion
  await testUpdatePromotion();

  // Test 5: Activer/désactiver une promotion
  await testTogglePromotion();

  // Test 6: Vérifier les promotions dans le menu
  await testMenuPromotions();

  // Test 7: Créer une promotion sur un item du menu
  await testCreateMenuItemPromotion();

  // Test 8: Supprimer une promotion
  await testDeletePromotion();

  // Test 9: Test de validation
  await testValidationErrors();

  // Résumé
  log('\n' + '='.repeat(60), 'cyan');
  log('\n📊 Résumé des tests', 'cyan');
  log(`✅ Tests réussis: ${testResults.passed}`, 'green');
  log(`❌ Tests échoués: ${testResults.failed}`, 'red');
  
  if (testResults.errors.length > 0) {
    log('\n🔍 Erreurs détaillées:', 'yellow');
    testResults.errors.forEach((err, index) => {
      log(`   ${index + 1}. ${err.test}: ${err.error}`, 'yellow');
    });
  }

  const totalTests = testResults.passed + testResults.failed;
  const successRate = totalTests > 0 ? ((testResults.passed / totalTests) * 100).toFixed(1) : 0;
  log(`\n📈 Taux de réussite: ${successRate}%`, successRate >= 80 ? 'green' : 'yellow');

  if (testResults.failed === 0) {
    log('\n🎉 Tous les tests sont passés avec succès!', 'green');
  } else {
    log('\n⚠️  Certains tests ont échoué. Veuillez vérifier les erreurs ci-dessus.', 'yellow');
  }
}

// Exécuter les tests
runAllTests().catch(error => {
  log(`\n❌ Erreur fatale: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

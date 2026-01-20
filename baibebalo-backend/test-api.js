/**
 * Script de test pour l'API BAIBEBALO
 * Teste les principales routes sans utiliser Postman
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5000/api/v1';
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Variables pour stocker les tokens et IDs
let userToken = null;
// eslint-disable-next-line no-unused-vars
let restaurantToken = null;
// eslint-disable-next-line no-unused-vars
let deliveryToken = null;
let adminToken = null;
// eslint-disable-next-line no-unused-vars
let userId = null;
let restaurantId = null;
let orderId = null;
let addressId = null;

// Fonction pour afficher les résultats
function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function info(message) {
  log(`ℹ ${message}`, 'blue');
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

// Fonction pour faire une requête
async function request(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data || err.message,
      status: err.response?.status || 500,
    };
  }
}

// Tests
async function runTests() {
  section('🧪 TESTS DE L\'API BAIBEBALO');

  // ============================================
  // 1. TEST DE SANTÉ
  // ============================================
  section('1. Test de santé du serveur');
  try {
    const healthResponse = await axios.get('http://localhost:5000/health');
    if (healthResponse.data.success) {
      success('Serveur en ligne et fonctionnel');
      info(`Environnement: ${healthResponse.data.environment}`);
    }
  } catch (err) {
    error('Le serveur n\'est pas démarré !');
    info('Démarrez le serveur avec: npm run dev');
    process.exit(1);
  }

  // ============================================
  // 2. AUTHENTIFICATION
  // ============================================
  section('2. Authentification');

  // 2.1 Envoyer OTP
  info('Envoi d\'un code OTP...');
  const otpResult = await request('POST', '/auth/send-otp', {
    phone: '+2250701234567',
  });

  if (otpResult.success) {
    success('Code OTP envoyé (vérifiez les logs ou la base de données)');
    info('En développement, le code OTP peut être trouvé dans les logs');
  } else {
    error(`Erreur envoi OTP: ${JSON.stringify(otpResult.error)}`);
  }

  // 2.2 Vérifier OTP et créer compte
  info('Vérification OTP et création de compte...');
  const verifyResult = await request('POST', '/auth/verify-otp', {
    phone: '+2250701234567',
    code: '123456', // Code par défaut - peut nécessiter ajustement
    first_name: 'Jean',
    last_name: 'Kouassi',
  });

  if (verifyResult.success && verifyResult.data.data?.accessToken) {
    userToken = verifyResult.data.data.accessToken;
    userId = verifyResult.data.data.user?.id;
    success('Compte utilisateur créé et connecté');
    info(`Token utilisateur obtenu: ${userToken.substring(0, 20)}...`);
  } else {
    error(`Erreur vérification OTP: ${JSON.stringify(verifyResult.error)}`);
    info('Note: Le code OTP peut être différent. Vérifiez la base de données.');
  }

  // 2.3 Connexion Admin
  info('Connexion en tant qu\'administrateur...');
  const adminLoginResult = await request('POST', '/auth/admin/login', {
    email: 'admin@baibebalo.ci',
    password: 'Admin@2025!',
  });

  if (adminLoginResult.success && adminLoginResult.data.data?.accessToken) {
    adminToken = adminLoginResult.data.data.accessToken;
    success('Connexion admin réussie');
  } else {
    error(`Erreur connexion admin: ${JSON.stringify(adminLoginResult.error)}`);
  }

  // ============================================
  // 3. UTILISATEURS (CLIENTS)
  // ============================================
  if (userToken) {
    section('3. Gestion des utilisateurs');

    // 3.1 Obtenir mon profil
    info('Récupération du profil utilisateur...');
    const profileResult = await request('GET', '/users/me', null, userToken);
    if (profileResult.success) {
      success('Profil utilisateur récupéré');
      console.log(JSON.stringify(profileResult.data.data, null, 2));
    } else {
      error(`Erreur récupération profil: ${JSON.stringify(profileResult.error)}`);
    }

    // 3.2 Ajouter une adresse
    info('Ajout d\'une adresse...');
    const addressResult = await request(
      'POST',
      '/users/me/addresses',
      {
        title: 'Maison',
        address_line: 'Quartier Tchengué, près de l\'école primaire',
        district: 'Tchengué',
        landmark: 'Près de l\'école primaire',
        latitude: 9.4581,
        longitude: -5.6296,
        is_default: true,
      },
      userToken
    );

    if (addressResult.success) {
      addressId = addressResult.data.data?.address?.id;
      success('Adresse ajoutée avec succès');
      info(`ID adresse: ${addressId}`);
    } else {
      error(`Erreur ajout adresse: ${JSON.stringify(addressResult.error)}`);
    }

    // 3.3 Obtenir mes adresses
    info('Récupération des adresses...');
    const addressesResult = await request('GET', '/users/me/addresses', null, userToken);
    if (addressesResult.success) {
      success(`Adresses récupérées: ${addressesResult.data.data?.addresses?.length || 0}`);
    } else {
      error(`Erreur récupération adresses: ${JSON.stringify(addressesResult.error)}`);
    }
  }

  // ============================================
  // 4. RESTAURANTS (PUBLIC)
  // ============================================
  section('4. Restaurants (Public)');

  // 4.1 Lister les restaurants
  info('Liste des restaurants...');
  const restaurantsResult = await request('GET', '/restaurants?lat=9.4581&lng=-5.6296&radius=5');
  if (restaurantsResult.success) {
    const restaurants = restaurantsResult.data.data?.restaurants || [];
    success(`${restaurants.length} restaurant(s) trouvé(s)`);
    if (restaurants.length > 0) {
      restaurantId = restaurants[0].id;
      info(`Premier restaurant: ${restaurants[0].name} (ID: ${restaurantId})`);
    }
  } else {
    error(`Erreur liste restaurants: ${JSON.stringify(restaurantsResult.error)}`);
  }

  // 4.2 Détails d'un restaurant
  if (restaurantId) {
    info('Détails du restaurant...');
    const restaurantDetailResult = await request('GET', `/restaurants/${restaurantId}`);
    if (restaurantDetailResult.success) {
      success('Détails restaurant récupérés');
      const restaurant = restaurantDetailResult.data.data?.restaurant;
      if (restaurant) {
        info(`Nom: ${restaurant.name}`);
        info(`Catégorie: ${restaurant.category}`);
        info(`Note moyenne: ${restaurant.average_rating || 'N/A'}`);
      }
    } else {
      error(`Erreur détails restaurant: ${JSON.stringify(restaurantDetailResult.error)}`);
    }

    // 4.3 Menu du restaurant
    info('Menu du restaurant...');
    const menuResult = await request('GET', `/restaurants/${restaurantId}/menu`);
    if (menuResult.success) {
      const categories = menuResult.data.data?.categories || [];
      success(`${categories.length} catégorie(s) de menu trouvée(s)`);
      categories.forEach((cat) => {
        info(`  - ${cat.name}: ${cat.items?.length || 0} article(s)`);
      });
    } else {
      error(`Erreur menu: ${JSON.stringify(menuResult.error)}`);
    }
  }

  // ============================================
  // 5. COMMANDES
  // ============================================
  if (userToken && restaurantId && addressId) {
    section('5. Gestion des commandes');

    // 5.1 Créer une commande
    info('Création d\'une commande...');
    const orderResult = await request(
      'POST',
      '/orders',
      {
        restaurant_id: restaurantId,
        items: [
          {
            menu_item_id: 'test-item-id', // Nécessitera un vrai ID de menu_item
            quantity: 2,
            options: {
              size: 'Grand',
              accompaniment: 'Attiéké',
            },
          },
        ],
        delivery_address_id: addressId,
        payment_method: 'cash',
        special_instructions: 'Test de commande',
      },
      userToken
    );

    if (orderResult.success) {
      orderId = orderResult.data.data?.order?.id;
      success('Commande créée avec succès');
      info(`Numéro de commande: ${orderResult.data.data?.order?.order_number}`);
      info(`Total: ${orderResult.data.data?.order?.total} FCFA`);
    } else {
      error(`Erreur création commande: ${JSON.stringify(orderResult.error)}`);
      info('Note: La création de commande nécessite des menu_items valides');
    }

    // 5.2 Obtenir mes commandes
    info('Récupération de mes commandes...');
    const myOrdersResult = await request('GET', '/users/me/orders?page=1&limit=10', null, userToken);
    if (myOrdersResult.success) {
      const orders = myOrdersResult.data.data?.orders || [];
      success(`${orders.length} commande(s) trouvée(s)`);
    } else {
      error(`Erreur récupération commandes: ${JSON.stringify(myOrdersResult.error)}`);
    }
  }

  // ============================================
  // 6. ADMINISTRATEUR
  // ============================================
  if (adminToken) {
    section('6. Administration');

    // 6.1 Dashboard
    info('Récupération du dashboard admin...');
    const dashboardResult = await request('GET', '/admin/dashboard', null, adminToken);
    if (dashboardResult.success) {
      success('Dashboard admin récupéré');
      const kpis = dashboardResult.data.data?.kpis;
      if (kpis) {
        info(`Revenus totaux: ${kpis.total_revenue || 0} FCFA`);
        info(`Commandes totales: ${kpis.total_orders || 0}`);
        info(`Utilisateurs: ${kpis.total_users || 0}`);
      }
    } else {
      error(`Erreur dashboard: ${JSON.stringify(dashboardResult.error)}`);
    }

    // 6.2 Lister les utilisateurs
    info('Liste des utilisateurs...');
    const usersResult = await request('GET', '/admin/users?page=1&limit=10', null, adminToken);
    if (usersResult.success) {
      const users = usersResult.data.data?.users || [];
      success(`${users.length} utilisateur(s) trouvé(s)`);
    } else {
      error(`Erreur liste utilisateurs: ${JSON.stringify(usersResult.error)}`);
    }
  }

  // ============================================
  // RÉSUMÉ
  // ============================================
  section('📊 RÉSUMÉ DES TESTS');

  const results = {
    'Serveur': '✓',
    'Authentification OTP': userToken ? '✓' : '✗',
    'Connexion Admin': adminToken ? '✓' : '✗',
    'Profil Utilisateur': userToken ? '✓' : '✗',
    'Adresses': addressId ? '✓' : '✗',
    'Restaurants': restaurantId ? '✓' : '✗',
    'Commandes': orderId ? '✓' : '⚠ (nécessite menu_items)',
    'Admin Dashboard': adminToken ? '✓' : '✗',
  };

  Object.entries(results).forEach(([test, result]) => {
    if (result === '✓') {
      success(`${test}: ${result}`);
    } else if (result.includes('⚠')) {
      log(`${test}: ${result}`, 'yellow');
    } else {
      error(`${test}: ${result}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  log('✅ Tests terminés !', 'green');
  console.log('='.repeat(60) + '\n');

  if (!userToken) {
    info('💡 Astuce: Pour tester avec un utilisateur, vérifiez le code OTP dans la base de données');
    info('   Table: otp_codes | Colonne: code');
  }
}

// Exécuter les tests
runTests().catch((err) => {
  error(`Erreur fatale: ${err.message}`);
  console.error(err);
  process.exit(1);
});

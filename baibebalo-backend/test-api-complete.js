/**
 * Script de test complet pour l'API BAIBEBALO - KORHOGO
 * Démarre le serveur et teste toutes les routes
 * ADAPTÉ POUR KORHOGO : Restaurants et plats locaux
 */

const { spawn } = require('child_process');
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';
let serverProcess = null;

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

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

function warning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

// Attendre que le serveur soit prêt
async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await axios.get('http://localhost:5000/health', { timeout: 2000 });
      if (response.data.success) {
        return true;
      }
    } catch (err) {
      // Serveur pas encore prêt
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    process.stdout.write('.');
  }
  return false;
}

// Démarrer le serveur
function startServer() {
  return new Promise((resolve, reject) => {
    log('\n🚀 Démarrage du serveur...', 'cyan');
    serverProcess = spawn('npm', ['run', 'dev'], {
      shell: true,
      stdio: 'pipe',
    });

    let serverReady = false;

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('BAIBEBALO API - SERVEUR DÉMARRÉ') || output.includes('Port:')) {
        if (!serverReady) {
          serverReady = true;
          log('\n✅ Serveur démarré !', 'green');
          resolve();
        }
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('error') || output.includes('Error')) {
        error(`Erreur serveur: ${output}`);
      }
    });

    serverProcess.on('error', (err) => {
      error(`Impossible de démarrer le serveur: ${err.message}`);
      reject(err);
    });

    setTimeout(() => {
      if (!serverReady) {
        log('\n⏳ Attente que le serveur démarre...', 'yellow');
        waitForServer().then((ready) => {
          if (ready) {
            resolve();
          } else {
            reject(new Error('Timeout: Le serveur n\'a pas démarré'));
          }
        });
      }
    }, 2000);
  });
}

// Arrêter le serveur
function stopServer() {
  if (serverProcess) {
    log('\n🛑 Arrêt du serveur...', 'yellow');
    serverProcess.kill();
  }
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

// Données de test pour les restaurants de KORHOGO
const SAMPLE_RESTAURANTS = [
  {
    name: 'Chez Tantine Fatoumata',
    description: 'Spécialités du Nord : Riz gras, Tô, Sauce arachide. Cuisine familiale authentique',
    cuisine_type: 'Cuisine du Nord',
    address: 'Quartier Tchenguele, près du marché central',
    district: 'Tchenguele',
    phone: '+2250708123456',
    latitude: 9.4581,
    longitude: -5.6296,
    is_active: true,
    delivery_fee: 300,
    minimum_order: 1500,
    average_preparation_time: 30,
    rating: 4.6,
  },
  {
    name: 'Le Maquis du Nord',
    description: 'Grillades et spécialités locales. Poulet bicyclette, brochettes, capitaine braisé',
    cuisine_type: 'Maquis',
    address: 'Route de Ferkessédougou, après la station Total',
    district: 'Centre-ville',
    phone: '+2250709234567',
    latitude: 9.4598,
    longitude: -5.6280,
    is_active: true,
    delivery_fee: 500,
    minimum_order: 2000,
    average_preparation_time: 35,
    rating: 4.7,
  },
  {
    name: 'Restaurant Waraba',
    description: 'Cuisine traditionnelle sénoufo. Tô sauce feuille, sauce gombo, viande de brousse',
    cuisine_type: 'Traditionnelle Sénoufo',
    address: 'Quartier Koko, face à la mosquée',
    district: 'Koko',
    phone: '+2250700345678',
    latitude: 9.4565,
    longitude: -5.6310,
    is_active: true,
    delivery_fee: 400,
    minimum_order: 1800,
    average_preparation_time: 40,
    rating: 4.8,
  },
  {
    name: 'Fast Food City',
    description: 'Burgers, chawarma, sandwichs et jus naturels. Service rapide',
    cuisine_type: 'Fast-Food',
    address: 'Centre commercial, Boulevard du Nord',
    district: 'Centre-ville',
    phone: '+2250701456789',
    latitude: 9.4590,
    longitude: -5.6285,
    is_active: true,
    delivery_fee: 300,
    minimum_order: 1200,
    average_preparation_time: 20,
    rating: 4.3,
  },
  {
    name: 'La Terrasse du Poro',
    description: 'Restaurant moderne avec terrasse. Cuisine variée : Européenne, Africaine, Asiatique',
    cuisine_type: 'Internationale',
    address: 'Route de Boundiali, Hôtel le Poro',
    district: 'Zone résidentielle',
    phone: '+2250702567890',
    latitude: 9.4610,
    longitude: -5.6270,
    is_active: true,
    delivery_fee: 800,
    minimum_order: 3500,
    average_preparation_time: 35,
    rating: 4.5,
  },
];

// Données de test pour les plats de KORHOGO
const SAMPLE_DISHES = {
  'Chez Tantine Fatoumata': [
    {
      name: 'Riz Gras Complet',
      description: 'Riz cuisiné à l\'huile avec légumes, viande de mouton et épices locales',
      price: 2000,
      category: 'Plats Principaux',
      is_available: true,
      preparation_time: 25,
    },
    {
      name: 'Tô Sauce Arachide',
      description: 'Pâte de mil accompagnée de sauce à base d\'arachide et viande',
      price: 1800,
      category: 'Plats Principaux',
      is_available: true,
      preparation_time: 30,
    },
    {
      name: 'Tô Sauce Gombo',
      description: 'Pâte de mil avec sauce gombo frais et poisson fumé',
      price: 1500,
      category: 'Plats Principaux',
      is_available: true,
      preparation_time: 30,
    },
    {
      name: 'Foutou Banane Sauce Graine',
      description: 'Foutou de banane plantain avec sauce graine traditionnelle',
      price: 2200,
      category: 'Plats Principaux',
      is_available: true,
      preparation_time: 35,
    },
    {
      name: 'Poulet Bicyclette Braisé',
      description: 'Poulet fermier braisé aux épices du Nord',
      price: 3500,
      category: 'Grillades',
      is_available: true,
      preparation_time: 35,
    },
    {
      name: 'Alloco Sauce Piment',
      description: 'Bananes plantains frites avec sauce piment maison',
      price: 1000,
      category: 'Entrées',
      is_available: true,
      preparation_time: 15,
    },
    {
      name: 'Jus de Bissap',
      description: 'Jus d\'hibiscus frais sucré au miel',
      price: 500,
      category: 'Boissons',
      is_available: true,
      preparation_time: 5,
    },
    {
      name: 'Jus de Gingembre',
      description: 'Jus de gingembre frais épicé',
      price: 500,
      category: 'Boissons',
      is_available: true,
      preparation_time: 5,
    },
  ],
  'Le Maquis du Nord': [
    {
      name: 'Poulet Bicyclette Grillé',
      description: 'Poulet fermier entier grillé aux épices, servi avec attiéké',
      price: 4500,
      category: 'Grillades',
      is_available: true,
      preparation_time: 40,
    },
    {
      name: 'Brochettes de Mouton',
      description: '5 brochettes de mouton marinées aux épices locales',
      price: 3000,
      category: 'Grillades',
      is_available: true,
      preparation_time: 30,
    },
    {
      name: 'Capitaine Braisé',
      description: 'Poisson capitaine frais braisé avec sauce tomate',
      price: 3500,
      category: 'Grillades',
      is_available: true,
      preparation_time: 35,
    },
    {
      name: 'Côtelettes de Porc',
      description: 'Côtelettes de porc grillées avec marinade maison',
      price: 3800,
      category: 'Grillades',
      is_available: true,
      preparation_time: 30,
    },
    {
      name: 'Attiéké Poisson',
      description: 'Semoule de manioc avec poisson frit et sauce tomate',
      price: 2500,
      category: 'Plats Principaux',
      is_available: true,
      preparation_time: 25,
    },
    {
      name: 'Placali Sauce Graine',
      description: 'Pâte de manioc fermenté avec sauce palmiste',
      price: 2000,
      category: 'Plats Principaux',
      is_available: true,
      preparation_time: 30,
    },
    {
      name: 'Tchapalo Frais',
      description: 'Bière traditionnelle de mil (boisson locale)',
      price: 800,
      category: 'Boissons',
      is_available: true,
      preparation_time: 5,
    },
  ],
  'Restaurant Waraba': [
    {
      name: 'Tô Sauce Feuilles',
      description: 'Pâte de mil avec sauce feuilles de baobab et viande de brousse',
      price: 2500,
      category: 'Plats Principaux',
      is_available: true,
      preparation_time: 40,
    },
    {
      name: 'Riz Sauce Arachide',
      description: 'Riz blanc avec sauce arachide épaisse et viande',
      price: 2000,
      category: 'Plats Principaux',
      is_available: true,
      preparation_time: 30,
    },
    {
      name: 'Sauce Djouka',
      description: 'Sauce tomate épicée avec aubergines et gombo, servie avec Tô',
      price: 1800,
      category: 'Plats Principaux',
      is_available: true,
      preparation_time: 35,
    },
    {
      name: 'Pintade Grillée',
      description: 'Pintade fermière grillée aux épices sénoufo',
      price: 5000,
      category: 'Grillades',
      is_available: true,
      preparation_time: 45,
    },
    {
      name: 'Viande de Brousse Fumée',
      description: 'Viande d\'aulacodes fumée avec sauce pimentée',
      price: 4000,
      category: 'Spécialités',
      is_available: true,
      preparation_time: 35,
    },
    {
      name: 'Galettes de Mil',
      description: 'Galettes traditionnelles de mil avec du miel',
      price: 1000,
      category: 'Desserts',
      is_available: true,
      preparation_time: 15,
    },
    {
      name: 'Lait Caillé Sucré',
      description: 'Lait fermenté traditionnel sucré au miel',
      price: 600,
      category: 'Boissons',
      is_available: true,
      preparation_time: 5,
    },
  ],
  'Fast Food City': [
    {
      name: 'Burger du Nord',
      description: 'Burger avec steak de bœuf local, légumes frais et sauce épicée',
      price: 2000,
      category: 'Burgers',
      is_available: true,
      preparation_time: 15,
    },
    {
      name: 'Chawarma Poulet',
      description: 'Pain pita avec poulet grillé, crudités et sauce blanche',
      price: 1500,
      category: 'Sandwichs',
      is_available: true,
      preparation_time: 12,
    },
    {
      name: 'Chawarma Viande',
      description: 'Pain pita avec viande de bœuf grillée et légumes',
      price: 1800,
      category: 'Sandwichs',
      is_available: true,
      preparation_time: 12,
    },
    {
      name: 'Sandwich Omelette',
      description: 'Pain avec omelette, salade, tomate et mayonnaise',
      price: 1000,
      category: 'Sandwichs',
      is_available: true,
      preparation_time: 10,
    },
    {
      name: 'Frites Portion Moyenne',
      description: 'Pommes de terre frites croustillantes',
      price: 800,
      category: 'Accompagnements',
      is_available: true,
      preparation_time: 10,
    },
    {
      name: 'Jus d\'Orange Frais',
      description: 'Jus d\'orange pressé minute',
      price: 700,
      category: 'Boissons',
      is_available: true,
      preparation_time: 5,
    },
    {
      name: 'Jus de Mangue',
      description: 'Jus de mangue naturel du verger local',
      price: 800,
      category: 'Boissons',
      is_available: true,
      preparation_time: 5,
    },
  ],
  'La Terrasse du Poro': [
    {
      name: 'Escalope Milanaise',
      description: 'Escalope de poulet panée, frites et salade',
      price: 4500,
      category: 'Plats Principaux',
      is_available: true,
      preparation_time: 30,
    },
    {
      name: 'Brochettes de Bœuf',
      description: 'Brochettes de filet de bœuf avec légumes grillés',
      price: 5000,
      category: 'Grillades',
      is_available: true,
      preparation_time: 35,
    },
    {
      name: 'Poulet Yassa',
      description: 'Poulet mariné aux oignons et citron, riz blanc',
      price: 3500,
      category: 'Plats Principaux',
      is_available: true,
      preparation_time: 35,
    },
    {
      name: 'Poisson Grillé Entier',
      description: 'Poisson carpe entier grillé avec légumes',
      price: 4000,
      category: 'Grillades',
      is_available: true,
      preparation_time: 40,
    },
    {
      name: 'Salade Mixte',
      description: 'Salade verte, tomates, concombre, œuf dur, vinaigrette',
      price: 2000,
      category: 'Entrées',
      is_available: true,
      preparation_time: 15,
    },
    {
      name: 'Tiep Bou Dien (Thiéboudienne)',
      description: 'Riz au poisson sénégalais avec légumes',
      price: 3800,
      category: 'Plats Principaux',
      is_available: true,
      preparation_time: 40,
    },
    {
      name: 'Crème Caramel',
      description: 'Dessert onctueux au caramel',
      price: 1500,
      category: 'Desserts',
      is_available: true,
      preparation_time: 10,
    },
    {
      name: 'Café Liégeois',
      description: 'Café glacé avec crème chantilly',
      price: 1200,
      category: 'Boissons',
      is_available: true,
      preparation_time: 8,
    },
  ],
};

// Tests
async function runTests() {
  section('🧪 TESTS DE L\'API BAIBEBALO - KORHOGO 🇨🇮');

  // Variables pour stocker les tokens et IDs
  let userToken = null;
  let adminToken = null;
  let restaurantIds = [];
  let dishIds = [];
  let addressId = null;

  // ============================================
  // 1. TEST DE SANTÉ
  // ============================================
  section('1. Test de santé du serveur');
  try {
    const healthResponse = await axios.get('http://localhost:5000/health');
    if (healthResponse.data.success) {
      success('Serveur en ligne et fonctionnel');
      info(`Environnement: ${healthResponse.data.data?.environment || 'development'}`);
      info(`Version API: ${healthResponse.data.data?.version || 'v1'}`);
    }
  } catch (err) {
    error('Le serveur n\'est pas accessible');
    return;
  }

  // ============================================
  // 2. AUTHENTIFICATION
  // ============================================
  section('2. Authentification');

  // 2.1 Connexion Admin
  info('Connexion en tant qu\'administrateur...');
  const adminLoginResult = await request('POST', '/auth/admin/login', {
    email: 'admin@baibebalo.ci',
    password: 'Admin@2025!',
  });

  if (adminLoginResult.success && adminLoginResult.data.data?.accessToken) {
    adminToken = adminLoginResult.data.data.accessToken;
    success('Connexion admin réussie');
  } else {
    error(`Erreur: ${JSON.stringify(adminLoginResult.error)}`);
    warning('Impossible de continuer sans token admin');
    return;
  }

  // 2.2 Envoyer OTP
  info('Envoi d\'un code OTP...');
  const otpResult = await request('POST', '/auth/send-otp', {
    phone: '+2250708888888',
  });

  if (otpResult.success) {
    success('Code OTP envoyé');
  } else {
    error(`Erreur: ${JSON.stringify(otpResult.error)}`);
  }

  // 2.3 Récupérer le code OTP de la base de données
  info('Récupération du code OTP depuis la base de données...');
  const { query } = require('./src/database/db');
  let otpCode = null;
  try {
    const otpResult = await query(
      "SELECT code FROM otp_codes WHERE phone = '+2250708888888' AND is_used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1"
    );
    if (otpResult.rows.length > 0) {
      otpCode = otpResult.rows[0].code;
      success(`Code OTP trouvé: ${otpCode}`);
    } else {
      otpCode = '123456';
      warning('Aucun code OTP valide trouvé. Utilisation d\'un code par défaut.');
    }
  } catch (err) {
    otpCode = '123456';
    warning('Impossible de récupérer le code OTP. Utilisation d\'un code par défaut.');
  }

  // 2.4 Vérifier OTP et créer compte
  info('Vérification OTP et création de compte...');
  const verifyResult = await request('POST', '/auth/verify-otp', {
    phone: '+2250708888888',
    code: otpCode,
    first_name: 'Mamadou',
    last_name: 'Koné',
  });

  if (verifyResult.success && verifyResult.data.data?.accessToken) {
    userToken = verifyResult.data.data.accessToken;
    success('Compte utilisateur créé et connecté');
  } else {
    error(`Erreur: ${JSON.stringify(verifyResult.error)}`);
  }

  // ============================================
  // 3. CRÉATION DES RESTAURANTS DE KORHOGO
  // ============================================
  section('3. Création des restaurants et plats de Korhogo 🏪');

  for (const restaurant of SAMPLE_RESTAURANTS) {
    info(`\n📍 Création du restaurant: ${restaurant.name}`);
    
    const createRestaurantResult = await request(
      'POST',
      '/admin/restaurants',
      restaurant,
      adminToken
    );

    if (createRestaurantResult.success) {
      const restaurantId = createRestaurantResult.data.data?.restaurant?.id;
      restaurantIds.push(restaurantId);
      success(`Restaurant "${restaurant.name}" créé (ID: ${restaurantId})`);
      info(`  📍 Adresse: ${restaurant.address}`);
      info(`  🍽️  Type: ${restaurant.cuisine_type}`);
      info(`  ⭐ Note: ${restaurant.rating}/5`);

      // Ajouter les plats pour ce restaurant
      const dishes = SAMPLE_DISHES[restaurant.name] || [];
      
      if (dishes.length > 0) {
        info(`\n  🍴 Ajout de ${dishes.length} plat(s):`);
        
        for (const dish of dishes) {
          const createDishResult = await request(
            'POST',
            `/admin/restaurants/${restaurantId}/dishes`,
            dish,
            adminToken
          );

          if (createDishResult.success) {
            const dishId = createDishResult.data.data?.dish?.id;
            dishIds.push(dishId);
            success(`    ✓ ${dish.name} - ${dish.price} FCFA (${dish.category})`);
          } else {
            error(`    ✗ Erreur pour ${dish.name}: ${JSON.stringify(createDishResult.error)}`);
          }
        }
      }
    } else {
      error(`Erreur création restaurant: ${JSON.stringify(createRestaurantResult.error)}`);
    }
  }

  log(`\n✅ ${restaurantIds.length} restaurant(s) de Korhogo créé(s) avec ${dishIds.length} plat(s) au total`, 'magenta');

  // ============================================
  // 4. UTILISATEURS
  // ============================================
  if (userToken) {
    section('4. Gestion des utilisateurs');

    // 4.1 Profil
    info('Récupération du profil...');
    const profileResult = await request('GET', '/users/me', null, userToken);
    if (profileResult.success) {
      success('Profil récupéré');
      const user = profileResult.data.data?.user;
      if (user) {
        info(`Nom: ${user.first_name} ${user.last_name}`);
        info(`Téléphone: ${user.phone}`);
        info(`Points de fidélité: ${user.loyalty_points || 0}`);
      }
    } else {
      error(`Erreur: ${JSON.stringify(profileResult.error)}`);
    }

    // 4.2 Ajouter adresse à Korhogo
    info('Ajout d\'une adresse à Korhogo...');
    const addressResult = await request(
      'POST',
      '/users/me/addresses',
      {
        title: 'Maison',
        address_line: 'Quartier Tchenguele, près de l\'école primaire',
        district: 'Tchenguele',
        landmark: 'Près de l\'école primaire publique',
        latitude: 9.4581,
        longitude: -5.6296,
        is_default: true,
      },
      userToken
    );

    if (addressResult.success) {
      addressId = addressResult.data.data?.address?.id;
      success('Adresse ajoutée à Korhogo');
      info(`ID adresse: ${addressId}`);
    } else {
      error(`Erreur: ${JSON.stringify(addressResult.error)}`);
    }
  }

  // ============================================
  // 5. LISTE DES RESTAURANTS DE KORHOGO
  // ============================================
  section('5. Liste des restaurants disponibles à Korhogo');

  info('Récupération des restaurants...');
  const restaurantsResult = await request('GET', '/restaurants?lat=9.4581&lng=-5.6296&radius=10');
  
  if (restaurantsResult.success) {
    const restaurants = restaurantsResult.data.data?.restaurants || [];
    success(`${restaurants.length} restaurant(s) trouvé(s) à Korhogo`);
    
    restaurants.forEach((resto, index) => {
      info(`\n${index + 1}. ${resto.name}`);
      info(`   Type: ${resto.cuisine_type}`);
      info(`   Quartier: ${resto.district}`);
      info(`   Note: ⭐ ${resto.rating}/5`);
      info(`   Livraison: ${resto.delivery_fee} FCFA`);
      info(`   Min. commande: ${resto.minimum_order} FCFA`);
    });
  } else {
    error(`Erreur: ${JSON.stringify(restaurantsResult.error)}`);
  }

  // ============================================
  // 6. DÉTAILS D'UN RESTAURANT AVEC MENU
  // ============================================
  if (restaurantIds.length > 0) {
    section('6. Détails d\'un restaurant avec menu complet');

    const firstRestaurantId = restaurantIds[0];
    info(`Récupération des détails du restaurant ID: ${firstRestaurantId}...`);
    
    const restaurantDetailResult = await request(
      'GET',
      `/restaurants/${firstRestaurantId}`
    );

    if (restaurantDetailResult.success) {
      const resto = restaurantDetailResult.data.data?.restaurant;
      success('Détails récupérés');
      info(`\n🏪 ${resto.name}`);
      info(`📝 ${resto.description}`);
      info(`📍 ${resto.address}`);
      info(`⭐ Note: ${resto.rating}/5`);
      
      // Récupérer les plats
      const dishesResult = await request(
        'GET',
        `/restaurants/${firstRestaurantId}/dishes`
      );

      if (dishesResult.success) {
        const dishes = dishesResult.data.data?.dishes || [];
        success(`\n📋 Menu (${dishes.length} plat(s)):`);
        
        // Regrouper par catégorie
        const categorized = {};
        dishes.forEach(dish => {
          if (!categorized[dish.category]) {
            categorized[dish.category] = [];
          }
          categorized[dish.category].push(dish);
        });

        Object.entries(categorized).forEach(([category, items]) => {
          log(`\n  📂 ${category}:`, 'yellow');
          items.forEach(dish => {
            info(`    • ${dish.name} - ${dish.price} FCFA`);
            info(`      ${dish.description}`);
          });
        });
      }
    } else {
      error(`Erreur: ${JSON.stringify(restaurantDetailResult.error)}`);
    }
  }

  // ============================================
  // 7. ADMIN DASHBOARD
  // ============================================
  if (adminToken) {
    section('7. Dashboard administrateur');

    info('Récupération du dashboard...');
    const dashboardResult = await request('GET', '/admin/dashboard', null, adminToken);
    
    if (dashboardResult.success) {
      success('Dashboard récupéré');
      const kpis = dashboardResult.data.data?.kpis;
      if (kpis) {
        info(`\n📊 Statistiques Korhogo:`);
        info(`  💰 Revenus totaux: ${kpis.total_revenue || 0} FCFA`);
        info(`  📦 Commandes: ${kpis.total_orders || 0}`);
        info(`  👥 Utilisateurs: ${kpis.total_users || 0}`);
        info(`  🏪 Restaurants: ${kpis.total_restaurants || 0}`);
      }
    } else {
      error(`Erreur: ${JSON.stringify(dashboardResult.error)}`);
    }
  }

  // ============================================
  // RÉSUMÉ
  // ============================================
  section('📊 RÉSUMÉ DES TESTS - KORHOGO');

  const results = {
    'Serveur': '✓',
    'Authentification Admin': adminToken ? '✓' : '✗',
    'Authentification OTP': userToken ? '✓' : '✗',
    'Profil Utilisateur': userToken ? '✓' : '✗',
    'Adresses Korhogo': addressId ? '✓' : '✗',
    'Restaurants Korhogo créés': restaurantIds.length > 0 ? `✓ (${restaurantIds.length})` : '✗',
    'Plats locaux créés': dishIds.length > 0 ? `✓ (${dishIds.length})` : '✗',
  };

  Object.entries(results).forEach(([test, result]) => {
    if (result.includes('✓')) {
      success(`${test}: ${result}`);
    } else {
      error(`${test}: ${result}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  log(`✅ Tests terminés ! ${restaurantIds.length} restaurants de Korhogo avec ${dishIds.length} plats créés`, 'green');
  console.log('='.repeat(60) + '\n');

  // Afficher un résumé des données créées
  section('📝 DONNÉES DE TEST CRÉÉES POUR KORHOGO');
  
  info('🏪 Restaurants de Korhogo:');
  SAMPLE_RESTAURANTS.forEach((resto, index) => {
    success(`  ${index + 1}. ${resto.name} - ${resto.district} (${resto.cuisine_type})`);
  });

  info('\n🍽️  Total de plats par restaurant:');
  Object.entries(SAMPLE_DISHES).forEach(([name, dishes]) => {
    success(`  ${name}: ${dishes.length} plat(s)`);
  });

  log('\n💡 Conseil: Utilisez ces données pour tester BAIBEBALO à Korhogo !', 'cyan');
  log('🎯 Spécialités: Tô, Riz gras, Poulet bicyclette, Tchapalo, Bissap...', 'cyan');
}

// Exécution principale
async function main() {
  try {
    // Vérifier si le serveur est déjà démarré
    try {
      await axios.get('http://localhost:5000/health', { timeout: 2000 });
      log('✅ Serveur déjà démarré', 'green');
      await runTests();
    } catch (err) {
      // Serveur pas démarré, le démarrer
      await startServer();
      await waitForServer();
      await runTests();
    }
  } catch (err) {
    error(`Erreur: ${err.message}`);
  } finally {
    stopServer();
    process.exit(0);
  }
}

main();
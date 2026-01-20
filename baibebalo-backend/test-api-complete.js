/**
 * Script de test complet pour l'API BAIBEBALO
 * Démarre le serveur et teste toutes les routes
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

    // Timeout après 30 secondes
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

// Tests
async function runTests() {
  section('🧪 TESTS DE L\'API BAIBEBALO');

  // Variables pour stocker les tokens et IDs
  let userToken = null;
  let adminToken = null;
  let restaurantId = null;
  let addressId = null;

  // ============================================
  // 1. TEST DE SANTÉ
  // ============================================
  section('1. Test de santé du serveur');
  // Utiliser /health directement
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

  // 2.1 Envoyer OTP
  info('Envoi d\'un code OTP...');
  const otpResult = await request('POST', '/auth/send-otp', {
    phone: '+2250701234567',
  });

  if (otpResult.success) {
    success('Code OTP envoyé');
    info('Le code OTP a été généré (vérifiez la table otp_codes en base de données)');
  } else {
    error(`Erreur: ${JSON.stringify(otpResult.error)}`);
  }

  // 2.2 Récupérer le code OTP de la base de données (simulation)
  info('Récupération du code OTP depuis la base de données...');
  const { query } = require('./src/database/db');
  let otpCode = null;
  try {
    const otpResult = await query(
      "SELECT code FROM otp_codes WHERE phone = '+2250701234567' AND is_used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1"
    );
    if (otpResult.rows.length > 0) {
      otpCode = otpResult.rows[0].code;
      success(`Code OTP trouvé: ${otpCode}`);
    } else {
      info('Aucun code OTP valide trouvé. Utilisation d\'un code par défaut pour le test.');
      otpCode = '123456'; // Code par défaut
    }
  } catch (err) {
    info('Impossible de récupérer le code OTP. Utilisation d\'un code par défaut.');
    otpCode = '123456';
  }

  // 2.3 Vérifier OTP et créer compte
  info('Vérification OTP et création de compte...');
  const verifyResult = await request('POST', '/auth/verify-otp', {
    phone: '+2250701234567',
    code: otpCode,
    first_name: 'Jean',
    last_name: 'Kouassi',
  });

  if (verifyResult.success && verifyResult.data.data?.accessToken) {
    userToken = verifyResult.data.data.accessToken;
    success('Compte utilisateur créé et connecté');
    info(`Token utilisateur: ${userToken.substring(0, 30)}...`);
  } else {
    error(`Erreur: ${JSON.stringify(verifyResult.error)}`);
    info('Note: Si le code OTP est incorrect, vérifiez la table otp_codes');
  }

  // 2.4 Connexion Admin
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
  }

  // ============================================
  // 3. UTILISATEURS
  // ============================================
  if (userToken) {
    section('3. Gestion des utilisateurs');

    // 3.1 Profil
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

    // 3.2 Ajouter adresse
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
      success('Adresse ajoutée');
      info(`ID adresse: ${addressId}`);
    } else {
      error(`Erreur: ${JSON.stringify(addressResult.error)}`);
    }
  }

  // ============================================
  // 4. RESTAURANTS
  // ============================================
  section('4. Restaurants');

  info('Liste des restaurants...');
  const restaurantsResult = await request('GET', '/restaurants?lat=9.4581&lng=-5.6296&radius=10');
  if (restaurantsResult.success) {
    const restaurants = restaurantsResult.data.data?.restaurants || [];
    success(`${restaurants.length} restaurant(s) trouvé(s)`);
    if (restaurants.length > 0) {
      restaurantId = restaurants[0].id;
      info(`Premier restaurant: ${restaurants[0].name}`);
    }
  } else {
    error(`Erreur: ${JSON.stringify(restaurantsResult.error)}`);
  }

  // ============================================
  // 5. ADMIN
  // ============================================
  if (adminToken) {
    section('5. Administration');

    info('Dashboard admin...');
    const dashboardResult = await request('GET', '/admin/dashboard', null, adminToken);
    if (dashboardResult.success) {
      success('Dashboard récupéré');
      const kpis = dashboardResult.data.data?.kpis;
      if (kpis) {
        info(`Revenus: ${kpis.total_revenue || 0} FCFA`);
        info(`Commandes: ${kpis.total_orders || 0}`);
        info(`Utilisateurs: ${kpis.total_users || 0}`);
      }
    } else {
      error(`Erreur: ${JSON.stringify(dashboardResult.error)}`);
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
  };

  Object.entries(results).forEach(([test, result]) => {
    if (result === '✓') {
      success(`${test}: ${result}`);
    } else {
      error(`${test}: ${result}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  log('✅ Tests terminés !', 'green');
  console.log('='.repeat(60) + '\n');
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

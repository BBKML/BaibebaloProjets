/**
 * Script de test simple - À exécuter APRÈS avoir démarré le serveur
 * Usage: node test-api-simple.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

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

async function request(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (data) config.data = data;
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

async function runTests() {
  section('🧪 TESTS DE L\'API BAIBEBALO');

  // Vérifier que le serveur est démarré
  try {
    const health = await axios.get('http://localhost:5000/health');
    success('Serveur en ligne');
    info(`Environnement: ${health.data.data?.environment || 'development'}`);
  } catch (err) {
    error('Le serveur n\'est pas démarré !');
    info('Démarrez le serveur avec: npm run dev');
    process.exit(1);
  }

  let userToken = null;
  let adminToken = null;
  let restaurantId = null;
  let addressId = null;

  // 1. Authentification
  section('1. Authentification');

  info('Envoi OTP...');
  const otpResult = await request('POST', '/auth/send-otp', {
    phone: '+2250701234567',
  });
  if (otpResult.success) {
    success('OTP envoyé');
  } else {
    error(`Erreur: ${JSON.stringify(otpResult.error)}`);
  }

  // Récupérer le code OTP
  info('Récupération du code OTP...');
  const { query } = require('./src/database/db');
  let otpCode = '123456';
  try {
    const otpDb = await query(
      "SELECT code FROM otp_codes WHERE phone = '+2250701234567' AND is_used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1"
    );
    if (otpDb.rows.length > 0) {
      otpCode = otpDb.rows[0].code;
      success(`Code OTP trouvé: ${otpCode}`);
    }
  } catch (err) {
    info('Utilisation du code par défaut: 123456');
  }

  info('Vérification OTP...');
  const verifyResult = await request('POST', '/auth/verify-otp', {
    phone: '+2250701234567',
    code: otpCode,
    first_name: 'Jean',
    last_name: 'Kouassi',
  });
  if (verifyResult.success && verifyResult.data.data?.accessToken) {
    userToken = verifyResult.data.data.accessToken;
    success('Utilisateur créé et connecté');
  } else {
    error(`Erreur: ${JSON.stringify(verifyResult.error)}`);
  }

  info('Connexion admin...');
  const adminResult = await request('POST', '/auth/admin/login', {
    email: 'admin@baibebalo.ci',
    password: 'Admin@2025!',
  });
  if (adminResult.success && adminResult.data.data?.accessToken) {
    adminToken = adminResult.data.data.accessToken;
    success('Admin connecté');
  } else {
    error(`Erreur: ${JSON.stringify(adminResult.error)}`);
  }

  // 2. Utilisateurs
  if (userToken) {
    section('2. Utilisateurs');

    info('Profil...');
    const profile = await request('GET', '/users/me', null, userToken);
    if (profile.success) {
      success('Profil récupéré');
      const user = profile.data.data?.user;
      if (user) {
        info(`  Nom: ${user.first_name} ${user.last_name}`);
        info(`  Téléphone: ${user.phone}`);
      }
    }

    info('Ajout adresse...');
    const address = await request(
      'POST',
      '/users/me/addresses',
      {
        title: 'Maison',
        address_line: 'Quartier Tchengué',
        district: 'Tchengué',
        latitude: 9.4581,
        longitude: -5.6296,
        is_default: true,
      },
      userToken
    );
    if (address.success) {
      addressId = address.data.data?.address?.id;
      success('Adresse ajoutée');
    }
  }

  // 3. Restaurants
  section('3. Restaurants');

  info('Liste restaurants...');
  const restaurants = await request('GET', '/restaurants?lat=9.4581&lng=-5.6296');
  if (restaurants.success) {
    const list = restaurants.data.data?.restaurants || [];
    success(`${list.length} restaurant(s) trouvé(s)`);
    if (list.length > 0) {
      restaurantId = list[0].id;
      info(`  Premier: ${list[0].name}`);
    }
  }

  // 4. Admin
  if (adminToken) {
    section('4. Administration');

    info('Dashboard...');
    const dashboard = await request('GET', '/admin/dashboard', null, adminToken);
    if (dashboard.success) {
      success('Dashboard récupéré');
      const kpis = dashboard.data.data?.kpis;
      if (kpis) {
        info(`  Revenus: ${kpis.total_revenue || 0} FCFA`);
        info(`  Commandes: ${kpis.total_orders || 0}`);
        info(`  Utilisateurs: ${kpis.total_users || 0}`);
      }
    }
  }

  // Résumé
  section('📊 RÉSUMÉ');

  const tests = {
    'Serveur': '✓',
    'OTP': otpResult.success ? '✓' : '✗',
    'Utilisateur': userToken ? '✓' : '✗',
    'Admin': adminToken ? '✓' : '✗',
    'Adresse': addressId ? '✓' : '✗',
    'Restaurants': restaurantId ? '✓' : '✗',
  };

  Object.entries(tests).forEach(([name, result]) => {
    if (result === '✓') {
      success(`${name}: ${result}`);
    } else {
      error(`${name}: ${result}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  log('✅ Tests terminés !', 'green');
  console.log('='.repeat(60) + '\n');
}

runTests().catch((err) => {
  error(`Erreur: ${err.message}`);
  process.exit(1);
});

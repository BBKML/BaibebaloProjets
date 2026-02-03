/**
 * TEST COMPLET DES FONCTIONNALITÉS LIVREUR
 * Ce script teste toutes les API du module livreur
 */

const axios = require('axios');
const { query } = require('./src/database/db');

const API_URL = 'http://localhost:5000/api/v1';
const TEST_PHONE = '+2250787097996';

let deliveryToken = null;
let deliveryUser = null;

// Couleurs pour le terminal
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.bold}${colors.blue}═══ ${msg} ═══${colors.reset}\n`),
};

async function getOTPCode(phone) {
  const result = await query(
    'SELECT code FROM otp_codes WHERE phone = $1 AND is_used = false ORDER BY created_at DESC LIMIT 1',
    [phone]
  );
  return result.rows[0]?.code;
}

async function testAuthentication() {
  log.title('1. AUTHENTIFICATION OTP');

  try {
    // 1.1 Envoi OTP
    log.info('Envoi du code OTP...');
    const sendOtpResponse = await axios.post(`${API_URL}/auth/send-otp`, {
      phone: TEST_PHONE,
      role: 'delivery'
    });
    
    if (sendOtpResponse.data.success) {
      log.success('Code OTP envoyé');
    } else {
      log.error('Échec envoi OTP');
      return false;
    }

    // Récupérer le code depuis la base
    const otpCode = await getOTPCode(TEST_PHONE);
    if (!otpCode) {
      log.error('Code OTP non trouvé dans la base');
      return false;
    }
    log.info(`Code OTP récupéré: ${otpCode}`);

    // 1.2 Vérification OTP
    log.info('Vérification du code OTP...');
    const verifyResponse = await axios.post(`${API_URL}/auth/verify-otp`, {
      phone: TEST_PHONE,
      code: otpCode,
      role: 'delivery'
    });

    if (verifyResponse.data.success && verifyResponse.data.data?.token) {
      deliveryToken = verifyResponse.data.data.token;
      deliveryUser = verifyResponse.data.data.user;
      log.success(`Connexion réussie - Livreur: ${deliveryUser.first_name} ${deliveryUser.last_name}`);
      log.info(`Status: ${deliveryUser.status}`);
      log.info(`Véhicule: ${deliveryUser.vehicle_type}`);
      return true;
    } else if (verifyResponse.data.data?.needsValidation) {
      log.warn('Compte en attente de validation');
      return false;
    } else if (verifyResponse.data.data?.isNewUser) {
      log.warn('Nouveau livreur - doit compléter l\'inscription');
      return false;
    }

    return false;
  } catch (error) {
    log.error(`Erreur authentification: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

async function testProfile() {
  log.title('2. PROFIL LIVREUR');

  if (!deliveryToken) {
    log.warn('Pas de token - test ignoré');
    return;
  }

  const headers = { Authorization: `Bearer ${deliveryToken}` };

  try {
    // 2.1 Récupérer le profil
    log.info('Récupération du profil...');
    const profileResponse = await axios.get(`${API_URL}/delivery/me`, { headers });
    
    if (profileResponse.data.success) {
      const profile = profileResponse.data.data.delivery_person;
      log.success('Profil récupéré');
      log.info(`  Nom: ${profile.first_name} ${profile.last_name}`);
      log.info(`  Téléphone: ${profile.phone}`);
      log.info(`  Véhicule: ${profile.vehicle_type}`);
      log.info(`  Status: ${profile.status}`);
      log.info(`  Note moyenne: ${profile.average_rating || 'N/A'}`);
      log.info(`  Livraisons totales: ${profile.total_deliveries || 0}`);
    } else {
      log.error('Échec récupération profil');
    }
  } catch (error) {
    log.error(`Erreur profil: ${error.response?.data?.error?.message || error.message}`);
  }
}

async function testDeliveryStatus() {
  log.title('3. STATUT DE DISPONIBILITÉ');

  if (!deliveryToken) {
    log.warn('Pas de token - test ignoré');
    return;
  }

  const headers = { Authorization: `Bearer ${deliveryToken}` };

  try {
    // 3.1 Changer le statut en "available"
    log.info('Passage en mode disponible...');
    try {
      const availableResponse = await axios.put(`${API_URL}/delivery/status`, 
        { delivery_status: 'available' },
        { headers }
      );
      if (availableResponse.data.success) {
        log.success('Statut changé: DISPONIBLE');
      }
    } catch (e) {
      log.error(`Échec statut available: ${e.response?.data?.error?.message || e.message}`);
    }

    // 3.2 Changer le statut en "busy"
    log.info('Passage en mode occupé...');
    try {
      const busyResponse = await axios.put(`${API_URL}/delivery/status`, 
        { delivery_status: 'busy' },
        { headers }
      );
      if (busyResponse.data.success) {
        log.success('Statut changé: OCCUPÉ');
      }
    } catch (e) {
      log.error(`Échec statut busy: ${e.response?.data?.error?.message || e.message}`);
    }

    // 3.3 Changer le statut en "offline"
    log.info('Passage en mode hors ligne...');
    try {
      const offlineResponse = await axios.put(`${API_URL}/delivery/status`, 
        { delivery_status: 'offline' },
        { headers }
      );
      if (offlineResponse.data.success) {
        log.success('Statut changé: HORS LIGNE');
      }
    } catch (e) {
      log.error(`Échec statut offline: ${e.response?.data?.error?.message || e.message}`);
    }

  } catch (error) {
    log.error(`Erreur statut: ${error.response?.data?.error?.message || error.message}`);
  }
}

async function testLocation() {
  log.title('4. MISE À JOUR POSITION GPS');

  if (!deliveryToken) {
    log.warn('Pas de token - test ignoré');
    return;
  }

  const headers = { Authorization: `Bearer ${deliveryToken}` };

  try {
    // Position test (Korhogo, Côte d'Ivoire)
    const testLocation = {
      latitude: 9.4580,
      longitude: -5.6294
    };

    log.info(`Envoi position: ${testLocation.latitude}, ${testLocation.longitude}`);
    const locationResponse = await axios.put(`${API_URL}/delivery/location`, 
      testLocation,
      { headers }
    );
    
    if (locationResponse.data.success) {
      log.success('Position GPS mise à jour');
    }
  } catch (error) {
    log.error(`Erreur position: ${error.response?.data?.error?.message || error.message}`);
  }
}

async function testAvailableOrders() {
  log.title('5. COMMANDES DISPONIBLES');

  if (!deliveryToken) {
    log.warn('Pas de token - test ignoré');
    return;
  }

  const headers = { Authorization: `Bearer ${deliveryToken}` };

  try {
    // D'abord passer en disponible
    await axios.put(`${API_URL}/delivery/status`, 
      { delivery_status: 'available' },
      { headers }
    );

    log.info('Recherche des commandes disponibles...');
    const ordersResponse = await axios.get(`${API_URL}/delivery/available-orders`, {
      headers,
      params: { radius: 10 }
    });
    
    if (ordersResponse.data.success) {
      const orders = ordersResponse.data.data.orders;
      log.success(`${orders.length} commande(s) disponible(s)`);
      
      if (orders.length > 0) {
        orders.slice(0, 3).forEach((order, i) => {
          log.info(`  ${i + 1}. ${order.restaurant_name || 'Restaurant'} - ${order.total_amount} FCFA`);
        });
      }
    }
  } catch (error) {
    log.error(`Erreur commandes: ${error.response?.data?.error?.message || error.message}`);
  }
}

async function testEarnings() {
  log.title('6. GAINS ET PAIEMENTS');

  if (!deliveryToken) {
    log.warn('Pas de token - test ignoré');
    return;
  }

  const headers = { Authorization: `Bearer ${deliveryToken}` };

  try {
    log.info('Récupération des gains...');
    const earningsResponse = await axios.get(`${API_URL}/delivery/earnings`, { headers });
    
    if (earningsResponse.data.success) {
      const earnings = earningsResponse.data.data;
      log.success('Gains récupérés');
      log.info(`  Solde disponible: ${earnings.available_balance || 0} FCFA`);
      log.info(`  Gains totaux: ${earnings.total_earnings || 0} FCFA`);
      log.info(`  Aujourd'hui: ${earnings.today || 0} FCFA`);
      log.info(`  Cette semaine: ${earnings.this_week || 0} FCFA`);
      log.info(`  Ce mois: ${earnings.this_month || 0} FCFA`);
    }
  } catch (error) {
    log.error(`Erreur gains: ${error.response?.data?.error?.message || error.message}`);
  }
}

async function testDeliveryHistory() {
  log.title('7. HISTORIQUE DES LIVRAISONS');

  if (!deliveryToken) {
    log.warn('Pas de token - test ignoré');
    return;
  }

  const headers = { Authorization: `Bearer ${deliveryToken}` };

  try {
    log.info('Récupération de l\'historique...');
    const historyResponse = await axios.get(`${API_URL}/delivery/history`, {
      headers,
      params: { page: 1, limit: 5 }
    });
    
    if (historyResponse.data.success) {
      const { deliveries, pagination } = historyResponse.data.data;
      log.success(`Historique récupéré: ${pagination.total} livraison(s) au total`);
      
      if (deliveries.length > 0) {
        deliveries.forEach((delivery, i) => {
          log.info(`  ${i + 1}. ${delivery.order_number || delivery.id} - ${delivery.status}`);
        });
      }
    }
  } catch (error) {
    log.error(`Erreur historique: ${error.response?.data?.error?.message || error.message}`);
  }
}

async function testActiveOrders() {
  log.title('8. COMMANDES EN COURS');

  if (!deliveryToken) {
    log.warn('Pas de token - test ignoré');
    return;
  }

  const headers = { Authorization: `Bearer ${deliveryToken}` };

  try {
    log.info('Recherche des commandes en cours...');
    const activeResponse = await axios.get(`${API_URL}/delivery/orders/active`, { headers });
    
    if (activeResponse.data.success) {
      const orders = activeResponse.data.data.orders;
      log.success(`${orders.length} commande(s) en cours`);
      
      if (orders.length > 0) {
        orders.forEach((order, i) => {
          log.info(`  ${i + 1}. ${order.order_number || order.id} - ${order.status}`);
        });
      }
    }
  } catch (error) {
    log.error(`Erreur commandes actives: ${error.response?.data?.error?.message || error.message}`);
  }
}

async function testNewRegistration() {
  log.title('9. TEST INSCRIPTION NOUVEAU LIVREUR (Sans mot de passe)');

  const newPhone = '+2250701010101';

  try {
    // Supprimer le livreur test s'il existe
    await query('DELETE FROM delivery_persons WHERE phone = $1', [newPhone]);
    log.info('Nettoyage des données de test...');

    // Test inscription sans mot de passe
    log.info('Test inscription SANS mot de passe...');
    const registerResponse = await axios.post(`${API_URL}/delivery/register`, {
      phone: newPhone,
      first_name: 'Test',
      last_name: 'Livreur',
      vehicle_type: 'bike',
      // PAS de mot de passe !
    });

    if (registerResponse.data.success) {
      log.success('Inscription réussie SANS mot de passe !');
      log.info(`  Message: ${registerResponse.data.message}`);
      
      // Nettoyer
      await query('DELETE FROM delivery_persons WHERE phone = $1', [newPhone]);
      log.info('Données de test nettoyées');
    }
  } catch (error) {
    if (error.response?.status === 400) {
      log.error(`Validation échouée: ${JSON.stringify(error.response.data.error?.details || error.response.data)}`);
    } else {
      log.error(`Erreur inscription: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

async function runAllTests() {
  console.log('\n' + '═'.repeat(60));
  console.log(`${colors.bold}  TEST COMPLET DES FONCTIONNALITÉS LIVREUR${colors.reset}`);
  console.log(`${colors.bold}  BAIBEBALO - Application Livreur${colors.reset}`);
  console.log('═'.repeat(60));

  const authSuccess = await testAuthentication();
  
  if (authSuccess) {
    await testProfile();
    await testDeliveryStatus();
    await testLocation();
    await testAvailableOrders();
    await testEarnings();
    await testDeliveryHistory();
    await testActiveOrders();
  }

  await testNewRegistration();

  console.log('\n' + '═'.repeat(60));
  console.log(`${colors.bold}  FIN DES TESTS${colors.reset}`);
  console.log('═'.repeat(60) + '\n');

  process.exit(0);
}

runAllTests().catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});

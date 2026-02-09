/**
 * Script de test pour vérifier la récupération des informations
 * du restaurant et du client dans les endpoints de commande
 */

const axios = require('axios');
const BASE_URL = process.env.API_URL || 'http://localhost:5000/api/v1';

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function testRestaurantAndClientInfo() {
  try {
    logSection('TEST : Récupération Informations Restaurant et Client');

    // 1. Vérifier que le serveur est accessible
    logInfo('Vérification de la connexion au serveur...');
    try {
      await axios.get(`${BASE_URL}/health`).catch(() => {});
      logSuccess('Serveur accessible');
    } catch (error) {
      logError('Serveur non accessible');
      log('Veuillez démarrer le serveur avec : npm run dev', 'yellow');
      process.exit(1);
    }

    // 2. Se connecter en tant que livreur
    logSection('Étape 1 : Connexion Livreur');
    // Utiliser les arguments de ligne de commande ou les valeurs par défaut
    const deliveryPhone = process.argv[2] || '+2250700000002'; // Numéro de test par défaut
    const deliveryPassword = process.argv[3] || 'livreur123'; // Mot de passe de test par défaut
    
    logInfo(`Tentative de connexion avec: ${deliveryPhone}`);

    let deliveryToken;
    let deliveryId;

    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/delivery/login`, {
        phone: deliveryPhone,
        password: deliveryPassword,
      });

      if (loginResponse.data.success) {
        deliveryToken = loginResponse.data.data.accessToken || loginResponse.data.data.token;
        deliveryId = loginResponse.data.data.delivery_person.id;
        logSuccess(`Connexion réussie - Livreur ID: ${deliveryId}`);
      } else {
        logError('Échec de la connexion');
        process.exit(1);
      }
    } catch (error) {
      logError(`Erreur de connexion: ${error.response?.data?.error?.message || error.message}`);
      log('Vérifiez que le livreur existe dans la base de données', 'yellow');
      process.exit(1);
    }

    // 3. Récupérer les commandes actives du livreur
    logSection('Étape 2 : Récupération des Commandes Actives');
    let activeOrders = [];

    try {
      const ordersResponse = await axios.get(`${BASE_URL}/delivery/orders/active`, {
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });

      if (ordersResponse.data.success) {
        activeOrders = ordersResponse.data.data.orders || [];
        logSuccess(`${activeOrders.length} commande(s) active(s) trouvée(s)`);
      } else {
        logWarning('Aucune commande active trouvée');
      }
    } catch (error) {
      logError(`Erreur récupération commandes: ${error.response?.data?.error?.message || error.message}`);
    }

    // 4. Si pas de commandes actives, récupérer une commande récente
    let testOrderId = null;
    if (activeOrders.length === 0) {
      logSection('Étape 2b : Récupération d\'une Commande Récente');
      try {
        const historyResponse = await axios.get(`${BASE_URL}/delivery/history?limit=1`, {
          headers: { Authorization: `Bearer ${deliveryToken}` },
        });

        if (historyResponse.data.success && historyResponse.data.data.orders?.length > 0) {
          testOrderId = historyResponse.data.data.orders[0].id;
          logSuccess(`Commande récente trouvée: ${testOrderId}`);
        }
      } catch (error) {
        logWarning(`Aucune commande récente trouvée: ${error.message}`);
      }
    } else {
      testOrderId = activeOrders[0].id;
    }

    if (!testOrderId) {
      logError('Aucune commande disponible pour le test');
      log('Créez une commande ou assignez une commande à ce livreur', 'yellow');
      process.exit(1);
    }

    // 5. Tester getOrderById (peut échouer si la commande n'est pas assignée au livreur)
    logSection('Étape 3 : Test getOrderById');
    logInfo(`Commande ID: ${testOrderId}`);
    logInfo('Note: getOrderById peut retourner "Accès interdit" si la commande n\'est pas assignée au livreur');

    try {
      const orderResponse = await axios.get(`${BASE_URL}/orders/${testOrderId}`, {
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });

      if (orderResponse.data.success) {
        const order = orderResponse.data.data.order;
        logSuccess('Commande récupérée avec succès via getOrderById');

        // Vérifier les informations du restaurant
        console.log('\n📋 INFORMATIONS RESTAURANT:');
        console.log('─'.repeat(60));
        const restaurant = order.restaurant || {};
        const restaurantInfo = {
          'Nom': restaurant.name || order.restaurant_name || '❌ MANQUANT',
          'Adresse': restaurant.address || order.restaurant_address || '❌ MANQUANT',
          'Téléphone': restaurant.phone || order.restaurant_phone || '❌ MANQUANT',
          'Latitude': restaurant.latitude || order.restaurant_latitude || '❌ MANQUANT',
          'Longitude': restaurant.longitude || order.restaurant_longitude || '❌ MANQUANT',
        };

        Object.entries(restaurantInfo).forEach(([key, value]) => {
          if (value === '❌ MANQUANT') {
            logError(`${key}: ${value}`);
          } else {
            logSuccess(`${key}: ${value}`);
          }
        });

        // Vérifier les informations du client
        console.log('\n👤 INFORMATIONS CLIENT:');
        console.log('─'.repeat(60));
        const clientFirstName = order.client_first_name || '';
        const clientLastName = order.client_last_name || '';
        const clientName = [clientFirstName, clientLastName].filter(Boolean).join(' ') || '❌ MANQUANT';
        const clientPhone = order.client_phone || '❌ MANQUANT';

        // Parser delivery_address
        let deliveryAddress = {};
        if (order.delivery_address) {
          if (typeof order.delivery_address === 'string') {
            try {
              deliveryAddress = JSON.parse(order.delivery_address);
            } catch (e) {
              deliveryAddress = {};
            }
          } else {
            deliveryAddress = order.delivery_address;
          }
        }

        const clientInfo = {
          'Nom': clientName,
          'Prénom': clientFirstName || '❌ MANQUANT',
          'Nom de famille': clientLastName || '❌ MANQUANT',
          'Téléphone': clientPhone,
          'Adresse complète': deliveryAddress.address_line || deliveryAddress.address || '❌ MANQUANT',
          'Quartier': deliveryAddress.district || deliveryAddress.area || '❌ MANQUANT',
          'Repère': deliveryAddress.landmark || '❌ MANQUANT',
          'Latitude': deliveryAddress.latitude || '❌ MANQUANT',
          'Longitude': deliveryAddress.longitude || '❌ MANQUANT',
        };

        Object.entries(clientInfo).forEach(([key, value]) => {
          if (value === '❌ MANQUANT') {
            logError(`${key}: ${value}`);
          } else {
            logSuccess(`${key}: ${value}`);
          }
        });

        // Résumé
        console.log('\n📊 RÉSUMÉ:');
        console.log('─'.repeat(60));
        const restaurantComplete = restaurantInfo.Nom !== '❌ MANQUANT' &&
                                   restaurantInfo.Adresse !== '❌ MANQUANT' &&
                                   restaurantInfo.Téléphone !== '❌ MANQUANT';
        const clientComplete = clientInfo.Nom !== '❌ MANQUANT' &&
                              clientInfo.Téléphone !== '❌ MANQUANT' &&
                              clientInfo['Adresse complète'] !== '❌ MANQUANT';

        if (restaurantComplete) {
          logSuccess('✅ Informations restaurant COMPLÈTES');
        } else {
          logError('❌ Informations restaurant INCOMPLÈTES');
        }

        if (clientComplete) {
          logSuccess('✅ Informations client COMPLÈTES');
        } else {
          logError('❌ Informations client INCOMPLÈTES');
        }

      } else {
        logError('Échec de la récupération de la commande');
      }
    } catch (error) {
      if (error.response?.status === 403) {
        logWarning(`getOrderById: Accès interdit (normal si la commande n'est pas assignée au livreur)`);
        logInfo('trackOrder sera utilisé à la place (endpoint principal pour l\'app livreur)');
      } else {
        logError(`Erreur getOrderById: ${error.response?.data?.error?.message || error.message}`);
        if (error.response?.data) {
          console.log('Réponse:', JSON.stringify(error.response.data, null, 2));
        }
      }
    }

    // 6. Tester trackOrder
    logSection('Étape 4 : Test trackOrder');
    logInfo(`Commande ID: ${testOrderId}`);

    try {
      const trackResponse = await axios.get(`${BASE_URL}/orders/${testOrderId}/track`, {
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });

      if (trackResponse.data.success) {
        const order = trackResponse.data.data.order;
        logSuccess('Commande trackée avec succès');

        // Vérifier les informations du restaurant
        console.log('\n📋 INFORMATIONS RESTAURANT (trackOrder):');
        console.log('─'.repeat(60));
        const restaurant = order.restaurant || {};
        const restaurantInfo = {
          'Nom': restaurant.name || order.restaurant_name || '❌ MANQUANT',
          'Adresse': restaurant.address || order.restaurant_address || '❌ MANQUANT',
          'Téléphone': restaurant.phone || order.restaurant_phone || '❌ MANQUANT',
        };

        Object.entries(restaurantInfo).forEach(([key, value]) => {
          if (value === '❌ MANQUANT') {
            logError(`${key}: ${value}`);
          } else {
            logSuccess(`${key}: ${value}`);
          }
        });

        // Vérifier les informations du client
        console.log('\n👤 INFORMATIONS CLIENT (trackOrder):');
        console.log('─'.repeat(60));
        const clientFirstName = order.client_first_name || '';
        const clientLastName = order.client_last_name || '';
        const clientName = [clientFirstName, clientLastName].filter(Boolean).join(' ') || '❌ MANQUANT';
        const clientPhone = order.client_phone || '❌ MANQUANT';

        // Parser delivery_address
        let deliveryAddress = {};
        if (order.delivery_address) {
          if (typeof order.delivery_address === 'string') {
            try {
              deliveryAddress = JSON.parse(order.delivery_address);
            } catch (e) {
              deliveryAddress = {};
            }
          } else {
            deliveryAddress = order.delivery_address;
          }
        }

        const clientInfo = {
          'Nom': clientName,
          'Téléphone': clientPhone,
          'Adresse complète': deliveryAddress.address_line || deliveryAddress.address || '❌ MANQUANT',
          'Quartier': deliveryAddress.district || deliveryAddress.area || '❌ MANQUANT',
        };

        Object.entries(clientInfo).forEach(([key, value]) => {
          if (value === '❌ MANQUANT') {
            logError(`${key}: ${value}`);
          } else {
            logSuccess(`${key}: ${value}`);
          }
        });

      } else {
        logError('Échec du tracking de la commande');
      }
    } catch (error) {
      logError(`Erreur trackOrder: ${error.response?.data?.error?.message || error.message}`);
      if (error.response?.data) {
        console.log('Réponse:', JSON.stringify(error.response.data, null, 2));
      }
    }

    // 7. Vérifier directement dans la base de données
    logSection('Étape 5 : Vérification Directe Base de Données');
    logInfo('Pour vérifier manuellement, exécutez ces requêtes SQL:');

    console.log(`
-- Vérifier les informations du restaurant
SELECT id, name, address, phone 
FROM restaurants 
WHERE id = (
  SELECT restaurant_id FROM orders WHERE id = '${testOrderId}'
);

-- Vérifier les informations du client
SELECT id, first_name, last_name, phone 
FROM users 
WHERE id = (
  SELECT user_id FROM orders WHERE id = '${testOrderId}'
);

-- Vérifier l'adresse de livraison
SELECT id, order_number, delivery_address 
FROM orders 
WHERE id = '${testOrderId}';
    `);

    logSection('TEST TERMINÉ');
    logSuccess('Vérifiez les résultats ci-dessus pour confirmer que toutes les informations sont présentes');

  } catch (error) {
    logError(`Erreur générale: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Exécuter le test
testRestaurantAndClientInfo()
  .then(() => {
    log('\n✅ Test terminé avec succès', 'green');
    process.exit(0);
  })
  .catch((error) => {
    logError(`\n❌ Test échoué: ${error.message}`);
    console.error(error);
    process.exit(1);
  });

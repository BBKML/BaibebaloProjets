/**
 * Test de la route publique /api/v1/public/settings
 * Vérifie que les paramètres sont correctement exposés aux applications mobiles
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const API_VERSION = process.env.API_VERSION || 'v1';
const PUBLIC_SETTINGS_URL = `${API_BASE_URL}/api/${API_VERSION}/public/settings`;

async function testPublicSettings() {
  console.log('🧪 Test de la route publique /api/v1/public/settings\n');
  console.log(`📍 URL: ${PUBLIC_SETTINGS_URL}\n`);

  try {
    // Test 1: Récupérer les paramètres publics
    console.log('1️⃣  Récupération des paramètres publics...');
    const response = await axios.get(PUBLIC_SETTINGS_URL, {
      timeout: 5000,
    });

    if (response.data.success) {
      console.log('✅ Route accessible sans authentification\n');
      
      const settings = response.data.data.settings;
      const timestamp = response.data.data.timestamp;
      
      console.log(`📅 Timestamp: ${timestamp}\n`);
      console.log(`📊 Nombre de paramètres: ${Object.keys(settings).length}\n`);
      
      // Vérifier les paramètres critiques
      const criticalSettings = [
        'payment.enabledMethods',
        'business.minOrderAmount',
        'business.freeDeliveryThreshold',
        'business.freeDeliveryEnabled',
        'business.maxDeliveryDistance',
        'business.deliveryPersonPercentage',
      ];

      console.log('🔍 Vérification des paramètres critiques:\n');
      
      let allValid = true;
      criticalSettings.forEach(key => {
        if (settings[key]) {
          const value = settings[key].value;
          const description = settings[key].description || 'N/A';
          console.log(`  ✅ ${key}: ${JSON.stringify(value)}`);
          console.log(`     Description: ${description}\n`);
        } else {
          console.log(`  ❌ ${key}: MANQUANT\n`);
          allValid = false;
        }
      });

      // Afficher tous les paramètres disponibles
      console.log('\n📋 Tous les paramètres disponibles:\n');
      Object.keys(settings).forEach(key => {
        const value = settings[key].value;
        const description = settings[key].description || 'N/A';
        console.log(`  • ${key}: ${JSON.stringify(value)}`);
        console.log(`    ${description}\n`);
      });

      if (allValid) {
        console.log('\n✅ Tous les paramètres critiques sont présents');
        console.log('✅ La route publique fonctionne correctement');
        console.log('✅ Les applications mobiles peuvent récupérer les paramètres\n');
        return true;
      } else {
        console.log('\n⚠️  Certains paramètres critiques sont manquants');
        console.log('💡 Vérifiez que la synchronisation a bien fonctionné au démarrage\n');
        return false;
      }
    } else {
      console.log('❌ Réponse invalide:', response.data);
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Erreur: Impossible de se connecter au serveur');
      console.log(`   Assurez-vous que le serveur backend est démarré sur ${API_BASE_URL}`);
      console.log('\n💡 Pour démarrer le serveur:');
      console.log('   cd baibebalo-backend');
      console.log('   npm start\n');
    } else if (error.response) {
      console.log('❌ Erreur HTTP:', error.response.status);
      console.log('   Réponse:', error.response.data);
    } else {
      console.log('❌ Erreur:', error.message);
    }
    return false;
  }
}

// Exécuter le test
if (require.main === module) {
  testPublicSettings()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { testPublicSettings };

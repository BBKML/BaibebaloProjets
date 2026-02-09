/**
 * Test de la synchronisation des paramètres depuis config/index.js vers app_settings
 * Vérifie que les valeurs sont correctement synchronisées
 */

// Charger les variables d'environnement
require('dotenv').config();

const { syncSettingsFromConfig } = require('../src/utils/syncSettings');
const config = require('../src/config');
const { query } = require('../src/database/db');

async function testSyncSettings() {
  console.log('🧪 Test de la synchronisation des paramètres\n');

  try {
    // 1. Exécuter la synchronisation
    console.log('1️⃣  Exécution de la synchronisation...\n');
    await syncSettingsFromConfig();

    // 2. Vérifier que les paramètres sont bien dans app_settings
    console.log('\n2️⃣  Vérification des paramètres dans app_settings...\n');

    const criticalSettings = [
      'payment.enabledMethods',
      'business.minOrderAmount',
      'business.freeDeliveryThreshold',
      'business.freeDeliveryEnabled',
      'business.maxDeliveryDistance',
      'business.deliveryPersonPercentage',
      'business.bundleDiscountEnabled',
      'business.bundleDiscountPercent',
    ];

    let allValid = true;

    for (const key of criticalSettings) {
      const result = await query(
        'SELECT key, value, description, is_public FROM app_settings WHERE key = $1',
        [key]
      );

      if (result.rows.length > 0) {
        const setting = result.rows[0];
        const dbValue = setting.value;
        
        // Récupérer la valeur depuis config pour comparaison
        const configPath = key.split('.');
        let configValue = config;
        for (const part of configPath) {
          configValue = configValue?.[part];
          if (configValue === undefined) break;
        }

        // Comparer les valeurs
        const dbValueStr = JSON.stringify(dbValue);
        const configValueStr = JSON.stringify(configValue);

        if (dbValueStr === configValueStr) {
          console.log(`  ✅ ${key}`);
          console.log(`     Valeur: ${dbValueStr}`);
          console.log(`     Public: ${setting.is_public ? 'Oui' : 'Non'}\n`);
        } else {
          console.log(`  ⚠️  ${key} - Valeurs différentes!`);
          console.log(`     Base de données: ${dbValueStr}`);
          console.log(`     Config: ${configValueStr}\n`);
          allValid = false;
        }
      } else {
        console.log(`  ❌ ${key}: MANQUANT dans app_settings\n`);
        allValid = false;
      }
    }

    // 3. Afficher un résumé
    console.log('\n📊 Résumé:\n');
    const allSettings = await query(
      'SELECT key, is_public FROM app_settings WHERE is_public = true ORDER BY key'
    );
    
    console.log(`  Total paramètres publics: ${allSettings.rows.length}\n`);
    console.log('  Paramètres publics disponibles:\n');
    allSettings.rows.forEach(row => {
      console.log(`    • ${row.key}`);
    });

    if (allValid) {
      console.log('\n✅ Tous les paramètres sont correctement synchronisés');
      console.log('✅ Les valeurs correspondent à config/index.js\n');
      return true;
    } else {
      console.log('\n⚠️  Certains paramètres ne sont pas correctement synchronisés\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Exécuter le test
if (require.main === module) {
  testSyncSettings()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { testSyncSettings };

/**
 * Script pour vérifier si le serveur a bien chargé les nouvelles routes
 * À exécuter pendant que le serveur tourne
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

async function checkServer() {
  console.log('🔍 Vérification du serveur...\n');
  console.log(`📍 URL: ${API_BASE_URL}\n`);

  // Test 1: Vérifier que le serveur répond
  try {
    const healthResponse = await axios.get(`${API_BASE_URL}/health`, { timeout: 2000 });
    console.log('✅ Serveur répond (health check OK)\n');
  } catch (error) {
    console.log('❌ Serveur ne répond pas');
    console.log('   Assurez-vous que le serveur est démarré avec: npm start\n');
    return;
  }

  // Test 2: Vérifier la route publique
  console.log('🔍 Test de la route publique...\n');
  try {
    const response = await axios.get(`${API_BASE_URL}/api/v1/public/settings`, {
      timeout: 5000,
      validateStatus: () => true, // Accepter tous les codes
    });

    if (response.status === 200) {
      console.log('✅ Route publique fonctionne!\n');
      console.log('📊 Paramètres retournés:', Object.keys(response.data.data.settings).length);
      return;
    } else if (response.status === 404) {
      console.log('❌ Route retourne 404\n');
      console.log('💡 Le serveur n\'a PAS été redémarré avec les nouvelles modifications\n');
      console.log('📝 Actions à faire:');
      console.log('   1. Arrêter le serveur (Ctrl+C)');
      console.log('   2. Vérifier qu\'aucun processus Node.js ne tourne:');
      console.log('      Get-Process node');
      console.log('   3. Arrêter tous les processus si nécessaire:');
      console.log('      Stop-Process -Name node -Force');
      console.log('   4. Redémarrer le serveur:');
      console.log('      npm start');
      console.log('   5. Vérifier dans les logs qu\'apparaît:');
      console.log('      "Enregistrement route publique: /api/v1/public"');
      console.log('      "Route publique enregistrée avec succès"\n');
    } else {
      console.log(`⚠️  Status inattendu: ${response.status}\n`);
      console.log('Réponse:', response.data);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Impossible de se connecter au serveur');
      console.log('   Le serveur n\'est peut-être pas démarré\n');
    } else {
      console.log('❌ Erreur:', error.message);
    }
  }
}

checkServer().catch(console.error);

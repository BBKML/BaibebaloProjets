/**
 * Test simple pour vérifier que le serveur répond et que les routes sont disponibles
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

async function testRoutes() {
  console.log('🧪 Test de disponibilité des routes\n');
  console.log(`📍 URL de base: ${API_BASE_URL}\n`);

  const routes = [
    { name: 'Health', url: `${API_BASE_URL}/health`, method: 'GET' },
    { name: 'Public Settings', url: `${API_BASE_URL}/api/v1/public/settings`, method: 'GET' },
    { name: 'Auth (devrait être 401)', url: `${API_BASE_URL}/api/v1/auth/send-otp`, method: 'POST' },
  ];

  for (const route of routes) {
    try {
      console.log(`🔍 Test: ${route.name}`);
      console.log(`   ${route.method} ${route.url}`);
      
      const response = await axios({
        method: route.method.toLowerCase(),
        url: route.url,
        timeout: 3000,
        validateStatus: () => true, // Accepter tous les codes de statut
      });

      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200 || response.status === 201) {
        console.log(`   ✅ Route accessible\n`);
      } else if (response.status === 404) {
        console.log(`   ❌ Route non trouvée (404)\n`);
      } else if (response.status === 401 || response.status === 400) {
        console.log(`   ✅ Route existe (${response.status} = attendu pour cette route)\n`);
      } else {
        console.log(`   ⚠️  Status: ${response.status}\n`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`   ❌ Serveur non démarré (ECONNREFUSED)\n`);
      } else if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Réponse: ${JSON.stringify(error.response.data, null, 2)}\n`);
      } else {
        console.log(`   ❌ Erreur: ${error.message}\n`);
      }
    }
  }

  console.log('\n💡 Si la route Public Settings retourne 404:');
  console.log('   1. Vérifiez que le serveur a été redémarré');
  console.log('   2. Vérifiez les logs du serveur pour voir les routes enregistrées');
  console.log('   3. Vérifiez que le fichier src/routes/public.routes.js existe');
}

testRoutes().catch(console.error);

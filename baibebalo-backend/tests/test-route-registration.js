/**
 * Test pour vérifier que la route publique est bien enregistrée dans Express
 * Ce script simule le chargement du serveur pour vérifier l'enregistrement des routes
 */

require('dotenv').config();

const express = require('express');
const config = require('../src/config');
const publicRoutes = require('../src/routes/public.routes');

const app = express();
const apiPrefix = `/api/${config.apiVersion}`;

console.log('🧪 Test d\'enregistrement de la route publique\n');
console.log(`📍 Préfixe API: ${apiPrefix}\n`);

// Enregistrer la route comme dans server.js
console.log(`1️⃣  Enregistrement: ${apiPrefix}/public`);
app.use(`${apiPrefix}/public`, publicRoutes);
console.log('✅ Route enregistrée\n');

// Lister toutes les routes enregistrées
console.log('2️⃣  Routes enregistrées dans Express:\n');
const routes = [];
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    // Route directe
    const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase()).join(', ');
    routes.push(`${methods} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    // Router (sous-routes)
    middleware.handle.stack.forEach((handler) => {
      if (handler.route) {
        const methods = Object.keys(handler.route.methods).map(m => m.toUpperCase()).join(', ');
        const fullPath = middleware.regexp.source
          .replace('\\/?', '')
          .replace('(?=\\/|$)', '')
          .replace(/\\(.)/g, '$1')
          .replace('^', '')
          .replace('$', '');
        routes.push(`${methods} ${fullPath}${handler.route.path}`);
      }
    });
  }
});

if (routes.length > 0) {
  routes.forEach(route => console.log(`  • ${route}`));
  console.log(`\n✅ Total: ${routes.length} route(s) enregistrée(s)\n`);
  
  // Vérifier si notre route est présente
  const publicSettingsRoute = routes.find(r => r.includes('/public/settings'));
  if (publicSettingsRoute) {
    console.log(`✅ Route publique trouvée: ${publicSettingsRoute}\n`);
  } else {
    console.log(`❌ Route publique NON trouvée dans les routes enregistrées\n`);
    console.log('💡 Vérifiez que le serveur a été redémarré avec les nouvelles modifications\n');
  }
} else {
  console.log('⚠️  Aucune route trouvée\n');
}

// Test de la route avec un serveur temporaire
console.log('3️⃣  Test avec serveur Express temporaire...\n');
const testApp = express();
testApp.use(`${apiPrefix}/public`, publicRoutes);

// Créer une requête de test
const testReq = {
  method: 'GET',
  url: `${apiPrefix}/public/settings`,
  path: `${apiPrefix}/public/settings`,
};

let routeFound = false;
testApp._router.stack.forEach((middleware) => {
  if (middleware.regexp && middleware.regexp.test(testReq.path)) {
    if (middleware.route || (middleware.name === 'router' && middleware.handle)) {
      routeFound = true;
      console.log(`✅ Route correspondante trouvée pour: ${testReq.path}\n`);
    }
  }
});

if (!routeFound) {
  console.log(`❌ Aucune route correspondante trouvée pour: ${testReq.path}\n`);
}

console.log('💡 Si la route n\'est pas trouvée, vérifiez:');
console.log('   1. Que le serveur a été complètement redémarré');
console.log('   2. Que les logs du serveur montrent "Enregistrement route publique"');
console.log('   3. Qu\'il n\'y a pas d\'erreurs au démarrage du serveur\n');

/**
 * Test simple de la route publique
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/public/settings',
  method: 'GET',
};

console.log('🧪 Test simple de la route publique\n');
console.log(`📍 GET http://localhost:5000/api/v1/public/settings\n`);

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\nRéponse:');
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
      
      if (res.statusCode === 200 && json.success) {
        console.log('\n✅ Route fonctionne correctement!');
        console.log(`📊 Nombre de paramètres: ${Object.keys(json.data.settings).length}`);
      } else if (res.statusCode === 404) {
        console.log('\n❌ Route retourne 404');
        console.log('💡 Le serveur n\'a pas été redémarré avec les nouvelles modifications');
        console.log('   Vérifiez les logs du serveur pour "Enregistrement route publique"');
      } else {
        console.log(`\n⚠️  Status inattendu: ${res.statusCode}`);
      }
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.log(`❌ Erreur: ${error.message}`);
  console.log('   Assurez-vous que le serveur est démarré');
});

req.end();

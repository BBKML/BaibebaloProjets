/**
 * Script pour tester la connexion d'un restaurant
 * Usage: node test-restaurant-login.js
 */

const { query } = require('./src/database/db');
const bcrypt = require('bcrypt');

async function testRestaurantLogin() {
  try {
    console.log('🔍 Test de connexion restaurant...\n');

    const email = 'restaurant@test.com';
    const password = 'Test123!';

    // Vérifier si le restaurant existe
    const result = await query(
      'SELECT * FROM restaurants WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log('❌ Restaurant non trouvé !');
      console.log('   Exécutez: node create-test-restaurant.js');
      return;
    }

    const restaurant = result.rows[0];
    console.log('✅ Restaurant trouvé:');
    console.log(`   ID: ${restaurant.id}`);
    console.log(`   Email: ${restaurant.email}`);
    console.log(`   Nom: ${restaurant.name}`);
    console.log(`   Statut: ${restaurant.status}`);
    console.log(`   Password hash: ${restaurant.password_hash ? restaurant.password_hash.substring(0, 20) + '...' : 'NULL'}\n`);

    // Vérifier le statut
    if (restaurant.status !== 'active') {
      console.log(`⚠️  Le restaurant n'est pas actif (statut: ${restaurant.status})`);
      console.log('   Mettez à jour le statut avec:');
      console.log(`   UPDATE restaurants SET status = 'active' WHERE id = '${restaurant.id}';`);
    }

    // Tester le mot de passe
    if (!restaurant.password_hash) {
      console.log('❌ Aucun mot de passe hashé trouvé !');
      return;
    }

    console.log('🔐 Test du mot de passe...');
    const isValid = await bcrypt.compare(password, restaurant.password_hash);
    
    if (isValid) {
      console.log('✅ Mot de passe correct !');
    } else {
      console.log('❌ Mot de passe incorrect !');
      console.log('\n💡 Solutions:');
      console.log('   1. Vérifiez que vous utilisez: Test123!');
      console.log('   2. Recréez le restaurant avec: node create-test-restaurant.js');
      console.log('   3. Ou mettez à jour le mot de passe manuellement:');
      console.log(`      UPDATE restaurants SET password_hash = '${await bcrypt.hash(password, 10)}' WHERE id = '${restaurant.id}';`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    const { pool } = require('./src/database/db');
    await pool.end();
  }
}

testRestaurantLogin();

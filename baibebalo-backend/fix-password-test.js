/**
 * Script pour vérifier et corriger le mot de passe du restaurant de test
 */

const { query } = require('./src/database/db');
const bcrypt = require('bcrypt');

async function fixPassword() {
  try {
    console.log('🔧 Vérification du mot de passe...\n');

    const email = 'restaurant@test.com';
    const correctPassword = 'Test123!';

    // Récupérer le restaurant
    const result = await query(
      'SELECT * FROM restaurants WHERE LOWER(TRIM(email)) = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      console.log('❌ Restaurant non trouvé !');
      return;
    }

    const restaurant = result.rows[0];
    console.log('✅ Restaurant trouvé:');
    console.log(`   Email: ${restaurant.email}`);
    console.log(`   Hash actuel: ${restaurant.password_hash?.substring(0, 20)}...\n`);

    // Tester le mot de passe actuel
    const isValid = await bcrypt.compare(correctPassword, restaurant.password_hash);
    console.log(`🔐 Test avec "Test123!": ${isValid ? '✅ CORRECT' : '❌ INCORRECT'}`);

    // Tester avec des variations
    const variations = [
      correctPassword,
      correctPassword + ' ',
      ' ' + correctPassword,
      correctPassword + '\n',
      correctPassword + '\r',
    ];

    console.log('\n🔍 Test de variations:');
    for (const variant of variations) {
      const test = await bcrypt.compare(variant, restaurant.password_hash);
      console.log(`   "${variant}" (${variant.length} chars): ${test ? '✅' : '❌'}`);
      console.log(`   Codes: ${variant.split('').map(c => c.codePointAt(0)).join(',')}`);
    }

    // Si le mot de passe n'est pas correct, le recréer
    if (!isValid) {
      console.log('\n🔧 Recréation du hash du mot de passe...');
      const newHash = await bcrypt.hash(correctPassword, 10);
      
      await query(
        'UPDATE restaurants SET password_hash = $1 WHERE id = $2',
        [newHash, restaurant.id]
      );

      // Vérifier que ça fonctionne maintenant
      const verify = await bcrypt.compare(correctPassword, newHash);
      console.log(`✅ Nouveau hash créé: ${verify ? 'CORRECT' : 'ERREUR'}`);
      console.log(`   Nouveau hash: ${newHash.substring(0, 20)}...`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    const { pool } = require('./src/database/db');
    await pool.end();
  }
}

// Utiliser top-level await si supporté, sinon garder l'appel de fonction
(async () => {
  await fixPassword();
})();

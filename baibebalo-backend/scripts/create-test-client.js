/**
 * Script pour créer un compte client de test
 * Usage: node scripts/create-test-client.js
 */

const { query, transaction } = require('../src/database/db');
const authService = require('../src/services/auth.service');
const { generateAccessToken, generateRefreshToken } = require('../src/middlewares/auth');
const logger = require('../src/utils/logger');

// Informations du compte de test
const TEST_CLIENT = {
  phone: '+2250700000000', // Numéro de test
  first_name: 'Jean',
  last_name: 'Kouassi',
  email: 'test.client@baibebalo.ci',
};

async function createTestClient() {
  try {
    console.log('🚀 Création du compte client de test...\n');

    // Vérifier si le compte existe déjà
    const existing = await query(
      'SELECT * FROM users WHERE phone = $1',
      [TEST_CLIENT.phone]
    );

    if (existing.rows.length > 0) {
      console.log('⚠️  Un compte existe déjà avec ce numéro de téléphone');
      console.log(`📱 Téléphone: ${TEST_CLIENT.phone}`);
      console.log(`👤 Nom: ${existing.rows[0].first_name} ${existing.rows[0].last_name}`);
      console.log(`🆔 ID: ${existing.rows[0].id}`);
      console.log(`📧 Email: ${existing.rows[0].email || 'Non renseigné'}`);
      console.log(`🎁 Code de parrainage: ${existing.rows[0].referral_code}`);
      console.log(`⭐ Points de fidélité: ${existing.rows[0].loyalty_points || 0}`);
      
      // Générer des tokens pour ce compte existant
      const accessToken = generateAccessToken({
        id: existing.rows[0].id,
        phone: existing.rows[0].phone,
        type: 'client',
      });

      const refreshToken = generateRefreshToken({
        id: existing.rows[0].id,
        phone: existing.rows[0].phone,
        type: 'client',
      });

      console.log('\n✅ Tokens générés pour le compte existant:');
      console.log(`\n📋 Access Token:`);
      console.log(accessToken);
      console.log(`\n🔄 Refresh Token:`);
      console.log(refreshToken);
      console.log('\n💡 Vous pouvez utiliser ces tokens pour vous connecter à l\'application mobile');
      
      return {
        user: existing.rows[0],
        accessToken,
        refreshToken,
        isNew: false,
      };
    }

    // Créer le compte
    const result = await transaction(async (client) => {
      const referralCode = await authService.generateUniqueReferralCode(client);
      
      // Vérifier les colonnes disponibles
      const tableInfo = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users'
      `);
      const columns = tableInfo.rows.map(row => row.column_name);
      
      // Construire la requête dynamiquement selon les colonnes disponibles
      const hasLastLogin = columns.includes('last_login');
      const hasStatus = columns.includes('status');
      
      let insertQuery = `INSERT INTO users (
        phone, 
        first_name, 
        last_name, 
        email,
        referral_code`;
      
      if (hasStatus) {
        insertQuery += `, status`;
      }
      if (hasLastLogin) {
        insertQuery += `, last_login`;
      }
      
      insertQuery += `) VALUES ($1, $2, $3, $4, $5`;
      
      const values = [
        TEST_CLIENT.phone,
        TEST_CLIENT.first_name,
        TEST_CLIENT.last_name,
        TEST_CLIENT.email,
        referralCode
      ];
      
      let paramIndex = 6;
      if (hasStatus) {
        insertQuery += `, 'active'`;
      }
      if (hasLastLogin) {
        insertQuery += `, NOW()`;
      }
      
      insertQuery += `) RETURNING *`;
      
      const insertResult = await client.query(insertQuery, values);

      return insertResult.rows[0];
    });

    // Générer les tokens
    const accessToken = generateAccessToken({
      id: result.id,
      phone: result.phone,
      type: 'client',
    });

    const refreshToken = generateRefreshToken({
      id: result.id,
      phone: result.phone,
      type: 'client',
    });

    console.log('✅ Compte client créé avec succès!\n');
    console.log('📋 Informations du compte:');
    console.log(`   📱 Téléphone: ${result.phone}`);
    console.log(`   👤 Nom: ${result.first_name} ${result.last_name}`);
    console.log(`   📧 Email: ${result.email || 'Non renseigné'}`);
    console.log(`   🆔 ID: ${result.id}`);
    console.log(`   🎁 Code de parrainage: ${result.referral_code}`);
    console.log(`   ⭐ Points de fidélité: ${result.loyalty_points || 0}`);
    console.log(`   📅 Créé le: ${result.created_at}`);
    
    console.log('\n🔑 Tokens générés:');
    console.log(`\n📋 Access Token:`);
    console.log(accessToken);
    console.log(`\n🔄 Refresh Token:`);
    console.log(refreshToken);
    
    console.log('\n💡 Instructions:');
    console.log('   1. Ouvrez l\'application mobile BAIBEBALO');
    console.log('   2. Entrez le numéro de téléphone:', TEST_CLIENT.phone);
    console.log('   3. Demandez un code OTP (ou utilisez le processus normal)');
    console.log('   4. Ou utilisez directement les tokens ci-dessus pour vous connecter');
    
    console.log('\n📝 Note: Pour tester avec OTP, vous devrez:');
    console.log('   - Utiliser le numéro:', TEST_CLIENT.phone);
    console.log('   - Le code OTP sera visible dans les logs du serveur en mode développement');

    return {
      user: result,
      accessToken,
      refreshToken,
      isNew: true,
    };
  } catch (error) {
    console.error('❌ Erreur lors de la création du compte:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  createTestClient()
    .then(() => {
      console.log('\n✨ Script terminé avec succès!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { createTestClient, TEST_CLIENT };

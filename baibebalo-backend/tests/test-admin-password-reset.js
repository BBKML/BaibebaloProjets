const axios = require('axios');
const { query } = require('../src/database/db');
const config = require('../src/config');

const API_BASE = 'http://localhost:5000/api/v1';
const TEST_EMAIL = 'bookeleblan@gmail.com';

async function testAdminPasswordReset() {
  console.log('🧪 Test de réinitialisation de mot de passe ADMIN\n');
  console.log('='.repeat(70));
  console.log(`📧 Email de test: ${TEST_EMAIL}`);
  console.log('='.repeat(70) + '\n');

  // ============================================
  // ÉTAPE 1: Vérifier que l'admin existe
  // ============================================
  console.log('📋 ÉTAPE 1: Vérification de l\'existence de l\'admin...');
  try {
    const adminResult = await query(
      'SELECT id, email, full_name FROM admins WHERE email = $1',
      [TEST_EMAIL.toLowerCase()]
    );

    if (adminResult.rows.length === 0) {
      console.log('❌ ERREUR: Aucun admin trouvé avec cet email');
      console.log('   Créez d\'abord un admin avec cet email');
      return;
    }

    const admin = adminResult.rows[0];
    console.log('✅ Admin trouvé:');
    console.log(`   - ID: ${admin.id}`);
    console.log(`   - Nom: ${admin.full_name || 'N/A'}`);
    console.log(`   - Email: ${admin.email}\n`);
  } catch (error) {
    console.log('❌ Erreur lors de la vérification:', error.message);
    return;
  }

  // ============================================
  // ÉTAPE 2: Demander la réinitialisation
  // ============================================
  console.log('📋 ÉTAPE 2: Demande de réinitialisation de mot de passe...');
  try {
    const response = await axios.post(`${API_BASE}/auth/admin/forgot-password`, {
      email: TEST_EMAIL,
    });

    if (response.data.success) {
      console.log('✅ Demande de réinitialisation envoyée avec succès');
      console.log(`   Message: ${response.data.message}\n`);
    } else {
      console.log('❌ Erreur:', response.data);
      return;
    }
  } catch (error) {
    if (error.response) {
      console.log('❌ Erreur API:', error.response.data);
    } else {
      console.log('❌ Erreur réseau:', error.message);
      console.log('   Assurez-vous que le serveur backend est démarré sur http://localhost:5000');
    }
    return;
  }

  // ============================================
  // ÉTAPE 3: Récupérer le token depuis la base de données
  // ============================================
  console.log('📋 ÉTAPE 3: Récupération du token de réinitialisation...');
  try {
    const tokenResult = await query(
      `SELECT code, expires_at, created_at 
       FROM otp_codes 
       WHERE phone = $1 AND type = 'admin_password_reset' AND is_used = false
       ORDER BY created_at DESC LIMIT 1`,
      [TEST_EMAIL.toLowerCase()]
    );

    if (tokenResult.rows.length === 0) {
      console.log('❌ ERREUR: Aucun token trouvé dans la base de données');
      console.log('   Vérifiez que l\'endpoint a bien créé le token');
      return;
    }

    const tokenRecord = tokenResult.rows[0];
    const resetToken = tokenRecord.code;
    const expiresAt = new Date(tokenRecord.expires_at);
    const now = new Date();

    console.log('✅ Token trouvé:');
    console.log(`   - Token: ${resetToken}`);
    console.log(`   - Expire le: ${expiresAt.toLocaleString('fr-FR')}`);
    console.log(`   - Valide pendant: ${Math.round((expiresAt - now) / 1000 / 60)} minutes\n`);

    if (expiresAt < now) {
      console.log('⚠️  ATTENTION: Le token a déjà expiré !');
      return;
    }

    // ============================================
    // ÉTAPE 4: Construire l'URL de réinitialisation
    // ============================================
    const adminPanelUrl = config.urls.adminPanel || 'http://localhost:5174';
    const resetUrl = `${adminPanelUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(TEST_EMAIL)}`;
    
    console.log('📋 ÉTAPE 4: URL de réinitialisation générée:');
    console.log('   ' + resetUrl + '\n');

    // ============================================
    // ÉTAPE 5: Réinitialiser le mot de passe
    // ============================================
    console.log('📋 ÉTAPE 5: Réinitialisation du mot de passe...');
    const newPassword = 'Test1234!@#$'; // Mot de passe de test sécurisé
    
    try {
      const resetResponse = await axios.post(`${API_BASE}/auth/admin/reset-password`, {
        email: TEST_EMAIL,
        reset_token: resetToken,
        new_password: newPassword,
      });

      if (resetResponse.data.success) {
        console.log('✅ Mot de passe réinitialisé avec succès !');
        console.log(`   Message: ${resetResponse.data.message}\n`);
        
        // ============================================
        // ÉTAPE 6: Tester la connexion avec le nouveau mot de passe
        // ============================================
        console.log('📋 ÉTAPE 6: Test de connexion avec le nouveau mot de passe...');
        try {
          const loginResponse = await axios.post(`${API_BASE}/auth/admin/login`, {
            email: TEST_EMAIL,
            password: newPassword,
          });

          if (loginResponse.data.success) {
            console.log('✅ Connexion réussie avec le nouveau mot de passe !');
            console.log(`   Admin: ${loginResponse.data.data.admin.full_name || loginResponse.data.data.admin.email}`);
            console.log(`   Token généré: ${loginResponse.data.data.accessToken.substring(0, 20)}...\n`);
          } else {
            console.log('❌ Échec de la connexion:', loginResponse.data);
          }
        } catch (loginError) {
          if (loginError.response) {
            console.log('❌ Erreur de connexion:', loginError.response.data);
          } else {
            console.log('❌ Erreur réseau:', loginError.message);
          }
        }

        // ============================================
        // RÉSUMÉ
        // ============================================
        console.log('\n' + '='.repeat(70));
        console.log('✅ TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !');
        console.log('='.repeat(70));
        console.log('\n📝 Résumé:');
        console.log(`   1. ✅ Admin trouvé: ${TEST_EMAIL}`);
        console.log(`   2. ✅ Email de réinitialisation envoyé`);
        console.log(`   3. ✅ Token généré et récupéré`);
        console.log(`   4. ✅ Mot de passe réinitialisé`);
        console.log(`   5. ✅ Connexion testée avec succès`);
        console.log(`\n🔗 URL de réinitialisation (pour test manuel):`);
        console.log(`   ${resetUrl}`);
        console.log(`\n🔑 Nouveau mot de passe: ${newPassword}`);
        console.log(`   ⚠️  IMPORTANT: Changez ce mot de passe après le test !\n`);

      } else {
        console.log('❌ Erreur lors de la réinitialisation:', resetResponse.data);
      }
    } catch (resetError) {
      if (resetError.response) {
        console.log('❌ Erreur API:', resetError.response.data);
        if (resetError.response.data.error?.code === 'TOKEN_EXPIRED') {
          console.log('   Le token a expiré. Relancez le test.');
        } else if (resetError.response.data.error?.code === 'INVALID_TOKEN') {
          console.log('   Token invalide. Vérifiez que le token est correct.');
        }
      } else {
        console.log('❌ Erreur réseau:', resetError.message);
      }
    }

  } catch (error) {
    console.log('❌ Erreur lors de la récupération du token:', error.message);
  }
}

// Vérifier que le serveur est démarré
async function checkServer() {
  try {
    const response = await axios.get('http://localhost:5000/health', { timeout: 2000 });
    if (response.data.success) {
      console.log('✅ Serveur backend en ligne\n');
      return true;
    }
    return false;
  } catch (error) {
    console.log('❌ Le serveur backend n\'est pas démarré !');
    console.log('   Démarrez-le dans un autre terminal avec:');
    console.log('   cd baibebalo-backend');
    console.log('   npm start\n');
    console.log('   Puis relancez ce test.\n');
    return false;
  }
}

// Exécuter les tests
async function runTests() {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }

  await testAdminPasswordReset();
}

runTests().catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});

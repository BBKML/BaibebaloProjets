/**
 * Script pour tester la connexion admin
 * Usage: node src/scripts/test-admin-login.js
 */

require('dotenv').config();
const { query } = require('../database/db');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

async function testAdminLogin() {
  try {
    logger.info('════════════════════════════════════════');
    logger.info('  TEST CONNEXION ADMIN');
    logger.info('════════════════════════════════════════');

    const email = 'admin@baibebalo.ci';
    const password = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@2025!';

    // 1. Vérifier si l'admin existe
    logger.info('\n1. Vérification de l\'admin...');
    const adminResult = await query(
      'SELECT * FROM admins WHERE email = $1',
      [email]
    );

    if (adminResult.rows.length === 0) {
      logger.error('❌ Admin non trouvé dans la base de données');
      logger.info('   Exécutez: npm run admin:create');
      process.exit(1);
    }

    const admin = adminResult.rows[0];
    logger.info(`✅ Admin trouvé: ${admin.email}`);
    logger.info(`   - ID: ${admin.id}`);
    logger.info(`   - Nom: ${admin.full_name}`);
    logger.info(`   - Rôle: ${admin.role}`);
    logger.info(`   - Actif: ${admin.is_active}`);

    if (!admin.is_active) {
      logger.error('❌ Admin est INACTIF');
      logger.info('   L\'admin doit être actif pour se connecter');
      process.exit(1);
    }

    // 2. Vérifier le mot de passe
    logger.info('\n2. Test du mot de passe...');
    logger.info(`   Mot de passe testé: ${password}`);
    
    const isValid = await bcrypt.compare(password, admin.password_hash);
    
    if (isValid) {
      logger.info('✅ Mot de passe CORRECT');
    } else {
      logger.error('❌ Mot de passe INCORRECT');
      logger.info('   Le hash en base ne correspond pas au mot de passe testé');
      logger.info('   Exécutez: npm run admin:create pour réinitialiser');
      process.exit(1);
    }

    // 3. Vérifier avec is_active = true
    logger.info('\n3. Vérification avec is_active = true...');
    const activeAdminResult = await query(
      'SELECT * FROM admins WHERE email = $1 AND is_active = true',
      [email]
    );

    if (activeAdminResult.rows.length === 0) {
      logger.error('❌ Admin non trouvé avec is_active = true');
      logger.info('   L\'admin existe mais n\'est pas actif');
      process.exit(1);
    }

    logger.info('✅ Admin actif trouvé');

    // 4. Résumé
    logger.info('\n════════════════════════════════════════');
    logger.info('  ✅ TOUS LES TESTS RÉUSSIS');
    logger.info('════════════════════════════════════════');
    logger.info('  Identifiants de connexion:');
    logger.info(`  📧 Email: ${email}`);
    logger.info(`  🔑 Mot de passe: ${password}`);
    logger.info('');
    logger.info('  Si la connexion ne fonctionne toujours pas:');
    logger.info('  1. Vérifiez que le backend est démarré');
    logger.info('  2. Vérifiez le port (5000 ou 3000)');
    logger.info('  3. Vérifiez CORS dans la config');
    logger.info('  4. Vérifiez les logs du backend lors de la connexion');
    logger.info('════════════════════════════════════════');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Erreur lors du test', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  testAdminLogin();
}

module.exports = { testAdminLogin };

/**
 * Script pour créer ou réinitialiser l'admin
 * Usage: node src/scripts/create-admin.js
 */

require('dotenv').config();
const { query } = require('../database/db');
const bcrypt = require('bcrypt');
const config = require('../config');
const logger = require('../utils/logger');

async function createOrResetAdmin() {
  try {
    logger.info('════════════════════════════════════════');
    logger.info('  CRÉATION/RÉINITIALISATION ADMIN');
    logger.info('════════════════════════════════════════');

    // Vérifier si l'admin existe
    const adminExists = await query(
      'SELECT id, email, full_name, is_active FROM admins WHERE email = $1',
      ['admin@baibebalo.ci']
    );

    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@2025!';
    const passwordHash = await bcrypt.hash(defaultPassword, parseInt(config.bcryptRounds || 10));

    if (adminExists.rows.length > 0) {
      // Admin existe - réinitialiser le mot de passe
      const admin = adminExists.rows[0];
      logger.info(`✓ Admin trouvé: ${admin.email} (${admin.full_name})`);
      logger.info('  Réinitialisation du mot de passe...');

      await query(
        `UPDATE admins 
         SET password_hash = $1, is_active = true, updated_at = NOW()
         WHERE email = $2`,
        [passwordHash, 'admin@baibebalo.ci']
      );

      logger.info('✅ Mot de passe réinitialisé avec succès');
    } else {
      // Admin n'existe pas - le créer
      logger.info('  Création d\'un nouvel admin...');

      await query(
        `INSERT INTO admins (email, password_hash, full_name, role, permissions, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'admin@baibebalo.ci',
          passwordHash,
          'Super Administrateur',
          'super_admin',
          JSON.stringify({ all: true }),
          true
        ]
      );

      logger.info('✅ Admin créé avec succès');
    }

    logger.info('');
    logger.info('════════════════════════════════════════');
    logger.info('  IDENTIFIANTS DE CONNEXION');
    logger.info('════════════════════════════════════════');
    logger.info(`  📧 Email: admin@baibebalo.ci`);
    logger.info(`  🔑 Mot de passe: ${defaultPassword}`);
    logger.info('');
    logger.warn('⚠️  CHANGEZ LE MOT DE PASSE EN PRODUCTION!');
    logger.info('════════════════════════════════════════');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Erreur lors de la création/réinitialisation de l\'admin', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  createOrResetAdmin();
}

module.exports = { createOrResetAdmin };

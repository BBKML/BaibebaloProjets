/**
 * Script pour ajouter la colonne last_login à la table users
 * Usage: node scripts/add-last-login-column.js
 */

const { query } = require('../src/database/db');
const logger = require('../src/utils/logger');

async function addLastLoginColumn() {
  try {
    console.log('🔧 Ajout de la colonne last_login à la table users...\n');

    // Vérifier si la colonne existe déjà
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'last_login'
    `);

    if (columnCheck.rows.length > 0) {
      console.log('✅ La colonne last_login existe déjà');
      return;
    }

    // Ajouter la colonne
    await query(`
      ALTER TABLE users 
      ADD COLUMN last_login TIMESTAMP
    `);

    console.log('✅ Colonne last_login ajoutée avec succès!');
    console.log('   - Type: TIMESTAMP');
    console.log('   - Nullable: Oui\n');
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de la colonne:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Fermer la connexion
    process.exit(0);
  }
}

// Exécuter le script
if (require.main === module) {
  addLastLoginColumn();
}

module.exports = addLastLoginColumn;

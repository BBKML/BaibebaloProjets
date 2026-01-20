/**
 * Script pour ajouter la colonne max_attempts à la table otp_codes
 * Usage: node scripts/add-max-attempts-column.js
 */

const { query } = require('../src/database/db');
const logger = require('../src/utils/logger');

async function addMaxAttemptsColumn() {
  try {
    console.log('🔧 Ajout de la colonne max_attempts à la table otp_codes...\n');

    // Vérifier si la colonne existe déjà
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'otp_codes' 
      AND column_name = 'max_attempts'
    `);

    if (columnCheck.rows.length > 0) {
      console.log('✅ La colonne max_attempts existe déjà');
      return;
    }

    // Ajouter la colonne
    await query(`
      ALTER TABLE otp_codes 
      ADD COLUMN max_attempts INTEGER DEFAULT 3
    `);

    // Mettre à jour les enregistrements existants
    await query(`
      UPDATE otp_codes 
      SET max_attempts = 3 
      WHERE max_attempts IS NULL
    `);

    console.log('✅ Colonne max_attempts ajoutée avec succès!');
    console.log('   - Valeur par défaut: 3 tentatives');
    console.log('   - Les enregistrements existants ont été mis à jour\n');
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de la colonne:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  addMaxAttemptsColumn()
    .then(() => {
      console.log('✨ Script terminé avec succès!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { addMaxAttemptsColumn };

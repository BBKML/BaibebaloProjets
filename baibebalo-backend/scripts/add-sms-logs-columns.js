/**
 * Script pour ajouter les colonnes manquantes à la table sms_logs
 * Usage: node scripts/add-sms-logs-columns.js
 */

const { query } = require('../src/database/db');
const logger = require('../src/utils/logger');

async function addSmsLogsColumns() {
  try {
    console.log('🔧 Ajout des colonnes manquantes à la table sms_logs...\n');

    // Vérifier si la table existe
    const tableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'sms_logs'
    `);

    if (tableCheck.rows.length === 0) {
      console.log('⚠️  La table sms_logs n\'existe pas. Création de la table...');
      
      // Créer la table
      await query(`
        CREATE TABLE sms_logs (
          id SERIAL PRIMARY KEY,
          phone VARCHAR(20) NOT NULL,
          message TEXT NOT NULL,
          status VARCHAR(20) NOT NULL,
          provider VARCHAR(50),
          message_id VARCHAR(255),
          error TEXT,
          sent_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('✅ Table sms_logs créée avec succès!\n');
      return;
    }

    // Vérifier et ajouter message_id si nécessaire
    const messageIdCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sms_logs' 
      AND column_name = 'message_id'
    `);

    if (messageIdCheck.rows.length === 0) {
      await query(`
        ALTER TABLE sms_logs 
        ADD COLUMN message_id VARCHAR(255)
      `);
      console.log('✅ Colonne message_id ajoutée');
    } else {
      console.log('✅ Colonne message_id existe déjà');
    }

    // Vérifier et ajouter provider si nécessaire
    const providerCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sms_logs' 
      AND column_name = 'provider'
    `);

    if (providerCheck.rows.length === 0) {
      await query(`
        ALTER TABLE sms_logs 
        ADD COLUMN provider VARCHAR(50)
      `);
      console.log('✅ Colonne provider ajoutée');
    } else {
      console.log('✅ Colonne provider existe déjà');
    }

    // Vérifier et ajouter error si nécessaire
    const errorCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sms_logs' 
      AND column_name = 'error'
    `);

    if (errorCheck.rows.length === 0) {
      await query(`
        ALTER TABLE sms_logs 
        ADD COLUMN error TEXT
      `);
      console.log('✅ Colonne error ajoutée');
    } else {
      console.log('✅ Colonne error existe déjà');
    }

    console.log('\n✨ Toutes les colonnes sont à jour!\n');
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des colonnes:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  addSmsLogsColumns()
    .then(() => {
      console.log('✨ Script terminé avec succès!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { addSmsLogsColumns };

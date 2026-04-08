/**
 * Script one-off : ajoute la colonne delivery_proof_photo à la table orders si elle n'existe pas.
 * À lancer si confirmDelivery échoue avec "column delivery_proof_photo does not exist".
 *
 * Usage: node src/database/add-delivery-proof-column.js
 */
const { query } = require('./db');

async function main() {
  try {
    await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_proof_photo TEXT;`);
    console.log('✓ Colonne orders.delivery_proof_photo ajoutée (ou déjà présente).');
    process.exit(0);
  } catch (err) {
    console.error('✗ Erreur:', err.message);
    process.exit(1);
  }
}

main();

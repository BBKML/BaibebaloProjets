#!/usr/bin/env node
/**
 * Script pour créer les index PostgreSQL qui accélèrent les routes delivery.
 * À exécuter sur Render (ou en local) une fois pour appliquer les index.
 *
 * Usage (avec DATABASE_URL configuré) :
 *   node scripts/add-delivery-indexes.js
 *
 * Sur Render : ajouter une tâche one-off ou exécuter depuis le shell du service.
 */
require('dotenv').config();
const { query } = require('../src/database/db');

const INDEXES = [
  {
    name: 'idx_orders_delivery_status',
    sql: `CREATE INDEX IF NOT EXISTS idx_orders_delivery_status
          ON orders(delivery_person_id, status) WHERE delivery_person_id IS NOT NULL`,
  },
  {
    name: 'idx_orders_delivery_created',
    sql: `CREATE INDEX IF NOT EXISTS idx_orders_delivery_created
          ON orders(delivery_person_id, created_at DESC) WHERE delivery_person_id IS NOT NULL`,
  },
  {
    name: 'idx_transactions_to_date',
    sql: `CREATE INDEX IF NOT EXISTS idx_transactions_to_date
          ON transactions(to_user_type, to_user_id, created_at DESC)`,
  },
];

async function main() {
  console.log('Création des index delivery (PostgreSQL)...');
  for (const { name, sql } of INDEXES) {
    try {
      await query(sql);
      console.log('  OK:', name);
    } catch (e) {
      if (e.message && e.message.includes('already exists')) {
        console.log('  (déjà existant):', name);
      } else {
        console.error('  ERREUR', name, e.message);
      }
    }
  }
  console.log('Terminé.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

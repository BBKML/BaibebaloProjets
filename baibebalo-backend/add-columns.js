const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function addColumns() {
  const queries = [
    'ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS landmark TEXT',
    'ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255)',
    'ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS bank_rib VARCHAR(100)',
  ];
  
  console.log('Ajout des colonnes manquantes...');
  
  for (const q of queries) {
    try {
      await pool.query(q);
      console.log('✅', q.substring(32));
    } catch (e) {
      console.log('❌', e.message);
    }
  }
  
  await pool.end();
  console.log('\nTerminé! Redémarrez le backend.');
}

addColumns();

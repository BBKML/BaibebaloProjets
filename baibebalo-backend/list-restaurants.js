const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function list() {
  const result = await pool.query(`
    SELECT id, name, phone, status 
    FROM restaurants 
    WHERE status = 'active'
    LIMIT 5
  `);
  console.log('Restaurants actifs:', result.rows);
  await pool.end();
}

list();

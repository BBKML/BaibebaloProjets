const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function check() {
  const result = await pool.query(`
    SELECT name, phone FROM restaurants LIMIT 10
  `);
  console.log('Formats des numéros:');
  result.rows.forEach(r => console.log(`  ${r.name}: "${r.phone}"`));
  await pool.end();
}

check();

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function getOtp() {
  // D'abord vérifier la structure de la table
  const cols = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'otp_codes'
  `);
  console.log('Colonnes:', cols.rows.map(r => r.column_name));
  
  const result = await pool.query(`
    SELECT * FROM otp_codes 
    WHERE phone = '+2250789093675' 
    ORDER BY created_at DESC 
    LIMIT 1
  `);
  console.log('OTP:', result.rows[0]);
  await pool.end();
}

getOtp();

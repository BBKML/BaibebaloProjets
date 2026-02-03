const { query } = require('./src/database/db');

async function getOTP() {
  try {
    const phone = '+2250787097996';
    
    // Récupérer les colonnes de la table otp_codes
    const cols = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'otp_codes'"
    );
    console.log('Colonnes otp_codes:', cols.rows.map(c => c.column_name).join(', '));
    
    // Récupérer le dernier OTP
    const result = await query(
      'SELECT * FROM otp_codes WHERE phone = $1 ORDER BY created_at DESC LIMIT 1',
      [phone]
    );
    
    if (result.rows.length > 0) {
      console.log('\nDernier OTP pour', phone + ':');
      console.log(JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log('Aucun OTP trouvé pour', phone);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
}

getOTP();

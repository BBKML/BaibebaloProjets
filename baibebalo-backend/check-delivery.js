const { query } = require('./src/database/db');

async function check() {
  try {
    // Vérifier les livreurs avec ce numéro
    const result = await query(
      "SELECT id, phone, first_name, last_name, status FROM delivery_persons WHERE phone LIKE '%0787097996%'"
    );
    
    console.log('Livreurs trouvés:', JSON.stringify(result.rows, null, 2));
    
    if (result.rows.length > 0) {
      console.log('\nVoulez-vous supprimer ces livreurs pour recommencer? Exécutez:');
      console.log('node delete-delivery.js');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
}

check();

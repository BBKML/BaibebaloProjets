const { query } = require('./src/database/db');

async function deleteDelivery() {
  try {
    const phone = '+2250787097996';
    
    // Supprimer le livreur
    const result = await query(
      'DELETE FROM delivery_persons WHERE phone = $1 RETURNING id, phone, first_name, last_name',
      [phone]
    );
    
    if (result.rows.length > 0) {
      console.log('Livreur supprimé:', JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log('Aucun livreur trouvé avec ce numéro');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
}

deleteDelivery();

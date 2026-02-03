const { query } = require('./src/database/db');

async function check() {
  try {
    // Vérifier si la table delivery_persons existe
    const tables = await query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'delivery_persons'
    `);
    
    if (tables.rows.length === 0) {
      console.log('❌ Table delivery_persons n\'existe pas!');
      console.log('Vous devez créer la table avec les migrations.');
      process.exit(1);
    }
    
    console.log('✅ Table delivery_persons existe');
    
    // Vérifier les colonnes
    const columns = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'delivery_persons'
      ORDER BY ordinal_position
    `);
    
    console.log('\nColonnes:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // Vérifier si des livreurs existent
    const count = await query('SELECT COUNT(*) FROM delivery_persons');
    console.log(`\nNombre de livreurs: ${count.rows[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
}

check();

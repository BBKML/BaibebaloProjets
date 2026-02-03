const { query } = require('./src/database/db');

async function main() {
  try {
    console.log('Création de la table order_messages...');
    
    await query(`
      CREATE TABLE IF NOT EXISTS order_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'restaurant', 'system')),
        sender_id UUID,
        message TEXT NOT NULL,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await query('CREATE INDEX IF NOT EXISTS idx_order_messages_order ON order_messages(order_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_order_messages_created ON order_messages(created_at)');
    
    console.log('✅ Table order_messages créée avec succès!');
    
    // Vérifier la structure
    const result = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'order_messages' 
      ORDER BY ordinal_position
    `);
    
    console.log('Colonnes:');
    result.rows.forEach(r => console.log(` - ${r.column_name}: ${r.data_type}`));
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
}

main();

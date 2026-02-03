const { query } = require('./src/database/db');

async function main() {
  try {
    // Supprimer l'article sans options (le doublon)
    const result = await query(
      "DELETE FROM menu_items WHERE id = 'aeba81aa-b94c-47fc-80fc-8bc985b43e67' RETURNING id, name"
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Article supprimé:', result.rows[0].name);
    } else {
      console.log('⚠️ Article non trouvé (déjà supprimé?)');
    }
    
    // Lister les articles restants
    const items = await query('SELECT id, name, customization_options IS NOT NULL as has_options FROM menu_items');
    console.log('\n📋 Articles restants:');
    items.rows.forEach(i => {
      console.log(`  - ${i.name} | Options: ${i.has_options ? '✅ Oui' : '❌ Non'}`);
    });
    
  } catch (e) {
    console.error('❌ Erreur:', e.message);
  }
  process.exit(0);
}

main();

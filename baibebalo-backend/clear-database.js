/**
 * Script pour vider la base de données (sauf les comptes admin)
 * Usage: node clear-database.js
 */

const { query } = require('./src/database/db');

async function clearDatabase() {
  try {
    console.log('🗑️  Vidage de la base de données (sauf admins)...\n');
    
    // Tables à vider avec TRUNCATE CASCADE (gère automatiquement les dépendances)
    const tables = [
      'reviews',
      'order_items',
      'orders',
      'menu_items',
      'menu_categories',
      'delivery_persons',
      'restaurants',
      'addresses',
      'favorites',
      'loyalty_transactions',
      'notifications',
      'support_messages',
      'support_tickets',
      'promo_codes',
      'users',
      'otp_codes',
      'audit_logs',
    ];
    
    for (const table of tables) {
      try {
        await query(`TRUNCATE TABLE ${table} CASCADE`);
        console.log(`✅ ${table} vidée`);
      } catch (e) {
        if (e.message.includes('does not exist')) {
          console.log(`⏭️  ${table} n'existe pas`);
        } else {
          console.log(`⚠️  ${table}: ${e.message}`);
        }
      }
    }
    
    console.log('\n✅ Base de données vidée (comptes admin conservés)');
    
    // Afficher les admins restants
    try {
      const admins = await query('SELECT id, email, first_name, last_name FROM admins');
      console.log(`\n👤 Admins conservés: ${admins.rows.length}`);
      admins.rows.forEach(a => console.log(`   - ${a.email} (${a.first_name} ${a.last_name})`));
    } catch (e) {
      console.log('\n⚠️  Impossible de lister les admins');
    }
    
  } catch (e) {
    console.error('❌ Erreur:', e.message);
  }
  process.exit(0);
}

clearDatabase();

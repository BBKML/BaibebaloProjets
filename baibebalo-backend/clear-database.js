/**
 * Script pour vider la base de données (SAUF les comptes admin)
 * Permet de repartir de zéro pour faire un exemple complet vous-même.
 *
 * Usage: node clear-database.js
 * Ou:    npm run db:clear
 */

require('dotenv').config();
const { query } = require('./src/database/db');

async function clearDatabase() {
  try {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  🗑️  VIDAGE DE LA BASE DE DONNÉES');
    console.log('  (Comptes admin conservés)');
    console.log('═══════════════════════════════════════════════════════\n');

    // Toutes les tables à vider - ordre géré par CASCADE
    // ON NE TOUCHE PAS à la table admins
    const tables = [
      'cash_remittance_orders',
      'cash_remittances',
      'quiz_results',
      'training_quizzes',
      'dismissed_alerts',
      'expenses',
      'activity_logs',
      'restaurant_ads',
      'ad_pricing',
      'audit_logs',
      'ticket_messages',
      'support_tickets',
      'payout_requests',
      'transactions',
      'loyalty_transactions',
      'reviews',
      'favorites',
      'order_items',
      'orders',
      'promotions',
      'menu_items',
      'menu_categories',
      'delivery_persons',
      'restaurants',
      'addresses',
      'notifications',
      'otp_codes',
      'sms_logs',
      'users',
    ];

    // TRUNCATE en une seule commande (PostgreSQL gère les dépendances)
    const tableList = tables.join(', ');
    try {
      await query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
      console.log('✅ Toutes les tables vidées avec succès\n');
    } catch (e) {
      // Si une table n'existe pas, essayer table par table
      if (e.message.includes('does not exist') || e.code === '42P01') {
        console.log('⚠️  Tentative table par table...\n');
        for (const table of tables) {
          try {
            await query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
            console.log(`   ✅ ${table}`);
          } catch (err) {
            if (err.message.includes('does not exist')) {
              console.log(`   ⏭️  ${table} (n'existe pas)`);
            } else {
              console.log(`   ⚠️  ${table}: ${err.message}`);
            }
          }
        }
      } else {
        throw e;
      }
    }

    // Conserver app_settings (paramètres plateforme) - optionnel, décommenter pour les vider aussi
    // await query('TRUNCATE TABLE app_settings CASCADE');

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✅ BASE VIDÉE - Prêt pour votre exemple complet !');
    console.log('═══════════════════════════════════════════════════════\n');

    // Afficher les admins conservés
    try {
      const admins = await query('SELECT id, email, full_name, role FROM admins WHERE is_active = true');
      console.log(`👤 Comptes admin conservés: ${admins.rows.length}`);
      admins.rows.forEach((a) => {
        console.log(`   • ${a.email} (${a.full_name || 'Admin'}) - ${a.role}`);
      });
      if (admins.rows.length === 0) {
        const all = await query('SELECT id, email, full_name FROM admins');
        if (all.rows.length > 0) {
          console.log(`   (${all.rows.length} admin(s) dont certains inactifs)`);
        } else {
          console.log('   ⚠️  Aucun admin trouvé. Créez-en un avec: npm run admin:create');
        }
      }
      console.log('');
    } catch (e) {
      console.log('⚠️  Impossible de lister les admins\n');
    }

    console.log('💡 Prochaines étapes:');
    console.log('   1. Inscrivez un client (app Client)');
    console.log('   2. Inscrivez un restaurant (app Restaurant)');
    console.log('   3. Inscrivez un livreur (app Livreur)');
    console.log('   4. Passez une commande complète !\n');
  } catch (e) {
    console.error('\n❌ Erreur:', e.message);
    if (e.stack) console.error(e.stack);
    process.exit(1);
  }
  process.exit(0);
}

clearDatabase();

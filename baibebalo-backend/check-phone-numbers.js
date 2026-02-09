/**
 * Script pour vérifier les numéros de téléphone des clients et restaurants
 * Usage: node -r dotenv/config check-phone-numbers.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { query } = require('./src/database/db');

async function checkPhoneNumbers() {
  try {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  VÉRIFICATION DES NUMÉROS DE TÉLÉPHONE');
    console.log('═══════════════════════════════════════════════════════\n');

    // Vérifier les clients (users)
    console.log('📱 CLIENTS (USERS):');
    console.log('─'.repeat(60));
    const usersResult = await query(
      `SELECT 
        id, 
        phone, 
        email, 
        first_name, 
        last_name,
        status,
        created_at
      FROM users 
      ORDER BY created_at DESC`
    );

    if (usersResult.rows.length === 0) {
      console.log('  Aucun client trouvé.\n');
    } else {
      usersResult.rows.forEach((user, index) => {
        const isTestNumber = user.phone.startsWith('+22507000000') || 
                            user.phone.startsWith('+22507') && user.phone.length === 13;
        const status = isTestNumber ? '⚠️  TEST' : '✅ RÉEL';
        console.log(`  ${index + 1}. ${user.first_name || ''} ${user.last_name || ''}`);
        console.log(`     Téléphone: ${user.phone} ${status}`);
        console.log(`     Email: ${user.email || 'N/A'}`);
        console.log(`     Statut: ${user.status}`);
        console.log(`     Créé: ${new Date(user.created_at).toLocaleDateString('fr-FR')}`);
        console.log('');
      });
      console.log(`  Total: ${usersResult.rows.length} clients\n`);
    }

    // Vérifier les restaurants
    console.log('🍽️  RESTAURANTS:');
    console.log('─'.repeat(60));
    const restaurantsResult = await query(
      `SELECT 
        id, 
        name, 
        phone, 
        email,
        status,
        created_at
      FROM restaurants 
      ORDER BY created_at DESC`
    );

    if (restaurantsResult.rows.length === 0) {
      console.log('  Aucun restaurant trouvé.\n');
    } else {
      restaurantsResult.rows.forEach((resto, index) => {
        const isTestNumber = resto.phone.startsWith('+22507000000') || 
                            (resto.phone.startsWith('+22507') && resto.phone.length === 13);
        const status = isTestNumber ? '⚠️  TEST' : '✅ RÉEL';
        console.log(`  ${index + 1}. ${resto.name}`);
        console.log(`     Téléphone: ${resto.phone} ${status}`);
        console.log(`     Email: ${resto.email || 'N/A'}`);
        console.log(`     Statut: ${resto.status}`);
        console.log(`     Créé: ${new Date(resto.created_at).toLocaleDateString('fr-FR')}`);
        console.log('');
      });
      console.log(`  Total: ${restaurantsResult.rows.length} restaurants\n`);
    }

    // Statistiques
    console.log('📊 STATISTIQUES:');
    console.log('─'.repeat(60));
    
    const testUsersCount = usersResult.rows.filter(u => 
      u.phone.startsWith('+22507000000') || 
      (u.phone.startsWith('+22507') && u.phone.length === 13)
    ).length;
    
    const testRestosCount = restaurantsResult.rows.filter(r => 
      r.phone.startsWith('+22507000000') || 
      (r.phone.startsWith('+22507') && r.phone.length === 13)
    ).length;

    console.log(`  Clients réels: ${usersResult.rows.length - testUsersCount}`);
    console.log(`  Clients de test: ${testUsersCount}`);
    console.log(`  Restaurants réels: ${restaurantsResult.rows.length - testRestosCount}`);
    console.log(`  Restaurants de test: ${testRestosCount}`);
    console.log('');

    // Avertissement si tous les numéros sont de test
    if (testUsersCount === usersResult.rows.length && usersResult.rows.length > 0) {
      console.log('⚠️  ATTENTION: Tous les numéros de clients sont de test !');
    }
    if (testRestosCount === restaurantsResult.rows.length && restaurantsResult.rows.length > 0) {
      console.log('⚠️  ATTENTION: Tous les numéros de restaurants sont de test !');
    }

    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkPhoneNumbers();

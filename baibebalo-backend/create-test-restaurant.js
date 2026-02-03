/**
 * Script pour créer un restaurant de test
 * Usage: node create-test-restaurant.js
 */

const { query } = require('./src/database/db');
const bcrypt = require('bcrypt');
const config = require('./src/config');

async function createTestRestaurant() {
  try {
    console.log('🔧 Création d\'un restaurant de test...\n');

    const email = 'restaurant@test.com';
    const password = 'Test123!';
    const name = 'Restaurant Test';

    // Vérifier si le restaurant existe déjà
    const existing = await query(
      'SELECT id, email, status FROM restaurants WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      const restaurant = existing.rows[0];
      console.log('⚠️  Restaurant existant trouvé:');
      console.log(`   Email: ${restaurant.email}`);
      console.log(`   Statut: ${restaurant.status}`);
      
      if (restaurant.status === 'active') {
        console.log('\n✅ Le restaurant est déjà actif !');
        console.log(`   Email: ${email}`);
        console.log(`   Mot de passe: ${password}`);
        return;
      } else {
        // Activer le restaurant existant
        await query(
          'UPDATE restaurants SET status = $1 WHERE id = $2',
          ['active', restaurant.id]
        );
        console.log('\n✅ Restaurant activé !');
        console.log(`   Email: ${email}`);
        console.log(`   Mot de passe: ${password}`);
        return;
      }
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(
      password,
      parseInt(config.security?.bcryptRounds || 10)
    );

    // Créer le restaurant
    const result = await query(
      `INSERT INTO restaurants (
        name, slug, category, cuisine_type, description,
        phone, email, password_hash, address, district,
        latitude, longitude, opening_hours, delivery_radius,
        status, is_open
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id, name, email, status`,
      [
        name,
        'restaurant-test',
        'Restaurant',
        'Ivoirienne',
        'Restaurant de test pour développement',
        '+2250700000000',
        email,
        passwordHash,
        '123 Rue Test, Korhogo',
        'Centre-ville',
        9.4581, // Latitude Korhogo
        -5.6296, // Longitude Korhogo
        JSON.stringify({
          monday: { open: '09:00', close: '22:00', isOpen: true },
          tuesday: { open: '09:00', close: '22:00', isOpen: true },
          wednesday: { open: '09:00', close: '22:00', isOpen: true },
          thursday: { open: '09:00', close: '22:00', isOpen: true },
          friday: { open: '09:00', close: '22:00', isOpen: true },
          saturday: { open: '09:00', close: '22:00', isOpen: true },
          sunday: { open: '09:00', close: '22:00', isOpen: true },
        }),
        15, // Rayon de livraison (15km pour Korhogo)
        'active', // Statut actif directement
        true, // Ouvert
      ]
    );

    console.log('✅ Restaurant de test créé avec succès !\n');
    console.log('📋 Identifiants de connexion:');
    console.log(`   Email: ${email}`);
    console.log(`   Mot de passe: ${password}`);
    console.log(`   Statut: ${result.rows[0].status}`);
    console.log(`   ID: ${result.rows[0].id}\n`);

  } catch (error) {
    console.error('❌ Erreur lors de la création du restaurant:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // Fermer la connexion
    const { pool } = require('./src/database/db');
    await pool.end();
  }
}

// Exécuter
createTestRestaurant();

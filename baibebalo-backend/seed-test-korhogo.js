/**
 * Script pour créer les données de test minimales : 1 restaurant, 1 livreur, 1 client
 * Tous basés à Korhogo pour vos tests.
 *
 * Usage: node seed-test-korhogo.js
 * Ou: npm run seed:korhogo
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { query } = require('./src/database/db');
const bcrypt = require('bcrypt');
const logger = require('./src/utils/logger');

// Coordonnées Korhogo
const KORHOGO = { lat: 9.4581, lng: -5.6296 };

// Identifiants de test
const TEST_ACCOUNTS = {
  restaurant: {
    email: 'korhogo@test.ci',
    password: 'restaurant123',
    name: 'Le Maquis Korhogo',
  },
  livreur: {
    phone: '+2250700000002',
    password: 'livreur123',
    name: 'Test Livreur',
  },
  client: {
    phone: '+2250700000001',
    name: 'Test Client',
  },
};

async function createRestaurant() {
  const { email, password, name } = TEST_ACCOUNTS.restaurant;

  const existing = await query(
    'SELECT id, email, status FROM restaurants WHERE email = $1',
    [email]
  );

  if (existing.rows.length > 0) {
    logger.info(`✓ Restaurant déjà existant: ${email}`);
    return existing.rows[0].id;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await query(
    `INSERT INTO restaurants (
      name, slug, category, cuisine_type, description,
      phone, email, password_hash, address, district,
      latitude, longitude, delivery_radius, commission_rate,
      mobile_money_number, mobile_money_provider,
      status, average_rating, is_open
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    RETURNING id`,
    [
      name,
      'le-maquis-korhogo-test',
      'Restaurant',
      'Maquis',
      'Spécialités du Nord : poulet bicyclette, brochettes, riz gras. Cuisine authentique à Korhogo.',
      '+2250705060708',
      email,
      passwordHash,
      'Quartier Centre-ville, Korhogo',
      'Centre-ville',
      KORHOGO.lat,
      KORHOGO.lng,
      10,
      15.0,
      '+2250705060708',
      'orange_money',
      'active',
      4.5,
      true,
    ]
  );

  const restaurantId = result.rows[0].id;

  // Créer les catégories et plats
  const categories = [
    { name: 'Entrées', order: 0 },
    { name: 'Plats principaux', order: 1 },
    { name: 'Grillades', order: 2 },
    { name: 'Boissons', order: 3 },
  ];

  const categoryIds = {};
  for (const cat of categories) {
    const catRes = await query(
      `INSERT INTO menu_categories (restaurant_id, name, display_order, is_active)
       VALUES ($1, $2, $3, true) RETURNING id`,
      [restaurantId, cat.name, cat.order]
    );
    categoryIds[cat.name] = catRes.rows[0].id;
  }

  const plats = [
    { name: 'Alloco sauce piment', cat: 'Entrées', price: 1000, desc: 'Bananes plantains frites avec sauce piment' },
    { name: 'Salade composée', cat: 'Entrées', price: 1500, desc: 'Salade verte, tomates, concombre' },
    { name: 'Riz gras complet', cat: 'Plats principaux', price: 2000, desc: 'Riz cuisiné à l\'huile avec légumes et viande' },
    { name: 'Attiéké poisson', cat: 'Plats principaux', price: 2500, desc: 'Semoule de manioc avec poisson frit' },
    { name: 'Poulet bicyclette braisé', cat: 'Grillades', price: 3500, desc: 'Poulet fermier braisé aux épices' },
    { name: 'Brochettes mouton', cat: 'Grillades', price: 3000, desc: '5 brochettes marinées aux épices locales' },
    { name: 'Coca-Cola', cat: 'Boissons', price: 500, desc: 'Boisson fraîche' },
    { name: 'Jus de Bissap', cat: 'Boissons', price: 500, desc: 'Jus d\'hibiscus frais' },
  ];

  for (const plat of plats) {
    const catId = categoryIds[plat.cat];
    await query(
      `INSERT INTO menu_items (restaurant_id, category_id, name, description, price, preparation_time, is_available)
       VALUES ($1, $2, $3, $4, $5, 25, true)`,
      [restaurantId, catId, plat.name, plat.desc, plat.price]
    );
  }

  logger.info(`✓ Restaurant créé: ${name} (${plats.length} plats)`);
  return restaurantId;
}

async function createLivreur() {
  const { phone, password, name } = TEST_ACCOUNTS.livreur;

  const existing = await query(
    'SELECT id FROM delivery_persons WHERE phone = $1',
    [phone]
  );

  if (existing.rows.length > 0) {
    logger.info(`✓ Livreur déjà existant: ${phone}`);
    return existing.rows[0].id;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [firstName, lastName] = name.split(' ');

  const result = await query(
    `INSERT INTO delivery_persons (
      phone, password_hash, first_name, last_name,
      vehicle_type, mobile_money_number, mobile_money_provider,
      status, delivery_status, current_latitude, current_longitude,
      average_rating, total_deliveries, completed_deliveries
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING id`,
    [
      phone,
      passwordHash,
      firstName,
      lastName || 'Livreur',
      'moto',
      phone,
      'orange_money',
      'active',
      'available',
      KORHOGO.lat,
      KORHOGO.lng,
      4.8,
      0,
      0,
    ]
  );

  logger.info(`✓ Livreur créé: ${name} (${phone})`);
  return result.rows[0].id;
}

async function createClient() {
  const { phone, name } = TEST_ACCOUNTS.client;

  const existing = await query(
    'SELECT id FROM users WHERE phone = $1',
    [phone]
  );

  let userId;
  if (existing.rows.length > 0) {
    userId = existing.rows[0].id;
    logger.info(`✓ Client déjà existant: ${phone}`);

    // Vérifier si une adresse existe
    const addrCheck = await query(
      'SELECT id FROM addresses WHERE user_id = $1',
      [userId]
    );
    if (addrCheck.rows.length === 0) {
      await query(
        `INSERT INTO addresses (user_id, title, address_line, district, landmark, latitude, longitude, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
        [
          userId,
          'Maison',
          'Rue 42, Quartier Centre-ville',
          'Centre-ville',
          'Près du marché',
          KORHOGO.lat + 0.002,
          KORHOGO.lng - 0.001,
        ]
      );
      logger.info('  → Adresse de livraison ajoutée');
    }
  } else {
    const [firstName, lastName] = name.split(' ');
    const referralCode = 'TEST' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const userResult = await query(
      `INSERT INTO users (phone, first_name, last_name, email, referral_code, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id`,
      [
        phone,
        firstName,
        lastName || 'Client',
        'client@test.ci',
        referralCode,
      ]
    );

    userId = userResult.rows[0].id;

    await query(
      `INSERT INTO addresses (user_id, title, address_line, district, landmark, latitude, longitude, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [
        userId,
        'Maison',
        'Rue 42, Quartier Centre-ville',
        'Centre-ville',
        'Près du marché',
        KORHOGO.lat + 0.002,
        KORHOGO.lng - 0.001,
      ]
    );

    logger.info(`✓ Client créé: ${name} (${phone}) avec adresse`);
  }

  return userId;
}

async function run() {
  try {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  SEED TEST KORHOGO - 1 Restaurant, 1 Livreur, 1 Client');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    await createRestaurant();
    await createLivreur();
    await createClient();

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  IDENTIFIANTS DE TEST');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('  RESTAURANT (app baibebalo-restaurant):');
    console.log(`    Email:    ${TEST_ACCOUNTS.restaurant.email}`);
    console.log(`    Mot de passe: ${TEST_ACCOUNTS.restaurant.password}`);
    console.log('');
    console.log('  LIVREUR (app baibebalo-livreur):');
    console.log(`    Téléphone: ${TEST_ACCOUNTS.livreur.phone}`);
    console.log(`    Mot de passe: ${TEST_ACCOUNTS.livreur.password}`);
    console.log('');
    console.log('  CLIENT (app baibebalo-client-clean):');
    console.log(`    Téléphone: ${TEST_ACCOUNTS.client.phone}`);
    console.log('    → Entrer ce numéro puis demander un code OTP');
    console.log('    → Le code OTP apparaît dans les logs du backend en dev');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  ✅ Seed terminé. Bon test !');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
  } catch (err) {
    logger.error('Erreur seed', err);
    throw err;
  } finally {
    const { pool } = require('./src/database/db');
    await pool.end();
  }
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { run, TEST_ACCOUNTS };

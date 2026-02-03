/**
 * Seed démo Korhogo : 1 restaurant + 1 client + 1 livreur
 * Pour tester : client passe commande → restaurant accepte → livreur assigné
 *
 * Le suivi GPS / position du livreur n'est pas modifié ici :
 * vous pouvez l'implémenter vous-même dans l'app livreur.
 *
 * Usage: node seed-korhogo-demo.js
 */

const { query } = require('./src/database/db');
const bcrypt = require('bcrypt');
const config = require('./src/config');

// Coordonnées Korhogo
const KORHOGO = {
  lat: 9.4581,
  lng: -5.6296,
  city: 'Korhogo',
  district: 'Centre-ville',
};

const BCRYPT_ROUNDS = parseInt(config.security?.bcryptRounds || 10);

// Comptes de test (à réutiliser dans les apps)
const DEMO = {
  restaurant: {
    name: 'Le Maquis Korhogo',
    phone: '+2250712345601',
    email: 'maquis.korhogo@test.ci',
    password: 'Test1234',
    address: 'Avenue de la Paix, Korhogo',
  },
  client: {
    phone: '+2250700000001',
    first_name: 'Jean',
    last_name: 'Kouassi',
    email: 'client.korhogo@test.ci',
    address_label: 'Soba boutique',
    address_line: 'Soba boutique, Korhogo',
  },
  driver: {
    phone: '+2250799999901',
    first_name: 'Mamadou',
    last_name: 'Koné',
    password: 'Test1234',
  },
};

async function ensureRestaurant() {
  const r = DEMO.restaurant;
  const existing = await query(
    "SELECT id, name, status FROM restaurants WHERE phone = $1 OR email = $2",
    [r.phone, r.email]
  );
  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    await query(
      "UPDATE restaurants SET latitude = $1, longitude = $2, district = $3, address = $4, status = 'active', is_open = true WHERE id = $5",
      [KORHOGO.lat, KORHOGO.lng, KORHOGO.district, r.address, row.id]
    );
    console.log('  Restaurant existant mis à jour:', row.name);
    return row.id;
  }
  const passwordHash = await bcrypt.hash(r.password, BCRYPT_ROUNDS);
  const slug = r.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const result = await query(
    `INSERT INTO restaurants (
      name, slug, category, cuisine_type, description, phone, email, password_hash,
      address, district, latitude, longitude, opening_hours, delivery_radius,
      status, is_open
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING id`,
    [
      r.name,
      slug,
      'Restaurant',
      'Maquis',
      'Restaurant de démo Korhogo pour tests',
      r.phone,
      r.email,
      passwordHash,
      r.address,
      KORHOGO.district,
      KORHOGO.lat,
      KORHOGO.lng,
      JSON.stringify({
        monday: { open: '08:00', close: '23:00', isOpen: true },
        tuesday: { open: '08:00', close: '23:00', isOpen: true },
        wednesday: { open: '08:00', close: '23:00', isOpen: true },
        thursday: { open: '08:00', close: '23:00', isOpen: true },
        friday: { open: '08:00', close: '23:00', isOpen: true },
        saturday: { open: '08:00', close: '23:00', isOpen: true },
        sunday: { open: '10:00', close: '22:00', isOpen: true },
      }),
      10,
      'active',
      true,
    ]
  );
  console.log('  Restaurant créé:', r.name);
  return result.rows[0].id;
}

async function ensureCategoryAndItem(restaurantId) {
  const cat = await query(
    'SELECT id FROM menu_categories WHERE restaurant_id = $1 LIMIT 1',
    [restaurantId]
  );
  let categoryId = cat.rows[0]?.id;
  if (!categoryId) {
    const ins = await query(
      `INSERT INTO menu_categories (restaurant_id, name, display_order) VALUES ($1, $2, 1) RETURNING id`,
      [restaurantId, 'Plats']
    );
    categoryId = ins.rows[0].id;
    console.log('  Catégorie menu créée: Plats');
  }
  const item = await query(
    'SELECT id FROM menu_items WHERE restaurant_id = $1 LIMIT 1',
    [restaurantId]
  );
  if (item.rows.length === 0) {
    await query(
      `INSERT INTO menu_items (restaurant_id, category_id, name, description, price, is_available)
       VALUES ($1, $2, $3, $4, $5, true)`,
      [restaurantId, categoryId, 'Poulet braisé + Attiéké', 'Poulet bicyclette braisé, attiéké, sauce tomate', 3500]
    );
    console.log('  Article créé: Poulet braisé + Attiéké (3500 FCFA)');
  }
}

async function ensureClient() {
  const c = DEMO.client;
  const existing = await query('SELECT id FROM users WHERE phone = $1', [c.phone]);
  let userId;
  if (existing.rows.length > 0) {
    userId = existing.rows[0].id;
    console.log('  Client existant:', c.first_name, c.last_name);
  } else {
    const ref = 'REF' + Date.now().toString(36).toUpperCase();
    const ins = await query(
      `INSERT INTO users (phone, first_name, last_name, email, referral_code, status)
       VALUES ($1, $2, $3, $4, $5, 'active') RETURNING id`,
      [c.phone, c.first_name, c.last_name, c.email, ref]
    );
    userId = ins.rows[0].id;
    console.log('  Client créé:', c.first_name, c.last_name);
  }
  const addr = await query(
    'SELECT id FROM addresses WHERE user_id = $1 LIMIT 1',
    [userId]
  );
  if (addr.rows.length === 0) {
    await query(
      `INSERT INTO addresses (user_id, title, address_line, district, latitude, longitude, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [userId, c.address_label, c.address_line, KORHOGO.city, KORHOGO.lat, KORHOGO.lng]
    );
    console.log('  Adresse client créée: Soba boutique, Korhogo');
  }
  return userId;
}

async function ensureDriver() {
  const d = DEMO.driver;
  const existing = await query('SELECT id FROM delivery_persons WHERE phone = $1', [d.phone]);
  if (existing.rows.length > 0) {
    await query(
      `UPDATE delivery_persons SET
        status = 'active', delivery_status = 'available',
        current_latitude = $1, current_longitude = $2
       WHERE id = $3`,
      [KORHOGO.lat, KORHOGO.lng, existing.rows[0].id]
    );
    console.log('  Livreur existant mis à jour (position Korhogo, disponible):', d.first_name, d.last_name);
    return existing.rows[0].id;
  }
  const passwordHash = await bcrypt.hash(d.password, BCRYPT_ROUNDS);
  const result = await query(
    `INSERT INTO delivery_persons (
      phone, password_hash, first_name, last_name,
      status, delivery_status, vehicle_type,
      current_latitude, current_longitude
    ) VALUES ($1, $2, $3, $4, 'active', 'available', 'moto', $5, $6)
    RETURNING id`,
    [d.phone, passwordHash, d.first_name, d.last_name, KORHOGO.lat, KORHOGO.lng]
  );
  console.log('  Livreur créé:', d.first_name, d.last_name);
  return result.rows[0].id;
}

async function main() {
  console.log('\n🌍 Seed démo Korhogo\n');
  console.log('Coordonnées:', KORHOGO.lat, KORHOGO.lng, '-', KORHOGO.city, '\n');

  const restaurantId = await ensureRestaurant();
  await ensureCategoryAndItem(restaurantId);
  await ensureClient();
  await ensureDriver();

  console.log('\n--- Comptes de test ---\n');
  console.log('RESTAURANT (app restaurant)');
  console.log('  Téléphone:', DEMO.restaurant.phone);
  console.log('  Mot de passe:', DEMO.restaurant.password);
  console.log('  Nom:', DEMO.restaurant.name);
  console.log('');
  console.log('CLIENT (app client)');
  console.log('  Téléphone:', DEMO.client.phone);
  console.log('  (connexion OTP avec ce numéro)');
  console.log('  Nom:', DEMO.client.first_name, DEMO.client.last_name);
  console.log('');
  console.log('LIVREUR (app livreur)');
  console.log('  Téléphone:', DEMO.driver.phone);
  console.log('  Mot de passe:', DEMO.driver.password);
  console.log('  Nom:', DEMO.driver.first_name, DEMO.driver.last_name);
  console.log('');
  console.log('--- Scénario de test ---');
  console.log('1. Client : se connecter avec', DEMO.client.phone, ', ajouter un plat, passer commande (adresse Soba boutique).');
  console.log('2. Restaurant : se connecter avec', DEMO.restaurant.phone, ', accepter la commande.');
  console.log('3. Admin ou logique backend : assigner un livreur (ou auto-assign si déjà en place).');
  console.log('4. Livreur : se connecter avec', DEMO.driver.phone, ', voir la course, se déplacer.');
  console.log('');
  console.log('Le suivi GPS (position du livreur en temps réel) reste à implémenter dans l\'app livreur si vous le souhaitez.');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

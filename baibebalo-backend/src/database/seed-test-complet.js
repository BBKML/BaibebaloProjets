/**
 * Seed de données de test COMPLET pour Baibebalo
 * - Images (logos restaurants, plats, photos livreurs, utilisateurs)
 * - Tous les statuts de commande
 * - Avis, tickets support, notifications, promos
 * - Identifiants de test documentés pour tester chaque app
 *
 * Usage: node -r dotenv/config src/database/seed-test-complet.js
 * Ou: npm run seed:test (à ajouter dans package.json)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { query } = require('./db');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');

// URLs d'images de test (Picsum - images libres, stables avec seed)
const img = (seed, w = 400, h = 300) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

const random = {
  element: (arr) => arr[Math.floor(Math.random() * arr.length)],
  number: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  decimal: (min, max, d = 2) => (Math.random() * (max - min) + min).toFixed(d),
  phone: () => `+22507${random.number(10000000, 99999999)}`,
  slug: (name) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
};

// --- 1. ADMIN (créé par migrate; on s'assure qu'il existe) ---
async function ensureAdmin() {
  const r = await query('SELECT id FROM admins LIMIT 1');
  if (r.rows.length > 0) {
    logger.info('✓ Admin existe déjà');
    return r.rows[0].id;
  }
  const hash = await bcrypt.hash('Admin@2025!', 10);
  await query(
    `INSERT INTO admins (email, password_hash, full_name, role, permissions, profile_picture)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    ['admin@baibebalo.ci', hash, 'Super Admin', 'super_admin', JSON.stringify({ all: true }), img('admin1', 200, 200)]
  );
  const id = (await query('SELECT id FROM admins WHERE email = $1', ['admin@baibebalo.ci'])).rows[0].id;
  logger.info('✓ Admin créé: admin@baibebalo.ci / Admin@2025!');
  return id;
}

// --- 2. UTILISATEURS (clients) avec adresses et images ---
async function seedUsers(adminId) {
  const testUsers = [
    { first_name: 'Test', last_name: 'Client', phone: '+2250700000001', email: 'client@test.ci' },
    { first_name: 'Aya', last_name: 'Koné', phone: random.phone(), email: 'aya.kone@example.com' },
    { first_name: 'Mamadou', last_name: 'Traoré', phone: random.phone(), email: 'mamadou.t@example.com' },
    { first_name: 'Fatou', last_name: 'Diomandé', phone: random.phone(), email: 'fatou.d@example.com' },
    { first_name: 'Bakary', last_name: 'Coulibaly', phone: random.phone(), email: 'bakary.c@example.com' },
    { first_name: 'Aminata', last_name: 'Silué', phone: random.phone(), email: 'aminata.s@example.com' },
  ];
  const userIds = [];
  const districts = ['Centre-ville', 'Koko', 'Tchengué', 'Petit Paris', 'Belleville'];
  for (let i = 0; i < testUsers.length; i++) {
    const u = testUsers[i];
    const r = await query(
      `INSERT INTO users (phone, email, first_name, last_name, profile_picture, gender, loyalty_points, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (phone) DO UPDATE SET first_name = $3, last_name = $4, profile_picture = $5 RETURNING id`,
      [u.phone, u.email, u.first_name, u.last_name, img(`user${i + 1}`, 200, 200), random.element(['male', 'female']), random.number(0, 500), 'active']
    );
    const uid = r.rows[0].id;
    userIds.push(uid);
    const numAddr = i === 0 ? 2 : random.number(1, 2);
    for (let j = 0; j < numAddr; j++) {
      const lat = 9.45 + (Math.random() * 0.04 - 0.02);
      const lng = -5.63 + (Math.random() * 0.04 - 0.02);
      await query(
        `INSERT INTO addresses (user_id, title, address_line, district, landmark, latitude, longitude, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [uid, j === 0 ? 'Maison' : 'Bureau', `Rue ${random.number(1, 80)}, ${random.element(districts)}`, random.element(districts), j === 0 ? 'Près du marché' : null, lat, lng, j === 0]
      );
    }
  }
  logger.info(`✓ ${userIds.length} utilisateurs (clients) créés. Test: +2250700000001 (OTP)`);
  return userIds;
}

// --- 3. RESTAURANTS avec logo, bannière, menus et photos des plats ---
async function seedRestaurants() {
  const passwordHash = await bcrypt.hash('restaurant123', 10);
  const restos = [
    { name: 'Chez Tantine Fatou', cuisine: 'Cuisine du Nord', desc: 'Spécialités du Nord : riz gras, tô, sauces. Cuisine familiale.', district: 'Tchengué' },
    { name: 'Le Maquis du Nord', cuisine: 'Maquis', desc: 'Grillades et poulet bicyclette. Brochettes, capitaine braisé.', district: 'Centre-ville' },
    { name: 'Restaurant Waraba', cuisine: 'Sénoufo', desc: 'Cuisine traditionnelle sénoufo. Tô sauce feuille, pintade grillée.', district: 'Koko' },
    { name: 'Fast Food City', cuisine: 'Fast-food', desc: 'Burgers, chawarma, sandwichs. Service rapide.', district: 'Centre-ville' },
    { name: 'La Terrasse Korhogo', cuisine: 'Internationale', desc: 'Terrasse. Cuisine variée européenne et africaine.', district: 'Belleville' },
    { name: 'Restaurant Test (login)', cuisine: 'Ivoirienne', desc: 'Restaurant pour tests. Email: restaurant@test.ci', district: 'Centre-ville' },
  ];
  const restaurantIds = [];
  for (let i = 0; i < restos.length; i++) {
    const r = restos[i];
    const slug = random.slug(r.name) + (i === 5 ? '-test' : '') + '-' + random.number(100, 999);
    const email = i === 5 ? 'restaurant@test.ci' : `contact@${slug}.ci`;
    const lat = 9.452 + (i * 0.002);
    const lng = -5.628 - (i * 0.002);
    await query(
      `INSERT INTO restaurants (
        name, slug, category, cuisine_type, description, logo, banner, phone, email, password_hash,
        address, district, latitude, longitude, delivery_radius, commission_rate,
        mobile_money_number, mobile_money_provider, status, average_rating, is_open
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT (slug) DO NOTHING`,
      [
        r.name, slug, 'Restaurant', r.cuisine, r.desc,
        img(`resto-logo-${i}`, 200, 200), img(`resto-banner-${i}`, 800, 300),
        random.phone(), email, passwordHash,
        `${random.number(1, 50)} Ave ${r.district}`, r.district, lat, lng,
        8.0, 15.0, random.phone(), random.element(['orange_money', 'mtn_money']),
        'active', random.decimal(3.8, 5.0, 1), true
      ]
    );
    const res = await query('SELECT id FROM restaurants WHERE slug = $1 OR email = $2', [slug, email]);
    const rid = res.rows[0]?.id;
    if (!rid) continue;
    if (!restaurantIds.includes(rid)) restaurantIds.push(rid);

    const catNames = ['Entrées', 'Plats principaux', 'Grillades', 'Boissons', 'Desserts'];
    const categoryIds = {};
    for (let c = 0; c < catNames.length; c++) {
      const cr = await query(
        'INSERT INTO menu_categories (restaurant_id, name, display_order, is_active) VALUES ($1, $2, $3, true) RETURNING id',
        [rid, catNames[c], c]
      );
      categoryIds[catNames[c]] = cr.rows[0].id;
    }

    const plats = [
      { name: 'Alloco sauce piment', cat: 'Entrées', price: 1000 },
      { name: 'Salade composée', cat: 'Entrées', price: 1500 },
      { name: 'Poulet bicyclette braisé', cat: 'Plats principaux', price: 3500 },
      { name: 'Riz gras complet', cat: 'Plats principaux', price: 2000 },
      { name: 'Attiéké poisson', cat: 'Plats principaux', price: 2500 },
      { name: 'Brochettes mouton', cat: 'Grillades', price: 3000 },
      { name: 'Capitaine braisé', cat: 'Grillades', price: 3500 },
      { name: 'Coca-Cola', cat: 'Boissons', price: 500 },
      { name: 'Bissap', cat: 'Boissons', price: 500 },
      { name: 'Salade de fruits', cat: 'Desserts', price: 1000 },
    ];
    for (let p = 0; p < plats.length; p++) {
      const plat = plats[p];
      const cid = categoryIds[plat.cat] || categoryIds['Plats principaux'];
      await query(
        `INSERT INTO menu_items (restaurant_id, category_id, name, description, price, photo, preparation_time, is_available, total_sold)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)`,
        [rid, cid, plat.name, `Délicieux ${plat.name}.`, plat.price, img(`plat-${i}-${p}`, 400, 300), random.number(15, 40), random.number(0, 50)]
      );
    }
  }
  logger.info(`✓ ${restaurantIds.length} restaurants avec logos, bannières et plats (photos). Test: restaurant@test.ci / restaurant123`);
  return restaurantIds;
}

// --- 4. LIVREURS avec photo de profil et position ---
async function seedDeliveryPersons() {
  const passwordHash = await bcrypt.hash('livreur123', 10);
  const names = [
    { first: 'Kouassi', last: 'Jean' },
    { first: 'Adama', last: 'Soro' },
    { first: 'Test', last: 'Livreur' },
    { first: 'Moussa', last: 'Diallo' },
    { first: 'Aïcha', last: 'Ouattara' },
    { first: 'Ibrahim', last: 'Cissé' },
  ];
  const deliveryIds = [];
  for (let i = 0; i < names.length; i++) {
    const phone = i === 2 ? '+2250700000002' : random.phone();
    await query(
      `INSERT INTO delivery_persons (
        phone, password_hash, first_name, last_name, profile_photo, vehicle_type,
        mobile_money_number, mobile_money_provider, status, delivery_status,
        current_latitude, current_longitude, average_rating, total_deliveries, total_earnings, available_balance
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (phone) DO UPDATE SET first_name = $3, last_name = $4, profile_photo = $5 RETURNING id`,
      [
        phone, passwordHash, names[i].first, names[i].last, img(`livreur-${i}`, 200, 200),
        random.element(['moto', 'moto', 'bike']), random.phone(), 'orange_money',
        'active', i < 3 ? 'available' : random.element(['offline', 'available']),
        9.45 + (i * 0.005), -5.63 - (i * 0.005),
        random.decimal(4.0, 5.0, 1), random.number(20, 200), random.number(50000, 200000), random.number(5000, 50000)
      ]
    );
    const r = await query('SELECT id FROM delivery_persons WHERE phone = $1', [phone]);
    if (r.rows.length) deliveryIds.push(r.rows[0].id);
  }
  logger.info(`✓ ${deliveryIds.length} livreurs avec photo. Test: +2250700000002 / livreur123 (ou OTP)`);
  return deliveryIds;
}

// --- 5. COMMANDES (tous les statuts) ---
async function seedOrders(userIds, restaurantIds, deliveryIds) {
  const statuses = ['new', 'accepted', 'preparing', 'ready', 'delivering', 'delivered', 'delivered', 'cancelled'];
  const districts = ['Centre-ville', 'Koko', 'Tchengué', 'Petit Paris'];
  const seedPrefix = `BAIB-T${Date.now().toString(36).slice(-6)}`;
  for (let i = 0; i < 35; i++) {
    const status = statuses[i % statuses.length];
    const userId = random.element(userIds);
    const restaurantId = random.element(restaurantIds);
    const deliveryPersonId = ['ready', 'delivering', 'delivered'].includes(status) ? random.element(deliveryIds) : null;
    const subtotal = random.number(3000, 15000);
    const deliveryFee = 500;
    const total = subtotal + deliveryFee;
    const lat = 9.45 + (Math.random() * 0.03 - 0.015);
    const lng = -5.63 + (Math.random() * 0.03 - 0.015);
    const orderNumber = `${seedPrefix}-${i + 1}`;
    const placedAt = new Date(Date.now() - random.number(0, 14) * 24 * 60 * 60 * 1000);
    const acceptedAt = status !== 'new' ? new Date(placedAt.getTime() + 5 * 60000) : null;
    const readyAt = ['ready', 'delivering', 'delivered'].includes(status) ? new Date(placedAt.getTime() + 25 * 60000) : null;
    const pickedUpAt = ['delivering', 'delivered'].includes(status) ? new Date(placedAt.getTime() + 30 * 60000) : null;
    const deliveredAt = status === 'delivered' ? new Date(placedAt.getTime() + 45 * 60000) : null;
    const cancelledAt = status === 'cancelled' ? new Date(placedAt.getTime() + 10 * 60000) : null;

    await query(
      `INSERT INTO orders (
        order_number, user_id, restaurant_id, delivery_person_id,
        subtotal, delivery_fee, discount, total, delivery_address, delivery_distance,
        payment_method, payment_status, status,
        placed_at, accepted_at, ready_at, picked_up_at, delivering_at, delivered_at, cancelled_at,
        cancellation_reason, estimated_delivery_time
      ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
      [
        orderNumber, userId, restaurantId, deliveryPersonId,
        subtotal, deliveryFee, total,
        JSON.stringify({
          title: 'Maison',
          address_line: `Rue ${random.number(1, 60)}, ${random.element(districts)}`,
          district: random.element(districts),
          landmark: 'Près du marché',
          latitude: lat,
          longitude: lng,
        }),
        random.decimal(1.5, 5.0, 1),
        random.element(['cash', 'orange_money', 'mtn_money']),
        status === 'delivered' ? 'paid' : status === 'cancelled' ? 'pending' : 'pending',
        status,
        placedAt, acceptedAt, readyAt, pickedUpAt, status === 'delivering' || status === 'delivered' ? pickedUpAt : null, deliveredAt, cancelledAt,
        status === 'cancelled' ? 'Annulation test' : null,
        45
      ]
    );
    const orderRes = await query('SELECT id FROM orders WHERE order_number = $1', [orderNumber]);
    const orderId = orderRes.rows[0].id;
    const menuRes = await query('SELECT id, name, price FROM menu_items WHERE restaurant_id = $1 LIMIT 5', [restaurantId]);
    for (let k = 0; k < Math.min(3, menuRes.rows.length); k++) {
      const mi = menuRes.rows[k];
      const qty = random.number(1, 2);
      await query(
        `INSERT INTO order_items (order_id, menu_item_id, menu_item_snapshot, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, mi.id, JSON.stringify({ name: mi.name, price: mi.price }), qty, mi.price, mi.price * qty]
      );
    }
  }
  logger.info('✓ ~35 commandes créées (tous statuts: new, accepted, preparing, ready, delivering, delivered, cancelled)');
}

// --- 6. AVIS (reviews) ---
async function seedReviews(userIds, restaurantIds, deliveryIds) {
  const orders = (await query("SELECT id, user_id, restaurant_id, delivery_person_id FROM orders WHERE status = 'delivered' LIMIT 15")).rows;
  for (const o of orders) {
    const exists = (await query('SELECT 1 FROM reviews WHERE order_id = $1 AND user_id = $2', [o.id, o.user_id])).rows.length > 0;
    if (exists) continue;
    await query(
      `INSERT INTO reviews (order_id, user_id, restaurant_id, delivery_person_id, restaurant_rating, delivery_rating, food_quality, speed, comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [o.id, o.user_id, o.restaurant_id, o.delivery_person_id, random.number(3, 5), random.number(3, 5), random.number(3, 5), random.number(3, 5), random.element(['Très bien !', 'Rapide et bon.', 'Parfait.', null])]
    );
  }
  logger.info('✓ Avis créés sur des commandes livrées');
}

// --- 7. TICKETS SUPPORT ---
async function seedTickets(userIds, restaurantIds, deliveryIds, adminId) {
  const subjects = ['Livraison en retard', 'Article manquant', 'Paiement', 'Qualité', 'Question'];
  const statuses = ['open', 'in_progress', 'resolved', 'closed'];
  for (let i = 0; i < 8; i++) {
    const userType = random.element(['user', 'restaurant', 'delivery']);
    let uid = null;
    if (userType === 'user') uid = random.element(userIds);
    else if (userType === 'restaurant') uid = random.element(restaurantIds);
    else uid = random.element(deliveryIds);
    const tnRes = await query('SELECT generate_ticket_number() as ticket_number');
    const tn = tnRes.rows[0].ticket_number;
    await query(
      `INSERT INTO support_tickets (ticket_number, subject, description, category, priority, user_type, user_id, status, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [tn, random.element(subjects), 'Description du problème pour test.', 'order', 'medium', userType, uid, random.element(statuses), adminId]
    );
  }
  logger.info('✓ Tickets support créés');
}

// --- 8. NOTIFICATIONS ---
async function seedNotifications(userIds, restaurantIds, deliveryIds) {
  const types = ['order', 'promo', 'system', 'delivery'];
  for (const uid of userIds.slice(0, 4)) {
    await query(
      `INSERT INTO notifications (user_type, user_id, type, title, message, data, read_at) VALUES ('user', $1, 'promo', $2, $3, $4, NULL)`,
      [uid, 'Bienvenue sur Baibebalo', 'Passez votre première commande et bénéficiez de -20% avec le code BIENVENUE.', JSON.stringify({ type: 'promo' })]
    );
  }
  for (const rid of restaurantIds.slice(0, 2)) {
    await query(
      `INSERT INTO notifications (user_type, user_id, type, title, message, data, read_at) VALUES ('restaurant', $1, 'order', $2, $3, $4, NULL)`,
      [rid, 'Nouvelle commande', 'Vous avez reçu une nouvelle commande.', JSON.stringify({ type: 'order' })]
    );
  }
  for (const did of deliveryIds.slice(0, 2)) {
    await query(
      `INSERT INTO notifications (user_type, user_id, type, title, message, data, read_at) VALUES ('delivery', $1, 'delivery', $2, $3, $4, NULL)`,
      [did, 'Course disponible', 'Une nouvelle course est disponible près de vous.', JSON.stringify({ type: 'delivery' })]
    );
  }
  logger.info('✓ Notifications créées (user, restaurant, delivery)');
}

// --- 9. PROMOTIONS ---
async function seedPromotions() {
  const promos = [
    { code: 'BIENVENUE', type: 'percentage', value: 20, min_order: 3000 },
    { code: 'LIVRAISON', type: 'free_delivery', value: 500, min_order: 5000 },
    { code: 'WEEKEND', type: 'percentage', value: 15, min_order: 5000 },
    { code: 'TEST2025', type: 'fixed_amount', value: 1000, min_order: 8000 },
  ];
  for (const p of promos) {
    await query(
      `INSERT INTO promotions (code, type, value, min_order_amount, valid_from, valid_until, applicable_to, is_active)
       VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '90 days', 'all', true)
       ON CONFLICT (code) DO UPDATE SET value = $3, is_active = true`,
      [p.code, p.type, p.value, p.min_order]
    );
  }
  logger.info('✓ Codes promo: BIENVENUE, LIVRAISON, WEEKEND, TEST2025');
}

// --- 10. BANNIÈRE PUBLIQUE (optionnel) ---
async function seedAds() {
  try {
    const exists = await query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'ad_pricing'`);
    if (exists.rows.length === 0) return;
    logger.info('✓ Table ad_pricing présente (tarifs pub)');
  } catch (e) {
    logger.warn('Seed ads ignoré:', e.message);
  }
}

// --- MAIN ---
async function run() {
  try {
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('  SEED TEST COMPLET - Baibebalo (avec images)');
    logger.info('═══════════════════════════════════════════════════════');
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Ne pas exécuter en production.');
    }

    const adminId = await ensureAdmin();
    const userIds = await seedUsers(adminId);
    const restaurantIds = await seedRestaurants();
    const deliveryIds = await seedDeliveryPersons();
    await seedOrders(userIds, restaurantIds, deliveryIds);
    await seedReviews(userIds, restaurantIds, deliveryIds);
    await seedTickets(userIds, restaurantIds, deliveryIds, adminId);
    await seedNotifications(userIds, restaurantIds, deliveryIds);
    await seedPromotions();
    await seedAds();

    logger.info('');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('  IDENTIFIANTS DE TEST');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('  Admin:     admin@baibebalo.ci / Admin@2025!');
    logger.info('  Restaurant: restaurant@test.ci / restaurant123');
    logger.info('  Client:    Téléphone +2250700000001 → Envoyer OTP puis vérifier (app client)');
    logger.info('  Livreur:   Téléphone +2250700000002 → OTP ou livreur123 si login direct');
    logger.info('  Promos:    BIENVENUE, LIVRAISON, WEEKEND, TEST2025');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('  ✅ Seed terminé.');
    logger.info('═══════════════════════════════════════════════════════');
  } catch (err) {
    logger.error('Erreur seed', err);
    throw err;
  }
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { run };

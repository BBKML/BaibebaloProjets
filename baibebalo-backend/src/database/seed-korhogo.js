/**
 * Script de seed pour données de test - KORHOGO
 * ATTENTION: N'utiliser qu'en développement !
 */

const { query } = require('./db');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');

// Générateur de données aléatoires
const random = {
  element: (arr) => arr[Math.floor(Math.random() * arr.length)],
  number: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  decimal: (min, max, decimals = 2) => (Math.random() * (max - min) + min).toFixed(decimals),
  boolean: () => Math.random() > 0.5,
  phone: () => `+22507${random.number(10000000, 99999999)}`,
  slug: (name) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
};

// Données de test pour KORHOGO
const testData = {
  districts: [
    'Tchenguele', 'Koko', 'Centre-ville', 'Petit Paris', 
    'Belleville', 'Zone résidentielle', 'Commerce', 'Air France'
  ],
  
  cuisineTypes: [
    'Cuisine du Nord', 'Maquis', 'Traditionnelle Sénoufo', 'Fast-Food',
    'Internationale', 'Grillades', 'Ivoirienne', 'Africaine'
  ],

  firstNames: [
    'Mamadou', 'Fatoumata', 'Bakary', 'Aissata', 'Sekou', 'Aminata',
    'Yao', 'Mariam', 'Kouassi', 'Djénéba', 'Karim', 'Aya'
  ],

  lastNames: [
    'Koné', 'Traoré', 'Diomandé', 'Coulibaly', 'Silué',
    'Ouattara', 'Doumbia', 'Touré', 'Fofana', 'Sangaré'
  ],

  // Restaurants typiques de Korhogo
  restaurants: [
    {
      name: 'Chez Tantine Fatoumata',
      cuisine_type: 'Cuisine du Nord',
      district: 'Tchenguele',
      description: 'Spécialités du Nord : Riz gras, Tô, Sauce arachide. Cuisine familiale authentique',
      dishes: [
        { name: 'Riz Gras Complet', category: 'Plats Principaux', price: 2000, desc: 'Riz cuisiné à l\'huile avec légumes, viande de mouton et épices locales' },
        { name: 'Tô Sauce Arachide', category: 'Plats Principaux', price: 1800, desc: 'Pâte de mil accompagnée de sauce à base d\'arachide et viande' },
        { name: 'Tô Sauce Gombo', category: 'Plats Principaux', price: 1500, desc: 'Pâte de mil avec sauce gombo frais et poisson fumé' },
        { name: 'Foutou Banane Sauce Graine', category: 'Plats Principaux', price: 2200, desc: 'Foutou de banane plantain avec sauce graine traditionnelle' },
        { name: 'Poulet Bicyclette Braisé', category: 'Grillades', price: 3500, desc: 'Poulet fermier braisé aux épices du Nord' },
        { name: 'Alloco Sauce Piment', category: 'Entrées', price: 1000, desc: 'Bananes plantains frites avec sauce piment maison' },
        { name: 'Jus de Bissap', category: 'Boissons', price: 500, desc: 'Jus d\'hibiscus frais sucré au miel' },
        { name: 'Jus de Gingembre', category: 'Boissons', price: 500, desc: 'Jus de gingembre frais épicé' },
      ]
    },
    {
      name: 'Le Maquis du Nord',
      cuisine_type: 'Maquis',
      district: 'Centre-ville',
      description: 'Grillades et spécialités locales. Poulet bicyclette, brochettes, capitaine braisé',
      dishes: [
        { name: 'Poulet Bicyclette Grillé', category: 'Grillades', price: 4500, desc: 'Poulet fermier entier grillé aux épices, servi avec attiéké' },
        { name: 'Brochettes de Mouton', category: 'Grillades', price: 3000, desc: '5 brochettes de mouton marinées aux épices locales' },
        { name: 'Capitaine Braisé', category: 'Grillades', price: 3500, desc: 'Poisson capitaine frais braisé avec sauce tomate' },
        { name: 'Côtelettes de Porc', category: 'Grillades', price: 3800, desc: 'Côtelettes de porc grillées avec marinade maison' },
        { name: 'Attiéké Poisson', category: 'Plats Principaux', price: 2500, desc: 'Semoule de manioc avec poisson frit et sauce tomate' },
        { name: 'Placali Sauce Graine', category: 'Plats Principaux', price: 2000, desc: 'Pâte de manioc fermenté avec sauce palmiste' },
        { name: 'Tchapalo Frais', category: 'Boissons', price: 800, desc: 'Bière traditionnelle de mil (boisson locale)' },
      ]
    },
    {
      name: 'Restaurant Waraba',
      cuisine_type: 'Traditionnelle Sénoufo',
      district: 'Koko',
      description: 'Cuisine traditionnelle sénoufo. Tô sauce feuille, sauce gombo, viande de brousse',
      dishes: [
        { name: 'Tô Sauce Feuilles', category: 'Plats Principaux', price: 2500, desc: 'Pâte de mil avec sauce feuilles de baobab et viande de brousse' },
        { name: 'Riz Sauce Arachide', category: 'Plats Principaux', price: 2000, desc: 'Riz blanc avec sauce arachide épaisse et viande' },
        { name: 'Sauce Djouka', category: 'Plats Principaux', price: 1800, desc: 'Sauce tomate épicée avec aubergines et gombo, servie avec Tô' },
        { name: 'Pintade Grillée', category: 'Grillades', price: 5000, desc: 'Pintade fermière grillée aux épices sénoufo' },
        { name: 'Viande de Brousse Fumée', category: 'Spécialités', price: 4000, desc: 'Viande d\'aulacodes fumée avec sauce pimentée' },
        { name: 'Galettes de Mil', category: 'Desserts', price: 1000, desc: 'Galettes traditionnelles de mil avec du miel' },
        { name: 'Lait Caillé Sucré', category: 'Boissons', price: 600, desc: 'Lait fermenté traditionnel sucré au miel' },
      ]
    },
    {
      name: 'Fast Food City',
      cuisine_type: 'Fast-Food',
      district: 'Centre-ville',
      description: 'Burgers, chawarma, sandwichs et jus naturels. Service rapide',
      dishes: [
        { name: 'Burger du Nord', category: 'Burgers', price: 2000, desc: 'Burger avec steak de bœuf local, légumes frais et sauce épicée' },
        { name: 'Chawarma Poulet', category: 'Sandwichs', price: 1500, desc: 'Pain pita avec poulet grillé, crudités et sauce blanche' },
        { name: 'Chawarma Viande', category: 'Sandwichs', price: 1800, desc: 'Pain pita avec viande de bœuf grillée et légumes' },
        { name: 'Sandwich Omelette', category: 'Sandwichs', price: 1000, desc: 'Pain avec omelette, salade, tomate et mayonnaise' },
        { name: 'Frites Portion Moyenne', category: 'Accompagnements', price: 800, desc: 'Pommes de terre frites croustillantes' },
        { name: 'Jus d\'Orange Frais', category: 'Boissons', price: 700, desc: 'Jus d\'orange pressé minute' },
        { name: 'Jus de Mangue', category: 'Boissons', price: 800, desc: 'Jus de mangue naturel du verger local' },
      ]
    },
    {
      name: 'La Terrasse du Poro',
      cuisine_type: 'Internationale',
      district: 'Zone résidentielle',
      description: 'Restaurant moderne avec terrasse. Cuisine variée : Européenne, Africaine, Asiatique',
      dishes: [
        { name: 'Escalope Milanaise', category: 'Plats Principaux', price: 4500, desc: 'Escalope de poulet panée, frites et salade' },
        { name: 'Brochettes de Bœuf', category: 'Grillades', price: 5000, desc: 'Brochettes de filet de bœuf avec légumes grillés' },
        { name: 'Poulet Yassa', category: 'Plats Principaux', price: 3500, desc: 'Poulet mariné aux oignons et citron, riz blanc' },
        { name: 'Poisson Grillé Entier', category: 'Grillades', price: 4000, desc: 'Poisson carpe entier grillé avec légumes' },
        { name: 'Salade Mixte', category: 'Entrées', price: 2000, desc: 'Salade verte, tomates, concombre, œuf dur, vinaigrette' },
        { name: 'Tiep Bou Dien', category: 'Plats Principaux', price: 3800, desc: 'Riz au poisson sénégalais avec légumes' },
        { name: 'Crème Caramel', category: 'Desserts', price: 1500, desc: 'Dessert onctueux au caramel' },
        { name: 'Café Liégeois', category: 'Boissons', price: 1200, desc: 'Café glacé avec crème chantilly' },
      ]
    },
  ],
};

// Seed des utilisateurs
const seedUsers = async (count = 20) => {
  logger.info(`Création de ${count} utilisateurs de Korhogo...`);
  const users = [];

  for (let i = 0; i < count; i++) {
    const firstName = random.element(testData.firstNames);
    const lastName = random.element(testData.lastNames);
    
    const result = await query(
      `INSERT INTO users (
        phone, email, first_name, last_name, 
        gender, loyalty_points, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        random.phone(),
        `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        firstName,
        lastName,
        random.element(['male', 'female']),
        random.number(0, 1000),
        'active'
      ]
    );

    users.push(result.rows[0].id);

    // Ajouter 1-3 adresses par utilisateur à Korhogo
    const numAddresses = random.number(1, 3);
    for (let j = 0; j < numAddresses; j++) {
      await query(
        `INSERT INTO addresses (
          user_id, title, address_line, district,
          latitude, longitude, is_default
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          result.rows[0].id,
          j === 0 ? 'Maison' : j === 1 ? 'Bureau' : 'Autre',
          `Rue ${random.number(1, 50)}, ${random.element(testData.districts)}`,
          random.element(testData.districts),
          9.4500 + (Math.random() * 0.05 - 0.025), // Korhogo coords
          -5.6300 + (Math.random() * 0.05 - 0.025),
          j === 0
        ]
      );
    }
  }

  logger.info(`✓ ${count} utilisateurs de Korhogo créés`);
  return users;
};

// Seed des restaurants de Korhogo avec leurs plats
const seedRestaurants = async () => {
  logger.info(`Création des restaurants de Korhogo...`);
  const restaurants = [];
  const password = await bcrypt.hash('restaurant123', 10);

  for (const resto of testData.restaurants) {
    // Créer le restaurant
    const result = await query(
      `INSERT INTO restaurants (
        name, slug, category, cuisine_type, description,
        phone, email, password_hash, address, district,
        latitude, longitude, delivery_radius,
        commission_rate, mobile_money_number, mobile_money_provider,
        status, average_rating, is_open
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id`,
      [
        resto.name,
        random.slug(resto.name),
        'Restaurant',
        resto.cuisine_type,
        resto.description,
        random.phone(),
        `contact@${random.slug(resto.name)}.ci`,
        password,
        `Quartier ${resto.district}`,
        resto.district,
        9.4500 + (Math.random() * 0.03 - 0.015), // Korhogo
        -5.6300 + (Math.random() * 0.03 - 0.015),
        random.decimal(5, 15, 1),
        15.0,
        random.phone(),
        random.element(['orange_money', 'mtn_money']),
        'active',
        random.decimal(4.0, 5.0, 1),
        true
      ]
    );

    const restaurantId = result.rows[0].id;
    restaurants.push(restaurantId);

    logger.info(`  ✓ ${resto.name} créé`);

    // Créer les catégories de menu
    const categories = ['Entrées', 'Plats Principaux', 'Grillades', 'Accompagnements', 'Boissons', 'Desserts', 'Spécialités'];
    const categoryIds = {};

    for (const [index, catName] of categories.entries()) {
      const catResult = await query(
        `INSERT INTO menu_categories (restaurant_id, name, display_order, is_active)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [restaurantId, catName, index, true]
      );
      categoryIds[catName] = catResult.rows[0].id;
    }

    // Créer les plats
    for (const dish of resto.dishes) {
      const categoryId = categoryIds[dish.category];
      
      await query(
        `INSERT INTO menu_items (
          restaurant_id, category_id, name, description,
          price, preparation_time, is_available, total_sold
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          restaurantId,
          categoryId,
          dish.name,
          dish.desc,
          dish.price,
          random.number(15, 45),
          true,
          random.number(0, 100)
        ]
      );
    }

    logger.info(`    → ${resto.dishes.length} plats ajoutés`);
  }

  logger.info(`✓ ${testData.restaurants.length} restaurants de Korhogo créés avec leurs menus`);
  return restaurants;
};

// Seed des livreurs
const seedDeliveryPersons = async (count = 10) => {
  logger.info(`Création de ${count} livreurs...`);
  const deliveryPersons = [];
  const password = await bcrypt.hash('livreur123', 10);

  for (let i = 0; i < count; i++) {
    const firstName = random.element(testData.firstNames);
    const lastName = random.element(testData.lastNames);
    
    const result = await query(
      `INSERT INTO delivery_persons (
        phone, password_hash, first_name, last_name,
        vehicle_type, mobile_money_number, mobile_money_provider,
        status, delivery_status, average_rating,
        total_deliveries, completed_deliveries
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
      [
        random.phone(),
        password,
        firstName,
        lastName,
        random.element(['moto', 'moto', 'moto', 'bike']),
        random.phone(),
        random.element(['orange_money', 'mtn_money']),
        random.element(['active', 'active', 'pending']),
        random.element(['offline', 'available', 'busy']),
        random.decimal(4.0, 5.0, 1),
        random.number(10, 200),
        random.number(10, 200)
      ]
    );

    deliveryPersons.push(result.rows[0].id);
  }

  logger.info(`✓ ${count} livreurs créés`);
  return deliveryPersons;
};

// Seed des commandes
const seedOrders = async (users, restaurants, deliveryPersons, count = 50) => {
  logger.info(`Création de ${count} commandes...`);
  const statuses = ['delivered', 'delivered', 'delivered', 'delivering', 'preparing', 'new', 'cancelled'];
  const orders = [];

  // Récupérer le dernier numéro de commande
  const lastOrderResult = await query(
    `SELECT order_number FROM orders ORDER BY created_at DESC LIMIT 1`
  );
  
  let startNumber = 10000;
  if (lastOrderResult.rows.length > 0) {
    const lastNumber = parseInt(lastOrderResult.rows[0].order_number.replace('BAIB-', ''));
    startNumber = lastNumber + 1;
  }

  for (let i = 0; i < count; i++) {
    const status = random.element(statuses);
    const userId = random.element(users);
    const restaurantId = random.element(restaurants);
    const deliveryPersonId = status === 'new' ? null : random.element(deliveryPersons);
    
    const subtotal = random.number(2000, 15000);
    const deliveryFee = 500;
    const discount = random.boolean() ? random.number(0, 1000) : 0;
    const total = subtotal + deliveryFee - discount;

    const orderResult = await query(
      `INSERT INTO orders (
        order_number, user_id, restaurant_id, delivery_person_id,
        subtotal, delivery_fee, discount, total,
        delivery_address, payment_method, payment_status,
        status, placed_at, accepted_at, delivered_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id`,
      [
        `BAIB-${String(startNumber + i).padStart(5, '0')}`,
        userId,
        restaurantId,
        deliveryPersonId,
        subtotal,
        deliveryFee,
        discount,
        total,
        JSON.stringify({
          title: 'Maison',
          address: 'Rue 42, Quartier ' + random.element(testData.districts),
          district: random.element(testData.districts),
          latitude: 9.45,
          longitude: -5.63
        }),
        random.element(['cash', 'orange_money', 'mtn_money']),
        status === 'delivered' ? 'paid' : 'pending',
        status,
        new Date(Date.now() - random.number(0, 7) * 24 * 60 * 60 * 1000),
        status !== 'new' ? new Date(Date.now() - random.number(0, 6) * 24 * 60 * 60 * 1000) : null,
        status === 'delivered' ? new Date(Date.now() - random.number(0, 5) * 24 * 60 * 60 * 1000) : null
      ]
    );

    const menuItemsResult = await query(
      'SELECT id, name, price FROM menu_items WHERE restaurant_id = $1 LIMIT 10',
      [restaurantId]
    );
    const menuItems = menuItemsResult.rows;

    const numItems = random.number(1, Math.min(5, menuItems.length || 1));
    for (let j = 0; j < numItems; j++) {
      const menuItem = menuItems[j] || { id: null, name: 'Plat', price: 2000 };
      const quantity = random.number(1, 3);
      const unitPrice = menuItem.price || 2000;
      const subtotal = unitPrice * quantity;

      await query(
        `INSERT INTO order_items (
          order_id, menu_item_id, menu_item_snapshot,
          quantity, unit_price, selected_options, subtotal
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          orderResult.rows[0].id,
          menuItem.id,
          JSON.stringify({ name: menuItem.name, price: unitPrice }),
          quantity,
          unitPrice,
          JSON.stringify({}),
          subtotal
        ]
      );
    }

    if (status === 'delivered' && random.boolean()) {
      await query(
        `INSERT INTO reviews (
          order_id, user_id, restaurant_id, delivery_person_id,
          restaurant_rating, food_quality, delivery_rating, speed,
          comment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          orderResult.rows[0].id,
          userId,
          restaurantId,
          deliveryPersonId,
          random.number(4, 5),
          random.number(4, 5),
          random.number(4, 5),
          random.number(4, 5),
          random.element(['Excellent !', 'Très bon', 'Délicieux', null])
        ]
      );
    }

    orders.push(orderResult.rows[0].id);
  }

  logger.info(`✓ ${count} commandes créées`);
  return orders;
};

// Seed des promotions
const seedPromotions = async () => {
  logger.info('Création de promotions...');

  const promos = [
    { code: 'BIENVENUE', type: 'percentage', value: 50, desc: 'Première commande' },
    { code: 'WEEKEND', type: 'percentage', value: 20, desc: 'Réduction weekend' },
    { code: 'LIVRAISON', type: 'free_delivery', value: 500, desc: 'Livraison gratuite' },
    { code: 'KORHOGO2025', type: 'fixed_amount', value: 1000, desc: 'Promo Korhogo' },
  ];

  for (const promo of promos) {
    await query(
      `INSERT INTO promotions (
        code, type, value, min_order_amount,
        valid_from, valid_until, applicable_to, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (code) DO NOTHING`,
      [
        promo.code,
        promo.type,
        promo.value,
        1000,
        new Date(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        'all',
        true
      ]
    );
  }

  logger.info(`✓ Promotions créées`);
};

// Fonction principale de seed
const seedDatabase = async () => {
  try {
    logger.info('════════════════════════════════════════');
    logger.info('  SEED DE LA BASE - KORHOGO 🇨🇮');
    logger.info('════════════════════════════════════════');
    logger.warn('⚠️  Ne jamais exécuter en production !');
    logger.info('');

    if (process.env.NODE_ENV === 'production') {
      throw new Error('Le seed ne peut pas être exécuté en production !');
    }

    const users = await seedUsers(30);
    const restaurants = await seedRestaurants();
    const deliveryPersons = await seedDeliveryPersons(15);
    const orders = await seedOrders(users, restaurants, deliveryPersons, 100);
    await seedPromotions();

    logger.info('');
    logger.info('════════════════════════════════════════');
    logger.info('✅ SEED KORHOGO TERMINÉ AVEC SUCCÈS');
    logger.info('════════════════════════════════════════');
    logger.info(`  📊 Statistiques:`);
    logger.info(`  • ${users.length} utilisateurs`);
    logger.info(`  • ${restaurants.length} restaurants (cuisine locale)`);
    logger.info(`  • ${deliveryPersons.length} livreurs`);
    logger.info(`  • ${orders.length} commandes`);
    logger.info('');
    logger.info('  🍽️  Restaurants de Korhogo:');
    testData.restaurants.forEach(r => {
      logger.info(`  • ${r.name} (${r.dishes.length} plats)`);
    });
    logger.info('');
    logger.info('  🔑 Credentials par défaut:');
    logger.info('  • Admin: admin@baibebalo.ci / Admin@2025!');
    logger.info('  • Restaurant: email du restaurant / restaurant123');
    logger.info('  • Livreur: téléphone / livreur123');
    logger.info('════════════════════════════════════════');

  } catch (error) {
    logger.error('❌ Erreur lors du seed', { 
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// Exécution si appelé directement
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
/**
 * Script de seed pour données de test
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

// Données de test
const testData = {
  districts: [
    'Centre-ville', 'Koko', 'Tchengué', 'Petit Paris', 
    'Belleville', 'Résidentiel', 'Commerce', 'Air France'
  ],
  
  cuisineTypes: [
    'Sénoufo', 'Ivoirienne', 'Africaine', 'Internationale',
    'Fast-food', 'Grillades', 'Pizza', 'Asiatique'
  ],
  
  restaurantCategories: [
    'Restaurant', 'Maquis', 'Fast-food', 'Boulangerie',
    'Pâtisserie', 'Grillades', 'Bar-restaurant'
  ],

  firstNames: [
    'Kouassi', 'Aya', 'Bakary', 'Fatou', 'Mamadou', 'Aissata',
    'Yao', 'Mariam', 'Sekou', 'Aminata', 'Karim', 'Djénéba'
  ],

  lastNames: [
    'Koné', 'Traoré', 'Diomandé', 'Coulibaly', 'Silué',
    'Ouattara', 'Doumbia', 'Touré', 'Fofana', 'Sangaré'
  ],

  restaurantNames: [
    'Chez Marie', 'Le Palmier', 'Maquis Chez Fatou', 'Restaurant du Centre',
    'La Terrasse', 'Le Baobab', 'Grillades du Nord', 'Fast Food Moderne',
    'Le Délice Sénoufo', 'Chez Aminata', 'Le Bon Goût', 'Restaurant Traditionnel'
  ],

  dishNames: {
    entrees: ['Salade Composée', 'Alloco Plantain', 'Beignets', 'Nems'],
    plats: [
      'Poulet Bicyclette Braisé', 'Poisson Braisé', 'Capitaine à la Braise',
      'Attiéké Poisson', 'Riz Sauce Graine', 'Riz Sauce Arachide',
      'Foutou Sauce Aubergine', 'Placali Sauce Graine', 'Poulet DG'
    ],
    accompagnements: ['Riz Blanc', 'Attiéké', 'Foutou', 'Placali', 'Alloco', 'Fried Rice'],
    boissons: ['Coca-Cola', 'Fanta', 'Sprite', 'Eau Minérale', 'Jus Local', 'Bissap'],
    desserts: ['Salade de Fruits', 'Gâteau', 'Banane Frite', 'Glace']
  },
};

// Seed des utilisateurs
const seedUsers = async (count = 20) => {
  logger.info(`Création de ${count} utilisateurs...`);
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

    // Ajouter 1-3 adresses par utilisateur
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
          `Rue ${random.number(1, 50)}, Quartier`,
          random.element(testData.districts),
          9.4500 + (Math.random() * 0.05 - 0.025), // Korhogo coords
          -5.6300 + (Math.random() * 0.05 - 0.025),
          j === 0
        ]
      );
    }
  }

  logger.info(`✓ ${count} utilisateurs créés`);
  return users;
};

// Seed des restaurants
const seedRestaurants = async (count = 15) => {
  logger.info(`Création de ${count} restaurants...`);
  const restaurants = [];
  const password = await bcrypt.hash('restaurant123', 10);

  for (let i = 0; i < count; i++) {
    const name = testData.restaurantNames[i] || `Restaurant ${i + 1}`;
    const category = random.element(testData.restaurantCategories);
    
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
        name,
        random.slug(name),
        category,
        random.element(testData.cuisineTypes),
        `${name} vous propose une cuisine ${category} authentique et savoureuse.`,
        random.phone(),
        `contact@${random.slug(name)}.ci`,
        password,
        `${random.number(1, 100)} Avenue Principale`,
        random.element(testData.districts),
        9.4500 + (Math.random() * 0.03 - 0.015),
        -5.6300 + (Math.random() * 0.03 - 0.015),
        random.decimal(5, 15, 1),
        15.0,
        random.phone(),
        random.element(['orange_money', 'mtn_money']),
        random.element(['active', 'active', 'active', 'pending']), // 75% actifs
        random.decimal(3.5, 5.0, 1),
        random.boolean() || random.boolean() // 75% ouverts
      ]
    );

    restaurants.push(result.rows[0].id);

    // Créer des catégories de menu
    const categories = ['Entrées', 'Plats Principaux', 'Accompagnements', 'Boissons'];
    const categoryIds = {};

    for (const [index, catName] of categories.entries()) {
      const catResult = await query(
        `INSERT INTO menu_categories (restaurant_id, name, display_order, is_active)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [result.rows[0].id, catName, index, true]
      );
      categoryIds[catName] = catResult.rows[0].id;
    }

    // Créer des items de menu
    const addMenuItems = async (category, items, priceRange) => {
      for (const item of items.slice(0, random.number(3, 6))) {
        await query(
          `INSERT INTO menu_items (
            restaurant_id, category_id, name, description,
            price, preparation_time, is_available, total_sold
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            result.rows[0].id,
            categoryIds[category],
            item,
            `Délicieux ${item.toLowerCase()} préparé avec soin`,
            random.number(priceRange[0], priceRange[1]),
            random.number(15, 45),
            random.boolean() || random.boolean(), // 75% disponibles
            random.number(0, 100)
          ]
        );
      }
    };

    await addMenuItems('Entrées', testData.dishNames.entrees, [500, 1500]);
    await addMenuItems('Plats Principaux', testData.dishNames.plats, [2000, 6000]);
    await addMenuItems('Accompagnements', testData.dishNames.accompagnements, [500, 2000]);
    await addMenuItems('Boissons', testData.dishNames.boissons, [300, 1500]);
  }

  logger.info(`✓ ${count} restaurants créés avec leurs menus`);
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
        random.element(['moto', 'moto', 'moto', 'bike']), // 75% motos
        random.phone(),
        random.element(['orange_money', 'mtn_money']),
        random.element(['active', 'active', 'pending']), // 66% actifs
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

  for (let i = 0; i < count; i++) {
    const status = random.element(statuses);
    const userId = random.element(users);
    const restaurantId = random.element(restaurants);
    const deliveryPersonId = status === 'new' ? null : random.element(deliveryPersons);
    
    const subtotal = random.number(2000, 15000);
    const deliveryFee = 500;
    const discount = random.boolean() ? random.number(0, 1000) : 0;
    const total = subtotal + deliveryFee - discount;

    // Créer la commande
    const orderResult = await query(
      `INSERT INTO orders (
        order_number, user_id, restaurant_id, delivery_person_id,
        subtotal, delivery_fee, discount, total,
        delivery_address, payment_method, payment_status,
        status, placed_at, accepted_at, delivered_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id`,
      [
        `BAIB-${String(10000 + i).slice(-5)}`,
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
        new Date(Date.now() - random.number(0, 7) * 24 * 60 * 60 * 1000), // 0-7 jours
        status !== 'new' ? new Date(Date.now() - random.number(0, 6) * 24 * 60 * 60 * 1000) : null,
        status === 'delivered' ? new Date(Date.now() - random.number(0, 5) * 24 * 60 * 60 * 1000) : null
      ]
    );

    // Récupérer des items de menu du restaurant
    const menuItemsResult = await query(
      'SELECT id, name, price FROM menu_items WHERE restaurant_id = $1 LIMIT 10',
      [restaurantId]
    );
    const menuItems = menuItemsResult.rows;

    // Ajouter des items à la commande
    const numItems = random.number(1, Math.min(5, menuItems.length || 1));
    const selectedMenuItems = menuItems.length > 0 
      ? menuItems.slice(0, numItems).map(() => random.element(menuItems))
      : [];

    for (let j = 0; j < numItems; j++) {
      const menuItem = selectedMenuItems[j] || {
        id: null,
        name: random.element(testData.dishNames.plats),
        price: random.number(2000, 5000)
      };
      
      const quantity = random.number(1, 3);
      const unitPrice = menuItem.price || random.number(2000, 5000);
      const subtotal = unitPrice * quantity;

      // Créer le snapshot de l'item de menu
      const menuItemSnapshot = {
        name: menuItem.name,
        price: unitPrice,
        description: `Délicieux ${menuItem.name.toLowerCase()}`
      };

      // Insérer l'item de commande avec menu_item_snapshot (comme dans order.controller.js)
      await query(
        `INSERT INTO order_items (
          order_id, menu_item_id, menu_item_snapshot,
          quantity, unit_price, selected_options, subtotal
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          orderResult.rows[0].id,
          menuItem.id,
          JSON.stringify(menuItemSnapshot),
          quantity,
          unitPrice,
          JSON.stringify({}),
          subtotal
        ]
      );
    }

    // Ajouter un avis si livré
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
          random.number(3, 5),
          random.number(3, 5),
          random.number(3, 5),
          random.number(3, 5),
          random.element([
            'Très bon !',
            'Excellent service',
            'Rapide et délicieux',
            'À recommander',
            null
          ])
        ]
      );
    }

    orders.push(orderResult.rows[0].id);
  }

  logger.info(`✓ ${count} commandes créées`);
  return orders;
};

// Seed des tickets de support
const seedSupportTickets = async (users, restaurants, deliveryPersons, orders, adminId, count = 25) => {
  logger.info(`Création de ${count} tickets de support...`);
  
  const ticketSubjects = [
    'Problème de livraison',
    'Commande manquante',
    'Paiement non reçu',
    'Problème avec le restaurant',
    'Application ne fonctionne pas',
    'Demande de remboursement',
    'Question sur ma commande',
    'Problème de connexion',
    'Code promo non valide',
    'Livraison en retard',
    'Nourriture froide',
    'Article manquant dans la commande',
    'Problème avec le livreur',
    'Facture incorrecte',
    'Demande d\'information',
    'Réclamation sur la qualité',
    'Problème de compte',
    'Question sur les promotions',
    'Erreur dans l\'application',
    'Suggestion d\'amélioration'
  ];

  const ticketMessages = [
    'Bonjour, j\'ai un problème avec ma commande. La livraison est en retard et je n\'ai pas reçu d\'informations.',
    'Ma commande n\'est pas arrivée alors que j\'ai payé. Pouvez-vous vérifier s\'il vous plaît ?',
    'Le paiement a été débité mais ma commande n\'a pas été confirmée. Aidez-moi s\'il vous plaît.',
    'Le restaurant a refusé ma commande sans raison. Que puis-je faire ?',
    'L\'application se bloque à chaque fois que j\'essaie de passer une commande.',
    'Je souhaite être remboursé car ma commande n\'est jamais arrivée.',
    'J\'ai une question concernant ma commande #BAIB-12345. Pouvez-vous m\'aider ?',
    'Je n\'arrive pas à me connecter à mon compte. Mot de passe oublié.',
    'Le code promo que j\'ai utilisé ne fonctionne pas. Pourquoi ?',
    'Ma livraison devait arriver il y a 2 heures. Où est mon livreur ?',
    'La nourriture que j\'ai reçue était froide. C\'est inacceptable.',
    'Il manque un article dans ma commande. Que dois-je faire ?',
    'Le livreur a été impoli avec moi. Je veux porter plainte.',
    'Le montant sur ma facture ne correspond pas à ce que j\'ai commandé.',
    'J\'aimerais avoir plus d\'informations sur le programme de fidélité.',
    'La qualité de la nourriture était très mauvaise. Je veux être remboursé.',
    'Je ne peux pas modifier mon profil. L\'application affiche une erreur.',
    'Comment fonctionnent les promotions ? Je ne comprends pas.',
    'Il y a un bug dans l\'application quand j\'essaie de voir mes commandes.',
    'J\'aimerais suggérer une amélioration pour l\'application.'
  ];

  const categories = ['order', 'payment', 'delivery', 'account', 'technical', 'other'];
  const priorities = ['low', 'medium', 'high', 'urgent'];
  const statuses = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'];
  const userTypes = ['user', 'restaurant', 'delivery'];

  for (let i = 0; i < count; i++) {
    const subject = random.element(ticketSubjects);
    const message = random.element(ticketMessages);
    const category = random.element(categories);
    const priority = random.element(priorities);
    const status = random.element(statuses);
    const userType = random.element(userTypes);
    
    // Sélectionner un ID utilisateur selon le type
    let userId = null;
    let orderId = null;
    
    if (userType === 'user' && users.length > 0) {
      userId = random.element(users);
      if (orders.length > 0 && random.boolean()) {
        orderId = random.element(orders);
      }
    } else if (userType === 'restaurant' && restaurants.length > 0) {
      userId = random.element(restaurants);
    } else if (userType === 'delivery' && deliveryPersons.length > 0) {
      userId = random.element(deliveryPersons);
    }

    // Générer le numéro de ticket
    const ticketNumberResult = await query('SELECT generate_ticket_number() as ticket_number');
    const ticketNumber = ticketNumberResult.rows[0].ticket_number;

    // Créer le ticket
    const ticketResult = await query(
      `INSERT INTO support_tickets (
        ticket_number, subject, description, category, priority,
        user_type, user_id, order_id, status, assigned_to,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
      [
        ticketNumber,
        subject,
        message,
        category,
        priority,
        userType,
        userId,
        orderId,
        status,
        status !== 'open' ? adminId : null, // Assigner à l'admin si le ticket n'est pas ouvert
        new Date(Date.now() - random.number(0, 30) * 24 * 60 * 60 * 1000), // 0-30 jours
        new Date(Date.now() - random.number(0, 25) * 24 * 60 * 60 * 1000)
      ]
    );

    // Créer le message initial seulement si on a un userId valide
    if (userId) {
      // Vérifier si la colonne is_internal existe
      const hasIsInternal = await query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'ticket_messages' 
          AND column_name = 'is_internal'
        ) as exists
      `);
      
      if (hasIsInternal.rows[0].exists) {
        await query(
          `INSERT INTO ticket_messages (
            ticket_id, sender_type, sender_id, message, is_internal
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            ticketResult.rows[0].id,
            userType,
            userId,
            message,
            false
          ]
        );
      } else {
        await query(
          `INSERT INTO ticket_messages (
            ticket_id, sender_type, sender_id, message
          ) VALUES ($1, $2, $3, $4)`,
          [
            ticketResult.rows[0].id,
            userType,
            userId,
            message
          ]
        );
      }
    }

    // Ajouter des réponses si le ticket n'est pas ouvert
    if (status !== 'open' && random.boolean()) {
      const numReplies = random.number(1, 3);
      for (let j = 0; j < numReplies; j++) {
        const replyMessages = [
          'Merci pour votre message. Nous avons bien reçu votre demande et nous allons la traiter dans les plus brefs délais.',
          'Nous avons vérifié votre commande et tout semble correct. Pouvez-vous nous donner plus de détails ?',
          'Votre problème a été résolu. N\'hésitez pas à nous contacter si vous avez d\'autres questions.',
          'Nous sommes désolés pour ce désagrément. Nous avons pris les mesures nécessaires.',
          'Votre demande est en cours de traitement. Nous vous tiendrons informé dès que possible.'
        ];
        
          // Vérifier si la colonne is_internal existe
          const hasIsInternal = await query(`
            SELECT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'ticket_messages' 
              AND column_name = 'is_internal'
            ) as exists
          `);
          
          if (hasIsInternal.rows[0].exists) {
            await query(
              `INSERT INTO ticket_messages (
                ticket_id, sender_type, sender_id, message, is_internal, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                ticketResult.rows[0].id,
                'admin',
                adminId,
                random.element(replyMessages),
                false,
                new Date(Date.now() - random.number(0, 20) * 24 * 60 * 60 * 1000)
              ]
            );
          } else {
            await query(
              `INSERT INTO ticket_messages (
                ticket_id, sender_type, sender_id, message, created_at
              ) VALUES ($1, $2, $3, $4, $5)`,
              [
                ticketResult.rows[0].id,
                'admin',
                adminId,
                random.element(replyMessages),
                new Date(Date.now() - random.number(0, 20) * 24 * 60 * 60 * 1000)
              ]
            );
          }
      }
    }
  }

  logger.info(`✓ ${count} tickets de support créés`);
};

// Seed des promotions
const seedPromotions = async () => {
  logger.info('Création de promotions...');

  const promos = [
    { code: 'BIENVENUE', type: 'percentage', value: 50, desc: 'Première commande' },
    { code: 'WEEKEND', type: 'percentage', value: 20, desc: 'Réduction weekend' },
    { code: 'LIVRAISON', type: 'free_delivery', value: 500, desc: 'Livraison gratuite' },
    { code: 'NOEL2025', type: 'fixed_amount', value: 1000, desc: 'Promo Noël' },
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
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
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
    logger.info('  DÉMARRAGE DU SEED DE LA BASE');
    logger.info('════════════════════════════════════════');
    logger.warn('⚠️  Ne jamais exécuter en production !');
    logger.info('');

    // Vérifier que nous sommes en développement
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Le seed ne peut pas être exécuté en production !');
    }

    const users = await seedUsers(30);
    const restaurants = await seedRestaurants(20);
    const deliveryPersons = await seedDeliveryPersons(15);
    const orders = await seedOrders(users, restaurants, deliveryPersons, 100);
    await seedPromotions();
    
    // Récupérer l'ID d'un admin pour assigner les tickets
    const adminResult = await query('SELECT id FROM admins LIMIT 1');
    const adminId = adminResult.rows.length > 0 ? adminResult.rows[0].id : null;
    
    if (adminId) {
      await seedSupportTickets(users, restaurants, deliveryPersons, orders, adminId, 25);
    } else {
      logger.warn('⚠️  Aucun admin trouvé, création de tickets sans assignation');
    }

    logger.info('');
    logger.info('════════════════════════════════════════');
    logger.info('✅ SEED TERMINÉ AVEC SUCCÈS');
    logger.info('════════════════════════════════════════');
    logger.info('  Credentials par défaut:');
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
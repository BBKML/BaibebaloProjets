/**
 * Script pour créer 5 restaurants de test avec des images
 * Usage: node seed-5-restaurants.js
 */

const { query } = require('./src/database/db');
const bcrypt = require('bcrypt');
const config = require('./src/config');

// Données des 5 restaurants avec images
const restaurantsData = [
  {
    name: 'Le Gourmet Ivoirien',
    slug: 'le-gourmet-ivoirien',
    category: 'Restaurant',
    cuisine_type: 'Ivoirienne',
    description: 'Découvrez les saveurs authentiques de la Côte d\'Ivoire dans un cadre chaleureux. Spécialités locales et plats traditionnels préparés avec des ingrédients frais.',
    phone: '0701234567',
    email: 'gourmet@test.com',
    password: 'Test123!',
    address: '123 Boulevard de la République, Plateau',
    district: 'Plateau',
    latitude: 5.3197,
    longitude: -4.0267,
    logo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop',
    photos: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=600&h=400&fit=crop',
    ],
    average_rating: 4.8,
    total_reviews: 124,
    total_orders: 456,
  },
  {
    name: 'Pizza Express Abidjan',
    slug: 'pizza-express-abidjan',
    category: 'Fast Food',
    cuisine_type: 'Italienne',
    description: 'Pizzas artisanales cuites au feu de bois, pâtes fraîches et salades gourmandes. Livraison rapide dans tout Abidjan.',
    phone: '+2250702345678',
    email: 'pizza@test.com',
    password: 'Test123!',
    address: '456 Avenue Franchet d\'Esperey, Cocody',
    district: 'Cocody',
    latitude: 5.3364,
    longitude: -4.0267,
    logo: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=400&fit=crop',
    photos: [
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=600&h=400&fit=crop',
    ],
    average_rating: 4.6,
    total_reviews: 89,
    total_orders: 312,
  },
  {
    name: 'Sushi Master',
    slug: 'sushi-master',
    category: 'Restaurant',
    cuisine_type: 'Japonaise',
    description: 'Sushi et sashimi de qualité premium, préparés par nos chefs japonais expérimentés. Expérience culinaire authentique.',
    phone: '0703456789',
    email: 'sushi@test.com',
    password: 'Test123!',
    address: '789 Rue des Jardins, Yopougon',
    district: 'Yopougon',
    latitude: 5.3364,
    longitude: -4.1200,
    logo: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&h=400&fit=crop',
    photos: [
      'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&h=400&fit=crop',
    ],
    average_rating: 4.9,
    total_reviews: 156,
    total_orders: 523,
  },
  {
    name: 'Grill & BBQ House',
    slug: 'grill-bbq-house',
    category: 'Restaurant',
    cuisine_type: 'Américaine',
    description: 'Viandes grillées, burgers gourmands et spécialités BBQ. Ambiance décontractée et portions généreuses.',
    phone: '+2250704567890',
    email: 'bbq@test.com',
    password: 'Test123!',
    address: '321 Avenue Nangui Abrogoua, Marcory',
    district: 'Marcory',
    latitude: 5.2500,
    longitude: -4.0167,
    logo: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=400&fit=crop',
    photos: [
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1558030006-450675393462?w=600&h=400&fit=crop',
    ],
    average_rating: 4.7,
    total_reviews: 98,
    total_orders: 387,
  },
  {
    name: 'Café des Saveurs',
    slug: 'cafe-des-saveurs',
    category: 'Café',
    cuisine_type: 'Française',
    description: 'Café artisanal, pâtisseries maison et brunchs gourmands. L\'endroit idéal pour un moment de détente.',
    phone: '0705678901',
    email: 'cafe@test.com',
    password: 'Test123!',
    address: '654 Boulevard de la Paix, Deux Plateaux',
    district: 'Deux Plateaux',
    latitude: 5.3600,
    longitude: -4.0083,
    logo: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=400&fit=crop',
    photos: [
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600&h=400&fit=crop',
    ],
    average_rating: 4.5,
    total_reviews: 67,
    total_orders: 234,
  },
];

// Horaires d'ouverture par défaut
const defaultOpeningHours = {
  monday: { open: '09:00', close: '22:00', isOpen: true },
  tuesday: { open: '09:00', close: '22:00', isOpen: true },
  wednesday: { open: '09:00', close: '22:00', isOpen: true },
  thursday: { open: '09:00', close: '22:00', isOpen: true },
  friday: { open: '09:00', close: '23:00', isOpen: true },
  saturday: { open: '10:00', close: '23:00', isOpen: true },
  sunday: { open: '11:00', close: '21:00', isOpen: true },
};

async function seedRestaurants() {
  try {
    console.log('🌱 Création de 5 restaurants de test avec images...\n');

    const bcryptRounds = parseInt(config.security?.bcryptRounds || 10);
    const password = 'Test123!';
    const passwordHash = await bcrypt.hash(password, bcryptRounds);

    const createdRestaurants = [];

    for (const restaurantData of restaurantsData) {
      // Vérifier si le restaurant existe déjà
      const existing = await query(
        'SELECT id, email, status FROM restaurants WHERE email = $1 OR slug = $2',
        [restaurantData.email, restaurantData.slug]
      );

      if (existing.rows.length > 0) {
        const existingRestaurant = existing.rows[0];
        console.log(`⚠️  Restaurant "${restaurantData.name}" existe déjà (${existingRestaurant.email})`);
        
        // Mettre à jour avec les nouvelles données (images, etc.)
        await query(
          `UPDATE restaurants SET
            name = $1, category = $2, cuisine_type = $3, description = $4,
            phone = $5, address = $6, district = $7,
            latitude = $8, longitude = $9,
            logo = $10, banner = $11, photos = $12::TEXT[],
            opening_hours = $13, status = $14, is_open = $15,
            average_rating = $16, total_reviews = $17, total_orders = $18
          WHERE id = $19`,
          [
            restaurantData.name,
            restaurantData.category,
            restaurantData.cuisine_type,
            restaurantData.description,
            restaurantData.phone,
            restaurantData.address,
            restaurantData.district,
            restaurantData.latitude,
            restaurantData.longitude,
            restaurantData.logo,
            restaurantData.banner,
            restaurantData.photos, // Array déjà formaté
            JSON.stringify(defaultOpeningHours),
            'active',
            true,
            restaurantData.average_rating,
            restaurantData.total_reviews,
            restaurantData.total_orders,
            existingRestaurant.id,
          ]
        );
        console.log(`   ✅ Restaurant mis à jour avec images\n`);
        createdRestaurants.push({ ...restaurantData, id: existingRestaurant.id, action: 'updated' });
        continue;
      }

      // Créer le restaurant
      const result = await query(
        `INSERT INTO restaurants (
          name, slug, category, cuisine_type, description,
          phone, email, password_hash, address, district,
          latitude, longitude, logo, banner, photos,
          opening_hours, delivery_radius, status, is_open,
          average_rating, total_reviews, total_orders
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::TEXT[], $16, $17, $18, $19, $20, $21, $22)
        RETURNING id, name, email, status`,
        [
          restaurantData.name,
          restaurantData.slug,
          restaurantData.category,
          restaurantData.cuisine_type,
          restaurantData.description,
          restaurantData.phone,
          restaurantData.email,
          passwordHash,
          restaurantData.address,
          restaurantData.district,
          restaurantData.latitude,
          restaurantData.longitude,
          restaurantData.logo,
          restaurantData.banner,
          restaurantData.photos, // Array de strings
          JSON.stringify(defaultOpeningHours),
          10, // Rayon de livraison
          'active', // Statut actif
          true, // Ouvert
          restaurantData.average_rating,
          restaurantData.total_reviews,
          restaurantData.total_orders,
        ]
      );

      console.log(`✅ Restaurant créé: ${restaurantData.name}`);
      console.log(`   Email: ${restaurantData.email}`);
      console.log(`   Mot de passe: ${password}`);
      console.log(`   Images: Logo + Banner + ${restaurantData.photos.length} photos\n`);
      
      createdRestaurants.push({ ...restaurantData, id: result.rows[0].id, action: 'created' });
    }

    console.log('\n📊 Résumé:');
    console.log(`   ✅ ${createdRestaurants.filter(r => r.action === 'created').length} restaurant(s) créé(s)`);
    console.log(`   🔄 ${createdRestaurants.filter(r => r.action === 'updated').length} restaurant(s) mis à jour\n`);

    console.log('📋 Identifiants de connexion (tous utilisent le même mot de passe: Test123!):');
    createdRestaurants.forEach((restaurant, index) => {
      console.log(`\n   ${index + 1}. ${restaurant.name}`);
      console.log(`      Email: ${restaurant.email}`);
      console.log(`      Mot de passe: Test123!`);
      console.log(`      Statut: active`);
      console.log(`      Note: ${restaurant.average_rating}/5 (${restaurant.total_reviews} avis)`);
    });

    console.log('\n✨ Terminé ! Les restaurants sont prêts à être utilisés.\n');

  } catch (error) {
    console.error('❌ Erreur lors de la création des restaurants:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // Fermer la connexion
    const { pool } = require('./src/database/db');
    await pool.end();
  }
}

// Exécuter
seedRestaurants();

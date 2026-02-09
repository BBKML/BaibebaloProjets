/**
 * BAIBEBALO API - Données de test
 * 
 * Fournit des jeux de données cohérents pour tous les tests.
 * Localisation : Korhogo, Côte d'Ivoire
 */

const { v4: uuidv4 } = require('uuid');

// ================================
// UTILISATEURS
// ================================

const testUsers = {
  client: {
    id: '11111111-1111-1111-1111-111111111111',
    phone: '+2250700000001',
    first_name: 'Amadou',
    last_name: 'Coulibaly',
    email: 'amadou@test.com',
    role: 'user',
    status: 'active',
    created_at: new Date().toISOString(),
  },
  client2: {
    id: '11111111-1111-1111-1111-222222222222',
    phone: '+2250700000002',
    first_name: 'Fatou',
    last_name: 'Diallo',
    email: 'fatou@test.com',
    role: 'user',
    status: 'active',
    created_at: new Date().toISOString(),
  },
};

const testAdmin = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'admin@baibebalo.com',
  password: 'Admin123!@#',
  first_name: 'Admin',
  last_name: 'Baibebalo',
  role: 'super_admin',
  status: 'active',
};

// ================================
// RESTAURANTS
// ================================

const testRestaurants = {
  restaurant1: {
    id: '33333333-3333-3333-3333-111111111111',
    name: 'Le Maquis du Quartier',
    description: 'Cuisine locale ivoirienne traditionnelle',
    phone: '+2250700000010',
    email: 'maquis@test.com',
    address: 'Quartier Sinistré, Korhogo',
    latitude: 9.4580,
    longitude: -5.6295,
    status: 'active',
    is_open: true,
    commission_rate: 15,
    average_preparation_time: 25,
    minimum_order: 1500,
    delivery_radius: 8,
    rating: 4.5,
    total_reviews: 120,
    created_at: new Date().toISOString(),
  },
  restaurant2: {
    id: '33333333-3333-3333-3333-222222222222',
    name: 'Chez Tante Awa',
    description: 'Spécialités sénoufo et grillades',
    phone: '+2250700000011',
    email: 'tanteawa@test.com',
    address: 'Marché Central, Korhogo',
    latitude: 9.4560,
    longitude: -5.6310,
    status: 'active',
    is_open: true,
    commission_rate: 12,
    average_preparation_time: 30,
    minimum_order: 2000,
    delivery_radius: 10,
    rating: 4.2,
    total_reviews: 85,
    created_at: new Date().toISOString(),
  },
  pendingRestaurant: {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Nouveau Restaurant Test',
    description: 'Restaurant en attente de validation',
    phone: '+2250700000012',
    email: 'nouveau@test.com',
    address: 'Korhogo Centre',
    latitude: 9.4550,
    longitude: -5.6280,
    status: 'pending',
    is_open: false,
    commission_rate: 15,
    created_at: new Date().toISOString(),
  },
};

// ================================
// MENU / PLATS
// ================================

const testMenuCategories = [
  {
    id: '44444444-4444-4444-4444-111111111111',
    restaurant_id: testRestaurants.restaurant1.id,
    name: 'Plats Principaux',
    display_order: 1,
  },
  {
    id: '44444444-4444-4444-4444-222222222222',
    restaurant_id: testRestaurants.restaurant1.id,
    name: 'Boissons',
    display_order: 2,
  },
];

const testMenuItems = [
  {
    id: '55555555-5555-5555-5555-111111111111',
    restaurant_id: testRestaurants.restaurant1.id,
    category_id: testMenuCategories[0].id,
    name: 'Attieke Poisson',
    description: 'Attieke frais avec poisson braisé',
    price: 2500,
    is_available: true,
    preparation_time: 15,
    image_url: null,
  },
  {
    id: '55555555-5555-5555-5555-222222222222',
    restaurant_id: testRestaurants.restaurant1.id,
    category_id: testMenuCategories[0].id,
    name: 'Riz Sauce Graine',
    description: 'Riz blanc avec sauce graine et viande',
    price: 3000,
    is_available: true,
    preparation_time: 20,
    image_url: null,
  },
  {
    id: '55555555-5555-5555-5555-333333333333',
    restaurant_id: testRestaurants.restaurant1.id,
    category_id: testMenuCategories[1].id,
    name: 'Bissap Frais',
    description: 'Jus de bissap glacé',
    price: 500,
    is_available: true,
    preparation_time: 2,
    image_url: null,
  },
];

// ================================
// LIVREURS
// ================================

const testDeliveryPersons = {
  driver1: {
    id: '66666666-6666-6666-6666-111111111111',
    phone: '+2250700000020',
    first_name: 'Ibrahim',
    last_name: 'Koné',
    email: 'ibrahim@test.com',
    vehicle_type: 'moto',
    license_number: 'KHG-2024-001',
    status: 'active',
    delivery_status: 'available',
    current_latitude: 9.4570,
    current_longitude: -5.6300,
    rating: 4.8,
    total_deliveries: 250,
    created_at: new Date().toISOString(),
  },
  driver2: {
    id: '66666666-6666-6666-6666-222222222222',
    phone: '+2250700000021',
    first_name: 'Moussa',
    last_name: 'Traoré',
    email: 'moussa@test.com',
    vehicle_type: 'moto',
    license_number: 'KHG-2024-002',
    status: 'active',
    delivery_status: 'on_delivery',
    current_latitude: 9.4590,
    current_longitude: -5.6280,
    rating: 4.5,
    total_deliveries: 180,
    created_at: new Date().toISOString(),
  },
  pendingDriver: {
    id: '66666666-6666-6666-6666-333333333333',
    phone: '+2250700000022',
    first_name: 'Yao',
    last_name: 'Konan',
    email: 'yao@test.com',
    vehicle_type: 'velo',
    status: 'pending',
    delivery_status: 'offline',
    created_at: new Date().toISOString(),
  },
};

// ================================
// COMMANDES
// ================================

const testOrders = {
  pendingOrder: {
    id: '77777777-7777-7777-7777-111111111111',
    order_number: 'BB-20260208-001',
    user_id: testUsers.client.id,
    restaurant_id: testRestaurants.restaurant1.id,
    delivery_person_id: null,
    status: 'pending',
    subtotal: 5500,
    delivery_fee: 500,
    service_fee: 0,
    total: 6000,
    payment_method: 'cash',
    payment_status: 'pending',
    delivery_address: 'Quartier Résidentiel, Korhogo',
    delivery_latitude: 9.4600,
    delivery_longitude: -5.6250,
    notes: 'Bien pimenté svp',
    estimated_preparation_time: 20,
    estimated_delivery_time: 15,
    created_at: new Date().toISOString(),
  },
  confirmedOrder: {
    id: '77777777-7777-7777-7777-222222222222',
    order_number: 'BB-20260208-002',
    user_id: testUsers.client.id,
    restaurant_id: testRestaurants.restaurant1.id,
    delivery_person_id: testDeliveryPersons.driver1.id,
    status: 'confirmed',
    subtotal: 3000,
    delivery_fee: 500,
    service_fee: 0,
    total: 3500,
    payment_method: 'cash',
    payment_status: 'pending',
    delivery_address: 'Koko, Korhogo',
    delivery_latitude: 9.4550,
    delivery_longitude: -5.6320,
    created_at: new Date().toISOString(),
  },
  deliveredOrder: {
    id: '77777777-7777-7777-7777-333333333333',
    order_number: 'BB-20260208-003',
    user_id: testUsers.client2.id,
    restaurant_id: testRestaurants.restaurant2.id,
    delivery_person_id: testDeliveryPersons.driver1.id,
    status: 'delivered',
    subtotal: 8000,
    delivery_fee: 700,
    service_fee: 0,
    total: 8700,
    payment_method: 'cash',
    payment_status: 'paid',
    delivery_address: 'Quartier Banaforo, Korhogo',
    delivery_latitude: 9.4520,
    delivery_longitude: -5.6270,
    delivered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
};

const testOrderItems = [
  {
    id: '88888888-8888-8888-8888-111111111111',
    order_id: testOrders.pendingOrder.id,
    menu_item_id: testMenuItems[0].id,
    name: testMenuItems[0].name,
    price: testMenuItems[0].price,
    quantity: 2,
    total: testMenuItems[0].price * 2,
  },
  {
    id: '88888888-8888-8888-8888-222222222222',
    order_id: testOrders.pendingOrder.id,
    menu_item_id: testMenuItems[2].id,
    name: testMenuItems[2].name,
    price: testMenuItems[2].price,
    quantity: 1,
    total: testMenuItems[2].price,
  },
];

// ================================
// ADRESSES
// ================================

const testAddresses = [
  {
    id: '99999999-9999-9999-9999-111111111111',
    user_id: testUsers.client.id,
    label: 'Maison',
    address: 'Quartier Résidentiel, Korhogo',
    latitude: 9.4600,
    longitude: -5.6250,
    is_default: true,
  },
  {
    id: '99999999-9999-9999-9999-222222222222',
    user_id: testUsers.client.id,
    label: 'Bureau',
    address: 'Centre Commercial, Korhogo',
    latitude: 9.4580,
    longitude: -5.6290,
    is_default: false,
  },
];

// ================================
// PAIEMENTS
// ================================

const testPayments = {
  cashPayment: {
    method: 'cash',
    amount: 6000,
    status: 'pending',
  },
  orangeMoneyPayment: {
    method: 'orange_money',
    phone: '+2250700000001',
    amount: 6000,
    status: 'pending',
    transaction_id: 'OM-TEST-001',
  },
  mtnMomoPayment: {
    method: 'mtn_momo',
    phone: '+2250500000001',
    amount: 6000,
    status: 'pending',
    transaction_id: 'MTN-TEST-001',
  },
};

// ================================
// TOKENS JWT DE TEST
// ================================

const generateTestTokenPayload = (user, type = 'user') => ({
  id: user.id,
  type,
  phone: user.phone,
  email: user.email,
});

// ================================
// HELPERS
// ================================

const generateUUID = () => uuidv4();

const generateOrderNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `BB-${date}-${seq}`;
};

module.exports = {
  testUsers,
  testAdmin,
  testRestaurants,
  testMenuCategories,
  testMenuItems,
  testDeliveryPersons,
  testOrders,
  testOrderItems,
  testAddresses,
  testPayments,
  generateTestTokenPayload,
  generateUUID,
  generateOrderNumber,
};

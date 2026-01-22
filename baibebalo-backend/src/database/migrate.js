const { query } = require('./db');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');
const config = require('../config');

// Fonction helper pour exécuter plusieurs queries
const executeQueries = async (queries) => {
  for (const [index, sql] of queries.entries()) {
    try {
      await query(sql);
      logger.info(`✓ Migration ${index + 1}/${queries.length} réussie`);
    } catch (error) {
      logger.error(`✗ Erreur migration ${index + 1}`, { 
        error: error.message,
        query: sql.substring(0, 100),
      });
      throw error;
    }
  }
};

// Définition de toutes les migrations
const migrations = [
  // ======================================
  // Migration 1: Extensions PostgreSQL
  // ======================================
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`,
  `CREATE EXTENSION IF NOT EXISTS "cube";`,
  `CREATE EXTENSION IF NOT EXISTS "earthdistance";`,

  // ======================================
  // Migration 2: Table users (clients)
  // ======================================
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    profile_picture TEXT,
    gender VARCHAR(10),
    date_of_birth DATE,
    referral_code VARCHAR(20) UNIQUE,
    referred_by UUID REFERENCES users(id) ON DELETE SET NULL,
    loyalty_points INTEGER DEFAULT 0 CHECK (loyalty_points >= 0),
    total_spent DECIMAL(12,2) DEFAULT 0 CHECK (total_spent >= 0),
    total_orders INTEGER DEFAULT 0 CHECK (total_orders >= 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // Index pour users
  `CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
  `CREATE INDEX IF NOT EXISTS idx_users_referral ON users(referral_code);`,
  `CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);`,
  `CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC);`,

  // Ajouter fcm_token si manquant
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb;`,

  // ======================================
  // Migration 3: Table addresses
  // ======================================
  `CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100),
    address_line TEXT NOT NULL,
    district VARCHAR(100),
    landmark TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_coordinates CHECK (
      (latitude IS NULL AND longitude IS NULL) OR
      (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
    )
  );`,

  `CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_addresses_default ON addresses(is_default) WHERE is_default = true;`,

  // ======================================
  // Migration 4: Table restaurants
  // ======================================
  `CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    cuisine_type VARCHAR(100),
    description TEXT,
    logo TEXT,
    banner TEXT,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    address TEXT,
    district VARCHAR(100),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    opening_hours JSONB DEFAULT '{}',
    delivery_radius DECIMAL(5,2) DEFAULT 10.0 CHECK (delivery_radius > 0),
    is_open BOOLEAN DEFAULT true,
    commission_rate DECIMAL(5,2) DEFAULT 15.0 CHECK (commission_rate BETWEEN 0 AND 100),
    mobile_money_number VARCHAR(20),
    mobile_money_provider VARCHAR(50),
    bank_account VARCHAR(50),
    business_registration TEXT,
    id_card TEXT,
    photos TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected', 'closed')),
    rejection_reason TEXT,
    average_rating DECIMAL(3,2) DEFAULT 0.0 CHECK (average_rating BETWEEN 0 AND 5),
    total_reviews INTEGER DEFAULT 0 CHECK (total_reviews >= 0),
    total_orders INTEGER DEFAULT 0 CHECK (total_orders >= 0),
    total_revenue DECIMAL(12,2) DEFAULT 0 CHECK (total_revenue >= 0),
    balance DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);`,
  `CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);`,
  `CREATE INDEX IF NOT EXISTS idx_restaurants_category ON restaurants(category);`,
  `CREATE INDEX IF NOT EXISTS idx_restaurants_rating ON restaurants(average_rating DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants USING gist (ll_to_earth(latitude, longitude));`,

  // Ajouter fcm_token si manquant
  `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS fcm_token TEXT;`,

  // ======================================
  // Migration 5: Table menu_categories
  // ======================================
  `CREATE TABLE IF NOT EXISTS menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(restaurant_id, name)
  );`,

  `CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant ON menu_categories(restaurant_id);`,
  `CREATE INDEX IF NOT EXISTS idx_menu_categories_order ON menu_categories(display_order);`,

  // ======================================
  // Migration 6: Table menu_items
  // ======================================
  `CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    photo TEXT,
    photos TEXT[] DEFAULT '{}',
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    options JSONB DEFAULT '{}',
    preparation_time INTEGER DEFAULT 20 CHECK (preparation_time > 0),
    is_available BOOLEAN DEFAULT true,
    stock_quantity INTEGER,
    total_sold INTEGER DEFAULT 0 CHECK (total_sold >= 0),
    tags TEXT[] DEFAULT '{}',
    allergens TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE INDEX IF NOT EXISTS idx_menu_restaurant ON menu_items(restaurant_id);`,
  `CREATE INDEX IF NOT EXISTS idx_menu_category ON menu_items(category_id);`,
  `CREATE INDEX IF NOT EXISTS idx_menu_available ON menu_items(is_available);`,
  `CREATE INDEX IF NOT EXISTS idx_menu_price ON menu_items(price);`,
  `CREATE INDEX IF NOT EXISTS idx_menu_sold ON menu_items(total_sold DESC);`,

  // ======================================
  // Migration 7: Table delivery_persons
  // ======================================
  `CREATE TABLE IF NOT EXISTS delivery_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    photo TEXT,
    id_card TEXT,
    driver_license TEXT,
    vehicle_registration TEXT,
    insurance_document TEXT,
    vehicle_type VARCHAR(50) CHECK (vehicle_type IN ('moto', 'bike', 'foot')),
    vehicle_photo TEXT,
    vehicle_plate VARCHAR(50),
    mobile_money_number VARCHAR(20),
    mobile_money_provider VARCHAR(50),
    bank_account VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
    rejection_reason TEXT,
    delivery_status VARCHAR(20) DEFAULT 'offline' CHECK (delivery_status IN ('offline', 'available', 'busy', 'on_break')),
    current_latitude DECIMAL(10,8),
    current_longitude DECIMAL(11,8),
    last_location_update TIMESTAMP,
    average_rating DECIMAL(3,2) DEFAULT 0.0 CHECK (average_rating BETWEEN 0 AND 5),
    total_deliveries INTEGER DEFAULT 0 CHECK (total_deliveries >= 0),
    completed_deliveries INTEGER DEFAULT 0 CHECK (completed_deliveries >= 0),
    cancelled_deliveries INTEGER DEFAULT 0 CHECK (cancelled_deliveries >= 0),
    total_earnings DECIMAL(12,2) DEFAULT 0 CHECK (total_earnings >= 0),
    balance DECIMAL(12,2) DEFAULT 0,
    availability_hours JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE INDEX IF NOT EXISTS idx_delivery_phone ON delivery_persons(phone);`,
  `CREATE INDEX IF NOT EXISTS idx_delivery_status ON delivery_persons(status);`,
  `CREATE INDEX IF NOT EXISTS idx_delivery_delivery_status ON delivery_persons(delivery_status);`,
  `CREATE INDEX IF NOT EXISTS idx_delivery_rating ON delivery_persons(average_rating DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_delivery_location ON delivery_persons USING gist (ll_to_earth(current_latitude, current_longitude));`,

  // Ajouter fcm_token si manquant
  `ALTER TABLE delivery_persons ADD COLUMN IF NOT EXISTS fcm_token TEXT;`,

  // ======================================
  // Migration 8: Table orders
  // ======================================
  `CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    delivery_person_id UUID REFERENCES delivery_persons(id) ON DELETE SET NULL,
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    delivery_fee DECIMAL(10,2) DEFAULT 500.0 CHECK (delivery_fee >= 0),
    discount DECIMAL(10,2) DEFAULT 0.0 CHECK (discount >= 0),
    tax DECIMAL(10,2) DEFAULT 0.0 CHECK (tax >= 0),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    delivery_address JSONB NOT NULL,
    delivery_distance DECIMAL(5,2),
    special_instructions TEXT,
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'orange_money', 'mtn_money', 'moov_money', 'waves')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_reference VARCHAR(100),
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'accepted', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled')),
    cancellation_reason TEXT,
    cancelled_by VARCHAR(50),
    estimated_delivery_time INTEGER,
    placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    preparing_at TIMESTAMP,
    ready_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    delivering_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    promo_code VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_status_transitions CHECK (
      (status = 'new' AND accepted_at IS NULL) OR
      (status != 'new')
    )
  );`,

  `CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);`,
  `CREATE INDEX IF NOT EXISTS idx_orders_delivery ON orders(delivery_person_id);`,
  `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`,
  `CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);`,
  `CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(placed_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);`,

  // ======================================
  // Migration 9: Table order_items
  // ======================================
  `CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE RESTRICT,
    menu_item_snapshot JSONB,
    name VARCHAR(255),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    selected_options JSONB DEFAULT '{}',
    special_notes TEXT,
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0)
  );`,
  
  // Migration: Ajouter colonne menu_item_snapshot si elle n'existe pas
  `DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name='order_items' AND column_name='menu_item_snapshot') THEN
        ALTER TABLE order_items ADD COLUMN menu_item_snapshot JSONB;
      END IF;
      -- Rendre name optionnel si elle existe
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='order_items' AND column_name='name' AND is_nullable='NO') THEN
        ALTER TABLE order_items ALTER COLUMN name DROP NOT NULL;
      END IF;
    END $$;`,

  `CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);`,
  `CREATE INDEX IF NOT EXISTS idx_order_items_menu ON order_items(menu_item_id);`,

  // ======================================
  // Migration 10: Table favorites
  // ======================================
  `CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, restaurant_id)
  );`,

  `CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_favorites_restaurant ON favorites(restaurant_id);`,

  // ======================================
  // Migration 11: Table reviews
  // ======================================
  `CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    delivery_person_id UUID REFERENCES delivery_persons(id) ON DELETE CASCADE,
    restaurant_rating INTEGER CHECK (restaurant_rating BETWEEN 1 AND 5),
    food_quality INTEGER CHECK (food_quality BETWEEN 1 AND 5),
    order_accuracy INTEGER CHECK (order_accuracy BETWEEN 1 AND 5),
    packaging INTEGER CHECK (packaging BETWEEN 1 AND 5),
    delivery_rating INTEGER CHECK (delivery_rating BETWEEN 1 AND 5),
    speed INTEGER CHECK (speed BETWEEN 1 AND 5),
    courtesy INTEGER CHECK (courtesy BETWEEN 1 AND 5),
    comment TEXT,
    tags TEXT[] DEFAULT '{}',
    photos TEXT[] DEFAULT '{}',
    is_visible BOOLEAN DEFAULT true,
    admin_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_id, user_id)
  );`,

  `CREATE INDEX IF NOT EXISTS idx_reviews_order ON reviews(order_id);`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON reviews(restaurant_id);`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_delivery ON reviews(delivery_person_id);`,
  // Ajouter la colonne is_visible si elle n'existe pas déjà
  `DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name='reviews' AND column_name='is_visible') THEN
        ALTER TABLE reviews ADD COLUMN is_visible BOOLEAN DEFAULT true;
      END IF;
    END $$;`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_visible ON reviews(is_visible);`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_date ON reviews(created_at DESC);`,

  // ======================================
  // Migration 12: Table promotions
  // ======================================
  `CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) CHECK (type IN ('percentage', 'fixed_amount', 'free_delivery', 'loyalty_points')),
    value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    max_discount DECIMAL(10,2),
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0 CHECK (used_count >= 0),
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    applicable_to VARCHAR(50) CHECK (applicable_to IN ('all', 'new_users', 'specific_restaurant', 'specific_user')),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_dates CHECK (valid_until > valid_from),
    CONSTRAINT valid_usage CHECK (usage_limit IS NULL OR used_count <= usage_limit)
  );`,

  `CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code);`,
  `CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);`,
  `CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(valid_from, valid_until);`,
  `ALTER TABLE promotions ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;`,
  `CREATE INDEX IF NOT EXISTS idx_promotions_restaurant ON promotions(restaurant_id);`,

  // ======================================
  // Migration 13: Table transactions
  // ======================================
  `CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('order_payment', 'commission', 'delivery_fee', 'refund', 'payout', 'adjustment')),
    amount DECIMAL(10,2) NOT NULL,
    from_user_type VARCHAR(50),
    from_user_id UUID,
    to_user_type VARCHAR(50),
    to_user_id UUID,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100) UNIQUE,
    payment_provider VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
  );`,

  `CREATE INDEX IF NOT EXISTS idx_transactions_order ON transactions(order_id);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(payment_reference);`,
  // Ajouter la colonne transaction_type si elle n'existe pas déjà
  `DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name='transactions' AND column_name='transaction_type') THEN
        ALTER TABLE transactions ADD COLUMN transaction_type VARCHAR(50) NOT NULL DEFAULT 'order_payment';
        ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
          CHECK (transaction_type IN ('order_payment', 'commission', 'delivery_fee', 'refund', 'payout', 'adjustment'));
      END IF;
    END $$;`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_user_type, from_user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_user_type, to_user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at DESC);`,

  // ======================================
  // Migration 14: Table notifications
  // ======================================
  `CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('user', 'restaurant', 'delivery', 'admin')),
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    sent_via VARCHAR(50) CHECK (sent_via IN ('push', 'sms', 'email', 'in_app')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_type, user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_date ON notifications(created_at DESC);`,

  // ======================================
  // Migration 15: Table otp_codes
  // ======================================
  `CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    type VARCHAR(50) DEFAULT 'login' CHECK (type IN ('login', 'registration', 'password_reset', 'verification')),
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0 CHECK (attempts >= 0),
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
  );`,

  `CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);`,
  `CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);`,
  `CREATE INDEX IF NOT EXISTS idx_otp_used ON otp_codes(is_used);`,

  // Nettoyer les OTP expirés automatiquement (> 24h)
  `CREATE OR REPLACE FUNCTION cleanup_expired_otps() RETURNS void AS $$
    BEGIN
      DELETE FROM otp_codes WHERE expires_at < NOW() - INTERVAL '24 hours';
    END;
  $$ LANGUAGE plpgsql;`,

  // ======================================
  // Migration 15.5: Table sms_logs
  // ======================================
  `CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
    provider VARCHAR(50) NOT NULL,
    message_id VARCHAR(100),
    error TEXT,
    cost DECIMAL(10,2),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON sms_logs(phone);`,
  `CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);`,
  `CREATE INDEX IF NOT EXISTS idx_sms_logs_provider ON sms_logs(provider);`,
  `CREATE INDEX IF NOT EXISTS idx_sms_logs_date ON sms_logs(sent_at DESC);`,

  // ======================================
  // Migration 16: Table admins
  // ======================================
  `CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'support', 'finance')),
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);`,
  `CREATE INDEX IF NOT EXISTS idx_admins_active ON admins(is_active);`,

  // Migration: Ajouter colonne profile_picture à admins
  `ALTER TABLE admins ADD COLUMN IF NOT EXISTS profile_picture TEXT;`,

  // Migration: Ajouter colonne commission à orders (si elle n'existe pas)
  `DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name='orders' AND column_name='commission') THEN
        ALTER TABLE orders ADD COLUMN commission DECIMAL(10,2) DEFAULT 0.0 CHECK (commission >= 0);
      END IF;
    END $$;`,

  // ======================================
  // Migration 17: Table payout_requests
  // ======================================
  `CREATE TABLE IF NOT EXISTS payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('restaurant', 'delivery')),
    user_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'cancelled')),
    processed_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    processed_at TIMESTAMP,
    transaction_reference VARCHAR(100),
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE INDEX IF NOT EXISTS idx_payout_user ON payout_requests(user_type, user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_payout_status ON payout_requests(status);`,
  `CREATE INDEX IF NOT EXISTS idx_payout_date ON payout_requests(created_at DESC);`,

  // ======================================
  // Migration 18: Table support_tickets
  // ======================================
  `CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    user_type VARCHAR(50) CHECK (user_type IN ('user', 'restaurant', 'delivery')),
    user_id UUID,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    category VARCHAR(50) CHECK (category IN ('order', 'payment', 'delivery', 'account', 'technical', 'other')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
    assigned_to UUID REFERENCES admins(id) ON DELETE SET NULL,
    photos TEXT[] DEFAULT '{}',
    resolution TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP
  );`,

  `CREATE INDEX IF NOT EXISTS idx_tickets_number ON support_tickets(ticket_number);`,
  `CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_type, user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_tickets_order ON support_tickets(order_id);`,
  `CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);`,
  `CREATE INDEX IF NOT EXISTS idx_tickets_priority ON support_tickets(priority);`,
  `CREATE INDEX IF NOT EXISTS idx_tickets_date ON support_tickets(created_at DESC);`,

  // ======================================
  // Migration 19: Table ticket_messages
  // ======================================
  `CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL CHECK (sender_type IN ('user', 'restaurant', 'delivery', 'admin')),
    sender_id UUID NOT NULL,
    message TEXT NOT NULL,
    attachments TEXT[] DEFAULT '{}',
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);`,
  `CREATE INDEX IF NOT EXISTS idx_ticket_messages_date ON ticket_messages(created_at);`,

  // Ajouter la colonne is_internal si elle n'existe pas déjà
  `DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name='ticket_messages' AND column_name='is_internal') THEN
        ALTER TABLE ticket_messages ADD COLUMN is_internal BOOLEAN DEFAULT false;
      END IF;
    END $$;`,

  // ======================================
  // Migration 20: Table app_settings
  // ======================================
  `CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // Ajouter la colonne is_public si elle n'existe pas déjà
  `DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name='app_settings' AND column_name='is_public') THEN
        ALTER TABLE app_settings ADD COLUMN is_public BOOLEAN DEFAULT false;
      END IF;
    END $$;`,
  `CREATE INDEX IF NOT EXISTS idx_settings_public ON app_settings(is_public);`,

  // ======================================
  // Migration 21: Table audit_logs

  // Migration 22: Table dismissed_alerts (historique des alertes masquées)
  `CREATE TABLE IF NOT EXISTS dismissed_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    alert_id VARCHAR(100) NOT NULL,
    alert_type VARCHAR(50),
    dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(admin_id, alert_id)
  );`,
  `CREATE INDEX IF NOT EXISTS idx_dismissed_alerts_admin ON dismissed_alerts(admin_id);`,
  `CREATE INDEX IF NOT EXISTS idx_dismissed_alerts_id ON dismissed_alerts(alert_id);`,
  // ======================================
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_type VARCHAR(50),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_type, user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at DESC);`,

  // ======================================
  // TRIGGERS & FUNCTIONS
  // ======================================

  // Fonction pour mettre à jour updated_at automatiquement
  `CREATE OR REPLACE FUNCTION update_updated_at_column()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = CURRENT_TIMESTAMP;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;`,

  // Triggers pour updated_at
  `DROP TRIGGER IF EXISTS update_users_updated_at ON users;`,
  `CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,
  
  `DROP TRIGGER IF EXISTS update_restaurants_updated_at ON restaurants;`,
  `CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,
  
  `DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;`,
  `CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,
  
  `DROP TRIGGER IF EXISTS update_delivery_persons_updated_at ON delivery_persons;`,
  `CREATE TRIGGER update_delivery_persons_updated_at BEFORE UPDATE ON delivery_persons
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,
  
  `DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;`,
  `CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,
  
  `DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;`,
  `CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,
  
  `DROP TRIGGER IF EXISTS update_admins_updated_at ON admins;`,
  `CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,
  
  `DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;`,
  `CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,

  // Fonction pour générer order_number
  `CREATE OR REPLACE FUNCTION generate_order_number()
   RETURNS VARCHAR(20) AS $$
   DECLARE
     new_number VARCHAR(20);
     done BOOLEAN;
   BEGIN
     done := false;
     WHILE NOT done LOOP
       new_number := 'BAIB-' || LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0');
       done := NOT EXISTS(SELECT 1 FROM orders WHERE order_number = new_number);
     END LOOP;
     RETURN new_number;
   END;
   $$ LANGUAGE plpgsql;`,

  // Fonction pour générer ticket_number
  `CREATE OR REPLACE FUNCTION generate_ticket_number()
   RETURNS VARCHAR(20) AS $$
   DECLARE
     new_number VARCHAR(20);
     done BOOLEAN;
   BEGIN
     done := false;
     WHILE NOT done LOOP
       new_number := 'SUP-' || LPAD(FLOOR(RANDOM() * 9999)::TEXT, 4, '0');
       done := NOT EXISTS(SELECT 1 FROM support_tickets WHERE ticket_number = new_number);
     END LOOP;
     RETURN new_number;
   END;
   $$ LANGUAGE plpgsql;`,

  // Fonction pour générer referral_code
  `CREATE OR REPLACE FUNCTION generate_referral_code(user_first_name VARCHAR)
   RETURNS VARCHAR(20) AS $$
   DECLARE
     new_code VARCHAR(20);
     done BOOLEAN;
     prefix VARCHAR(10);
   BEGIN
     prefix := UPPER(SUBSTRING(user_first_name, 1, 4));
     done := false;
     WHILE NOT done LOOP
       new_code := prefix || LPAD(FLOOR(RANDOM() * 9999)::TEXT, 4, '0');
       done := NOT EXISTS(SELECT 1 FROM users WHERE referral_code = new_code);
     END LOOP;
     RETURN new_code;
   END;
   $$ LANGUAGE plpgsql;`,

  // ======================================
  // Migration: Table expenses (Dépenses)
  // ======================================
  `CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(50),
    reference VARCHAR(100),
    created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);`,
  `CREATE INDEX IF NOT EXISTS idx_expenses_created ON expenses(created_at DESC);`,

  // ======================================
  // Migration: Table training_quizzes (Quiz de formation)
  // ======================================
  `CREATE TABLE IF NOT EXISTS training_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('restaurant', 'delivery')),
    questions JSONB NOT NULL DEFAULT '[]',
    passing_score DECIMAL(5,2) DEFAULT 80.0 CHECK (passing_score BETWEEN 0 AND 100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE INDEX IF NOT EXISTS idx_quizzes_type ON training_quizzes(type);`,
  `CREATE INDEX IF NOT EXISTS idx_quizzes_active ON training_quizzes(is_active) WHERE is_active = true;`,

  // ======================================
  // Migration: Table quiz_results (Résultats des quiz)
  // ======================================
  `CREATE TABLE IF NOT EXISTS quiz_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES training_quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('restaurant', 'delivery')),
    answers JSONB NOT NULL DEFAULT '[]',
    score DECIMAL(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
    passed BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_quiz UNIQUE(quiz_id, user_id, user_type)
  );`,

  `CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz ON quiz_results(quiz_id);`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON quiz_results(user_id, user_type);`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_results_passed ON quiz_results(passed) WHERE passed = true;`,

  // ======================================
  // Migration: Table activity_logs (si elle n'existe pas)
  // ======================================
  `CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_type VARCHAR(50) CHECK (user_type IN ('admin', 'user', 'restaurant', 'delivery')),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id, user_type);`,
  `CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);`,
  `CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);`,
];

// Fonction pour vérifier si une table existe
const tableExists = async (tableName) => {
  const result = await query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = $1
    )`,
    [tableName]
  );
  return result.rows[0].exists;
};

// Fonction pour compter les enregistrements d'une table
const countRecords = async (tableName) => {
  const exists = await tableExists(tableName);
  if (!exists) return 0;
  
  const result = await query(`SELECT COUNT(*) FROM ${tableName}`);
  return parseInt(result.rows[0].count);
};

// Fonction pour exécuter les migrations
const runMigrations = async () => {
  try {
    logger.info('════════════════════════════════════════');
    logger.info('  DÉMARRAGE DES MIGRATIONS BAIBEBALO');
    logger.info('════════════════════════════════════════');
    
    // Vérifier la connexion
    const isConnected = await require('./db').testConnection();
    if (!isConnected) {
      throw new Error('Impossible de se connecter à la base de données');
    }

    // Exécuter toutes les migrations
    await executeQueries(migrations);
    
    logger.info('✓ Toutes les migrations SQL exécutées');
    
    // Créer un admin par défaut si aucun n'existe
    const adminExists = await query('SELECT id FROM admins LIMIT 1');
    
    if (adminExists.rows.length === 0) {
      const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@2025!';
      const passwordHash = await bcrypt.hash(defaultPassword, parseInt(config.bcryptRounds || 10));
      
      await query(
        `INSERT INTO admins (email, password_hash, full_name, role, permissions)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'admin@baibebalo.ci',
          passwordHash,
          'Super Administrateur',
          'super_admin',
          JSON.stringify({ all: true })
        ]
      );
      
      logger.info('✓ Admin par défaut créé');
      logger.info('  Email: admin@baibebalo.ci');
      logger.info(`  Password: ${defaultPassword}`);
      logger.warn('⚠️  CHANGEZ LE MOT DE PASSE ADMIN EN PRODUCTION!');
    }
    
    // Insérer des paramètres par défaut
    const settingsToInsert = [
      ['business_hours', { open: '08:00', close: '22:00' }, 'Horaires de fonctionnement'],
      ['delivery_zones', [], 'Zones de livraison actives'],
      ['commission_rates', { restaurant: 15, delivery: 30 }, 'Taux de commission'],
      ['default_delivery_fee', 500, 'Frais de livraison par défaut (FCFA)'],
      ['min_order_amount', 1000, 'Montant minimum de commande (FCFA)'],
      ['max_delivery_radius', 10, 'Rayon maximum de livraison (km)'],
      ['loyalty_points_rate', 0.01, 'Points de fidélité par FCFA dépensé'],
      ['referrer_reward', 500, 'Récompense parrain (FCFA)'],
      ['referee_discount', 50, 'Réduction filleul première commande (%)'],
      ['maintenance_mode', false, 'Mode maintenance activé'],
      ['app_version', { android: '1.0.0', ios: '1.0.0' }, 'Versions minimales des apps'],
    ];

    for (const [key, value, description] of settingsToInsert) {
      await query(
        `INSERT INTO app_settings (key, value, description, is_public)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (key) DO NOTHING`,
        [key, JSON.stringify(value), description, true]
      );
    }
    
    logger.info('✓ Paramètres par défaut insérés');
    
    // Afficher un résumé
    logger.info('');
    logger.info('════════════════════════════════════════');
    logger.info('  RÉSUMÉ DES MIGRATIONS');
    logger.info('════════════════════════════════════════');
    
    const tables = [
      'users', 'addresses', 'restaurants', 'menu_categories', 'menu_items',
      'delivery_persons', 'orders', 'order_items', 'favorites', 'reviews',
      'promotions', 'transactions', 'notifications', 'otp_codes', 'admins',
      'payout_requests', 'support_tickets', 'ticket_messages', 'app_settings', 
      'audit_logs', 'expenses', 'training_quizzes', 'quiz_results', 'activity_logs'
    ];

    for (const table of tables) {
      const count = await countRecords(table);
      logger.info(`  • ${table}: ${count} enregistrement(s)`);
    }
    
    logger.info('════════════════════════════════════════');
    logger.info('✅ MIGRATIONS TERMINÉES AVEC SUCCÈS');
    logger.info('════════════════════════════════════════');
    
  } catch (error) {
    logger.error('❌ ERREUR LORS DES MIGRATIONS', { 
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// Fonction pour reset la base (DANGER!)
const resetDatabase = async () => {
  try {
    logger.warn('════════════════════════════════════════');
    logger.warn('  ⚠️  RESET DE LA BASE DE DONNÉES');
    logger.warn('════════════════════════════════════════');
    
    const tables = [
      'quiz_results', 'training_quizzes', 'expenses', 'activity_logs',
      'audit_logs',
      'ticket_messages', 'support_tickets', 'payout_requests',
      'notifications', 'transactions', 'promotions', 'favorites',
      'reviews', 'order_items', 'orders', 'menu_items', 'menu_categories',
      'delivery_persons', 'restaurants', 'addresses', 'users',
      'otp_codes', 'admins', 'app_settings'
    ];
    
    for (const table of tables) {
      await query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      logger.info(`  ✓ Table ${table} supprimée`);
    }
    
    // Supprimer les fonctions et triggers
    await query(`DROP FUNCTION IF EXISTS update_updated_at_column CASCADE`);
    await query(`DROP FUNCTION IF EXISTS generate_order_number CASCADE`);
    await query(`DROP FUNCTION IF EXISTS generate_ticket_number CASCADE`);
    await query(`DROP FUNCTION IF EXISTS generate_referral_code CASCADE`);
    await query(`DROP FUNCTION IF EXISTS cleanup_expired_otps CASCADE`);
    
    logger.info('  ✓ Fonctions et triggers supprimés');
    logger.info('════════════════════════════════════════');
    logger.info('✅ RESET TERMINÉ');
    logger.info('════════════════════════════════════════');
    
  } catch (error) {
    logger.error('❌ Erreur lors du reset', { error: error.message });
    throw error;
  }
};

// Exécution si appelé directement
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--reset')) {
    resetDatabase()
      .then(() => runMigrations())
      .then(() => {
        logger.info('');
        logger.info('Base de données réinitialisée et migrée avec succès !');
        process.exit(0);
      })
      .catch((error) => {
        logger.error('Échec de l\'opération', { error: error.message });
        process.exit(1);
      });
  } else {
    runMigrations()
      .then(() => {
        process.exit(0);
      })
      .catch((error) => {
        logger.error('Échec des migrations', { error: error.message });
        process.exit(1);
      });
  }
}

module.exports = {
  runMigrations,
  resetDatabase,
  tableExists,
  countRecords,
};
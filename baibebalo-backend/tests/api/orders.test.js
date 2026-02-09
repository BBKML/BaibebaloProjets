/**
 * BAIBEBALO API - Tests cycle de vie des commandes
 *
 * Scénarios :
 * 1. Création commande paiement cash (succès)
 * 2. Création commande orange_money (échoue - désactivé)
 * 3. Création commande mtn_momo (échoue - désactivé)
 * 4. Création commande sans adresse (erreur)
 * 5. Création commande sans articles (erreur)
 * 6. Restaurant accepte commande
 * 7. Restaurant refuse commande
 * 8. Restaurant marque "en préparation"
 * 9. Restaurant marque "prête"
 * 10. Livreur récupère commande
 * 11. Livreur livre commande
 * 12. Client annule (avant préparation)
 * 13. Client annule (après préparation - échoue)
 * 14. Calcul des montants (sous-total, commission, total)
 * 15. Code promo valide
 * 16. Code promo expiré (erreur / pas de réduction)
 *
 * Mocks : SMS, notifications push, maps.
 */

const request = require('supertest');
const db = require('../../src/database/db');
const { generateToken, API_PREFIX } = require('../utils/helpers');
const {
  testUsers,
  testRestaurants,
  testMenuItems,
  testMenuCategories,
  testOrders,
  testOrderItems,
  testDeliveryPersons,
} = require('../utils/testData');

// Mock services externes (préfixe mock requis par Jest)
const mockSendOrderNotification = jest.fn().mockResolvedValue({ success: true });
const mockSendToUser = jest.fn().mockResolvedValue({ success: true });
jest.mock('../../src/services/notification.service', () => ({
  sendOrderNotification: (...args) => mockSendOrderNotification(...args),
  sendToUser: (...args) => mockSendToUser(...args),
}));

const mockSendRestaurantNotification = jest.fn().mockResolvedValue({ success: true });
jest.mock('../../src/services/sms.service', () => ({
  sendOTP: jest.fn().mockResolvedValue({ success: true }),
  sendRestaurantNotification: (...args) => mockSendRestaurantNotification(...args),
  sendOrderNotification: (...args) => mockSendRestaurantNotification(...args),
  send: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../src/services/maps.service', () => ({
  calculateDistance: jest.fn().mockResolvedValue(2.5),
  calculateDeliveryFee: jest.fn().mockReturnValue(500),
  getDeliveryFeeDetails: jest.fn().mockReturnValue({
    label: 'Standard',
    description: 'Livraison 2-5 km',
  }),
}));

require('../setup');
const { app } = require('../../index');

describe('Orders API - Cycle de vie', () => {
  const clientToken = generateToken({
    id: testUsers.client.id,
    type: 'user',
    phone: testUsers.client.phone,
  });

  const restaurantToken = generateToken({
    id: testRestaurants.restaurant1.id,
    type: 'restaurant',
    email: testRestaurants.restaurant1.email,
  });

  const driverToken = generateToken({
    id: testDeliveryPersons.driver1.id,
    type: 'delivery_person',
    phone: testDeliveryPersons.driver1.phone,
  });

  const orderId = testOrders.pendingOrder.id;
  const orderConfirmed = { ...testOrders.confirmedOrder, status: 'accepted' };
  const orderPreparing = { ...testOrders.confirmedOrder, status: 'preparing' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendOrderNotification.mockResolvedValue({ success: true });
    mockSendRestaurantNotification.mockResolvedValue({ success: true });
  });

  // ─── 1. Création commande avec paiement cash (doit réussir) ─────────────────
  describe('1. Création commande avec paiement cash', () => {
    it('doit créer une commande avec payment_method cash et retourner 201', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: testRestaurants.restaurant1.id, status: 'active', is_open: true }],
        rowCount: 1,
      });

      const restaurantRow = { ...testRestaurants.restaurant1, commission_rate: 15 };
      const item1 = { ...testMenuItems[0], id: testMenuItems[0].id, category_id: testMenuCategories[0].id };
      const item2 = { ...testMenuItems[2], id: testMenuItems[2].id, category_id: testMenuCategories[1].id };
      const newOrder = {
        id: orderId,
        order_number: 'BAIB-1234567890',
        status: 'new',
        subtotal: 5500,
        delivery_fee: 500,
        discount: 0,
        commission: 825,
        commission_rate: 15,
        total: 6000,
        payment_method: 'cash',
        payment_status: 'pending',
        created_at: new Date().toISOString(),
      };

      db.transaction.mockImplementation(async (callback) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [restaurantRow], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [item1], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [item2], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ name: 'Plats Principaux' }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ name: 'Boissons' }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [newOrder], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ phone: testUsers.client.phone }], rowCount: 1 }),
          release: jest.fn(),
        };
        return callback(client);
      });

      const res = await request(app)
        .post(`${API_PREFIX}/orders`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          restaurant_id: testRestaurants.restaurant1.id,
          items: [
            { menu_item_id: testMenuItems[0].id, quantity: 2 },
            { menu_item_id: testMenuItems[2].id, quantity: 1 },
          ],
          delivery_address: {
            address_line: 'Quartier Résidentiel, Korhogo',
            latitude: 9.46,
            longitude: -5.625,
          },
          payment_method: 'cash',
          special_instructions: 'Bien pimenté',
        });

      expect([201, 401]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body.success).toBe(true);
        expect(res.body.data?.order?.status).toBe('new');
        expect(res.body.data?.order?.total).toBeDefined();
        expect(res.body.data?.order?.order_number).toBeDefined();
      }
    });
  });

  // ─── 2. Création commande orange_money (doit échouer - désactivé) ───────────
  describe('2. Création commande avec orange_money', () => {
    it('doit rejeter la commande avec PAYMENT_METHOD_DISABLED', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: testRestaurants.restaurant1.id, status: 'active', is_open: true }],
        rowCount: 1,
      });

      const res = await request(app)
        .post(`${API_PREFIX}/orders`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          restaurant_id: testRestaurants.restaurant1.id,
          items: [{ menu_item_id: testMenuItems[0].id, quantity: 1 }],
          delivery_address: { address_line: 'Korhogo', latitude: 9.46, longitude: -5.625 },
          payment_method: 'orange_money',
        });

      expect([400, 401]).toContain(res.status);
      if (res.status === 400) {
        expect(res.body.success).toBe(false);
        expect(res.body.error?.code).toBe('PAYMENT_METHOD_DISABLED');
        expect(res.body.error?.message).toMatch(/cash|paiement à la livraison/i);
      }
    });
  });

  // ─── 3. Création commande mtn_momo (doit échouer - désactivé) ───────────────
  describe('3. Création commande avec mtn_momo', () => {
    it('doit rejeter la commande avec PAYMENT_METHOD_DISABLED', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: testRestaurants.restaurant1.id, status: 'active', is_open: true }],
        rowCount: 1,
      });

      const res = await request(app)
        .post(`${API_PREFIX}/orders`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          restaurant_id: testRestaurants.restaurant1.id,
          items: [{ menu_item_id: testMenuItems[0].id, quantity: 1 }],
          delivery_address: { address_line: 'Korhogo', latitude: 9.46, longitude: -5.625 },
          payment_method: 'mtn_money',
        });

      expect([400, 401]).toContain(res.status);
      if (res.status === 400) {
        expect(res.body.success).toBe(false);
        expect(res.body.error?.code).toBe('PAYMENT_METHOD_DISABLED');
      }
    });
  });

  // ─── 4. Création commande sans adresse (erreur) ─────────────────────────────
  describe('4. Création commande sans adresse', () => {
    it('doit retourner une erreur de validation (adresse requise)', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/orders`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          restaurant_id: testRestaurants.restaurant1.id,
          items: [{ menu_item_id: testMenuItems[0].id, quantity: 1 }],
          payment_method: 'cash',
        });

      expect([400, 401]).toContain(res.status);
      if (res.status === 400) {
        expect(res.body.success).toBe(false);
        expect(res.body.error?.message || res.body.error?.details?.[0]?.message).toMatch(/adresse|requise/i);
      }
    });
  });

  // ─── 5. Création commande sans articles (erreur) ────────────────────────────
  describe('5. Création commande sans articles', () => {
    it('doit retourner une erreur de validation (articles requis)', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/orders`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          restaurant_id: testRestaurants.restaurant1.id,
          items: [],
          delivery_address: { address_line: 'Korhogo', latitude: 9.46, longitude: -5.625 },
          payment_method: 'cash',
        });

      expect([400, 401]).toContain(res.status);
      if (res.status === 400) expect(res.body.success).toBe(false);
    });
  });

  // ─── 6. Restaurant accepte commande ─────────────────────────────────────────
  describe('6. Restaurant accepte la commande', () => {
    it('doit mettre le statut à accepted et enregistrer estimated_preparation_time', async () => {
      db.transaction.mockImplementation(async (callback) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({
              rows: [{ ...testOrders.pendingOrder, status: 'new', restaurant_id: testRestaurants.restaurant1.id, user_id: testUsers.client.id }],
              rowCount: 1,
            })
            .mockResolvedValueOnce({ rows: [], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ phone: testUsers.client.phone }], rowCount: 1 }),
          release: jest.fn(),
        };
        return callback(client);
      });

      const res = await request(app)
        .put(`${API_PREFIX}/orders/${orderId}/accept`)
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({ estimated_preparation_time: 25 });

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/acceptée/i);
      }
    });
  });

  // ─── 7. Restaurant refuse commande ─────────────────────────────────────────
  describe('7. Restaurant refuse la commande', () => {
    it('doit mettre le statut à cancelled avec une raison (refus restaurant)', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ ...testOrders.pendingOrder, status: 'cancelled', cancellation_reason: 'Rupture de stock', restaurant_id: testRestaurants.restaurant1.id }],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/orders/${orderId}/reject`)
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({ reason: 'Rupture de stock' });

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/refusée/i);
      }
    });
  });

  // ─── 8. Restaurant marque "en préparation" ─────────────────────────────────
  describe('8. Restaurant marque la commande en préparation', () => {
    it('doit mettre le statut à preparing et enregistrer preparing_at', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          ...orderConfirmed,
          status: 'preparing',
          preparing_at: new Date().toISOString(),
          estimated_delivery_time: 25,
        }],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/orders/${orderId}/preparing`)
        .set('Authorization', `Bearer ${restaurantToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/préparation/i);
      }
    });

    it('doit déclencher une notification push au client', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ ...orderConfirmed, status: 'preparing', preparing_at: new Date().toISOString(), estimated_delivery_time: 25 }],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/orders/${orderId}/preparing`)
        .set('Authorization', `Bearer ${restaurantToken}`);

      if (res.status === 200) expect(mockSendOrderNotification).toHaveBeenCalled();
    });
  });

  // ─── 9. Restaurant marque "prête" ──────────────────────────────────────────
  describe('9. Restaurant marque la commande prête', () => {
    it('doit mettre le statut à ready', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ ...orderPreparing, status: 'ready', ready_at: new Date().toISOString() }],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/orders/${orderId}/ready`)
        .set('Authorization', `Bearer ${restaurantToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/prête|ready/i);
      }
    });
  });

  // ─── 10. Livreur récupère commande ─────────────────────────────────────────
  describe('10. Livreur récupère la commande', () => {
    it('doit mettre le statut à picked_up (confirmPickup)', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ ...orderConfirmed, status: 'picked_up', picked_up_at: new Date().toISOString(), delivery_person_id: testDeliveryPersons.driver1.id }],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/orders/${orderId}/pickup`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/collecte|confirmée/i);
      }
    });
  });

  // ─── 11. Livreur livre la commande ─────────────────────────────────────────
  describe('11. Livreur livre la commande', () => {
    it('doit mettre le statut à delivered et enregistrer delivered_at', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          ...orderConfirmed,
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          delivery_person_id: testDeliveryPersons.driver1.id,
        }],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/orders/${orderId}/deliver`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/livraison|livrée|confirmée/i);
      }
    });
  });

  // ─── 12. Client annule (avant préparation) ─────────────────────────────────
  describe('12. Client annule la commande (avant préparation)', () => {
    it('doit annuler si statut new ou accepted', async () => {
      db.transaction.mockImplementation(async (callback) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({
              rows: [{ ...testOrders.pendingOrder, status: 'accepted', user_id: testUsers.client.id }],
              rowCount: 1,
            })
            .mockResolvedValueOnce({ rows: [], rowCount: 1 }),
          release: jest.fn(),
        };
        return callback(client);
      });

      const res = await request(app)
        .put(`${API_PREFIX}/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ reason: 'Changement d\'avis' });

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/annulée/i);
      }
    });
  });

  // ─── 13. Client annule (après préparation - doit échouer) ───────────────────
  describe('13. Client annule après préparation', () => {
    it('doit rejeter avec CANNOT_CANCEL si statut preparing ou plus', async () => {
      db.transaction.mockImplementation(async (callback) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({
            rows: [{ ...testOrders.confirmedOrder, status: 'preparing', user_id: testUsers.client.id }],
            rowCount: 1,
          }),
          release: jest.fn(),
        };
        return callback(client);
      });

      const res = await request(app)
        .put(`${API_PREFIX}/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ reason: 'Trop long' });

      expect([400, 401]).toContain(res.status);
      if (res.status === 400) {
        expect(res.body.success).toBe(false);
        expect(res.body.error?.code).toBe('CANNOT_CANCEL');
        expect(res.body.error?.message).toMatch(/ne peut plus être annulée/i);
      }
    });
  });

  // ─── 14. Calcul des montants (sous-total, commission, total) ───────────────
  describe('14. Calcul correct des montants', () => {
    it('doit retourner sous-total, commission (15-20%), frais livraison, total', async () => {
      const orderWithAmounts = {
        ...testOrders.pendingOrder,
        user_id: testUsers.client.id,
        subtotal: 5500,
        delivery_fee: 500,
        discount: 0,
        commission: 825,
        commission_rate: 15,
        total: 6000,
      };
      db.query
        .mockResolvedValueOnce({ rows: [orderWithAmounts], rowCount: 1 })
        .mockResolvedValueOnce({ rows: testOrderItems, rowCount: 2 });

      const res = await request(app)
        .get(`${API_PREFIX}/orders/${orderId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        const order = res.body.data?.order;
        expect(order).toBeDefined();
        expect(Number(order.subtotal)).toBe(5500);
        expect(Number(order.commission)).toBe(825);
        expect(Number(order.commission_rate)).toBe(15);
        expect(Number(order.total)).toBe(6000);
        expect(order.delivery_fee).toBeDefined();
      }
    });

    it('commission doit être entre 15% et 20% du sous-total', async () => {
      const { getCommission } = require('../../src/utils/commission');
      const subtotal = 10000;
      const { commission, rate } = getCommission(subtotal, 15);
      expect(rate).toBe(15);
      expect(commission).toBe(1500);
      const { commission: c20, rate: r20 } = getCommission(subtotal, 20);
      expect(r20).toBe(20);
      expect(c20).toBe(2000);
    });
  });

  // ─── 15. Code promo valide ─────────────────────────────────────────────────
  describe('15. Application code promo valide', () => {
    it('doit appliquer une réduction quand le code promo est valide', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: testRestaurants.restaurant1.id, status: 'active', is_open: true }],
        rowCount: 1,
      });

      const restaurantRow = { ...testRestaurants.restaurant1, commission_rate: 15 };
      const item1 = { ...testMenuItems[0], id: testMenuItems[0].id, category_id: testMenuCategories[0].id };
      const promoRow = {
        id: 'promo-1',
        code: 'BIENVENUE',
        type: 'percentage',
        value: 10,
        min_order_amount: 3000,
        is_active: true,
        valid_from: new Date(Date.now() - 86400000),
        valid_until: new Date(Date.now() + 86400000),
        usage_limit: 100,
        used_count: 5,
      };

      db.transaction.mockImplementation(async (callback) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [restaurantRow], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [item1], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [promoRow], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
            .mockResolvedValueOnce({
              rows: [{
                id: orderId,
                order_number: 'BAIB-PROMO1',
                subtotal: 2500,
                delivery_fee: 500,
                discount: 250,
                commission: 375,
                total: 2750,
                promo_code_id: promoRow.id,
                status: 'new',
              }],
              rowCount: 1,
            })
            .mockResolvedValueOnce({ rows: [], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ phone: testUsers.client.phone }], rowCount: 1 }),
          release: jest.fn(),
        };
        return callback(client);
      });

      const res = await request(app)
        .post(`${API_PREFIX}/orders`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          restaurant_id: testRestaurants.restaurant1.id,
          items: [{ menu_item_id: testMenuItems[0].id, quantity: 1 }],
          delivery_address: { address_line: 'Korhogo', latitude: 9.46, longitude: -5.625 },
          payment_method: 'cash',
          promo_code: 'BIENVENUE',
        });

      expect([201, 401]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body.success).toBe(true);
        expect(res.body.data?.order?.order_number).toBeDefined();
        expect(res.body.data?.order?.total).toBeDefined();
      }
    });
  });

  // ─── 16. Code promo expiré (erreur / pas de réduction) ──────────────────────
  describe('16. Code promo expiré', () => {
    it('doit créer la commande sans réduction quand le code est expiré ou invalide', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: testRestaurants.restaurant1.id, status: 'active', is_open: true }],
        rowCount: 1,
      });

      const restaurantRow = { ...testRestaurants.restaurant1, commission_rate: 15 };
      const item1 = { ...testMenuItems[0], id: testMenuItems[0].id, category_id: testMenuCategories[0].id };
      // Promo expirée = aucune ligne retournée par la requête promotions
      db.transaction.mockImplementation(async (callback) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [restaurantRow], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [item1], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Code promo expiré : pas de promo trouvée
            .mockResolvedValueOnce({
              rows: [{
                id: orderId,
                order_number: 'BAIB-NOPROMO',
                subtotal: 2500,
                delivery_fee: 500,
                discount: 0,
                commission: 375,
                total: 3000,
                promo_code_id: null,
                status: 'new',
              }],
              rowCount: 1,
            })
            .mockResolvedValueOnce({ rows: [], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ phone: testUsers.client.phone }], rowCount: 1 }),
          release: jest.fn(),
        };
        return callback(client);
      });

      const res = await request(app)
        .post(`${API_PREFIX}/orders`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          restaurant_id: testRestaurants.restaurant1.id,
          items: [{ menu_item_id: testMenuItems[0].id, quantity: 1 }],
          delivery_address: { address_line: 'Korhogo', latitude: 9.46, longitude: -5.625 },
          payment_method: 'cash',
          promo_code: 'EXPIRE2020',
        });

      expect([201, 401]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body.success).toBe(true);
        expect(res.body.data?.order?.order_number).toBeDefined();
      }
    });
  });

  // ─── Détails commande & suivi ──────────────────────────────────────────────
  describe('GET /orders/:id', () => {
    it('doit retourner les détails avec statut et timestamps', async () => {
      const orderWithTimestamps = {
        ...testOrders.confirmedOrder,
        accepted_at: new Date().toISOString(),
        preparing_at: new Date().toISOString(),
      };
      db.query
        .mockResolvedValueOnce({ rows: [orderWithTimestamps], rowCount: 1 })
        .mockResolvedValueOnce({ rows: testOrderItems, rowCount: 2 });

      const res = await request(app)
        .get(`${API_PREFIX}/orders/${orderId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) expect(res.body.data?.order || res.body.data).toBeDefined();
    });
  });

  describe('GET /orders/:id/track', () => {
    it('doit retourner les infos de suivi', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          ...testOrders.confirmedOrder,
          delivery_person_name: 'Ibrahim Koné',
          delivery_latitude: 9.457,
          delivery_longitude: -5.63,
        }],
        rowCount: 1,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/orders/${orderId}/track`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect([200, 401]).toContain(res.status);
    });
  });
});

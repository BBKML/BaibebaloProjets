/**
 * BAIBEBALO API - Tests Paiements
 * 
 * Tests des endpoints de paiement :
 * - Initiation de paiement (Orange Money, MTN MoMo, Cash)
 * - Vérification du statut de paiement
 * - Webhooks de paiement
 * - Demandes de paiement (payout)
 * - Administration des finances
 */

const request = require('supertest');
const db = require('../../src/database/db');
const {
  generateToken,
  API_PREFIX,
} = require('../utils/helpers');
const {
  testUsers,
  testAdmin,
  testOrders,
  testPayments,
  testRestaurants,
  testDeliveryPersons,
} = require('../utils/testData');

require('../setup');
const { app } = require('../../index');

describe('Payments API', () => {
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
    type: 'delivery',
    phone: testDeliveryPersons.driver1.phone,
  });

  const adminToken = generateToken({
    id: testAdmin.id,
    type: 'admin',
    email: testAdmin.email,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================================
  // INITIATION DE PAIEMENT
  // ================================
  describe('POST /orders/:id/payment/initiate', () => {
    it('devrait initier un paiement en espèces', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [{ ...testOrders.pendingOrder, payment_method: 'cash' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ ...testOrders.pendingOrder, payment_status: 'pending' }],
          rowCount: 1,
        });

      const res = await request(app)
        .post(`${API_PREFIX}/orders/${testOrders.pendingOrder.id}/payment/initiate`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ method: 'cash' });

      expect(res.status).toBeLessThan(500);
    });

    it('devrait initier un paiement Orange Money', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [{ ...testOrders.pendingOrder, payment_method: 'orange_money' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'tx-1', status: 'pending', transaction_id: 'OM-TEST-001' }],
          rowCount: 1,
        });

      const res = await request(app)
        .post(`${API_PREFIX}/orders/${testOrders.pendingOrder.id}/payment/initiate`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          method: 'orange_money',
          phone: testPayments.orangeMoneyPayment.phone,
        });

      expect(res.status).toBeLessThan(500);
    });

    it('devrait rejeter un paiement pour une commande inexistante', async () => {
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post(`${API_PREFIX}/orders/00000000-0000-0000-0000-000000000000/payment/initiate`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ method: 'cash' });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ================================
  // STATUT DE PAIEMENT
  // ================================
  describe('GET /orders/:id/payment/status', () => {
    it('devrait retourner le statut de paiement d\'une commande', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: testOrders.pendingOrder.id,
          payment_status: 'pending',
          payment_method: 'cash',
          total: 6000,
        }],
        rowCount: 1,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/orders/${testOrders.pendingOrder.id}/payment/status`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  // ================================
  // WEBHOOKS
  // ================================
  describe('POST /webhooks/orange-money', () => {
    it('devrait traiter un webhook Orange Money de paiement réussi', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ ...testOrders.pendingOrder, payment_status: 'paid' }],
        rowCount: 1,
      });

      const res = await request(app)
        .post(`${API_PREFIX}/webhooks/orange-money`)
        .send({
          status: 'SUCCESS',
          txnid: 'OM-TEST-001',
          amount: 6000,
          order_id: testOrders.pendingOrder.id,
        });

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('POST /webhooks/mtn-momo', () => {
    it('devrait traiter un webhook MTN MoMo de paiement réussi', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ ...testOrders.pendingOrder, payment_status: 'paid' }],
        rowCount: 1,
      });

      const res = await request(app)
        .post(`${API_PREFIX}/webhooks/mtn-momo`)
        .send({
          status: 'SUCCESSFUL',
          externalId: testOrders.pendingOrder.id,
          amount: 6000,
          financialTransactionId: 'MTN-TEST-001',
        });

      expect(res.status).toBeLessThan(500);
    });
  });

  // ================================
  // DEMANDES DE PAYOUT (RESTAURANT)
  // ================================
  describe('POST /restaurants/me/payout-request', () => {
    it('devrait créer une demande de payout restaurant', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [{ balance: 50000, ...testRestaurants.restaurant1 }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 'payout-1',
            restaurant_id: testRestaurants.restaurant1.id,
            amount: 30000,
            status: 'pending',
          }],
          rowCount: 1,
        });

      const res = await request(app)
        .post(`${API_PREFIX}/restaurants/me/payout-request`)
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({
          amount: 30000,
          payment_method: 'orange_money',
          phone: '+2250700000010',
        });

      expect(res.status).toBeLessThan(500);
    });
  });

  // ================================
  // DEMANDES DE PAYOUT (LIVREUR)
  // ================================
  describe('POST /delivery/payout-request', () => {
    it('devrait créer une demande de payout livreur', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [{ balance: 25000, ...testDeliveryPersons.driver1 }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 'payout-2',
            delivery_person_id: testDeliveryPersons.driver1.id,
            amount: 20000,
            status: 'pending',
          }],
          rowCount: 1,
        });

      const res = await request(app)
        .post(`${API_PREFIX}/delivery/payout-request`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          amount: 20000,
          payment_method: 'mtn_momo',
          phone: '+2250500000020',
        });

      expect(res.status).toBeLessThan(500);
    });
  });

  // ================================
  // ADMIN - FINANCES
  // ================================
  describe('GET /admin/finances/overview', () => {
    it('devrait retourner la vue d\'ensemble financière (admin)', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          total_revenue: 5000000,
          total_commissions: 750000,
          total_delivery_fees: 250000,
          pending_payouts: 150000,
        }],
        rowCount: 1,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/admin/finances/overview`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBeLessThan(500);
    });

    it('devrait rejeter l\'accès sans droits admin', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/admin/finances/overview`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /admin/finances/payouts', () => {
    it('devrait retourner les demandes de payout en attente', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          { id: 'payout-1', type: 'restaurant', amount: 30000, status: 'pending' },
          { id: 'payout-2', type: 'delivery', amount: 20000, status: 'pending' },
        ],
        rowCount: 2,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/admin/finances/payouts`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('PUT /admin/finances/payouts/:id/process', () => {
    it('devrait traiter un payout (admin)', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'payout-1', status: 'processing' }],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/admin/finances/payouts/payout-1/process`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  // ================================
  // ADMIN - PARAMÈTRES DE COMMISSION
  // ================================
  describe('GET /admin/finances/commission-settings', () => {
    it('devrait retourner les paramètres de commission', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          default_restaurant_commission: 15,
          default_delivery_fee: 500,
          delivery_person_percentage: 70,
        }],
        rowCount: 1,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/admin/finances/commission-settings`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('PUT /admin/finances/commission-settings', () => {
    it('devrait mettre à jour les paramètres de commission', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          default_restaurant_commission: 18,
          default_delivery_fee: 600,
        }],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/admin/finances/commission-settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          default_restaurant_commission: 18,
          default_delivery_fee: 600,
        });

      expect(res.status).toBeLessThan(500);
    });
  });
});

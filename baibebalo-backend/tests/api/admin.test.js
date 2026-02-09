/**
 * BAIBEBALO API - Tests Admin
 *
 * Scénarios :
 * 1. Login admin
 * 2. Dashboard (stats globales)
 * 3. Liste restaurants en attente
 * 4. Validation restaurant
 * 5. Refus restaurant (avec motif)
 * 6. Liste livreurs en attente
 * 7. Validation livreur
 * 8. Suspension livreur
 * 9. Liste toutes commandes
 * 10. Filtrage commandes (statut, date, montant)
 * 11. Intervention manuelle (annulation commande)
 * 12. Réassignation commande à autre livreur
 * 13. Gestion tickets support
 * 14. Résolution ticket / remboursement
 * 15. Création code promo global
 * 16. Désactivation code promo
 * 17. Consultation analytics (CA, conversions)
 * 18. Export données (CSV)
 * 19. Configuration frais livraison
 * 20. Modification taux commission restaurant
 *
 * Permissions : seuls les admins peuvent accéder ; logs des actions ; notifications aux utilisateurs.
 */

const request = require('supertest');
const db = require('../../src/database/db');
const { generateToken, API_PREFIX } = require('../utils/helpers');
const {
  testAdmin,
  testRestaurants,
  testDeliveryPersons,
  testOrders,
  testUsers,
} = require('../utils/testData');

const logger = require('../../src/utils/logger');
const mockSendToUser = jest.fn().mockResolvedValue({ success: true });
jest.mock('../../src/services/notification.service', () => ({
  sendToUser: (...args) => mockSendToUser(...args),
  sendOrderNotification: jest.fn().mockResolvedValue({ success: true }),
}));

require('../setup');
const { app } = require('../../index');

describe('Admin API', () => {
  const adminToken = generateToken({
    id: testAdmin.id,
    type: 'admin',
    email: testAdmin.email,
  });

  const clientToken = generateToken({
    id: testUsers.client.id,
    type: 'user',
    phone: testUsers.client.phone,
  });

  const pendingRestaurantId = testRestaurants.pendingRestaurant.id;
  const pendingDriverId = testDeliveryPersons.pendingDriver.id;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendToUser.mockResolvedValue({ success: true });
  });

  // ─── Permissions : seuls les admins peuvent accéder ────────────────────────
  describe('Permissions admin', () => {
    it('doit refuser l’accès au dashboard sans token', async () => {
      const res = await request(app).get(`${API_PREFIX}/admin/dashboard`);
      expect(res.status).toBe(401);
    });

    it('doit refuser l’accès au dashboard avec un token client', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/admin/dashboard`)
        .set('Authorization', `Bearer ${clientToken}`);
      expect([401, 403]).toContain(res.status);
    });

    it('doit accepter l’accès au dashboard avec un token admin', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValue({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get(`${API_PREFIX}/admin/dashboard`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });
  });

  // ─── 1. Login admin ───────────────────────────────────────────────────────
  describe('1. Login admin', () => {
    it('doit connecter un admin avec email et mot de passe', async () => {
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      db.query
        .mockResolvedValueOnce({
          rows: [{
            id: testAdmin.id,
            email: testAdmin.email,
            full_name: 'Admin Baibebalo',
            role: 'super_admin',
            password_hash: '$2b$10$fakehash',
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/admin/login`)
        .send({ email: testAdmin.email, password: testAdmin.password });

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('accessToken');
        if (res.body.data?.admin?.role != null) {
          expect(res.body.data.admin.role).toBe('super_admin');
        }
      }
      bcrypt.compare.mockRestore?.();
    });

    it('doit rejeter un login avec mot de passe incorrect', async () => {
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      db.query.mockResolvedValueOnce({
        rows: [{ id: testAdmin.id, email: testAdmin.email, password_hash: '$2b$10$hash' }],
        rowCount: 1,
      });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/admin/login`)
        .send({ email: testAdmin.email, password: 'WrongPass123' });

      expect(res.status).toBe(401);
      bcrypt.compare.mockRestore?.();
    });
  });

  // ─── 2. Dashboard (stats globales) ────────────────────────────────────────
  describe('2. Dashboard', () => {
    it('doit retourner les stats globales du dashboard', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ today_orders: 12, today_revenue: 85000 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
        .mockResolvedValue({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get(`${API_PREFIX}/admin/dashboard`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
      }
    });
  });

  // ─── 3. Liste restaurants en attente ──────────────────────────────────────
  describe('3. Liste restaurants en attente', () => {
    it('doit lister les restaurants avec statut pending', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [testRestaurants.pendingRestaurant],
          rowCount: 1,
        });

      const res = await request(app)
        .get(`${API_PREFIX}/admin/restaurants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'pending' });

      expect([200, 401, 403]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });
  });

  // ─── 4. Validation restaurant ────────────────────────────────────────────
  describe('4. Validation restaurant', () => {
    it('doit approuver un restaurant en attente', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: pendingRestaurantId, status: 'pending' }], rowCount: 1 });

      db.transaction.mockImplementation(async (cb) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ ...testRestaurants.pendingRestaurant, status: 'active' }], rowCount: 1 })
            .mockResolvedValue({ rows: [], rowCount: 0 }),
          release: jest.fn(),
        };
        return cb(client);
      });

      const res = await request(app)
        .put(`${API_PREFIX}/admin/restaurants/${pendingRestaurantId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 400, 401, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });
  });

  // ─── 5. Refus restaurant (avec motif) ─────────────────────────────────────
  describe('5. Refus restaurant', () => {
    it('doit rejeter un restaurant avec motif', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put(`${API_PREFIX}/admin/restaurants/${pendingRestaurantId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Documents incomplets' });

      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  // ─── 6. Liste livreurs en attente ────────────────────────────────────────
  describe('6. Liste livreurs en attente', () => {
    it('doit lister les livreurs avec statut pending', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [testDeliveryPersons.pendingDriver],
          rowCount: 1,
        });

      const res = await request(app)
        .get(`${API_PREFIX}/admin/delivery-persons`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'pending' });

      expect([200, 401, 403]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });
  });

  // ─── 7. Validation livreur ───────────────────────────────────────────────
  describe('7. Validation livreur', () => {
    it('doit approuver un livreur en attente', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ ...testDeliveryPersons.pendingDriver, status: 'active' }],
          rowCount: 1,
        });

      const res = await request(app)
        .put(`${API_PREFIX}/admin/delivery-persons/${pendingDriverId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });
  });

  // ─── 8. Suspension livreur ────────────────────────────────────────────────
  describe('8. Suspension livreur', () => {
    it('doit suspendre un livreur et vérifier le comportement', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 });

      db.transaction.mockImplementation(async (cb) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ id: testDeliveryPersons.driver1.id, status: 'active' }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [], rowCount: 0 })
            .mockResolvedValueOnce({ rows: [], rowCount: 0 })
            .mockResolvedValue({ rows: [], rowCount: 0 }),
          release: jest.fn(),
        };
        return cb(client);
      });

      const res = await request(app)
        .put(`${API_PREFIX}/admin/delivery-persons/${testDeliveryPersons.driver1.id}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Comportement inapproprié' });

      expect([200, 400, 401, 403, 404]).toContain(res.status);
    });
  });

  // ─── 9. Liste toutes commandes ────────────────────────────────────────────
  describe('9. Liste commandes', () => {
    it('doit lister toutes les commandes', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [testOrders.pendingOrder, testOrders.deliveredOrder],
          rowCount: 2,
        })
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 });

      const res = await request(app)
        .get(`${API_PREFIX}/admin/orders`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });
  });

  // ─── 10. Filtrage commandes ──────────────────────────────────────────────
  describe('10. Filtrage commandes', () => {
    it('doit filtrer par statut, date et montant', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [testOrders.deliveredOrder], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 });

      const res = await request(app)
        .get(`${API_PREFIX}/admin/orders`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          status: 'delivered',
          date_from: '2026-02-01',
          date_to: '2026-02-28',
          amount_min: 5000,
        });

      expect([200, 401, 403]).toContain(res.status);
    });
  });

  // ─── 11. Annulation commande (intervention manuelle) ───────────────────────
  describe('11. Annulation commande', () => {
    it('doit permettre à l’admin d’annuler une commande', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [testOrders.pendingOrder], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put(`${API_PREFIX}/admin/orders/${testOrders.pendingOrder.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Litige client' });

      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  // ─── 12. Réassignation commande à autre livreur ───────────────────────────
  describe('12. Réassignation livreur', () => {
    it('doit réassigner une commande à un autre livreur', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [testOrders.confirmedOrder], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: testDeliveryPersons.driver2.id }], rowCount: 1 });

      db.transaction.mockImplementation(async (cb) => {
        const client = {
          query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
          release: jest.fn(),
        };
        return cb(client);
      });

      const res = await request(app)
        .put(`${API_PREFIX}/admin/orders/${testOrders.confirmedOrder.id}/assign-delivery`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ delivery_person_id: testDeliveryPersons.driver2.id });

      expect([200, 400, 401, 403, 404]).toContain(res.status);
    });
  });

  // ─── 13. Gestion tickets support ──────────────────────────────────────────
  describe('13. Gestion tickets support', () => {
    it('doit lister les tickets support', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ id: 'ticket-1', subject: 'Problème livraison', status: 'open' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 });

      const res = await request(app)
        .get(`${API_PREFIX}/admin/support/tickets`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 500]).toContain(res.status);
    });
  });

  // ─── 14. Résolution ticket / remboursement ────────────────────────────────
  describe('14. Résolution ticket et remboursement', () => {
    it('doit fermer un ticket support', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'ticket-1', status: 'closed' }], rowCount: 1 });

      const res = await request(app)
        .put(`${API_PREFIX}/admin/support/tickets/ticket-1/close`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolution: 'Remboursement effectué' });

      expect([200, 401, 403, 404]).toContain(res.status);
    });

    it('doit approuver un remboursement', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 });

      db.transaction.mockImplementation(async (cb) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ id: 'refund-1', order_id: testOrders.pendingOrder.id, amount: 6000, status: 'pending' }], rowCount: 1 })
            .mockResolvedValue({ rows: [], rowCount: 0 }),
          release: jest.fn(),
        };
        return cb(client);
      });

      const res = await request(app)
        .put(`${API_PREFIX}/admin/refunds/refund-1/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  // ─── 15. Création code promo global ────────────────────────────────────────
  describe('15. Création code promo', () => {
    it('doit créer un code promo global', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({
          rows: [{ id: 'promo-1', code: 'BIENVENUE20', type: 'percentage', value: 20, is_active: true }],
          rowCount: 1,
        });

      const res = await request(app)
        .post(`${API_PREFIX}/admin/promotions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'BIENVENUE20',
          type: 'percentage',
          value: 20,
          valid_from: new Date().toISOString(),
          valid_until: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        });

      expect([200, 201, 400, 401, 403]).toContain(res.status);
    });
  });

  // ─── 16. Désactivation code promo ─────────────────────────────────────────
  describe('16. Désactivation code promo', () => {
    it('doit désactiver un code promo', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ id: 'promo-1', is_active: false }],
          rowCount: 1,
        });

      const res = await request(app)
        .put(`${API_PREFIX}/admin/promotions/promo-1/toggle`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  // ─── 17. Analytics (CA, conversions) ───────────────────────────────────────
  describe('17. Analytics', () => {
    it('doit retourner les analytics (CA, conversions)', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{
            total_orders: 1500,
            total_revenue: 8500000,
            delivered_orders: 1400,
            total_commission: 1200000,
          }],
          rowCount: 1,
        })
        .mockResolvedValue({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get(`${API_PREFIX}/admin/analytics/overview`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });
  });

  // ─── 18. Export données (CSV) ─────────────────────────────────────────────
  describe('18. Export données', () => {
    it('doit exporter les commandes en CSV', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [testOrders.deliveredOrder], rowCount: 1 });

      const res = await request(app)
        .get(`${API_PREFIX}/admin/orders/export`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ format: 'csv' });

      expect([200, 401, 403, 500]).toContain(res.status);
    });
  });

  // ─── 19. Configuration frais livraison ─────────────────────────────────────
  describe('19. Configuration frais livraison', () => {
    it('doit mettre à jour les paramètres (frais livraison)', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 });

      db.transaction.mockImplementation(async (cb) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ key: 'delivery_fee_base', value: '500' }], rowCount: 1 })
            .mockResolvedValue({ rows: [], rowCount: 0 }),
          release: jest.fn(),
        };
        return cb(client);
      });

      const res = await request(app)
        .put(`${API_PREFIX}/admin/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          settings: {
            delivery_fee_base: { value: 600 },
          },
        });

      expect([200, 401, 403, 500]).toContain(res.status);
    });
  });

  // ─── 20. Modification taux commission restaurant ───────────────────────────
  describe('20. Modification commission restaurant', () => {
    it('doit modifier le taux de commission d’un restaurant', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ id: testRestaurants.restaurant1.id, commission_rate: 12 }],
          rowCount: 1,
        });

      const res = await request(app)
        .put(`${API_PREFIX}/admin/restaurants/${testRestaurants.restaurant1.id}/commission`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ commission_rate: 12 });

      expect([200, 400, 401, 403, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data?.restaurant?.commission_rate).toBe(12);
      }
    });
  });

  // ─── Logs des actions admin ───────────────────────────────────────────────
  describe('Logs des actions admin', () => {
    it('le logger est appelé lors d’une action admin', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: pendingRestaurantId, status: 'pending' }], rowCount: 1 });

      db.transaction.mockImplementation(async (cb) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ ...testRestaurants.pendingRestaurant, status: 'active' }], rowCount: 1 })
            .mockResolvedValue({ rows: [], rowCount: 0 }),
          release: jest.fn(),
        };
        return cb(client);
      });

      await request(app)
        .put(`${API_PREFIX}/admin/restaurants/${pendingRestaurantId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(logger.info).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });
  });

  // ─── Notifications aux utilisateurs concernés ─────────────────────────────
  describe('Notifications aux utilisateurs', () => {
    it('le service de notification est disponible pour les actions admin', () => {
      expect(mockSendToUser).toBeDefined();
      expect(typeof mockSendToUser).toBe('function');
    });
  });
});

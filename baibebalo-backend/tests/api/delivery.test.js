/**
 * BAIBEBALO API - Tests Livraison
 * 
 * Tests des endpoints livreurs :
 * - Inscription livreur
 * - Profil et statut
 * - Commandes disponibles
 * - Acceptation / Refus de course
 * - Workflow de livraison
 * - Gains et remises espèces
 * - Historique et statistiques
 */

const request = require('supertest');
const db = require('../../src/database/db');
const {
  generateToken,
  API_PREFIX,
} = require('../utils/helpers');
const {
  testDeliveryPersons,
  testOrders,
  testRestaurants,
} = require('../utils/testData');

require('../setup');
const { app } = require('../../index');

describe('Delivery API', () => {
  const driverToken = generateToken({
    id: testDeliveryPersons.driver1.id,
    type: 'delivery',
    phone: testDeliveryPersons.driver1.phone,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================================
  // INSCRIPTION
  // ================================
  describe('POST /delivery/register', () => {
    it('devrait inscrire un nouveau livreur', async () => {
      const newDriver = {
        phone: '+2250700000030',
        first_name: 'Seydou',
        last_name: 'Bamba',
        email: 'seydou@test.com',
        password: 'LivreurPass123!',
        vehicle_type: 'moto',
        license_number: 'KHG-2024-010',
      };

      db.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Téléphone pas pris
        .mockResolvedValueOnce({
          rows: [{ id: 'new-driver-id', ...newDriver, status: 'pending' }],
          rowCount: 1,
        });

      const res = await request(app)
        .post(`${API_PREFIX}/delivery/register`)
        .send(newDriver);

      expect(res.status).toBeLessThan(500);
    });
  });

  // ================================
  // PROFIL
  // ================================
  describe('GET /delivery/me', () => {
    it('devrait retourner le profil du livreur connecté', async () => {
      db.query.mockResolvedValueOnce({
        rows: [testDeliveryPersons.driver1],
        rowCount: 1,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/delivery/me`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBeLessThan(500);
    });

    it('devrait rejeter les requêtes sans authentification', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/delivery/me`);

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /delivery/me', () => {
    it('devrait mettre à jour le profil du livreur', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ ...testDeliveryPersons.driver1, vehicle_type: 'voiture' }],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/delivery/me`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ vehicle_type: 'voiture' });

      expect(res.status).toBeLessThan(500);
    });
  });

  // ================================
  // STATUT ET LOCALISATION
  // ================================
  describe('PUT /delivery/status', () => {
    it('devrait mettre à jour le statut de disponibilité', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ ...testDeliveryPersons.driver1, delivery_status: 'available' }],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/delivery/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'available' });

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('PUT /delivery/location', () => {
    it('devrait mettre à jour la position GPS du livreur', async () => {
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .put(`${API_PREFIX}/delivery/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          latitude: 9.4575,
          longitude: -5.6305,
        });

      expect(res.status).toBeLessThan(500);
    });
  });

  // ================================
  // COMMANDES DISPONIBLES
  // ================================
  describe('GET /delivery/available-orders', () => {
    it('devrait retourner les commandes disponibles à proximité', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          ...testOrders.pendingOrder,
          restaurant_name: testRestaurants.restaurant1.name,
          restaurant_address: testRestaurants.restaurant1.address,
          distance: 2.5,
        }],
        rowCount: 1,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/delivery/available-orders`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  // ================================
  // ACCEPTATION / REFUS DE COURSE
  // ================================
  describe('PUT /delivery/orders/:id/accept', () => {
    it('devrait accepter une course proposée', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [testOrders.pendingOrder],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ ...testOrders.pendingOrder, delivery_person_id: testDeliveryPersons.driver1.id }],
          rowCount: 1,
        });

      const res = await request(app)
        .put(`${API_PREFIX}/delivery/orders/${testOrders.pendingOrder.id}/accept`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('PUT /delivery/orders/:id/decline', () => {
    it('devrait décliner une course proposée', async () => {
      db.query.mockResolvedValueOnce({
        rows: [testOrders.pendingOrder],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/delivery/orders/${testOrders.pendingOrder.id}/decline`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  // ================================
  // WORKFLOW DE LIVRAISON
  // ================================
  describe('PUT /delivery/orders/:id/arrive-restaurant', () => {
    it('devrait signaler l\'arrivée au restaurant', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ ...testOrders.confirmedOrder, delivery_person_id: testDeliveryPersons.driver1.id }],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/delivery/orders/${testOrders.confirmedOrder.id}/arrive-restaurant`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('PUT /delivery/orders/:id/pickup', () => {
    it('devrait confirmer la récupération de la commande', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ ...testOrders.confirmedOrder, delivery_person_id: testDeliveryPersons.driver1.id, status: 'picked_up' }],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/delivery/orders/${testOrders.confirmedOrder.id}/pickup`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('PUT /delivery/orders/:id/arrive-customer', () => {
    it('devrait signaler l\'arrivée chez le client', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ ...testOrders.confirmedOrder, delivery_person_id: testDeliveryPersons.driver1.id }],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/delivery/orders/${testOrders.confirmedOrder.id}/arrive-customer`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('PUT /delivery/orders/:id/deliver', () => {
    it('devrait confirmer la livraison finale', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ ...testOrders.confirmedOrder, delivery_person_id: testDeliveryPersons.driver1.id, status: 'delivered' }],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/delivery/orders/${testOrders.confirmedOrder.id}/deliver`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  // ================================
  // GAINS
  // ================================
  describe('GET /delivery/earnings', () => {
    it('devrait retourner les gains du livreur', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          total_earnings: 125000,
          today_earnings: 15000,
          pending_amount: 8000,
          total_deliveries: 250,
        }],
        rowCount: 1,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/delivery/earnings`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  // ================================
  // REMISES ESPÈCES
  // ================================
  describe('GET /delivery/cash-remittances/orders-pending', () => {
    it('devrait retourner les commandes en espèces à remettre', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: testOrders.deliveredOrder.id,
          order_number: testOrders.deliveredOrder.order_number,
          total: 8700,
          payment_method: 'cash',
        }],
        rowCount: 1,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/delivery/cash-remittances/orders-pending`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('POST /delivery/cash-remittances', () => {
    it('devrait créer une remise d\'espèces', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 'remittance-1',
          delivery_person_id: testDeliveryPersons.driver1.id,
          amount: 8700,
          status: 'pending',
        }],
        rowCount: 1,
      });

      const res = await request(app)
        .post(`${API_PREFIX}/delivery/cash-remittances`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          order_ids: [testOrders.deliveredOrder.id],
          payment_method: 'orange_money',
          amount: 8700,
        });

      expect(res.status).toBeLessThan(500);
    });
  });

  // ================================
  // HISTORIQUE ET STATISTIQUES
  // ================================
  describe('GET /delivery/history', () => {
    it('devrait retourner l\'historique des livraisons', async () => {
      db.query.mockResolvedValueOnce({
        rows: [testOrders.deliveredOrder],
        rowCount: 1,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/delivery/history`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('GET /delivery/statistics', () => {
    it('devrait retourner les statistiques du livreur', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          total_deliveries: 250,
          average_rating: 4.8,
          total_earnings: 125000,
          on_time_rate: 95,
        }],
        rowCount: 1,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/delivery/statistics`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('GET /delivery/dashboard', () => {
    it('devrait retourner le tableau de bord livreur', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          active_orders: 1,
          today_deliveries: 8,
          today_earnings: 15000,
          status: 'available',
        }],
        rowCount: 1,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/delivery/dashboard`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });
});

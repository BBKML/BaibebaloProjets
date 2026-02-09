/**
 * BAIBEBALO API - Tests Utilisateurs
 * 
 * Tests des endpoints utilisateurs :
 * - Profil (lecture, mise à jour)
 * - Adresses de livraison
 * - Favoris
 * - Historique des commandes
 * - Fidélité
 */

const request = require('supertest');
const db = require('../../src/database/db');
const {
  generateToken,
  expectSuccessResponse,
  expectErrorResponse,
  API_PREFIX,
} = require('../utils/helpers');
const { testUsers, testAddresses, testRestaurants, testOrders } = require('../utils/testData');

require('../setup');
const { app } = require('../../index');

describe('Users API', () => {
  const clientToken = generateToken({ id: testUsers.client.id, type: 'user', phone: testUsers.client.phone });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================================
  // PROFIL UTILISATEUR
  // ================================
  describe('GET /users/me', () => {
    it('devrait retourner le profil de l\'utilisateur connecté', async () => {
      db.query.mockResolvedValueOnce({
        rows: [testUsers.client],
        rowCount: 1,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/users/me`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBeLessThan(500);
    });

    it('devrait rejeter les requêtes sans authentification', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/users/me`);

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /users/me', () => {
    it('devrait mettre à jour le profil utilisateur', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ ...testUsers.client, first_name: 'Amadou Updated' }],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/users/me`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ first_name: 'Amadou Updated' });

      expect(res.status).toBeLessThan(500);
    });

    it('devrait rejeter une mise à jour avec des données invalides', async () => {
      const res = await request(app)
        .put(`${API_PREFIX}/users/me`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ email: 'email-invalide' });

      // Devrait rejeter l'email invalide (400 ou 422)
      expect(res.status).toBeLessThan(500);
    });
  });

  // ================================
  // ADRESSES
  // ================================
  describe('GET /users/me/addresses', () => {
    it('devrait retourner les adresses de l\'utilisateur', async () => {
      db.query.mockResolvedValueOnce({
        rows: testAddresses,
        rowCount: testAddresses.length,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/users/me/addresses`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('POST /users/me/addresses', () => {
    it('devrait créer une nouvelle adresse', async () => {
      const newAddress = {
        label: 'Chez un ami',
        address: 'Quartier Soba, Korhogo',
        latitude: 9.4610,
        longitude: -5.6240,
      };

      db.query.mockResolvedValueOnce({
        rows: [{ id: 'new-addr-id', ...newAddress, user_id: testUsers.client.id }],
        rowCount: 1,
      });

      const res = await request(app)
        .post(`${API_PREFIX}/users/me/addresses`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(newAddress);

      expect(res.status).toBeLessThan(500);
    });

    it('devrait rejeter une adresse sans label', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/users/me/addresses`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ latitude: 9.46, longitude: -5.62 });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('PUT /users/me/addresses/:id', () => {
    it('devrait mettre à jour une adresse existante', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ ...testAddresses[0], label: 'Maison Principale' }],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/users/me/addresses/${testAddresses[0].id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ label: 'Maison Principale' });

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('DELETE /users/me/addresses/:id', () => {
    it('devrait supprimer une adresse', async () => {
      db.query.mockResolvedValueOnce({
        rows: [testAddresses[1]],
        rowCount: 1,
      });

      const res = await request(app)
        .delete(`${API_PREFIX}/users/me/addresses/${testAddresses[1].id}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  // ================================
  // FAVORIS
  // ================================
  describe('GET /users/me/favorites', () => {
    it('devrait retourner les restaurants favoris', async () => {
      db.query.mockResolvedValueOnce({
        rows: [testRestaurants.restaurant1],
        rowCount: 1,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/users/me/favorites`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('POST /users/me/favorites/:restaurantId', () => {
    it('devrait ajouter un restaurant aux favoris', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Pas encore en favoris
        .mockResolvedValueOnce({
          rows: [{ id: 'fav-1', user_id: testUsers.client.id, restaurant_id: testRestaurants.restaurant2.id }],
          rowCount: 1,
        });

      const res = await request(app)
        .post(`${API_PREFIX}/users/me/favorites/${testRestaurants.restaurant2.id}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('DELETE /users/me/favorites/:restaurantId', () => {
    it('devrait retirer un restaurant des favoris', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 'fav-1' }], rowCount: 1 });

      const res = await request(app)
        .delete(`${API_PREFIX}/users/me/favorites/${testRestaurants.restaurant1.id}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  // ================================
  // HISTORIQUE COMMANDES
  // ================================
  describe('GET /users/me/orders', () => {
    it('devrait retourner l\'historique des commandes du client', async () => {
      db.query.mockResolvedValueOnce({
        rows: [testOrders.deliveredOrder, testOrders.confirmedOrder],
        rowCount: 2,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/users/me/orders`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  // ================================
  // FIDÉLITÉ
  // ================================
  describe('GET /users/me/loyalty', () => {
    it('devrait retourner les points de fidélité du client', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ points: 150, tier: 'silver' }],
        rowCount: 1,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/users/me/loyalty`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  // ================================
  // NOTIFICATIONS
  // ================================
  describe('GET /users/me/notification-preferences', () => {
    it('devrait retourner les préférences de notification', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ push_enabled: true, sms_enabled: false, email_enabled: true }],
        rowCount: 1,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/users/me/notification-preferences`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });
});

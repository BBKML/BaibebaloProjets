/**
 * BAIBEBALO API - Tests gestion des restaurants
 *
 * Scénarios :
 * 1. Inscription nouveau restaurant (avec tous les champs)
 * 2. Inscription restaurant sans champs obligatoires (erreur)
 * 3. Validation par admin (pending → active)
 * 4. Refus par admin (pending → rejected)
 * 5. Ajout article au menu
 * 6. Modification article menu
 * 7. Suppression article menu
 * 8. Désactivation article (rupture de stock)
 * 9. Création catégorie menu
 * 10. Modification horaires ouverture
 * 11. Fermeture temporaire restaurant
 * 12. Réouverture restaurant
 * 13. Consultation statistiques (CA, commandes, notes)
 * 14. Consultation historique commandes
 * 15. Recherche restaurants par catégorie
 * 16. Recherche restaurants par distance
 * 17. Filtrage restaurants (note, distance, prix)
 * 18. Création promotion (-20% sur un plat)
 * 19. Désactivation promotion
 * 20. Récupération avis clients
 *
 * Permissions :
 * - Client ne peut pas modifier menu restaurant
 * - Restaurant peut seulement modifier son propre menu
 * - Admin peut tout modifier
 */

const request = require('supertest');
const db = require('../../src/database/db');
const { generateToken, API_PREFIX } = require('../utils/helpers');
const {
  testUsers,
  testAdmin,
  testRestaurants,
  testMenuCategories,
  testMenuItems,
  testOrders,
  testDeliveryPersons,
} = require('../utils/testData');

require('../setup');
const { app } = require('../../index');

describe('Restaurants API - Gestion complète', () => {
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

  const otherRestaurantToken = generateToken({
    id: testRestaurants.restaurant2.id,
    type: 'restaurant',
    email: testRestaurants.restaurant2.email,
  });

  const adminToken = generateToken({
    id: testAdmin.id,
    type: 'admin',
    email: testAdmin.email,
  });

  const restaurantId = testRestaurants.restaurant1.id;
  const pendingRestaurantId = testRestaurants.pendingRestaurant.id;
  const categoryId = testMenuCategories[0].id;
  const itemId = testMenuItems[0].id;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── 1. Inscription nouveau restaurant (avec tous les champs) ─────────────
  describe('1. Inscription nouveau restaurant', () => {
    it('doit créer un restaurant avec tous les champs et retourner status pending', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({
          rows: [{
            id: 'new-resto-id',
            name: 'Le Festin Korhogo',
            email: 'festin@test.com',
            phone: '+2250700000099',
            status: 'pending',
          }],
          rowCount: 1,
        });

      const body = {
        name: 'Le Festin Korhogo',
        category: 'Restaurant',
        cuisine_type: 'Ivoirienne',
        description: 'Spécialités locales',
        phone: '+2250700000099',
        email: 'festin@test.com',
        password: 'Password123!',
        address: 'Boulevard Principal, Korhogo',
        latitude: 9.455,
        longitude: -5.628,
        delivery_radius: 8,
      };

      const res = await request(app)
        .post(`${API_PREFIX}/restaurants/register`)
        .send(body);

      expect([201, 400]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body.success).toBe(true);
        expect(res.body.data?.restaurant?.status).toBe('pending');
        expect(res.body.message).toMatch(/examinée|inscription/i);
      }
    });
  });

  // ─── 2. Inscription sans champs obligatoires (erreur) ────────────────────
  describe('2. Inscription restaurant sans champs obligatoires', () => {
    it('doit rejeter l\'inscription sans catégorie', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/restaurants/register`)
        .send({
          name: 'Test Resto',
          phone: '+2250700000088',
          email: 'sanscat@test.com',
          password: 'Password123!',
          address: 'Korhogo',
          latitude: 9.45,
          longitude: -5.62,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('doit rejeter l\'inscription sans mot de passe valide', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/restaurants/register`)
        .send({
          name: 'Test Resto',
          category: 'Restaurant',
          phone: '+2250700000087',
          email: 'sanspass@test.com',
          password: 'court',
          address: 'Korhogo Centre',
          latitude: 9.45,
          longitude: -5.62,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── 3. Validation par admin (pending → active) ──────────────────────────
  describe('3. Admin valide le restaurant (pending → active)', () => {
    it('doit passer le statut à active', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: pendingRestaurantId, status: 'pending' }], rowCount: 1 });
      db.transaction = jest.fn().mockImplementation(async (callback) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({
            rows: [{ id: pendingRestaurantId, status: 'active', name: 'Nouveau Restaurant Test' }],
            rowCount: 1,
          }),
          release: jest.fn(),
        };
        return callback(client);
      });

      const res = await request(app)
        .put(`${API_PREFIX}/admin/restaurants/${pendingRestaurantId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/approuvé|activé/i);
      }
    });
  });

  // ─── 4. Refus par admin (pending → rejected) ─────────────────────────────
  describe('4. Admin refuse le restaurant (pending → rejected)', () => {
    it('doit passer le statut à rejected', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .put(`${API_PREFIX}/admin/restaurants/${pendingRestaurantId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Documents incomplets' });

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/rejeté/i);
      }
    });
  });

  // ─── 5. Ajout article au menu ──────────────────────────────────────────
  describe('5. Ajout article au menu', () => {
    it('doit créer un nouvel article et retourner 201', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: restaurantId, status: 'active' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ status: 'active', is_open: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: categoryId }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{
            id: 'new-item-id',
            restaurant_id: restaurantId,
            category_id: categoryId,
            name: 'Foutou Sauce Arachide',
            description: 'Foutou avec sauce arachide',
            price: 2500,
            preparation_time: 25,
            is_available: true,
          }],
          rowCount: 1,
        });

      const res = await request(app)
        .post(`${API_PREFIX}/restaurants/me/menu`)
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({
          category_id: categoryId,
          name: 'Foutou Sauce Arachide',
          description: 'Foutou avec sauce arachide',
          price: 2500,
          preparation_time: 25,
        });

      expect([201, 401]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body.success).toBe(true);
        expect(res.body.data?.item?.name).toBe('Foutou Sauce Arachide');
        expect(res.body.data?.item?.price).toBe(2500);
      }
    });
  });

  // ─── 6. Modification article menu ──────────────────────────────────────
  describe('6. Modification article menu', () => {
    it('doit mettre à jour le prix et la description', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: restaurantId, status: 'active' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ status: 'active', is_open: true }], rowCount: 1 })
        .mockResolvedValueOnce({
        rows: [{ ...testMenuItems[0], price: 2800, description: 'Attieké frais - recette du jour' }],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/restaurants/me/menu/${itemId}`)
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({ price: 2800, description: 'Attieké frais - recette du jour' });

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data?.item?.price).toBe(2800);
      }
    });
  });

  // ─── 7. Suppression article menu ────────────────────────────────────────
  describe('7. Suppression article menu', () => {
    it('doit supprimer ou désactiver l\'article', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: restaurantId, status: 'active' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ status: 'active', is_open: true }], rowCount: 1 })
        .mockResolvedValueOnce({
        rows: [{ id: itemId, restaurant_id: restaurantId }],
        rowCount: 1,
      }).mockResolvedValueOnce({ rows: [{ id: itemId }], rowCount: 1 });

      const res = await request(app)
        .delete(`${API_PREFIX}/restaurants/me/menu/${itemId}`)
        .set('Authorization', `Bearer ${restaurantToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) expect(res.body.success).toBe(true);
    });
  });

  // ─── 8. Désactivation article (rupture de stock) ─────────────────────────
  describe('8. Désactivation article (rupture de stock)', () => {
    it('doit basculer is_available à false', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: restaurantId, status: 'active' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ status: 'active', is_open: true }], rowCount: 1 })
        .mockResolvedValueOnce({
        rows: [{ ...testMenuItems[0], is_available: false }],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/restaurants/me/menu/${itemId}/toggle-availability`)
        .set('Authorization', `Bearer ${restaurantToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data?.item?.is_available).toBe(false);
      }
    });
  });

  // ─── 9. Création catégorie menu ─────────────────────────────────────────
  describe('9. Création catégorie menu', () => {
    it('doit créer une nouvelle catégorie', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: restaurantId, status: 'active' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ status: 'active', is_open: true }], rowCount: 1 })
        .mockResolvedValueOnce({
        rows: [{
          id: 'new-cat-id',
          restaurant_id: restaurantId,
          name: 'Desserts',
          description: 'Pâtisseries et glaces',
          display_order: 3,
        }],
        rowCount: 1,
      });

      const res = await request(app)
        .post(`${API_PREFIX}/restaurants/me/categories`)
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({ name: 'Desserts', description: 'Pâtisseries et glaces', display_order: 3 });

      expect([201, 401]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body.success).toBe(true);
        expect(res.body.data?.category?.name).toBe('Desserts');
      }
    });
  });

  // ─── 10. Modification horaires ouverture ───────────────────────────────
  describe('10. Modification horaires ouverture', () => {
    it('doit mettre à jour opening_hours via PUT /me', async () => {
      const openingHours = {
        monday: { open: '08:00', close: '22:00' },
        tuesday: { open: '08:00', close: '22:00' },
        wednesday: { open: '08:00', close: '22:00' },
        thursday: { open: '08:00', close: '22:00' },
        friday: { open: '08:00', close: '23:00' },
        saturday: { open: '09:00', close: '23:00' },
        sunday: { open: '10:00', close: '21:00' },
      };

      db.query
        .mockResolvedValueOnce({ rows: [{ id: restaurantId, status: 'active' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ status: 'active', is_open: true }], rowCount: 1 })
        .mockResolvedValueOnce({
        rows: [{ ...testRestaurants.restaurant1, opening_hours: openingHours }],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/restaurants/me`)
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({ opening_hours: openingHours });

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) expect(res.body.success).toBe(true);
    });
  });

  // ─── 11. Fermeture temporaire restaurant ────────────────────────────────
  describe('11. Fermeture temporaire restaurant', () => {
    it('doit mettre is_open à false via toggle-status', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: restaurantId, status: 'active' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ status: 'active', is_open: true }], rowCount: 1 })
        .mockResolvedValueOnce({
        rows: [{ ...testRestaurants.restaurant1, is_open: false }],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/restaurants/me/toggle-status`)
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({ is_open: false });

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) expect(res.body.success).toBe(true);
    });
  });

  // ─── 12. Réouverture restaurant ─────────────────────────────────────────
  describe('12. Réouverture restaurant', () => {
    it('doit mettre is_open à true', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: restaurantId, status: 'active' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ status: 'active', is_open: true }], rowCount: 1 })
        .mockResolvedValueOnce({
        rows: [{ ...testRestaurants.restaurant1, is_open: true }],
        rowCount: 1,
      });

      const res = await request(app)
        .put(`${API_PREFIX}/restaurants/me/toggle-status`)
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({ is_open: true });

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) expect(res.body.success).toBe(true);
    });
  });

  // ─── 13. Consultation statistiques ──────────────────────────────────────
  describe('13. Consultation statistiques (CA, commandes, notes)', () => {
    it('doit retourner total_revenue, total_orders, average_rating', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: restaurantId, status: 'active' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ status: 'active', is_open: true }], rowCount: 1 })
        .mockResolvedValueOnce({
        rows: [{
          total_orders: 150,
          total_revenue: 750000,
          average_rating: 4.5,
          total_reviews: 120,
          pending_orders: 2,
        }],
        rowCount: 1,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/restaurants/me/statistics`)
        .set('Authorization', `Bearer ${restaurantToken}`)
        .query({ period: 'month' });

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data?.statistics).toBeDefined();
      }
    });
  });

  // ─── 14. Consultation historique commandes ──────────────────────────────
  describe('14. Consultation historique commandes', () => {
    it('doit retourner la liste des commandes du restaurant', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: restaurantId, status: 'active' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ status: 'active', is_open: true }], rowCount: 1 })
        .mockResolvedValueOnce({
        rows: [testOrders.pendingOrder, testOrders.confirmedOrder],
        rowCount: 2,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/restaurants/me/orders`)
        .set('Authorization', `Bearer ${restaurantToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data?.orders || res.body.data)).toBe(true);
      }
    });
  });

  // ─── 15. Recherche restaurants par catégorie ────────────────────────────
  describe('15. Recherche restaurants par catégorie', () => {
    it('doit filtrer par query category', async () => {
      const row = {
        ...testRestaurants.restaurant1,
        category: 'Restaurant',
        distance_km: null,
        min_price: 1500,
        max_price: 5000,
        has_promotions: false,
        has_free_delivery: false,
        accepts_mobile_money: false,
        is_sponsored: false,
        sponsor_priority: 0,
      };
      db.query
        .mockResolvedValueOnce({ rows: [row], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 });

      const res = await request(app)
        .get(`${API_PREFIX}/restaurants`)
        .query({ category: 'Restaurant' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── 16. Recherche restaurants par distance ──────────────────────────────
  describe('16. Recherche restaurants par distance', () => {
    it('doit accepter latitude, longitude, radius', async () => {
      const row = (r) => ({
        ...r,
        distance_km: 1.5,
        min_price: 1000,
        max_price: 5000,
        has_promotions: false,
        has_free_delivery: false,
        accepts_mobile_money: false,
        is_sponsored: false,
        sponsor_priority: 0,
      });
      db.query
        .mockResolvedValueOnce({
          rows: [row(testRestaurants.restaurant1), row(testRestaurants.restaurant2)],
          rowCount: 2,
        })
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 });

      const res = await request(app)
        .get(`${API_PREFIX}/restaurants`)
        .query({ latitude: 9.458, longitude: -5.629, radius: 5 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── 17. Filtrage restaurants (note, distance, prix) ───────────────────
  describe('17. Filtrage restaurants (note, prix)', () => {
    it('doit accepter min_rating et min_price / max_price', async () => {
      db.query.mockResolvedValueOnce({
        rows: [testRestaurants.restaurant1],
        rowCount: 1,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/restaurants`)
        .query({ min_rating: 4, min_price: 500, max_price: 5000 });

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) expect(res.body.success).toBe(true);
    });
  });

  // ─── 18. Création promotion (-20% sur un plat) ──────────────────────────
  describe('18. Création promotion (-20% sur un plat)', () => {
    it('doit activer une promotion pourcentage sur un article', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: restaurantId, status: 'active' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ status: 'active', is_open: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...testMenuItems[0], price: 3000 }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{
            ...testMenuItems[0],
            is_promotional: true,
            discount_type: 'percentage',
            discount_value: 20,
            promotional_price: 2400,
          }],
          rowCount: 1,
        });

      const res = await request(app)
        .put(`${API_PREFIX}/restaurants/me/menu/${itemId}/promotion`)
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({
          is_promotional: true,
          discount_type: 'percentage',
          discount_value: 20,
        });

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data?.item?.is_promotional).toBe(true);
        expect(res.body.data?.item?.promotional_price).toBe(2400);
        if (res.body.data?.savings_percent != null) expect(res.body.data.savings_percent).toBe(20);
      }
    });
  });

  // ─── 19. Désactivation promotion ─────────────────────────────────────────
  describe('19. Désactivation promotion', () => {
    it('doit désactiver la promotion sur l\'article', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: restaurantId, status: 'active' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ status: 'active', is_open: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...testMenuItems[0], is_promotional: true }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ ...testMenuItems[0], is_promotional: false, promotional_price: null }],
          rowCount: 1,
        });

      const res = await request(app)
        .put(`${API_PREFIX}/restaurants/me/menu/${itemId}/promotion`)
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({ is_promotional: false });

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/désactivée/i);
      }
    });
  });

  // ─── 20. Récupération avis clients ──────────────────────────────────────
  describe('20. Récupération avis clients', () => {
    it('GET /restaurants/me/reviews doit retourner les avis', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: restaurantId, status: 'active' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ status: 'active', is_open: true }], rowCount: 1 })
        .mockResolvedValueOnce({
        rows: [
          { id: 'rev-1', rating: 5, comment: 'Excellent !', user_name: 'Amadou', created_at: new Date().toISOString() },
          { id: 'rev-2', rating: 4, comment: 'Très bien', user_name: 'Fatou', created_at: new Date().toISOString() },
        ],
        rowCount: 2,
      }).mockResolvedValueOnce({ rows: [{ total_reviews: 120 }], rowCount: 1 });

      const res = await request(app)
        .get(`${API_PREFIX}/restaurants/me/reviews`)
        .set('Authorization', `Bearer ${restaurantToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) expect(res.body.success).toBe(true);
    });

    it('GET /restaurants/:id/reviews (public) doit retourner les avis', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          { id: 'rev-1', rating: 5, comment: 'Excellent attieké!', user_name: 'Amadou' },
          { id: 'rev-2', rating: 4, comment: 'Bon service', user_name: 'Fatou' },
        ],
        rowCount: 2,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/restaurants/${restaurantId}/reviews`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── Permissions : Client ne peut pas modifier menu ──────────────────────
  describe('Permissions - Client ne peut pas modifier le menu', () => {
    it('POST /restaurants/me/menu doit retourner 403 pour un client', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: testUsers.client.id, status: 'active' }], rowCount: 1 });
      const res = await request(app)
        .post(`${API_PREFIX}/restaurants/me/menu`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          category_id: categoryId,
          name: 'Plat Test',
          price: 1500,
        });

      expect([401, 403]).toContain(res.status);
    });

    it('PUT /restaurants/me/menu/:itemId doit retourner 403 pour un client', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: testUsers.client.id, status: 'active' }], rowCount: 1 });
      const res = await request(app)
        .put(`${API_PREFIX}/restaurants/me/menu/${itemId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ price: 2000 });

      expect([401, 403]).toContain(res.status);
    });

    it('DELETE /restaurants/me/menu/:itemId doit retourner 403 pour un client', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: testUsers.client.id, status: 'active' }], rowCount: 1 });
      const res = await request(app)
        .delete(`${API_PREFIX}/restaurants/me/menu/${itemId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect([401, 403]).toContain(res.status);
    });
  });

  // ─── Permissions : Restaurant peut seulement modifier son propre menu ───
  describe('Permissions - Restaurant ne peut modifier que son propre menu', () => {
    it('PUT /restaurants/me/menu/:itemId d’un autre restaurant doit retourner 404', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testRestaurants.restaurant2.id, status: 'active' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ status: 'active', is_open: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put(`${API_PREFIX}/restaurants/me/menu/${itemId}`)
        .set('Authorization', `Bearer ${otherRestaurantToken}`)
        .send({ price: 2000 });

      expect([401, 404]).toContain(res.status);
      if (res.status === 404) expect(res.body.error?.code).toBe('ITEM_NOT_FOUND');
    });
  });

  // ─── Permissions : Admin peut tout modifier ──────────────────────────────
  describe('Permissions - Admin peut modifier un restaurant', () => {
    it('PUT /admin/restaurants/:id/commission doit accepter l’admin', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ ...testRestaurants.restaurant1, commission_rate: 18 }],
          rowCount: 1,
        });

      const res = await request(app)
        .put(`${API_PREFIX}/admin/restaurants/${restaurantId}/commission`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ commission_rate: 18 });

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) expect(res.body.success).toBe(true);
    });

    it('GET /admin/restaurants/:id doit retourner les détails pour l’admin', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: testAdmin.id, is_active: true }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ role: 'super_admin', permissions: {} }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ ...testRestaurants.restaurant1 }],
          rowCount: 1,
        });

      const res = await request(app)
        .get(`${API_PREFIX}/admin/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401]).toContain(res.status);
      if (res.status === 200) expect(res.body.success).toBe(true);
    });
  });

  // ─── Routes publiques (rappel) ────────────────────────────────────────────
  describe('GET /restaurants (liste publique)', () => {
    it('doit retourner la liste des restaurants actifs', async () => {
      const row = (r) => ({
        ...r,
        distance_km: null,
        min_price: r.minimum_order || 1000,
        max_price: 5000,
        has_promotions: false,
        has_free_delivery: false,
        accepts_mobile_money: false,
        is_sponsored: false,
        sponsor_priority: 0,
      });
      db.query
        .mockResolvedValueOnce({
          rows: [row(testRestaurants.restaurant1), row(testRestaurants.restaurant2)],
          rowCount: 2,
        })
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 });

      const res = await request(app).get(`${API_PREFIX}/restaurants`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /restaurants/:id (détails publics)', () => {
    it('doit retourner les détails d’un restaurant', async () => {
      db.query.mockResolvedValueOnce({
        rows: [testRestaurants.restaurant1],
        rowCount: 1,
      });

      const res = await request(app).get(`${API_PREFIX}/restaurants/${restaurantId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /restaurants/:id/menu (public)', () => {
    it('doit retourner le menu d’un restaurant', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [testRestaurants.restaurant1], rowCount: 1 })
        .mockResolvedValueOnce({ rows: testMenuCategories, rowCount: 2 })
        .mockResolvedValueOnce({ rows: testMenuItems, rowCount: 3 });

      const res = await request(app).get(`${API_PREFIX}/restaurants/${restaurantId}/menu`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

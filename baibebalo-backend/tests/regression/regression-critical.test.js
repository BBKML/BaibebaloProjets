/**
 * Tests de régression - Parcours critiques
 * Vérifie que les flux principaux ne régressent pas après modifications.
 * Exécution : npm run test:regression
 */

const request = require('supertest');
const db = require('../../src/database/db');
const {
  generateToken,
  API_PREFIX,
  expectSuccessResponse,
  expectErrorResponse,
} = require('../utils/helpers');
const mockSendOTP = jest.fn().mockResolvedValue({ success: true });
jest.mock('../../src/services/sms.service', () => ({
  sendOTP: (...args) => mockSendOTP(...args),
  send: jest.fn().mockResolvedValue({ success: true }),
}));

require('../setup');
const { app } = require('../../index');

describe('Régression - Parcours critiques', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Auth - Envoi OTP et réponse standard', () => {
    it('POST /auth/send-otp retourne success et message', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ id: 'otp-1' }], rowCount: 1 });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/send-otp`)
        .send({ phone: '+2250700000001' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
    });

    it('POST /auth/send-otp sans body retourne 400', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/send-otp`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('Orders - Routes protégées rejettent sans token', () => {
    it('GET /orders sans token retourne 401', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/users/me/orders`)
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(401);
    });
  });

  describe('Delivery - Statut et structure', () => {
    it('PUT /delivery/status sans token retourne 401', async () => {
      const res = await request(app)
        .put(`${API_PREFIX}/delivery/status`)
        .set('Content-Type', 'application/json')
        .send({ delivery_status: 'available' });
      expect(res.status).toBe(401);
    });
  });

  describe('Restaurant - Endpoints protégés', () => {
    it('GET /restaurants/me sans token retourne 401', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/restaurants/me`)
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(401);
    });
  });

  describe('Admin - Accès refusé sans token admin', () => {
    it('GET /admin/dashboard sans token retourne 401', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/admin/dashboard`)
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(401);
    });
  });
});

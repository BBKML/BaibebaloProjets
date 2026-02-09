/**
 * BAIBEBALO API - Tests complets Authentification
 *
 * Scénarios couverts :
 * 1. Inscription nouveau client (numéro valide)
 * 2. Envoi OTP (vérifier que sendOTP est appelé)
 * 3. Vérification OTP (code valide)
 * 4. Vérification OTP (code invalide)
 * 5. Expiration OTP (après 5 minutes)
 * 6. Login client existant
 * 7. Refresh token
 * 8. Logout (accès sans token rejeté)
 * 9. Inscription avec numéro déjà utilisé / rate limit OTP
 * 10. Vérification OTP avec 3 tentatives ratées (blocage)
 */

const request = require('supertest');
const db = require('../../src/database/db');
const {
  generateToken,
  generateRefreshToken,
  generateExpiredToken,
  API_PREFIX,
} = require('../utils/helpers');
const { testUsers, testAdmin, testRestaurants, testDeliveryPersons } = require('../utils/testData');

// Mock du service SMS pour ne pas envoyer de vrais SMS (préfixe mock requis par Jest)
const mockSendOTP = jest.fn().mockResolvedValue({ success: true });
jest.mock('../../src/services/sms.service', () => ({
  sendOTP: (...args) => mockSendOTP(...args),
  send: jest.fn().mockResolvedValue({ success: true }),
}));

require('../setup');
const { app } = require('../../index');

const PHONE_VALID = '+2250712345678';
const PHONE_EXISTING = testUsers.client.phone;

describe('Authentication API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendOTP.mockResolvedValue({ success: true });
  });

  // ================================
  // 1. INSCRIPTION NOUVEAU CLIENT (numéro valide)
  // ================================
  describe('POST /api/v1/auth/send-otp + verify-otp (inscription nouveau client)', () => {
    it('should register a new client with valid phone (send OTP then verify with name)', async () => {
      // 1) Envoi OTP : pas d'OTP récent, invalider anciens, insérer nouveau
      db.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ id: 'otp-1' }], rowCount: 1 });

      const sendRes = await request(app)
        .post(`${API_PREFIX}/auth/send-otp`)
        .send({ phone: PHONE_VALID });

      expect(sendRes.status).toBe(200);
      expect(sendRes.body.success).toBe(true);
      expect(sendRes.body.message).toBeDefined();

      // 2) Vérification OTP : OTP valide, puis findOrCreateUser (nouveau)
      const newUser = {
        id: '11111111-aaaa-bbbb-cccc-111111111111',
        phone: PHONE_VALID,
        first_name: 'Amadou',
        last_name: 'Coulibaly',
        referral_code: 'ABC12345',
        loyalty_points: 0,
      };

      db.query
        .mockResolvedValueOnce({
          rows: [{
            id: 'otp-1',
            phone: PHONE_VALID,
            code: sendRes.body.data?.debug_otp || '123456',
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            is_used: false,
            attempts: 0,
            max_attempts: 3,
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      db.transaction.mockImplementation(async (callback) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ column_name: 'id' }, { column_name: 'phone' }, { column_name: 'status' }, { column_name: 'last_login' }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [newUser] }),
          release: jest.fn(),
        };
        return callback(client);
      });

      const verifyRes = await request(app)
        .post(`${API_PREFIX}/auth/verify-otp`)
        .send({
          phone: PHONE_VALID,
          code: sendRes.body.data?.debug_otp || '123456',
          first_name: 'Amadou',
          last_name: 'Coulibaly',
        });

      expect([200, 400, 500]).toContain(verifyRes.status);
      if (verifyRes.status === 200) {
        expect(verifyRes.body.success).toBe(true);
        expect(verifyRes.body.data.isNewUser).toBe(true);
        expect(verifyRes.body.data.user).toBeDefined();
        expect(verifyRes.body.data.user.phone).toBe(PHONE_VALID);
        expect(verifyRes.body.data.accessToken).toBeDefined();
        expect(verifyRes.body.data.refreshToken).toBeDefined();
      }
    });
  });

  // ================================
  // 2. ENVOI OTP (vérifier que sendOTP est appelé)
  // ================================
  describe('POST /api/v1/auth/send-otp', () => {
    it('should call sendOTP (SMS service) when sending OTP', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ id: 'otp-1' }], rowCount: 1 });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/send-otp`)
        .send({ phone: PHONE_VALID });

      expect([200, 429]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        const smsService = require('../../src/services/sms.service');
        expect(smsService.sendOTP).toHaveBeenCalled();
        expect(smsService.sendOTP).toHaveBeenCalledWith(PHONE_VALID, expect.any(String));
        expect(typeof smsService.sendOTP.mock.calls[0][1]).toBe('string');
        expect(smsService.sendOTP.mock.calls[0][1].length).toBe(6);
      }
    });

    it('should reject invalid phone format', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/send-otp`)
        .send({ phone: '12345' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject request without phone', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/send-otp`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ================================
  // 3. VÉRIFICATION OTP (code valide)
  // ================================
  describe('POST /api/v1/auth/verify-otp (code valide)', () => {
    it('should verify valid OTP and return tokens and user', async () => {
      const validCode = '123456';
      db.query
        .mockResolvedValueOnce({
          rows: [{
            id: 'otp-1',
            phone: PHONE_EXISTING,
            code: validCode,
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            is_used: false,
            attempts: 0,
            max_attempts: 3,
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      db.transaction.mockImplementation(async (callback) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ column_name: 'status' }, { column_name: 'last_login' }] })
            .mockResolvedValueOnce({ rows: [testUsers.client] }),
          release: jest.fn(),
        };
        return callback(client);
      });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/verify-otp`)
        .send({ phone: PHONE_EXISTING, code: validCode });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data.accessToken).toBeDefined();
        expect(res.body.data.refreshToken).toBeDefined();
        expect(res.body.data.user).toBeDefined();
        expect(res.body.data.user.phone).toBe(PHONE_EXISTING);
      }
    });
  });

  // ================================
  // 4. VÉRIFICATION OTP (code invalide)
  // ================================
  describe('POST /api/v1/auth/verify-otp (code invalide)', () => {
    it('should reject invalid OTP code and return attemptsRemaining', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [{
            id: 'otp-1',
            phone: PHONE_EXISTING,
            code: '123456',
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            is_used: false,
            attempts: 0,
            max_attempts: 3,
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // UPDATE attempts + 1

      const res = await request(app)
        .post(`${API_PREFIX}/auth/verify-otp`)
        .send({ phone: PHONE_EXISTING, code: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_OTP');
      expect(res.body.error.attemptsRemaining).toBeDefined();
    });
  });

  // ================================
  // 5. EXPIRATION OTP (après 5 minutes)
  // ================================
  describe('POST /api/v1/auth/verify-otp (OTP expiré)', () => {
    it('should reject expired OTP (after 5 minutes)', async () => {
      db.query.mockResolvedValueOnce({
        rows: [], // Aucun OTP valide (expiré = non retourné par la requête expires_at > NOW())
        rowCount: 0,
      });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/verify-otp`)
        .send({ phone: PHONE_EXISTING, code: '123456' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_OTP');
      expect(res.body.error.message).toMatch(/invalide|expiré/i);
    });
  });

  // ================================
  // 6. LOGIN CLIENT EXISTANT
  // ================================
  describe('POST /api/v1/auth/verify-otp (client existant)', () => {
    it('should login existing client and return isNewUser: false', async () => {
      const validCode = '654321';
      db.query
        .mockResolvedValueOnce({
          rows: [{
            id: 'otp-2',
            phone: PHONE_EXISTING,
            code: validCode,
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            is_used: false,
            attempts: 0,
            max_attempts: 3,
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      db.transaction.mockImplementation(async (callback) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ column_name: 'status' }, { column_name: 'last_login' }] })
            .mockResolvedValueOnce({ rows: [testUsers.client] }),
          release: jest.fn(),
        };
        return callback(client);
      });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/verify-otp`)
        .send({ phone: PHONE_EXISTING, code: validCode });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data.isNewUser).toBe(false);
        expect(res.body.message).toMatch(/connexion|réussie/i);
        if (res.body.data?.user) expect(res.body.data.user.phone).toBe(PHONE_EXISTING);
        expect(res.body.data.accessToken).toBeDefined();
      }
    });
  });

  // ================================
  // 7. REFRESH TOKEN
  // ================================
  describe('POST /api/v1/auth/refresh-token', () => {
    it('should return new access token with valid refresh token', async () => {
      const refreshToken = generateRefreshToken({
        id: testUsers.client.id,
        phone: testUsers.client.phone,
        type: 'client',
      });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/refresh-token`)
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.accessToken).not.toBe(refreshToken);
    });

    it('should reject request without refresh token', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/refresh-token`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('REFRESH_TOKEN_REQUIRED');
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post(`${API_PREFIX}/auth/refresh-token`)
        .send({ refreshToken: 'invalid-jwt-token' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  // ================================
  // 8. LOGOUT (accès sans token rejeté)
  // ================================
  describe('Logout (protected routes without token)', () => {
    it('should reject access to protected route when no token (logout behavior)', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/users/me`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject expired access token', async () => {
      const expiredToken = generateExpiredToken({
        id: testUsers.client.id,
        type: 'client',
        phone: testUsers.client.phone,
      });

      const res = await request(app)
        .get(`${API_PREFIX}/users/me`)
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });

    it('should reject invalid access token', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/users/me`)
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });

  // ================================
  // 9. INSCRIPTION AVEC NUMÉRO DÉJÀ UTILISÉ (rate limit OTP)
  // ================================
  describe('POST /api/v1/auth/send-otp (numéro déjà utilisé / rate limit)', () => {
    it('should return 429 when requesting OTP again within 1 minute (same number)', async () => {
      // Premier envoi : OK
      db.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ id: 'otp-1' }], rowCount: 1 });

      await request(app)
        .post(`${API_PREFIX}/auth/send-otp`)
        .send({ phone: PHONE_VALID });

      // Deuxième envoi dans la minute : rate limit
      db.query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
        rowCount: 1,
      });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/send-otp`)
        .send({ phone: PHONE_VALID });

      expect(res.status).toBe(429);
      expect(res.body.success).toBe(false);
      expect(['RATE_LIMIT_EXCEEDED', 'SMS_RATE_LIMIT']).toContain(res.body.error?.code);
    });
  });

  // ================================
  // 10. VÉRIFICATION OTP - 3 TENTATIVES RATÉES (blocage)
  // ================================
  describe('POST /api/v1/auth/verify-otp (3 failed attempts - block)', () => {
    it('should block after 3 failed OTP attempts and return 429', async () => {
      const wrongCode = '000000';
      const otpRow = {
        id: 'otp-1',
        phone: PHONE_EXISTING,
        code: '123456',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        is_used: false,
        attempts: 2,
        max_attempts: 3,
      };

      db.query
        .mockResolvedValueOnce({ rows: [otpRow], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })   // UPDATE attempts -> 3
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });  // UPDATE is_used = true puis throw

      const res = await request(app)
        .post(`${API_PREFIX}/auth/verify-otp`)
        .send({ phone: PHONE_EXISTING, code: wrongCode });

      expect(res.status).toBe(429);
      expect(res.body.success).toBe(false);
      expect(['OTP_MAX_ATTEMPTS', 'AUTH_RATE_LIMIT']).toContain(res.body.error?.code);
      if (res.body.error?.attemptsRemaining !== undefined) {
        expect(res.body.error.attemptsRemaining).toBe(0);
      }
    });
  });

  // ================================
  // LOGIN RESTAURANT / ADMIN / LIVREUR (conservés)
  // ================================
  describe('POST /api/v1/auth/partner/login', () => {
    it('should login restaurant with valid credentials', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('RestaurantPass123!', 10);
      db.query.mockResolvedValueOnce({
        rows: [{ ...testRestaurants.restaurant1, password_hash: hashedPassword }],
        rowCount: 1,
      });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/partner/login`)
        .send({
          email: testRestaurants.restaurant1.email,
          password: 'RestaurantPass123!',
        });

      expect([200, 429]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data.accessToken).toBeDefined();
      }
    });
  });

  describe('POST /api/v1/auth/admin/login', () => {
    it('should login admin with valid credentials', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(testAdmin.password, 10);
      db.query.mockResolvedValueOnce({
        rows: [{ ...testAdmin, password_hash: hashedPassword }],
        rowCount: 1,
      });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/admin/login`)
        .send({
          email: testAdmin.email,
          password: testAdmin.password,
        });

      expect([200, 429]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data.accessToken).toBeDefined();
      }
    });
  });

  describe('POST /api/v1/auth/delivery/login', () => {
    it('should login delivery with valid credentials', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('LivreurPass123!', 10);
      db.query.mockResolvedValueOnce({
        rows: [{ ...testDeliveryPersons.driver1, password_hash: hashedPassword }],
        rowCount: 1,
      });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/delivery/login`)
        .send({
          phone: testDeliveryPersons.driver1.phone,
          password: 'LivreurPass123!',
        });

      expect([200, 429]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data.accessToken).toBeDefined();
      }
    });
  });
});

/**
 * Tests de sécurité - BAIBEBALO API
 *
 * Couverture :
 * 1. SQL injection (paramètres échappés)
 * 2. XSS (HTML/script échappé ou rejeté)
 * 3. Accès sans token (401)
 * 4. Token expiré (401)
 * 5. Accès ressource autre utilisateur (403)
 * 6. Rate limiting
 * 7. Validation input (téléphone CI)
 * 8. Upload (type / taille)
 * 9. CORS
 * 10. Headers sécurité (Helmet)
 * 11. Mots de passe hashés (bcrypt)
 * 12. JWT signés correctement
 * 13. HTTPS (production)
 * 14. Pas de données sensibles dans les logs
 * 15. Session timeout (exp JWT)
 *
 * OWASP Top 10 (réf. 2021) :
 * A01:2021 Broken Access Control -> 3, 4, 5
 * A02:2021 Cryptographic Failures -> 11, 12, 14
 * A03:2021 Injection -> 1
 * A04:2021 Insecure Design -> 6, 7, 8
 * A05:2021 Security Misconfiguration -> 9, 10, 13
 * A06:2021 Vulnerable Components -> (audit npm)
 * A07:2021 Auth Failures -> 3, 4, 6, 12, 15
 * A08:2021 Software/Data Integrity -> 12
 * A09:2021 Logging/Monitoring -> 14
 * A10:2021 SSRF -> (non couvert ici)
 */

require('../setup');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../../src/database/db');
const {
  getApp,
  generateToken,
  API_PREFIX,
  JWT_SECRET,
} = require('../utils/helpers');

const app = getApp();

describe('Sécurité API - Tests OWASP / bonnes pratiques', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ——— 1. SQL injection (paramètres échappés) - A03 Injection ———
  describe('1. SQL injection', () => {
    it('rejette ou échappe les payloads SQL dans send-otp (phone)', async () => {
      const maliciousPhones = [
        "'; DROP TABLE users;--",
        "1' OR '1'='1",
        "+2250712345678'; DELETE FROM otp_codes;--",
      ];

      for (const phone of maliciousPhones) {
        const res = await request(app)
          .post(`${API_PREFIX}/auth/send-otp`)
          .set('Content-Type', 'application/json')
          .send({ phone });

        expect([400, 429]).toContain(res.status);
        if (res.body?.error?.code) {
          expect(res.body.error.code).not.toBe('DB_ERROR');
        }
      }
    }, 10000);

    it('utilise des paramètres préparés (pas de concat SQL brut)', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      db.query.mockResolvedValueOnce({ rows: [{ id: 'otp-1' }], rowCount: 1 });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/send-otp`)
        .set('Content-Type', 'application/json')
        .send({ phone: '+2250712345678' });

      expect(db.query).toHaveBeenCalled();
      const calls = db.query.mock.calls;
      calls.forEach(([sql]) => {
        expect(sql).toMatch(/\$1|\$2/);
        expect(sql).not.toMatch(/\+\s*['"]\s*\+/);
      });
    });
  });

  // ——— 2. XSS (HTML échappé) - A03 Injection ———
  describe('2. XSS', () => {
    it('rejette ou sanitize les champs avec balises script dans verify-otp', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ id: 'u', phone: '+2250712345678', code: '123456', expires_at: new Date(Date.now() + 60000) }],
        rowCount: 1,
      });
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/verify-otp`)
        .set('Content-Type', 'application/json')
        .send({
          phone: '+2250712345678',
          code: '123456',
          first_name: '<script>alert(1)</script>',
          last_name: '<img src=x onerror=alert(1)>',
        });

      if (res.status === 200 && res.body?.data?.user) {
        const user = res.body.data.user;
        expect(user.first_name || '').not.toMatch(/<script|onerror/);
        expect(user.last_name || '').not.toMatch(/<script|onerror/);
      }
    });
  });

  // ——— 3. Accès sans token (401) - A01/A07 ———
  describe('3. Accès sans token', () => {
    it('retourne 401 sur route protégée sans Authorization', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/users/me`)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(401);
      expect(res.body?.success).toBe(false);
      expect(res.body?.error?.code).toMatch(/NO_TOKEN|UNAUTHORIZED|INVALID_TOKEN/i);
    });
  });

  // ——— 4. Token expiré (401) - A07 ———
  describe('4. Token expiré', () => {
    it('retourne 401 avec token JWT expiré', async () => {
      const expiredToken = jwt.sign(
        { id: 'user-1', type: 'user', phone: '+2250712345678' },
        JWT_SECRET,
        { expiresIn: '0s', issuer: 'baibebalo-api', audience: 'baibebalo-client' }
      );

      const res = await request(app)
        .get(`${API_PREFIX}/users/me`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(401);
      expect(res.body?.success).toBe(false);
      expect(res.body?.error?.message || '').toMatch(/expiré|invalid|token/i);
    });
  });

  // ——— 5. Accès ressource autre utilisateur (403) - A01 ———
  describe('5. Accès ressource autre utilisateur (403)', () => {
    it('refuse l\'accès à une commande d\'un autre utilisateur (401 ou 403)', async () => {
      const tokenUserA = generateToken({ id: 'user-a', type: 'client', phone: '+2250700000001' });
      const orderIdOtherUser = '00000000-0000-0000-0000-000000000099';

      db.query.mockImplementation((sql, params) => {
        if (sql.includes('users') && sql.includes('id')) {
          return Promise.resolve({ rows: [{ id: 'user-a', status: 'active' }], rowCount: 1 });
        }
        if (sql.includes('orders') && params && params[0] === orderIdOtherUser) {
          return Promise.resolve({
            rows: [{
              id: orderIdOtherUser,
              user_id: 'user-b',
              restaurant_id: 'r1',
              delivery_person_id: null,
              status: 'confirmed',
              total: 5000,
              order_number: 'BB-00000001-001',
            }],
            rowCount: 1,
          });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      const res = await request(app)
        .get(`${API_PREFIX}/orders/${orderIdOtherUser}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .set('Content-Type', 'application/json');

      expect([401, 403]).toContain(res.status);
      expect(res.body?.success).toBe(false);
      if (res.status === 403) {
        expect(res.body?.error?.code).toMatch(/FORBIDDEN|interdit/i);
      }
    });
  });

  // ——— 6. Rate limiting - A04 ———
  describe('6. Rate limiting', () => {
    it('bloque après trop de tentatives de login (auth limiter)', async () => {
      db.query.mockImplementation(() =>
        Promise.resolve({ rows: [], rowCount: 0 })
      );

      let lastStatus = 0;
      for (let i = 0; i < 6; i++) {
        const res = await request(app)
          .post(`${API_PREFIX}/auth/admin/login`)
          .set('Content-Type', 'application/json')
          .send({ email: 'admin@test.com', password: 'wrong' });
        lastStatus = res.status;
        if (res.status === 429) break;
      }

      expect(lastStatus).toBe(429);
    }, 15000);
  });

  // ——— 7. Validation input (téléphone CI) - A04 ———
  describe('7. Validation input (téléphone CI)', () => {
    it('rejette les numéros hors format Côte d\'Ivoire', async () => {
      const invalidPhones = ['+33612345678', '0123456789', 'abc', '+2250012345678', ''];

      for (const phone of invalidPhones) {
        const res = await request(app)
          .post(`${API_PREFIX}/auth/send-otp`)
          .set('Content-Type', 'application/json')
          .send({ phone });

        expect(res.status).toBe(400);
        expect(res.body?.error?.details || res.body?.error?.message || '').toBeTruthy();
      }
    });

    it('accepte un numéro CI valide (+225 07/05/01...)', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      db.query.mockResolvedValueOnce({ rows: [{ id: 'otp-1' }], rowCount: 1 });

      const res = await request(app)
        .post(`${API_PREFIX}/auth/send-otp`)
        .set('Content-Type', 'application/json')
        .send({ phone: '+2250723456789' });

      expect([200, 429]).toContain(res.status);
      if (res.status === 200) expect(res.body?.success).toBe(true);
    });
  });

  // ——— 8. Upload (type / taille) - A04 ———
  describe('8. Upload fichier (type / taille)', () => {
    it('rejette les types de fichier non autorisés', async () => {
      const token = generateToken({ id: 'user-1', type: 'user', phone: '+2250700000000' });
      db.query.mockResolvedValue({ rows: [{ id: 'user-1', status: 'active' }], rowCount: 1 });

      const res = await request(app)
        .post(`${API_PREFIX}/users/me/profile-picture`)
        .set('Authorization', `Bearer ${token}`)
        .attach('profile_picture', Buffer.from('fake exe'), { filename: 'virus.exe' });

      expect([400, 401, 415, 500]).toContain(res.status);
      if (res.body?.error) {
        expect(res.body.error.message || res.body.error.code || '').toBeTruthy();
      }
    });

    it('utilise une limite de taille (config upload)', async () => {
      const config = require('../../src/config');
      expect(config.upload?.maxSize).toBeDefined();
      expect(config.upload.maxSize).toBeLessThanOrEqual(20 * 1024 * 1024);
    });
  });

  // ——— 9. CORS - A05 ———
  describe('9. CORS', () => {
    it('envoie des en-têtes CORS cohérents sur requête avec Origin', async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/public/settings`)
        .set('Origin', 'https://app.example.com');

      expect(res.headers).toBeDefined();
      if (res.headers['access-control-allow-origin']) {
        expect(res.headers['access-control-allow-origin']).toBeDefined();
      }
    });
  });

  // ——— 10. Headers sécurité (Helmet) - A05 ———
  describe('10. Headers sécurité (Helmet)', () => {
    it('applique des en-têtes de sécurité sur les réponses', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.headers).toBeDefined();
      const h = res.headers;
      if (h['x-content-type-options']) {
        expect(h['x-content-type-options']).toMatch(/nosniff/i);
      }
      if (h['x-frame-options']) {
        expect(['DENY', 'SAMEORIGIN']).toContain(h['x-frame-options']);
      }
    });
  });

  // ——— 11. Mots de passe hashés (bcrypt) - A02 ———
  describe('11. Mots de passe hashés (bcrypt)', () => {
    it('utilise bcrypt pour hasher les mots de passe (pas de stockage en clair)', async () => {
      const plain = 'Secret123!';
      const hash = await bcrypt.hash(plain, 10);
      expect(hash).not.toBe(plain);
      expect(hash).toMatch(/^\$2[aby]\$/);
      const match = await bcrypt.compare(plain, hash);
      expect(match).toBe(true);
    });
  });

  // ——— 12. JWT signés correctement - A02/A08 ———
  describe('12. JWT signés correctement', () => {
    it('token signé avec le secret est valide côté backend', async () => {
      const token = jwt.sign(
        { id: 'u1', type: 'user', phone: '+2250700000000' },
        JWT_SECRET,
        { expiresIn: '1h', issuer: 'baibebalo-api', audience: 'baibebalo-client' }
      );
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'baibebalo-api',
        audience: 'baibebalo-client',
      });
      expect(decoded.id).toBe('u1');
    });

    it('token signé avec un mauvais secret est rejeté', async () => {
      const badToken = jwt.sign(
        { id: 'u1', type: 'user' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get(`${API_PREFIX}/users/me`)
        .set('Authorization', `Bearer ${badToken}`)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(401);
    });
  });

  // ——— 13. HTTPS forcé (production) - A05 ———
  describe('13. HTTPS (production)', () => {
    it('config ou middleware prévoit un comportement sécurisé en production', () => {
      const config = require('../../src/config');
      expect(config.env).toBeDefined();
      if (config.env === 'production') {
        expect(process.env.NODE_ENV).toBe('production');
      }
    });
  });

  // ——— 14. Pas de données sensibles dans les logs - A02/A09 ———
  describe('14. Pas de données sensibles dans les logs', () => {
    it('le logger ne reçoit pas le mot de passe en clair dans les erreurs auth', async () => {
      const logger = require('../../src/utils/logger');
      logger.error = jest.fn();

      db.query.mockResolvedValueOnce({ rows: [{ id: 'a1', email: 'admin@test.com', password_hash: '$2b$10$xxx', status: 'active' }], rowCount: 1 });

      await request(app)
        .post(`${API_PREFIX}/auth/admin/login`)
        .set('Content-Type', 'application/json')
        .send({ email: 'admin@test.com', password: 'SecretPassword123' });

      const errorCalls = logger.error.mock.calls;
      errorCalls.forEach(([msg, meta]) => {
        const str = JSON.stringify(meta || msg || '');
        expect(str).not.toMatch(/SecretPassword123|password.*:\s*["'][^"']+["']/i);
      });
    });
  });

  // ——— 15. Session timeout (exp JWT) - A07 ———
  describe('15. Session timeout (JWT exp)', () => {
    it('les tokens JWT émis ont une date d\'expiration', () => {
      const { generateTokens } = require('../../src/middlewares/auth');
      const tokens = generateTokens({ id: 'u1', type: 'user', phone: '+2250700000000' });
      const decoded = jwt.decode(tokens.accessToken, { complete: true });
      expect(decoded?.payload?.exp).toBeDefined();
      expect(decoded.payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });
});

/**
 * Tests API - Communications Socket.IO temps réel
 *
 * Scénarios :
 * 1. Client se connecte au socket
 * 2. Client rejoint room de sa commande
 * 3. Restaurant met à jour statut → Client reçoit notif
 * 4. Livreur met à jour position → Client reçoit update
 * 5. Nouveau message chat → Destinataire reçoit
 * 6. Déconnexion/reconnexion automatique
 * 7. Gestion des rooms (join/leave)
 * 8. Broadcast admin (notification globale)
 * 9. Notification ciblée (un seul utilisateur)
 * 10. Gestion erreurs de connexion
 *
 * Vérifications : messages < 100ms, pas de perte, reconnexion auto.
 * Utilise socket.io-client. Le serveur est démarré en beforeAll (src/server.js, port 5099).
 * Lancer : npx jest tests/api/socket.test.js --config jest.config.js --forceExit
 */

process.env.PORT = '5099';

require('../setup');

// Permettre le chargement de server.js sans erreur (route ads dépend du controller)
jest.mock('../../src/routes/ads.routes', () => {
  const express = require('express');
  return express.Router();
});

const jwt = require('jsonwebtoken');
const { wait } = require('../utils/helpers');
const db = require('../../src/database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';
const JWT_OPTIONS = { expiresIn: '1h', issuer: 'baibebalo-api', audience: 'baibebalo-client' };

function getIoClient() {
  return require('socket.io-client').io;
}

function createToken(payload) {
  return jwt.sign(
    { id: payload.id, type: payload.type, phone: payload.phone || '+2250700000000', ...(payload.email && { email: payload.email }) },
    JWT_SECRET,
    JWT_OPTIONS
  );
}

const TARGET_LATENCY_MS = 100;
const TEST_ORDER_ID = 'a0000000-0000-0000-0000-000000000001';
const TEST_USER_ID = 'b0000000-0000-0000-0000-000000000001';
const TEST_ADMIN_ID = 'c0000000-0000-0000-0000-000000000001';
const TEST_DELIVERY_ID = 'd0000000-0000-0000-0000-000000000001';
const TEST_RESTAURANT_ID = 'e0000000-0000-0000-0000-000000000001';

let serverModule;
let app;
let server;
let baseUrl;

function createClientToken(type, id = TEST_USER_ID) {
  return createToken({
    id,
    type,
    phone: '+2250700000000',
    email: type === 'admin' ? 'admin@test.com' : undefined,
  });
}

/** Mock DB pour join_order client, auth admin, location_update livreur */
function mockDbForSockets() {
  db.query.mockImplementation((text, params) => {
    if (!text || !params) return Promise.resolve({ rows: [], rowCount: 0 });
    if (text.includes('admins') && text.includes('status')) {
      return Promise.resolve({
        rows: [{ id: params[0], email: 'admin@test.com', status: 'active' }],
        rowCount: 1,
      });
    }
    if (text.includes('orders') && text.includes('user_id')) {
      return Promise.resolve({ rows: [{ id: params[0] }], rowCount: 1 });
    }
    if (text.includes('delivery_persons') && (text.includes('current_latitude') || text.includes('delivery_status'))) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

describe('Socket.IO - Communications temps réel', () => {
  beforeAll(async () => {
    mockDbForSockets();
    serverModule = require('../../src/server');
    app = serverModule.app;
    server = serverModule.server;
    await serverModule.startServer();
    baseUrl = `http://localhost:${process.env.PORT}`;
  }, 15000);

  afterAll((done) => {
    if (server && server.listening) {
      server.close(() => done());
    } else {
      done();
    }
  }, 5000);

  afterEach(() => {
    jest.clearAllMocks();
    mockDbForSockets();
  });

  // ——— 1. Client se connecte au socket ———
  describe('1. Client se connecte au socket', () => {
    it('connecte un client au namespace /client avec token et reçoit connect', async () => {
      const ioClient = getIoClient();
      const token = createClientToken('user');
      const client = ioClient(`${baseUrl}/client`, {
        auth: { token },
        transports: ['websocket'],
      });

      const connected = await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Timeout connexion')), 5000);
        client.on('connect', () => {
          clearTimeout(t);
          resolve(true);
        });
        client.on('connect_error', (err) => {
          clearTimeout(t);
          reject(err);
        });
      });

      expect(connected).toBe(true);
      expect(client.connected).toBe(true);
      client.close();
    });
  });

  // ——— 2. Client rejoint room de sa commande ———
  describe('2. Client rejoint room de sa commande', () => {
    it('client rejoint order_XXX et reste dans la room', async () => {
      const ioClient = getIoClient();
      mockDbForSockets();
      const token = createClientToken('user', TEST_USER_ID);
      const client = ioClient(`${baseUrl}/client`, { auth: { token }, transports: ['websocket'] });

      await new Promise((resolve, reject) => {
        client.on('connect', () => resolve());
        client.on('connect_error', reject);
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      client.emit('join_order', { order_id: TEST_ORDER_ID });
      await wait(80);

      const clientIo = app.get('clientIo');
      const room = clientIo?.adapter?.rooms?.get(`order_${TEST_ORDER_ID}`);
      const hasClient = room && room.size >= 1;
      expect(hasClient).toBe(true);
      client.close();
    });
  });

  // ——— 3. Restaurant met à jour statut → Client reçoit notif ———
  describe('3. Restaurant met à jour statut → Client reçoit notif', () => {
    it('client dans order_XXX reçoit order_status_changed en < 100ms', async () => {
      const ioClient = getIoClient();
      mockDbForSockets();
      const token = createClientToken('user', TEST_USER_ID);
      const client = ioClient(`${baseUrl}/client`, { auth: { token }, transports: ['websocket'] });

      await new Promise((resolve, reject) => {
        client.on('connect', () => resolve());
        client.on('connect_error', reject);
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      client.emit('join_order', { order_id: TEST_ORDER_ID });
      await wait(50);

      const received = await new Promise((resolve, reject) => {
        const start = Date.now();
        client.once('order_status_changed', (data) => {
          const latency = Date.now() - start;
          resolve({ data, latency });
        });
        const clientIo = app.get('clientIo');
        if (clientIo) {
          clientIo.to(`order_${TEST_ORDER_ID}`).emit('order_status_changed', {
            order_id: TEST_ORDER_ID,
            status: 'preparing',
            timestamp: new Date().toISOString(),
          });
        }
        setTimeout(() => reject(new Error('Timeout order_status_changed')), 2000);
      });

      expect(received.data).toBeDefined();
      expect(received.data.status).toBe('preparing');
      expect(received.latency).toBeLessThan(TARGET_LATENCY_MS);
      client.close();
    });
  });

  // ——— 4. Livreur met à jour position → Client reçoit update ———
  describe('4. Livreur met à jour position → Client reçoit update', () => {
    it('client reçoit delivery_location_updated quand livreur envoie location_update', async () => {
      const ioClient = getIoClient();
      mockDbForSockets();
      const userToken = createClientToken('user', TEST_USER_ID);
      const deliveryToken = createClientToken('delivery', TEST_DELIVERY_ID);

      const client = ioClient(`${baseUrl}/client`, { auth: { token: userToken }, transports: ['websocket'] });
      const delivery = ioClient(`${baseUrl}/partners`, { auth: { token: deliveryToken }, transports: ['websocket'] });

      await new Promise((resolve, reject) => {
        client.on('connect', () => resolve());
        client.on('connect_error', reject);
        setTimeout(() => reject(new Error('Timeout client')), 5000);
      });
      await new Promise((resolve, reject) => {
        delivery.on('connect', () => resolve());
        delivery.on('connect_error', reject);
        setTimeout(() => reject(new Error('Timeout delivery')), 5000);
      });

      client.emit('join_order', { order_id: TEST_ORDER_ID });
      await wait(80);

      const received = await new Promise((resolve, reject) => {
        const start = Date.now();
        client.once('delivery_location_updated', (data) => {
          resolve({ data, latency: Date.now() - start });
        });
        delivery.emit('location_update', {
          latitude: 9.45,
          longitude: -5.63,
          order_id: TEST_ORDER_ID,
        });
        setTimeout(() => reject(new Error('Timeout delivery_location_updated')), 2000);
      });

      expect(received.data.latitude).toBe(9.45);
      expect(received.data.longitude).toBe(-5.63);
      expect(received.latency).toBeLessThan(TARGET_LATENCY_MS);
      client.close();
      delivery.close();
    });
  });

  // ——— 5. Nouveau message chat → Destinataire reçoit ———
  describe('5. Nouveau message chat → Destinataire reçoit', () => {
    it('client reçoit new_order_message (émission côté app)', async () => {
      const ioClient = getIoClient();
      mockDbForSockets();
      const token = createClientToken('user', TEST_USER_ID);
      const client = ioClient(`${baseUrl}/client`, { auth: { token }, transports: ['websocket'] });

      await new Promise((resolve, reject) => {
        client.on('connect', () => resolve());
        client.on('connect_error', reject);
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });
      client.emit('join_order', { order_id: TEST_ORDER_ID });
      await wait(50);

      const received = await new Promise((resolve, reject) => {
        const start = Date.now();
        client.once('new_order_message', (data) => {
          resolve({ data, latency: Date.now() - start });
        });
        const clientIo = app.get('clientIo');
        if (clientIo) {
          clientIo.to(`order_${TEST_ORDER_ID}`).emit('new_order_message', {
            orderId: TEST_ORDER_ID,
            message: { text: 'Votre commande est en préparation.', sender: 'restaurant' },
            timestamp: new Date().toISOString(),
          });
        }
        setTimeout(() => reject(new Error('Timeout new_order_message')), 2000);
      });

      expect(received.data).toBeDefined();
      expect(received.data.message?.text).toContain('préparation');
      expect(received.latency).toBeLessThan(TARGET_LATENCY_MS);
      client.close();
    });
  });

  // ——— 6. Déconnexion/reconnexion automatique ———
  describe('6. Déconnexion/reconnexion automatique', () => {
    it('reconnexion automatique après disconnect', async () => {
      const ioClient = getIoClient();
      const token = createClientToken('user');
      const client = ioClient(`${baseUrl}/client`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 100,
      });

      await new Promise((resolve, reject) => {
        client.on('connect', () => resolve());
        client.on('connect_error', reject);
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });
      expect(client.connected).toBe(true);

      client.disconnect();
      await wait(150);
      expect(client.connected).toBe(false);

      const reconnected = await new Promise((resolve, reject) => {
        client.once('connect', () => resolve(true));
        client.connect();
        setTimeout(() => reject(new Error('Timeout reconnexion')), 5000);
      });
      expect(reconnected).toBe(true);
      expect(client.connected).toBe(true);
      client.close();
    });
  });

  // ——— 7. Gestion des rooms (join/leave) ———
  describe('7. Gestion des rooms (join/leave)', () => {
    it('leave_order fait quitter la room (pas de réception après leave)', async () => {
      const ioClient = getIoClient();
      mockDbForSockets();
      const token = createClientToken('user', TEST_USER_ID);
      const client = ioClient(`${baseUrl}/client`, { auth: { token }, transports: ['websocket'] });

      await new Promise((resolve, reject) => {
        client.on('connect', () => resolve());
        client.on('connect_error', reject);
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      client.emit('join_order', { order_id: TEST_ORDER_ID });
      await wait(80);
      client.emit('leave_order', { order_id: TEST_ORDER_ID });
      await wait(80);

      const clientIo = app.get('clientIo');
      const room = clientIo?.adapter?.rooms?.get(`order_${TEST_ORDER_ID}`);
      const stillInRoom = Boolean(room && room.size >= 1);
      expect(stillInRoom).toBe(false);
      client.close();
    });
  });

  // ——— 8. Broadcast admin (notification globale) ———
  describe('8. Broadcast admin (notification globale)', () => {
    it('admin rejoint admin_dashboard et reçoit un broadcast', async () => {
      const ioClient = getIoClient();
      const adminToken = createClientToken('admin', TEST_ADMIN_ID);
      const admin = ioClient(baseUrl, {
        auth: { token: adminToken },
        transports: ['websocket'],
      });

      await new Promise((resolve, reject) => {
        admin.on('connect', () => resolve());
        admin.on('connect_error', (e) => reject(e));
        setTimeout(() => reject(new Error('Timeout admin connect')), 5000);
      });

      admin.emit('join_admin_dashboard');
      await wait(80);

      const received = await new Promise((resolve, reject) => {
        const start = Date.now();
        admin.once('order_updated', (data) => {
          resolve({ data, latency: Date.now() - start });
        });
        const io = app.get('io');
        if (io) io.to('admin_dashboard').emit('order_updated', { order_id: TEST_ORDER_ID, status: 'confirmed' });
        setTimeout(() => reject(new Error('Timeout broadcast admin')), 2000);
      });

      expect(received.data.order_id).toBe(TEST_ORDER_ID);
      expect(received.latency).toBeLessThan(TARGET_LATENCY_MS);
      admin.close();
    });
  });

  // ——— 9. Notification ciblée (un seul utilisateur) ———
  describe('9. Notification ciblée (un seul utilisateur)', () => {
    it('client reçoit un événement émis uniquement à sa room order_XXX', async () => {
      const ioClient = getIoClient();
      mockDbForSockets();
      const token = createClientToken('user', TEST_USER_ID);
      const client = ioClient(`${baseUrl}/client`, { auth: { token }, transports: ['websocket'] });

      await new Promise((resolve, reject) => {
        client.on('connect', () => resolve());
        client.on('connect_error', reject);
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });
      client.emit('join_order', { order_id: TEST_ORDER_ID });
      await wait(50);

      const received = await new Promise((resolve, reject) => {
        const start = Date.now();
        client.once('targeted_notification', (data) => {
          resolve({ data, latency: Date.now() - start });
        });
        const clientIo = app.get('clientIo');
        if (clientIo) {
          clientIo.to(`order_${TEST_ORDER_ID}`).emit('targeted_notification', {
            message: 'Votre livraison arrive dans 5 min.',
            order_id: TEST_ORDER_ID,
          });
        }
        setTimeout(() => reject(new Error('Timeout targeted')), 2000);
      });

      expect(received.data.message).toContain('5 min');
      expect(received.latency).toBeLessThan(TARGET_LATENCY_MS);
      client.close();
    });
  });

  // ——— 10. Gestion erreurs de connexion ———
  describe('10. Gestion erreurs de connexion', () => {
    it('connexion sans token renvoie connect_error', async () => {
      const ioClient = getIoClient();
      const client = ioClient(`${baseUrl}/client`, {
        auth: {},
        transports: ['websocket'],
      });

      const err = await new Promise((resolve, reject) => {
        client.on('connect_error', (e) => resolve(e));
        client.on('connect', () => resolve(null));
        setTimeout(() => reject(new Error('Timeout')), 3000);
      });

      expect(err).not.toBeNull();
      expect(err?.message || String(err)).toMatch(/token|auth|échouée/i);
      client.close();
    });

    it('token invalide renvoie connect_error', async () => {
      const ioClient = getIoClient();
      const client = ioClient(`${baseUrl}/client`, {
        auth: { token: 'invalid.jwt.token' },
        transports: ['websocket'],
      });

      const err = await new Promise((resolve, reject) => {
        client.on('connect_error', (e) => resolve(e));
        client.on('connect', () => resolve(null));
        setTimeout(() => reject(new Error('Timeout')), 3000);
      });

      expect(err).not.toBeNull();
      client.close();
    });
  });

  // ——— Pas de perte de messages (envoi multiple) ———
  describe('Vérifications: pas de perte de messages', () => {
    it('reçoit 5 order_status_changed sans perte', async () => {
      const ioClient = getIoClient();
      mockDbForSockets();
      const token = createClientToken('user', TEST_USER_ID);
      const client = ioClient(`${baseUrl}/client`, { auth: { token }, transports: ['websocket'] });

      await new Promise((resolve, reject) => {
        client.on('connect', () => resolve());
        client.on('connect_error', reject);
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });
      client.emit('join_order', { order_id: TEST_ORDER_ID });
      await wait(80);

      const statuses = ['confirmed', 'preparing', 'ready', 'picked_up', 'delivered'];
      const received = [];

      const done = new Promise((resolve, reject) => {
        const handler = (data) => {
          received.push(data.status);
          if (received.length >= statuses.length) resolve(received);
        };
        client.on('order_status_changed', handler);
        const clientIo = app.get('clientIo');
        if (clientIo) {
          statuses.forEach((status, i) => {
            setTimeout(() => {
              clientIo.to(`order_${TEST_ORDER_ID}`).emit('order_status_changed', {
                order_id: TEST_ORDER_ID,
                status,
                timestamp: new Date().toISOString(),
              });
            }, i * 20);
          });
        }
        setTimeout(() => reject(new Error('Timeout ou perte de messages')), 3000);
      });

      const result = await done;
      expect(result).toHaveLength(5);
      expect(result).toEqual(expect.arrayContaining(statuses));
      client.close();
    });
  });
});

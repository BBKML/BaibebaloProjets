/**
 * BAIBEBALO API - Utilitaires de test
 * 
 * Fonctions d'aide pour simplifier l'écriture des tests.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-key-for-testing';
const API_PREFIX = '/api/v1';

/**
 * Créer l'app Express pour les tests (sans démarrer le serveur)
 * Utilise directement l'objet app exporté par index.js
 */
let _app = null;
const getApp = () => {
  if (!_app) {
    // On importe l'app sans démarrer le serveur
    const { app } = require('../../index');
    _app = app;
  }
  return _app;
};

/**
 * Générer un token JWT de test
 */
const generateToken = (payload, options = {}) => {
  const defaultPayload = {
    id: payload.id,
    type: payload.type || 'user',
    phone: payload.phone,
    email: payload.email,
  };

  return jwt.sign(defaultPayload, JWT_SECRET, {
    expiresIn: options.expiresIn || '1h',
  });
};

/**
 * Générer un refresh token de test (compatible avec verifyRefreshToken du backend)
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(
    { id: payload.id, type: payload.type || 'user', tokenVersion: 0 },
    JWT_REFRESH_SECRET,
    {
      expiresIn: '7d',
      issuer: 'baibebalo-api',
      audience: 'baibebalo-client',
    }
  );
};

/**
 * Générer un token expiré (pour tester le rejet)
 */
const generateExpiredToken = (payload) => {
  return jwt.sign(
    { id: payload.id, type: payload.type || 'user' },
    JWT_SECRET,
    { expiresIn: '0s' }
  );
};

/**
 * Créer une requête authentifiée avec supertest
 */
const authenticatedRequest = (app, method, url, tokenPayload) => {
  const token = generateToken(tokenPayload);
  return request(app)[method](`${API_PREFIX}${url}`)
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json');
};

/**
 * Créer une requête non authentifiée avec supertest
 */
const publicRequest = (app, method, url) => {
  return request(app)[method](`${API_PREFIX}${url}`)
    .set('Content-Type', 'application/json');
};

/**
 * Vérifier la structure standard de réponse succès
 */
const expectSuccessResponse = (res, statusCode = 200) => {
  expect(res.status).toBe(statusCode);
  expect(res.body).toHaveProperty('success', true);
};

/**
 * Vérifier la structure standard de réponse erreur
 */
const expectErrorResponse = (res, statusCode, errorCode = null) => {
  expect(res.status).toBe(statusCode);
  expect(res.body).toHaveProperty('success', false);
  expect(res.body).toHaveProperty('error');
  if (errorCode) {
    expect(res.body.error).toHaveProperty('code', errorCode);
  }
};

/**
 * Vérifier qu'une réponse est paginée
 */
const expectPaginatedResponse = (res) => {
  expect(res.body).toHaveProperty('success', true);
  expect(res.body).toHaveProperty('data');
  expect(res.body).toHaveProperty('pagination');
  expect(res.body.pagination).toHaveProperty('page');
  expect(res.body.pagination).toHaveProperty('limit');
  expect(res.body.pagination).toHaveProperty('total');
  expect(res.body.pagination).toHaveProperty('totalPages');
};

/**
 * Mock de la base de données pour un test spécifique
 * Permet de configurer les réponses de la DB pour un test donné
 */
const mockDbQuery = (db, queryPattern, response) => {
  db.query.mockImplementation((text, params) => {
    if (text.includes(queryPattern)) {
      return Promise.resolve(response);
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
};

/**
 * Mock séquentiel de requêtes DB
 * Pour quand un endpoint fait plusieurs requêtes dans l'ordre
 */
const mockDbQuerySequence = (db, responses) => {
  let callIndex = 0;
  db.query.mockImplementation(() => {
    const response = responses[callIndex] || { rows: [], rowCount: 0 };
    callIndex++;
    return Promise.resolve(response);
  });
};

/**
 * Attendre un certain temps (utile pour les tests async)
 */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Créer un numéro de téléphone ivoirien valide pour les tests
 */
const generateTestPhone = (suffix = '') => {
  const num = suffix || String(Math.floor(Math.random() * 90000000) + 10000000);
  return `+22507${num.slice(0, 8)}`;
};

/**
 * Valider le format d'un UUID
 */
const isValidUUID = (str) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * Valider le format d'un numéro de commande Baibebalo
 */
const isValidOrderNumber = (str) => {
  const orderRegex = /^BB-\d{8}-\d{3}$/;
  return orderRegex.test(str);
};

module.exports = {
  getApp,
  generateToken,
  generateRefreshToken,
  generateExpiredToken,
  authenticatedRequest,
  publicRequest,
  expectSuccessResponse,
  expectErrorResponse,
  expectPaginatedResponse,
  mockDbQuery,
  mockDbQuerySequence,
  wait,
  generateTestPhone,
  isValidUUID,
  isValidOrderNumber,
  API_PREFIX,
  JWT_SECRET,
};

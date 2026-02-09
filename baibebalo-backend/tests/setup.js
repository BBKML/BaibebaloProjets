/**
 * BAIBEBALO API - Configuration globale des tests
 * 
 * Ce fichier est chargé avant l'exécution de tous les tests.
 * Il configure l'environnement de test et les mocks globaux.
 */

// Polyfill localStorage pour éviter SecurityError en environnement Node
if (typeof global.localStorage === 'undefined') {
  const store = new Map();
  global.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (i) => [...store.keys()][i] ?? null,
  };
}

// Forcer l'environnement de test
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.SMS_PROVIDER = 'dev';
process.env.LOG_LEVEL = 'error'; // Réduire les logs pendant les tests
process.env.DEBUG_OTP_RESPONSE = 'true'; // Exposer le code OTP dans la réponse pour les tests

// Mock de la base de données
jest.mock('../src/database/db', () => {
  const mockQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
  const mockTransaction = jest.fn().mockImplementation(async (callback) => {
    const mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn(),
    };
    return callback(mockClient);
  });

  return {
    query: mockQuery,
    transaction: mockTransaction,
    pool: {
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        release: jest.fn(),
      }),
      end: jest.fn().mockResolvedValue(undefined),
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0,
    },
    testConnection: jest.fn().mockResolvedValue(true),
    getPoolStats: jest.fn().mockReturnValue({ total: 0, idle: 0, waiting: 0 }),
    close: jest.fn().mockResolvedValue(undefined),
    end: jest.fn().mockResolvedValue(undefined),
    queryPaginated: jest.fn().mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
    }),
    bulkInsert: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  };
});

// Mock du logger pour ne pas polluer la console pendant les tests
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  stream: { write: jest.fn() },
}));

// Mock de Firebase Admin (notifications push)
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
  messaging: jest.fn(() => ({
    send: jest.fn().mockResolvedValue('mock-message-id'),
    sendMulticast: jest.fn().mockResolvedValue({ successCount: 1, failureCount: 0 }),
  })),
}));

// Mock de syncSettings pour éviter les appels DB au démarrage
jest.mock('../src/utils/syncSettings', () => ({
  syncSettingsFromConfig: jest.fn().mockResolvedValue(undefined),
}));

// Nettoyage après chaque test
afterEach(() => {
  jest.clearAllMocks();
});

// Nettoyage global après tous les tests
afterAll(async () => {
  // Fermer toutes les connexions ouvertes
  jest.restoreAllMocks();
});

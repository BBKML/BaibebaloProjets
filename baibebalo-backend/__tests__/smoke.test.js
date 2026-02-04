/**
 * Tests de fumée - BAIBEBALO Backend
 * Vérifie que les modules principaux se chargent sans erreur.
 */

const path = require('path');

describe('Backend - Smoke tests', () => {
  describe('Configuration', () => {
    it('charge la config sans erreur', () => {
      const config = require('../src/config');
      expect(config).toBeDefined();
      expect(config.env).toBeDefined();
      expect(config.port).toBeGreaterThan(0);
      expect(config.database).toBeDefined();
      expect(config.database.host).toBeDefined();
      expect(config.jwt).toBeDefined();
    });

    it('expose les clés attendues dans config.urls', () => {
      const config = require('../src/config');
      expect(config.urls).toBeDefined();
      expect(config.urls.apiBase).toBeDefined();
      expect(config.urls.api).toBeDefined();
    });
  });

  describe('Modules critiques', () => {
    it('charge le logger sans erreur', () => {
      const logger = require('../src/utils/logger');
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('charge les validators sans erreur', () => {
      const validators = require('../src/middlewares/validators');
      expect(validators).toBeDefined();
    });
  });

  describe('Routes (structure)', () => {
    it('auth.routes expose un routeur Express', () => {
      const authRoutes = require('../src/routes/auth.routes');
      expect(authRoutes).toBeDefined();
      expect(typeof authRoutes).toBe('function');
    });

    it('order.routes expose un routeur Express', () => {
      const orderRoutes = require('../src/routes/order.routes');
      expect(orderRoutes).toBeDefined();
      expect(typeof orderRoutes).toBe('function');
    });

    it('restaurant.routes expose un routeur Express', () => {
      const restaurantRoutes = require('../src/routes/restaurant.routes');
      expect(restaurantRoutes).toBeDefined();
      expect(typeof restaurantRoutes).toBe('function');
    });
  });
});

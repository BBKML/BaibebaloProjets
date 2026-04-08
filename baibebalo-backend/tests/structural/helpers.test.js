/**
 * Tests structurels - Utilitaires helpers (validation)
 */

const { isValidUUID, isValidOrderNumber } = require('../utils/helpers');

describe('Helpers (structurel)', () => {
  describe('isValidUUID', () => {
    it('accepte un UUID v4 valide', () => {
      expect(isValidUUID('a1b2c3d4-e5f6-4789-a012-3456789abcde')).toBe(true);
      expect(isValidUUID('00000000-0000-4000-8000-000000000000')).toBe(true);
    });

    it('rejette une chaîne vide ou non-UUID', () => {
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('12345')).toBe(false);
    });
  });

  describe('isValidOrderNumber', () => {
    it('accepte un numéro de commande BB-XXXXXXXX-XXX', () => {
      expect(isValidOrderNumber('BB-12345678-001')).toBe(true);
      expect(isValidOrderNumber('BB-00000001-999')).toBe(true);
    });

    it('rejette un format invalide', () => {
      expect(isValidOrderNumber('')).toBe(false);
      expect(isValidOrderNumber('BB-123-01')).toBe(false);
      expect(isValidOrderNumber('BB12345678001')).toBe(false);
    });
  });
});

/**
 * Tests structurels Client - Utilitaires format
 */
const {
  formatCurrency,
  formatDate,
  formatPhoneNumber,
  truncate,
  calculateOrderSubtotal,
  calculateOrderTotal,
} = require('../../src/utils/format');

describe('format (structurel)', () => {
  describe('formatCurrency', () => {
    it('formate un montant en FCFA', () => {
      expect(formatCurrency(1000)).toMatch(/1\s*000\s*FCFA/);
      expect(formatCurrency(0)).toBe('0 FCFA');
    });
    it('retourne "0 FCFA" pour null/undefined', () => {
      expect(formatCurrency(null)).toBe('0 FCFA');
      expect(formatCurrency(undefined)).toBe('0 FCFA');
    });
  });

  describe('formatPhoneNumber', () => {
    it('formate un numéro ivoirien', () => {
      expect(formatPhoneNumber('22507123456')).toContain('225');
      expect(formatPhoneNumber('0707123456')).toBeTruthy();
    });
    it('retourne chaîne vide pour vide', () => {
      expect(formatPhoneNumber('')).toBe('');
      expect(formatPhoneNumber(null)).toBe('');
    });
  });

  describe('truncate', () => {
    it('tronque au maxLength', () => {
      expect(truncate('hello world', 5)).toBe('hello...');
      expect(truncate('hi', 10)).toBe('hi');
    });
  });

  describe('calculateOrderSubtotal', () => {
    it('retourne 0 pour order vide', () => {
      expect(calculateOrderSubtotal(null)).toBe(0);
      expect(calculateOrderSubtotal({})).toBe(0);
    });
    it('calcule à partir des items', () => {
      const order = {
        items: [
          { unit_price: 1000, quantity: 2 },
          { unit_price: 500, quantity: 1 },
        ],
      };
      expect(calculateOrderSubtotal(order)).toBe(2500);
    });
  });

  describe('calculateOrderTotal', () => {
    it('retourne 0 pour order null', () => {
      expect(calculateOrderTotal(null)).toBe(0);
    });
    it('sous-total + livraison - réduction', () => {
      const order = {
        items: [{ unit_price: 1000, quantity: 1 }],
        delivery_fee: 500,
        discount: 100,
      };
      expect(calculateOrderTotal(order)).toBe(1400);
    });
  });
});

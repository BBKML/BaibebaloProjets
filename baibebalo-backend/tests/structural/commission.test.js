/**
 * Tests structurels (unit) - Module commission
 * Vérifie le calcul des commissions et du revenu net restaurant.
 */

const {
  DEFAULT_COMMISSION_RATE,
  getCommission,
  getNetRestaurantRevenue,
} = require('../../src/utils/commission');

describe('Commission utils (structurel)', () => {
  describe('getCommission', () => {
    it('applique le taux par défaut 15% si aucun taux fourni', () => {
      const { commission, rate } = getCommission(10000);
      expect(rate).toBe(DEFAULT_COMMISSION_RATE);
      expect(commission).toBe(1500);
    });

    it('calcule la commission avec un taux personnalisé', () => {
      const { commission, rate } = getCommission(10000, 20);
      expect(rate).toBe(20);
      expect(commission).toBe(2000);
    });

    it('arrondit la commission à 2 décimales', () => {
      const { commission } = getCommission(10033, 15);
      expect(commission).toBe(1504.95);
    });

    it('gère subtotal 0', () => {
      const { commission, rate } = getCommission(0, 15);
      expect(commission).toBe(0);
      expect(rate).toBe(15);
    });
  });

  describe('getNetRestaurantRevenue', () => {
    it('retourne sous-total - commission avec taux par défaut', () => {
      const net = getNetRestaurantRevenue(10000);
      expect(net).toBe(8500);
    });

    it('retourne sous-total - commission avec taux fourni', () => {
      const net = getNetRestaurantRevenue(10000, 20);
      expect(net).toBe(8000);
    });

    it('utilise le montant commission fourni si donné', () => {
      const net = getNetRestaurantRevenue(10000, null, 1000);
      expect(net).toBe(9000);
    });

    it('arrondit à 2 décimales', () => {
      const net = getNetRestaurantRevenue(10033, 15);
      expect(net).toBe(8528.05);
    });
  });
});

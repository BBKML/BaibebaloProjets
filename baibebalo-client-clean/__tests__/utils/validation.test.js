/**
 * Tests structurels Client - Utilitaires validation
 */
const { validatePhoneNumber, validateOTP, validateEmail } = require('../../src/utils/validation');

describe('validation (structurel)', () => {
  describe('validatePhoneNumber', () => {
    it('accepte un numéro ivoirien 225 + 8 chiffres', () => {
      expect(validatePhoneNumber('22507123456')).toBe(true);
      expect(validatePhoneNumber('+22507123456')).toBe(true);
    });
    it('accepte 8 chiffres locaux', () => {
      expect(validatePhoneNumber('07123456')).toBe(true);
    });
    it('rejette invalide', () => {
      expect(validatePhoneNumber('123')).toBe(false);
      expect(validatePhoneNumber('')).toBe(false);
      expect(validatePhoneNumber(null)).toBe(false);
    });
  });

  describe('validateOTP', () => {
    it('accepte 6 chiffres', () => {
      expect(validateOTP('123456')).toBe(true);
    });
    it('rejette autre format', () => {
      expect(validateOTP('12345')).toBe(false);
      expect(validateOTP('1234567')).toBe(false);
      expect(validateOTP('')).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('accepte email valide', () => {
      expect(validateEmail('a@b.co')).toBe(true);
      expect(validateEmail('user@example.com')).toBe(true);
    });
    it('rejette invalide', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('no-at')).toBe(false);
    });
  });
});

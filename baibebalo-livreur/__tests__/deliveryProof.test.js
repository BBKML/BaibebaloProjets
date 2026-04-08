/**
 * Tests de la fonctionnalité "Photo preuve de livraison"
 * - Parsing de la réponse API (url dans data ou à la racine)
 * - Upload via FormData (plus d’usage de expo-file-system)
 */

jest.mock('../src/utils/url', () => ({
  getImageUrl: (url) => (url && typeof url === 'string' && url.startsWith('/') ? `https://api.example.com${url}` : url),
}));

describe('Photo preuve de livraison', () => {
  describe('parseUploadResponse', () => {
    let parseUploadResponse;

    beforeEach(() => {
      const utils = require('../src/screens/deliveries/deliveryProofUtils');
      parseUploadResponse = utils.parseUploadResponse;
    });

    it('retourne l’URL quand elle est dans res.data.url', () => {
      const res = { success: true, data: { url: '/uploads/delivery-proofs/abc.jpg' } };
      expect(parseUploadResponse(res)).toBe('https://api.example.com/uploads/delivery-proofs/abc.jpg');
    });

    it('retourne l’URL quand elle est dans res.url', () => {
      const res = { success: true, url: 'http://cdn.example.com/proof.jpg' };
      expect(parseUploadResponse(res)).toBe('http://cdn.example.com/proof.jpg');
    });

    it('retourne null si res est vide ou sans url', () => {
      expect(parseUploadResponse(null)).toBeNull();
      expect(parseUploadResponse(undefined)).toBeNull();
      expect(parseUploadResponse({})).toBeNull();
      expect(parseUploadResponse({ success: true })).toBeNull();
    });

    it('priorise res.data.url sur res.url', () => {
      const res = { data: { url: '/up/x.jpg' }, url: 'http://other.com/y.jpg' };
      expect(parseUploadResponse(res)).toBe('https://api.example.com/up/x.jpg');
    });
  });
});

/**
 * Utilitaires pour l’upload de la preuve de livraison (testables)
 * Plus d’usage de expo-file-system : upload via FormData uniquement.
 */
import { getImageUrl } from '../../utils/url';

/**
 * Extrait l’URL de la photo depuis la réponse de l’API upload
 * @param {object} res - Réponse (response.data)
 * @param {(s: string) => string|null} [urlNormalizer] - ex. getImageUrl
 * @returns {string|null}
 */
export function parseUploadResponse(res, urlNormalizer = getImageUrl) {
  const rawUrl = (res && typeof res === 'object') ? (res.data?.url ?? res.url) : null;
  const urlStr = rawUrl != null && typeof rawUrl === 'string' ? rawUrl : null;
  if (!urlStr) return null;
  try {
    return urlStr.startsWith('http') ? urlStr : (urlNormalizer(urlStr) || urlStr);
  } catch (_) {
    return urlStr;
  }
}

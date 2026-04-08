/**
 * Normalisation des URLs d'images (uploads) pour les afficher avec la bonne origine API.
 * Utilisé pour photo de profil livreur, documents (CNI, permis, etc.).
 */
import API_BASE_URL from '../constants/api';

const getApiOrigin = () => {
  try {
    const base = typeof API_BASE_URL === 'string' ? API_BASE_URL : '';
    if (!base) return '';
    const match = base.match(/^(https?:\/\/[^/]+)/i);
    if (match?.[1]) return match[1];
    return typeof base.replace === 'function' ? base.replace(/\/api\/v\d+\/?$/i, '') : base;
  } catch (_) {
    return '';
  }
};

const normalizeUploadsPath = (path) => {
  if (path == null || typeof path !== 'string') return path;
  try {
    return path.replace(/\/api\/v\d+(?=\/uploads)/i, '');
  } catch (_) {
    return path;
  }
};

export const getImageUrl = (url) => {
  return normalizeUploadUrl(url);
};

export const normalizeUploadUrl = (url) => {
  if (url == null || typeof url !== 'string') return null;
  const s = String(url).trim();
  if (!s) return null;
  // URIs locaux (galerie / appareil photo) : ne pas modifier
  if (s.startsWith('file://') || s.startsWith('content://') || s.startsWith('asset://')) {
    return url;
  }

  const apiOrigin = getApiOrigin();

  if (s.startsWith('http://') || s.startsWith('https://')) {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(s)) {
      const path = s.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, '');
      const normalizedPath = normalizeUploadsPath(path);
      return apiOrigin ? `${apiOrigin}${normalizedPath}` : url;
    }
    try {
      const parsed = new URL(s);
      const normalizedPath = normalizeUploadsPath(parsed.pathname);
      if (normalizedPath !== parsed.pathname) {
        return `${parsed.origin}${normalizedPath}`;
      }
    } catch (_) {
      return url;
    }
    return url;
  }

  if (s.startsWith('/')) {
    const normalizedPath = normalizeUploadsPath(s);
    return apiOrigin ? `${apiOrigin}${normalizedPath}` : url;
  }

  if (s.startsWith('uploads/')) {
    return apiOrigin ? `${apiOrigin}/${s}` : url;
  }

  // Chemin relatif sans préfixe (ex. user-profiles/xxx.jpg) : considérer comme sous /uploads/
  if (apiOrigin && s.length > 0 && !s.includes(' ')) {
    const path = s.startsWith('/') ? s.slice(1) : s;
    return `${apiOrigin}/${path.startsWith('uploads/') ? path : `uploads/${path}`}`;
  }

  return url;
};

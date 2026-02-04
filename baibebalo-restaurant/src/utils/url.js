/**
 * Normalisation des URLs d'images (uploads) pour les afficher avec la bonne origine API.
 * Utilisé pour logo, bannière, photos restaurant, photos menu, première image commande, etc.
 */
import API_BASE_URL from '../constants/api';

const getApiOrigin = () => {
  const base = API_BASE_URL || '';
  const match = base.match(/^(https?:\/\/[^/]+)/i);
  if (match?.[1]) {
    return match[1];
  }
  return base.replace(/\/api\/v\d+\/?$/i, '');
};

const normalizeUploadsPath = (path) => {
  if (!path) return path;
  return path.replace(/\/api\/v\d+(?=\/uploads)/i, '');
};

export const getImageUrl = (url) => {
  return normalizeUploadUrl(url);
};

export const normalizeUploadUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  // URIs locaux (galerie / appareil photo) : ne pas modifier
  if (url.startsWith('file://') || url.startsWith('content://') || url.startsWith('asset://')) {
    return url;
  }

  const apiOrigin = getApiOrigin();

  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url)) {
      const path = url.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, '');
      const normalizedPath = normalizeUploadsPath(path);
      return apiOrigin ? `${apiOrigin}${normalizedPath}` : url;
    }
    try {
      const parsed = new URL(url);
      const normalizedPath = normalizeUploadsPath(parsed.pathname);
      if (normalizedPath !== parsed.pathname) {
        return `${parsed.origin}${normalizedPath}`;
      }
    } catch (error) {
      return url;
    }
    return url;
  }

  if (url.startsWith('/')) {
    const normalizedPath = normalizeUploadsPath(url);
    return apiOrigin ? `${apiOrigin}${normalizedPath}` : url;
  }

  if (url.startsWith('uploads/')) {
    return apiOrigin ? `${apiOrigin}/${url}` : url;
  }

  // Chemin relatif sans préfixe (ex. user-profiles/xxx.jpg) : considérer comme sous /uploads/
  if (apiOrigin && url.length > 0 && !url.includes(' ')) {
    const path = url.startsWith('/') ? url.slice(1) : url;
    return `${apiOrigin}/${path.startsWith('uploads/') ? path : `uploads/${path}`}`;
  }

  return url;
};

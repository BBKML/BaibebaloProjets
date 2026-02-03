// Origine du backend pour charger les images (uploads). Doit correspondre à l'API.
const getApiOrigin = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL.replace(/\/api\/v\d+\/?$/i, '').replace(/\/+$/, '');
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/v\d+\/?$/i, '').replace(/\/+$/, '');
  }
  if (import.meta.env.DEV) {
    const backendPort = import.meta.env.VITE_BACKEND_PORT || '5000';
    return `http://localhost:${backendPort}`;
  }
  return window.location.origin;
};

const normalizeUploadsPath = (path) => {
  if (!path) return path;
  return path.replace(/\/api\/v\d+(?=\/uploads)/i, '');
};

export const normalizeUploadUrl = (url) => {
  if (!url || typeof url !== 'string') return null;

  const apiOrigin = getApiOrigin();

  if (url.startsWith('/')) {
    const normalizedPath = normalizeUploadsPath(url);
    return `${apiOrigin}${normalizedPath}`;
  }

  try {
    const parsed = new URL(url);
    if (['localhost', '127.0.0.1'].includes(parsed.hostname)) {
      const normalizedPath = normalizeUploadsPath(parsed.pathname);
      return `${apiOrigin}${normalizedPath}`;
    }
    const normalizedPath = normalizeUploadsPath(parsed.pathname);
    if (normalizedPath !== parsed.pathname) {
      return `${parsed.origin}${normalizedPath}`;
    }
    return url;
  } catch (error) {
    if (url.startsWith('uploads/')) {
      return `${apiOrigin}/${url}`;
    }
    return url;
  }
};

// Alias pour compatibilité avec les imports existants
export const getImageUrl = normalizeUploadUrl;

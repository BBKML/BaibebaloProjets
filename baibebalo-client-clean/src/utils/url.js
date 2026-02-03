import { API_CONFIG } from '../constants/api';

const getApiOrigin = () => {
  const base = API_CONFIG.BASE_URL || '';
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

  return url;
};

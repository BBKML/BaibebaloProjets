import axios from 'axios';
import toast from 'react-hot-toast';

// Délai exponentiel pour les retries
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Retry sur erreurs réseau (cold start Render, DNS, timeout) + 429 rate limit
async function retryRequest(fn, retries = 3, baseDelay = 2000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isNetworkError =
        !err.response &&
        (err.code === 'ERR_NETWORK' ||
          err.code === 'ECONNABORTED' ||
          err.message?.includes('Network Error') ||
          err.message?.includes('ERR_NAME_NOT_RESOLVED'));
      const isRateLimit = err.response?.status === 429;

      if ((!isNetworkError && !isRateLimit) || attempt === retries) throw err;

      // Délai : respecter Retry-After si présent (rate limit), sinon exponentiel
      const retryAfter = isRateLimit
        ? (parseInt(err.response?.headers?.['retry-after'] || '0', 10) * 1000 || baseDelay * 2 ** attempt)
        : baseDelay * 2 ** attempt;

      if (attempt === 0) {
        if (isRateLimit) {
          toast.loading('Trop de requêtes, nouvelle tentative...', { id: 'rate-limit-retry' });
        } else {
          toast.loading('Serveur en démarrage, patientez...', { id: 'server-wakeup' });
        }
      }
      await sleep(retryAfter);
    }
  }
  toast.dismiss('rate-limit-retry');
}

export { retryRequest };

/**
 * Construit l'URL de base de l'API.
 *
 * Priorité :
 *  1. VITE_API_URL  (toujours prioritaire — dev et prod)
 *  2. VITE_BACKEND_URL + '/api/v1'
 *  3. En dev  → localhost
 *  4. En prod → URL Render du backend (jamais une URL relative)
 */
const PRODUCTION_BACKEND = 'https://baibebaloprojets.onrender.com';

const getBaseURL = () => {
  // 1. Variable explicite (dev ou prod)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }

  // 2. Backend URL fournie
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, '') + '/api/v1';
  }

  // 3. Dev local sans variable
  if (import.meta.env.DEV) {
    const backendPort = import.meta.env.VITE_BACKEND_PORT || '5000';
    return `http://localhost:${backendPort}/api/v1`;
  }

  // ✅ 4. Prod sans variable — URL backend codée en dur (jamais '/api/v1' relatif)
  //    '/api/v1' pointerait vers le frontend (baibebalo-admin.onrender.com) → 404
  console.warn('[API] VITE_API_URL non défini en production — utilisation de l\'URL de secours.');
  return `${PRODUCTION_BACKEND}/api/v1`;
};

const BASE_URL = getBaseURL();

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log en mode développement
if (import.meta.env.DEV) {
  console.log(`🔧 API Client baseURL: ${BASE_URL}`);
}

// ================================
// INTERCEPTEUR — FormData
// (doit être en premier pour supprimer Content-Type avant l'ajout du token)
// ================================
apiClient.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ================================
// INTERCEPTEUR — Ajout du token JWT
// ================================
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ================================
// INTERCEPTEUR — Gestion des erreurs & refresh token
// ================================
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Erreur 401 — Token expiré → tentative de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          // ✅ URL absolue vers le backend (pas relative) pour éviter le 404 en prod
          const refreshURL = `${BASE_URL}/auth/refresh-token`;
          const response = await axios.post(refreshURL, { refreshToken });
          const { accessToken } = response.data.data;

          localStorage.setItem('accessToken', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch (_) {
          // Refresh token invalide ou expiré → déconnexion forcée
        }
      }

      // Nettoyage session
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('admin');
      toast.error('Session expirée. Veuillez vous reconnecter.');
      globalThis.location.href = '/login';
      throw error;
    }

    // Fermer le toast "serveur en démarrage" si présent
    toast.dismiss('server-wakeup');

    // Autres erreurs — afficher un toast
    if (error.response?.status !== 401) {
      const serverMsg = error.response?.data?.error?.message || error.response?.data?.message;
      if (serverMsg) {
        toast.error(serverMsg);
      } else if (!error.response) {
        // Erreur réseau / DNS
        toast.error('Impossible de joindre le serveur. Vérifiez votre connexion ou attendez le démarrage du serveur.');
      } else if (error.response.status >= 500) {
        toast.error('Erreur serveur. Réessayez dans quelques instants.');
      } else if (error.response.status === 403) {
        toast.error('Accès refusé. Vous n\'avez pas les droits nécessaires.');
      } else if (error.response.status === 404) {
        toast.error('Ressource introuvable.');
      }
    }

    throw error;
  }
);

export default apiClient;

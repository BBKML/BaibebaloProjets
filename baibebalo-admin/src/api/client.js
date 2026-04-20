import axios from 'axios';
import toast from 'react-hot-toast';

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

    // Autres erreurs — afficher un toast
    if (error.response?.status !== 401) {
      const message = error.response?.data?.error?.message;
      if (message) {
        toast.error(message);
      } else if (error.message) {
        const isNetworkError =
          error.message.includes('Network Error') || error.message.includes('timeout');
        toast.error(
          isNetworkError
            ? 'Erreur de connexion au serveur. Vérifiez que le backend est démarré.'
            : error.message
        );
      }
    }

    throw error;
  }
);

export default apiClient;

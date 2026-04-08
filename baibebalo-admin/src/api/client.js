import axios from 'axios';
import toast from 'react-hot-toast';

// Configuration de base Axios
// En développement, utiliser l'URL complète pour éviter les problèmes de proxy
// VITE_API_URL = base complète (ex: http://192.168.1.4:5000/api/v1)
// VITE_BACKEND_URL = origine backend sans /api/v1 (ex: http://192.168.1.4:5000)
const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  if (import.meta.env.DEV) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (backendUrl) {
      return (backendUrl.replace(/\/+$/, '') + '/api/v1');
    }
    const backendPort = import.meta.env.VITE_BACKEND_PORT || '5000';
    return `http://localhost:${backendPort}/api/v1`;
  }
  return '/api/v1';
};

const apiClient = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour gérer FormData (doit être AVANT celui qui ajoute le token)
apiClient.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Log en mode développement
if (import.meta.env.DEV) {
  const baseURL = getBaseURL();
  console.log(`🔧 API: ${baseURL}`);
}

// Intercepteur pour ajouter le token
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

// Intercepteur pour gérer les erreurs
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Erreur 401 - Token expiré ou absent
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const refreshURL = import.meta.env.DEV
            ? getBaseURL() + '/auth/refresh-token'
            : '/api/v1/auth/refresh-token';
          const response = await axios.post(refreshURL, { refreshToken });
          const { accessToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch (_) {
          // Refresh token invalide - déconnexion forcée
        }
      }
      // Pas de refresh token ou refresh échoué → déconnexion
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('admin');
      toast.error('Session expirée. Veuillez vous reconnecter.');
      globalThis.location.href = '/login';
      throw error;
    }

    // Afficher les erreurs (sauf 401 déjà traité ci-dessus)
    if (error.response?.status !== 401) {
      const message = error.response?.data?.error?.message;
      if (message) {
        toast.error(message);
      } else if (error.message) {
        const isNetworkError = error.message.includes('Network Error') || error.message.includes('timeout');
        toast.error(isNetworkError ? 'Erreur de connexion au serveur. Vérifiez que le backend est démarré.' : error.message);
      }
    }

    throw error;
  }
);

export default apiClient;

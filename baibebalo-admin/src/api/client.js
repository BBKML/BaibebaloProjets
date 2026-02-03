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
    // Si les données sont une instance de FormData, supprimer Content-Type
    // pour laisser axios définir automatiquement le bon Content-Type avec boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      if (import.meta.env.DEV) {
        console.log('📎 FormData détecté, Content-Type supprimé pour laisser axios le définir');
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Log en mode développement
if (import.meta.env.DEV) {
  const baseURL = getBaseURL();
  const backendPort = import.meta.env.VITE_BACKEND_PORT || '5000';
  console.log('🔧 API Client configuré:', {
    baseURL,
    mode: baseURL.startsWith('http') ? 'URL directe' : 'Proxy',
    backend: `http://localhost:${backendPort}`,
  });
}

// Intercepteur pour ajouter le token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (import.meta.env.DEV) {
        console.log('🔑 Token ajouté au header');
      }
    } else {
      if (import.meta.env.DEV) {
        console.warn('⚠️ Aucun token trouvé dans localStorage');
      }
    }
    if (import.meta.env.DEV) {
      console.log('📤 Requête:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
      });
    }
    return config;
  },
  (error) => {
    console.error('❌ Erreur intercepteur request:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Erreur 401 - Token expiré
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const refreshURL = import.meta.env.DEV 
            ? getBaseURL() + '/auth/refresh-token'
            : '/api/v1/auth/refresh-token';
          const response = await axios.post(refreshURL, {
            refreshToken,
          });

          const { accessToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token invalide - déconnexion
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('admin');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Afficher les erreurs (sauf 401 qui est géré ci-dessus)
    if (error.response?.status !== 401) {
      if (error.response?.data?.error?.message) {
        toast.error(error.response.data.error.message);
      } else if (error.message) {
        // Ne pas afficher les erreurs de réseau génériques
        if (!error.message.includes('Network Error') && !error.message.includes('timeout')) {
          toast.error(error.message);
        } else {
          toast.error('Erreur de connexion au serveur. Vérifiez que le backend est démarré.');
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

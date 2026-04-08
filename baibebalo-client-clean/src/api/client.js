import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../constants/api';
import { getAuthStore } from '../store/authStoreRef';

// Créer l'instance Axios
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

const safeLogout = async () => {
  const store = getAuthStore?.();
  const logout = store?.getState?.()?.logout;
  if (typeof logout === 'function') {
    await logout();
    return;
  }
  await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
};

// Intercepteur pour ajouter le token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // FormData : ne pas fixer Content-Type pour que le boundary soit ajouté (multer côté backend)
      const isFormData = config.data && typeof config.data.append === 'function';
      if (isFormData) {
        delete config.headers['Content-Type'];
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur lors de la récupération du token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs et le refresh token
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (__DEV__ && (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error'))) {
      console.warn('⚠️ Connexion indisponible (requête annulée ou réseau):', originalRequest?.url);
    }

    // Erreur 401 - Token expiré ou utilisateur inexistant
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Vérifier si c'est une erreur "utilisateur inexistant"
      const errorMessage = error.response?.data?.error?.message || '';
      if (errorMessage.includes('utilisateur inexistant') || errorMessage.includes('user not found')) {
        if (__DEV__) console.warn('⚠️ Utilisateur inexistant - Déconnexion automatique');
        // Utilisateur supprimé ou inexistant - déconnexion complète
        await safeLogout();
        // Ne pas essayer de rafraîchir le token
        return Promise.reject(error);
      }

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.REFRESH_TOKEN}`,
            { refreshToken }
          );

          const { accessToken } = response.data.data;
          await AsyncStorage.setItem('accessToken', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token invalide - déconnexion
        if (__DEV__) console.warn('⚠️ Refresh token invalide - Déconnexion automatique');
        await safeLogout();
        // Rediriger vers l'écran de connexion
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

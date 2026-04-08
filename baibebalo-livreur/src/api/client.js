import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../constants/api';
import useAuthStore from '../store/authStore';

// Timeout 10s : éviter que l'app reste bloquée ; erreur gérée gracieusement (spinner + message)
const requestTimeout = 10000;

// Utiliser API_BASE_URL depuis constants/api.js qui gère déjà l'environnement
const apiClient = axios.create({
  baseURL: API_BASE_URL || 'https://baibebaloprojets.onrender.com/api/v1',
  timeout: requestTimeout,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
});

// Intercepteur pour ajouter le token et éviter le cache
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('delivery_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Pour FormData (upload document / photo), ne pas envoyer Content-Type pour que le client envoie multipart/form-data avec boundary
      if (config.data && typeof FormData !== 'undefined' && config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }
      // Ajouter un timestamp pour éviter le cache 304
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    } catch (error) {
      if (__DEV__) console.error('[API Client] Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les réponses et erreurs (pas de retry sur 4xx)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const isTimeout = error.code === 'ECONNABORTED';
    const isCanceled = error.code === 'ERR_CANCELED' || error.message === 'canceled';
    if (__DEV__ && !isCanceled) {
      const url = error.config?.url || '';
      const msg = isTimeout ? 'Timeout' : status || error.message || 'Network Error';
      console.warn(`[API] ✗ ${url} - ${msg}`);
    }
    if (status >= 400 && status < 500 && error.config) {
      error.config.__noRetry = true;
    }
    if (isTimeout) {
      error.isTimeout = true;
      error.userMessage = 'Délai dépassé. Tirez pour réessayer.';
    }
    if (status === 401) {
      try {
        await AsyncStorage.removeItem('delivery_token');
        await AsyncStorage.removeItem('delivery_user');
        useAuthStore.getState().logout();
      } catch (e) {
        if (__DEV__) console.warn('[API] AsyncStorage / logout error:', e?.message);
      }
    }
    throw error;
  }
);

export default apiClient;

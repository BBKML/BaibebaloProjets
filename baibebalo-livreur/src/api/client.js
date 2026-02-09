import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../constants/api';
import useAuthStore from '../store/authStore';

// Timeout 10s : éviter que l'app reste bloquée ; erreur gérée gracieusement (spinner + message)
const requestTimeout = 10000;

// Utiliser API_BASE_URL depuis constants/api.js qui gère déjà l'environnement
const apiClient = axios.create({
  baseURL: API_BASE_URL || 'http://192.168.1.5:5000/api/v1',
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
      // Ajouter un timestamp pour éviter le cache 304
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    } catch (error) {
      console.error('[API Client] Error getting token:', error);
    }
    
    // Log de la requête
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les réponses et erreurs (éviter crash APK)
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] ✓ ${response.config?.url} - ${response.status}`);
    return response;
  },
  async (error) => {
    const url = error.config?.url || '';
    const status = error.response?.status;
    const isTimeout = error.code === 'ECONNABORTED';
    const msg = isTimeout ? 'Timeout' : status || error.message || 'Network Error';
    console.warn(`[API] ✗ ${url} - ${msg}`);
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
        console.warn('[API] AsyncStorage / logout error:', e?.message);
      }
    }
    throw error;
  }
);

export default apiClient;

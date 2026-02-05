import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../constants/api';

// Timeout plus long en production (Render cold start peut prendre 30–60 s)
const isProduction = typeof API_BASE_URL === 'string' && API_BASE_URL.includes('render.com');
const requestTimeout = isProduction ? 60000 : 30000;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
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
    const msg = error.code === 'ECONNABORTED' ? 'Timeout' : status || error.message || 'Network Error';
    console.warn(`[API] ✗ ${url} - ${msg}`);
    if (status === 401) {
      try {
        await AsyncStorage.removeItem('delivery_token');
        await AsyncStorage.removeItem('delivery_user');
      } catch (e) {
        console.warn('[API] AsyncStorage clear error:', e?.message);
      }
    }
    throw error;
  }
);

export default apiClient;

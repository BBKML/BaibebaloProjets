import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../constants/api';

// Créer une instance axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
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

// Intercepteur pour gérer les réponses et erreurs
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] ✓ ${response.config.url} - ${response.status}`);
    return response;
  },
  async (error) => {
    console.log(`[API] ✗ ${error.config?.url} - ${error.response?.status || 'Network Error'}`);
    
    if (error.response?.status === 401) {
      // Token expiré - déconnecter
      console.log('[API] Token expiré, déconnexion...');
      await AsyncStorage.removeItem('delivery_token');
      await AsyncStorage.removeItem('delivery_user');
      // Le store gérera la redirection
    }
    return Promise.reject(error);
  }
);

export default apiClient;

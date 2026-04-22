import axios from 'axios';
import API_BASE_URL, { API_ENDPOINTS } from '../constants/api';
import useAuthStore from '../store/authStore';
import { getExpoPushToken } from '../services/notificationService';
import { getErrorMessage } from '../utils/errorMessages';

const api = axios.create({
  baseURL: API_BASE_URL.replace('/api/v1', ''), // Enlever /api/v1 car les endpoints l'incluent déjà
  timeout: 30000, // Augmenté de 10000 à 30000 pour correspondre aux autres apps
  // Axios détecte automatiquement FormData et définit le Content-Type avec boundary
});

// Intercepteur pour ajouter le token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Pour FormData, ne pas définir Content-Type - axios le fera automatiquement avec le boundary
    if (config.data instanceof FormData) {
      // Supprimer Content-Type si défini manuellement pour laisser axios le gérer
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    throw error;
  }
);

// Intercepteur pour gérer les erreurs (pas de retry automatique sur 4xx)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await useAuthStore.getState().logout();
    }
    // Marquer pour éviter tout retry ultérieur sur 4xx (client error)
    if (error.response?.status >= 400 && error.response?.status < 500 && error.config) {
      error.config.__noRetry = true;
    }
    if (!error.userMessage) {
      error.userMessage = getErrorMessage(error);
    }
    throw error;
  }
);

export const restaurantAuth = {
  // Connexion (accepte phone ou email)
  login: async (identifier, password) => {
    try {
      // Nettoyer l'identifiant et le mot de passe (supprimer les espaces)
      const cleanIdentifier = identifier?.trim();
      const cleanPassword = password?.trim();

      // Détecter si c'est un numéro de téléphone ou un email
      // Regex pour détecter un numéro de téléphone (peut commencer par +, contient des chiffres, espaces, tirets, parenthèses)
      const isPhone = /^\+?[0-9\s\-()]+$/.test(cleanIdentifier);
      
      const requestBody = isPhone 
        ? { phone: cleanIdentifier, password: cleanPassword }
        : { email: cleanIdentifier.toLowerCase(), password: cleanPassword };

      try {
        const fcmToken = await getExpoPushToken();
        if (fcmToken && typeof fcmToken === 'string' && fcmToken.trim()) {
          requestBody.fcm_token = fcmToken.trim();
        }
      } catch (_) {}

      const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Réponse: { success, data: { restaurant, accessToken, refreshToken } }
      if (response.data?.data?.accessToken) {
        useAuthStore.getState().setToken(response.data.data.accessToken);
        useAuthStore.getState().setRestaurant(response.data.data.restaurant);
      }
      
      return response.data;
    } catch (error) {
      if (__DEV__) console.warn('Connexion refusée (401 ou réseau):', error?.message);
      throw error.response?.data || error.message;
    }
  },

  // Inscription complète (le backend accepte tout en une fois)
  // Utilise fetch natif car Axios a des problèmes avec FormData en React Native
  register: async (data) => {
    try {
      // Préparer FormData pour les fichiers
      const formData = new FormData();
      
      // Ajouter tous les champs
      Object.keys(data).forEach(key => {
        const value = data[key];
        
        // Ignorer null/undefined
        if (value === null || value === undefined) return;
        
        // Gérer les fichiers (avec uri)
        if (value && value.uri) {
          const fileName = value.fileName || value.name || `${key}.jpg`;
          const fileType = value.mimeType || value.type || 'image/jpeg';
          
          formData.append(key, {
            uri: value.uri,
            type: fileType,
            name: fileName,
          });
        }
        // Gérer les tableaux de fichiers
        else if (Array.isArray(value) && value.length > 0 && value[0]?.uri) {
          value.forEach((file, index) => {
            formData.append(key, {
              uri: file.uri,
              type: file.mimeType || file.type || 'image/jpeg',
              name: file.fileName || file.name || `${key}_${index}.jpg`,
            });
          });
        }
        // Gérer les objets (sérialiser en JSON)
        else if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        }
        // Valeurs simples (string, number)
        else {
          formData.append(key, String(value));
        }
      });
      
      // URL complète du backend
      const url = API_ENDPOINTS.AUTH.REGISTER;
      
      // Utiliser fetch natif (plus fiable pour les uploads en React Native)
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          // NE PAS définir Content-Type, fetch le fera automatiquement avec boundary
        },
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw responseData;
      }
      
      return responseData;
    } catch (error) {
      if (__DEV__) console.error('Erreur register:', error?.message);
      throw error;
    }
  },

  // Vérifier le statut d'inscription (via le profil)
  checkRegistrationStatus: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.RESTAURANT.PROFILE);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Rafraîchir le token
  refreshToken: async () => {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.REFRESH_TOKEN);
      if (response.data?.data?.token) {
        useAuthStore.getState().setToken(response.data.data.token);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Déconnexion
  logout: async () => {
    // Le backend n'a pas de route logout spécifique, on déconnecte juste localement
    // Pas besoin de try/catch car logout() ne devrait pas lever d'exception
    useAuthStore.getState().logout();
  },

  // Mot de passe oublié - Étape 1: Envoyer OTP
  forgotPassword: async (phone) => {
    try {
      const response = await api.post('/api/v1/auth/partner/forgot-password', { 
        phone: phone.trim() 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Mot de passe oublié - Étape 2: Vérifier OTP
  verifyResetOtp: async (phone, otp) => {
    try {
      const response = await api.post('/api/v1/auth/partner/verify-reset-otp', { 
        phone: phone.trim(),
        otp: otp.trim(),
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Mot de passe oublié - Étape 3: Réinitialiser mot de passe
  resetPassword: async (phone, resetToken, newPassword) => {
    try {
      const response = await api.post('/api/v1/auth/partner/reset-password', { 
        phone: phone.trim(),
        reset_token: resetToken,
        new_password: newPassword,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// Exporter l'instance axios pour être utilisée par les autres modules API
export default api;

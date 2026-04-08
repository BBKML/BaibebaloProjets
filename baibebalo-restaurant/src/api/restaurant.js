import api from './auth';
import { API_ENDPOINTS } from '../constants/api';
import useAuthStore from '../store/authStore';

export const restaurantApi = {
  // Profil du restaurant
  getProfile: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.RESTAURANT.PROFILE);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Mettre à jour le profil - Utilise fetch natif pour les uploads de fichiers
  // car axios peut avoir des problèmes avec FormData dans React Native
  updateProfile: async (data) => {
    try {
      // Vérifier si des images NOUVELLES sont présentes (pas juste des URLs)
      const hasNewImages = (data.logo?.uri && !data.logo?.isExisting) ||
                          (data.banner?.uri && !data.banner?.isExisting) ||
                          (data.photos && Array.isArray(data.photos) && data.photos.some(p => p?.uri && !p?.isExisting));
      
      if (hasNewImages) {
        const formData = new FormData();
        
        // Ajouter tous les champs texte
        Object.keys(data).forEach(key => {
          const value = data[key];
          
          // Ignorer les champs spéciaux
          if (key === 'existingPhotos') {
            return;
          }
          
          // Gérer les fichiers (logo, banner) - seulement si nouvelle image
          if (key === 'logo' || key === 'banner') {
            if (value?.uri && !value?.isExisting) {
              const fileData = {
                uri: value.uri,
                type: value.type || 'image/jpeg',
                name: value.name || `${key}_${Date.now()}.jpg`,
              };
              if (!fileData.uri || (!fileData.uri.startsWith('file://') && !fileData.uri.startsWith('content://') && !fileData.uri.startsWith('http'))) {
                if (__DEV__) console.error(`URI invalide pour ${key}`);
                throw new Error(`Image invalide pour ${key}`);
              }
              formData.append(key, fileData);
            } else if (value && typeof value === 'string') {
              formData.append(key, value);
            }
          }
          // Gérer le tableau de photos - seulement nouvelles
          else if (key === 'photos' && Array.isArray(value)) {
            value.forEach((photo, index) => {
                if (photo?.uri && !photo?.isExisting) {
                const fileData = {
                  uri: photo.uri,
                  type: photo.type || 'image/jpeg',
                  name: photo.name || `photo_${Date.now()}_${index}.jpg`,
                };
                if (!fileData.uri || (!fileData.uri.startsWith('file://') && !fileData.uri.startsWith('content://') && !fileData.uri.startsWith('http'))) {
                  if (__DEV__) console.warn('URI photo invalide');
                  return;
                }
                formData.append('photos', fileData);
              }
            });
            if (data.existingPhotos && Array.isArray(data.existingPhotos)) {
              formData.append('existingPhotos', JSON.stringify(data.existingPhotos));
            }
          }
          // Gérer les objets JSON
          else if (typeof value === 'object' && value !== null && !(value instanceof File)) {
            formData.append(key, JSON.stringify(value));
          }
          // Valeurs simples
          else if (value !== null && value !== undefined && key !== 'logo' && key !== 'banner' && key !== 'photos') {
            formData.append(key, String(value));
          }
        });
        // Utiliser fetch natif au lieu d'axios pour les uploads de fichiers
        // car fetch gère mieux FormData avec des fichiers dans React Native
        const token = useAuthStore.getState().token;
        const response = await fetch(API_ENDPOINTS.RESTAURANT.UPDATE_PROFILE, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            // Ne PAS définir Content-Type - fetch le fait automatiquement avec le bon boundary
          },
          body: formData,
        });
        
        const responseData = await response.json();
        if (!response.ok) {
          throw { response: { data: responseData, status: response.status } };
        }
        
        return responseData;
      } else {
        // Pas d'images nouvelles, utiliser JSON normal via axios
        const jsonData = { ...data };
        if (data.logo && typeof data.logo === 'object' && data.logo?.uri) {
          jsonData.logo = data.logo.uri;
        }
        if (data.banner && typeof data.banner === 'object' && data.banner?.uri) {
          jsonData.banner = data.banner.uri;
        }
        if (data.photos && Array.isArray(data.photos)) {
          jsonData.photos = data.photos.map(p => typeof p === 'string' ? p : p?.uri).filter(Boolean);
        }
        
        const response = await api.put(API_ENDPOINTS.RESTAURANT.UPDATE_PROFILE, jsonData);
        return response.data;
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur updateProfile:', error?.message);
      throw error.response?.data || error.message || error;
    }
  },

  // Ouvrir/Fermer le restaurant
  toggleStatus: async (isOpen) => {
    try {
      const response = await api.put(API_ENDPOINTS.RESTAURANT.TOGGLE_STATUS, {
        is_open: isOpen,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Statistiques
  getStatistics: async (period = 'today') => {
    try {
      const response = await api.get(API_ENDPOINTS.RESTAURANT.STATISTICS, {
        params: { period },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Gains
  getEarnings: async (filters = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.RESTAURANT.EARNINGS, {
        params: filters,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Export des données (RGPD) - format 'json' ou 'csv'
  exportData: async (format = 'json') => {
    try {
      const response = await api.get(API_ENDPOINTS.RESTAURANT.EXPORT, {
        params: { format },
        responseType: format === 'csv' ? 'text' : 'json',
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

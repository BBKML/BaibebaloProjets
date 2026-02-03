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
                console.error(`❌ URI invalide pour ${key}:`, fileData.uri);
                throw new Error(`URI d'image invalide pour ${key}`);
              }
              formData.append(key, fileData);
              console.log(`📎 Ajout ${key} au FormData:`, { 
                uri: fileData.uri.substring(0, 80) + '...', 
                type: fileData.type, 
                name: fileData.name,
              });
            } else if (value && typeof value === 'string') {
              formData.append(key, value);
              console.log(`📎 Ajout ${key} (URL existante) au FormData`);
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
                  console.error(`❌ URI invalide pour photo[${index}]:`, fileData.uri);
                  return;
                }
                formData.append('photos', fileData);
                console.log(`📎 Ajout photo[${index}] au FormData`);
              }
            });
            if (data.existingPhotos && Array.isArray(data.existingPhotos)) {
              formData.append('existingPhotos', JSON.stringify(data.existingPhotos));
              console.log('📎 Ajout photos existantes:', data.existingPhotos.length);
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
        
        console.log('📤 Envoi FormData avec images via fetch natif:', {
          hasLogo: !!(data.logo && data.logo.uri && !data.logo.isExisting),
          hasBanner: !!(data.banner && data.banner.uri && !data.banner.isExisting),
          newPhotosCount: data.photos ? data.photos.filter(p => p.uri && !p.isExisting).length : 0,
        });
        
        // Utiliser fetch natif au lieu d'axios pour les uploads de fichiers
        // car fetch gère mieux FormData avec des fichiers dans React Native
        const token = useAuthStore.getState().token;
        console.log('🚀 Envoi requête PUT avec fetch natif...');
        
        const response = await fetch(API_ENDPOINTS.RESTAURANT.UPDATE_PROFILE, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            // Ne PAS définir Content-Type - fetch le fait automatiquement avec le bon boundary
          },
          body: formData,
        });
        
        const responseData = await response.json();
        
        console.log('✅ Réponse reçue du serveur:', {
          status: response.status,
          ok: response.ok,
          success: responseData?.success,
        });
        
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
      console.error('❌ Erreur updateProfile:', error);
      console.error('❌ Détails:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
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
};

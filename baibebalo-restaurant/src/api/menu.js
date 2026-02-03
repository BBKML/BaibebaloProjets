import api from './auth';
import { API_ENDPOINTS } from '../constants/api';
import useAuthStore from '../store/authStore';

export const restaurantMenu = {
  // Obtenir le menu complet
  getMenu: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.MENU.LIST);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Obtenir les catégories
  getCategories: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.MENU.CATEGORIES);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Créer une catégorie
  createCategory: async (categoryData) => {
    try {
      const response = await api.post(API_ENDPOINTS.MENU.CREATE_CATEGORY, {
        name: categoryData.name,
        description: categoryData.description,
        display_order: categoryData.display_order,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Mettre à jour une catégorie
  updateCategory: async (categoryId, categoryData) => {
    try {
      const response = await api.put(API_ENDPOINTS.MENU.UPDATE_CATEGORY(categoryId), {
        name: categoryData.name,
        description: categoryData.description,
        display_order: categoryData.display_order,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Supprimer une catégorie
  deleteCategory: async (categoryId) => {
    try {
      const response = await api.delete(API_ENDPOINTS.MENU.DELETE_CATEGORY(categoryId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Créer un article (avec support upload d'image)
  createItem: async (itemData) => {
    try {
      // Si une image est fournie, utiliser FormData avec fetch natif
      if (itemData.photo?.uri) {
        const formData = new FormData();
        formData.append('name', itemData.name);
        if (itemData.description) formData.append('description', itemData.description);
        formData.append('price', String(itemData.price));
        if (itemData.category_id) formData.append('category_id', itemData.category_id);
        if (itemData.preparation_time) formData.append('preparation_time', String(itemData.preparation_time));
        formData.append('is_available', String(itemData.is_available !== false));
        if (itemData.stock_quantity !== null && itemData.stock_quantity !== undefined) {
          formData.append('stock_quantity', String(itemData.stock_quantity));
        }
        if (itemData.tags?.length > 0) formData.append('tags', JSON.stringify(itemData.tags));
        
        // Ajouter l'image
        formData.append('photo', {
          uri: itemData.photo.uri,
          type: itemData.photo.type || 'image/jpeg',
          name: itemData.photo.name || `menu_${Date.now()}.jpg`,
        });
        
        console.log('📸 Upload photo article:', { uri: itemData.photo.uri.substring(0, 50) + '...' });
        
        const token = useAuthStore.getState().token;
        const response = await fetch(API_ENDPOINTS.MENU.CREATE_ITEM, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        
        const responseData = await response.json();
        if (!response.ok) {
          throw { response: { data: responseData, status: response.status } };
        }
        return responseData;
      } else {
        // Pas d'image, utiliser JSON normal
        const response = await api.post(API_ENDPOINTS.MENU.CREATE_ITEM, {
          name: itemData.name,
          description: itemData.description,
          price: itemData.price,
          category_id: itemData.category_id,
          preparation_time: itemData.preparation_time,
          is_available: itemData.is_available !== false,
          stock_quantity: itemData.stock_quantity,
          tags: itemData.tags || [],
        });
        return response.data;
      }
    } catch (error) {
      console.error('❌ Erreur createItem:', error);
      throw error.response?.data || error.message;
    }
  },

  // Modifier un article (avec support upload d'image)
  updateItem: async (itemId, itemData) => {
    try {
      // Si une nouvelle image est fournie (avec uri locale, pas une URL existante)
      const hasNewPhoto = itemData.photo?.uri && 
                          !itemData.photo.uri.startsWith('http');
      
      if (hasNewPhoto) {
        const formData = new FormData();
        if (itemData.name !== undefined) formData.append('name', itemData.name);
        if (itemData.description !== undefined) formData.append('description', itemData.description);
        if (itemData.price !== undefined) formData.append('price', String(itemData.price));
        if (itemData.category_id !== undefined) formData.append('category_id', itemData.category_id);
        if (itemData.preparation_time !== undefined) formData.append('preparation_time', String(itemData.preparation_time));
        if (itemData.is_available !== undefined) formData.append('is_available', String(itemData.is_available));
        if (itemData.stock_quantity !== undefined && itemData.stock_quantity !== null) {
          formData.append('stock_quantity', String(itemData.stock_quantity));
        }
        
        // Ajouter la nouvelle image
        formData.append('photo', {
          uri: itemData.photo.uri,
          type: itemData.photo.type || 'image/jpeg',
          name: itemData.photo.name || `menu_${Date.now()}.jpg`,
        });
        
        console.log('📸 Upload nouvelle photo article:', { uri: itemData.photo.uri.substring(0, 50) + '...' });
        
        const token = useAuthStore.getState().token;
        const response = await fetch(API_ENDPOINTS.MENU.UPDATE_ITEM(itemId), {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        
        const responseData = await response.json();
        if (!response.ok) {
          throw { response: { data: responseData, status: response.status } };
        }
        return responseData;
      } else {
        // Pas de nouvelle image, utiliser JSON normal
        const updateData = {};
        if (itemData.name !== undefined) updateData.name = itemData.name;
        if (itemData.description !== undefined) updateData.description = itemData.description;
        if (itemData.price !== undefined) updateData.price = itemData.price;
        if (itemData.category_id !== undefined) updateData.category_id = itemData.category_id;
        if (itemData.preparation_time !== undefined) updateData.preparation_time = itemData.preparation_time;
        if (itemData.is_available !== undefined) updateData.is_available = itemData.is_available;
        if (itemData.stock_quantity !== undefined) updateData.stock_quantity = itemData.stock_quantity;
        if (itemData.customization_options !== undefined) updateData.customization_options = itemData.customization_options;

        const response = await api.put(API_ENDPOINTS.MENU.UPDATE_ITEM(itemId), updateData);
        return response.data;
      }
    } catch (error) {
      console.error('❌ Erreur updateItem:', error);
      throw error.response?.data || error.message;
    }
  },

  // Mettre à jour les options de personnalisation d'un article
  updateItemOptions: async (itemId, options) => {
    try {
      const response = await api.put(API_ENDPOINTS.MENU.UPDATE_ITEM(itemId), {
        customization_options: options,
      });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur updateItemOptions:', error);
      throw error.response?.data || error.message;
    }
  },

  // Activer/désactiver un article
  toggleAvailability: async (itemId) => {
    try {
      const response = await api.put(API_ENDPOINTS.MENU.TOGGLE_AVAILABILITY(itemId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Supprimer un article
  deleteItem: async (itemId) => {
    try {
      const response = await api.delete(API_ENDPOINTS.MENU.DELETE_ITEM(itemId));
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Mise à jour en masse (plusieurs articles)
  bulkUpdate: async (updates) => {
    try {
      // Exécuter toutes les mises à jour en parallèle
      const promises = updates.map((update) => {
        const { id, ...updateData } = update;
        // Normaliser les noms de champs
        const normalizedData = {};
        if (updateData.price !== undefined) normalizedData.price = updateData.price;
        if (updateData.categoryId !== undefined) normalizedData.category_id = updateData.categoryId;
        if (updateData.category_id !== undefined) normalizedData.category_id = updateData.category_id;
        if (updateData.isActive !== undefined) normalizedData.is_available = updateData.isActive;
        if (updateData.is_available !== undefined) normalizedData.is_available = updateData.is_available;
        
        return restaurantMenu.updateItem(id, normalizedData);
      });
      
      const results = await Promise.all(promises);
      return { success: true, results };
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

};

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useAuthStore = create((set, get) => ({
  // État
  restaurant: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  isOnboarded: false,

  // Actions
  setRestaurant: (restaurant) => set({ restaurant, isAuthenticated: !!restaurant }),

  setToken: (token) => {
    set({ token });
    if (token) {
      AsyncStorage.setItem('restaurant_token', token);
    } else {
      AsyncStorage.removeItem('restaurant_token');
    }
  },

  login: async (restaurant, token) => {
    set({ restaurant, token, isAuthenticated: true });
    await AsyncStorage.setItem('restaurant_token', token);
    await AsyncStorage.setItem('restaurant_data', JSON.stringify(restaurant));
  },

  logout: async () => {
    set({ restaurant: null, token: null, isAuthenticated: false });
    await AsyncStorage.removeItem('restaurant_token');
    await AsyncStorage.removeItem('restaurant_data');
  },

  loadStoredAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('restaurant_token');
      const restaurantData = await AsyncStorage.getItem('restaurant_data');

      if (token && restaurantData) {
        const restaurant = JSON.parse(restaurantData);
        // Charger les données en cache d'abord pour un affichage rapide
        set({ restaurant, token, isAuthenticated: true, isLoading: false });

        // Valider le token en arrière-plan — si expiré, déconnecter proprement
        try {
          const { API_ENDPOINTS } = require('../constants/api');
          const response = await fetch(API_ENDPOINTS.RESTAURANT.PROFILE, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.status === 401) {
            // Token expiré : déconnecter sans bruit
            set({ restaurant: null, token: null, isAuthenticated: false });
            await AsyncStorage.removeItem('restaurant_token');
            await AsyncStorage.removeItem('restaurant_data');
          } else if (response.ok) {
            const data = await response.json();
            const freshRestaurant = data?.data?.restaurant || data?.data || data?.restaurant || restaurant;
            set({ restaurant: freshRestaurant });
            await AsyncStorage.setItem('restaurant_data', JSON.stringify(freshRestaurant));
          }
        } catch (_) {
          // Réseau indisponible — on garde les données en cache, pas de déco
        }
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
    }
  },

  // Recharger le profil depuis le backend (utilisé par SettingsScreen etc.)
  loadProfile: async () => {
    const token = get().token;
    if (!token) return;
    try {
      const { API_ENDPOINTS } = require('../constants/api');
      const response = await fetch(API_ENDPOINTS.RESTAURANT.PROFILE, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const freshRestaurant = data?.data?.restaurant || data?.data || data?.restaurant;
        if (freshRestaurant) {
          set({ restaurant: freshRestaurant });
          await AsyncStorage.setItem('restaurant_data', JSON.stringify(freshRestaurant));
        }
      }
    } catch (_) {}
  },

  updateRestaurant: (updates) => {
    const currentRestaurant = get().restaurant;
    if (currentRestaurant) {
      const updatedRestaurant = { ...currentRestaurant, ...updates };
      set({ restaurant: updatedRestaurant });
      AsyncStorage.setItem('restaurant_data', JSON.stringify(updatedRestaurant));
    }
  },
}));

export default useAuthStore;

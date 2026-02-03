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
        set({ 
          restaurant, 
          token, 
          isAuthenticated: true,
          isLoading: false 
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      set({ isLoading: false });
    }
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

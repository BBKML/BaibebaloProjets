import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CART_STORAGE_KEY = 'baibebalo_cart';

// Normalise les customisations pour une comparaison cohérente (deep sort)
const normalizeCustomizations = (cust) => {
  if (!cust) return null;
  if (Array.isArray(cust)) {
    return JSON.stringify([...cust].sort((a, b) => String(a).localeCompare(String(b))));
  }
  if (typeof cust === 'object') {
    const sorted = Object.keys(cust).sort().reduce((acc, key) => {
      acc[key] = Array.isArray(cust[key]) ? [...cust[key]].sort() : cust[key];
      return acc;
    }, {});
    return JSON.stringify(sorted);
  }
  return JSON.stringify(cust);
};

const saveCartToStorage = async (state) => {
  try {
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
      items: state.items,
      restaurantId: state.restaurantId,
      restaurantName: state.restaurantName,
    }));
  } catch (_) {}
};

const useCartStore = create((set, get) => ({
  // État
  items: [],
  restaurantId: null,
  restaurantName: null,

  // Charger le panier sauvegardé au démarrage
  loadCart: async () => {
    try {
      const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.items)) {
          set({
            items: parsed.items,
            restaurantId: parsed.restaurantId || null,
            restaurantName: parsed.restaurantName || null,
          });
        }
      }
    } catch (_) {}
  },

  // Actions
  addItem: (item, restaurantId, restaurantName, options = {}) => {
    const { items, restaurantId: currentRestaurantId } = get();

    // Si on ajoute un item d'un autre restaurant, vider le panier
    if (currentRestaurantId && currentRestaurantId !== restaurantId && !options.force) {
      return {
        requiresConfirm: true,
        currentRestaurantId,
        currentRestaurantName: get().restaurantName,
        nextRestaurantId: restaurantId,
        nextRestaurantName: restaurantName,
      };
    }
    if (currentRestaurantId && currentRestaurantId !== restaurantId && options.force) {
      const newState = {
        items: [{ ...item, quantity: 1 }],
        restaurantId,
        restaurantName,
      };
      set(newState);
      saveCartToStorage(newState);
      return { replaced: true };
    }

    // Vérifier si l'item existe déjà (avec même id + mêmes customisations)
    const existingItemIndex = items.findIndex(
      (i) => i.id === item.id &&
        normalizeCustomizations(i.customizations) === normalizeCustomizations(item.customizations)
    );

    if (existingItemIndex >= 0) {
      const newItems = items.map((i, idx) =>
        idx === existingItemIndex ? { ...i, quantity: i.quantity + 1 } : i
      );
      const newState = { items: newItems, restaurantId, restaurantName };
      set(newState);
      saveCartToStorage(newState);
      return { updated: true };
    } else {
      const newState = {
        items: [...items, { ...item, quantity: 1 }],
        restaurantId,
        restaurantName,
      };
      set(newState);
      saveCartToStorage(newState);
      return { added: true };
    }
  },

  removeItem: (itemId, customizations) => {
    const { items } = get();
    const normTarget = normalizeCustomizations(customizations);
    const newItems = items.filter(
      (item) => !(item.id === itemId && normalizeCustomizations(item.customizations) === normTarget)
    );
    const newState = {
      items: newItems,
      restaurantId: newItems.length === 0 ? null : get().restaurantId,
      restaurantName: newItems.length === 0 ? null : get().restaurantName,
    };
    set(newState);
    saveCartToStorage(newState);
  },

  updateQuantity: (itemId, customizations, quantity) => {
    if (quantity <= 0) {
      get().removeItem(itemId, customizations);
      return;
    }
    const { items } = get();
    const normTarget = normalizeCustomizations(customizations);
    const newItems = items.map((item) =>
      item.id === itemId && normalizeCustomizations(item.customizations) === normTarget
        ? { ...item, quantity }
        : item
    );
    const newState = { items: newItems, restaurantId: get().restaurantId, restaurantName: get().restaurantName };
    set(newState);
    saveCartToStorage(newState);
  },

  clearCart: async () => {
    set({ items: [], restaurantId: null, restaurantName: null });
    try { await AsyncStorage.removeItem(CART_STORAGE_KEY); } catch (_) {}
  },

  // Getters
  getTotal: () => {
    const { items } = get();
    return Math.round(items.reduce((total, item) => total + Math.round(Number.parseFloat(item.price)) * item.quantity, 0));
  },

  getItemCount: () => {
    const { items } = get();
    return items.reduce((count, item) => count + item.quantity, 0);
  },
}));

export default useCartStore;

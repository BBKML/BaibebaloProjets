import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  // État
  items: [],
  restaurantId: null,
  restaurantName: null,

  // Actions
  addItem: (item, restaurantId, restaurantName) => {
    const { items, restaurantId: currentRestaurantId } = get();
    
    // Si on ajoute un item d'un autre restaurant, vider le panier
    if (currentRestaurantId && currentRestaurantId !== restaurantId) {
      set({
        items: [{ ...item, quantity: 1 }],
        restaurantId,
        restaurantName,
      });
      return;
    }

    // Vérifier si l'item existe déjà
    const existingItemIndex = items.findIndex(
      (i) => i.id === item.id && JSON.stringify(i.customizations) === JSON.stringify(item.customizations)
    );

    if (existingItemIndex >= 0) {
      // Incrémenter la quantité
      const newItems = [...items];
      newItems[existingItemIndex].quantity += 1;
      set({ items: newItems, restaurantId, restaurantName });
    } else {
      // Ajouter un nouvel item
      set({
        items: [...items, { ...item, quantity: 1 }],
        restaurantId,
        restaurantName,
      });
    }
  },

  removeItem: (itemId, customizations) => {
    const { items } = get();
    const newItems = items.filter(
      (item) => !(item.id === itemId && JSON.stringify(item.customizations) === JSON.stringify(customizations))
    );
    set({ items: newItems });
    
    // Si le panier est vide, réinitialiser le restaurant
    if (newItems.length === 0) {
      set({ restaurantId: null, restaurantName: null });
    }
  },

  updateQuantity: (itemId, customizations, quantity) => {
    if (quantity <= 0) {
      get().removeItem(itemId, customizations);
      return;
    }

    const { items } = get();
    const newItems = items.map((item) => {
      if (item.id === itemId && JSON.stringify(item.customizations) === JSON.stringify(customizations)) {
        return { ...item, quantity };
      }
      return item;
    });
    set({ items: newItems });
  },

  clearCart: () => {
    set({ items: [], restaurantId: null, restaurantName: null });
  },

  // Getters
  getTotal: () => {
    const { items } = get();
    return items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
  },

  getItemCount: () => {
    const { items } = get();
    return items.reduce((count, item) => count + item.quantity, 0);
  },
}));

export default useCartStore;

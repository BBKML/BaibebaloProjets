import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  // État
  items: [],
  restaurantId: null,
  restaurantName: null,

  // Actions
  addItem: (item, restaurantId, restaurantName, options = {}) => {
    console.log('🛒 addItem appelé:', { restaurantId, restaurantName, item: item.name });
    const { items, restaurantId: currentRestaurantId } = get();
    console.log('🛒 État actuel:', { currentRestaurantId, itemsCount: items.length });
    
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
      set({
        items: [{ ...item, quantity: 1 }],
        restaurantId,
        restaurantName,
      });
      console.log('✅ Panier remplacé, restaurantId:', restaurantId);
      return { replaced: true };
    }

    // Vérifier si l'item existe déjà
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/66128188-ae85-488b-8573-429b47c72881',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'cartStore.js:36',message:'Finding existing item',data:{itemId:item.id,itemCustomizations:item.customizations,itemsCount:items.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    const normalizeCustomizations = (cust) => {
      if (!cust) return null;
      if (typeof cust === 'object') {
        const sorted = Object.keys(cust).sort().reduce((acc, key) => {
          acc[key] = cust[key];
          return acc;
        }, {});
        return JSON.stringify(sorted);
      }
      return JSON.stringify(cust);
    };
    const existingItemIndex = items.findIndex(
      (i) => i.id === item.id && normalizeCustomizations(i.customizations) === normalizeCustomizations(item.customizations)
    );
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/66128188-ae85-488b-8573-429b47c72881',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'cartStore.js:48',message:'Existing item search result',data:{existingItemIndex,found:existingItemIndex>=0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    if (existingItemIndex >= 0) {
      // Incrémenter la quantité
      const newItems = [...items];
      newItems[existingItemIndex].quantity += 1;
      set({ items: newItems, restaurantId, restaurantName });
      console.log('✅ Quantité mise à jour, restaurantId:', restaurantId);
      return { updated: true };
    } else {
      // Ajouter un nouvel item
      set({
        items: [...items, { ...item, quantity: 1 }],
        restaurantId,
        restaurantName,
      });
      console.log('✅ Item ajouté, restaurantId sauvegardé:', restaurantId);
      return { added: true };
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
      console.log('🗑️ Panier vidé, restaurantId réinitialisé');
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
    console.log('🗑️ clearCart appelé, tout réinitialisé');
  },

  // Getters
  getTotal: () => {
    const { items } = get();
    return items.reduce((total, item) => {
      return total + parseFloat(item.price) * item.quantity;
    }, 0);
  },

  getItemCount: () => {
    const { items } = get();
    return items.reduce((count, item) => count + item.quantity, 0);
  },
}));

export default useCartStore;
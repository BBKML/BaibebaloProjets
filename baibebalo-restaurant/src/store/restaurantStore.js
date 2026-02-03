import { create } from 'zustand';

const useRestaurantStore = create((set, get) => ({
  // État
  orders: [],
  pendingOrders: [],
  menu: [],
  categories: [],
  stats: null,
  financialData: null,
  
  // Actions commandes
  setOrders: (orders) => {
    const pending = orders.filter(o => o.status === 'pending' || o.status === 'new');
    set({ orders, pendingOrders: pending });
  },
  
  addOrder: (order) => {
    const orders = [...get().orders, order];
    const pending = orders.filter(o => o.status === 'pending' || o.status === 'new');
    set({ orders, pendingOrders: pending });
  },
  
  updateOrder: (orderId, updates) => {
    const orders = get().orders.map(o => 
      o.id === orderId ? { ...o, ...updates } : o
    );
    const pending = orders.filter(o => o.status === 'pending' || o.status === 'new');
    set({ orders, pendingOrders: pending });
  },
  
  // Actions menu
  setMenu: (menu) => set({ menu }),
  setCategories: (categories) => set({ categories }),
  
  addMenuItem: (item) => {
    const menu = [...get().menu, item];
    set({ menu });
  },
  
  updateMenuItem: (itemId, updates) => {
    const menu = get().menu.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    set({ menu });
  },
  
  deleteMenuItem: (itemId) => {
    const menu = get().menu.filter(item => item.id !== itemId);
    set({ menu });
  },
  
  // Actions statistiques
  setStats: (stats) => set({ stats }),
  setFinancialData: (data) => set({ financialData: data }),
}));

export default useRestaurantStore;

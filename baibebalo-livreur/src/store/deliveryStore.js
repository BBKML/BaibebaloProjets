import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile, updateDeliveryStatus, updateLocation } from '../api/delivery';
import { getDashboard, getEarnings } from '../api/earnings';
import { getActiveOrders, getDeliveryHistory } from '../api/orders';

/** Garde synchrone : un seul loadDashboardData à la fois (évite 2x orders/active + 2x history) */
let __loadDashboardInProgress = false;

const useDeliveryStore = create((set, get) => ({
  // État du livreur
  status: 'offline', // 'available', 'busy', 'offline'
  currentLocation: null,
  isLoading: false,
  error: null,
  
  // Course en cours
  currentDelivery: null,
  activeOrders: [],
  deliveryStep: null, // 'to_restaurant', 'at_restaurant', 'to_customer', 'at_customer'
  
  // Statistiques du jour (depuis le backend)
  todayStats: {
    earnings: 0,
    deliveries: 0,
    rating: 0,
    distance: 0,
    onlineTime: 0,
  },
  
  // Gains complets (depuis le backend)
  earningsData: {
    available_balance: 0,
    total_earnings: 0,
    total_deliveries: 0,
    today: 0,
    this_week: 0,
    this_month: 0,
  },
  
  // Objectifs
  dailyGoal: {
    target: 10,
    completed: 0,
    bonusAmount: 2000,
  },
  
  // Alertes de course
  pendingAlert: null,
  alertTimeout: null,
  
  // Historique récent
  recentDeliveries: [],
  
  // Zones chaudes
  hotZones: [],
  
  // Notifications non lues
  unreadNotifications: 0,

  // Chargement dashboard en cours (évite doublons)
  loadInProgress: false,

  // === Actions API - Charger les données depuis le backend ===

  /** Annule le chargement dashboard en cours (ex. au démontage de l'écran Accueil) */
  cancelDashboardLoad: () => {
    const g = typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : null;
    if (g && g.__dashboardAbortController) {
      g.__dashboardAbortController.abort();
      g.__dashboardAbortController = null;
    }
  },

  /**
   * Charge le dashboard en 1 seul appel (earnings + commandes actives + historique).
   * Évite 3 requêtes → moins de timeouts et "- - ms - -".
   * @param {{ force?: boolean }} [opts] - force: true pour forcer le rafraîchissement (focus, app foreground)
   */
  loadDashboardData: async (opts = {}) => {
    if (!opts.force && (__loadDashboardInProgress || get().loadInProgress)) return;
    __loadDashboardInProgress = true;
    const g = typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : null;
    if (g && g.__dashboardAbortController) {
      g.__dashboardAbortController.abort();
    }
    const controller = new AbortController();
    if (g) g.__dashboardAbortController = controller;
    const signal = controller.signal;

    set({ loadInProgress: true, isLoading: true, error: null });
    const applyError = (e) => {
      if (e?.name === 'AbortError' || e?.code === 'ERR_CANCELED') return;
      set({ error: e?.userMessage || e?.message || 'Erreur chargement. Tirez pour réessayer.' });
    };

    const finish = () => {
      __loadDashboardInProgress = false;
      set({ loadInProgress: false, isLoading: false });
      if (g) g.__dashboardAbortController = null;
    };

    getDashboard({ signal })
      .then((res) => {
        if (!res?.success || !res?.data) return;
        const { earnings, orders, deliveries, profile } = res.data;
        const ordersList = Array.isArray(orders) ? orders : [];
        const rawDeliveries = Array.isArray(deliveries) ? deliveries : [];
        const earningsData = earnings || {};
        const completedToday = rawDeliveries.length > 0
          ? rawDeliveries.filter(d => isToday(d.delivered_at || d.created_at)).length
          : 0;
        const avgRating = profile?.average_rating != null ? parseFloat(profile.average_rating) : null;
        set({
          earningsData: {
            available_balance: earningsData.available_balance ?? 0,
            total_earnings: earningsData.total_earnings ?? 0,
            total_deliveries: earningsData.total_deliveries ?? 0,
            today: earningsData.today ?? 0,
            this_week: earningsData.this_week ?? 0,
            this_month: earningsData.this_month ?? 0,
          },
          todayStats: {
            ...get().todayStats,
            earnings: earningsData.today ?? 0,
            deliveries: earningsData.today_deliveries ?? completedToday,
            rating: avgRating ?? get().todayStats.rating,
          },
          activeOrders: ordersList,
          currentDelivery: ordersList.length > 0 ? ordersList[0] : null,
        });
        if (rawDeliveries.length > 0) {
          const mapped = rawDeliveries.map(d => ({
            id: d.id,
            time: new Date(d.delivered_at || d.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            restaurant: d.restaurant_name || 'Restaurant',
            destination: (d.delivery_address && typeof d.delivery_address === 'object' ? d.delivery_address.address_line : null) || 'Destination',
            amount: d.delivery_fee || 0,
            rating: d.delivery_rating ?? null,
            date: formatRelativeDate(d.delivered_at || d.created_at),
          }));
          set({
            recentDeliveries: mapped,
            dailyGoal: { ...get().dailyGoal, completed: completedToday },
          });
        }
      })
      .catch(applyError)
      .finally(finish);
  },

  /**
   * Met à jour le statut du livreur via API
   */
  setStatus: async (newStatus) => {
    const previousStatus = get().status;
    set({ status: newStatus }); // Optimistic update
    
    try {
      const response = await updateDeliveryStatus(newStatus);
      if (response?.success) {
        await AsyncStorage.setItem('delivery_status', newStatus);
      } else {
        set({ status: previousStatus }); // Rollback
      }
    } catch (error) {
      console.error('Erreur setStatus:', error);
      set({ status: previousStatus }); // Rollback
    }
  },

  /**
   * Met à jour la position GPS via API
   */
  updateLocationApi: async (latitude, longitude) => {
    set({ currentLocation: { latitude, longitude } });
    
    try {
      await updateLocation(latitude, longitude);
    } catch (error) {
      console.error('Erreur updateLocation:', error);
    }
  },

  /**
   * Charge les gains depuis le backend
   */
  fetchEarnings: async () => {
    try {
      const response = await getEarnings();
      if (response?.success && response?.data) {
        const data = response.data;
        set({
          earningsData: {
            available_balance: data.available_balance || 0,
            total_earnings: data.total_earnings || 0,
            total_deliveries: data.total_deliveries || 0,
            today: data.today || 0,
            this_week: data.this_week || 0,
            this_month: data.this_month || 0,
          },
          todayStats: {
            ...get().todayStats,
            earnings: data.today || 0,
          },
        });
        return data;
      }
    } catch (error) {
      console.error('Erreur fetchEarnings:', error);
    }
    return null;
  },

  /**
   * Charge l'historique des livraisons
   */
  fetchDeliveryHistory: async (page = 1, limit = 20, status) => {
    try {
      const response = await getDeliveryHistory(page, limit, status);
      if (response?.success && response?.data) {
        return response.data;
      }
    } catch (error) {
      console.error('Erreur fetchDeliveryHistory:', error);
    }
    return null;
  },

  /**
   * Charge les commandes actives
   */
  fetchActiveOrders: async () => {
    try {
      const response = await getActiveOrders();
      if (response?.success && response?.data?.orders) {
        const orders = response.data.orders;
        set({ 
          activeOrders: orders,
          currentDelivery: orders.length > 0 ? orders[0] : null,
        });
        return orders;
      }
    } catch (error) {
      console.error('Erreur fetchActiveOrders:', error);
    }
    return [];
  },

  // === Actions locales ===
  
  loadStoredStatus: async () => {
    try {
      const status = await AsyncStorage.getItem('delivery_status');
      if (status) {
        set({ status });
      }
    } catch (error) {
      console.error('Error loading status:', error);
    }
  },

  setCurrentLocation: (location) => set({ currentLocation: location }),

  setCurrentDelivery: (delivery) => set({ 
    currentDelivery: delivery,
    deliveryStep: delivery ? 'to_restaurant' : null,
    status: delivery ? 'busy' : get().status,
  }),

  setDeliveryStep: (step) => set({ deliveryStep: step }),

  clearCurrentDelivery: () => set({ 
    currentDelivery: null, 
    deliveryStep: null,
  }),

  // === Actions d'alerte ===
  setPendingAlert: (alert, timeout = 30000) => {
    const previousTimeout = get().alertTimeout;
    if (previousTimeout) {
      clearTimeout(previousTimeout);
    }

    const newTimeout = setTimeout(() => {
      set({ pendingAlert: null, alertTimeout: null });
    }, timeout);

    set({ pendingAlert: alert, alertTimeout: newTimeout });
  },

  clearPendingAlert: () => {
    const timeout = get().alertTimeout;
    if (timeout) {
      clearTimeout(timeout);
    }
    set({ pendingAlert: null, alertTimeout: null });
  },

  // === Actions de statistiques locales ===
  updateTodayStats: (stats) => {
    const currentStats = get().todayStats;
    set({ todayStats: { ...currentStats, ...stats } });
  },

  incrementDeliveries: () => {
    const stats = get().todayStats;
    const goal = get().dailyGoal;
    set({ 
      todayStats: { ...stats, deliveries: stats.deliveries + 1 },
      dailyGoal: { ...goal, completed: goal.completed + 1 },
    });
  },

  addEarnings: (amount) => {
    const stats = get().todayStats;
    const earnings = get().earningsData;
    set({ 
      todayStats: { ...stats, earnings: stats.earnings + amount },
      earningsData: { 
        ...earnings, 
        today: earnings.today + amount,
        available_balance: earnings.available_balance + amount,
      },
    });
  },

  // === Actions d'historique ===
  setRecentDeliveries: (deliveries) => set({ recentDeliveries: deliveries }),

  addToRecentDeliveries: (delivery) => {
    const recent = get().recentDeliveries;
    const updated = [delivery, ...recent].slice(0, 10);
    set({ recentDeliveries: updated });
  },

  // === Actions de zones ===
  setHotZones: (zones) => set({ hotZones: zones }),

  // === Actions de notifications ===
  setUnreadNotifications: (count) => set({ unreadNotifications: count }),
  incrementUnreadNotifications: () => {
    const count = get().unreadNotifications;
    set({ unreadNotifications: count + 1 });
  },
  clearUnreadNotifications: () => set({ unreadNotifications: 0 }),

  // === Action de reset ===
  reset: () => {
    const g = typeof global !== 'undefined' ? global : null;
    if (g && g.__dashboardAbortController) {
      g.__dashboardAbortController.abort();
      g.__dashboardAbortController = null;
    }
    set({
    status: 'offline',
    loadInProgress: false,
    currentLocation: null,
    isLoading: false,
    error: null,
    currentDelivery: null,
    activeOrders: [],
    deliveryStep: null,
    todayStats: {
      earnings: 0,
      deliveries: 0,
      rating: 0,
      distance: 0,
      onlineTime: 0,
    },
    earningsData: {
      available_balance: 0,
      total_earnings: 0,
      total_deliveries: 0,
      today: 0,
      this_week: 0,
      this_month: 0,
    },
    dailyGoal: {
      target: 10,
      completed: 0,
      bonusAmount: 2000,
    },
    pendingAlert: null,
    alertTimeout: null,
    recentDeliveries: [],
    hotZones: [],
    unreadNotifications: 0,
  });
  },
}));

// === Helpers ===
function formatRelativeDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return date.toLocaleDateString('fr-FR');
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export default useDeliveryStore;

/**
 * Service WebSocket pour l'Admin BAIBEBALO
 * Gère les communications temps réel pour :
 * - Toutes les commandes
 * - Positions des livreurs
 * - Alertes système
 */
import { io } from 'socket.io-client';

const PRODUCTION_BACKEND = 'https://baibebaloprojets.onrender.com';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnected = false;
  }

  /**
   * Retourne l'URL du serveur WebSocket backend.
   * ✅ En production, on utilise VITE_BACKEND_URL ou l'URL codée en dur —
   *    jamais window.location.origin qui pointe vers le FRONTEND.
   */
  getWebSocketURL() {
    if (import.meta.env.DEV) {
      const backendPort = import.meta.env.VITE_BACKEND_PORT || '5000';
      const backendHost = import.meta.env.VITE_BACKEND_URL || `http://localhost:${backendPort}`;
      return backendHost.replace(/\/+$/, '');
    }

    // ✅ Production : VITE_BACKEND_URL ou fallback codé en dur
    // ⚠️ window.location.origin = frontend (baibebalo-admin.onrender.com) → FAUX
    if (import.meta.env.VITE_BACKEND_URL) {
      return import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, '');
    }

    console.warn('[AdminSocket] VITE_BACKEND_URL non défini — utilisation de l\'URL de secours.');
    return PRODUCTION_BACKEND;
  }

  /**
   * Connecter au serveur WebSocket
   */
  connect(token) {
    if (!token) {
      console.log('[AdminSocket] Pas de token, connexion annulée');
      return;
    }

    if (this.socket?.connected) {
      console.log('[AdminSocket] Déjà connecté');
      return;
    }

    const wsURL = this.getWebSocketURL();
    console.log('[AdminSocket] Connexion à:', wsURL);

    this.socket = io(wsURL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.setupListeners();
  }

  /**
   * Configurer les listeners
   */
  setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[AdminSocket] ✅ Connecté');
      this.isConnected = true;
      this.socket.emit('join_admin_dashboard');
      this._emit('connection_status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[AdminSocket] ❌ Déconnecté:', reason);
      this.isConnected = false;
      this._emit('connection_status', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('[AdminSocket] Erreur connexion:', error.message);
    });

    // === ÉVÉNEMENTS COMMANDES ===
    this.socket.on('new_order', (data) => {
      console.log('[AdminSocket] 🆕 Nouvelle commande:', data);
      this._emit('new_order', data);
    });

    this.socket.on('order_updated', (data) => {
      console.log('[AdminSocket] 🔄 Commande mise à jour:', data);
      this._emit('order_updated', data);
    });

    this.socket.on('order_status_changed', (data) => {
      console.log('[AdminSocket] 📦 Statut commande changé:', data);
      this._emit('order_status_changed', data);
    });

    this.socket.on('order_cancelled', (data) => {
      console.log('[AdminSocket] ❌ Commande annulée:', data);
      this._emit('order_cancelled', data);
    });

    this.socket.on('order_delivered', (data) => {
      console.log('[AdminSocket] ✅ Commande livrée:', data);
      this._emit('order_delivered', data);
    });

    // === ÉVÉNEMENTS LIVREURS ===
    this.socket.on('delivery_location', (data) => {
      this._emit('delivery_location', data);
    });

    this.socket.on('delivery_status_changed', (data) => {
      console.log('[AdminSocket] 🚴 Statut livreur changé:', data);
      this._emit('delivery_status_changed', data);
    });

    this.socket.on('delivery_assigned', (data) => {
      console.log('[AdminSocket] 🚴 Livreur assigné:', data);
      this._emit('delivery_assigned', data);
    });

    // === ALERTES SYSTÈME ===
    this.socket.on('system_alert', (data) => {
      console.log('[AdminSocket] ⚠️ Alerte système:', data);
      this._emit('system_alert', data);
    });

    this.socket.on('order_delayed_alert', (data) => {
      console.log('[AdminSocket] ⏰ Alerte commande en retard:', data);
      this._emit('order_delayed_alert', data);
    });

    this.socket.on('delivery_issue_alert', (data) => {
      console.log('[AdminSocket] 🚨 Problème livreur:', data);
      this._emit('delivery_issue_alert', data);
    });

    this.socket.on('new_support_ticket', (data) => {
      console.log('[AdminSocket] 🎫 Nouveau ticket support:', data);
      this._emit('new_support_ticket', data);
    });

    // === ÉVÉNEMENTS RESTAURANTS ===
    this.socket.on('restaurant_status_changed', (data) => {
      console.log('[AdminSocket] 🍽️ Statut restaurant:', data);
      this._emit('restaurant_status_changed', data);
    });

    this.socket.on('new_restaurant_registration', (data) => {
      console.log('[AdminSocket] 🆕 Nouvelle inscription restaurant:', data);
      this._emit('new_restaurant_registration', data);
    });

    // === ÉVÉNEMENTS FINANCIERS ===
    this.socket.on('new_payout_request', (data) => {
      console.log('[AdminSocket] 💰 Demande de paiement:', data);
      this._emit('new_payout_request', data);
    });
  }

  trackDeliveryPerson(deliveryPersonId) {
    if (this.socket?.connected) {
      this.socket.emit('track_delivery', { delivery_person_id: deliveryPersonId });
    }
  }

  untrackDeliveryPerson(deliveryPersonId) {
    if (this.socket?.connected) {
      this.socket.emit('untrack_delivery', { delivery_person_id: deliveryPersonId });
    }
  }

  trackAllDeliveryPersons() {
    if (this.socket?.connected) {
      this.socket.emit('track_all_deliveries');
      console.log('[AdminSocket] Suivi de tous les livreurs activé');
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  _emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[AdminSocket] Erreur listener ${event}:`, error);
        }
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('[AdminSocket] Déconnecté');
    }
  }

  getConnectionStatus() {
    return this.socket?.connected || false;
  }
}

const socketService = new SocketService();
export default socketService;

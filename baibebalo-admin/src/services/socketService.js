/**
 * Service WebSocket pour l'Admin BAIBEBALO
 * Gère les communications temps réel pour :
 * - Toutes les commandes
 * - Positions des livreurs
 * - Alertes système
 */
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnected = false;
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

const getWebSocketURL = () => {
  if (import.meta.env.DEV) {
    const backendPort = import.meta.env.VITE_BACKEND_PORT || '5000';
    return `http://localhost:${backendPort}`;
  }
  // ✅ Utiliser la variable d'environnement en production
  return import.meta.env.VITE_BACKEND_URL || 'https://baibebaloprojets.onrender.com';
};

    console.log('[AdminSocket] Connexion à:', getWebSocketURL());

    this.socket = io(getWebSocketURL(), {
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
      // Rejoindre la room admin dashboard
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

    // Nouvelle commande créée
    this.socket.on('new_order', (data) => {
      console.log('[AdminSocket] 🆕 Nouvelle commande:', data);
      this._emit('new_order', data);
    });

    // Commande mise à jour (statut changé)
    this.socket.on('order_updated', (data) => {
      console.log('[AdminSocket] 🔄 Commande mise à jour:', data);
      this._emit('order_updated', data);
    });

    // Changement de statut spécifique
    this.socket.on('order_status_changed', (data) => {
      console.log('[AdminSocket] 📦 Statut commande changé:', data);
      this._emit('order_status_changed', data);
    });

    // Commande annulée
    this.socket.on('order_cancelled', (data) => {
      console.log('[AdminSocket] ❌ Commande annulée:', data);
      this._emit('order_cancelled', data);
    });

    // Commande livrée
    this.socket.on('order_delivered', (data) => {
      console.log('[AdminSocket] ✅ Commande livrée:', data);
      this._emit('order_delivered', data);
    });

    // === ÉVÉNEMENTS LIVREURS ===

    // Position d'un livreur mise à jour
    this.socket.on('delivery_location', (data) => {
      // Pas de log pour éviter le spam
      this._emit('delivery_location', data);
    });

    // Livreur connecté/déconnecté
    this.socket.on('delivery_status_changed', (data) => {
      console.log('[AdminSocket] 🚴 Statut livreur changé:', data);
      this._emit('delivery_status_changed', data);
    });

    // Livreur assigné à une commande
    this.socket.on('delivery_assigned', (data) => {
      console.log('[AdminSocket] 🚴 Livreur assigné:', data);
      this._emit('delivery_assigned', data);
    });

    // === ALERTES SYSTÈME ===

    // Alerte générale
    this.socket.on('system_alert', (data) => {
      console.log('[AdminSocket] ⚠️ Alerte système:', data);
      this._emit('system_alert', data);
    });

    // Commande en attente trop longtemps
    this.socket.on('order_delayed_alert', (data) => {
      console.log('[AdminSocket] ⏰ Alerte commande en retard:', data);
      this._emit('order_delayed_alert', data);
    });

    // Problème avec un livreur
    this.socket.on('delivery_issue_alert', (data) => {
      console.log('[AdminSocket] 🚨 Problème livreur:', data);
      this._emit('delivery_issue_alert', data);
    });

    // Nouveau ticket support
    this.socket.on('new_support_ticket', (data) => {
      console.log('[AdminSocket] 🎫 Nouveau ticket support:', data);
      this._emit('new_support_ticket', data);
    });

    // === ÉVÉNEMENTS RESTAURANTS ===

    // Restaurant connecté/déconnecté
    this.socket.on('restaurant_status_changed', (data) => {
      console.log('[AdminSocket] 🍽️ Statut restaurant:', data);
      this._emit('restaurant_status_changed', data);
    });

    // Nouveau restaurant inscrit
    this.socket.on('new_restaurant_registration', (data) => {
      console.log('[AdminSocket] 🆕 Nouvelle inscription restaurant:', data);
      this._emit('new_restaurant_registration', data);
    });

    // === ÉVÉNEMENTS FINANCIERS ===

    // Nouvelle demande de paiement
    this.socket.on('new_payout_request', (data) => {
      console.log('[AdminSocket] 💰 Demande de paiement:', data);
      this._emit('new_payout_request', data);
    });
  }

  /**
   * S'abonner à la position d'un livreur spécifique
   */
  trackDeliveryPerson(deliveryPersonId) {
    if (this.socket?.connected) {
      this.socket.emit('track_delivery', { delivery_person_id: deliveryPersonId });
    }
  }

  /**
   * Arrêter le suivi d'un livreur
   */
  untrackDeliveryPerson(deliveryPersonId) {
    if (this.socket?.connected) {
      this.socket.emit('untrack_delivery', { delivery_person_id: deliveryPersonId });
    }
  }

  /**
   * S'abonner aux positions de tous les livreurs actifs
   */
  trackAllDeliveryPersons() {
    if (this.socket?.connected) {
      this.socket.emit('track_all_deliveries');
      console.log('[AdminSocket] Suivi de tous les livreurs activé');
    }
  }

  /**
   * Ajouter un listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    return () => this.off(event, callback);
  }

  /**
   * Retirer un listener
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Émettre vers les listeners internes
   */
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

  /**
   * Déconnecter
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('[AdminSocket] Déconnecté');
    }
  }

  /**
   * Vérifier si connecté
   */
  getConnectionStatus() {
    return this.socket?.connected || false;
  }
}

// Singleton
const socketService = new SocketService();
export default socketService;

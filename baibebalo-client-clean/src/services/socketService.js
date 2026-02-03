import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Vibration, Platform } from 'react-native';

// URL du serveur Socket.IO (même que l'API sans /api/v1)
const SOCKET_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.6:5000').replace('/api/v1', '');

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.currentOrderId = null;
  }

  /**
   * Connecter au serveur Socket.IO
   */
  async connect() {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('[Socket] Pas de token, connexion ignorée');
        return;
      }

      if (this.socket?.connected) {
        console.log('[Socket] Déjà connecté');
        return;
      }

      console.log('[Socket] Connexion à', SOCKET_URL);

      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 10000,
      });

      this.setupListeners();
    } catch (error) {
      console.error('[Socket] Erreur connexion:', error);
    }
  }

  /**
   * Configurer les listeners de base
   */
  setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[Socket] ✅ Connecté');
      this.isConnected = true;
      this.emit('connection_status', { connected: true });
      
      // Rejoindre la room de la commande en cours si elle existe
      if (this.currentOrderId) {
        this.joinOrderRoom(this.currentOrderId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] ❌ Déconnecté:', reason);
      this.isConnected = false;
      this.emit('connection_status', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Erreur de connexion:', error.message);
      this.emit('connection_status', { connected: false, error: error.message });
    });

    // === ÉVÉNEMENTS COMMANDE ===

    // Changement de statut de commande
    this.socket.on('order_status_changed', (data) => {
      console.log('[Socket] 📦 Statut commande changé:', data);
      this.vibrate();
      this.emit('order_status_changed', data);
    });

    // Livreur assigné
    this.socket.on('delivery_assigned', (data) => {
      console.log('[Socket] 🚴 Livreur assigné:', data);
      this.vibrate();
      this.emit('delivery_assigned', data);
    });

    // Commande récupérée par le livreur
    this.socket.on('order_picked_up', (data) => {
      console.log('[Socket] 📦 Commande récupérée:', data);
      this.vibrate();
      this.emit('order_picked_up', data);
    });

    // Position du livreur mise à jour
    this.socket.on('delivery_location_updated', (data) => {
      // Pas de log pour éviter le spam
      this.emit('delivery_location_updated', data);
    });

    // Livreur arrivé chez le client
    this.socket.on('delivery_arrived_at_customer', (data) => {
      console.log('[Socket] 📍 Livreur arrivé:', data);
      this.vibrate();
      this.emit('delivery_arrived_at_customer', data);
    });

    // Nouveau message dans le chat
    this.socket.on('new_order_message', (data) => {
      console.log('[Socket] 💬 Nouveau message:', data);
      this.vibrate();
      this.emit('new_order_message', data);
    });

    // Erreur
    this.socket.on('error', (error) => {
      console.error('[Socket] Erreur:', error);
      this.emit('error', error);
    });
  }

  /**
   * Vibrer pour les notifications
   */
  vibrate() {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(200);
    }
  }

  /**
   * Rejoindre la room d'une commande pour recevoir les mises à jour
   */
  joinOrderRoom(orderId) {
    if (!this.socket?.connected) {
      console.log('[Socket] Non connecté, impossible de rejoindre la room');
      this.currentOrderId = orderId; // Sauvegarder pour rejoindre après connexion
      return;
    }

    console.log('[Socket] Rejoindre room order_' + orderId);
    this.socket.emit('join_order', { order_id: orderId });
    this.currentOrderId = orderId;
  }

  /**
   * Quitter la room d'une commande
   */
  leaveOrderRoom(orderId) {
    if (!this.socket?.connected) return;

    console.log('[Socket] Quitter room order_' + orderId);
    this.socket.emit('leave_order', { order_id: orderId });
    
    if (this.currentOrderId === orderId) {
      this.currentOrderId = null;
    }
  }

  /**
   * Ajouter un listener pour un événement
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
   * Émettre un événement aux listeners locaux
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[Socket] Erreur dans listener ${event}:`, error);
        }
      });
    }
  }

  /**
   * Déconnecter
   */
  disconnect() {
    if (this.socket) {
      console.log('[Socket] Déconnexion...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentOrderId = null;
    }
  }

  /**
   * Vérifier si connecté
   */
  isSocketConnected() {
    return this.socket?.connected || false;
  }
}

// Singleton
const socketService = new SocketService();
export default socketService;

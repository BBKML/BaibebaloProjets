import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Vibration, Platform } from 'react-native';
import API_BASE_URL from '../constants/api';
import soundService from './soundService';

// Même base que l'API (sans /api/v1) pour que le socket utilise la même IP que les requêtes HTTP
const API_BASE = (typeof API_BASE_URL === 'string' && API_BASE_URL)
  ? API_BASE_URL.replace(/\/api\/v1\/?$/i, '')
  : 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.currentOrderId = null;
    this._notificationErrorLogged = false;
  }

  /**
   * Connecter au namespace /partners (pour les livreurs et restaurants).
   * @param {string} [providedToken] - Token JWT (prioritaire). Si absent, lecture depuis AsyncStorage 'delivery_token'.
   */
  async connect(providedToken) {
    try {
      const token = providedToken ?? (await AsyncStorage.getItem('delivery_token'));
      
      if (!token || typeof token !== 'string' || !token.trim()) {
        if (__DEV__) console.log('[Socket] Pas de token livreur, connexion ignorée');
        return;
      }

      if (this.socket?.connected) {
        console.log('[Socket] Déjà connecté');
        return;
      }

      // Nettoyer l'ancien socket avant d'en créer un nouveau
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      console.log('[Socket] Connexion à', API_BASE + '/partners');

      this.socket = io(API_BASE + '/partners', {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        timeout: 15000,
      });

      this.setupListeners();
    } catch (error) {
      console.error('[Socket] Erreur connexion:', error);
    }
  }

  /**
   * Configurer les listeners
   */
  setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[Socket] ✅ Connecté au namespace /partners');
      this.isConnected = true;
      this.emit('connection_status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] ❌ Déconnecté:', reason);
      this.isConnected = false;
      this.emit('connection_status', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      if (__DEV__) console.warn('[Socket] Connexion refusée:', error.message);
    });

    // === ÉVÉNEMENTS LIVREUR ===

    // Nouvelle livraison disponible (broadcast à tous les livreurs disponibles)
    this.socket.on('new_delivery_available', (data) => {
      console.log('[Socket] 🚴 Nouvelle livraison disponible:', data);
      soundService.alertNewDelivery();
      this.showLocalNotification(
        '🚴 Nouvelle livraison !',
        `${data.restaurant_name} - ${data.delivery_fee} FCFA`
      );
      this.emit('new_delivery_available', data);
    });

    // Course proposée (attribution auto type Glovo) — uniquement à ce livreur
    this.socket.on('order_proposed', (data) => {
      console.log('[Socket] 📦 Course proposée:', data);
      soundService.alertNewDelivery();
      this.showLocalNotification(
        '📦 Course proposée',
        `${data.restaurant_name} - ${data.delivery_fee || data.total} FCFA. Acceptez dans les ${data.expires_in_seconds ? Math.floor(data.expires_in_seconds / 60) : 2} min.`
      );
      this.emit('order_proposed', data);
    });

    // Commande prête à récupérer au restaurant (même logique que app restaurant : son + vibration, fallback vibration si 403)
    this.socket.on('order_ready', (data) => {
      console.log('[Socket] 📦 Commande prête:', data);
      soundService.alertOrderReady();
      this.showLocalNotification(
        '📦 Commande prête !',
        `${data.order_number} - ${data.restaurant_name}`
      );
      this.emit('order_ready', data);
    });

    // Changement de statut d'une commande assignée
    this.socket.on('order_status_changed', (data) => {
      console.log('[Socket] 📋 Statut commande:', data);
      this.emit('order_status_changed', data);
    });

    // Commande annulée
    this.socket.on('order_cancelled', (data) => {
      console.log('[Socket] ❌ Commande annulée:', data);
      soundService.alert();
      this.showLocalNotification(
        '❌ Commande annulée',
        `La commande ${data.order_number} a été annulée`
      );
      this.emit('order_cancelled', data);
    });

    // Nouveau message du client ou restaurant
    this.socket.on('new_message', (data) => {
      console.log('[Socket] 💬 Nouveau message');
      this.vibrate(150);
      this.emit('new_message', data);
    });

    // Instructions de livraison mises à jour
    this.socket.on('instructions_updated', (data) => {
      console.log('[Socket] 📝 Instructions mises à jour:', data);
      this.vibrate(200);
      this.showLocalNotification(
        '📝 Instructions mises à jour',
        data.message || 'Les instructions de livraison ont été modifiées'
      );
      this.emit('instructions_updated', data);
    });

    // Client a modifié l'adresse ou les instructions
    this.socket.on('delivery_address_updated', (data) => {
      console.log('[Socket] 📍 Adresse de livraison modifiée:', data);
      this.vibrate(300);
      this.showLocalNotification(
        '📍 Adresse modifiée',
        `La destination de la commande ${data.order_number} a changé`
      );
      this.emit('delivery_address_updated', data);
    });

    // Notification support
    this.socket.on('support_notification', (data) => {
      console.log('[Socket] 🎫 Notification support:', data);
      this.emit('support_notification', data);
    });

    this.socket.on('new_support_reply', (data) => {
      console.log('[Socket] 💬 Réponse support:', data);
      this.vibrate(150);
      this.emit('new_support_reply', data);
    });

    // Erreur
    this.socket.on('error', (error) => {
      console.error('[Socket] Erreur:', error);
    });
  }

  /**
   * Vibrer
   */
  vibrate(duration = 200) {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(duration);
    }
  }

  /**
   * Afficher une notification locale (expo-notifications chargé à la demande pour éviter crash APK).
   * En cas d'échec (ex. Expo Go), on ne log qu'une fois pour éviter le spam.
   */
  async showLocalNotification(title, body) {
    try {
      const Notifications = require('expo-notifications');
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
        },
        trigger: null, // Immédiat
      });
    } catch (error) {
      if (!this._notificationErrorLogged) {
        this._notificationErrorLogged = true;
        if (__DEV__) console.warn('[Socket] Notification locale non disponible (Expo Go?), sons/vibration utilisés.');
      }
    }
  }

  /**
   * Rejoindre la room d'une commande spécifique
   */
  joinOrderRoom(orderId) {
    if (!this.socket?.connected) {
      this.currentOrderId = orderId;
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
   * Mettre à jour le statut de disponibilité
   */
  updateAvailability(isAvailable) {
    if (!this.socket?.connected) return;
    
    this.socket.emit('update_availability', { available: isAvailable });
    console.log('[Socket] Disponibilité mise à jour:', isAvailable);
  }

  /**
   * Envoyer la position GPS
   */
  sendLocation(latitude, longitude, orderId = null) {
    if (!this.socket?.connected) return;
    
    this.socket.emit('location_update', {
      latitude,
      longitude,
      order_id: orderId,
      timestamp: new Date().toISOString(),
    });
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
   * Émettre aux listeners locaux
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          if (__DEV__) console.warn(`[Socket] Listener ${event}:`, error?.message);
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

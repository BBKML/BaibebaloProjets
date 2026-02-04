/**
 * Service Socket.IO pour les notifications en temps réel
 * Gère les commandes, le support et les alertes
 */
import { io } from 'socket.io-client';
import API_BASE_URL from '../constants/api';
import useAuthStore from '../store/authStore';
import soundService from './soundService';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.pendingOrdersAlertInterval = null;
    this.pendingOrders = new Map(); // Stocke les commandes en attente avec leur timestamp
  }

  // Connecter au serveur Socket.IO
  connect() {
    try {
      if (this.socket?.connected) {
        console.log('🔌 Socket déjà connecté');
        return;
      }

      const token = useAuthStore.getState().token;
      if (!token) {
        console.log('🔌 Pas de token, connexion Socket annulée');
        return;
      }

      // URL du serveur (enlever /api/v1)
      const serverUrl = API_BASE_URL ? API_BASE_URL.replace('/api/v1', '') : 'https://baibebaloprojets.onrender.com';
      
      console.log('🔌 Connexion Socket.IO à:', serverUrl + '/partners');

      this.socket = io(serverUrl + '/partners', {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
        timeout: 10000,
      });

    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connecté:', this.socket.id);
      this._emit('connection_status', { connected: true });
      // Démarrer la vérification des alertes
      this._startPendingOrdersCheck();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO déconnecté:', reason);
      this._emit('connection_status', { connected: false });
    });

    this.socket.on('connect_error', (error) => {
      console.log('❌ Erreur connexion Socket.IO:', error.message);
      this._emit('connection_status', { connected: false, error: error.message });
    });

    // 🆕 Écouter les nouvelles commandes
    this.socket.on('new_order', async (data) => {
      try {
        console.log('🍽️ Nouvelle commande reçue:', data);
        // Jouer le son de nouvelle commande (avec gestion d'erreur)
        try {
          await soundService.alertNewOrder();
        } catch (soundError) {
          console.warn('⚠️ Erreur son:', soundError.message);
        }
        // Ajouter aux commandes en attente
        this.pendingOrders.set(data.orderId || data.order_id, {
          receivedAt: Date.now(),
          data: data,
        });
        this._emit('new_order', data);
      } catch (err) {
        console.warn('⚠️ Erreur traitement new_order:', err);
      }
    });

    // 🆕 Écouter les mises à jour de commandes
    this.socket.on('order_update', (data) => {
      console.log('📝 Mise à jour commande:', data);
      // Si la commande est acceptée, la retirer des alertes
      if (data.status === 'accepted' || data.status === 'refused' || data.status === 'cancelled') {
        this.pendingOrders.delete(data.orderId || data.order_id);
        soundService.stopSound('urgentOrder');
      }
      this._emit('order_update', data);
    });

    // 🆕 Écouter les annulations
    this.socket.on('order_cancelled', async (data) => {
      console.log('❌ Commande annulée:', data);
      this.pendingOrders.delete(data.orderId || data.order_id);
      await soundService.alert();
      this._emit('order_cancelled', data);
    });

    // 🚚 Écouter l'arrivée du livreur au restaurant
    this.socket.on('delivery_arrived', async (data) => {
      console.log('🚚 Livreur arrivé au restaurant:', data);
      try {
        await soundService.alert();
      } catch (soundError) {
        console.warn('⚠️ Erreur son:', soundError.message);
      }
      this._emit('delivery_arrived', data);
    });

    // 📦 Écouter la récupération de commande par le livreur
    this.socket.on('order_picked_up', (data) => {
      console.log('📦 Commande récupérée par le livreur:', data);
      this._emit('order_picked_up', data);
    });

    // 🚚 Assignation d'un livreur à une commande
    this.socket.on('delivery_assigned', (data) => {
      console.log('🚚 Livreur assigné:', data);
      this._emit('delivery_assigned', data);
    });

    // Écouter les notifications de support
    this.socket.on('support_notification', (data) => {
      console.log('📩 Notification support reçue:', data);
      this._emit('support_notification', data);
    });

    // Écouter les nouvelles réponses sur un ticket
    this.socket.on('new_support_reply', (data) => {
      console.log('📩 Nouvelle réponse support:', data);
      this._emit('new_support_reply', data);
    });
    
    } catch (connectError) {
      console.warn('⚠️ Erreur initialisation Socket.IO:', connectError.message);
      this._emit('connection_status', { connected: false, error: connectError.message });
    }
  }

  // Vérifier les commandes en attente trop longtemps
  _startPendingOrdersCheck() {
    // Arrêter l'ancien intervalle si existant
    if (this.pendingOrdersAlertInterval) {
      clearInterval(this.pendingOrdersAlertInterval);
    }

    // Vérifier toutes les 30 secondes
    this.pendingOrdersAlertInterval = setInterval(async () => {
      const now = Date.now();
      const ALERT_THRESHOLD = 3 * 60 * 1000; // 3 minutes

      for (const [orderId, orderInfo] of this.pendingOrders) {
        const waitingTime = now - orderInfo.receivedAt;
        
        if (waitingTime > ALERT_THRESHOLD) {
          console.log(`⚠️ Commande ${orderId} en attente depuis ${Math.round(waitingTime / 60000)} minutes!`);
          // Émettre une alerte urgente
          await soundService.alertUrgent();
          this._emit('order_urgent_alert', {
            orderId,
            waitingMinutes: Math.round(waitingTime / 60000),
            order: orderInfo.data,
          });
        }
      }
    }, 30000);
  }

  // Arrêter la vérification des alertes
  _stopPendingOrdersCheck() {
    if (this.pendingOrdersAlertInterval) {
      clearInterval(this.pendingOrdersAlertInterval);
      this.pendingOrdersAlertInterval = null;
    }
  }

  // Marquer une commande comme traitée (enlève des alertes)
  markOrderHandled(orderId) {
    this.pendingOrders.delete(orderId);
    soundService.stopSound('urgentOrder');
  }

  // Déconnecter
  disconnect() {
    this._stopPendingOrdersCheck();
    soundService.stopAllSounds();
    this.pendingOrders.clear();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 Socket.IO déconnecté manuellement');
    }
  }

  // Rejoindre un ticket de support
  joinSupportTicket(ticketId) {
    if (this.socket?.connected) {
      this.socket.emit('join_support_ticket', ticketId);
      console.log('🎫 Rejoint ticket support:', ticketId);
    }
  }

  // Quitter un ticket de support
  leaveSupportTicket(ticketId) {
    if (this.socket?.connected) {
      this.socket.emit('leave_support_ticket', ticketId);
      console.log('🎫 Quitté ticket support:', ticketId);
    }
  }

  // Ajouter un listener
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  // Émettre vers les listeners internes
  _emit(event, data) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Erreur listener:', error);
      }
    });
  }

  // Vérifier si connecté
  isConnected() {
    return this.socket?.connected || false;
  }

  // Obtenir le nombre de commandes en attente
  getPendingOrdersCount() {
    return this.pendingOrders.size;
  }

  // Obtenir les commandes en attente
  getPendingOrders() {
    return Array.from(this.pendingOrders.entries()).map(([id, info]) => ({
      id,
      ...info.data,
      waitingTime: Date.now() - info.receivedAt,
    }));
  }

  // Ajouter une commande en attente manuellement (depuis le chargement initial)
  addPendingOrder(order) {
    const orderId = order.id || order.order_id;
    const createdAt = new Date(order.created_at || order.createdAt || order.placed_at).getTime();
    
    if (!this.pendingOrders.has(orderId)) {
      this.pendingOrders.set(orderId, {
        receivedAt: createdAt,
        data: order,
      });
    }
  }
}

// Instance singleton
const socketService = new SocketService();
export default socketService;

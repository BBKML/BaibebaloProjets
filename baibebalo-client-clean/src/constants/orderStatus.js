// Statuts considérés comme "en cours" (non terminés)
export const ACTIVE_STATUSES = [
  'pending', 'new', 'accepted', 'preparing', 'ready',
  'picked_up', 'delivering', 'driver_at_customer',
];

// Statuts des commandes (alignés avec le backend)
export const ORDER_STATUS = {
  PENDING: 'pending',           // Paiement en attente (avant création)
  NEW: 'new',                   // Commande créée, restaurant pas encore notifié
  ACCEPTED: 'accepted',         // Restaurant a accepté
  PREPARING: 'preparing',       // Restaurant prépare
  READY: 'ready',               // Prête, en attente du livreur
  PICKED_UP: 'picked_up',       // Livreur a récupéré
  DELIVERING: 'delivering',     // Livreur en route vers client
  DRIVER_AT_CUSTOMER: 'driver_at_customer', // Livreur à la porte
  DELIVERED: 'delivered',       // Livrée avec succès
  CANCELLED: 'cancelled',       // Annulée
};

// Labels des statuts en français
export const STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: 'En attente',
  [ORDER_STATUS.NEW]: 'Nouvelle commande',
  [ORDER_STATUS.ACCEPTED]: 'Acceptée',
  [ORDER_STATUS.PREPARING]: 'En préparation',
  [ORDER_STATUS.READY]: 'Prête',
  [ORDER_STATUS.PICKED_UP]: 'Récupérée',
  [ORDER_STATUS.DELIVERING]: 'Livraison en cours',
  [ORDER_STATUS.DRIVER_AT_CUSTOMER]: 'Livreur à la porte',
  [ORDER_STATUS.DELIVERED]: 'Livrée',
  [ORDER_STATUS.CANCELLED]: 'Annulée',
};

// Couleurs des statuts
export const STATUS_COLORS = {
  [ORDER_STATUS.PENDING]: '#f59e0b',
  [ORDER_STATUS.NEW]: '#f59e0b',
  [ORDER_STATUS.ACCEPTED]: '#10b981',
  [ORDER_STATUS.PREPARING]: '#f59e0b',
  [ORDER_STATUS.READY]: '#3b82f6',
  [ORDER_STATUS.PICKED_UP]: '#3b82f6',
  [ORDER_STATUS.DELIVERING]: '#0ea5e9',
  [ORDER_STATUS.DRIVER_AT_CUSTOMER]: '#10b981',
  [ORDER_STATUS.DELIVERED]: '#10b981',
  [ORDER_STATUS.CANCELLED]: '#ef4444',
};

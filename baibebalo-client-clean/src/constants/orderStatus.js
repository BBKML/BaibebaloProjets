// Statuts des commandes
export const ORDER_STATUS = {
  PENDING: 'pending',
  NEW: 'new',
  ACCEPTED: 'accepted',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  PICKED_UP: 'picked_up',
  DELIVERING: 'delivering',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

// Labels des statuts en français
export const STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: 'En attente',
  [ORDER_STATUS.NEW]: 'Nouvelle commande',
  [ORDER_STATUS.ACCEPTED]: 'Acceptée',
  [ORDER_STATUS.CONFIRMED]: 'Confirmée',
  [ORDER_STATUS.PREPARING]: 'En préparation',
  [ORDER_STATUS.READY]: 'Prête',
  [ORDER_STATUS.PICKED_UP]: 'Récupérée',
  [ORDER_STATUS.DELIVERING]: 'En livraison',
  [ORDER_STATUS.DELIVERED]: 'Livrée',
  [ORDER_STATUS.CANCELLED]: 'Annulée',
};

// Couleurs des statuts
export const STATUS_COLORS = {
  [ORDER_STATUS.PENDING]: '#f59e0b',
  [ORDER_STATUS.NEW]: '#f59e0b',
  [ORDER_STATUS.ACCEPTED]: '#10b981',
  [ORDER_STATUS.CONFIRMED]: '#3b82f6',
  [ORDER_STATUS.PREPARING]: '#f59e0b',
  [ORDER_STATUS.READY]: '#3b82f6',
  [ORDER_STATUS.PICKED_UP]: '#3b82f6',
  [ORDER_STATUS.DELIVERING]: '#0ea5e9',
  [ORDER_STATUS.DELIVERED]: '#10b981',
  [ORDER_STATUS.CANCELLED]: '#ef4444',
};

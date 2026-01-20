// Statuts des commandes
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  PICKED_UP: 'picked_up',
  DELIVERING: 'delivering',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

// Couleurs des statuts
export const STATUS_COLORS = {
  [ORDER_STATUS.PENDING]: 'warning', // #f59e0b
  [ORDER_STATUS.CONFIRMED]: 'info', // #3b82f6
  [ORDER_STATUS.PREPARING]: 'warning', // #f59e0b
  [ORDER_STATUS.READY]: 'info', // #3b82f6
  [ORDER_STATUS.PICKED_UP]: 'info', // #3b82f6
  [ORDER_STATUS.DELIVERING]: 'primary', // #0ea5e9
  [ORDER_STATUS.DELIVERED]: 'success', // #10b981
  [ORDER_STATUS.CANCELLED]: 'danger', // #ef4444
};

// Labels des statuts
export const STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: 'En attente',
  [ORDER_STATUS.CONFIRMED]: 'Confirmée',
  [ORDER_STATUS.PREPARING]: 'En préparation',
  [ORDER_STATUS.READY]: 'Prête',
  [ORDER_STATUS.PICKED_UP]: 'Récupérée',
  [ORDER_STATUS.DELIVERING]: 'En livraison',
  [ORDER_STATUS.DELIVERED]: 'Livrée',
  [ORDER_STATUS.CANCELLED]: 'Annulée',
};

// Statuts des utilisateurs
export const USER_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  INACTIVE: 'inactive',
};

// Statuts des restaurants
export const RESTAURANT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
};

// Statuts des livreurs
export const DELIVERY_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
  OFFLINE: 'offline',
  ONLINE: 'online',
};

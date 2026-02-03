// Couleurs du design system BAIBEBALO (basées sur les designs HTML stitch_restaurant_login)
export const COLORS = {
  // Couleurs principales (correspondent aux designs HTML)
  primary: '#ff6933', // Primary orange des designs
  primaryDark: '#E55A2B',
  accent: '#ff6b6b',
  
  // Couleurs de fond (correspondent aux designs HTML)
  background: '#f8f6f5', // background-light des designs
  backgroundDark: '#23140f', // background-dark des designs
  white: '#ffffff',
  black: '#1d110c', // Texte principal des designs
  
  // Couleurs de texte (correspondent aux designs HTML)
  text: '#1d110c', // Texte principal
  textSecondary: '#a15d45', // Texte secondaire des designs
  textLight: '#9ca3af',
  
  // Couleurs de statut
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Couleurs de bordure (correspondent aux designs HTML)
  border: '#ead5cd', // Border color des designs
  borderDark: '#3d2a24', // Border dark des designs
  
  // Couleurs de statut commande
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  preparing: '#f59e0b',
  ready: '#3b82f6',
  delivering: '#0ea5e9',
  delivered: '#10b981',
  cancelled: '#ef4444',
  
  // Couleurs spécifiques restaurant
  urgent: '#ef4444',
  newOrder: '#f59e0b',
  
  // Couleurs supplémentaires des designs
  cardBackground: '#ffffff',
  cardBackgroundDark: '#2d1e19', // Card dark background
  cardBorder: '#ead5cd',
  cardBorderDark: '#3d2a24',
};

// Mode sombre
export const DARK_COLORS = {
  ...COLORS,
  background: COLORS.backgroundDark,
  text: COLORS.white,
  textSecondary: '#9ca3af',
  border: COLORS.borderDark,
};

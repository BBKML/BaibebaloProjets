// Couleurs du design system BAIBEBALO
export const COLORS = {
  // Couleurs principales
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  accent: '#ff6b6b',
  
  // Couleurs de fond
  background: '#f7f7f7',
  backgroundDark: '#1a1c20',
  white: '#ffffff',
  black: '#121715',
  
  // Couleurs de texte
  text: '#121715',
  textSecondary: '#6b7280',
  textLight: '#9ca3af',
  
  // Couleurs de statut
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Couleurs de bordure
  border: '#e5e7eb',
  borderDark: '#374151',
  
  // Couleurs de statut commande
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  preparing: '#f59e0b',
  ready: '#3b82f6',
  delivering: '#0ea5e9',
  delivered: '#10b981',
  cancelled: '#ef4444',
};

// Mode sombre
export const DARK_COLORS = {
  ...COLORS,
  background: COLORS.backgroundDark,
  text: COLORS.white,
  textSecondary: '#9ca3af',
  border: COLORS.borderDark,
};

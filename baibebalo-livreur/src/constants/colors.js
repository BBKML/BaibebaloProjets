// Couleurs du design system BAIBEBALO Livreur
// Basé sur les designs Stitch

export const COLORS = {
  // Couleurs principales (Vert BAIBEBALO - du design Stitch)
  primary: '#1DC962', // Vert principal Stitch
  primaryDark: '#18A850',
  primaryLight: '#4ADE80',
  accent: '#1DC962', // Même vert
  
  // Couleurs de fond
  background: '#F8FAFC',
  backgroundDark: '#0F172A',
  backgroundSecondary: '#F1F5F9',
  white: '#FFFFFF',
  black: '#0F172A',
  
  // Couleurs de texte
  text: '#1E293B',
  textSecondary: '#64748B',
  textLight: '#94A3B8',
  textWhite: '#FFFFFF',
  
  // Couleurs de statut
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Couleurs de bordure
  border: '#E2E8F0',
  borderDark: '#334155',
  borderLight: '#F1F5F9',
  
  // Couleurs de statut livreur
  available: '#22C55E',    // Disponible - Vert
  offline: '#94A3B8',      // Hors ligne - Gris
  pause: '#F59E0B',        // En pause - Orange
  onDelivery: '#3B82F6',   // En course - Bleu
  
  // Couleurs de statut commande
  pending: '#F59E0B',
  accepted: '#3B82F6',
  pickingUp: '#8B5CF6',
  delivering: '#0EA5E9',
  delivered: '#22C55E',
  cancelled: '#EF4444',
  problem: '#DC2626',
  
  // Couleurs de véhicule
  moto: '#F59E0B',
  velo: '#22C55E',
  pieton: '#3B82F6',
  
  // Couleurs spéciales
  urgent: '#DC2626',
  bonus: '#F59E0B',
  penalty: '#EF4444',
  rating: '#FBBF24',
  
  // Cartes
  cardBackground: '#FFFFFF',
  cardBackgroundDark: '#1E293B',
  cardBorder: '#E2E8F0',
  cardShadow: 'rgba(0, 0, 0, 0.05)',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  
  // Gradient (pour les en-têtes)
  gradientStart: '#22C55E',
  gradientEnd: '#16A34A',
};

// Mode sombre
export const DARK_COLORS = {
  ...COLORS,
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  border: '#334155',
  cardBackground: '#1E293B',
  cardBorder: '#334155',
};

// Tailles de texte
export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  title: 28,
  huge: 32,
};

// Espacements
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Border radius
export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};

export default COLORS;

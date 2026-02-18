/**
 * Hook pour les paddings des zones sécurisées
 * Utiliser pour contentContainerStyle des ScrollView/FlatList
 */
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Hauteur approximative de la tab bar (sans safe area) */
export const TAB_BAR_HEIGHT = 60;

/**
 * Retourne les paddings à appliquer selon le contexte
 * @param {Object} options
 * @param {boolean} [options.withTabBar] - Écran avec tab bar en bas
 * @param {boolean} [options.withTop] - Inclure padding top (status bar)
 * @param {boolean} [options.withBottom] - Inclure padding bottom
 * @param {number} [options.extraBottom] - Espace supplémentaire en bas
 */
export function useSafeAreaPadding(options = {}) {
  const insets = useSafeAreaInsets();
  const {
    withTabBar = false,
    withTop = true,
    withBottom = true,
    extraBottom = 0,
  } = options;

  const paddingTop = withTop ? Math.max(insets.top, 8) : 0;
  const tabBarExtra = withTabBar ? TAB_BAR_HEIGHT : 0;
  const paddingBottom = withBottom
    ? Math.max(insets.bottom, 16) + extraBottom + tabBarExtra
    : 0;
  const paddingHorizontal = Math.max(insets.left, insets.right, 16);

  return {
    paddingTop,
    paddingBottom,
    paddingHorizontal,
    insets,
    tabBarTotalHeight: TAB_BAR_HEIGHT + insets.bottom,
  };
}

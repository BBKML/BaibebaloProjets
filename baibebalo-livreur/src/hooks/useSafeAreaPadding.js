/**
 * Hook pour les paddings des zones sécurisées (Android + iOS)
 */
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * @param {Object} options
 * @param {boolean} [options.withBottom] - Inclure padding bottom
 * @param {number} [options.extraBottom] - Espace supplémentaire en bas
 */
export function useSafeAreaPadding(options = {}) {
  const insets = useSafeAreaInsets();
  const { withBottom = true, extraBottom = 0 } = options;

  const paddingTop = Math.max(insets.top, 8);
  const paddingBottom = withBottom ? Math.max(insets.bottom, 16) + extraBottom : 0;
  const paddingHorizontal = Math.max(insets.left, insets.right, 16);

  return {
    paddingTop,
    paddingBottom,
    paddingHorizontal,
    insets,
  };
}

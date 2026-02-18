/**
 * Conteneur d'écran avec zones sécurisées (Safe Areas)
 * Respecte les encoches, barres de statut et zones de gestes sur Android et iOS
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string[]} [props.edges=['top','bottom','left','right']] - Bords à appliquer
 * @param {Object} [props.style]
 * @param {boolean} [props.paddingHorizontal=true] - Ajouter padding horizontal (16)
 * @param {number} [props.tabBarOffset=0] - Espace supplémentaire en bas (ex: hauteur tab bar)
 */
export default function ScreenContainer({
  children,
  edges = ['top', 'bottom', 'left', 'right'],
  style,
  paddingHorizontal = true,
  tabBarOffset = 0,
}) {
  const insets = useSafeAreaInsets();

  const padding = {
    paddingTop: edges.includes('top') ? Math.max(insets.top, 8) : 0,
    paddingBottom: edges.includes('bottom') ? Math.max(insets.bottom, 16) + tabBarOffset : tabBarOffset,
    paddingLeft: edges.includes('left') ? (paddingHorizontal ? Math.max(insets.left, 16) : insets.left) : 0,
    paddingRight: edges.includes('right') ? (paddingHorizontal ? Math.max(insets.right, 16) : insets.right) : 0,
  };

  return (
    <View style={[styles.container, padding, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

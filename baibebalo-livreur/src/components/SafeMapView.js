import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

/**
 * Wrapper autour du contenu carte : en cas d'erreur (APK / appareil), affiche un placeholder
 * au lieu de faire planter l'app.
 */
class SafeMapViewInner extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err) {
    console.warn('[SafeMapView] Carte indisponible:', err?.message || err);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={[styles.placeholder, this.props.style]}>
          <Ionicons name="map-outline" size={48} color={COLORS.textLight} />
          <Text style={styles.placeholderText}>Carte non disponible</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background || '#f0f0f0',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});

export default function SafeMapView({ children, style }) {
  return (
    <SafeMapViewInner style={style}>
      {children}
    </SafeMapViewInner>
  );
}

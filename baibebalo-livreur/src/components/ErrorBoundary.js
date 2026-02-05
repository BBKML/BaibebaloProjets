import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const safeColors = COLORS || {};
const primaryColor = safeColors.primary || '#22C55E';
const bgColor = safeColors.background || '#f5f5f5';
const textColor = safeColors.text || '#333';
const textSecondary = safeColors.textSecondary || '#666';

/**
 * Capture les erreurs non gérées pour éviter que l'app ne se ferme (APK / production).
 * Affiche un écran de secours au lieu d'un crash.
 */
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo?.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
          <View style={styles.iconWrap}>
            <Ionicons name="warning-outline" size={64} color={primaryColor} />
          </View>
          <Text style={[styles.title, { color: textColor }]}>Une erreur est survenue</Text>
          <Text style={[styles.message, { color: textSecondary }]}>
            L'application a rencontré un problème. Vous pouvez réessayer.
          </Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: primaryColor }]} onPress={this.handleRetry} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconWrap: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function NetworkErrorScreen({ onRetry }) {
  const navigation = useNavigation();
  
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <Text style={styles.statusTime}>9:41</Text>
        <View style={styles.statusIcons}>
          <Ionicons name="cellular" size={14} color={COLORS.text} />
          <Ionicons name="wifi-outline" size={14} color={COLORS.text} />
          <Ionicons name="battery-full" size={14} color={COLORS.text} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.illustration}>
          <View style={styles.illustrationGlow} />
          <View style={styles.illustrationCircle}>
            <Ionicons name="wifi" size={72} color={COLORS.primary} />
            <View style={styles.alertDot} />
          </View>
        </View>
        <Text style={styles.title}>Problème de connexion</Text>
        <Text style={styles.subtitle}>
          Nous n'arrivons pas à joindre BAIBEBALO. Vérifiez votre connexion Internet et réessayez.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Ionicons name="refresh" size={18} color={COLORS.white} />
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
        >
          <Text style={styles.secondaryButtonText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.homeIndicator} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 8,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  statusTime: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  illustration: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  illustrationGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.primary + '10',
  },
  illustrationCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertDot: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.error,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 12,
    marginTop: 8,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  homeIndicator: {
    alignSelf: 'center',
    width: 120,
    height: 6,
    borderRadius: 999,
    backgroundColor: COLORS.border,
    marginBottom: 16,
  },
});
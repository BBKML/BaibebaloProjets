import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function ServerErrorScreen({ navigation, onRetry }) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.brand}>Baibebalo</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="help-circle-outline" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.illustration}>
          <View style={styles.illustrationCircle}>
            <Ionicons name="restaurant" size={88} color={COLORS.primary + '66'} />
            <View style={styles.illustrationCenter}>
              <Ionicons name="warning" size={40} color={COLORS.primary} />
            </View>
          </View>
        </View>

        <Text style={styles.title}>Oups !</Text>
        <Text style={styles.subtitle}>Quelque chose s'est mal passé.</Text>
        <Text style={styles.description}>
          Notre équipe technique est déjà sur le coup. Ne vous inquiétez pas, on s'en occupe !
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Retour à l'accueil</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => navigation.navigate('ContactSupport')}
        >
          <Text style={styles.contactButtonText}>Contacter le support</Text>
        </TouchableOpacity>
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: COLORS.textSecondary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  illustration: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  illustrationCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.primary + '08',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationCenter: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.text,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    padding: 20,
    gap: 10,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  contactButton: {
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  contactButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  homeIndicator: {
    alignSelf: 'center',
    width: 120,
    height: 6,
    borderRadius: 999,
    backgroundColor: COLORS.border,
    marginTop: 8,
  },
});

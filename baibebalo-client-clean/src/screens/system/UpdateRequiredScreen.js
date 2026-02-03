import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function UpdateRequiredScreen({ navigation }) {
  const handleUpdate = () => {
    // Ouvrir le store approprié
    const storeUrl = Platform.OS === 'ios'
      ? 'https://apps.apple.com/app/baibebalo'
      : 'https://play.google.com/store/apps/details?id=com.baibebalo.app';
    
    Linking.openURL(storeUrl).catch((err) =>
      console.error('Erreur lors de l\'ouverture du store:', err)
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.topLabel}>Baibebalo Update</Text>

        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroCard}>
            <View style={styles.heroCircle}>
              <Ionicons name="rocket" size={56} color={COLORS.primary} />
            </View>
            <View style={styles.heroStars}>
              <View style={styles.starPrimary} />
              <View style={styles.starAccent} />
              <View style={styles.starMuted} />
            </View>
          </View>
          <View style={styles.floatingCardLeft}>
            <Ionicons name="star" size={18} color="#F7C948" />
          </View>
          <View style={styles.floatingCardRight}>
            <Ionicons name="gift" size={18} color={COLORS.primary} />
          </View>
        </View>

        <Text style={styles.title}>Une nouvelle version est disponible !</Text>
        <Text style={styles.message}>
          Veuillez mettre à jour l'application pour profiter des dernières fonctionnalités et de meilleures performances.
        </Text>

        <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
          <Text style={styles.updateButtonText}>Mettre à jour</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.laterButton} onPress={() => navigation.goBack()}>
          <Text style={styles.laterButtonText}>Plus tard</Text>
        </TouchableOpacity>

        <View style={styles.footerDots}>
          <View style={styles.footerMainDot} />
          <View style={styles.footerDot} />
          <View style={styles.footerDot} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: 360,
  },
  topLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: COLORS.textLight,
    marginBottom: 20,
  },
  hero: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heroGlow: {
    position: 'absolute',
    width: '90%',
    height: '90%',
    borderRadius: 999,
    backgroundColor: COLORS.primary + '15',
  },
  heroCard: {
    width: 220,
    height: 220,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  heroCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroStars: {
    flexDirection: 'row',
    gap: 8,
  },
  starPrimary: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F7C948',
  },
  starAccent: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  starMuted: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary + '55',
  },
  floatingCardLeft: {
    position: 'absolute',
    top: 12,
    left: 10,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  floatingCardRight: {
    position: 'absolute',
    bottom: 18,
    right: 12,
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  updateButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  updateButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  laterButton: {
    paddingVertical: 12,
  },
  laterButtonText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  footerDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 18,
  },
  footerMainDot: {
    width: 28,
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.textLight,
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textLight,
  },
});

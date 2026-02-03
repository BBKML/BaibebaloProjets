import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function SupportFeedbackSuccessScreen({ navigation }) {
  const handleViewClaims = () => {
    navigation.reset({
      index: 0,
      routes: [
        { name: 'MainTabs', params: { screen: 'Profile' } },
        { name: 'MyClaimsTracking' },
      ],
    });
  };

  const handleContinue = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={handleContinue}>
          <Ionicons name="close" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Confirmation</Text>
        <View style={styles.iconButtonPlaceholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.illustration}>
          <View style={styles.illustrationGlow} />
          <View style={styles.illustrationCircle}>
            <Ionicons name="happy" size={72} color={COLORS.primary} />
            <View style={styles.illustrationBadge}>
              <Ionicons name="sparkles" size={14} color={COLORS.white} />
            </View>
          </View>
          <Ionicons name="thumbs-up" size={28} color={COLORS.primary + '55'} style={styles.floatRight} />
          <Ionicons name="heart" size={26} color="#F7E07C" style={styles.floatLeft} />
        </View>

        <Text style={styles.title}>Merci pour votre retour !</Text>
        <View style={styles.ticketBadge}>
          <Text style={styles.ticketBadgeText}>Votre ticket est le #12345</Text>
        </View>
        <Text style={styles.message}>
          Notre équipe traite votre demande. Nous vous contacterons bientôt si nécessaire.
        </Text>

        <View style={styles.progressDots}>
          <View style={styles.progressMain} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
          <Ionicons name="home" size={18} color={COLORS.white} />
          <Text style={styles.primaryButtonText}>Retour à l'accueil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleViewClaims}>
          <Text style={styles.secondaryButtonText}>Voir mes réclamations</Text>
        </TouchableOpacity>
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
  iconButtonPlaceholder: {
    width: 40,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
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
  illustrationGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.primary + '22',
  },
  illustrationCircle: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: COLORS.white,
    borderWidth: 4,
    borderColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationBadge: {
    position: 'absolute',
    top: 16,
    right: 26,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F7E07C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatRight: {
    position: 'absolute',
    top: 20,
    right: 6,
  },
  floatLeft: {
    position: 'absolute',
    bottom: 20,
    left: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  ticketBadge: {
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  ticketBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  progressMain: {
    width: 28,
    height: 6,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary + '40',
  },
  footer: {
    padding: 20,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
});

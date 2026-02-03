import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function AppMaintenanceScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Ionicons name="restaurant" size={24} color={COLORS.primary} />
        <Text style={styles.brand}>BAIBEBALO</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroRingLarge} />
          <View style={styles.heroRingSmall} />
          <View style={styles.heroIconCircle}>
            <Ionicons name="construct" size={64} color={COLORS.primary} />
            <View style={styles.heroBadgeTop}>
              <Ionicons name="time" size={16} color={COLORS.primary} />
            </View>
            <View style={styles.heroBadgeBottom}>
              <Ionicons name="settings" size={14} color={COLORS.primary} />
            </View>
          </View>
        </View>

        <Text style={styles.title}>Maintenance en cours</Text>
        <Text style={styles.message}>
          Nous améliorons l'application pour vous offrir une meilleure expérience.
        </Text>
        <View style={styles.timeBadge}>
          <Ionicons name="reload" size={16} color={COLORS.primary} />
          <Text style={styles.timeBadgeText}>Retour prévu à 14h00</Text>
        </View>

        <TouchableOpacity style={styles.refreshButton}>
          <Ionicons name="refresh" size={18} color={COLORS.white} />
          <Text style={styles.refreshButtonText}>Actualiser la page</Text>
        </TouchableOpacity>
        <Text style={styles.footerText}>
          Besoin d'aide ? <Text style={styles.footerLink}>Contactez le support</Text>
        </Text>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
    gap: 10,
  },
  brand: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  heroCard: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  heroRingLarge: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: COLORS.primary + '25',
    top: -30,
    left: -20,
  },
  heroRingSmall: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: COLORS.primary + '25',
    bottom: -30,
    right: -20,
  },
  heroIconCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeTop: {
    position: 'absolute',
    top: 8,
    right: 18,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroBadgeBottom: {
    position: 'absolute',
    bottom: 8,
    left: 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.primary + '10',
    marginBottom: 24,
  },
  timeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    width: '100%',
    marginBottom: 12,
  },
  refreshButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  footerLink: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});

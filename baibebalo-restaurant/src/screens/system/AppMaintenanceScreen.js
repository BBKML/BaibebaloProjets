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
        <Text style={styles.brand}>BAIBEBALO RESTAURANT</Text>
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

        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={async () => {
            // Recharger l'app pour vérifier à nouveau le mode maintenance
            try {
              const { checkMaintenanceMode, invalidateSettingsCache } = require('../../services/settingsService');
              invalidateSettingsCache();
              const stillInMaintenance = await checkMaintenanceMode();
              if (!stillInMaintenance && navigation) {
                // Redémarrer l'app si le mode maintenance est désactivé
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'RestaurantLogin' }],
                });
              }
            } catch (error) {
              console.error('Erreur lors de la vérification:', error);
            }
          }}
        >
          <Ionicons name="refresh" size={18} color={COLORS.white} />
          <Text style={styles.refreshButtonText}>Actualiser</Text>
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
    backgroundColor: COLORS.white,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    gap: 8,
  },
  brand: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  heroCard: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  heroRingLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: COLORS.primary + '20',
  },
  heroRingSmall: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  heroIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroBadgeTop: {
    position: 'absolute',
    top: -8,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  heroBadgeBottom: {
    position: 'absolute',
    bottom: -8,
    left: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    marginBottom: 24,
    lineHeight: 24,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
    marginBottom: 32,
  },
  timeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  footerText: {
    marginTop: 24,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

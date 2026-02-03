import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function TrackingPreparingScreen({ navigation, route }) {
  const {
    orderNumber = 'BB-2024-001',
    restaurantName = 'Le Maquis de Zone 4',
    restaurantCategory = 'Cuisine Ivoirienne',
    restaurantPhone = null,
    eta = '10-15 min',
  } = route.params || {};

  const handleCallRestaurant = () => {
    if (restaurantPhone) {
      Linking.openURL(`tel:${restaurantPhone}`);
    } else {
      Alert.alert(
        'Contact',
        'Le numéro du restaurant n\'est pas disponible pour le moment.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Commande #{orderNumber}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Suivi en direct</Text>
          <Text style={styles.heroTitle}>Préparation en cours...</Text>
          <Text style={styles.heroSubtitle}>
            Le restaurant prépare vos délicieux plats avec soin.
          </Text>
        </View>

        <View style={styles.timeline}>
          <View style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={styles.timelineDot}>
                <Ionicons name="checkmark" size={16} color={COLORS.white} />
              </View>
              <View style={styles.timelineLineActive} />
            </View>
            <View style={styles.timelineBody}>
              <Text style={styles.timelineTitle}>Commande confirmée</Text>
              <Text style={styles.timelineSubtitle}>Reçue par le système</Text>
            </View>
          </View>

          <View style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={styles.timelineDot}>
                <Ionicons name="checkmark" size={16} color={COLORS.white} />
              </View>
              <View style={styles.timelineLineActive} />
            </View>
            <View style={styles.timelineBody}>
              <Text style={styles.timelineTitle}>Restaurant a accepté</Text>
              <Text style={styles.timelineSubtitle}>Cuisine notifiée</Text>
            </View>
          </View>

          <View style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={styles.timelinePulse} />
              <View style={styles.timelineLineInactive} />
            </View>
            <View style={styles.timelineBody}>
              <Text style={styles.timelineTitleActive}>En cours de préparation</Text>
              <Text style={styles.timelineSubtitle}>Prêt d'ici {eta}</Text>
            </View>
          </View>

          <View style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={styles.timelineDotInactive}>
                <Ionicons name="bicycle" size={16} color={COLORS.textSecondary} />
              </View>
            </View>
            <View style={styles.timelineBody}>
              <Text style={styles.timelineTitleInactive}>Le livreur récupère la commande</Text>
              <Text style={styles.timelineSubtitleInactive}>En attente</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardAvatar}>
              <Ionicons name="restaurant" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{restaurantName}</Text>
              <Text style={styles.cardSubtitle}>4.8 (200+) • {restaurantCategory}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.callButton} onPress={handleCallRestaurant}>
            <Ionicons name="call" size={18} color={COLORS.primary} />
            <Text style={styles.callButtonText}>Appeler le restaurant</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mapHint}>
          <View style={styles.mapBadge}>
            <Ionicons name="location" size={16} color={COLORS.primary} />
            <Text style={styles.mapBadgeText}>Le livreur arrive bientôt sur zone</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingBottom: 32,
  },
  hero: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  timeline: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotInactive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelinePulse: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineLineActive: {
    width: 2,
    height: 36,
    backgroundColor: COLORS.primary,
    marginTop: 6,
  },
  timelineLineInactive: {
    width: 2,
    height: 36,
    backgroundColor: COLORS.border,
    marginTop: 6,
  },
  timelineBody: {
    flex: 1,
    justifyContent: 'center',
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  timelineTitleActive: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  timelineTitleInactive: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  timelineSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  timelineSubtitleInactive: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  cardAvatar: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '12',
  },
  callButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  mapHint: {
    marginHorizontal: 16,
    height: 140,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mapBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
});

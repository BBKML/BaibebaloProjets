import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function TrackingOutForDeliveryScreen({ navigation, route }) {
  const { orderId } = route.params || {};
  const [order, setOrder] = useState(null);
  const [driver, setDriver] = useState({
    name: 'Kouassi Jean',
    phone: '+225 07 XX XX XX XX',
    location: { lat: 5.3364, lng: -4.0267 },
    estimatedArrival: '15 min',
  });

  useEffect(() => {
    loadOrderDetails();
    // Simuler la mise à jour de la position
    const interval = setInterval(() => {
      // TODO: Mettre à jour la position du livreur
    }, 30000);
    return () => clearInterval(interval);
  }, [orderId]);

  const loadOrderDetails = async () => {
    // TODO: Implémenter l'appel API
    setOrder({
      id: orderId,
      restaurant: 'Restaurant Le Délices',
      address: 'Cocody Angré, Abidjan',
    });
  };

  const handleCallDriver = () => {
    // TODO: Implémenter l'appel téléphonique
    console.log('Appeler le livreur:', driver.phone);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header avec statut */}
      <View style={styles.header}>
        <View style={styles.statusBadge}>
          <Ionicons name="bicycle" size={24} color={COLORS.white} />
          <Text style={styles.statusText}>En route vers vous</Text>
        </View>
        <Text style={styles.statusSubtext}>
          Arrivée prévue dans {driver.estimatedArrival}
        </Text>
      </View>

      {/* Carte (placeholder) */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={64} color={COLORS.textLight} />
          <Text style={styles.mapText}>Carte de suivi</Text>
          <Text style={styles.mapSubtext}>
            Position du livreur en temps réel
          </Text>
        </View>
        <View style={styles.driverMarker}>
          <Ionicons name="bicycle" size={32} color={COLORS.primary} />
        </View>
      </View>

      {/* Informations du livreur */}
      <View style={styles.driverSection}>
        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <Ionicons name="person" size={40} color={COLORS.textSecondary} />
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driver.name}</Text>
            <View style={styles.driverStatus}>
              <View style={styles.statusIndicator} />
              <Text style={styles.statusText}>En route</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.callButton}
            onPress={handleCallDriver}
          >
            <Ionicons name="call" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Informations de livraison */}
      <View style={styles.deliveryInfoSection}>
        <Text style={styles.sectionTitle}>Informations de livraison</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Adresse de livraison</Text>
              <Text style={styles.infoValue}>{order?.address || 'Adresse'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="time" size={20} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Temps estimé</Text>
              <Text style={styles.infoValue}>{driver.estimatedArrival}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.timelineSection}>
        <Text style={styles.sectionTitle}>Suivi de commande</Text>
        <View style={styles.timeline}>
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, styles.timelineDotActive]} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Commande confirmée</Text>
            </View>
          </View>
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, styles.timelineDotActive]} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>En préparation</Text>
            </View>
          </View>
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, styles.timelineDotActive]} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Livreur assigné</Text>
            </View>
          </View>
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, styles.timelineDotActive]} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>En route</Text>
              <Text style={styles.timelineTime}>Maintenant</Text>
            </View>
          </View>
          <View style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineTitle, styles.timelineTitlePending]}>
                Livré
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.white + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  statusSubtext: {
    fontSize: 14,
    color: COLORS.white + 'CC',
  },
  mapContainer: {
    height: 300,
    backgroundColor: COLORS.border,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
  },
  mapSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  driverMarker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  driverSection: {
    padding: 16,
    marginTop: 8,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  driverStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryInfoSection: {
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  timelineSection: {
    padding: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  timeline: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.border,
    marginRight: 16,
    marginTop: 2,
  },
  timelineDotActive: {
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.primary + '40',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  timelineTitlePending: {
    color: COLORS.textSecondary,
  },
  timelineTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

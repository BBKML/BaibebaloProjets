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

export default function TrackingDriverAssignedScreen({ navigation, route }) {
  const { orderId } = route.params || {};
  const [order, setOrder] = useState(null);
  const [driver, setDriver] = useState({
    name: 'Kouassi Jean',
    phone: '+225 07 XX XX XX XX',
    rating: 4.8,
    vehicle: 'Moto',
    plateNumber: 'AB-123-CD',
    avatar: null,
  });

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    // TODO: Implémenter l'appel API
    setOrder({
      id: orderId,
      restaurant: 'Restaurant Le Délices',
      estimatedTime: '25-30 min',
      status: 'driver_assigned',
    });
  };

  const handleCallDriver = () => {
    // TODO: Implémenter l'appel téléphonique
    console.log('Appeler le livreur:', driver.phone);
  };

  const handleChatDriver = () => {
    // TODO: Implémenter le chat avec le livreur
    console.log('Chatter avec le livreur');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header avec statut */}
      <View style={styles.header}>
        <View style={styles.statusBadge}>
          <Ionicons name="bicycle" size={24} color={COLORS.white} />
          <Text style={styles.statusText}>Livreur assigné</Text>
        </View>
        <Text style={styles.statusSubtext}>
          Votre commande est en préparation
        </Text>
      </View>

      {/* Informations du livreur */}
      <View style={styles.driverSection}>
        <Text style={styles.sectionTitle}>Votre livreur</Text>
        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            {driver.avatar ? (
              <Image source={{ uri: driver.avatar }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={40} color={COLORS.textSecondary} />
            )}
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driver.name}</Text>
            <View style={styles.driverMeta}>
              <Ionicons name="star" size={16} color={COLORS.warning} />
              <Text style={styles.driverRating}>{driver.rating}</Text>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.driverVehicle}>{driver.vehicle}</Text>
            </View>
            <Text style={styles.driverPlate}>{driver.plateNumber}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCallDriver}
          >
            <Ionicons name="call" size={20} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>Appeler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={handleChatDriver}
          >
            <Ionicons name="chatbubble" size={20} color={COLORS.white} />
            <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
              Chat
            </Text>
          </TouchableOpacity>
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
              <Text style={styles.timelineTime}>Il y a 5 min</Text>
            </View>
          </View>
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, styles.timelineDotActive]} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>En préparation</Text>
              <Text style={styles.timelineTime}>Il y a 3 min</Text>
            </View>
          </View>
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, styles.timelineDotActive]} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Livreur assigné</Text>
              <Text style={styles.timelineTime}>Maintenant</Text>
            </View>
          </View>
          <View style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineTitle, styles.timelineTitlePending]}>
                En route
              </Text>
              <Text style={styles.timelineTime}>Bientôt</Text>
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

      {/* Informations de la commande */}
      <View style={styles.orderInfoSection}>
        <Text style={styles.sectionTitle}>Informations</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="restaurant" size={20} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{order?.restaurant || 'Restaurant'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time" size={20} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>
              Arrivée prévue: {order?.estimatedTime || '25-30 min'}
            </Text>
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
  driverSection: {
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  driverCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 16,
  },
  driverAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  driverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  driverRating: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 4,
  },
  separator: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginHorizontal: 8,
  },
  driverVehicle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  driverPlate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
  },
  actionButtonPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionButtonTextPrimary: {
    color: COLORS.white,
  },
  timelineSection: {
    padding: 16,
    marginTop: 8,
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
  orderInfoSection: {
    padding: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
  },
});

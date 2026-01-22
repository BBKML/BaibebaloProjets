import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { trackOrder } from '../../api/orders';

export default function TrackingDriverAssignedScreen({ navigation, route }) {
  const { orderId } = route.params || {};
  const [order, setOrder] = useState(null);
  const [driver, setDriver] = useState({
    name: 'Livreur',
    phone: '',
    rating: 4.8,
    vehicle: 'Moto',
    plateNumber: '',
    avatar: null,
  });

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    if (!orderId) return;
    try {
      const response = await trackOrder(orderId);
      const orderData = response.data?.order || response.data?.data?.order || response.data;
      setOrder(orderData);
      setDriver((prev) => ({
        ...prev,
        name: [orderData?.delivery_first_name, orderData?.delivery_last_name]
          .filter(Boolean)
          .join(' ') || prev.name,
        phone: orderData?.delivery_phone || '',
      }));
    } catch (error) {
      console.error('Erreur suivi commande:', error);
    }
  };

  const handleCallDriver = () => {
    if (!driver.phone) {
      Alert.alert('Livreur', 'Numéro du livreur indisponible.');
      return;
    }
    Linking.openURL(`tel:${driver.phone}`);
  };

  const handleChatDriver = () => {
    navigation.navigate('OrderDetails', { orderId });
  };

  return (
    <View style={styles.container}>
      <Image
        source={{
          uri:
            'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900',
        }}
        style={styles.mapImage}
      />
      <View style={styles.mapOverlay} />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.topTitlePill}>
          <Text style={styles.topTitle}>Suivi de commande</Text>
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="help-circle-outline" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>Le livreur est en route</Text>
        <Text style={styles.sheetSubtitle}>Votre commande est en cours de livraison</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCardPrimary}>
            <Text style={styles.statLabel}>Arrivée prévue</Text>
            <Text style={styles.statValue}>
              {order?.estimated_delivery_time ? `${order.estimated_delivery_time} min` : '15 min'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabelMuted}>Distance</Text>
            <Text style={styles.statValueMuted}>
              {order?.distance_km ? `${Number(order.distance_km).toFixed(1)} km` : '2.4 km'}
            </Text>
          </View>
        </View>

        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            {driver.avatar ? (
              <Image source={{ uri: driver.avatar }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={32} color={COLORS.textSecondary} />
            )}
          </View>
          <View style={styles.driverInfo}>
            <View style={styles.driverRow}>
              <Text style={styles.driverName}>{driver.name}</Text>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color={COLORS.warning} />
                <Text style={styles.ratingText}>{driver.rating}</Text>
              </View>
            </View>
            <Text style={styles.driverVehicle}>
              {driver.vehicle} • {driver.plateNumber}
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.primaryAction} onPress={handleCallDriver}>
            <Ionicons name="call" size={18} color={COLORS.white} />
            <Text style={styles.primaryActionText}>Appeler le livreur</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryAction} onPress={handleChatDriver}>
            <Text style={styles.secondaryActionText}>Détails de la commande</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

TrackingDriverAssignedScreen.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
    navigate: PropTypes.func.isRequired,
  }).isRequired,
  route: PropTypes.shape({
    params: PropTypes.shape({
      orderId: PropTypes.string,
    }),
  }),
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mapImage: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  topBar: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitlePill: {
    flex: 1,
    marginHorizontal: 12,
    backgroundColor: COLORS.white,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    gap: 12,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCardPrimary: {
    flex: 1,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 12,
  },
  statLabelMuted: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  statValueMuted: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  driverInfo: {
    flex: 1,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.warning + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.warning,
  },
  driverVehicle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actionsContainer: {
    gap: 10,
  },
  primaryAction: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryAction: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryActionText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
});

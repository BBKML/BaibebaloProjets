import React, { useEffect, useState } from 'react';
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

export default function DeliveryArrivalScreen({ navigation, route }) {
  const { orderId } = route.params || {};
  const [order, setOrder] = useState({
    id: orderId,
    total: 0,
    paymentMethod: 'Mobile Money',
  });
  const [driver, setDriver] = useState({
    name: 'Livreur',
    phone: '',
    vehicle: '',
    plate: '',
  });

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) return;
      try {
        const response = await trackOrder(orderId);
        const orderData = response.data?.order || response.data?.data?.order || response.data;
        setOrder({
          id: orderId,
          total: orderData?.total || 0,
          paymentMethod: orderData?.payment_method || 'Mobile Money',
        });
        setDriver({
          name: [orderData?.delivery_first_name, orderData?.delivery_last_name]
            .filter(Boolean)
            .join(' ') || 'Livreur',
          phone: orderData?.delivery_phone || '',
          vehicle: orderData?.vehicle_type || '',
          plate: orderData?.vehicle_plate || '',
        });
      } catch (error) {
        console.error('Erreur suivi commande:', error);
      }
    };

    loadOrder();
  }, [orderId]);

  const handleConfirmDelivery = () => {
    navigation.navigate('OrderReview', { orderId });
  };

  const handleCallDriver = () => {
    if (!driver.phone) {
      Alert.alert('Livreur', 'Numéro du livreur indisponible.');
      return;
    }
    Linking.openURL(`tel:${driver.phone}`);
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
        <View style={styles.arrivalPill}>
          <Ionicons name="time" size={14} color={COLORS.white} />
          <Text style={styles.arrivalText}>Arrivé</Text>
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="help-circle-outline" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>Votre commande est arrivée</Text>
        <Text style={styles.sheetSubtitle}>Le livreur est à votre porte.</Text>

        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <Ionicons name="person" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driver.name}</Text>
            <Text style={styles.driverMeta}>
              {[driver.vehicle, driver.plate].filter(Boolean).join(' • ') || 'Livreur'}
            </Text>
          </View>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color={COLORS.warning} />
            <Text style={styles.ratingText}>4.8</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>{order.total} FCFA</Text>
        </View>

        <TouchableOpacity style={styles.primaryAction} onPress={handleCallDriver}>
          <Ionicons name="call" size={18} color={COLORS.white} />
          <Text style={styles.primaryActionText}>Appeler le livreur</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryAction} onPress={handleConfirmDelivery}>
          <Text style={styles.secondaryActionText}>Confirmer la réception</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

DeliveryArrivalScreen.propTypes = {
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
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  topBar: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrivalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  arrivalText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  sheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 12,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  driverMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  primaryAction: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryAction: {
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
});

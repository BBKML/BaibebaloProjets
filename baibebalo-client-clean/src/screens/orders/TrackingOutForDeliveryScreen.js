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

export default function TrackingOutForDeliveryScreen({ navigation, route }) {
  const { orderId } = route.params || {};
  const [order, setOrder] = useState(null);
  const [driver, setDriver] = useState({
    name: 'Livreur',
    phone: '',
    location: null,
    estimatedArrival: '15 min',
  });

  useEffect(() => {
    loadOrderDetails();
    // Simuler la mise à jour de la position
    const interval = setInterval(() => {
      loadOrderDetails();
    }, 30000);
    return () => clearInterval(interval);
  }, [orderId]);

  const loadOrderDetails = async () => {
    if (!orderId) return;
    try {
      const response = await trackOrder(orderId);
      const orderData = response.data?.order || response.data?.data?.order || response.data;
      setOrder(orderData);
      const driverName = [orderData?.delivery_first_name, orderData?.delivery_last_name]
        .filter(Boolean)
        .join(' ');
      setDriver((prev) => ({
        ...prev,
        name: driverName || prev.name,
        phone: orderData?.delivery_phone || '',
        location: orderData?.current_latitude && orderData?.current_longitude
          ? { lat: orderData.current_latitude, lng: orderData.current_longitude }
          : prev.location,
        estimatedArrival: orderData?.estimated_delivery_time
          ? `${orderData.estimated_delivery_time} min`
          : prev.estimatedArrival,
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
          <Text style={styles.arrivalText}>{driver.estimatedArrival}</Text>
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="help-circle-outline" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTag}>En route</Text>
            <Text style={styles.sheetTitle}>Le livreur arrive</Text>
            <Text style={styles.sheetSubtitle}>
              Commande #{orderId || 'BA-8821'} • ETA {driver.estimatedArrival}
            </Text>
          </View>
          <View style={styles.driverThumb}>
            <Ionicons name="person" size={24} color={COLORS.primary} />
          </View>
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressActive} />
          <View style={styles.progressActive} />
          <View style={styles.progressActive}>
            <View style={styles.progressPulse} />
          </View>
          <View style={styles.progressInactive} />
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.primaryAction} onPress={handleCallDriver}>
            <Ionicons name="call" size={16} color={COLORS.white} />
            <Text style={styles.primaryActionText}>Appeler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryAction}>
            <Ionicons name="chatbubble" size={16} color={COLORS.text} />
            <Text style={styles.secondaryActionText}>Message</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.footerIcon}>
            <Ionicons name="restaurant" size={18} color={COLORS.primary} />
          </View>
          <View style={styles.footerInfo}>
            <Text style={styles.footerLabel}>Depuis</Text>
            <Text style={styles.footerValue}>{order?.restaurant || 'Chez Tante Alice'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
        </View>
      </View>
    </View>
  );
}

TrackingOutForDeliveryScreen.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
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
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sheetTag: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
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
  driverThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  progressActive: {
    flex: 1,
    height: 6,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    position: 'relative',
  },
  progressPulse: {
    position: 'absolute',
    right: 0,
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
  },
  progressInactive: {
    flex: 1,
    height: 6,
    borderRadius: 6,
    backgroundColor: COLORS.border,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  primaryActionText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 12,
  },
  secondaryActionText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerInfo: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  footerValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { STATUS_LABELS } from '../../constants/orderStatus';
import { trackOrder } from '../../api/orders';
import { formatCurrency, calculateOrderTotal } from '../../utils/format';
import { getImageUrl } from '../../utils/url';
import socketService from '../../services/socketService';

export default function OrderTrackingScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      const response = await trackOrder(orderId);
      const orderData = response.data?.order || response.data?.data?.order || response.data;
      setOrder(orderData);
    } catch (error) {
      console.error('Erreur lors du chargement de la commande:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
    
    // Connecter au Socket et rejoindre la room de cette commande
    socketService.connect();
    socketService.joinOrderRoom(orderId);

    // Écouter les événements
    const unsubscribeStatus = socketService.on('order_status_changed', (data) => {
      if (data.order_id === orderId) {
        console.log('[Tracking] Statut changé:', data.status);
        setOrder(prev => prev ? { ...prev, status: data.status } : prev);
        // Recharger pour avoir les données complètes
        loadOrder();
      }
    });

    const unsubscribeDelivery = socketService.on('delivery_assigned', (data) => {
      if (data.order_id === orderId) {
        console.log('[Tracking] Livreur assigné:', data.delivery_person);
        setOrder(prev => prev ? { ...prev, delivery_person: data.delivery_person } : prev);
        Alert.alert(
          '🚴 Livreur assigné !',
          `${data.delivery_person?.name} va récupérer votre commande.`
        );
      }
    });

    const unsubscribePickup = socketService.on('order_picked_up', (data) => {
      if (data.order_id === orderId) {
        console.log('[Tracking] Commande récupérée');
        setOrder(prev => prev ? { ...prev, status: 'picked_up' } : prev);
        Alert.alert(
          '📦 Commande récupérée !',
          'Votre livreur est en route vers vous.'
        );
      }
    });

    const unsubscribeLocation = socketService.on('delivery_location_updated', (data) => {
      if (data.order_id === orderId) {
        setDeliveryLocation({
          latitude: data.latitude,
          longitude: data.longitude,
        });
      }
    });

    const unsubscribeArrived = socketService.on('delivery_arrived_at_customer', (data) => {
      if (data.order_id === orderId) {
        Alert.alert(
          '📍 Livreur arrivé !',
          'Votre livreur est arrivé à votre adresse.'
        );
      }
    });

    const unsubscribeConnection = socketService.on('connection_status', (data) => {
      setSocketConnected(data.connected);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeDelivery();
      unsubscribePickup();
      unsubscribeLocation();
      unsubscribeArrived();
      unsubscribeConnection();
      socketService.leaveOrderRoom(orderId);
    };
  }, [orderId, loadOrder]);

  if (loading || !order) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const statusSteps = [
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'picked_up',
    'delivering',
    'delivered',
  ];

  const currentStatusIndex = statusSteps.indexOf(order.status);

  const handleCallRestaurant = () => {
    const phone = order.restaurant?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Contact', 'Le numéro du restaurant n\'est pas disponible.');
    }
  };

  const handleCallDriver = () => {
    const phone = order.delivery_person?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Contact', 'Le numéro du livreur n\'est pas disponible.');
    }
  };

  const handleOpenChat = () => {
    navigation.navigate('OrderChat', {
      orderId: order.id,
      restaurantName: order.restaurant?.name,
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Status Timeline */}
      <View style={styles.timelineContainer}>
        {statusSteps.map((status, index) => {
          const isCompleted = index <= currentStatusIndex;
          const isCurrent = index === currentStatusIndex;
          const isLast = index === statusSteps.length - 1;

          return (
            <View key={status} style={styles.timelineItem}>
              <View style={styles.timelineContent}>
                <View
                  style={[
                    styles.timelineDot,
                    isCompleted && styles.timelineDotCompleted,
                    isCurrent && styles.timelineDotCurrent,
                  ]}
                >
                  {isCompleted && (
                    <Ionicons name="checkmark" size={16} color={COLORS.white} />
                  )}
                </View>
                {!isLast && (
                  <View
                    style={[
                      styles.timelineLine,
                      isCompleted && styles.timelineLineCompleted,
                    ]}
                  />
                )}
              </View>
              <View style={styles.timelineLabel}>
                <Text
                  style={[
                    styles.timelineLabelText,
                    isCompleted && styles.timelineLabelTextCompleted,
                  ]}
                >
                  {STATUS_LABELS[status]}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Restaurant Info with Call Button */}
      <View style={styles.contactCard}>
        <View style={styles.contactHeader}>
          <View style={styles.contactIcon}>
            <Ionicons name="restaurant" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Restaurant</Text>
            <Text style={styles.contactName}>{order.restaurant?.name || 'Restaurant'}</Text>
            {order.estimated_preparation_time && (
              <Text style={styles.prepTime}>
                Préparation estimée: {order.estimated_preparation_time} min
              </Text>
            )}
          </View>
        </View>
        <View style={styles.contactButtons}>
          <TouchableOpacity style={styles.chatButton} onPress={handleOpenChat}>
            <Ionicons name="chatbubble" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.callButton} onPress={handleCallRestaurant}>
            <Ionicons name="call" size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Driver Info with Call Button - shown when driver is assigned */}
      {order.delivery_person && (
        <View style={styles.contactCard}>
          <View style={styles.contactHeader}>
            {order.delivery_person.profile_photo ? (
              <Image 
                source={{ uri: getImageUrl(order.delivery_person.profile_photo) }}
                style={styles.driverPhoto}
              />
            ) : (
              <View style={[styles.contactIcon, { backgroundColor: COLORS.success + '20' }]}>
                <Ionicons name="bicycle" size={24} color={COLORS.success} />
              </View>
            )}
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Votre livreur</Text>
              <Text style={styles.contactName}>
                {order.delivery_person.first_name} {order.delivery_person.last_name?.charAt(0)}.
              </Text>
              <View style={styles.driverDetails}>
                {order.delivery_person.vehicle_type && (
                  <Text style={styles.vehicleType}>
                    {order.delivery_person.vehicle_type === 'moto' ? '🏍️ Moto' : '🚲 Vélo'}
                  </Text>
                )}
                {order.delivery_person.average_rating && (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color={COLORS.warning} />
                    <Text style={styles.ratingText}>
                      {parseFloat(order.delivery_person.average_rating).toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.callButton, { backgroundColor: COLORS.success }]} 
            onPress={handleCallDriver}
          >
            <Ionicons name="call" size={20} color={COLORS.white} />
            <Text style={styles.callButtonText}>Appeler</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Order Details */}
      <View style={styles.detailsContainer}>
        <Text style={styles.sectionTitle}>Détails de la commande</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Numéro de commande</Text>
          <Text style={styles.detailValue}>#{order.order_number}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Adresse de livraison</Text>
          <Text style={styles.detailValue}>
            {order.delivery_address?.street}, {order.delivery_address?.city}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total</Text>
          <Text style={[styles.detailValue, styles.totalValue]}>
            {formatCurrency(calculateOrderTotal(order))}
          </Text>
        </View>
      </View>

      {/* Items */}
      <View style={styles.itemsContainer}>
        <Text style={styles.sectionTitle}>Articles</Text>
        {order.items?.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.menu_item?.name}</Text>
            <Text style={styles.itemQuantity}>x{item.quantity}</Text>
            <Text style={styles.itemPrice}>
              {formatCurrency((item.price || item.menu_item?.price || 0) * (item.quantity || 1))}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  timelineContainer: {
    backgroundColor: COLORS.white,
    padding: 24,
    marginBottom: 12,
  },
  contactCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.border,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  prepTime: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 2,
  },
  driverDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  vehicleType: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.warning,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineContent: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timelineDotCurrent: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timelineLine: {
    width: 2,
    height: 40,
    backgroundColor: COLORS.border,
    marginTop: 4,
  },
  timelineLineCompleted: {
    backgroundColor: COLORS.primary,
  },
  timelineLabel: {
    flex: 1,
    justifyContent: 'center',
  },
  timelineLabelText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  timelineLabelTextCompleted: {
    color: COLORS.text,
    fontWeight: '600',
  },
  detailsContainer: {
    backgroundColor: COLORS.white,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  itemsContainer: {
    backgroundColor: COLORS.white,
    padding: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  itemQuantity: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginHorizontal: 12,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
});

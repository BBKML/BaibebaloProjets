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
import { formatCurrency, calculateOrderTotal, calculateOrderSubtotal } from '../../utils/format';
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
      
      // Logger pour déboguer les données reçues
      console.log('📦 Données commande chargées (trackOrder):', {
        orderId: orderData?.id,
        hasItems: !!orderData?.items && orderData.items.length > 0,
        itemsCount: orderData?.items?.length || 0,
        subtotal: orderData?.subtotal,
        delivery_fee: orderData?.delivery_fee,
        taxes: orderData?.taxes,
        discount: orderData?.discount,
        total: orderData?.total,
        restaurantPhone: orderData?.restaurant?.phone,
        restaurantName: orderData?.restaurant?.name,
        restaurantId: orderData?.restaurant_id,
      });
      
      setOrder(orderData);
    } catch (error) {
      console.error('❌ Erreur lors du chargement de la commande:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
    
    // Connecter au Socket et rejoindre la room de cette commande
    console.log('[Tracking] Initialisation Socket pour commande:', orderId);
    socketService.connect().then(() => {
      console.log('[Tracking] Socket connecté, rejoindre room order_' + orderId);
      socketService.joinOrderRoom(orderId);
    }).catch(err => {
      console.error('[Tracking] Erreur connexion Socket:', err);
    });

    // Écouter les événements
    const unsubscribeStatus = socketService.on('order_status_changed', (data) => {
      console.log('[Tracking] Événement order_status_changed reçu:', data);
      if (data.order_id === orderId || data.orderId === orderId) {
        console.log('[Tracking] ✅ Statut changé pour cette commande:', data.status);
        
        // Afficher une notification selon le statut
        const statusMessages = {
          'accepted': '✅ Commande acceptée par le restaurant',
          'preparing': '👨‍🍳 Commande en préparation',
          'ready': '📦 Commande prête ! Le livreur va la récupérer',
          'picked_up': '🚴 Commande récupérée par le livreur',
          'delivering': '🚗 Livraison en cours',
          'delivered': '✅ Commande livrée !',
        };
        
        if (statusMessages[data.status]) {
          Alert.alert(
            'Mise à jour',
            statusMessages[data.status],
            [{ text: 'OK' }]
          );
        }
        
        // Mettre à jour immédiatement le statut
        setOrder(prev => {
          if (!prev) return prev;
          const updated = { ...prev, status: data.status };
          console.log('[Tracking] Statut mis à jour:', updated.status);
          return updated;
        });
        // Recharger pour avoir les données complètes (accepted_at, etc.)
        setTimeout(() => {
          loadOrder();
        }, 500);
      } else {
        console.log('[Tracking] ⚠️ Événement ignoré (mauvaise commande):', data.order_id, 'vs', orderId);
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
    'new',
    'accepted',
    'preparing',
    'ready',
    'picked_up',
    'delivering',
    'delivered',
  ];

  // Mapper les statuts pour la timeline (accepted peut être considéré comme confirmed)
  const getStatusForTimeline = (status) => {
    if (status === 'confirmed' || status === 'accepted') return 'accepted';
    if (status === 'pending' || status === 'new') return 'new';
    return status;
  };

  const timelineStatus = getStatusForTimeline(order.status);
  const currentStatusIndex = statusSteps.indexOf(timelineStatus);

  // Utiliser les mêmes fonctions de calcul que OrderDetailsScreen pour garantir la cohérence
  const subtotal = calculateOrderSubtotal(order);
  const total = calculateOrderTotal(order);

  const handleCallRestaurant = () => {
    // Essayer plusieurs sources pour le numéro du restaurant
    const phone = order.restaurant?.phone || order.restaurant_phone;
    
    console.log('📞 Tentative d\'appel restaurant:', {
      restaurantPhone: order.restaurant?.phone,
      restaurant_phone: order.restaurant_phone,
      restaurantId: order.restaurant_id,
      restaurantName: order.restaurant?.name,
      phoneFound: !!phone,
    });
    
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      console.warn('⚠️ Numéro restaurant non trouvé:', {
        orderId: order.id,
        restaurant: order.restaurant,
        restaurant_phone: order.restaurant_phone,
      });
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
            {order.restaurant?.phone && (
              <TouchableOpacity onPress={handleCallRestaurant} style={styles.phoneLink}>
                <Ionicons name="call-outline" size={14} color={COLORS.primary} />
                <Text style={styles.phoneText}>{order.restaurant.phone}</Text>
              </TouchableOpacity>
            )}
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
            <Text style={styles.chatButtonText}>Chat</Text>
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

      {/* Delivery Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Adresse de livraison</Text>
        <View style={styles.addressCard}>
          <View style={styles.addressIcon}>
            <Ionicons name="location" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.addressInfo}>
            <Text style={styles.addressLabel}>
              {order.delivery_address?.label
                || order.delivery_address?.title
                || 'Adresse de livraison'}
            </Text>
            <Text style={styles.addressText}>
              {order.delivery_address?.street
                || order.delivery_address?.address_line
                || ''}
            </Text>
            <Text style={styles.addressText}>
              {order.delivery_address?.city
                || order.delivery_address?.district
                || ''}
            </Text>
            {order.delivery_address?.additional_info && (
              <Text style={styles.addressAdditional}>
                {order.delivery_address.additional_info}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Résumé de la commande</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Numéro de commande</Text>
            <Text style={styles.summaryValue}>#{order.order_number}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sous-total</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(subtotal)}
            </Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Frais de livraison</Text>
            <Text style={styles.summaryValue}>
              {(order.delivery_fee || 0) === 0
                ? 'Gratuit'
                : formatCurrency(order.delivery_fee || 0)}
            </Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Taxes</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(order.taxes || 0)}
            </Text>
          </View>
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total à payer</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(total)}
            </Text>
          </View>
        </View>
      </View>

      {/* Items */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Articles commandés</Text>
          <Text style={styles.itemsCount}>
            {order.items?.length || 0} Articles
          </Text>
        </View>
        {order.items?.map((item, index) => (
          <View key={item.id || item.menu_item?.id || index} style={styles.itemCard}>
            {item.menu_item?.image_url && (
              <Image
                source={{ uri: item.menu_item.image_url }}
                style={styles.itemImage}
              />
            )}
            <View style={styles.itemInfo}>
              <View style={styles.itemNameRow}>
                <Text style={styles.itemName}>
                  {item.menu_item?.name || item.name}
                </Text>
                {/* Badge de promotion si applicable */}
                {item.menu_item_snapshot?.is_promotion_active && 
                 item.menu_item_snapshot?.effective_price && 
                 item.menu_item_snapshot?.effective_price < item.menu_item_snapshot?.original_price && (
                  <View style={styles.itemPromotionBadge}>
                    <Text style={styles.itemPromotionBadgeText}>PROMO</Text>
                  </View>
                )}
              </View>
              <Text style={styles.itemQuantity}>x{item.quantity}</Text>
              {/* Afficher prix original barré si promotion */}
              {item.menu_item_snapshot?.is_promotion_active && 
               item.menu_item_snapshot?.effective_price && 
               item.menu_item_snapshot?.effective_price < item.menu_item_snapshot?.original_price && (
                <Text style={styles.itemPriceOriginal}>
                  {formatCurrency(
                    (item.menu_item_snapshot?.original_price || item.unit_price || item.price || 0) * (item.quantity || 1)
                  )}
                </Text>
              )}
            </View>
            <Text style={styles.itemPrice}>
              {formatCurrency(
                (item.unit_price || item.price || item.menu_item?.price || item.menu_item_snapshot?.price || item.menu_item_snapshot?.effective_price || 0) * (item.quantity || 1)
              )}
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
  phoneLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  phoneText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 6,
  },
  chatButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
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
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressInfo: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  addressAdditional: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  discountValue: {
    color: COLORS.success,
  },
  detailsContainer: {
    backgroundColor: COLORS.white,
    padding: 16,
    marginBottom: 12,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemsCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: COLORS.border,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  itemPromotionBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemPromotionBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '700',
  },
  itemQuantity: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  itemPriceOriginal: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
});

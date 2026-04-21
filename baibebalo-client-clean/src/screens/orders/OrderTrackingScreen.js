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
  Platform,
  Dimensions,
} from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

// react-native-maps n'est pas disponible dans Expo Go (module natif absent) → chargement conditionnel
const isExpoGo = Constants.appOwnership === 'expo';
let MapView, Marker;
if (!isExpoGo) {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch (e) {
    // ignore
  }
}
import { COLORS } from '../../constants/colors';
import { STATUS_LABELS } from '../../constants/orderStatus';
import { trackOrder } from '../../api/orders';
import { formatCurrency, calculateOrderTotal, calculateOrderSubtotal } from '../../utils/format';
import { getImageUrl } from '../../utils/url';
import socketService from '../../services/socketService';

const MAP_HEIGHT = 200;
const KORHOGO_REGION = { latitude: 9.4581, longitude: -5.6297, latitudeDelta: 0.05, longitudeDelta: 0.05 };

export default function OrderTrackingScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const loadOrder = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
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
      if (showLoading) setLoading(false);
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
          'driver_at_customer': '📍 Livreur arrivé à votre adresse !',
          'delivered': '✅ Commande livrée !',
        };
        
        if (statusMessages[data.status]) {
          const isDelivered = data.status === 'delivered';
          Alert.alert(
            'Mise à jour',
            statusMessages[data.status],
            isDelivered
              ? [
                  { text: 'Noter la commande', onPress: () => navigation.navigate('OrderReview', { orderId }) },
                  { text: 'Plus tard', style: 'cancel' },
                ]
              : [{ text: 'OK' }]
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
        setTimeout(() => loadOrder(false), 500);
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

    // Polling de secours : rafraîchir le statut toutes les 15s (au cas où le socket rate un événement)
    const pollInterval = setInterval(() => loadOrder(false), 15000);

    return () => {
      clearInterval(pollInterval);
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

  const isExpress = order.order_type === 'express';
  const statusSteps = isExpress
    ? ['ready', 'picked_up', 'delivering', 'delivered']
    : ['new', 'accepted', 'preparing', 'ready', 'picked_up', 'delivering', 'delivered'];

  // Mapper les statuts pour la timeline (accepted peut être considéré comme confirmed)
  // driver_at_customer = livreur arrivé → considérer comme delivered pour afficher toutes les étapes complétées
  const getStatusForTimeline = (status) => {
    if (status === 'confirmed' || status === 'accepted') return 'accepted';
    if (status === 'pending' || status === 'new') return 'new';
    if (status === 'driver_at_customer') return 'delivered';
    return status;
  };

  const timelineStatus = getStatusForTimeline(order.status);
  const currentStatusIndex = statusSteps.indexOf(timelineStatus);

  // Utiliser les mêmes fonctions de calcul que OrderDetailsScreen pour garantir la cohérence
  const subtotal = calculateOrderSubtotal(order);
  const total = calculateOrderTotal(order);

  const handleCallRestaurant = () => {
    if (order.order_type === 'express') return;
    const phone = order.restaurant?.phone || order.restaurant_phone;
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
      restaurantName: order.order_type === 'express' ? 'Livraison express' : order.restaurant?.name,
    });
  };

  // Région carte : position livreur > adresse livraison > restaurant > Korhogo par défaut
  const deliveryLat = order?.delivery_address?.latitude != null
    ? Number.parseFloat(order.delivery_address.latitude)
    : null;
  const deliveryLng = order?.delivery_address?.longitude != null
    ? Number.parseFloat(order.delivery_address.longitude)
    : null;
  const restaurantLat = order?.restaurant?.latitude != null
    ? Number.parseFloat(order.restaurant.latitude)
    : null;
  const restaurantLng = order?.restaurant?.longitude != null
    ? Number.parseFloat(order.restaurant.longitude)
    : null;
  const mapRegion = deliveryLocation
    ? {
        latitude: deliveryLocation.latitude,
        longitude: deliveryLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : (deliveryLat != null && deliveryLng != null)
      ? { latitude: deliveryLat, longitude: deliveryLng, latitudeDelta: 0.02, longitudeDelta: 0.02 }
      : (restaurantLat != null && restaurantLng != null)
        ? { latitude: restaurantLat, longitude: restaurantLng, latitudeDelta: 0.03, longitudeDelta: 0.03 }
        : KORHOGO_REGION;
  const showMap = (deliveryLocation || (deliveryLat != null && deliveryLng != null) || (restaurantLat != null && restaurantLng != null));

  const openAddressInMaps = () => {
    const lat = deliveryLat ?? restaurantLat ?? KORHOGO_REGION.latitude;
    const lng = deliveryLng ?? restaurantLng ?? KORHOGO_REGION.longitude;
    const url = Platform.select({
      ios: `maps:?q=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`));
  };

  const canShowNativeMap = false; // MapView natif désactivé (clé API Google Maps non configurée)

  return (
    <ScrollView style={styles.container}>
      {/* Carte GPS : position livreur et/ou adresse de livraison (ou lien vers l'app Cartes si Expo Go) */}
      {showMap && (
        <View style={styles.mapContainer}>
          {canShowNativeMap ? (
            <>
              <MapView
                style={styles.map}
                initialRegion={mapRegion}
                showsUserLocation={false}
                showsMyLocationButton={false}
              >
                {deliveryLat != null && deliveryLng != null && (
                  <Marker
                    coordinate={{ latitude: deliveryLat, longitude: deliveryLng }}
                    title="Adresse de livraison"
                    pinColor={COLORS.primary}
                  />
                )}
                {deliveryLocation && (
                  <Marker
                    coordinate={{
                      latitude: deliveryLocation.latitude,
                      longitude: deliveryLocation.longitude,
                    }}
                    title="Position du livreur"
                    pinColor={COLORS.success}
                  />
                )}
                {!deliveryLocation && restaurantLat != null && restaurantLng != null && (
                  <Marker
                    coordinate={{ latitude: restaurantLat, longitude: restaurantLng }}
                    title={order?.restaurant?.name || 'Restaurant'}
                    pinColor={COLORS.warning}
                  />
                )}
              </MapView>
              <View style={styles.mapLegend}>
                {deliveryLocation && (
                  <Text style={styles.mapLegendText}>Position du livreur en temps réel</Text>
                )}
              </View>
            </>
          ) : (
            <TouchableOpacity style={styles.mapFallback} onPress={openAddressInMaps} activeOpacity={0.8}>
              <View style={styles.mapFallbackContent}>
                <Ionicons name="map" size={40} color={COLORS.primary} />
                <Text style={styles.mapFallbackTitle}>Voir l'adresse sur la carte</Text>
                <Text style={styles.mapFallbackHint}>Appuyez pour ouvrir dans Google Maps / Cartes</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Barre de progression globale */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarHeader}>
          <Text style={styles.progressBarLabel}>
            {STATUS_LABELS[timelineStatus] || 'En cours'}
          </Text>
          <Text style={styles.progressBarStep}>
            Étape {Math.max(currentStatusIndex + 1, 1)} / {statusSteps.length}
          </Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.round(
                  ((Math.max(currentStatusIndex, 0)) / (statusSteps.length - 1)) * 100
                )}%`,
              },
            ]}
          />
        </View>
      </View>

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

      {/* Restaurant / Point de collecte */}
      {(!isExpress || order.pickup_address) && (
        <View style={styles.contactCard}>
          <View style={styles.contactHeader}>
            <View style={styles.contactIcon}>
              <Ionicons name={isExpress ? 'cube-outline' : 'restaurant'} size={24} color={COLORS.primary} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>{isExpress ? 'Point de collecte' : 'Restaurant'}</Text>
              <Text style={styles.contactName}>
                {isExpress ? (order.pickup_address?.address_line || order.pickup_address?.address || 'Collecte') : (order.restaurant?.name || 'Restaurant')}
              </Text>
              {!isExpress && order.restaurant?.phone && (
                <TouchableOpacity onPress={handleCallRestaurant} style={styles.phoneLink}>
                  <Ionicons name="call-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.phoneText}>{order.restaurant.phone}</Text>
                </TouchableOpacity>
              )}
              {!isExpress && order.estimated_preparation_time && (
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
            {!isExpress && (
              <TouchableOpacity style={styles.callButton} onPress={handleCallRestaurant}>
                <Ionicons name="call" size={18} color={COLORS.white} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

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

      {/* Bouton Noter - affiché quand la commande est livrée */}
      {order.status === 'delivered' && !order.review && !order.restaurant_rating && (
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.primaryButton, { backgroundColor: COLORS.primary }]}
            onPress={() => navigation.navigate('OrderReview', { orderId })}
          >
            <Ionicons name="star" size={20} color={COLORS.white} />
            <Text style={styles.primaryButtonText}>Noter le restaurant et le livreur</Text>
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
                source={{ uri: getImageUrl(item.menu_item.image_url) }}
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
  mapContainer: {
    height: MAP_HEIGHT,
    marginBottom: 12,
    backgroundColor: COLORS.background,
  },
  map: {
    width: '100%',
    height: MAP_HEIGHT,
    borderRadius: 8,
  },
  mapFallback: {
    width: '100%',
    height: MAP_HEIGHT,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '12',
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapFallbackContent: {
    alignItems: 'center',
    padding: 16,
  },
  mapFallbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 8,
  },
  mapFallbackHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  mapLegend: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  mapLegendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  progressBarContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
    borderRadius: 12,
    marginHorizontal: 0,
  },
  progressBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressBarLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  progressBarStep: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
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
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
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

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Linking, Platform, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { COLORS } from '../../constants/colors';
import { arriveAtCustomer, getOrderDetail, trackOrder } from '../../api/orders';
import { orderToDeliveryShape } from '../../utils/orderToDelivery';
import { updateLocation } from '../../api/delivery';
import { getImageUrl } from '../../utils/url';

const KORHOGO_FALLBACK = { latitude: 9.4580, longitude: -5.6294 };

// Fonction helper pour normaliser l'URL de l'image avec fallback
const normalizeImageUrl = (url) => {
  if (!url) return null;
  try {
    return getImageUrl ? getImageUrl(url) : url;
  } catch (error) {
    console.warn('Erreur normalisation URL image:', error);
    return url;
  }
};

export default function NavigationToCustomerScreen({ navigation, route }) {
  const initialDelivery = route.params?.delivery;
  const orderIdParam = route.params?.orderId;
  const mapRef = useRef(null);
  const [delivery, setDelivery] = useState(initialDelivery || null);
  const [loading, setLoading] = useState(!!orderIdParam);
  const [arriving, setArriving] = useState(false);
  const [driverLocation, setDriverLocation] = useState({
    latitude: initialDelivery?.restaurant?.latitude ?? KORHOGO_FALLBACK.latitude,
    longitude: initialDelivery?.restaurant?.longitude ?? KORHOGO_FALLBACK.longitude,
  });
  const locationSubscription = useRef(null);

  useEffect(() => {
    if (!orderIdParam || initialDelivery) {
      if (initialDelivery) setDelivery(initialDelivery);
      setLoading(false);
      return;
    }
    let cancelled = false;
    // Essayer d'abord getOrderDetail, puis trackOrder en fallback
    getOrderDetail(orderIdParam)
      .then((res) => {
        if (cancelled) return;
        const order = res?.data?.order || res?.order || res?.data;
        console.log('📦 Données commande reçues (getOrderDetail - client):', {
          client_first_name: order?.client_first_name,
          client_last_name: order?.client_last_name,
          client_phone: order?.client_phone,
          restaurant_name: order?.restaurant_name,
          restaurant_logo: order?.restaurant_logo,
          delivery_address: order?.delivery_address,
          customer: order?.customer,
        });
        const deliveryData = orderToDeliveryShape(order);
        console.log('🚚 Données delivery transformées (client):', {
          customer_name: deliveryData?.customer?.name,
          customer_address: deliveryData?.customer?.address,
          customer_area: deliveryData?.customer?.area,
          customer_phone: deliveryData?.customer?.phone,
          client_first_name: deliveryData?.client_first_name,
          client_last_name: deliveryData?.client_last_name,
          client_phone: deliveryData?.client_phone,
          restaurant_name: deliveryData?.restaurant?.name,
          restaurant_logo: deliveryData?.restaurant?.logo,
        });
        setDelivery(deliveryData);
        if (!cancelled) setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        // Si getOrderDetail échoue (ex: accès interdit), essayer trackOrder
        console.warn('getOrderDetail échoué, tentative avec trackOrder:', err?.message || err);
        return trackOrder(orderIdParam);
      })
      .then((res) => {
        if (cancelled || !res) return;
        const order = res?.data?.order || res?.order || res?.data;
        console.log('📦 Données commande reçues (trackOrder - client):', {
          client_first_name: order?.client_first_name,
          client_last_name: order?.client_last_name,
          client_phone: order?.client_phone,
          restaurant_name: order?.restaurant_name,
          restaurant_logo: order?.restaurant_logo,
          delivery_address: order?.delivery_address,
          customer: order?.customer,
        });
        const deliveryData = orderToDeliveryShape(order);
        console.log('🚚 Données delivery transformées (client):', {
          customer_name: deliveryData?.customer?.name,
          customer_address: deliveryData?.customer?.address,
          customer_area: deliveryData?.customer?.area,
          customer_phone: deliveryData?.customer?.phone,
          client_first_name: deliveryData?.client_first_name,
          client_last_name: deliveryData?.client_last_name,
          client_phone: deliveryData?.client_phone,
          restaurant_name: deliveryData?.restaurant?.name,
          restaurant_logo: deliveryData?.restaurant?.logo,
        });
        setDelivery(deliveryData);
      })
      .catch((err) => {
        if (!cancelled) console.warn('Erreur chargement commande:', err?.message || err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [orderIdParam, initialDelivery]);

  const customerLocation = {
    latitude: delivery?.customer?.latitude ?? KORHOGO_FALLBACK.latitude + 0.007,
    longitude: delivery?.customer?.longitude ?? KORHOGO_FALLBACK.longitude - 0.006,
  };

  // GPS réel : position du livreur + envoi au backend (suivi client)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) setDriverLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        locationSubscription.current = Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 20 },
          (l) => {
            if (cancelled) return;
            setDriverLocation({ latitude: l.coords.latitude, longitude: l.coords.longitude });
            updateLocation(l.coords.latitude, l.coords.longitude).catch(() => {});
          }
        );
      } catch (e) {
        if (!cancelled) console.warn('GPS:', e?.message || e);
      }
    })();
    return () => {
      cancelled = true;
      if (locationSubscription.current?.then) {
        locationSubscription.current.then((sub) => sub?.remove()).catch(() => {});
      }
    };
  }, []);

  const openExternalNavigation = () => {
    const lat = customerLocation.latitude;
    const lng = customerLocation.longitude;
    const label = delivery?.customer?.area || delivery?.customer?.address || 'Client';
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(label)}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
    });
    Linking.canOpenURL(url).then(supported => {
      if (supported) Linking.openURL(url);
      else Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    }).catch(() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`));
  };

  const callCustomer = () => {
    const phone = delivery?.customer?.phone || delivery?.client_phone;
    console.log('📞 Tentative d\'appel client:', {
      customer_phone: delivery?.customer?.phone,
      client_phone: delivery?.client_phone,
      phone_final: phone,
    });
    if (!phone) {
      Alert.alert('Information', 'Le numéro du client n\'est pas disponible');
      return;
    }
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  };

  const handleProblem = () => {
    Alert.alert(
      'Signaler un problème',
      'Que voulez-vous faire ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Appeler le client', onPress: callCustomer },
        { text: 'Client absent', onPress: () => handleCustomerAbsent() },
        { text: 'Contacter le support', onPress: () => navigation.navigate('SupportChat') },
      ]
    );
  };

  const handleCustomerAbsent = () => {
    Alert.alert(
      'Client absent',
      'Patientez 5 minutes puis contactez le support si le client ne répond pas.',
      [{ text: 'OK' }]
    );
  };

  // Signaler l'arrivée chez le client
  const handleArrived = async () => {
    if (arriving) return;
    
    setArriving(true);
    try {
      const orderId = delivery?.id || delivery?.order_id;
      if (orderId) {
        await arriveAtCustomer(orderId);
        console.log('✅ Arrivée chez le client signalée');
      }
      // Naviguer vers l'écran de code de confirmation
      navigation.navigate('ConfirmationCode', { delivery });
    } catch (error) {
      console.error('Erreur arrivée client:', error);
      // Même en cas d'erreur, permettre de continuer
      Alert.alert(
        'Information',
        'Erreur de synchronisation. Vous pouvez continuer.',
        [{ text: 'OK', onPress: () => navigation.navigate('ConfirmationCode', { delivery }) }]
      );
    } finally {
      setArriving(false);
    }
  };

  const estimatedTime = Math.ceil(
    Math.sqrt(
      Math.pow(customerLocation.latitude - driverLocation.latitude, 2) +
      Math.pow(customerLocation.longitude - driverLocation.longitude, 2)
    ) * 1000
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement de la course...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_DEFAULT : undefined}
          initialRegion={{
            latitude: (driverLocation.latitude + customerLocation.latitude) / 2,
            longitude: (driverLocation.longitude + customerLocation.longitude) / 2,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          {/* Driver marker */}
          <Marker coordinate={driverLocation}>
            <View style={styles.driverMarker}>
              <Ionicons name="bicycle" size={20} color="#FFFFFF" />
            </View>
          </Marker>

          {/* Customer marker */}
          <Marker coordinate={customerLocation}>
            <View style={styles.customerMarker}>
              <Ionicons name="location" size={20} color="#FFFFFF" />
            </View>
          </Marker>

          {/* Route line */}
          <Polyline
            coordinates={[driverLocation, customerLocation]}
            strokeColor={COLORS.error}
            strokeWidth={4}
          />
        </MapView>

        {/* Top info bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.etaContainer}>
            <Ionicons name="time-outline" size={16} color={COLORS.error} />
            <Text style={styles.etaText}>{estimatedTime || 5} min</Text>
          </View>
          <TouchableOpacity style={styles.problemBtn} onPress={handleProblem}>
            <Ionicons name="warning-outline" size={24} color={COLORS.warning} />
          </TouchableOpacity>
        </View>

        {/* Status badge */}
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Commande en cours de livraison</Text>
        </View>

        {/* Navigation button */}
        <TouchableOpacity style={styles.navButton} onPress={openExternalNavigation}>
          <Ionicons name="navigate" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Center button */}
        <TouchableOpacity 
          style={styles.centerButton}
          onPress={() => mapRef.current?.fitToCoordinates([driverLocation, customerLocation], {
            edgePadding: { top: 100, right: 50, bottom: 250, left: 50 },
            animated: true,
          })}
        >
          <Ionicons name="scan-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Info Panel */}
      <View style={styles.infoPanel}>
        <View style={styles.infoPanelHeader}>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotCompleted]}>
              <Ionicons name="checkmark" size={8} color="#FFFFFF" />
            </View>
            <View style={[styles.stepLine, styles.stepLineActive]} />
            <View style={[styles.stepDot, styles.stepDotActive]} />
          </View>
          <View style={styles.stepLabels}>
            <Text style={styles.stepLabelCompleted}>Récupération ✓</Text>
            <Text style={styles.stepLabelActive}>Livraison</Text>
          </View>
        </View>

        <View style={styles.customerInfo}>
          <View style={styles.customerIcon}>
            <Ionicons name="person" size={24} color={COLORS.error} />
          </View>
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>
              {delivery?.customer?.name || delivery?.client_first_name && delivery?.client_last_name 
                ? `${delivery.client_first_name} ${delivery.client_last_name}`.trim()
                : 'Client'}
            </Text>
            {delivery?.customer?.address || delivery?.delivery_address?.address_line || delivery?.delivery_address?.address ? (
              <Text style={styles.customerAddress}>
                {delivery?.customer?.address || delivery?.delivery_address?.address_line || delivery?.delivery_address?.address}
              </Text>
            ) : null}
            {delivery?.customer?.area || delivery?.delivery_address?.district || delivery?.delivery_address?.area ? (
              <Text style={styles.customerArea}>
                Quartier: {delivery?.customer?.area || delivery?.delivery_address?.district || delivery?.delivery_address?.area}
              </Text>
            ) : null}
            {delivery?.customer?.landmark || delivery?.delivery_address?.landmark ? (
              <Text style={styles.customerLandmark}>
                Repère: {delivery?.customer?.landmark || delivery?.delivery_address?.landmark}
              </Text>
            ) : null}
            {(delivery?.customer?.phone || delivery?.client_phone) ? (
              <Text style={styles.customerPhone}>
                📞 {delivery?.customer?.phone || delivery?.client_phone}
              </Text>
            ) : (
              <Text style={styles.customerPhoneMissing}>
                ⚠️ Numéro non disponible
              </Text>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.callButton, !(delivery?.customer?.phone || delivery?.client_phone) && styles.callButtonDisabled]} 
            onPress={callCustomer}
            disabled={!(delivery?.customer?.phone || delivery?.client_phone)}
          >
            <Ionicons 
              name="call" 
              size={20} 
              color={(delivery?.customer?.phone || delivery?.client_phone) ? COLORS.error : COLORS.textLight} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.orderInfo}>
          <Ionicons name="cube-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.orderInfoText}>
            Commande #{delivery?.order_number || delivery?.id || 'BAIB-12345'} • {delivery?.order_type === 'express' ? 'Livraison express' : (delivery?.restaurant?.name || 'Restaurant')}
          </Text>
        </View>
        
        {/* Informations restaurant / point de collecte (optionnel, pour rappel) */}
        {delivery?.restaurant?.name && (
          <View style={styles.restaurantInfo}>
            <View style={styles.restaurantIcon}>
              {delivery?.order_type !== 'express' && delivery?.restaurant?.logo ? (
                <Image 
                  source={{ uri: normalizeImageUrl(delivery.restaurant.logo) }} 
                  style={styles.restaurantLogo}
                  resizeMode="cover"
                  onError={(error) => {
                    console.warn('Erreur chargement logo restaurant:', error);
                  }}
                />
              ) : (
                <Ionicons name={delivery?.order_type === 'express' ? 'cube' : 'restaurant'} size={18} color={COLORS.primary} />
              )}
            </View>
            <View style={styles.restaurantDetails}>
              <Text style={styles.restaurantName}>
                {delivery?.order_type === 'express' ? 'Point de collecte' : delivery.restaurant.name}
              </Text>
              {delivery?.restaurant?.address ? (
                <Text style={styles.restaurantAddress}>{delivery.restaurant.address}</Text>
              ) : (
                <Text style={styles.restaurantAddressMissing}>⚠️ Adresse non disponible</Text>
              )}
              {(delivery?.restaurant?.phone || delivery?.client_phone) ? (
                <Text style={styles.restaurantPhone}>📞 {delivery?.restaurant?.phone || delivery?.client_phone}</Text>
              ) : (
                <Text style={styles.restaurantPhoneMissing}>⚠️ Numéro non disponible</Text>
              )}
            </View>
            {(delivery?.restaurant?.phone || delivery?.client_phone) && (
              <TouchableOpacity 
                style={styles.callRestaurantButton}
                onPress={() => {
                  const phone = delivery?.restaurant?.phone || delivery?.client_phone;
                  if (phone) {
                    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
                  }
                }}
              >
                <Ionicons name="call" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Montant total à payer (visible dans l'application client) */}
        <View style={styles.orderTotalInfo}>
          <View style={styles.totalHeader}>
            <Ionicons name="receipt-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.totalTitle}>Montant total à payer</Text>
          </View>
          <View style={styles.totalAmountContainer}>
            <Text style={styles.totalAmount}>
              {Number.parseFloat(delivery?.total || 0).toLocaleString('fr-FR', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })} FCFA
            </Text>
          </View>
        </View>

        {/* Mode de paiement */}
        <View style={[
          styles.paymentMethodInfo,
          delivery?.payment_method === 'cash' 
            ? { borderLeftColor: COLORS.warning }
            : { borderLeftColor: COLORS.success }
        ]}>
          {delivery?.payment_method === 'cash' ? (
            <>
              <Ionicons name="cash-outline" size={18} color={COLORS.warning} />
              <Text style={styles.paymentMethodText}>
                <Text style={styles.paymentMethodLabel}>Paiement en espèces</Text>
                {'\n'}
                <Text style={styles.paymentMethodAmount}>Montant à collecter : {(delivery?.total || 0).toLocaleString('fr-FR')} FCFA</Text>
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="card-outline" size={18} color={COLORS.success} />
              <Text style={styles.paymentMethodText}>
                <Text style={styles.paymentMethodLabel}>Paiement déjà effectué</Text>
                {'\n'}
                <Text style={styles.paymentMethodSubtext}>
                  {delivery?.payment_method === 'waves' ? 'Wave' : delivery?.payment_method === 'orange_money' ? 'Orange Money' : delivery?.payment_method === 'mtn_money' ? 'MTN MoMo' : delivery?.payment_method === 'moov_money' ? 'Moov Money' : 'Mobile Money'}
                </Text>
              </Text>
            </>
          )}
        </View>

        <View style={styles.earningsPreview}>
          <Ionicons name="cash-outline" size={18} color={COLORS.success} />
          <Text style={styles.earningsText}>
            Vous gagnerez <Text style={styles.earningsAmount}>{delivery?.earnings?.toLocaleString() || 1750} F</Text> à la livraison
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.arrivedButton, arriving && styles.arrivedButtonDisabled]}
          onPress={handleArrived}
          disabled={arriving}
        >
          {arriving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
          )}
          <Text style={styles.arrivedButtonText}>
            {arriving ? 'SIGNALEMENT EN COURS...' : 'JE SUIS ARRIVÉ CHEZ LE CLIENT'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  customerMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  topBar: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  etaText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  problemBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusBadge: {
    position: 'absolute',
    top: 70,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.error + '15',
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.error,
  },
  navButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.info,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  centerButton: {
    position: 'absolute',
    bottom: 16,
    right: 80,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoPanel: { 
    backgroundColor: COLORS.white, 
    padding: 20,
    paddingBottom: 32,
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  infoPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepIndicator: {
    alignItems: 'center',
    marginRight: 12,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: COLORS.error,
  },
  stepDotCompleted: {
    backgroundColor: COLORS.success,
  },
  stepLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.border,
  },
  stepLineActive: {
    backgroundColor: COLORS.success,
  },
  stepLabels: {
    gap: 16,
  },
  stepLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  stepLabelActive: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.error,
  },
  stepLabelCompleted: {
    fontSize: 12,
    color: COLORS.success,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  customerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  customerArea: { 
    fontSize: 14, 
    fontWeight: '500',
    color: COLORS.text, 
    marginTop: 2
  },
  customerLandmark: { 
    fontSize: 12, 
    color: COLORS.textSecondary, 
    marginTop: 2
  },
  customerPhone: {
    fontSize: 13,
    color: COLORS.error,
    marginTop: 4,
    fontWeight: '500',
  },
  customerPhoneMissing: {
    fontSize: 12,
    color: COLORS.warning,
    marginTop: 4,
    fontStyle: 'italic',
  },
  customerAddress: {
    fontSize: 13,
    color: COLORS.text,
    marginTop: 2,
    fontWeight: '500',
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  restaurantIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  restaurantLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  restaurantAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  restaurantAddressMissing: {
    fontSize: 11,
    color: COLORS.warning,
    marginTop: 2,
    fontStyle: 'italic',
  },
  restaurantPhone: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  restaurantPhoneMissing: {
    fontSize: 11,
    color: COLORS.warning,
    marginTop: 4,
    fontStyle: 'italic',
  },
  callRestaurantButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 3,
  },
  paymentMethodText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  paymentMethodLabel: {
    fontWeight: '600',
    color: COLORS.text,
  },
  paymentMethodAmount: {
    fontWeight: 'bold',
    color: COLORS.warning,
    fontSize: 14,
  },
  paymentMethodSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  orderTotalInfo: {
    backgroundColor: COLORS.info + '08',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.info + '30',
  },
  totalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  totalTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalAmountContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.info,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButtonDisabled: {
    backgroundColor: COLORS.border + '30',
    opacity: 0.5,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  orderInfoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  earningsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.success + '10',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  earningsText: {
    fontSize: 13,
    color: COLORS.text,
  },
  earningsAmount: {
    fontWeight: 'bold',
    color: COLORS.success,
  },
  arrivedButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.error, 
    paddingVertical: 16, 
    borderRadius: 14,
  },
  arrivedButtonDisabled: {
    backgroundColor: COLORS.error + '80',
  },
  arrivedButtonText: { 
    color: '#FFFFFF', 
    fontSize: 15, 
    fontWeight: 'bold' 
  },
});

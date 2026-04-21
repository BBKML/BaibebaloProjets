import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
// MapView natif désactivé (clé Google Maps API non configurée - crash APK)
import { COLORS } from '../../constants/colors';
import { arriveAtRestaurant, getOrderDetail, trackOrder } from '../../api/orders';
import { orderToDeliveryShape } from '../../utils/orderToDelivery';
import { updateLocation } from '../../api/delivery';
import soundService from '../../services/soundService';
import { getImageUrl } from '../../utils/url';

const KORHOGO_FALLBACK = { latitude: 9.4580, longitude: -5.6294 };

export default function NavigationToRestaurantScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const initialDelivery = route.params?.delivery;
  const orderIdParam = route.params?.orderId;
  const mapRef = useRef(null);
  const [delivery, setDelivery] = useState(initialDelivery || null);
  const [loading, setLoading] = useState(!!orderIdParam);
  const [arriving, setArriving] = useState(false);
  const [driverLocation, setDriverLocation] = useState(KORHOGO_FALLBACK);
  const locationSubscription = useRef(null);

  // Charger le détail de la commande depuis l'API pour s'assurer d'avoir toutes les informations
  useEffect(() => {
    // Déterminer l'ID de la commande à charger
    const orderId = orderIdParam || initialDelivery?.id || initialDelivery?.order_id;
    
    // Si on a déjà initialDelivery avec toutes les infos restaurant, on peut l'utiliser
    const hasCompleteRestaurantInfo = initialDelivery?.restaurant?.name && 
                                      initialDelivery?.restaurant?.address && 
                                      initialDelivery?.restaurant?.phone;
    
    if (!orderId) {
      if (initialDelivery) setDelivery(initialDelivery);
      setLoading(false);
      return;
    }
    
    // Toujours recharger les données depuis l'API pour s'assurer d'avoir les informations complètes
    // Utiliser initialDelivery comme valeur par défaut pendant le chargement
    if (initialDelivery) {
      setDelivery(initialDelivery);
      if (__DEV__) console.log('📦 Utilisation initialDelivery temporaire, rechargement depuis API...');
    }
    
    setLoading(true);
    let cancelled = false;
    // Essayer d'abord getOrderDetail, puis trackOrder en fallback
    getOrderDetail(orderId)
      .then((res) => {
        if (cancelled) return;
        const order = res?.data?.order || res?.order || res?.data;
        if (__DEV__) console.log('📦 getOrderDetail ok:', order?.order_number);
        const deliveryData = orderToDeliveryShape(order);
        if (__DEV__) console.log('🚚 Delivery transformée:', deliveryData?.id);
        
        // Vérifier que les informations sont complètes (express: pas de phone requis au point de collecte)
        const isExpressOrder = deliveryData?.order_type === 'express';
        const needsMore = isExpressOrder
          ? !deliveryData?.restaurant?.address
          : (!deliveryData?.restaurant?.name || !deliveryData?.restaurant?.address || !deliveryData?.restaurant?.phone);
        if (needsMore) {
          if (__DEV__) console.warn('⚠️ Informations incomplètes après getOrderDetail, tentative trackOrder...');
          // Essayer trackOrder pour obtenir les informations complètes
          return trackOrder(orderId);
        } else {
          setDelivery(deliveryData);
          if (!cancelled) setLoading(false);
          return null; // Ne pas continuer avec trackOrder
        }
      })
      .catch((err) => {
        if (cancelled) return null;
        // Si getOrderDetail échoue (ex: accès interdit), essayer trackOrder
        if (__DEV__) console.warn('getOrderDetail échoué, tentative avec trackOrder:', err?.message || err);
        return trackOrder(orderId);
      })
      .then((res) => {
        // Si on arrive ici, c'est qu'on essaie trackOrder (soit après échec, soit après infos incomplètes)
        if (cancelled || !res) {
          if (!cancelled) setLoading(false);
          return;
        }
        const order = res?.data?.order || res?.order || res?.data;
        if (__DEV__) console.log('📦 trackOrder ok:', order?.order_number);
        const deliveryData = orderToDeliveryShape(order);
        if (__DEV__) console.log('🚚 Delivery transformée (trackOrder):', deliveryData?.id);
        
        // Mettre à jour même si certaines infos manquent (mieux que rien)
        setDelivery(deliveryData);
        
        // Avertir si les informations sont toujours incomplètes
        const isExpressAfter = deliveryData?.order_type === 'express';
        const stillIncomplete = isExpressAfter
          ? !deliveryData?.restaurant?.address
          : (!deliveryData?.restaurant?.name || !deliveryData?.restaurant?.address || !deliveryData?.restaurant?.phone);
        if (stillIncomplete && __DEV__) console.warn('⚠️ Informations toujours incomplètes après trackOrder');
        
        if (!cancelled) setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          if (__DEV__) console.warn('⚠️ Tous les endpoints ont échoué:', err?.message || err);
          // Si tout échoue, utiliser initialDelivery s'il existe
          if (initialDelivery) {
            setDelivery(initialDelivery);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [orderIdParam, initialDelivery]);

  const isExpress = delivery?.order_type === 'express';
  const restaurantLocation = {
    latitude: delivery?.restaurant?.latitude ?? KORHOGO_FALLBACK.latitude,
    longitude: delivery?.restaurant?.longitude ?? KORHOGO_FALLBACK.longitude,
  };

  // GPS réel : position du livreur + envoi au backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const getLocation = () => Location.getCurrentPositionAsync(
          { accuracy: Location.Accuracy.Balanced }
        );
        let loc;
        try {
          loc = await getLocation();
        } catch (firstErr) {
          await new Promise(r => setTimeout(r, 2000));
          if (cancelled) return;
          loc = await getLocation();
        }
        if (!cancelled && loc) setDriverLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (cancelled) return;
        locationSubscription.current = Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 20 },
          (l) => {
            if (cancelled) return;
            setDriverLocation({ latitude: l.coords.latitude, longitude: l.coords.longitude });
            updateLocation(l.coords.latitude, l.coords.longitude).catch(() => {});
          }
        );
      } catch (e) {
        if (!cancelled && __DEV__) console.warn('GPS:', e?.message || e);
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
    const lat = restaurantLocation.latitude;
    const lng = restaurantLocation.longitude;
    const label = isExpress ? 'Point de collecte' : (delivery?.restaurant?.name || 'Restaurant');
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(label)}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
    });
    Linking.canOpenURL(url).then(supported => {
      if (supported) Linking.openURL(url);
      else Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    }).catch(() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`));
  };

  const callPickupContact = () => {
    const phone = delivery?.restaurant?.phone || delivery?.client_phone;
    if (!phone) {
      Alert.alert('Information', isExpress ? 'Le numéro de l\'expéditeur n\'est pas disponible' : 'Le numéro du restaurant n\'est pas disponible');
      return;
    }
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  };

  const handleProblem = () => {
    const callLabel = isExpress ? 'Appeler l\'expéditeur' : 'Appeler le restaurant';
    Alert.alert(
      'Signaler un problème',
      'Que voulez-vous faire ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: callLabel, onPress: callPickupContact },
        { text: 'Contacter le support', onPress: () => navigation.navigate('SupportChat') },
      ]
    );
  };

  // Signaler l'arrivée au restaurant
  const handleArrived = async () => {
    if (arriving) return;
    
    setArriving(true);
    try {
      const orderId = delivery?.id || delivery?.order_id;
      if (orderId) {
        await arriveAtRestaurant(orderId);
        soundService.alertOrderReady(); // Même retour son/vibration que pour "commande prête"
      }
      navigation.navigate('OrderVerification', { delivery });
    } catch (error) {
      if (__DEV__) console.warn('Erreur arrivée restaurant:', error?.message || error);
      // Même en cas d'erreur, permettre de continuer
      Alert.alert(
        'Information',
        'Connexion interrompue. Vous pouvez continuer.',
        [{ text: 'OK', onPress: () => navigation.navigate('OrderVerification', { delivery }) }]
      );
    } finally {
      setArriving(false);
    }
  };

  const estimatedTime = Math.ceil(
    Math.sqrt(
      Math.pow(restaurantLocation.latitude - driverLocation.latitude, 2) +
      Math.pow(restaurantLocation.longitude - driverLocation.longitude, 2)
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
      {/* Navigation Card (remplace MapView natif) */}
      <View style={styles.mapContainer}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.etaContainer}>
            <Ionicons name="time-outline" size={16} color={COLORS.primary} />
            <Text style={styles.etaText}>{estimatedTime || 5} min</Text>
          </View>
          <TouchableOpacity style={styles.problemBtn} onPress={handleProblem}>
            <Ionicons name="warning-outline" size={24} color={COLORS.warning} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.mapFallback} onPress={openExternalNavigation} activeOpacity={0.8}>
          <Ionicons name="navigate-circle" size={56} color={COLORS.primary} />
          <Text style={styles.mapFallbackTitle}>Naviguer vers le restaurant</Text>
          <Text style={styles.mapFallbackHint}>Appuyez pour ouvrir dans Google Maps</Text>
          <Text style={styles.mapFallbackAddress} numberOfLines={2}>
            {delivery?.restaurant?.address || 'Adresse de collecte'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info Panel */}
      <View style={[styles.infoPanel, { paddingBottom: Math.max(insets.bottom, 32) }]}>
        <View style={styles.infoPanelHeader}>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={styles.stepLine} />
            <View style={styles.stepDot} />
          </View>
          <View style={styles.stepLabels}>
            <Text style={styles.stepLabelActive}>Récupération</Text>
            <Text style={styles.stepLabel}>Livraison</Text>
          </View>
        </View>

        <View style={styles.restaurantInfo}>
          <View style={styles.restaurantIcon}>
            {!isExpress && delivery?.restaurant?.logo ? (
              <Image 
                source={{ uri: getImageUrl(delivery.restaurant.logo) }} 
                style={styles.restaurantLogo}
                resizeMode="cover"
                onError={() => {}}
              />
            ) : (
              <Ionicons name={isExpress ? 'cube' : 'restaurant'} size={24} color={COLORS.primary} />
            )}
          </View>
          <View style={styles.restaurantDetails}>
            <Text style={styles.restaurantName}>
              {isExpress ? 'Point de collecte' : (delivery?.restaurant?.name || 'Restaurant')}
            </Text>
            {(delivery?.restaurant?.address || isExpress) ? (
              <Text style={styles.restaurantAddress}>
                {delivery?.restaurant?.address || 'Adresse de collecte'}
              </Text>
            ) : (
              <Text style={styles.restaurantAddressMissing}>
                ⚠️ Adresse non disponible
              </Text>
            )}
            {(delivery?.restaurant?.phone || delivery?.client_phone) ? (
              <Text style={styles.restaurantPhone}>
                📞 {delivery?.restaurant?.phone || delivery?.client_phone}
              </Text>
            ) : (
              <Text style={styles.restaurantPhoneMissing}>
                ⚠️ Numéro non disponible
              </Text>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.callButton, !(delivery?.restaurant?.phone || delivery?.client_phone) && styles.callButtonDisabled]} 
            onPress={callPickupContact}
            disabled={!(delivery?.restaurant?.phone || delivery?.client_phone)}
          >
            <Ionicons name="call" size={20} color={(delivery?.restaurant?.phone || delivery?.client_phone) ? COLORS.primary : COLORS.textLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.orderInfo}>
          <Ionicons name="receipt-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.orderInfoText}>Commande #{delivery?.order_number || delivery?.id || 'BAIB-12345'}</Text>
          <View style={styles.earningsContainer}>
            <Text style={styles.earningsLabel}>Gains:</Text>
            <Text style={styles.orderEarnings}>
              +{delivery?.earnings ? Math.round(Number.parseFloat(delivery.earnings)).toLocaleString('fr-FR') : '0'} FCFA
            </Text>
          </View>
        </View>

        {/* Frais de livraison */}
        <View style={styles.deliveryFeeInfo}>
          <View style={styles.deliveryFeeHeader}>
            <Ionicons name="bicycle-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.deliveryFeeTitle}>Frais de livraison</Text>
          </View>
          <Text style={styles.deliveryFeeAmount}>
            {(Number.parseFloat(delivery?.delivery_fee ?? 0) || 0) === 0
              ? 'Livraison gratuite'
              : `${Math.round(Number.parseFloat(delivery?.delivery_fee || 0)).toLocaleString('fr-FR')} FCFA`}
          </Text>
          {delivery?.delivery_distance && (
            <Text style={styles.deliveryFeeDistance}>
              Distance : {Number.parseFloat(delivery.delivery_distance).toFixed(2)} km
            </Text>
          )}
        </View>

        {/* Revenu net (restaurant) - Uniquement pour commandes food */}
        {!isExpress && (
        <View style={styles.restaurantRevenueInfo}>
          <View style={styles.revenueHeader}>
            <Ionicons name="storefront-outline" size={18} color={COLORS.primary} />
            <Text style={styles.revenueTitle}>Revenu net (restaurant)</Text>
          </View>
            <View style={styles.revenueAmountContainer}>
              <Text style={styles.revenueAmount}>
                {Math.round(Number.parseFloat(delivery.restaurant_net_revenue || 0)).toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
            {delivery?.restaurant_subtotal && (
              <Text style={styles.revenueDetails}>
                Sous-total: {Number.parseFloat(delivery.restaurant_subtotal).toLocaleString('fr-FR')} FCFA
                {delivery?.restaurant_commission && (
                  <> • Commission: {Number.parseFloat(delivery.restaurant_commission).toLocaleString('fr-FR')} FCFA</>
                )}
              </Text>
            )}
        </View>
        )}


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
            {arriving ? 'SIGNALEMENT EN COURS...' : (isExpress ? 'JE SUIS ARRIVÉ AU POINT DE COLLECTE' : 'JE SUIS ARRIVÉ AU RESTAURANT')}
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
    backgroundColor: '#f0f4ff',
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  mapFallbackTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
    textAlign: 'center',
  },
  mapFallbackHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  mapFallbackAddress: {
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
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
  restaurantMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.success,
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
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
  },
  stepLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.border,
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
    color: COLORS.primary,
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  restaurantIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  restaurantLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: COLORS.text 
  },
  restaurantAddress: { 
    fontSize: 13, 
    color: COLORS.textSecondary, 
    marginTop: 2
  },
  restaurantAddressMissing: {
    fontSize: 12,
    color: COLORS.warning,
    marginTop: 2,
    fontStyle: 'italic',
  },
  restaurantPhone: {
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  restaurantPhoneMissing: {
    fontSize: 12,
    color: COLORS.warning,
    marginTop: 4,
    fontStyle: 'italic',
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '15',
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
    marginBottom: 16,
  },
  orderInfoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  earningsContainer: {
    alignItems: 'flex-end',
  },
  earningsLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  orderEarnings: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  deliveryFeeInfo: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deliveryFeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  deliveryFeeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deliveryFeeAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  deliveryFeeDistance: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  restaurantRevenueInfo: {
    backgroundColor: COLORS.primary + '08',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  revenueTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  revenueAmountContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  revenueAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  revenueDetails: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
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
  arrivedButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary, 
    paddingVertical: 16, 
    borderRadius: 14,
  },
  arrivedButtonDisabled: {
    backgroundColor: COLORS.primary + '80',
  },
  arrivedButtonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});

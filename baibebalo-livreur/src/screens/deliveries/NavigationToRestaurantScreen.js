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
      {/* Zone de Navigation — style Glovo */}
      <View style={[styles.navZone, { backgroundColor: COLORS.primary }]}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.etaChip}>
            <Ionicons name="time-outline" size={14} color="#FFFFFF" />
            <Text style={styles.etaChipText}>~{estimatedTime || 5} min</Text>
          </View>
          <TouchableOpacity style={styles.topBtn} onPress={handleProblem}>
            <Ionicons name="warning-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.navContent}>
          <View style={styles.navIconBg}>
            <Ionicons name={isExpress ? 'cube' : 'restaurant'} size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.navLabel}>EN ROUTE VERS</Text>
          <Text style={styles.navTitle} numberOfLines={1}>
            {isExpress ? 'Point de collecte' : (delivery?.restaurant?.name || 'Restaurant')}
          </Text>
          {delivery?.restaurant?.address ? (
            <Text style={styles.navAddress} numberOfLines={1}>{delivery.restaurant.address}</Text>
          ) : null}
        </View>

        <TouchableOpacity style={styles.gpsButton} onPress={openExternalNavigation} activeOpacity={0.85}>
          <Ionicons name="navigate" size={18} color={COLORS.primary} />
          <Text style={styles.gpsButtonText}>Ouvrir Google Maps</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Barre de progression */}
      <View style={styles.progressBar}>
        {[
          { label: 'Départ', icon: 'bicycle-outline', active: true, done: false },
          { label: 'Restaurant', icon: 'restaurant-outline', active: false, done: false },
          { label: 'En route', icon: 'navigate-outline', active: false, done: false },
          { label: 'Livré', icon: 'checkmark-circle-outline', active: false, done: false },
        ].map((step, i, arr) => (
          <React.Fragment key={step.label}>
            <View style={styles.progressStep}>
              <View style={[styles.progressBubble, step.active && styles.progressBubbleActive]}>
                <Ionicons name={step.icon} size={14} color={step.active ? '#FFFFFF' : COLORS.border} />
              </View>
              <Text style={[styles.progressLabel, step.active && styles.progressLabelActive]}>{step.label}</Text>
            </View>
            {i < arr.length - 1 && <View style={styles.progressConnector} />}
          </React.Fragment>
        ))}
      </View>

      {/* Info Panel simplifié */}
      <View style={styles.infoPanel}>
        {/* Card destination */}
        <View style={styles.destinationCard}>
          <View style={styles.destinationIconBg}>
            {!isExpress && delivery?.restaurant?.logo ? (
              <Image source={{ uri: getImageUrl(delivery.restaurant.logo) }} style={styles.destinationLogo} resizeMode="cover" onError={() => {}} />
            ) : (
              <Ionicons name={isExpress ? 'cube' : 'restaurant'} size={22} color={COLORS.primary} />
            )}
          </View>
          <View style={styles.destinationInfo}>
            <Text style={styles.destinationName} numberOfLines={1}>
              {isExpress ? 'Point de collecte' : (delivery?.restaurant?.name || 'Restaurant')}
            </Text>
            <Text style={styles.destinationAddress} numberOfLines={1}>
              {delivery?.restaurant?.address || 'Adresse non disponible'}
            </Text>
            <Text style={styles.orderRef}>#{delivery?.order_number || delivery?.id || '–'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.callBtn, !(delivery?.restaurant?.phone || delivery?.client_phone) && styles.callBtnDisabled]}
            onPress={callPickupContact}
            disabled={!(delivery?.restaurant?.phone || delivery?.client_phone)}
          >
            <Ionicons name="call" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Bannière espèces — très visible */}
        {delivery?.payment_method === 'cash' && (
          <View style={styles.cashBanner}>
            <Ionicons name="cash" size={24} color="#FFFFFF" />
            <View style={styles.cashBannerText}>
              <Text style={styles.cashBannerTitle}>ESPÈCES À COLLECTER</Text>
              <Text style={styles.cashBannerAmount}>{(delivery?.total || 0).toLocaleString('fr-FR')} FCFA</Text>
            </View>
          </View>
        )}

        {/* Gains */}
        <View style={styles.earningsBadge}>
          <Ionicons name="cash-outline" size={16} color={COLORS.success} />
          <Text style={styles.earningsText}>
            Vous gagnerez{' '}
            <Text style={styles.earningsAmount}>
              +{delivery?.earnings ? Math.round(Number.parseFloat(delivery.earnings)).toLocaleString('fr-FR') : '0'} FCFA
            </Text>
          </Text>
        </View>

        {/* Bouton arrivée */}
        <TouchableOpacity
          style={[styles.arrivedButton, arriving && styles.arrivedButtonDisabled]}
          onPress={handleArrived}
          disabled={arriving}
          activeOpacity={0.85}
        >
          {arriving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="checkmark-circle" size={26} color="#FFFFFF" />
          )}
          <Text style={styles.arrivedButtonText}>
            {arriving ? 'SIGNALEMENT EN COURS...' : (isExpress ? 'JE SUIS AU POINT DE COLLECTE' : 'JE SUIS ARRIVÉ AU RESTAURANT')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 16, color: COLORS.textSecondary },

  // ── Zone Navigation ───────────────────────────────────────────
  navZone: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  etaChipText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  navContent: { alignItems: 'center', marginBottom: 16 },
  navIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  navTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 4 },
  navAddress: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
  },
  gpsButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.primary, flex: 1, textAlign: 'center' },

  // ── Barre de progression ──────────────────────────────────────
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  progressStep: { alignItems: 'center', gap: 4 },
  progressBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  progressBubbleActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  progressLabel: { fontSize: 9, color: COLORS.textLight, textAlign: 'center', maxWidth: 52 },
  progressLabelActive: { color: COLORS.primary, fontWeight: '700' },
  progressConnector: { flex: 1, height: 2, backgroundColor: COLORS.border, marginBottom: 16 },

  // ── Info Panel ────────────────────────────────────────────────
  infoPanel: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 20,
    gap: 12,
  },
  destinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.background,
    padding: 14,
    borderRadius: 14,
  },
  destinationIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  destinationLogo: { width: 48, height: 48, borderRadius: 12 },
  destinationInfo: { flex: 1 },
  destinationName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  destinationAddress: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 3 },
  orderRef: { fontSize: 11, color: COLORS.textLight },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtnDisabled: { backgroundColor: COLORS.border, opacity: 0.5 },
  cashBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F59E0B',
    padding: 16,
    borderRadius: 12,
  },
  cashBannerText: { flex: 1 },
  cashBannerTitle: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1, marginBottom: 2 },
  cashBannerAmount: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  earningsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.success + '12',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  earningsText: { fontSize: 13, color: COLORS.text, flex: 1 },
  earningsAmount: { fontWeight: '700', color: COLORS.success },
  arrivedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 'auto',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  arrivedButtonDisabled: { opacity: 0.6 },
  arrivedButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  // (styles map/marker conservés pour compatibilité future)
  mapContainer: { flex: 1, position: 'relative', backgroundColor: '#f0f4ff' },
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    maxHeight: '55%',
  },
  infoPanelScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
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
    marginHorizontal: 20,
    marginVertical: 16,
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

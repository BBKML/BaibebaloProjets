import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
// MapView natif désactivé (clé Google Maps API non configurée - crash APK)
import { COLORS } from '../../constants/colors';
import { arriveAtCustomer, getOrderDetail, trackOrder } from '../../api/orders';
import { orderToDeliveryShape } from '../../utils/orderToDelivery';
import { updateLocation } from '../../api/delivery';
import soundService from '../../services/soundService';
import { getImageUrl } from '../../utils/url';

const KORHOGO_FALLBACK = { latitude: 9.4580, longitude: -5.6294 };

// Fonction helper pour normaliser l'URL de l'image avec fallback
const normalizeImageUrl = (url) => {
  if (!url) return null;
  try {
    return getImageUrl ? getImageUrl(url) : url;
  } catch (error) {
    if (__DEV__) console.warn('Erreur normalisation URL image:', error?.message || error);
    return url;
  }
};

export default function NavigationToCustomerScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
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
        if (__DEV__) console.log('📦 Données commande reçues (getOrderDetail - client):', order?.order_number);
        const deliveryData = orderToDeliveryShape(order);
        if (__DEV__) console.log('🚚 Données delivery transformées (client):', deliveryData?.order_number);
        setDelivery(deliveryData);
        if (!cancelled) setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        // Si getOrderDetail échoue (ex: accès interdit), essayer trackOrder
        if (__DEV__) console.warn('getOrderDetail échoué, tentative avec trackOrder:', err?.message || err);
        return trackOrder(orderIdParam);
      })
      .then((res) => {
        if (cancelled || !res) return;
        const order = res?.data?.order || res?.order || res?.data;
        if (__DEV__) console.log('📦 Données commande reçues (trackOrder - client):', order?.order_number);
        const deliveryData = orderToDeliveryShape(order);
        if (__DEV__) console.log('🚚 Données delivery transformées (trackOrder):', deliveryData?.order_number);
        setDelivery(deliveryData);
      })
      .catch((err) => {
        if (!cancelled && __DEV__) console.warn('Erreur chargement commande:', err?.message || err);
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
    if (__DEV__) console.log('📞 Appel client déclenché');
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
        { text: 'Adresse incorrecte', onPress: () => navigation.navigate('WrongAddress', { delivery }) },
        { text: 'Contacter le support', onPress: () => navigation.navigate('SupportChat') },
      ]
    );
  };

  const handleCustomerAbsent = () => {
    navigation.navigate('ClientAbsent', { delivery });
  };

  // Signaler l'arrivée chez le client
  const handleArrived = async () => {
    if (arriving) return;
    
    setArriving(true);
    try {
      const orderId = delivery?.id || delivery?.order_id;
      if (orderId) {
        await arriveAtCustomer(orderId);
        soundService.alertOrderReady(); // Même retour son/vibration que pour "commande prête"
      }
      navigation.navigate('DeliveryProofPhoto', { delivery });
    } catch (error) {
      if (__DEV__) console.warn('Erreur arrivée client:', error?.message || error);
      Alert.alert(
        'Information',
        'Connexion interrompue. Vous pouvez continuer.',
        [{ text: 'OK', onPress: () => navigation.navigate('DeliveryProofPhoto', { delivery }) }]
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

  const customerName = delivery?.customer?.name
    || (delivery?.client_first_name ? `${delivery.client_first_name} ${delivery.client_last_name || ''}`.trim() : 'Client');
  const customerAddress = delivery?.customer?.address
    || delivery?.delivery_address?.address_line
    || delivery?.delivery_address?.street
    || 'Adresse de livraison';
  const customerArea = delivery?.customer?.area || delivery?.delivery_address?.district || delivery?.delivery_address?.area;
  const customerLandmark = delivery?.customer?.landmark || delivery?.delivery_address?.landmark;

  return (
    <SafeAreaView style={styles.container}>
      {/* Zone de Navigation — style Glovo (rouge pour livraison) */}
      <View style={[styles.navZone, { backgroundColor: COLORS.error }]}>
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
            <Ionicons name="location" size={28} color={COLORS.error} />
          </View>
          <Text style={styles.navLabel}>EN ROUTE VERS LE CLIENT</Text>
          <Text style={styles.navTitle} numberOfLines={1}>{customerName}</Text>
          <Text style={styles.navAddress} numberOfLines={1}>{customerAddress}</Text>
          {customerArea ? <Text style={styles.navArea} numberOfLines={1}>📍 {customerArea}</Text> : null}
        </View>

        <TouchableOpacity style={styles.gpsButton} onPress={openExternalNavigation} activeOpacity={0.85}>
          <Ionicons name="navigate" size={18} color={COLORS.error} />
          <Text style={[styles.gpsButtonText, { color: COLORS.error }]}>Ouvrir Google Maps</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      {/* Barre de progression — étapes 1+2 complétées, étape 3 active */}
      <View style={styles.progressBar}>
        {[
          { label: 'Départ', icon: 'bicycle-outline', active: false, done: true },
          { label: 'Restaurant', icon: 'restaurant-outline', active: false, done: true },
          { label: 'En route', icon: 'navigate-outline', active: true, done: false },
          { label: 'Livré', icon: 'checkmark-circle-outline', active: false, done: false },
        ].map((step, i, arr) => (
          <React.Fragment key={step.label}>
            <View style={styles.progressStep}>
              <View style={[styles.progressBubble, step.active && styles.progressBubbleActive, step.done && styles.progressBubbleDone]}>
                <Ionicons name={step.done ? 'checkmark' : step.icon} size={14} color={(step.active || step.done) ? '#FFFFFF' : COLORS.border} />
              </View>
              <Text style={[styles.progressLabel, step.active && styles.progressLabelActive, step.done && styles.progressLabelDone]}>{step.label}</Text>
            </View>
            {i < arr.length - 1 && <View style={[styles.progressConnector, step.done && styles.progressConnectorDone]} />}
          </React.Fragment>
        ))}
      </View>

      {/* Info Panel simplifié */}
      <View style={[styles.infoPanel, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Card client */}
        <View style={styles.destinationCard}>
          <View style={[styles.destinationIconBg, { backgroundColor: COLORS.error + '15' }]}>
            <Ionicons name="person" size={22} color={COLORS.error} />
          </View>
          <View style={styles.destinationInfo}>
            <Text style={styles.destinationName} numberOfLines={1}>{customerName}</Text>
            <Text style={styles.destinationAddress} numberOfLines={1}>{customerAddress}</Text>
            {customerLandmark ? (
              <Text style={styles.destinationLandmark} numberOfLines={1}>Repère: {customerLandmark}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.callBtn, { backgroundColor: COLORS.error }, !(delivery?.customer?.phone || delivery?.client_phone) && styles.callBtnDisabled]}
            onPress={callCustomer}
            disabled={!(delivery?.customer?.phone || delivery?.client_phone)}
          >
            <Ionicons name="call" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Bannière espèces */}
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
              +{delivery?.earnings ? (typeof delivery.earnings === 'number' ? delivery.earnings : Number.parseFloat(delivery.earnings)).toLocaleString('fr-FR') : '0'} FCFA
            </Text>{' '}à la livraison
          </Text>
        </View>

        {/* Bouton arrivée */}
        <TouchableOpacity
          style={[styles.arrivedButton, { backgroundColor: COLORS.error }, arriving && styles.arrivedButtonDisabled]}
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
            {arriving ? 'SIGNALEMENT EN COURS...' : 'JE SUIS ARRIVÉ CHEZ LE CLIENT'}
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
  navZone: { paddingTop: 8, paddingBottom: 16, paddingHorizontal: 20 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  topBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  etaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  etaChipText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  navContent: { alignItems: 'center', marginBottom: 16 },
  navIconBg: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  navLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)', letterSpacing: 1.5, marginBottom: 4 },
  navTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 4 },
  navAddress: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 2 },
  navArea: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  gpsButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FFFFFF', paddingVertical: 12, borderRadius: 12,
  },
  gpsButtonText: { fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'center' },

  // ── Barre de progression ──────────────────────────────────────
  progressBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, paddingVertical: 12, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  progressStep: { alignItems: 'center', gap: 4 },
  progressBubble: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.border,
  },
  progressBubbleActive: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  progressBubbleDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  progressLabel: { fontSize: 9, color: COLORS.textLight, textAlign: 'center', maxWidth: 52 },
  progressLabelActive: { color: COLORS.error, fontWeight: '700' },
  progressLabelDone: { color: COLORS.success },
  progressConnector: { flex: 1, height: 2, backgroundColor: COLORS.border, marginBottom: 16 },
  progressConnectorDone: { backgroundColor: COLORS.success },

  // ── Info Panel ────────────────────────────────────────────────
  infoPanel: { flex: 1, backgroundColor: COLORS.white, padding: 20, gap: 12 },
  destinationCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.background, padding: 14, borderRadius: 14,
  },
  destinationIconBg: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  destinationInfo: { flex: 1 },
  destinationName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  destinationAddress: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 2 },
  destinationLandmark: { fontSize: 12, color: COLORS.textLight },
  callBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  callBtnDisabled: { opacity: 0.4 },
  cashBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F59E0B', padding: 16, borderRadius: 12,
  },
  cashBannerText: { flex: 1 },
  cashBannerTitle: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1, marginBottom: 2 },
  cashBannerAmount: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  earningsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.success + '12', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.success + '30',
  },
  earningsText: { fontSize: 13, color: COLORS.text, flex: 1 },
  earningsAmount: { fontWeight: '700', color: COLORS.success },
  arrivedButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 18, borderRadius: 16, marginTop: 'auto',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  arrivedButtonDisabled: { opacity: 0.6 },
  arrivedButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  // (styles map/marker conservés pour compatibilité future)
  mapContainer: { flex: 1, position: 'relative', backgroundColor: '#fff0f0' },
  mapContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#fff0f0',
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
    color: COLORS.error,
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

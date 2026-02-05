import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  Switch,
  Dimensions,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import SafeMapView from '../../components/SafeMapView';
import { COLORS } from '../../constants/colors';
import { getImageUrl } from '../../utils/url';
import useAuthStore from '../../store/authStore';
import useDeliveryStore from '../../store/deliveryStore';
import socketService from '../../services/socketService';

const { width } = Dimensions.get('window');

// Zones de forte demande simulées (Korhogo, Côte d'Ivoire)
const hotZones = [
  { id: 1, latitude: 9.4580, longitude: -5.6294, intensity: 'high', name: 'Centre-ville', radius: 500 },
  { id: 2, latitude: 9.4620, longitude: -5.6350, intensity: 'medium', name: 'Marché', radius: 400 },
  { id: 3, latitude: 9.4540, longitude: -5.6200, intensity: 'high', name: 'Zone commerciale', radius: 450 },
  { id: 4, latitude: 9.4500, longitude: -5.6400, intensity: 'low', name: 'Résidentiel Nord', radius: 350 },
];

const zoneColors = {
  high: { fill: 'rgba(255, 87, 51, 0.3)', stroke: 'rgba(255, 87, 51, 0.8)' },
  medium: { fill: 'rgba(255, 193, 7, 0.3)', stroke: 'rgba(255, 193, 7, 0.8)' },
  low: { fill: 'rgba(76, 175, 80, 0.3)', stroke: 'rgba(76, 175, 80, 0.8)' },
};

const statusColors = {
  available: COLORS.primary,
  offline: COLORS.textLight,
  pause: COLORS.warning,
  on_delivery: COLORS.info,
  busy: COLORS.info,
};

const statusLabels = {
  available: 'DISPONIBLE',
  offline: 'HORS LIGNE',
  pause: 'EN PAUSE',
  on_delivery: 'EN COURSE',
  busy: 'EN COURSE',
};

export default function DeliveryHomeScreen({ navigation }) {
  const { user } = useAuthStore();
  const { 
    status, 
    setStatus, 
    todayStats, 
    dailyGoal, 
    recentDeliveries,
    unreadNotifications,
    loadDashboardData,
    cancelDashboardLoad,
    isLoading,
    error: dashboardError,
  } = useDeliveryStore();
  
  const mapRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState({
    latitude: 9.4580,
    longitude: -5.6294,
  });
  const [selectedZone, setSelectedZone] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  // Retarder l’affichage de la carte pour que le reste de l’écran s’affiche d’abord (évite crash APK sur certains appareils)
  const [showMap, setShowMap] = useState(false);
  const lastDashboardLoadRef = useRef(0);
  const pendingCancelRef = useRef(null);
  const DEBOUNCE_MS = 3000;
  const CANCEL_DELAY_MS = 500;

  // Charger les données au montage ; annuler au démontage avec délai (évite d'annuler sur double montage React / nav)
  useEffect(() => {
    if (pendingCancelRef.current) {
      clearTimeout(pendingCancelRef.current);
      pendingCancelRef.current = null;
    }
    let cancelled = false;
    (async () => {
      try {
        await loadDashboardData();
        if (!cancelled) lastDashboardLoadRef.current = Date.now();
      } catch (e) {
        if (!cancelled) {
          console.warn('[Home] loadDashboardData error:', e?.message || e);
        }
      }
    })();
    const mapTimer = setTimeout(() => setShowMap(true), 1500);
    return () => {
      cancelled = true;
      clearTimeout(mapTimer);
      pendingCancelRef.current = setTimeout(() => {
        cancelDashboardLoad();
        pendingCancelRef.current = null;
      }, CANCEL_DELAY_MS);
    };
  }, [loadDashboardData, cancelDashboardLoad]);

  useEffect(() => {
    // Connecter au WebSocket (ne pas faire crasher l’app si erreur)
    try {
      socketService.connect();
    } catch (e) {
      console.warn('[Home] Socket connect:', e?.message || e);
    }

    // Écouter les nouvelles livraisons disponibles
    const unsubscribeNewDelivery = socketService.on('new_delivery_available', (data) => {
      console.log('[Home] Nouvelle livraison disponible:', data);
      Alert.alert(
        '🚴 Nouvelle livraison disponible !',
        `${data.restaurant_name}\n${data.delivery_fee} FCFA`,
        [
          { text: 'Ignorer', style: 'cancel' },
          { 
            text: 'Voir', 
            onPress: () => navigation.navigate('AvailableDeliveries')
          },
        ],
        { cancelable: true }
      );
      // Recharger les données (debounce pour éviter doublons)
      if (Date.now() - lastDashboardLoadRef.current > DEBOUNCE_MS) {
        lastDashboardLoadRef.current = Date.now();
        loadDashboardData();
      }
    });

    // Écouter les commandes prêtes (si livreur assigné)
    const unsubscribeOrderReady = socketService.on('order_ready', (data) => {
      console.log('[Home] Commande prête:', data);
      Alert.alert(
        '📦 Commande prête !',
        `La commande ${data.order_number} est prête à récupérer chez ${data.restaurant_name}`,
        [
          { text: 'OK', onPress: () => navigation.navigate('CurrentDelivery', { orderId: data.order_id }) },
        ]
      );
    });

    // Écouter les commandes annulées
    const unsubscribeOrderCancelled = socketService.on('order_cancelled', (data) => {
      console.log('[Home] Commande annulée:', data);
      Alert.alert(
        '❌ Commande annulée',
        `La commande ${data.order_number} a été annulée par le client.`
      );
      if (Date.now() - lastDashboardLoadRef.current > DEBOUNCE_MS) {
        lastDashboardLoadRef.current = Date.now();
        loadDashboardData();
      }
    });

    // Mettre à jour le statut de disponibilité sur le serveur
    socketService.updateAvailability(status === 'available');

    return () => {
      unsubscribeNewDelivery();
      unsubscribeOrderReady();
      unsubscribeOrderCancelled();
    };
  }, [status, navigation]);

  // Rafraîchir les données
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboardData();
    } catch (e) {
      console.warn('[Home] refresh error:', e?.message || e);
    }
    setRefreshing(false);
  };

  const isAvailable = status === 'available';

  const handleToggleStatus = async () => {
    const newStatus = isAvailable ? 'offline' : 'available';
    await setStatus(newStatus);
  };

  const target = Number(dailyGoal?.target) || 10;
  const completed = Number(dailyGoal?.completed) || 0;
  const progressPercent = target > 0 ? Math.min(100, (completed / target) * 100) : 0;
  const safeRecentDeliveries = Array.isArray(recentDeliveries) ? recentDeliveries : [];

  const centerOnLocation = () => {
    mapRef.current?.animateToRegion({
      ...currentLocation,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 500);
  };

  // Afficher le loading au premier chargement (accès sécurisé pour éviter crash APK)
  const showInitialLoading = Boolean(
    isLoading && !refreshing && (todayStats?.earnings ?? 0) === 0 && !dashboardError
  );
  if (showInitialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement des données...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Bandeau erreur réseau / API (évite crash, invite à réessayer) */}
        {dashboardError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={20} color={COLORS.white} />
            <Text style={styles.errorBannerText}>
              {dashboardError}
            </Text>
            <Text style={styles.errorBannerHint}>Tirez pour réessayer</Text>
          </View>
        ) : null}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              {user?.profile_photo ? (
                <Image source={{ uri: getImageUrl(user.profile_photo) }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={20} color={COLORS.primary} />
                </View>
              )}
            </View>
            <View style={styles.greetingContainer}>
              <Text style={styles.roleText}>Livreur Baibebalo</Text>
              <Text style={styles.greetingText}>
                Bonjour, {user?.first_name || 'Livreur'}!
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => navigation.navigate('NotificationCenter')}
          >
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
            {unreadNotifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Status Toggle */}
        <View style={styles.statusCard}>
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>STATUT</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColors[status] || statusColors.offline }]} />
              <Text style={[styles.statusText, { color: statusColors[status] || statusColors.offline }]}>
                {statusLabels[status] || 'HORS LIGNE'}
              </Text>
            </View>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={handleToggleStatus}
            trackColor={{ false: COLORS.border, true: COLORS.primary + '50' }}
            thumbColor={isAvailable ? COLORS.primary : COLORS.white}
            ios_backgroundColor={COLORS.border}
            disabled={status === 'on_delivery'}
          />
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>GAINS</Text>
            <Text style={styles.statValue}>
              {(Number(todayStats?.earnings) || 0).toLocaleString()} F
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>COURSES</Text>
            <Text style={styles.statValue}>{Number(todayStats?.deliveries) || 0}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>NOTE</Text>
            <View style={styles.ratingContainer}>
              <Text style={styles.statValue}>{todayStats?.rating ?? '4.8'}</Text>
              <Ionicons name="star" size={16} color={COLORS.rating} />
            </View>
          </View>
        </View>

        {/* Daily Goal */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <View>
              <Text style={styles.goalTitle}>Objectif quotidien</Text>
              <Text style={styles.goalSubtitle}>
                Plus que {(dailyGoal?.target ?? 10) - (dailyGoal?.completed ?? 0)} courses !
              </Text>
            </View>
            <Text style={styles.goalProgress}>
              {dailyGoal?.completed ?? 0}
              <Text style={styles.goalTotal}>/{dailyGoal?.target ?? 10}</Text>
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.min(progressPercent, 100)}%` }]} />
          </View>
          {(dailyGoal?.completed ?? 0) >= (dailyGoal?.target ?? 10) && (
            <View style={styles.bonusContainer}>
              <Ionicons name="gift" size={16} color={COLORS.success} />
              <Text style={styles.bonusText}>
                Bonus de {(dailyGoal?.bonusAmount ?? 2000).toLocaleString()} FCFA débloqué !
              </Text>
            </View>
          )}
        </View>

        {/* Heat Map Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Zones de forte demande</Text>
          <TouchableOpacity onPress={() => navigation.navigate('WorkZones')}>
            <Text style={styles.sectionLink}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.mapContainer}>
          {!showMap ? (
            <View style={[styles.map, styles.mapPlaceholder]}>
              <Ionicons name="map-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.mapPlaceholderText}>Chargement de la carte…</Text>
              <Text style={styles.mapPlaceholderSubtext}>Zones : Centre-ville, Marché, Zone commerciale, Résidentiel Nord</Text>
            </View>
          ) : (
            <SafeMapView style={styles.map}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              initialRegion={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.025,
                longitudeDelta: 0.025,
              }}
              showsUserLocation={false}
              showsMyLocationButton={false}
            >
              {/* Zones de forte demande (cercles colorés) */}
              {hotZones.map((zone) => (
                <Circle
                  key={zone.id}
                  center={{ latitude: zone.latitude, longitude: zone.longitude }}
                  radius={zone.radius}
                  fillColor={zoneColors[zone.intensity].fill}
                  strokeColor={zoneColors[zone.intensity].stroke}
                  strokeWidth={2}
                  onPress={() => setSelectedZone(zone)}
                />
              ))}

              {/* Marqueurs pour les zones */}
              {hotZones.map((zone) => (
                <Marker
                  key={`marker-${zone.id}`}
                  coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
                  onPress={() => setSelectedZone(zone)}
                >
                  <View style={[
                    styles.zoneMarker,
                    { backgroundColor: zoneColors[zone.intensity].stroke }
                  ]}>
                    <Ionicons 
                      name={zone.intensity === 'high' ? 'flame' : zone.intensity === 'medium' ? 'trending-up' : 'remove'} 
                      size={14} 
                      color="#FFFFFF" 
                    />
                  </View>
                </Marker>
              ))}

              {/* Position actuelle du livreur */}
              <Marker
                coordinate={currentLocation}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.currentLocationMarker}>
                  <View style={styles.locationPulseAnim} />
                  <View style={styles.locationDotInner} />
                </View>
              </Marker>
            </MapView>
            </SafeMapView>
          )}

          {/* Légende */}
          <View style={styles.mapLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: zoneColors.high.stroke }]} />
              <Text style={styles.legendText}>Forte</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: zoneColors.medium.stroke }]} />
              <Text style={styles.legendText}>Moyenne</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: zoneColors.low.stroke }]} />
              <Text style={styles.legendText}>Faible</Text>
            </View>
          </View>

          {/* Bouton de localisation */}
          <TouchableOpacity style={styles.locationButton} onPress={centerOnLocation}>
            <Ionicons name="locate" size={24} color={COLORS.primary} />
          </TouchableOpacity>

          {/* Info zone sélectionnée */}
          {selectedZone && (
            <View style={styles.zoneInfoCard}>
              <View style={styles.zoneInfoHeader}>
                <Text style={styles.zoneInfoName}>{selectedZone.name}</Text>
                <TouchableOpacity onPress={() => setSelectedZone(null)}>
                  <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.zoneInfoRow}>
                <Ionicons 
                  name={selectedZone.intensity === 'high' ? 'flame' : 'trending-up'} 
                  size={16} 
                  color={zoneColors[selectedZone.intensity].stroke} 
                />
                <Text style={styles.zoneInfoText}>
                  Demande {selectedZone.intensity === 'high' ? 'très forte' : selectedZone.intensity === 'medium' ? 'moyenne' : 'faible'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Recent Deliveries */}
        {safeRecentDeliveries.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Courses récentes</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Deliveries')}>
                <Text style={styles.sectionLink}>Tout voir</Text>
              </TouchableOpacity>
            </View>

            {safeRecentDeliveries.slice(0, 3).map((delivery, index) => (
              <View key={index} style={styles.deliveryCard}>
                <View style={styles.deliveryInfo}>
                  <Text style={styles.deliveryTime}>{delivery.time}</Text>
                  <Text style={styles.deliveryRoute}>
                    {delivery.restaurant} → {delivery.destination}
                  </Text>
                  <View style={styles.deliveryStatus}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                    <Text style={styles.deliveryStatusText}>Livrée</Text>
                  </View>
                </View>
                <View style={styles.deliveryEarnings}>
                  <Text style={styles.deliveryAmount}>+{delivery.amount} F</Text>
                  {delivery.rating && (
                    <View style={styles.deliveryRating}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons 
                          key={star}
                          name="star" 
                          size={12} 
                          color={star <= delivery.rating ? COLORS.rating : COLORS.border} 
                        />
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ))}
          </>
        )}

        {/* Empty state if no recent deliveries */}
        {safeRecentDeliveries.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="bicycle-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyStateText}>
              Pas encore de courses aujourd'hui
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Activez votre statut pour recevoir des courses
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingContainer: {
    gap: 2,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusInfo: {
    gap: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goalCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  goalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  goalProgress: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  goalTotal: {
    fontWeight: 'normal',
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.success + '15',
    borderRadius: 8,
  },
  bonusText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  mapContainer: {
    marginHorizontal: 16,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapPlaceholder: {
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  mapPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  mapPlaceholderSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  zoneMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  currentLocationMarker: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPulseAnim: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '30',
  },
  locationDotInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  mapLegend: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  locationButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  zoneInfoCard: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 68,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  zoneInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  zoneInfoName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  zoneInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zoneInfoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  deliveryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  deliveryRoute: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  deliveryStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deliveryStatusText: {
    fontSize: 12,
    color: COLORS.success,
  },
  deliveryEarnings: {
    alignItems: 'flex-end',
  },
  deliveryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  deliveryRating: {
    flexDirection: 'row',
    gap: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  errorBanner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error || '#c62828',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    gap: 6,
  },
  errorBannerText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  errorBannerHint: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    width: '100%',
    textAlign: 'center',
  },
});

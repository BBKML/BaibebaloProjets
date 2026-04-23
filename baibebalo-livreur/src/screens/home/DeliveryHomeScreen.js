import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  Switch,
  RefreshControl,
  ActivityIndicator,
  AppState,
  Modal,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// MapView retiré de l'accueil (crash natif sur certains APK Android sans clé Google Maps)
// Les écrans de navigation (DeliveryDetails, NavigationToRestaurant, etc.) conservent MapView
import { COLORS } from '../../constants/colors';
import { getImageUrl } from '../../utils/url';
import useAuthStore from '../../store/authStore';
import useDeliveryStore from '../../store/deliveryStore';
import socketService from '../../services/socketService';

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
  const insets = useSafeAreaInsets();
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
  
  const [selectedZone, setSelectedZone] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseRemaining, setPauseRemaining] = useState(0);
  const pauseTimerRef = useRef(null);
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
    return () => {
      cancelled = true;
      pendingCancelRef.current = setTimeout(() => {
        cancelDashboardLoad();
        pendingCancelRef.current = null;
      }, CANCEL_DELAY_MS);
    };
  }, [loadDashboardData, cancelDashboardLoad]);

  // Rafraîchir à chaque fois que l'écran Accueil est affiché (changement d'onglet)
  useFocusEffect(
    React.useCallback(() => {
      if (Date.now() - lastDashboardLoadRef.current > 1000) {
        loadDashboardData({ force: true }).then(() => { lastDashboardLoadRef.current = Date.now(); });
      }
    }, [loadDashboardData])
  );

  // Rafraîchir quand l'app revient au premier plan (solde, courses, etc.)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Date.now() - lastDashboardLoadRef.current > 2000) {
        lastDashboardLoadRef.current = Date.now();
        loadDashboardData({ force: true });
      }
    });
    return () => sub?.remove();
  }, [loadDashboardData]);

  useEffect(() => {
    // Connecter au WebSocket (ne pas faire crasher l’app si erreur)
    try {
      socketService.connect();
    } catch (e) {
      console.warn('[Home] Socket connect:', e?.message || e);
    }

    // Les alertes Socket sont gérées globalement par useDeliverySocketAlerts (AppNavigator)
    // On garde uniquement le rechargement des données pour new_delivery_available et order_cancelled
    const unsubscribeNewDelivery = socketService.on('new_delivery_available', () => {
      if (Date.now() - lastDashboardLoadRef.current > DEBOUNCE_MS) {
        lastDashboardLoadRef.current = Date.now();
        loadDashboardData({ force: true });
      }
    });

    const unsubscribeOrderCancelled = socketService.on('order_cancelled', () => {
      if (Date.now() - lastDashboardLoadRef.current > DEBOUNCE_MS) {
        lastDashboardLoadRef.current = Date.now();
        loadDashboardData({ force: true });
      }
    });

    // Livraison confirmée → actualiser gains et nombre de courses
    const unsubscribeOrderDelivered = socketService.on('order_status_changed', (data) => {
      if (data?.status === 'delivered' && Date.now() - lastDashboardLoadRef.current > DEBOUNCE_MS) {
        lastDashboardLoadRef.current = Date.now();
        loadDashboardData({ force: true });
      }
    });

    // Mettre à jour le statut de disponibilité sur le serveur
    socketService.updateAvailability(status === 'available');

    return () => {
      unsubscribeNewDelivery();
      unsubscribeOrderCancelled();
      unsubscribeOrderDelivered?.();
    };
  }, [status, navigation, loadDashboardData]);

  // Rafraîchir les données
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboardData({ force: true });
    } catch (e) {
      console.warn('[Home] refresh error:', e?.message || e);
    }
    setRefreshing(false);
  };

  const isAvailable = status === 'available';
  const isPaused = status === 'pause';

  const handleToggleStatus = async () => {
    if (status === 'on_delivery') return;
    if (isAvailable) {
      setShowPauseModal(true);
    } else if (isPaused) {
      clearInterval(pauseTimerRef.current);
      setPauseRemaining(0);
      await setStatus('available');
    } else {
      await setStatus('available');
    }
  };

  const startPause = async (minutes) => {
    setShowPauseModal(false);
    await setStatus('pause');
    const totalSec = minutes * 60;
    setPauseRemaining(totalSec);
    clearInterval(pauseTimerRef.current);
    pauseTimerRef.current = setInterval(async () => {
      setPauseRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(pauseTimerRef.current);
          setStatus('available');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const goOffline = async () => {
    setShowPauseModal(false);
    await setStatus('offline');
  };

  const formatPauseTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => () => clearInterval(pauseTimerRef.current), []);

  const target = Number(dailyGoal?.target) || 10;
  const completed = Number(dailyGoal?.completed) || 0;
  const progressPercent = target > 0 ? Math.min(100, (completed / target) * 100) : 0;
  const safeRecentDeliveries = Array.isArray(recentDeliveries) ? recentDeliveries : [];

  // Afficher le loading au premier chargement (accès sécurisé pour éviter crash APK)
  const showInitialLoading = Boolean(
    isLoading && !refreshing && (todayStats?.earnings ?? 0) === 0 && !dashboardError
  );
  if (showInitialLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement des données...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + Math.max(insets.bottom, 16) }]}
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
              {isPaused && pauseRemaining > 0 && (
                <Text style={styles.pauseTimer}> · {formatPauseTime(pauseRemaining)}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.statusToggleBtn, { backgroundColor: isAvailable ? COLORS.warning + '15' : COLORS.primary + '15' }]}
            onPress={handleToggleStatus}
            disabled={status === 'on_delivery'}
          >
            <Text style={[styles.statusToggleBtnText, { color: isAvailable ? COLORS.warning : COLORS.primary }]}>
              {isAvailable ? 'Pause / Fin' : isPaused ? 'Reprendre' : 'Disponible'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Modal Pause */}
        <Modal visible={showPauseModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Que voulez-vous faire ?</Text>
              <Text style={styles.modalSub}>Choisissez une durée de pause ou déconnectez-vous</Text>
              {[15, 30, 45, 60].map((min) => (
                <TouchableOpacity key={min} style={styles.pauseOption} onPress={() => startPause(min)}>
                  <Ionicons name="pause-circle-outline" size={22} color={COLORS.warning} />
                  <Text style={styles.pauseOptionText}>Pause {min} minutes</Text>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.pauseOption, styles.offlineOption]} onPress={goOffline}>
                <Ionicons name="power" size={22} color={COLORS.error} />
                <Text style={[styles.pauseOptionText, { color: COLORS.error }]}>Hors ligne (fin de journée)</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.error} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPauseModal(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Bouton courses disponibles (visible quand disponible) */}
        {isAvailable && (
          <TouchableOpacity
            style={styles.availableOrdersButton}
            onPress={() => navigation.navigate('AvailableDeliveries')}
            activeOpacity={0.8}
          >
            <Ionicons name="bicycle" size={24} color="#FFF" />
            <Text style={styles.availableOrdersButtonText}>Voir les demandes de course</Text>
            <Ionicons name="chevron-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        )}

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
              <Text style={styles.statValue}>
                {(todayStats?.rating != null && todayStats.rating > 0) 
                  ? Number(todayStats.rating).toFixed(1) 
                  : (user?.average_rating != null ? Number(user.average_rating).toFixed(1) : '–')}
              </Text>
              <Ionicons name="star" size={16} color={COLORS.rating} />
            </View>
          </View>
        </View>

        {/* Daily Goal + Bonus */}
        {(() => {
          const target = dailyGoal?.target ?? 10;
          const completed = dailyGoal?.completed ?? 0;
          const bonus = dailyGoal?.bonusAmount ?? 2000;
          const remaining = Math.max(0, target - completed);
          const percent = target > 0 ? Math.min(100, (completed / target) * 100) : 0;
          const done = completed >= target;
          return (
            <View style={[styles.goalCard, done && styles.goalCardDone]}>
              <View style={styles.goalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalTitle}>
                    {done ? '🎉 Objectif atteint !' : 'Bonus du jour'}
                  </Text>
                  <Text style={[styles.goalSubtitle, done && { color: COLORS.success }]}>
                    {done
                      ? `+${bonus.toLocaleString()} FCFA débloqué !`
                      : `Encore ${remaining} course${remaining > 1 ? 's' : ''} → +${bonus.toLocaleString()} FCFA`
                    }
                  </Text>
                </View>
                <View style={styles.goalBadge}>
                  <Ionicons name="gift" size={16} color={done ? COLORS.success : COLORS.primary} />
                  <Text style={[styles.goalBadgeText, { color: done ? COLORS.success : COLORS.primary }]}>
                    {completed}/{target}
                  </Text>
                </View>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${percent}%`, backgroundColor: done ? COLORS.success : COLORS.primary }]} />
              </View>
              {!done && (
                <Text style={styles.bonusHint}>
                  💡 Chaque course te rapproche du bonus
                </Text>
              )}
            </View>
          );
        })()}

        {/* Heat Map Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Zones de forte demande</Text>
          <TouchableOpacity onPress={() => navigation.navigate('WorkZones')}>
            <Text style={styles.sectionLink}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.zonesContainer}>
          {hotZones.map((zone) => (
            <TouchableOpacity
              key={zone.id}
              style={[styles.zoneRow, selectedZone?.id === zone.id && styles.zoneRowSelected]}
              onPress={() => setSelectedZone(selectedZone?.id === zone.id ? null : zone)}
              activeOpacity={0.7}
            >
              <View style={[styles.zoneIconBg, { backgroundColor: zoneColors[zone.intensity].stroke }]}>
                <Ionicons
                  name={zone.intensity === 'high' ? 'flame' : zone.intensity === 'medium' ? 'trending-up' : 'remove'}
                  size={16}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.zoneRowInfo}>
                <Text style={styles.zoneRowName}>{zone.name}</Text>
                <Text style={[styles.zoneRowBadge, { color: zoneColors[zone.intensity].stroke }]}>
                  Demande {zone.intensity === 'high' ? 'très forte' : zone.intensity === 'medium' ? 'moyenne' : 'faible'}
                </Text>
              </View>
              <View style={[styles.zoneRowDot, { backgroundColor: zoneColors[zone.intensity].fill, borderColor: zoneColors[zone.intensity].stroke }]} />
            </TouchableOpacity>
          ))}
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
  // ── Pause Modal ──────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white || '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  pauseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  offlineOption: {
    borderBottomWidth: 0,
    marginTop: 4,
  },
  pauseOptionText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  cancelBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  cancelBtnText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  // ── Status Card ───────────────────────────────────────────────
  statusToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusToggleBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  pauseTimer: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.warning,
  },
  // ── Goal Card ─────────────────────────────────────────────────
  goalCardDone: {
    borderColor: COLORS.success + '40',
    borderWidth: 1,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  goalBadgeText: {
    fontWeight: '700',
    fontSize: 13,
  },
  bonusHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  // ── Container ─────────────────────────────────────────────────
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
  availableOrdersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  availableOrdersButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
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
  zonesContainer: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  zoneRowSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  zoneIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneRowInfo: {
    flex: 1,
    gap: 2,
  },
  zoneRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  zoneRowBadge: {
    fontSize: 12,
    fontWeight: '500',
  },
  zoneRowDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
});

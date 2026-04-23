import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Switch,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import useRestaurantStore from '../../store/restaurantStore';
import { restaurantApi } from '../../api/restaurant';
import { restaurantOrders } from '../../api/orders';
import { restaurantMenu } from '../../api/menu';
import Toast from 'react-native-toast-message';

const ACCEPT_DEADLINE_SEC = 120;

export default function DashboardScreen({ navigation }) {
  const { restaurant, updateRestaurant, setRestaurant } = useAuthStore();
  const { stats, pendingOrders, setStats, setOrders } = useRestaurantStore();
  const [refreshing, setRefreshing] = useState(false);
  const [isOpen, setIsOpen] = useState(restaurant?.is_open !== false);
  const [isToggling, setIsToggling] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    averageRating: 0,
    pendingCount: 0,
    weekRevenue: 0,
  });
  const [newOrders, setNewOrders] = useState([]);
  const [unavailableItems, setUnavailableItems] = useState([]);
  const [, setTick] = useState(0);
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setIsOpen(restaurant?.is_open !== false);
  }, [restaurant?.is_open]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (newOrders.length === 0) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [newOrders.length]);

  useEffect(() => {
    if (newOrders.length > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [newOrders.length]);

  const loadDashboardData = async () => {
    try {
      try {
        const statsResponse = await restaurantApi.getStatistics('week');
        const statsData = statsResponse.data?.statistics || statsResponse.statistics || statsResponse.data;
        if (statsData) {
          setStats(statsData);
          setDashboardData(prev => ({
            ...prev,
            todayRevenue: statsData.today_revenue || statsData.revenue || 0,
            todayOrders: statsData.today_orders || statsData.orders || 0,
            averageRating: statsData.average_rating || restaurant?.average_rating || 0,
            weekRevenue: statsData.week_revenue || statsData.total_revenue || 0,
          }));
        }
      } catch (_) {}

      try {
        const ordersResponse = await restaurantOrders.getOrders({ status: 'new' });
        const ordersData = ordersResponse.data?.orders || ordersResponse.orders || [];
        setOrders(ordersData);
        setNewOrders(ordersData);
        setDashboardData(prev => ({
          ...prev,
          pendingCount: ordersData.length,
        }));
      } catch (_) {}

      // Plats indisponibles — alerte rupture
      try {
        const menuRes = await restaurantMenu.getMenu();
        const items = menuRes.data?.items || menuRes.items || [];
        setUnavailableItems(items.filter((i) => i.is_available === false));
      } catch (_) {}
    } catch (_) {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleToggleOpen = async (newValue) => {
    if (isToggling) return;
    setIsToggling(true);
    const prev = isOpen;
    setIsOpen(newValue);
    try {
      const response = await restaurantApi.toggleStatus(newValue);
      if (response.data?.restaurant) {
        setRestaurant(response.data.restaurant);
      }
      Toast.show({
        type: 'success',
        text1: newValue ? '🟢 Restaurant ouvert' : '🔴 Restaurant fermé',
        text2: newValue
          ? 'Vous pouvez recevoir des commandes'
          : 'Aucune nouvelle commande ne sera reçue',
      });
    } catch (_) {
      setIsOpen(prev);
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Impossible de changer le statut' });
    } finally {
      setIsToggling(false);
    }
  };

  const handleAcceptOrder = (orderId) => {
    navigation.navigate('OrderDetails', { orderId });
  };

  const handleRefuseOrder = (orderId) => {
    navigation.navigate('RefuseOrderModal', { orderId });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0';
    return Number.parseFloat(amount).toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const getOrderElapsedSec = (order) => {
    const placed = order.placed_at || order.created_at;
    if (!placed) return 0;
    return Math.floor((Date.now() - new Date(placed).getTime()) / 1000);
  };

  const getTimeDisplay = (order) => {
    const elapsed = getOrderElapsedSec(order);
    const remaining = Math.max(0, ACCEPT_DEADLINE_SEC - elapsed);
    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    return { min, sec, isExpired: remaining <= 0, remaining };
  };

  const getNetRevenue = (order) => {
    let net = order.net_revenue ?? order.netRevenue;
    if (net == null) {
      const sub = parseFloat(order.subtotal || 0);
      const rate = parseFloat(order.commission_rate || 15);
      const com = parseFloat(order.commission || 0);
      net = Math.max(0, sub - (com > 0 ? com : (sub * rate) / 100));
    }
    return parseFloat(net);
  };

  const restaurantName = restaurant?.name || 'Mon Restaurant';
  const chartBars = (() => {
    const data = stats?.revenue_evolution?.datasets?.[0]?.data || [];
    const max = Math.max(...data, 1);
    return data.length > 0
      ? data.map((v, i) => ({ h: Math.max((v / max) * 100, 4), isToday: i === data.length - 1 }))
      : Array.from({ length: 7 }, () => ({ h: 0, isToday: false }));
  })();
  const chartLabels = stats?.revenue_evolution?.labels || ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.restaurantName} numberOfLines={1}>{restaurantName}</Text>
          <Text style={styles.headerSub}>Centre de gestion</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.notifButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 32) + 16 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Alerte rupture de stock */}
        {unavailableItems.length > 0 && (
          <TouchableOpacity
            style={styles.stockAlertBanner}
            onPress={() => navigation.navigate('Menu')}
            activeOpacity={0.8}
          >
            <Ionicons name="warning" size={18} color="#92400e" />
            <Text style={styles.stockAlertText}>
              {unavailableItems.length} plat{unavailableItems.length > 1 ? 's' : ''} indisponible{unavailableItems.length > 1 ? 's' : ''} — Appuyez pour gérer
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#92400e" />
          </TouchableOpacity>
        )}

        {/* Open/Close Card — toujours en haut */}
        <View style={[styles.openCloseCard, isOpen ? styles.openCard : styles.closedCard]}>
          <View style={styles.openCloseLeft}>
            <View style={[styles.openDot, { backgroundColor: isOpen ? '#10b981' : '#ef4444' }]} />
            <View>
              <Text style={styles.openCloseTitle}>
                {isOpen ? 'Restaurant ouvert' : 'Restaurant fermé'}
              </Text>
              <Text style={styles.openCloseSub}>
                {isOpen
                  ? 'Vous recevez les commandes'
                  : 'Aucune commande ne sera reçue'}
              </Text>
            </View>
          </View>
          {isToggling ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Switch
              value={isOpen}
              onValueChange={handleToggleOpen}
              trackColor={{ false: '#e2e8f0', true: COLORS.primary + '55' }}
              thumbColor={isOpen ? COLORS.primary : '#94a3b8'}
              ios_backgroundColor="#e2e8f0"
            />
          )}
        </View>

        {/* Nouvelles commandes — priorité max */}
        {newOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionTitle}>Nouvelles commandes</Text>
                <View style={styles.urgentBadge}>
                  <Text style={styles.urgentBadgeText}>{newOrders.length}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
                <Text style={styles.seeAll}>Tout voir</Text>
              </TouchableOpacity>
            </View>

            {newOrders.map((order) => {
              const { min, sec, isExpired, remaining } = getTimeDisplay(order);
              const net = getNetRevenue(order);
              const orderNum = order.order_number || (order.id ? order.id.slice(0, 8).toUpperCase() : '');
              const itemsCount = order.items?.length || order.items_count || 0;
              const urgencyPct = Math.max(0, remaining / ACCEPT_DEADLINE_SEC);

              return (
                <Animated.View
                  key={order.id}
                  style={[styles.newOrderCard, { transform: [{ scale: pulseAnim }] }]}
                >
                  {/* Barre de progression urgence */}
                  <View style={styles.urgencyBar}>
                    <View
                      style={[
                        styles.urgencyFill,
                        {
                          width: `${urgencyPct * 100}%`,
                          backgroundColor: urgencyPct > 0.5 ? COLORS.success : urgencyPct > 0.2 ? COLORS.warning : COLORS.error,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.newOrderBody}>
                    <View style={styles.newOrderInfo}>
                      <View style={styles.newOrderTopRow}>
                        <Text style={styles.newOrderUrgent}>URGENT</Text>
                        <Text style={styles.newOrderNum}>#{orderNum}</Text>
                      </View>
                      <Text style={styles.newOrderItems}>
                        {itemsCount} article{itemsCount > 1 ? 's' : ''}
                      </Text>
                      <Text style={styles.newOrderAmount}>{formatCurrency(net)} FCFA</Text>
                    </View>

                    <View style={styles.timerBlock}>
                      <View style={[styles.timerBox, isExpired && styles.timerExpired]}>
                        <Text style={[styles.timerVal, isExpired && styles.timerValExpired]}>
                          {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
                        </Text>
                        <Text style={[styles.timerLabel, isExpired && styles.timerLabelExpired]}>
                          {isExpired ? 'Expiré' : 'Restant'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Boutons Accepter / Refuser */}
                  <View style={styles.newOrderActions}>
                    <TouchableOpacity
                      style={styles.refuseBtn}
                      onPress={() => handleRefuseOrder(order.id)}
                    >
                      <Ionicons name="close" size={18} color={COLORS.error} />
                      <Text style={styles.refuseBtnText}>Refuser</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleAcceptOrder(order.id)}
                    >
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.acceptBtnText}>Accepter</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        )}

        {/* KPI Cards 2x2 */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: COLORS.primary + '15' }]}>
              <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.kpiLabel}>CA du jour</Text>
            <Text style={styles.kpiValue}>{formatCurrency(dashboardData.todayRevenue)}</Text>
            <Text style={styles.kpiUnit}>FCFA</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#3b82f615' }]}>
              <Ionicons name="receipt-outline" size={20} color="#3b82f6" />
            </View>
            <Text style={styles.kpiLabel}>Commandes</Text>
            <Text style={[styles.kpiValue, { color: '#3b82f6' }]}>{dashboardData.todayOrders}</Text>
            <Text style={styles.kpiUnit}>aujourd'hui</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#f59e0b15' }]}>
              <Ionicons name="time-outline" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.kpiLabel}>En attente</Text>
            <Text style={[styles.kpiValue, { color: dashboardData.pendingCount > 0 ? '#f59e0b' : COLORS.text }]}>
              {dashboardData.pendingCount}
            </Text>
            <Text style={styles.kpiUnit}>commande{dashboardData.pendingCount > 1 ? 's' : ''}</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#10b98115' }]}>
              <Ionicons name="star-outline" size={20} color="#10b981" />
            </View>
            <Text style={styles.kpiLabel}>Note</Text>
            <Text style={[styles.kpiValue, { color: '#10b981' }]}>
              {(Number(dashboardData.averageRating) || 0).toFixed(1)}
            </Text>
            <View style={styles.miniStars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons
                  key={s}
                  name={s <= Math.round(dashboardData.averageRating) ? 'star' : 'star-outline'}
                  size={10}
                  color="#f59e0b"
                />
              ))}
            </View>
          </View>
        </View>

        {/* Actions rapides */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Orders')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: COLORS.primary + '15' }]}>
                <Ionicons name="receipt" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.quickActionLabel}>Commandes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Menu')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#3b82f615' }]}>
                <Ionicons name="fast-food" size={22} color="#3b82f6" />
              </View>
              <Text style={styles.quickActionLabel}>Menu</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Statistics')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#10b98115' }]}>
                <Ionicons name="bar-chart" size={22} color="#10b981" />
              </View>
              <Text style={styles.quickActionLabel}>Stats</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('FinancialDashboard')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#f59e0b15' }]}>
                <Ionicons name="wallet" size={22} color="#f59e0b" />
              </View>
              <Text style={styles.quickActionLabel}>Finances</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Graphique performance */}
        <View style={styles.section}>
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.sectionTitle}>Performance</Text>
                <Text style={styles.chartSub}>7 derniers jours</Text>
              </View>
              <Text style={styles.chartTotal}>{formatCurrency(dashboardData.weekRevenue)} FCFA</Text>
            </View>
            <View style={styles.chartBars}>
              {chartBars.map((bar, i) => (
                <View key={i} style={styles.chartBarWrapper}>
                  <View
                    style={[
                      styles.chartBar,
                      { height: `${Math.max(bar.h, 4)}%` },
                      bar.isToday && styles.chartBarActive,
                    ]}
                  />
                </View>
              ))}
            </View>
            <View style={styles.chartLabels}>
              {chartLabels.map((day, i) => (
                <Text
                  key={i}
                  style={[styles.chartLabel, i === chartBars.length - 1 && styles.chartLabelActive]}
                >
                  {day}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* Top plats */}
        {stats?.top_dishes && stats.top_dishes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top plats cette semaine</Text>
            <View style={styles.topDishes}>
              {stats.top_dishes.slice(0, 5).map((dish, index) => (
                <View key={index} style={styles.dishRow}>
                  <View style={[styles.dishRankBadge, index === 0 && styles.dishRank1]}>
                    <Text style={[styles.dishRankText, index === 0 && styles.dishRankText1]}>
                      #{index + 1}
                    </Text>
                  </View>
                  <View style={styles.dishInfo}>
                    <Text style={styles.dishName} numberOfLines={1}>{dish.name || 'Plat'}</Text>
                    <Text style={styles.dishSales}>{dish.sales || 0} ventes</Text>
                  </View>
                  <View style={styles.dishBar}>
                    <View
                      style={[
                        styles.dishBarFill,
                        {
                          width: `${Math.min(100, ((dish.sales || 0) / Math.max(...stats.top_dishes.map(d => d.sales || 0), 1)) * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  stockAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  stockAlertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: { flex: 1 },
  restaurantName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },

  // Open/Close card
  openCloseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  openCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  closedCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  openCloseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  openDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  openCloseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  openCloseSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  // Section
  section: { gap: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  urgentBadge: {
    backgroundColor: COLORS.error,
    borderRadius: 999,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  urgentBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  seeAll: { fontSize: 14, fontWeight: '600', color: COLORS.primary },

  // Nouvelle commande card
  newOrderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.primary + '40',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  urgencyBar: {
    height: 4,
    backgroundColor: COLORS.border,
  },
  urgencyFill: {
    height: 4,
    borderRadius: 2,
  },
  newOrderBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  newOrderInfo: { flex: 1 },
  newOrderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  newOrderUrgent: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newOrderNum: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  newOrderItems: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  newOrderAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  timerBlock: {
    alignItems: 'center',
  },
  timerBox: {
    backgroundColor: COLORS.primary + '12',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  timerExpired: { backgroundColor: COLORS.error + '12' },
  timerVal: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  timerValExpired: { color: COLORS.error },
  timerLabel: { fontSize: 10, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  timerLabelExpired: { color: COLORS.error },
  newOrderActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  refuseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRightWidth: 0.5,
    borderRightColor: COLORS.border,
  },
  refuseBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.error,
  },
  acceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
  },
  acceptBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // KPI Grid 2x2
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 4,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  kpiUnit: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  miniStars: {
    flexDirection: 'row',
    gap: 1,
    marginTop: 2,
  },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Chart
  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  chartSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  chartTotal: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  chartBars: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingHorizontal: 2,
  },
  chartBarWrapper: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    backgroundColor: COLORS.border,
    borderRadius: 4,
  },
  chartBarActive: { backgroundColor: COLORS.primary },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  chartLabel: {
    flex: 1,
    fontSize: 10,
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  chartLabelActive: { color: COLORS.primary, fontWeight: '800' },

  // Top dishes
  topDishes: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '80',
  },
  dishRankBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dishRank1: { backgroundColor: '#fef3c7' },
  dishRankText: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary },
  dishRankText1: { color: '#d97706' },
  dishInfo: { flex: 1 },
  dishName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  dishSales: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  dishBar: {
    width: 60,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  dishBarFill: {
    height: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
});

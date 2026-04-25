import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  ActivityIndicator,
  Modal,
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
import soundService from '../../services/soundService';

const ACCEPT_DEADLINE_SEC = 120;

function StockAlertCard({ items, onToggle, onManageAll }) {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? items : items.slice(0, 2);
  return (
    <View style={stockStyles.card}>
      <TouchableOpacity style={stockStyles.header} onPress={() => setExpanded((e) => !e)} activeOpacity={0.8}>
        <Ionicons name="warning" size={18} color="#92400e" />
        <Text style={stockStyles.title}>
          {items.length} plat{items.length > 1 ? 's' : ''} indisponible{items.length > 1 ? 's' : ''}
        </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#92400e" />
      </TouchableOpacity>
      {visible.map((item) => (
        <View key={item.id} style={stockStyles.row}>
          <Text style={stockStyles.itemName} numberOfLines={1}>{item.name}</Text>
          <TouchableOpacity style={stockStyles.enableBtn} onPress={() => onToggle(item)}>
            <Text style={stockStyles.enableBtnText}>Activer</Text>
          </TouchableOpacity>
        </View>
      ))}
      <View style={stockStyles.footer}>
        {items.length > 2 && !expanded && (
          <TouchableOpacity onPress={() => setExpanded(true)}>
            <Text style={stockStyles.footerLink}>+{items.length - 2} autres</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onManageAll} style={stockStyles.manageBtn}>
          <Text style={stockStyles.manageBtnText}>Gérer le menu</Text>
          <Ionicons name="arrow-forward" size={13} color="#92400e" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const stockStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fbbf24',
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
  },
  title: { flex: 1, fontSize: 13, fontWeight: '700', color: '#92400e' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#fbbf24' + '50',
    gap: 10,
  },
  itemName: { flex: 1, fontSize: 13, color: '#78350f' },
  enableBtn: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  enableBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#fbbf24' + '50',
  },
  footerLink: { fontSize: 12, color: '#92400e', fontWeight: '600' },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  manageBtnText: { fontSize: 12, color: '#92400e', fontWeight: '600' },
});

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
  const [acceptModal, setAcceptModal] = useState(null); // { orderId, orderNum }
  const [acceptingId, setAcceptingId] = useState(null);
  const [selectedPrepTime, setSelectedPrepTime] = useState(15);
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setIsOpen(restaurant?.is_open !== false);
  }, [restaurant?.is_open]);

  useEffect(() => {
    soundService.initialize();
    loadDashboardData();
    const autoRefresh = setInterval(loadDashboardData, 30000);
    return () => clearInterval(autoRefresh);
  }, []);

  const prevOrderCountRef = useRef(0);
  useEffect(() => {
    if (newOrders.length > prevOrderCountRef.current) {
      soundService.alertNewOrder();
    }
    prevOrderCountRef.current = newOrders.length;
  }, [newOrders.length]);

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

  // Acceptation directe en 1 tap (15 min par défaut)
  const handleAcceptOrder = async (order, customPrepTime) => {
    if (acceptingId) return;
    const prepTime = customPrepTime ?? selectedPrepTime;
    setAcceptingId(order.id);
    try {
      await restaurantOrders.acceptOrder(order.id, prepTime * 60);
      setNewOrders((prev) => prev.filter((o) => o.id !== order.id));
      setDashboardData((prev) => ({ ...prev, pendingCount: Math.max(0, prev.pendingCount - 1) }));
      Toast.show({ type: 'success', text1: '✅ Commande acceptée', text2: `Prêt en ${prepTime} min` });
    } catch (_) {
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Impossible d\'accepter la commande' });
    } finally {
      setAcceptingId(null);
      setAcceptModal(null);
    }
  };

  // Acceptation avec choix du temps de préparation (modal)
  const openPrepTimeModal = (order) => {
    const orderNum = order.order_number || order.id?.slice(0, 8) || '?';
    setSelectedPrepTime(15);
    setAcceptModal({ orderId: order.id, orderNum, order });
  };

  const confirmAcceptOrder = async () => {
    if (!acceptModal || acceptingId) return;
    await handleAcceptOrder(acceptModal.order, selectedPrepTime);
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
        {/* Alerte rupture de stock avec toggle rapide */}
        {unavailableItems.length > 0 && (
          <StockAlertCard
            items={unavailableItems}
            onToggle={async (item) => {
              try {
                await restaurantMenu.updateItem(item.id, { is_available: true });
                setUnavailableItems((prev) => prev.filter((i) => i.id !== item.id));
                Toast.show({ type: 'success', text1: `${item.name} disponible` });
              } catch (_) {
                Toast.show({ type: 'error', text1: 'Erreur', text2: 'Impossible de mettre à jour' });
              }
            }}
            onManageAll={() => navigation.navigate('Menu')}
          />
        )}

        {/* Statut restaurant — carte hero Glovo-style */}
        <TouchableOpacity
          style={[styles.statusHeroCard, isOpen ? styles.statusHeroOpen : styles.statusHeroClosed]}
          onPress={() => !isToggling && handleToggleOpen(!isOpen)}
          activeOpacity={0.88}
          disabled={isToggling}
        >
          <View style={styles.statusHeroLeft}>
            <View style={styles.statusHeroIconBg}>
              <Ionicons name="storefront" size={26} color="#fff" />
            </View>
            <View>
              <Text style={styles.statusHeroLabel}>Statut restaurant</Text>
              <Text style={styles.statusHeroTitle}>{isOpen ? 'OUVERT' : 'FERMÉ'}</Text>
              <Text style={styles.statusHeroSub}>
                {isOpen ? 'Vous recevez des commandes' : 'Aucune commande reçue'}
              </Text>
            </View>
          </View>
          {isToggling ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.statusToggleBtn}>
              <Text style={styles.statusToggleBtnText}>{isOpen ? 'Fermer' : 'Ouvrir'}</Text>
            </View>
          )}
        </TouchableOpacity>

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

                  {/* Actions — style Glovo */}
                  <View style={styles.newOrderActions}>
                    <TouchableOpacity
                      style={styles.refuseLink}
                      onPress={() => handleRefuseOrder(order.id)}
                    >
                      <Text style={styles.refuseLinkText}>Refuser cette commande</Text>
                    </TouchableOpacity>
                    <View style={styles.acceptRow}>
                      <TouchableOpacity
                        style={styles.prepTimeBtn}
                        onPress={() => openPrepTimeModal(order)}
                        disabled={!!acceptingId}
                      >
                        <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.acceptBtn, acceptingId === order.id && { opacity: 0.6 }]}
                        onPress={() => handleAcceptOrder(order)}
                        disabled={!!acceptingId}
                      >
                        {acceptingId === order.id
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Ionicons name="checkmark-circle" size={22} color="#fff" />}
                        <Text style={styles.acceptBtnText}>ACCEPTER LA COMMANDE</Text>
                      </TouchableOpacity>
                    </View>
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

      {/* Modal acceptation commande */}
      {acceptModal && (
        <Modal visible transparent animationType="slide">
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setAcceptModal(null)}>
            <View style={styles.prepModal} onStartShouldSetResponder={() => true}>
              <Text style={styles.prepModalTitle}>Accepter commande #{acceptModal.orderNum}</Text>
              <Text style={styles.prepModalSub}>Temps de préparation estimé</Text>
              <View style={styles.prepGrid}>
                {[10, 15, 20, 30, 45].map((min) => (
                  <TouchableOpacity
                    key={min}
                    style={[styles.prepOption, selectedPrepTime === min && styles.prepOptionSelected]}
                    onPress={() => setSelectedPrepTime(min)}
                  >
                    <Text style={[styles.prepOptionText, selectedPrepTime === min && styles.prepOptionTextSelected]}>
                      {min} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.prepConfirmBtn, acceptingId && { opacity: 0.6 }]}
                onPress={confirmAcceptOrder}
                disabled={!!acceptingId}
              >
                {acceptingId
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.prepConfirmText}>✓ Confirmer l'acceptation</Text>}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
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

  // Statut hero card
  statusHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    padding: 20,
  },
  statusHeroOpen: {
    backgroundColor: COLORS.primary,
  },
  statusHeroClosed: {
    backgroundColor: '#ef4444',
  },
  statusHeroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  statusHeroIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusHeroLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 2,
  },
  statusHeroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1.5,
    lineHeight: 32,
  },
  statusHeroSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  statusToggleBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  statusToggleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
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
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  refuseLink: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  refuseLinkText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
  acceptRow: {
    flexDirection: 'row',
    gap: 8,
  },
  prepTimeBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '12',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  prepModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  prepModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  prepModalSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  prepGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  prepOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  prepOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '12',
  },
  prepOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  prepOptionTextSelected: {
    color: COLORS.primary,
  },
  prepConfirmBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prepConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import useRestaurantStore from '../../store/restaurantStore';
import { restaurantApi } from '../../api/restaurant';
import { restaurantOrders } from '../../api/orders';

export default function DashboardScreen({ navigation }) {
  const { restaurant, updateRestaurant } = useAuthStore();
  const { stats, pendingOrders, setStats, setOrders } = useRestaurantStore();
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    averageRating: 0,
    pendingCount: 0,
  });
  const [newOrders, setNewOrders] = useState([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Charger les statistiques (semaine pour le graphique)
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
          }));
        }
      } catch (error) {
        console.log('Stats not available yet:', error.message);
      }

      // Charger les commandes en attente
      try {
        const ordersResponse = await restaurantOrders.getOrders({ status: 'new' });
        const ordersData = ordersResponse.data?.orders || ordersResponse.orders || [];
        setOrders(ordersData);
        setNewOrders(ordersData.slice(0, 1)); // Prendre la première commande urgente
        setDashboardData(prev => ({
          ...prev,
          pendingCount: ordersData.length,
        }));
      } catch (error) {
        console.log('Orders not available yet:', error.message);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    if (!amount) return '0';
    return Number.parseFloat(amount).toLocaleString('fr-FR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  const formatTimeRemaining = (order) => {
    // Calculer le temps restant basé sur estimated_delivery_time
    if (order.estimated_delivery_time) {
      const minutes = Math.floor(order.estimated_delivery_time / 60);
      const seconds = order.estimated_delivery_time % 60;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return '04:59'; // Par défaut
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarContent}>
          <View style={styles.topBarLeft}>
            <Text style={styles.topBarTitle}>BAIBEBALO</Text>
            <Text style={styles.topBarSubtitle}>Centre de gestion</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>OUVERT</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Key Stats Section */}
        <View style={styles.statsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>CA du jour</Text>
              <Text style={styles.statValue}>{formatCurrency(dashboardData.todayRevenue)} FCFA</Text>
              <View style={styles.statTrend}>
                <Ionicons name="trending-up" size={12} color={COLORS.success} />
                <Text style={styles.statTrendText}>+12%</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Commandes</Text>
              <Text style={styles.statValue}>{dashboardData.todayOrders}</Text>
              <View style={styles.statTrend}>
                <Ionicons name="time-outline" size={12} color={COLORS.primary} />
                <Text style={[styles.statTrendText, { color: COLORS.primary }]}>
                  {dashboardData.pendingCount} en cours
                </Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Note</Text>
              <Text style={styles.statValue}>
                {(Number(dashboardData.averageRating) || 0).toFixed(1)}
              </Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const rating = Number(dashboardData.averageRating) || 0;
                  const filled = star <= Math.floor(rating);
                  const half = star === Math.ceil(rating) && rating % 1 >= 0.5;
                  return (
                    <Ionicons
                      key={star}
                      name={filled ? 'star' : half ? 'star-half' : 'star-outline'}
                      size={12}
                      color={star <= rating ? COLORS.warning : COLORS.border}
                      style={styles.starIcon}
                    />
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>

        {/* New Orders Section */}
        {newOrders.length > 0 && (
          <View style={styles.ordersSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionTitle}>Nouvelles commandes</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{newOrders.length}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
                <Text style={styles.seeAllText}>Tout voir</Text>
              </TouchableOpacity>
            </View>

            {newOrders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderCardContent}>
                  <View style={styles.orderInfo}>
                    <View style={styles.orderHeaderRow}>
                      <Text style={styles.orderUrgentLabel}>Urgent</Text>
                      <Text style={styles.orderTime}>• Il y a 2 min</Text>
                    </View>
                    <Text style={styles.orderNumber}>Commande #{order.order_number || order.id?.slice(0, 6)}</Text>
                    <Text style={styles.orderItems}>
                      {order.items?.length || order.itemsCount || 0}x articles • {formatCurrency(order.total || order.total_amount || 0)} FCFA
                    </Text>
                  </View>
                  <View style={styles.timerContainer}>
                    <View style={styles.timerBox}>
                      <Text style={styles.timerValue}>04</Text>
                      <Text style={styles.timerLabel}>min</Text>
                    </View>
                    <View style={styles.timerBox}>
                      <Text style={styles.timerValue}>55</Text>
                      <Text style={styles.timerLabel}>sec</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
                    >
                      <Text style={styles.acceptButtonText}>Accepter</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Performance Chart */}
        <View style={styles.chartSection}>
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Performance</Text>
                <Text style={styles.chartSubtitle}>7 derniers jours</Text>
              </View>
              <Ionicons name="stats-chart" size={20} color={COLORS.textSecondary} />
            </View>
            {(() => {
              // Charger les données de performance
              const performanceData = stats?.revenue_evolution?.datasets?.[0]?.data || [];
              const maxValue = Math.max(...performanceData, 1); // Éviter division par 0
              const chartBars = performanceData.length > 0 
                ? performanceData.map((value, index) => ({
                    height: Math.max((value / maxValue) * 100, 5), // Minimum 5% pour visibilité
                    isToday: index === performanceData.length - 1,
                  }))
                : Array.from({ length: 7 }, () => ({ height: 0, isToday: false }));
              
              return (
                <>
                  <View style={styles.chartBars}>
                    {chartBars.map((bar, index) => (
                      <View
                        key={index}
                        style={[
                          styles.chartBar,
                          { height: `${bar.height}%` },
                          bar.isToday && styles.chartBarActive,
                        ]}
                      />
                    ))}
                  </View>
                  <View style={styles.chartLabels}>
                    {(stats?.revenue_evolution?.labels || ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']).map((day, index) => (
                      <Text
                        key={day}
                        style={[styles.chartLabel, index === chartBars.length - 1 && styles.chartLabelActive]}
                      >
                        {day}
                      </Text>
                    ))}
                  </View>
                </>
              );
            })()}
          </View>
        </View>

        {/* Top 5 Dishes */}
        <View style={styles.topDishesSection}>
          <Text style={styles.sectionTitle}>Top 5 plats</Text>
          <View style={styles.dishesList}>
            {stats?.top_dishes && stats.top_dishes.length > 0 ? (
              stats.top_dishes.map((dish, index) => (
                <View key={index} style={styles.dishCard}>
                  <View style={styles.dishImage} />
                  <View style={styles.dishInfo}>
                    <Text style={styles.dishName}>{dish.name || 'Plat'}</Text>
                    <Text style={styles.dishSales}>
                      {dish.sales || 0} ventes cette semaine
                    </Text>
                  </View>
                  <Text style={styles.dishRank}>#{index + 1}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyDishesContainer}>
                <Ionicons name="restaurant-outline" size={48} color={COLORS.border} />
                <Text style={styles.emptyDishesText}>Aucune donnée disponible</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    backgroundColor: COLORS.background + 'CC',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  topBarLeft: {
    flexDirection: 'column',
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  topBarSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  statsContainer: {
    paddingVertical: 16,
  },
  statsScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    minWidth: 140,
    flex: 1,
    flexDirection: 'column',
    gap: 4,
    borderRadius: 12,
    padding: 16,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statTrendText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
  },
  starIcon: {
    marginRight: -2,
  },
  ordersSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  badge: {
    backgroundColor: COLORS.error,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  orderCard: {
    borderRadius: 12,
    backgroundColor: COLORS.white,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  orderCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  orderInfo: {
    flex: 2,
    gap: 12,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderUrgentLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  orderTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  orderItems: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  timerContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  timerBox: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '1A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timerValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    lineHeight: 16,
  },
  timerLabel: {
    fontSize: 8,
    fontWeight: '500',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  acceptButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  chartSection: {
    padding: 16,
    marginTop: 8,
  },
  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  chartSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  chartBars: {
    height: 128,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 4,
  },
  chartBar: {
    flex: 1,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    minHeight: 20,
  },
  chartBarActive: {
    backgroundColor: COLORS.primary,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  chartLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  chartLabelActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  topDishesSection: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  dishesList: {
    gap: 12,
    marginTop: 16,
  },
  dishCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dishImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  dishInfo: {
    flex: 1,
  },
  dishName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  dishSales: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  dishRank: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  emptyDishesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyDishesText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { restaurantOrders } from '../../api/orders';
import useRestaurantStore from '../../store/restaurantStore';

export default function OrderHistoryScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({
    period: 'today',
    status: 'all',
    minAmount: null,
    maxAmount: null,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadHistory();
  }, [filters]);

  const loadHistory = async () => {
    try {
      // Utiliser getOrders avec les filtres appropriés
      const orderFilters = {};
      if (filters.status !== 'all') {
        orderFilters.status = filters.status;
      }
      
      // Convertir la période en dates
      const now = new Date();
      if (filters.period === 'today') {
        orderFilters.start_date = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      } else if (filters.period === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        orderFilters.start_date = weekAgo.toISOString();
      } else if (filters.period === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        orderFilters.start_date = monthAgo.toISOString();
      }
      
      const response = await restaurantOrders.getOrders(orderFilters);
      // Le backend retourne { success: true, data: { orders: [...], pagination: {...} } }
      const ordersData = response.data?.orders || response.orders || [];
      
      // Filtrer par montant si nécessaire
      let filteredOrders = ordersData;
      if (filters.minAmount || filters.maxAmount) {
        filteredOrders = ordersData.filter(order => {
          const total = order.total || order.total_amount || 0;
          if (filters.minAmount && total < filters.minAmount) return false;
          if (filters.maxAmount && total > filters.maxAmount) return false;
          return true;
        });
      }
      
      setOrders(filteredOrders);
      
      // Calculer les stats
      const delivered = filteredOrders.filter(o => o.status === 'delivered').length;
      const cancelled = filteredOrders.filter(o => o.status === 'cancelled').length;
      const rejected = filteredOrders.filter(o => o.status === 'rejected').length;
      const total = filteredOrders.length;
      const totalRevenue = filteredOrders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + (o.total || o.total_amount || 0), 0);
      
      setStats({
        total,
        delivered,
        cancelled,
        rejected,
        totalRevenue,
        averageOrderValue: delivered > 0 ? totalRevenue / delivered : 0,
        averagePreparationTime: 22, // À calculer depuis les vraies données
      });
    } catch (error) {
      console.error('Error loading order history:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
    >
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
          <Text style={styles.customerName}>{item.customerName}</Text>
        </View>
        <View style={styles.orderInfo}>
          <Text style={styles.orderDate}>
            {new Date(item.createdAt).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
          <Text style={styles.orderTime}>
            {new Date(item.createdAt).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.orderDetailItem}>
          <Ionicons name="cube-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.orderDetailText}>{item.itemsCount} articles</Text>
        </View>
        <View style={styles.orderDetailItem}>
          <Ionicons name="cash-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.orderDetailText}>{item.total} FCFA</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status) => {
    const colors = {
      delivered: COLORS.delivered,
      cancelled: COLORS.cancelled,
      refused: COLORS.cancelled,
    };
    return colors[status] || COLORS.textSecondary;
  };

  const getStatusLabel = (status) => {
    const labels = {
      delivered: 'Livrée',
      cancelled: 'Annulée',
      refused: 'Refusée',
    };
    return labels[status] || status;
  };

  const periods = [
    { key: 'today', label: "Aujourd'hui" },
    { key: 'week', label: 'Cette semaine' },
    { key: 'month', label: 'Ce mois' },
    { key: 'custom', label: 'Personnalisée' },
  ];

  const statuses = [
    { key: 'all', label: 'Toutes' },
    { key: 'delivered', label: 'Livrées' },
    { key: 'cancelled', label: 'Annulées' },
    { key: 'refused', label: 'Refusées' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Historique des commandes</Text>
      </View>

      {/* Statistiques */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>
              {stats.delivered}
            </Text>
            <Text style={styles.statLabel}>Livrées</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.error }]}>
              {stats.cancelled + stats.refused}
            </Text>
            <Text style={styles.statLabel}>Annulées</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>
              {stats.totalRevenue} FCFA
            </Text>
            <Text style={styles.statLabel}>CA total</Text>
          </View>
        </View>
      )}

      {/* Filtres */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Période :</Text>
            {periods.map((period) => (
              <TouchableOpacity
                key={period.key}
                style={[
                  styles.filterChip,
                  filters.period === period.key && styles.filterChipActive,
                ]}
                onPress={() => setFilters({ ...filters, period: period.key })}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filters.period === period.key && styles.filterChipTextActive,
                  ]}
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Statut :</Text>
            {statuses.map((status) => (
              <TouchableOpacity
                key={status.key}
                style={[
                  styles.filterChip,
                  filters.status === status.key && styles.filterChipActive,
                ]}
                onPress={() => setFilters({ ...filters, status: status.key })}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filters.status === status.key && styles.filterChipTextActive,
                  ]}
                >
                  {status.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Liste des commandes */}
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Aucune commande</Text>
            <Text style={styles.emptySubtext}>
              Aucune commande trouvée pour cette période
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  filtersContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filtersScroll: {
    paddingVertical: 12,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  list: {
    padding: 20,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  orderInfo: {
    alignItems: 'flex-end',
  },
  orderDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  orderTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  orderDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  orderDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderDetailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});

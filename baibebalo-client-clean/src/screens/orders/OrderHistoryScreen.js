import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  SectionList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { STATUS_LABELS, STATUS_COLORS } from '../../constants/orderStatus';
import { getOrderHistory } from '../../api/orders';
import EmptyOrderHistoryScreen from '../errors/EmptyOrderHistoryScreen';

export default function OrderHistoryScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await getOrderHistory();
      setOrders(response.data?.orders || response.data?.data?.orders || []);
    } catch (error) {
      console.error('Erreur lors du chargement des commandes:', error);
    } finally {
      setLoading(false);
    }
  };

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const getWeekStart = (date) => {
    const copy = new Date(date);
    const day = copy.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };

  const getSectionTitle = (date) => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isSameDay(date, today)) return 'Aujourd\'hui';

    const weekStart = getWeekStart(now);
    const orderWeekStart = getWeekStart(date);
    if (orderWeekStart.getTime() === weekStart.getTime()) return 'Cette semaine';

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    if (
      date.getFullYear() === lastMonth.getFullYear() &&
      date.getMonth() === lastMonth.getMonth()
    ) {
      return 'Mois dernier';
    }

    return 'Plus tôt';
  };

  const getTimeLabel = (date) => {
    const now = new Date();
    if (isSameDay(date, now)) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const groupedOrders = useMemo(() => {
    const groups = orders.reduce((acc, order) => {
      const date = new Date(order.created_at);
      const title = getSectionTitle(date);
      if (!acc[title]) {
        acc[title] = [];
      }
      acc[title].push({ ...order, _date: date });
      return acc;
    }, {});

    const orderBy = ['Aujourd\'hui', 'Cette semaine', 'Mois dernier', 'Plus tôt'];
    return orderBy
      .filter((title) => groups[title]?.length)
      .map((title) => ({
        title,
        data: groups[title].sort((a, b) => b._date - a._date),
      }));
  }, [orders]);

  const handleReorder = (order) => {
    const restaurantId = order.restaurant?.id;
    if (restaurantId) {
      navigation.navigate('RestaurantDetail', { restaurantId });
    }
  };

  const renderOrder = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
    >
      <View style={styles.orderHeader}>
        <View style={styles.statusRow}>
          <Text style={styles.statusBadgeText}>{STATUS_LABELS[item.status]}</Text>
          <Text style={styles.statusDivider}>•</Text>
          <Text style={styles.statusTime}>{getTimeLabel(item._date)}</Text>
        </View>
        <Text style={styles.restaurantName}>{item.restaurant?.name || 'Restaurant'}</Text>
        <Text style={styles.orderTotal}>
          {item.total_amount?.toLocaleString('fr-FR')} FCFA
        </Text>
      </View>
      <Image
        source={{ uri: item.restaurant?.image_url || 'https://via.placeholder.com/64' }}
        style={styles.orderImage}
      />
      <View style={styles.orderFooter}>
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={14} color={COLORS.warning} />
          <Text style={styles.ratingText}>{item.restaurant?.rating || '4.0'}</Text>
        </View>
        <TouchableOpacity style={styles.reorderButton} onPress={() => handleReorder(item)}>
          <Text style={styles.reorderText}>Recommander</Text>
          <Ionicons name="refresh" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {orders.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <EmptyOrderHistoryScreen />
        </View>
      ) : (
        <SectionList
          sections={groupedOrders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrder}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadOrders} />
          }
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: 16,
  },
  sectionHeader: {
    marginTop: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  orderHeader: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    textTransform: 'uppercase',
  },
  statusDivider: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  orderImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: COLORS.border,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reorderText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyContainer: {
    flex: 1,
  },
});

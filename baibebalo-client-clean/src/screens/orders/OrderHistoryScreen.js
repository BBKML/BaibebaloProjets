import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  SectionList,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useSafeAreaPadding } from '../../hooks/useSafeAreaPadding';
import { STATUS_LABELS, STATUS_COLORS, ACTIVE_STATUSES } from '../../constants/orderStatus';
import { getOrderHistory } from '../../api/orders';
import EmptyOrderHistoryScreen from '../errors/EmptyOrderHistoryScreen';

export default function OrderHistoryScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { paddingTop, paddingBottom } = useSafeAreaPadding({ withTabBar: true });

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
    const active = [];
    const past = [];

    orders.forEach((order) => {
      const item = { ...order, _date: new Date(order.created_at) };
      const status = (order.status || '').toLowerCase();
      if (ACTIVE_STATUSES.includes(status)) {
        active.push(item);
      } else {
        past.push(item);
      }
    });

    active.sort((a, b) => b._date - a._date);
    past.sort((a, b) => b._date - a._date);

    const sections = [];

    if (active.length > 0) {
      sections.push({ title: 'En cours', data: active, isActive: true, index: 0 });
    }

    const pastGroups = past.reduce((acc, order) => {
      const title = getSectionTitle(order._date);
      if (!acc[title]) acc[title] = [];
      acc[title].push(order);
      return acc;
    }, {});

    const orderBy = ['Aujourd\'hui', 'Cette semaine', 'Mois dernier', 'Plus tôt'];
    let idx = sections.length;
    orderBy.forEach((title) => {
      if (pastGroups[title]?.length) {
        sections.push({
          title,
          data: pastGroups[title].sort((a, b) => b._date - a._date),
          isActive: false,
          index: idx++,
        });
      }
    });

    return sections;
  }, [orders]);

  const handleReorder = (order) => {
    if (order.order_type === 'express') {
      navigation.navigate('ExpressCheckout');
      return;
    }
    const restaurantId = order.restaurant?.id;
    if (restaurantId) {
      navigation.navigate('RestaurantDetail', { restaurantId });
    }
  };

  const isActiveOrder = (order) =>
    ACTIVE_STATUSES.includes((order.status || '').toLowerCase());

  const getStatusColor = (status) =>
    STATUS_COLORS[status] || STATUS_COLORS.driver_at_customer || COLORS.primary;

  const renderOrder = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    return (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: item.order_type === 'express' ? 'https://via.placeholder.com/80?text=Express' : (item.restaurant?.banner || item.restaurant?.logo || item.restaurant?.image_url || 'https://via.placeholder.com/80') }}
        style={styles.orderImage}
        resizeMode="cover"
      />
      <View style={styles.orderContent}>
        <View style={styles.orderTopRow}>
          <Text style={styles.restaurantName} numberOfLines={1}>
            {item.order_type === 'express' ? '📦 Livraison express' : (item.restaurant?.name || 'Restaurant')}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{STATUS_LABELS[item.status] || item.status}</Text>
          </View>
        </View>
        <Text style={styles.orderDate}>{getTimeLabel(item._date)}</Text>
        <View style={styles.orderTotalRow}>
          <Text style={styles.totalLabel}>Montant total</Text>
          <Text style={styles.orderTotal}>
            {(item.total_amount ?? item.total ?? 0).toLocaleString('fr-FR')} FCFA
          </Text>
        </View>
        <View style={styles.orderActions}>
          {isActiveOrder(item) ? (
            <TouchableOpacity
              style={styles.trackButton}
              onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })}
            >
              <Ionicons name="navigate" size={16} color={COLORS.white} />
              <Text style={styles.trackButtonText}>Suivre la commande</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.ratingBadge}>
              {item.order_type !== 'express' && (
                <>
                  <Ionicons name="star" size={16} color={COLORS.warning} />
                  <Text style={styles.ratingText}>{item.restaurant?.rating || '4.0'}</Text>
                </>
              )}
            </View>
          )}
          <TouchableOpacity style={styles.reorderButton} onPress={() => handleReorder(item)}>
            <Ionicons name="arrow-redo" size={16} color={COLORS.primary} />
            <Text style={styles.reorderText}>Commander à nouveau</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
  };

  return (
    <View style={[styles.container, { paddingTop }]}>
      {orders.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <EmptyOrderHistoryScreen />
        </View>
      ) : (
        <SectionList
          sections={groupedOrders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrder}
          ListHeaderComponent={
            <View style={styles.pageHeader}>
              <Text style={styles.pageTitle}>Mes commandes</Text>
              <Text style={styles.pageSubtitle}>
                {orders.length} commande{orders.length > 1 ? 's' : ''} au total
              </Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={[
              styles.sectionHeader,
              section.isActive && styles.sectionHeaderActive,
              section.index === 0 && styles.sectionHeaderFirst,
            ]}>
              <View style={styles.sectionTitleRow}>
                {section.isActive && (
                  <Ionicons name="time-outline" size={18} color={COLORS.primary} style={styles.sectionIcon} />
                )}
                <Text style={[styles.sectionTitle, section.isActive && styles.sectionTitleActive]}>
                  {section.title}
                </Text>
              </View>
              {section.isActive && (
                <Text style={styles.sectionSubtitle}>
                  {section.data.length} commande{section.data.length > 1 ? 's' : ''} en cours
                </Text>
              )}
            </View>
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom }]}
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
    paddingBottom: 24,
  },
  pageHeader: {
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 12,
  },
  sectionHeaderFirst: {
    marginTop: 8,
  },
  sectionHeaderActive: {
    marginBottom: 6,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    marginRight: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  sectionTitleActive: {
    color: COLORS.primary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  orderImage: {
    width: 96,
    height: 96,
    backgroundColor: COLORS.border,
  },
  orderContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 4,
  },
  restaurantName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  orderTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  orderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  trackButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  reorderText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 0.2,
  },
  emptyContainer: {
    flex: 1,
  },
});

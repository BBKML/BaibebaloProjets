import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import useRestaurantStore from '../../store/restaurantStore';
import { restaurantOrders } from '../../api/orders';

export default function UrgentOrdersViewScreen({ navigation }) {
  const { pendingOrders, updateOrder } = useRestaurantStore();
  const [refreshing, setRefreshing] = useState(false);
  const [timers, setTimers] = useState({});
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadOrders();
    // Mettre à jour les timers toutes les secondes
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Initialiser les timers pour chaque commande
    const newTimers = {};
    pendingOrders.forEach(order => {
      if (order.receivedAt) {
        const receivedTime = new Date(order.receivedAt).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - receivedTime) / 1000);
        const remaining = Math.max(0, 120 - elapsed); // 2 minutes = 120 secondes
        newTimers[order.id] = remaining;
      }
    });
    setTimers(newTimers);
  }, [pendingOrders]);

  const loadOrders = async () => {
    try {
      const response = await restaurantOrders.getOrders({ status: 'new' });
      // Le backend retourne { success: true, data: { orders: [...] } }
      const ordersData = response.data?.orders || response.orders || [];
      // Les données seront mises à jour dans le store via setOrders
    } catch (error) {
      console.error('Error loading urgent orders:', error);
    }
  };

  const updateTimers = () => {
    setTimers(prev => {
      const newTimers = { ...prev };
      Object.keys(newTimers).forEach(orderId => {
        if (newTimers[orderId] > 0) {
          newTimers[orderId] = newTimers[orderId] - 1;
        }
      });
      return newTimers;
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleAccept = async (orderId) => {
    // Rediriger vers les détails pour accepter avec temps estimé
    navigation.navigate('OrderDetails', { orderId });
  };

  const handleRefuse = (orderId) => {
    navigation.navigate('RefuseOrderModal', { orderId });
  };

  const handleViewDetails = (orderId) => {
    navigation.navigate('OrderDetails', { orderId });
  };

  const renderOrderItem = ({ item }) => {
    const timeRemaining = timers[item.id] || 0;
    const isUrgent = timeRemaining < 30 && timeRemaining > 0;
    const isExpired = timeRemaining === 0;
    const urgencyPct = Math.min(1, timeRemaining / 120);
    const timerColor = isExpired ? COLORS.error : isUrgent ? '#F59E0B' : COLORS.primary;

    return (
      <View style={[styles.orderCard, isUrgent && styles.orderCardUrgent, isExpired && styles.orderCardExpired]}>
        {/* Barre de progression urgence */}
        <View style={styles.urgencyBar}>
          <View style={[styles.urgencyFill, { width: `${urgencyPct * 100}%`, backgroundColor: timerColor }]} />
        </View>

        {/* Infos commande + timer */}
        <View style={styles.cardBody}>
          <View style={styles.cardLeft}>
            <View style={styles.orderTopRow}>
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>URGENT</Text>
              </View>
              <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
              <Text style={styles.orderTime}>
                {new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <View style={styles.orderMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="cube-outline" size={13} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>{item.itemsCount} articles</Text>
              </View>
              {item.deliveryAddress ? (
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={13} color={COLORS.textSecondary} />
                  <Text style={styles.metaText} numberOfLines={1}>{item.deliveryAddress}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.orderAmount}>{item.total} FCFA</Text>
          </View>

          {/* Timer circulaire */}
          <View style={[styles.timerBox, { borderColor: timerColor }]}>
            <Text style={[styles.timerValue, { color: timerColor }]}>
              {isExpired ? '--:--' : formatTime(timeRemaining)}
            </Text>
            <Text style={[styles.timerLabel, { color: timerColor }]}>
              {isExpired ? 'Expiré' : 'Restant'}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.refuseLink}
            onPress={() => handleRefuse(item.id)}
          >
            <Text style={styles.refuseLinkText}>Refuser cette commande</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAccept(item.id)}
          >
            <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
            <Text style={styles.acceptButtonText}>ACCEPTER LA COMMANDE</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Trier par urgence (plus urgentes en premier)
  const sortedOrders = [...pendingOrders].sort((a, b) => {
    const timeA = timers[a.id] || 0;
    const timeB = timers[b.id] || 0;
    return timeA - timeB;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Commandes en attente</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingOrders.length}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.warningBanner}>
        <Ionicons name="warning" size={20} color={COLORS.warning} />
        <Text style={styles.warningText}>
          Répondez dans les 2 minutes pour maintenir votre taux d'acceptation
        </Text>
      </View>

      <FlatList
        data={sortedOrders}
        renderItem={renderOrderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
            <Text style={styles.emptyText}>Aucune commande en attente</Text>
            <Text style={styles.emptySubtext}>Toutes les commandes ont été traitées</Text>
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
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  badge: {
    backgroundColor: COLORS.error,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 4,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '15',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  list: {
    padding: 20,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  orderCardUrgent: {
    borderColor: '#F59E0B',
  },
  orderCardExpired: {
    borderColor: COLORS.error,
  },
  urgencyBar: {
    height: 4,
    backgroundColor: COLORS.border,
  },
  urgencyFill: {
    height: 4,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  cardLeft: {
    flex: 1,
    gap: 4,
  },
  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  urgentBadge: {
    backgroundColor: COLORS.error + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.error,
    letterSpacing: 0.8,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  orderTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 'auto',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  orderMeta: {
    gap: 4,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  orderAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 4,
  },
  timerBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  timerValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timerLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 14,
    paddingBottom: 14,
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
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
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
  },
});

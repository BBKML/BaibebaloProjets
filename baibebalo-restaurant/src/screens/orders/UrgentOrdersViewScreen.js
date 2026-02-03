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
    const isUrgent = timeRemaining < 30;
    const isExpired = timeRemaining === 0;

    return (
      <View style={[styles.orderCard, isUrgent && styles.orderCardUrgent, isExpired && styles.orderCardExpired]}>
        <View style={styles.urgentHeader}>
          <View style={styles.urgentBadge}>
            <Ionicons name="alert-circle" size={20} color={COLORS.error} />
            <Text style={styles.urgentText}>URGENT</Text>
          </View>
          <View style={[styles.timerContainer, isUrgent && styles.timerUrgent, isExpired && styles.timerExpired]}>
            <Ionicons name="time" size={16} color={isExpired ? COLORS.error : COLORS.white} />
            <Text style={[styles.timerText, isExpired && styles.timerTextExpired]}>
              {isExpired ? 'Expiré' : `Répondre dans : ${formatTime(timeRemaining)}`}
            </Text>
          </View>
        </View>

        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
            <Text style={styles.customerName}>{item.customerName}</Text>
          </View>
          <View style={styles.orderInfo}>
            <Text style={styles.orderTime}>{new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
            <Text style={styles.orderAmount}>{item.total} FCFA</Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.orderDetailItem}>
            <Ionicons name="cube-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.orderDetailText}>{item.itemsCount} articles</Text>
          </View>
          <View style={styles.orderDetailItem}>
            <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.orderDetailText} numberOfLines={1}>{item.deliveryAddress}</Text>
          </View>
        </View>

        <View style={styles.orderActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAccept(item.id)}
          >
            <Ionicons name="checkmark" size={18} color={COLORS.white} />
            <Text style={styles.acceptButtonText}>ACCEPTER</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.refuseButton]}
            onPress={() => handleRefuse(item.id)}
          >
            <Ionicons name="close" size={18} color={COLORS.white} />
            <Text style={styles.refuseButtonText}>REFUSER</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => handleViewDetails(item.id)}
          >
            <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  orderCardUrgent: {
    borderColor: COLORS.warning,
    backgroundColor: COLORS.warning + '05',
  },
  orderCardExpired: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.error + '05',
  },
  urgentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  urgentText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.error,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  timerUrgent: {
    backgroundColor: COLORS.warning,
  },
  timerExpired: {
    backgroundColor: COLORS.error,
  },
  timerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  timerTextExpired: {
    color: COLORS.white,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 18,
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
  orderTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  orderDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
  orderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 6,
  },
  acceptButton: {
    backgroundColor: COLORS.success,
  },
  refuseButton: {
    backgroundColor: COLORS.error,
  },
  acceptButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  refuseButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailsButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
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

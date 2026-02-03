import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { getNotifications, markNotificationRead } from '../../api/notifications';

const NOTIFICATION_ICONS = {
  order: 'receipt-outline',
  promotion: 'pricetag-outline',
  delivery: 'bicycle-outline',
  payment: 'card-outline',
  support: 'chatbubble-outline',
  account: 'person-outline',
  system: 'information-circle-outline',
  default: 'notifications-outline',
};

const NOTIFICATION_COLORS = {
  order: COLORS.primary,
  promotion: '#F59E0B',
  delivery: '#10B981',
  payment: '#8B5CF6',
  support: '#3B82F6',
  account: '#EC4899',
  system: '#6B7280',
  default: COLORS.primary,
};

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await getNotifications();
      const data = response.data?.notifications || response.notifications || [];
      setNotifications(data);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = async (notification) => {
    // Marquer comme lu si pas déjà lu
    if (!notification.read_at) {
      try {
        await markNotificationRead(notification.id);
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
          )
        );
      } catch (error) {
        console.error('Erreur marquage notification:', error);
      }
    }

    // Navigation selon le type
    const data = notification.data || {};
    switch (notification.type) {
      case 'order':
        if (data.order_id) {
          navigation.navigate('OrderDetails', { orderId: data.order_id });
        }
        break;
      case 'delivery':
        if (data.order_id) {
          navigation.navigate('OrderTracking', { orderId: data.order_id });
        }
        break;
      case 'promotion':
        navigation.navigate('Home');
        break;
      case 'support':
        if (data.ticket_id) {
          navigation.navigate('ClaimTicketDetails', { ticketId: data.ticket_id });
        } else {
          navigation.navigate('MyClaimsTracking');
        }
        break;
      default:
        // Pas de navigation spécifique
        break;
    }
  };

  const handleMarkAllRead = async () => {
    try {
      // Marquer toutes les notifications non lues comme lues
      const unreadNotifications = notifications.filter(n => !n.read_at);
      await Promise.all(
        unreadNotifications.map(n => markNotificationRead(n.id))
      );
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch (error) {
      console.error('Erreur marquage notifications:', error);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read_at)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read_at).length;

  const renderNotification = ({ item }) => {
    const isRead = !!item.read_at;
    const type = item.type || 'default';
    const icon = NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.default;
    const color = NOTIFICATION_COLORS[type] || NOTIFICATION_COLORS.default;

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !isRead && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, !isRead && styles.unreadTitle]} numberOfLines={1}>
              {item.title}
            </Text>
            {!isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {item.message || item.body}
          </Text>
          <Text style={styles.time}>{formatTime(item.created_at)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={64} color={COLORS.textLight} />
      <Text style={styles.emptyTitle}>
        {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
      </Text>
      <Text style={styles.emptyText}>
        {filter === 'unread'
          ? 'Toutes vos notifications ont été lues.'
          : 'Vous recevrez ici les mises à jour sur vos commandes, promotions et plus encore.'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Tout lire</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={styles.placeholder} />}
      </View>

      {/* Filtres */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Toutes ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'unread' && styles.filterButtonActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
            Non lues ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste des notifications */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={filteredNotifications.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
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
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    backgroundColor: COLORS.white,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.white,
  },
  list: {
    padding: 12,
  },
  emptyList: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  unreadItem: {
    backgroundColor: COLORS.primary + '08',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  message: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});

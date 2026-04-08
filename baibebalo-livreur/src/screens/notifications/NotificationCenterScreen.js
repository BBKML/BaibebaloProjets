import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { getNotifications, markAsRead, markAllAsRead } from '../../api/notifications';

const ICON_MAP = {
  order: 'bicycle',
  payment: 'cash',
  system: 'information-circle',
  alert: 'warning',
  bonus: 'star',
  default: 'notifications',
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'À l\'instant';
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Hier';
  return `Il y a ${days} jours`;
};

export default function NotificationCenterScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getNotifications(1, 30);
      const list = data?.data?.notifications || data?.notifications || [];
      setNotifications(list);
    } catch (err) {
      setError('Impossible de charger les notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleMarkAsRead = async (item) => {
    if (item.is_read) return;
    try {
      await markAsRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
    } catch (_) {}
  };

  const handleMarkAllAsRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (_) {}
    finally { setMarkingAll(false); }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const renderItem = ({ item }) => {
    const iconName = ICON_MAP[item.type] || ICON_MAP.default;
    return (
      <TouchableOpacity
        style={[styles.notifItem, !item.is_read && styles.notifItemUnread]}
        onPress={() => handleMarkAsRead(item)}
        activeOpacity={0.75}
      >
        <View style={[styles.notifIcon, !item.is_read && styles.notifIconUnread]}>
          <Ionicons name={iconName} size={20} color={item.is_read ? COLORS.textSecondary : COLORS.primary} />
        </View>
        <View style={styles.notifContent}>
          <Text style={[styles.notifTitle, !item.is_read && styles.notifTitleUnread]} numberOfLines={1}>
            {item.title || 'Notification'}
          </Text>
          <Text style={styles.notifMessage} numberOfLines={2}>
            {item.message || item.body || ''}
          </Text>
          <Text style={styles.notifTime}>{formatTime(item.created_at)}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>
          Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllAsRead} disabled={markingAll}>
            <Text style={styles.markAllText}>{markingAll ? '...' : 'Tout lire'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadNotifications()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNotifications(true)}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContent}>
              <Ionicons name="notifications-off-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyTitle}>Aucune notification</Text>
              <Text style={styles.emptySubtitle}>Vos notifications apparaîtront ici</Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  placeholder: { width: 60 },
  markAllText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  list: { padding: 16, paddingBottom: 32 },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notifItemUnread: {
    backgroundColor: COLORS.primary + '08',
    borderColor: COLORS.primary + '40',
  },
  notifIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  notifIconUnread: { backgroundColor: COLORS.primary + '15' },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  notifTitleUnread: { color: COLORS.primary },
  notifMessage: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3, lineHeight: 17 },
  notifTime: { fontSize: 11, color: COLORS.textSecondary, marginTop: 5 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 4, marginLeft: 8,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 12, textAlign: 'center' },
  retryButton: {
    marginTop: 16, paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: COLORS.primary, borderRadius: 10,
  },
  retryText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  emptyContainer: { flex: 1 },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6 },
});

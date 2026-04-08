import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Animated,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PropTypes from 'prop-types';
import { COLORS } from '../../constants/colors';
import useRestaurantStore from '../../store/restaurantStore';
import { restaurantOrders } from '../../api/orders';
import { getImageUrl } from '../../utils/url';
import socketService from '../../services/socketService';
import soundService from '../../services/soundService';
import Toast from 'react-native-toast-message';

// Temps de préparation suggérés (minutes)
const PREP_TIMES = [10, 15, 20, 25, 30, 45, 60];

export default function OrdersScreen({ navigation }) {
  const { orders, setOrders } = useRestaurantStore();
  const [selectedTab, setSelectedTab] = useState('new');
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [urgentOrderId, setUrgentOrderId] = useState(null);
  const [acceptModal, setAcceptModal] = useState(null); // { orderId }
  const [selectedPrepTime, setSelectedPrepTime] = useState(20);
  const [accepting, setAccepting] = useState(false);
  const [, setTick] = useState(0);
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Timer pour commandes nouvelles
  useEffect(() => {
    const newCount = orders.filter(o => o.status === 'new' || o.status === 'pending').length;
    if (newCount === 0) return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [orders.filter(o => o.status === 'new' || o.status === 'pending').length]);

  useEffect(() => {
    try { soundService.initialize(); } catch (_) {}
  }, []);

  useEffect(() => {
    try { socketService.connect(); } catch (_) {}

    const unsubConn = socketService.on('connection_status', ({ connected }) => setIsConnected(connected));

    const unsubNew = socketService.on('new_order', () => {
      loadOrders();
      setSelectedTab('new');
    });

    const unsubUpdate = socketService.on('order_update', () => loadOrders());

    const unsubUrgent = socketService.on('order_urgent_alert', ({ orderId }) => {
      setUrgentOrderId(orderId);
      startPulse();
    });

    const unsubCancelled = socketService.on('order_cancelled', () => loadOrders());

    return () => {
      unsubConn(); unsubNew(); unsubUpdate(); unsubUrgent(); unsubCancelled();
    };
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, [selectedTab]);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 300, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const loadOrders = async () => {
    try {
      const statusMap = {
        new: 'new',
        'in-progress': 'accepted,preparing,ready,picked_up,delivering',
        completed: 'delivered',
        all: undefined,
      };
      const response = await restaurantOrders.getOrders({ status: statusMap[selectedTab] });
      const raw = response.data?.orders || response.orders || [];
      const normalized = raw.map(o => ({
        ...o,
        orderNumber: o.order_number || (o.id ? o.id.slice(0, 8).toUpperCase() : null),
        customerName: o.customer_name || 'Client',
        itemsCount: o.items_count || o.items?.length || o.order_items?.length || 0,
        createdAt: o.created_at || o.placed_at || new Date().toISOString(),
        netRevenue: o.net_revenue != null ? parseFloat(o.net_revenue) : null,
      }));
      setOrders(normalized);
    } catch (_) {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleOpenAcceptModal = (orderId) => {
    setSelectedPrepTime(20);
    setAcceptModal({ orderId });
  };

  const handleConfirmAccept = async () => {
    if (!acceptModal || accepting) return;
    setAccepting(true);
    try {
      await restaurantOrders.acceptOrder(acceptModal.orderId, selectedPrepTime);
      setAcceptModal(null);
      Toast.show({
        type: 'success',
        text1: '✅ Commande acceptée',
        text2: `Temps de préparation : ${selectedPrepTime} min`,
      });
      loadOrders();
    } catch (_) {
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Impossible d\'accepter la commande' });
    } finally {
      setAccepting(false);
    }
  };

  const handleRefuse = (orderId) => navigation.navigate('RefuseOrderModal', { orderId });

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0 FCFA';
    return parseFloat(amount).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA';
  };

  const getNetRevenue = (item) => {
    let net = item.netRevenue ?? item.net_revenue;
    if (net == null) {
      const sub = parseFloat(item.subtotal || 0);
      const rate = parseFloat(item.commission_rate || 15);
      const com = parseFloat(item.commission || 0);
      net = Math.max(0, sub - (com > 0 ? com : (sub * rate) / 100));
    }
    return parseFloat(net);
  };

  const getTimeAgo = (ts) => {
    if (!ts) return '';
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (diff < 1) return 'À l\'instant';
    if (diff < 60) return `Il y a ${diff} min`;
    return `Il y a ${Math.floor(diff / 60)}h`;
  };

  const getTimeRemaining = (order) => {
    const ts = order.createdAt || order.placed_at;
    if (!ts) return null;
    const elapsed = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    const remaining = Math.max(0, 120 - elapsed);
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return { display: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, isExpired: remaining <= 0, remaining };
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'new': case 'pending': return { label: 'Nouveau', color: COLORS.warning, bg: '#fef3c7' };
      case 'accepted': return { label: 'Accepté', color: '#3b82f6', bg: '#eff6ff' };
      case 'preparing': return { label: 'En préparation', color: COLORS.primary, bg: COLORS.primary + '15' };
      case 'ready': return { label: 'Prêt', color: '#10b981', bg: '#f0fdf4' };
      case 'picking_up': case 'picked_up': return { label: 'Récupéré', color: '#8b5cf6', bg: '#f5f3ff' };
      case 'delivering': return { label: 'En livraison', color: '#0ea5e9', bg: '#f0f9ff' };
      case 'delivered': return { label: 'Livré', color: '#10b981', bg: '#f0fdf4' };
      case 'cancelled': return { label: 'Annulé', color: COLORS.error, bg: '#fef2f2' };
      default: return { label: status, color: COLORS.textSecondary, bg: COLORS.background };
    }
  };

  const filteredOrders = orders.filter(o => {
    if (selectedTab === 'new') return o.status === 'pending' || o.status === 'new';
    if (selectedTab === 'in-progress') return ['accepted', 'preparing', 'ready', 'picked_up', 'picking_up', 'delivering'].includes(o.status);
    if (selectedTab === 'completed') return o.status === 'delivered';
    return true;
  });

  const newCount = orders.filter(o => o.status === 'pending' || o.status === 'new').length;
  const inProgressCount = orders.filter(o => ['accepted', 'preparing', 'ready', 'picked_up', 'delivering'].includes(o.status)).length;

  const tabs = [
    { key: 'new', label: 'Nouvelles', count: newCount },
    { key: 'in-progress', label: 'En cours', count: inProgressCount },
    { key: 'completed', label: 'Livrées', count: null },
    { key: 'all', label: 'Toutes', count: null },
  ];

  const renderOrderItem = ({ item }) => {
    const statusCfg = getStatusConfig(item.status);
    const isNew = item.status === 'new' || item.status === 'pending';
    const timeR = isNew ? getTimeRemaining(item) : null;
    const timeAgo = getTimeAgo(item.createdAt || item.placed_at);
    const net = getNetRevenue(item);
    const orderNum = item.orderNumber || (item.id ? item.id.slice(0, 8).toUpperCase() : 'N/A');
    const isUrgent = urgentOrderId === item.id;

    return (
      <Animated.View style={isUrgent ? { transform: [{ scale: pulseAnim }] } : {}}>
        <TouchableOpacity
          style={[styles.orderCard, isNew && styles.orderCardNew]}
          onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
          activeOpacity={0.85}
        >
          {/* Bandeau gauche coloré */}
          <View style={[styles.orderAccent, { backgroundColor: statusCfg.color }]} />

          <View style={styles.orderBody}>
            {/* Ligne 1 : numéro + badge statut + timer */}
            <View style={styles.orderRow}>
              <Text style={styles.orderNum}>#{orderNum}</Text>
              <View style={{ flex: 1 }} />
              {isNew && timeR && (
                <View style={[styles.timerPill, { backgroundColor: timeR.isExpired ? '#fef2f2' : '#fff7ed' }]}>
                  <Ionicons name="time" size={12} color={timeR.isExpired ? COLORS.error : COLORS.warning} />
                  <Text style={[styles.timerPillText, { color: timeR.isExpired ? COLORS.error : COLORS.warning }]}>
                    {timeR.display}
                  </Text>
                </View>
              )}
              <View style={[styles.statusPill, { backgroundColor: statusCfg.bg }]}>
                <Text style={[styles.statusPillText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
              </View>
            </View>

            {/* Ligne 2 : client + image */}
            <View style={styles.orderRow}>
              <View style={styles.orderMeta}>
                <Text style={styles.customerName} numberOfLines={1}>{item.customerName || 'Client'}</Text>
                <Text style={styles.orderDetails}>
                  {item.itemsCount || 0} article{(item.itemsCount || 0) > 1 ? 's' : ''} • {timeAgo}
                </Text>
              </View>
              {item.firstItemImage ? (
                <Image source={{ uri: getImageUrl(item.firstItemImage) }} style={styles.orderThumb} />
              ) : (
                <View style={styles.orderThumbEmpty}>
                  <Ionicons name="fast-food-outline" size={20} color={COLORS.textSecondary} />
                </View>
              )}
            </View>

            {/* Montant */}
            <Text style={styles.orderAmount}>{formatCurrency(net)}</Text>

            {/* Boutons d'action */}
            {isNew ? (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.btnRefuse}
                  onPress={() => handleRefuse(item.id)}
                >
                  <Ionicons name="close" size={16} color={COLORS.error} />
                  <Text style={styles.btnRefuseText}>Refuser</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnAccept}
                  onPress={() => handleOpenAcceptModal(item.id)}
                >
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.btnAcceptText}>Accepter</Text>
                </TouchableOpacity>
              </View>
            ) : item.status === 'accepted' ? (
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
              >
                <Ionicons name="flame-outline" size={16} color="#fff" />
                <Text style={styles.btnPrimaryText}>Démarrer la préparation</Text>
              </TouchableOpacity>
            ) : item.status === 'preparing' ? (
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: '#10b981' }]}
                onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
              >
                <Ionicons name="checkmark-done-outline" size={16} color="#fff" />
                <Text style={styles.btnPrimaryText}>Marquer comme prête</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Bannière urgente */}
      {urgentOrderId && (
        <Animated.View style={[styles.urgentBanner, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons name="warning" size={18} color="#fff" />
          <Text style={styles.urgentText}>Commande en attente de réponse !</Text>
          <TouchableOpacity onPress={() => { setUrgentOrderId(null); stopPulse(); }}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Commandes</Text>
        <View style={[styles.connBadge, isConnected ? styles.connBadgeOn : styles.connBadgeOff]}>
          <View style={[styles.connDot, { backgroundColor: isConnected ? '#10b981' : '#ef4444' }]} />
          <Text style={[styles.connText, { color: isConnected ? '#10b981' : '#ef4444' }]}>
            {isConnected ? 'Temps réel' : 'Hors ligne'}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
        style={styles.tabsScroll}
      >
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, selectedTab === tab.key && styles.tabActive]}
            onPress={() => {
              setSelectedTab(tab.key);
              if (tab.key === 'new') { setUrgentOrderId(null); stopPulse(); }
            }}
          >
            <Text style={[styles.tabText, selectedTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {tab.count != null && tab.count > 0 && (
              <View style={[styles.tabBadge, selectedTab === tab.key && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, selectedTab === tab.key && styles.tabBadgeTextActive]}>
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Liste */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={item => item.id?.toString() || item.order_number || Math.random().toString()}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Ionicons name="receipt-outline" size={40} color={COLORS.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>Aucune commande</Text>
            <Text style={styles.emptySub}>
              {selectedTab === 'new'
                ? 'Les nouvelles commandes apparaîtront ici'
                : selectedTab === 'in-progress'
                ? 'Aucune commande en cours de préparation'
                : 'Aucune commande dans cette catégorie'}
            </Text>
          </View>
        }
      />

      {/* Modal Acceptation avec choix temps de préparation */}
      <Modal
        visible={!!acceptModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAcceptModal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setAcceptModal(null)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Temps de préparation</Text>
            <Text style={styles.modalSub}>Combien de temps faut-il pour préparer cette commande ?</Text>

            <View style={styles.prepGrid}>
              {PREP_TIMES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.prepChip, selectedPrepTime === t && styles.prepChipActive]}
                  onPress={() => setSelectedPrepTime(t)}
                >
                  <Text style={[styles.prepChipText, selectedPrepTime === t && styles.prepChipTextActive]}>
                    {t} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setAcceptModal(null)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, accepting && styles.modalConfirmDisabled]}
                onPress={handleConfirmAccept}
                disabled={accepting}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.modalConfirmText}>
                  {accepting ? 'En cours...' : `Accepter (${selectedPrepTime} min)`}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

OrdersScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  urgentText: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 13 },
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
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  connBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  connBadgeOn: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  connBadgeOff: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  connDot: { width: 6, height: 6, borderRadius: 3 },
  connText: { fontSize: 11, fontWeight: '700' },
  tabsScroll: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabsRow: {
    paddingHorizontal: 16,
    gap: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary, fontWeight: '800' },
  tabBadge: {
    backgroundColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: { backgroundColor: COLORS.primary + '20' },
  tabBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  tabBadgeTextActive: { color: COLORS.primary },
  list: { padding: 16, gap: 12 },

  // Order card
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 0,
  },
  orderCardNew: {
    borderColor: COLORS.primary + '40',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.12,
  },
  orderAccent: {
    width: 4,
    backgroundColor: COLORS.primary,
  },
  orderBody: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderNum: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  timerPillText: { fontSize: 12, fontWeight: '800' },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  orderMeta: { flex: 1 },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  orderDetails: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  orderThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  orderThumbEmpty: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btnRefuse: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.error + '50',
    backgroundColor: '#fef2f2',
  },
  btnRefuseText: { fontSize: 14, fontWeight: '700', color: COLORS.error },
  btnAccept: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  btnAcceptText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Empty state
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  modalSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: -8 },
  prepGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  prepChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  prepChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '12',
  },
  prepChipText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  prepChipTextActive: { color: COLORS.primary },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  modalConfirm: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalConfirmDisabled: { opacity: 0.6 },
  modalConfirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

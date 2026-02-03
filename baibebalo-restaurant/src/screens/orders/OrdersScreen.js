import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PropTypes from 'prop-types';
import { COLORS } from '../../constants/colors';
import useRestaurantStore from '../../store/restaurantStore';
import { restaurantOrders } from '../../api/orders';
import socketService from '../../services/socketService';
import soundService from '../../services/soundService';

export default function OrdersScreen({ navigation }) {
  const { orders, setOrders } = useRestaurantStore();
  const [selectedTab, setSelectedTab] = useState('new');
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [urgentOrderId, setUrgentOrderId] = useState(null);
  const insets = useSafeAreaInsets();
  
  // Animation pour les alertes urgentes
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Initialiser le service audio au montage
  useEffect(() => {
    try {
      soundService.initialize();
    } catch (err) {
      console.warn('⚠️ Erreur init audio:', err);
    }
  }, []);

  // Connecter Socket.IO et écouter les événements
  useEffect(() => {
    // Connecter au socket (avec gestion d'erreur)
    try {
      socketService.connect();
    } catch (err) {
      console.warn('⚠️ Erreur connexion socket:', err);
    }

    // Écouter le statut de connexion
    const unsubscribeConnection = socketService.on('connection_status', ({ connected }) => {
      setIsConnected(connected);
    });

    // Écouter les nouvelles commandes
    const unsubscribeNewOrder = socketService.on('new_order', (data) => {
      console.log('📱 Nouvelle commande reçue dans OrdersScreen:', data);
      // Recharger les commandes pour inclure la nouvelle
      loadOrders();
      // Passer à l'onglet "Nouvelles"
      setSelectedTab('new');
    });

    // Écouter les mises à jour de commandes
    const unsubscribeOrderUpdate = socketService.on('order_update', (data) => {
      console.log('📱 Mise à jour commande:', data);
      loadOrders();
    });

    // Écouter les alertes urgentes
    const unsubscribeUrgent = socketService.on('order_urgent_alert', ({ orderId, waitingMinutes }) => {
      setUrgentOrderId(orderId);
      // Animation de pulsation pour attirer l'attention
      startPulseAnimation();
      Alert.alert(
        '⚠️ Commande en attente!',
        `Une commande attend votre réponse depuis ${waitingMinutes} minutes!\n\nVeuillez l'accepter ou la refuser rapidement.`,
        [
          { 
            text: 'Voir la commande', 
            onPress: () => {
              setSelectedTab('new');
              soundService.stopSound('urgentOrder');
            }
          }
        ]
      );
    });

    return () => {
      unsubscribeConnection();
      unsubscribeNewOrder();
      unsubscribeOrderUpdate();
      unsubscribeUrgent();
    };
  }, []);

  // Animation de pulsation pour alertes urgentes
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 300, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  useEffect(() => {
    loadOrders();
    
    // Rafraîchissement automatique toutes les 30 secondes
    const refreshInterval = setInterval(() => {
      loadOrders();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [selectedTab]);

  const loadOrders = async () => {
    try {
      const statusMap = {
        'new': 'new',
        'in-progress': 'accepted',
        'completed': 'delivered',
        'all': undefined,
      };
      const status = statusMap[selectedTab];
      const response = await restaurantOrders.getOrders({ status });
      const ordersData = response.data?.orders || response.orders || [];
      
      // Normaliser les données pour correspondre au format attendu
      const normalizedOrders = ordersData.map(order => ({
        ...order,
        orderNumber: order.orderNumber || order.order_number || (order.id ? order.id.slice(0, 8).toUpperCase() : null),
        customerName: order.customerName || order.customer_name || 'Client',
        itemsCount: order.itemsCount || order.items_count || order.items?.length || order.order_items?.length || 0,
        createdAt: order.createdAt || order.created_at || order.placed_at || new Date().toISOString(),
        total: order.total || order.total_amount || 0,
      }));
      
      setOrders(normalizedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const filteredOrders = orders.filter(order => {
    if (selectedTab === 'new') return order.status === 'pending' || order.status === 'new';
    if (selectedTab === 'in-progress') return ['accepted', 'preparing'].includes(order.status);
    if (selectedTab === 'completed') return order.status === 'delivered';
    return true;
  });

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0 FCFA';
    const value = Number.parseFloat(amount);
    return value.toLocaleString('fr-FR', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }) + ' FCFA';
  };

  const getTimeRemaining = (order) => {
    // Calculer le temps restant basé sur la date de création
    if (order.createdAt || order.created_at || order.placed_at) {
      const orderTime = new Date(order.createdAt || order.created_at || order.placed_at);
      const now = new Date();
      const diffMs = now - orderTime;
      const diffMins = Math.floor(diffMs / 60000);
      
      // Temps maximum pour répondre : 5 minutes
      const maxResponseTime = 5;
      const remainingMins = Math.max(0, maxResponseTime - diffMins);
      const remainingSecs = Math.max(0, 60 - Math.floor((diffMs % 60000) / 1000));
      
      return `${String(remainingMins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
    }
    return '04:59';
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Il y a 2 min';
    const now = new Date();
    const orderTime = new Date(timestamp);
    const diffMs = now - orderTime;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    return `Il y a ${diffHours}h`;
  };

  const getPriorityColor = (order) => {
    if (order.status === 'new' || order.status === 'pending') {
      const timeAgo = getTimeAgo(order.createdAt || order.created_at || order.placed_at);
      if (timeAgo.includes('À l\'instant') || timeAgo.includes('1 min')) {
        return COLORS.error; // Rouge pour urgent
      }
      return COLORS.warning; // Orange pour nouveau
    }
    return COLORS.textSecondary; // Gris pour autres
  };

  const handleAccept = async (orderId) => {
    navigation.navigate('OrderDetails', { orderId });
  };

  const handleRefuse = (orderId) => {
    navigation.navigate('RefuseOrderModal', { orderId });
  };

  const tabs = [
    { key: 'new', label: 'Nouvelles', count: orders.filter(o => o.status === 'pending' || o.status === 'new').length },
    { key: 'in-progress', label: 'En cours', count: orders.filter(o => ['accepted', 'preparing'].includes(o.status)).length },
    { key: 'completed', label: 'Complétées', count: orders.filter(o => o.status === 'delivered').length },
    { key: 'all', label: 'Toutes' },
  ];

  const renderOrderItem = ({ item }) => {
    const priorityColor = getPriorityColor(item);
    const isUrgent = priorityColor === COLORS.error;
    const timeRemaining = getTimeRemaining(item);
    const timeAgo = getTimeAgo(item.createdAt || item.created_at || item.placed_at);
    const itemsCount = item.itemsCount || 0;
    const customerName = item.customerName || 'Client';
    const orderNumber = item.orderNumber || item.order_number || (item.id ? item.id.slice(0, 8).toUpperCase() : 'N/A');
    const orderTotal = item.total || item.total_amount || 0;
    
    // Déterminer le label du statut
    const getStatusLabel = () => {
      if (item.status === 'new' || item.status === 'pending') {
        return isUrgent ? 'Priorité Haute' : 'Nouveau';
      }
      if (item.status === 'accepted' || item.status === 'preparing') {
        return 'En préparation';
      }
      if (item.status === 'ready') {
        return 'Prêt';
      }
      if (item.status === 'delivered') {
        return 'Livré';
      }
      if (item.status === 'cancelled') {
        return 'Annulé';
      }
      return 'Nouveau';
    };

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderCardContent}>
          <View style={styles.orderHeader}>
            <View style={styles.orderHeaderLeft}>
              <Text style={[styles.orderStatusLabel, { color: isUrgent ? COLORS.primary : COLORS.textSecondary }]}>
                #{orderNumber} • {getStatusLabel()}
              </Text>
            </View>
            <View style={[styles.timerBadge, { backgroundColor: isUrgent ? COLORS.error + '1A' : COLORS.warning + '1A' }]}>
              <Ionicons name="time" size={12} color={isUrgent ? COLORS.error : COLORS.warning} />
              <Text style={[styles.timerText, { color: isUrgent ? COLORS.error : COLORS.warning }]}>
                {timeRemaining}
              </Text>
            </View>
          </View>

          <View style={styles.orderBody}>
            {item.firstItemImage ? (
              <Image source={{ uri: item.firstItemImage }} style={styles.orderImage} />
            ) : (
              <View style={[styles.orderImage, styles.orderImagePlaceholder]}>
                <Ionicons name="fast-food-outline" size={24} color={COLORS.textLight} />
              </View>
            )}
            <View style={styles.orderInfo}>
              <Text style={styles.customerName} numberOfLines={1}>
                {customerName}
              </Text>
              <Text style={styles.orderMeta} numberOfLines={1}>
                {timeAgo} • {itemsCount} article{itemsCount > 1 ? 's' : ''}
              </Text>
              <Text style={styles.orderTotal}>
                {formatCurrency(orderTotal)}
              </Text>
            </View>
          </View>

          <View style={styles.orderActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleAccept(item.id)}
            >
              <Text style={styles.acceptButtonText}>Accepter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.refuseButton]}
              onPress={() => handleRefuse(item.id)}
            >
              <Text style={styles.refuseButtonText}>Refuser</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
          >
            <Text style={styles.detailsButtonText}>Voir les détails</Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Compter les commandes nouvelles
  const newOrdersCount = orders.filter(o => o.status === 'pending' || o.status === 'new').length;
  const hasUrgentOrders = urgentOrderId !== null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Bannière d'alerte urgente */}
      {hasUrgentOrders && (
        <Animated.View style={[styles.urgentBanner, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons name="warning" size={20} color="#FFF" />
          <Text style={styles.urgentBannerText}>
            Commande en attente! Veuillez répondre rapidement.
          </Text>
          <TouchableOpacity 
            onPress={() => {
              setUrgentOrderId(null);
              stopPulseAnimation();
              soundService.stopSound('urgentOrder');
            }}
          >
            <Ionicons name="close" size={20} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarContent}>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="menu" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.topBarTitle}>Commandes</Text>
            {/* Indicateur de connexion temps réel */}
            <View style={[styles.connectionIndicator, isConnected ? styles.connected : styles.disconnected]}>
              <View style={[styles.connectionDot, isConnected ? styles.connectedDot : styles.disconnectedDot]} />
              <Text style={styles.connectionText}>
                {isConnected ? 'En direct' : 'Hors ligne'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
            {newOrdersCount > 0 && (
              <View style={[styles.notificationBadge, hasUrgentOrders && styles.urgentBadge]}>
                <Text style={styles.notificationBadgeText}>{newOrdersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Segmented Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {tabs.map(tab => {
            const isNewTab = tab.key === 'new';
            const isUrgent = isNewTab && hasUrgentOrders;
            
            return (
              <Animated.View 
                key={tab.key}
                style={isUrgent ? { transform: [{ scale: pulseAnim }] } : {}}
              >
                <TouchableOpacity
                  style={[
                    styles.tab, 
                    selectedTab === tab.key && styles.tabActive,
                    isUrgent && styles.tabUrgent
                  ]}
                  onPress={() => {
                    setSelectedTab(tab.key);
                    if (isNewTab) {
                      setUrgentOrderId(null);
                      stopPulseAnimation();
                      soundService.stopSound('urgentOrder');
                    }
                  }}
                >
                  <Text style={[
                    styles.tabText, 
                    selectedTab === tab.key && styles.tabTextActive,
                    isUrgent && styles.tabTextUrgent
                  ]}>
                    {tab.label}
                  </Text>
                  {tab.count !== undefined && tab.count > 0 && (
                    <View style={[styles.tabBadge, isUrgent && styles.tabBadgeUrgent]}>
                      <Text style={[styles.tabBadgeText, isUrgent && styles.tabBadgeTextUrgent]}>
                        {tab.count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={item => item.id?.toString() || item.order_number}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Aucune commande</Text>
          </View>
        }
      />
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
  topBar: {
    backgroundColor: COLORS.background + 'CC',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  notificationButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 24,
  },
  tab: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingBottom: 8,
    paddingTop: 4,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 4,
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  tabBadge: {
    backgroundColor: COLORS.primary + '33',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  orderCard: {
    borderRadius: 12,
    backgroundColor: COLORS.white,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  orderCardContent: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderStatusLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timerText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderBody: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  orderImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  orderImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  orderMeta: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 4,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: COLORS.primary,
  },
  refuseButton: {
    backgroundColor: COLORS.background,
  },
  acceptButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  refuseButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  // Bannière d'alerte urgente
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E53E3E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  urgentBannerText: {
    flex: 1,
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  // Conteneur du titre avec indicateur
  titleContainer: {
    alignItems: 'center',
  },
  // Indicateur de connexion temps réel
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connected: {},
  disconnected: {},
  connectedDot: {
    backgroundColor: '#48BB78',
  },
  disconnectedDot: {
    backgroundColor: '#E53E3E',
  },
  connectionText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  // Badge de notification amélioré
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  urgentBadge: {
    backgroundColor: '#E53E3E',
  },
  notificationBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Tab urgent
  tabUrgent: {
    borderBottomColor: '#E53E3E',
  },
  tabTextUrgent: {
    color: '#E53E3E',
  },
  tabBadgeUrgent: {
    backgroundColor: '#E53E3E',
  },
  tabBadgeTextUrgent: {
    color: '#FFF',
  },
});

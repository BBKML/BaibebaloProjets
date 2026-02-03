import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  FlatList,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useDeliveryStore from '../../store/deliveryStore';

const tabs = ['En cours', 'Historique'];

export default function DeliveriesScreen({ navigation }) {
  const { 
    activeOrders, 
    recentDeliveries, 
    fetchActiveOrders,
    fetchDeliveryHistory,
    isLoading 
  } = useDeliveryStore();
  
  const [activeTab, setActiveTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [historyDeliveries, setHistoryDeliveries] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 1 && historyDeliveries.length === 0) {
      loadHistory();
    }
  }, [activeTab]);

  const loadData = async () => {
    await fetchActiveOrders();
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    const data = await fetchDeliveryHistory(1, 20, 'delivered');
    if (data?.deliveries) {
      setHistoryDeliveries(data.deliveries.map(formatDelivery));
    }
    setLoadingHistory(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 0) {
      await fetchActiveOrders();
    } else {
      await loadHistory();
    }
    setRefreshing(false);
  };

  // Formater les données de livraison depuis le backend
  const formatDelivery = (delivery) => ({
    id: delivery.id,
    time: delivery.delivered_at 
      ? new Date(delivery.delivered_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : new Date(delivery.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    restaurant: delivery.restaurant_name || 'Restaurant',
    destination: delivery.delivery_address?.address_line || delivery.client_first_name || 'Client',
    status: delivery.status,
    amount: delivery.delivery_fee || 0,
    rating: delivery.delivery_rating || null,
    date: formatRelativeDate(delivery.delivered_at || delivery.created_at),
    orderNumber: delivery.order_number,
  });

  const renderDeliveryItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.deliveryCard}
      onPress={() => navigation.navigate('DeliveryDetails', { deliveryId: item.id })}
    >
      <View style={styles.deliveryHeader}>
        <Text style={styles.deliveryDate}>{item.date}</Text>
        <Text style={styles.deliveryTime}>{item.time}</Text>
      </View>
      
      <View style={styles.deliveryRoute}>
        <View style={styles.routePoint}>
          <View style={styles.routeDot} />
          <Text style={styles.routeText}>{item.restaurant}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <View style={[styles.routeDot, styles.routeDotEnd]} />
          <Text style={styles.routeText}>{item.destination}</Text>
        </View>
      </View>

      <View style={styles.deliveryFooter}>
        <View style={styles.statusContainer}>
          <Ionicons 
            name={item.status === 'delivered' ? 'checkmark-circle' : 'time'} 
            size={16} 
            color={item.status === 'delivered' ? COLORS.success : COLORS.warning} 
          />
          <Text style={[
            styles.statusText, 
            item.status !== 'delivered' && { color: COLORS.warning }
          ]}>
            {item.status === 'delivered' ? 'Livrée' : 
             item.status === 'delivering' ? 'En cours' : 
             item.status === 'ready' ? 'À récupérer' : item.status}
          </Text>
        </View>
        <View style={styles.earningsContainer}>
          <Text style={styles.earningsAmount}>+{item.amount.toLocaleString()} F</Text>
          {item.rating && (
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons 
                  key={star}
                  name="star" 
                  size={12} 
                  color={star <= item.rating ? COLORS.rating : COLORS.border} 
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Rendu des commandes actives
  const renderActiveOrderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.deliveryCard, styles.activeOrderCard]}
      onPress={() => navigation.navigate('NavigationToRestaurant', { delivery: item })}
    >
      <View style={styles.activeOrderBadge}>
        <Text style={styles.activeOrderBadgeText}>EN COURS</Text>
      </View>
      <View style={styles.deliveryRoute}>
        <View style={styles.routePoint}>
          <View style={styles.routeDot} />
          <Text style={styles.routeText}>{item.restaurant_name || 'Restaurant'}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <View style={[styles.routeDot, styles.routeDotEnd]} />
          <Text style={styles.routeText}>{item.delivery_address?.address_line || 'Client'}</Text>
        </View>
      </View>
      <View style={styles.activeOrderActions}>
        <Text style={styles.activeOrderEarnings}>+{(item.delivery_fee || 0).toLocaleString()} F</Text>
        <View style={styles.continueButton}>
          <Text style={styles.continueButtonText}>Continuer</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mes courses</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === index && styles.tabActive]}
            onPress={() => setActiveTab(index)}
          >
            <Text style={[styles.tabText, activeTab === index && styles.tabTextActive]}>
              {tab} {index === 0 && activeOrders.length > 0 ? `(${activeOrders.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 0 ? (
        activeOrders.length > 0 ? (
          <FlatList
            data={activeOrders}
            renderItem={renderActiveOrderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.primary]}
              />
            }
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="bicycle-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>Aucune course en cours</Text>
            <Text style={styles.emptySubtitle}>
              Activez votre statut pour recevoir des courses
            </Text>
          </View>
        )
      ) : loadingHistory ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={historyDeliveries.length > 0 ? historyDeliveries : recentDeliveries}
          renderItem={renderDeliveryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>Aucune livraison</Text>
              <Text style={styles.emptySubtitle}>
                Votre historique apparaîtra ici
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  deliveryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  deliveryDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  deliveryTime: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  deliveryRoute: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  routeDotEnd: {
    backgroundColor: COLORS.error,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.border,
    marginLeft: 4,
    marginVertical: 4,
  },
  routeText: {
    fontSize: 14,
    color: COLORS.text,
  },
  deliveryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '500',
  },
  earningsContainer: {
    alignItems: 'flex-end',
  },
  earningsAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeOrderCard: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  activeOrderBadge: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  activeOrderBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  activeOrderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  activeOrderEarnings: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

// Helper pour formater les dates relatives
function formatRelativeDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return date.toLocaleDateString('fr-FR');
}

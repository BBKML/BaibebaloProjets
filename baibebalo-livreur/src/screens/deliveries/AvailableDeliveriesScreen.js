import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getAvailableOrders } from '../../api/orders';
import { acceptOrder, declineOrder } from '../../api/orders';
import useDeliveryStore from '../../store/deliveryStore';

// Korhogo par défaut si pas de position
const KORHOGO = { lat: 9.4581, lng: -5.6296 };

export default function AvailableDeliveriesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const currentLocation = useDeliveryStore((s) => s.currentLocation);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [decliningId, setDecliningId] = useState(null);

  const lat = currentLocation?.latitude ?? KORHOGO.lat;
  const lng = currentLocation?.longitude ?? KORHOGO.lng;

  const loadOrders = useCallback(async () => {
    try {
      // all=true : récupère toutes les courses (express + food) sans filtre de distance
      const res = await getAvailableOrders(lat, lng, 50, true);
      const list = res?.data?.orders || res?.orders || [];
      setOrders(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('[AvailableDeliveries] loadOrders error:', err?.message || err);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lat, lng]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleAccept = async (order) => {
    setAcceptingId(order.id);
    try {
      await acceptOrder(order.id);
      const isExpress = order.order_type === 'express';
      Alert.alert(
        'Course acceptée',
        isExpress ? 'Rendez-vous au point de collecte pour récupérer le colis.' : 'Rendez-vous au restaurant pour récupérer la commande.'
      );
      navigation.replace('NavigationToRestaurant', { orderId: order.id });
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Impossible d\'accepter';
      Alert.alert('Erreur', msg);
    } finally {
      setAcceptingId(null);
      loadOrders();
    }
  };

  const handleDecline = async (order) => {
    const orderId = order.id || order.order_id;
    if (!orderId) return;
    setDecliningId(orderId);
    try {
      await declineOrder(orderId, 'Refusé par le livreur');
      // Retirer la course de la liste immédiatement (feedback visuel)
      setOrders((prev) => prev.filter((o) => (o.id || o.order_id) !== orderId));
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Impossible de refuser la course';
      Alert.alert('Erreur', msg);
      loadOrders();
    } finally {
      setDecliningId(null);
    }
  };

  const renderOrder = ({ item }) => {
    const addr = item.delivery_address && typeof item.delivery_address === 'object'
      ? item.delivery_address
      : {};
    const addressLine = addr.address_line || addr.address || (typeof item.delivery_address === 'string' ? item.delivery_address : null) || 'Adresse client';
    const distVal = item.distance_km ?? item.delivery_distance;
    const distance = (distVal != null && parseFloat(distVal) > 0)
      ? `${parseFloat(distVal).toFixed(1)} km`
      : '';
    const fee = item.delivery_fee || 0;
    const isAccepting = acceptingId === item.id;
    const isDeclining = decliningId === item.id;
    // Express: point de collecte ; Food: restaurant
    const pickupAddr = item.order_type === 'express' && item.pickup_address
      ? (typeof item.pickup_address === 'string' ? (() => { try { return JSON.parse(item.pickup_address); } catch (e) { return {}; } })() : item.pickup_address)
      : null;
    const pickupLabel = item.order_type === 'express'
      ? (pickupAddr?.address_line || pickupAddr?.address || 'Point de collecte')
      : (item.restaurant_name || 'Restaurant');

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderNumber}>{item.order_number || item.id}</Text>
          {item.order_type === 'express' ? (
            <Text style={styles.expressBadge}>Express</Text>
          ) : null}
          {distance ? <Text style={styles.distance}>{distance}</Text> : null}
        </View>
        <View style={styles.route}>
          <View style={styles.routePoint}>
            <View style={styles.dot} />
            <Text style={styles.routeText} numberOfLines={1}>{pickupLabel}</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.dot, styles.dotEnd]} />
            <Text style={styles.routeText} numberOfLines={1}>{addressLine}</Text>
          </View>
        </View>
        <View style={styles.footer}>
          <Text style={styles.fee}>+{Number(fee).toLocaleString()} F</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.declineBtn, (isAccepting || isDeclining) && styles.btnDisabled]}
              onPress={() => handleDecline(item)}
              disabled={isAccepting || isDeclining}
            >
              {isDeclining ? (
                <ActivityIndicator size="small" color={COLORS.text} />
              ) : (
                <Text style={styles.declineText}>Refuser</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptBtn, isAccepting && styles.btnDisabled]}
              onPress={() => handleAccept(item)}
              disabled={isAccepting}
            >
              {isAccepting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.acceptText}>Accepter</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 8), paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Courses disponibles</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bicycle-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>Aucune course disponible</Text>
          <Text style={styles.emptySubtitle}>
            Les demandes de course (restaurant et express) apparaissent ici.
            Passez en mode « Disponible » sur l'accueil pour recevoir des notifications.
          </Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
            <Ionicons name="refresh" size={20} color="#FFF" />
            <Text style={styles.refreshText}>Actualiser</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 24) }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4, marginRight: 8 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 16 },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  refreshText: { color: '#FFF', fontWeight: '600' },
  list: { padding: 16 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: 12, gap: 8 },
  orderNumber: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  expressBadge: { fontSize: 11, fontWeight: '600', color: COLORS.primary, backgroundColor: `${COLORS.primary}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  distance: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  route: { marginBottom: 12 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  dotEnd: { backgroundColor: COLORS.error },
  routeLine: { width: 2, height: 16, backgroundColor: COLORS.border, marginLeft: 3, marginVertical: 4 },
  routeText: { fontSize: 14, color: COLORS.text, flex: 1 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  fee: { fontSize: 18, fontWeight: '700', color: COLORS.success },
  actions: { flexDirection: 'row', gap: 8 },
  declineBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.border },
  acceptBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.primary },
  declineText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  acceptText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  btnDisabled: { opacity: 0.6 },
});

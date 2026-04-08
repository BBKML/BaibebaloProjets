import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { COLORS } from '../../constants/colors';
import apiClient from '../../api/client';
import { API_ENDPOINTS } from '../../constants/api';

export default function DeliveryDetailsScreen({ navigation, route }) {
  const deliveryId = route.params?.deliveryId;
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDelivery = async () => {
      if (!deliveryId) { setLoading(false); return; }
      try {
        const response = await apiClient.get(API_ENDPOINTS.ORDERS.DETAIL(deliveryId));
        const order = response.data?.data || response.data?.order || response.data;
        if (order) {
          const deliveryAddr = typeof order.delivery_address === 'string'
            ? (() => { try { return JSON.parse(order.delivery_address); } catch { return {}; } })()
            : (order.delivery_address || {});
          setDelivery({
            id: order.order_number || order.id,
            date: new Date(order.delivered_at || order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
            time: new Date(order.delivered_at || order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            status: order.status,
            restaurant: {
              name: order.restaurant_name || 'Restaurant',
              address: order.restaurant_address || '',
              phone: order.restaurant_phone || '',
              latitude: order.restaurant_latitude || null,
              longitude: order.restaurant_longitude || null,
            },
            customer: {
              name: order.client_first_name ? `${order.client_first_name} ${order.client_last_name || ''}`.trim() : 'Client',
              area: deliveryAddr.city || deliveryAddr.area || '',
              address: deliveryAddr.address_line || deliveryAddr.address || '',
              phone: order.client_phone || '',
              latitude: deliveryAddr.latitude || null,
              longitude: deliveryAddr.longitude || null,
            },
            order: {
              items: Array.isArray(order.items) ? order.items.map(i => ({
                name: i.menu_item_name || i.name || 'Article',
                quantity: i.quantity || 1,
                price: parseFloat(i.unit_price || i.price || 0),
              })) : [],
              subtotal: parseFloat(order.subtotal || order.total_amount || 0),
              deliveryFee: parseFloat(order.delivery_fee || 0),
              total: parseFloat(order.total_amount || order.total || 0),
            },
            earnings: parseFloat(order.delivery_fee || 0),
            distance: order.delivery_distance || null,
            duration: null,
            rating: order.delivery_rating || null,
            tip: parseFloat(order.tip_amount || 0),
          });
        }
      } catch (error) {
        console.error('Erreur chargement détails livraison:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDelivery();
  }, [deliveryId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Détails de la course</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!delivery) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Détails de la course</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: COLORS.textSecondary }}>Détails introuvables</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Détails de la course</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Mini Map */}
        {delivery.restaurant.latitude && delivery.customer.latitude ? (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              provider={Platform.OS === 'android' ? PROVIDER_DEFAULT : undefined}
              initialRegion={{
                latitude: (delivery.restaurant.latitude + delivery.customer.latitude) / 2,
                longitude: (delivery.restaurant.longitude + delivery.customer.longitude) / 2,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker coordinate={{ latitude: delivery.restaurant.latitude, longitude: delivery.restaurant.longitude }}>
                <View style={styles.markerRestaurant}>
                  <Ionicons name="restaurant" size={16} color="#FFFFFF" />
                </View>
              </Marker>
              <Marker coordinate={{ latitude: delivery.customer.latitude, longitude: delivery.customer.longitude }}>
                <View style={styles.markerCustomer}>
                  <Ionicons name="location" size={16} color="#FFFFFF" />
                </View>
              </Marker>
              <Polyline
                coordinates={[
                  { latitude: delivery.restaurant.latitude, longitude: delivery.restaurant.longitude },
                  { latitude: delivery.customer.latitude, longitude: delivery.customer.longitude },
                ]}
                strokeColor={COLORS.primary}
                strokeWidth={3}
                lineDashPattern={[10, 5]}
              />
            </MapView>
          </View>
        ) : null}

        {/* Status Badge */}
        {(() => {
          const STATUS_CONFIG = {
            new:                { label: 'Nouvelle', color: '#f59e0b', icon: 'time-outline' },
            accepted:           { label: 'Acceptée', color: '#10b981', icon: 'checkmark-circle-outline' },
            preparing:          { label: 'En préparation', color: '#f59e0b', icon: 'restaurant-outline' },
            ready:              { label: 'Prête', color: '#3b82f6', icon: 'bag-check-outline' },
            picked_up:          { label: 'Récupérée', color: '#3b82f6', icon: 'bicycle-outline' },
            delivering:         { label: 'En livraison', color: '#0ea5e9', icon: 'navigate-outline' },
            driver_at_customer: { label: 'À la porte', color: '#10b981', icon: 'location-outline' },
            delivered:          { label: 'Livrée', color: '#10b981', icon: 'checkmark-circle' },
            cancelled:          { label: 'Annulée', color: '#ef4444', icon: 'close-circle-outline' },
          };
          const cfg = STATUS_CONFIG[delivery.status] || { label: delivery.status || 'Inconnu', color: '#6b7280', icon: 'help-circle-outline' };
          return (
            <View style={[styles.statusBadge, { backgroundColor: cfg.color + '15' }]}>
              <Ionicons name={cfg.icon} size={20} color={cfg.color} />
              <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          );
        })()}

        {/* Course Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>N° de course</Text>
            <Text style={styles.infoValue}>{delivery.id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{delivery.date}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Heure</Text>
            <Text style={styles.infoValue}>{delivery.time}</Text>
          </View>
          {delivery.distance != null && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Distance</Text>
              <Text style={styles.infoValue}>{delivery.distance} km</Text>
            </View>
          )}
          {delivery.duration != null && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Durée</Text>
              <Text style={styles.infoValue}>{delivery.duration} min</Text>
            </View>
          )}
        </View>

        {/* Route Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Trajet</Text>
          
          {/* Pickup */}
          <View style={styles.routePoint}>
            <View style={[styles.routeIcon, { backgroundColor: COLORS.primary + '15' }]}>
              <Ionicons name="restaurant" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>Récupération</Text>
              <Text style={styles.routeName}>{delivery.restaurant.name}</Text>
              <Text style={styles.routeAddress}>{delivery.restaurant.address}</Text>
            </View>
          </View>

          <View style={styles.routeLine} />

          {/* Delivery */}
          <View style={styles.routePoint}>
            <View style={[styles.routeIcon, { backgroundColor: COLORS.error + '15' }]}>
              <Ionicons name="location" size={20} color={COLORS.error} />
            </View>
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>Livraison</Text>
              <Text style={styles.routeName}>{delivery.customer.area}</Text>
              <Text style={styles.routeAddress}>{delivery.customer.address}</Text>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Articles commandés</Text>
          {delivery.order.items.map((item, index) => (
            <View key={index} style={styles.orderItem}>
              <Text style={styles.orderItemQty}>{item.quantity}x</Text>
              <Text style={styles.orderItemName}>{item.name}</Text>
              <Text style={styles.orderItemPrice}>{item.price.toLocaleString()} F</Text>
            </View>
          ))}
        </View>

        {/* Earnings Card */}
        <View style={styles.earningsCard}>
          <Text style={styles.sectionTitle}>Vos gains</Text>
          <View style={styles.earningsRow}>
            <Text style={styles.earningsLabel}>Rémunération course</Text>
            <Text style={styles.earningsValue}>{(delivery.earnings - (delivery.tip || 0)).toLocaleString()} F</Text>
          </View>
          {delivery.tip > 0 && (
            <View style={styles.earningsRow}>
              <Text style={styles.earningsLabel}>Pourboire client</Text>
              <Text style={[styles.earningsValue, { color: COLORS.success }]}>+{delivery.tip.toLocaleString()} F</Text>
            </View>
          )}
          <View style={styles.earningsDivider} />
          <View style={styles.earningsRow}>
            <Text style={styles.earningsTotalLabel}>Total gagné</Text>
            <Text style={styles.earningsTotalValue}>{delivery.earnings.toLocaleString()} F</Text>
          </View>
        </View>

        {/* Rating */}
        {delivery.rating != null && (
          <View style={styles.ratingCard}>
            <Text style={styles.ratingLabel}>Note du client</Text>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name="star"
                  size={24}
                  color={star <= delivery.rating ? COLORS.rating : COLORS.border}
                />
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: COLORS.white, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  title: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: COLORS.text 
  },
  placeholder: { 
    width: 40 
  },
  scrollView: {
    flex: 1,
  },
  mapContainer: {
    height: 160,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerRestaurant: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  markerCustomer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: 'row',
    gap: 12,
  },
  routeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeInfo: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 2,
  },
  routeAddress: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: COLORS.border,
    marginLeft: 19,
    marginVertical: 8,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  orderItemQty: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    width: 30,
  },
  orderItemName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  earningsCard: {
    backgroundColor: COLORS.primary + '08',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  earningsLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  earningsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  earningsDivider: {
    height: 1,
    backgroundColor: COLORS.primary + '30',
    marginVertical: 8,
  },
  earningsTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  earningsTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  ratingCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 4,
  },
});

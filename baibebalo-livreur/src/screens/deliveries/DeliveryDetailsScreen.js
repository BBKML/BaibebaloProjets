import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { COLORS } from '../../constants/colors';

// Données mock pour une livraison complète
const mockDelivery = {
  id: 'BAIB-12345',
  date: '01 Février 2026',
  time: '13:45',
  status: 'delivered',
  restaurant: {
    name: 'Restaurant Chez Marie',
    address: 'Rue des Écoles, Centre-ville',
    phone: '+225 07 12 34 56 78',
    latitude: 9.4580,
    longitude: -5.6294,
  },
  customer: {
    name: 'Kouassi Jean',
    area: 'Quartier Tchengué',
    address: "Près de l'école primaire",
    phone: '+225 07 98 76 54 32',
    latitude: 9.4650,
    longitude: -5.6350,
  },
  order: {
    items: [
      { name: 'Poulet braisé + Attiéké', quantity: 2, price: 3500 },
      { name: 'Jus de bissap', quantity: 2, price: 1000 },
    ],
    subtotal: 4500,
    deliveryFee: 1000,
    total: 5500,
  },
  earnings: 1750,
  distance: 3.2,
  duration: 18,
  rating: 5,
  tip: 500,
};

export default function DeliveryDetailsScreen({ navigation, route }) {
  const deliveryId = route.params?.deliveryId;
  const delivery = mockDelivery; // En prod, fetch via API

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
            {/* Restaurant marker */}
            <Marker coordinate={{ latitude: delivery.restaurant.latitude, longitude: delivery.restaurant.longitude }}>
              <View style={styles.markerRestaurant}>
                <Ionicons name="restaurant" size={16} color="#FFFFFF" />
              </View>
            </Marker>
            {/* Customer marker */}
            <Marker coordinate={{ latitude: delivery.customer.latitude, longitude: delivery.customer.longitude }}>
              <View style={styles.markerCustomer}>
                <Ionicons name="location" size={16} color="#FFFFFF" />
              </View>
            </Marker>
            {/* Route line */}
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

        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.statusText}>Livraison effectuée</Text>
        </View>

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
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Distance</Text>
            <Text style={styles.infoValue}>{delivery.distance} km</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Durée</Text>
            <Text style={styles.infoValue}>{delivery.duration} min</Text>
          </View>
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
    backgroundColor: COLORS.success + '15',
    borderRadius: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
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

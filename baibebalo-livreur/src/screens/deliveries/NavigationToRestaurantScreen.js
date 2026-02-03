import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Linking, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { COLORS } from '../../constants/colors';
import { arriveAtRestaurant } from '../../api/orders';

export default function NavigationToRestaurantScreen({ navigation, route }) {
  const delivery = route.params?.delivery;
  const mapRef = useRef(null);
  const [arriving, setArriving] = useState(false);
  
  // Position simulée du livreur (en prod: utiliser la vraie géolocalisation)
  const [driverLocation, setDriverLocation] = useState({
    latitude: 9.4550,
    longitude: -5.6280,
  });
  
  const restaurantLocation = {
    latitude: delivery?.restaurant?.latitude || 9.4580,
    longitude: delivery?.restaurant?.longitude || -5.6294,
  };

  // Simuler le mouvement du livreur
  useEffect(() => {
    const interval = setInterval(() => {
      setDriverLocation(prev => ({
        latitude: prev.latitude + (restaurantLocation.latitude - prev.latitude) * 0.05,
        longitude: prev.longitude + (restaurantLocation.longitude - prev.longitude) * 0.05,
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const openExternalNavigation = () => {
    const lat = restaurantLocation.latitude;
    const lng = restaurantLocation.longitude;
    const label = delivery?.restaurant?.name || 'Restaurant';
    
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
    });
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to Google Maps URL
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
      }
    });
  };

  const callRestaurant = () => {
    const phone = delivery?.restaurant?.phone || '+225 07 00 00 00 00';
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  };

  const handleProblem = () => {
    Alert.alert(
      'Signaler un problème',
      'Que voulez-vous faire ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Appeler le restaurant', onPress: callRestaurant },
        { text: 'Contacter le support', onPress: () => navigation.navigate('SupportChat') },
      ]
    );
  };

  // Signaler l'arrivée au restaurant
  const handleArrived = async () => {
    if (arriving) return;
    
    setArriving(true);
    try {
      const orderId = delivery?.id || delivery?.order_id;
      if (orderId) {
        await arriveAtRestaurant(orderId);
        console.log('✅ Arrivée au restaurant signalée');
      }
      // Naviguer vers l'écran de vérification
      navigation.navigate('OrderVerification', { delivery });
    } catch (error) {
      console.error('Erreur arrivée restaurant:', error);
      // Même en cas d'erreur, permettre de continuer
      Alert.alert(
        'Information',
        'Erreur de synchronisation. Vous pouvez continuer.',
        [{ text: 'OK', onPress: () => navigation.navigate('OrderVerification', { delivery }) }]
      );
    } finally {
      setArriving(false);
    }
  };

  const estimatedTime = Math.ceil(
    Math.sqrt(
      Math.pow(restaurantLocation.latitude - driverLocation.latitude, 2) +
      Math.pow(restaurantLocation.longitude - driverLocation.longitude, 2)
    ) * 1000 // Convertir en minutes approximatives
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={{
            latitude: (driverLocation.latitude + restaurantLocation.latitude) / 2,
            longitude: (driverLocation.longitude + restaurantLocation.longitude) / 2,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          {/* Driver marker */}
          <Marker coordinate={driverLocation}>
            <View style={styles.driverMarker}>
              <Ionicons name="bicycle" size={20} color="#FFFFFF" />
            </View>
          </Marker>

          {/* Restaurant marker */}
          <Marker coordinate={restaurantLocation}>
            <View style={styles.restaurantMarker}>
              <Ionicons name="restaurant" size={20} color="#FFFFFF" />
            </View>
          </Marker>

          {/* Route line */}
          <Polyline
            coordinates={[driverLocation, restaurantLocation]}
            strokeColor={COLORS.primary}
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        </MapView>

        {/* Top info bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.etaContainer}>
            <Ionicons name="time-outline" size={16} color={COLORS.primary} />
            <Text style={styles.etaText}>{estimatedTime || 5} min</Text>
          </View>
          <TouchableOpacity style={styles.problemBtn} onPress={handleProblem}>
            <Ionicons name="warning-outline" size={24} color={COLORS.warning} />
          </TouchableOpacity>
        </View>

        {/* Navigation button */}
        <TouchableOpacity style={styles.navButton} onPress={openExternalNavigation}>
          <Ionicons name="navigate" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Center on route button */}
        <TouchableOpacity 
          style={styles.centerButton}
          onPress={() => mapRef.current?.fitToCoordinates([driverLocation, restaurantLocation], {
            edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
            animated: true,
          })}
        >
          <Ionicons name="scan-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Info Panel */}
      <View style={styles.infoPanel}>
        <View style={styles.infoPanelHeader}>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={styles.stepLine} />
            <View style={styles.stepDot} />
          </View>
          <View style={styles.stepLabels}>
            <Text style={styles.stepLabelActive}>Récupération</Text>
            <Text style={styles.stepLabel}>Livraison</Text>
          </View>
        </View>

        <View style={styles.restaurantInfo}>
          <View style={styles.restaurantIcon}>
            <Ionicons name="restaurant" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.restaurantDetails}>
            <Text style={styles.restaurantName}>{delivery?.restaurant?.name || 'Restaurant'}</Text>
            <Text style={styles.restaurantAddress}>{delivery?.restaurant?.address || 'Adresse'}</Text>
          </View>
          <TouchableOpacity style={styles.callButton} onPress={callRestaurant}>
            <Ionicons name="call" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.orderInfo}>
          <Ionicons name="receipt-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.orderInfoText}>Commande #{delivery?.id || 'BAIB-12345'}</Text>
          <Text style={styles.orderEarnings}>+{delivery?.earnings?.toLocaleString() || 1750} F</Text>
        </View>

        <TouchableOpacity 
          style={[styles.arrivedButton, arriving && styles.arrivedButtonDisabled]}
          onPress={handleArrived}
          disabled={arriving}
        >
          {arriving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
          )}
          <Text style={styles.arrivedButtonText}>
            {arriving ? 'SIGNALEMENT EN COURS...' : 'JE SUIS ARRIVÉ AU RESTAURANT'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  restaurantMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  topBar: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  etaText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  problemBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.info,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  centerButton: {
    position: 'absolute',
    bottom: 16,
    right: 80,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoPanel: { 
    backgroundColor: COLORS.white, 
    padding: 20,
    paddingBottom: 32,
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  infoPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepIndicator: {
    alignItems: 'center',
    marginRight: 12,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
  },
  stepLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.border,
  },
  stepLabels: {
    gap: 16,
  },
  stepLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  stepLabelActive: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  restaurantIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: COLORS.text 
  },
  restaurantAddress: { 
    fontSize: 13, 
    color: COLORS.textSecondary, 
    marginTop: 2
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  orderInfoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  orderEarnings: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  arrivedButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary, 
    paddingVertical: 16, 
    borderRadius: 14,
  },
  arrivedButtonDisabled: {
    backgroundColor: COLORS.primary + '80',
  },
  arrivedButtonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});

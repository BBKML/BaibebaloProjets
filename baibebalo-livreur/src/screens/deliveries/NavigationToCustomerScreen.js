import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Linking, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { COLORS } from '../../constants/colors';
import { arriveAtCustomer } from '../../api/orders';
import { updateLocation } from '../../api/delivery';

export default function NavigationToCustomerScreen({ navigation, route }) {
  const delivery = route.params?.delivery;
  const mapRef = useRef(null);
  const [arriving, setArriving] = useState(false);
  
  // Position simulée du livreur (démarrant du restaurant)
  const [driverLocation, setDriverLocation] = useState({
    latitude: delivery?.restaurant?.latitude || 9.4580,
    longitude: delivery?.restaurant?.longitude || -5.6294,
  });
  
  const customerLocation = {
    latitude: delivery?.customer?.latitude || 9.4650,
    longitude: delivery?.customer?.longitude || -5.6350,
  };

  // Simuler le mouvement du livreur vers le client ET partager la position
  useEffect(() => {
    const interval = setInterval(async () => {
      setDriverLocation(prev => {
        const newLat = prev.latitude + (customerLocation.latitude - prev.latitude) * 0.05;
        const newLng = prev.longitude + (customerLocation.longitude - prev.longitude) * 0.05;
        
        // Partager la position avec le backend (en production, utiliser la vraie géolocalisation)
        updateLocation(newLat, newLng).catch(err => {
          console.log('Erreur mise à jour position:', err.message);
        });
        
        return { latitude: newLat, longitude: newLng };
      });
    }, 5000); // Toutes les 5 secondes
    return () => clearInterval(interval);
  }, []);

  const openExternalNavigation = () => {
    const lat = customerLocation.latitude;
    const lng = customerLocation.longitude;
    const label = delivery?.customer?.area || 'Client';
    
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
    });
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
      }
    });
  };

  const callCustomer = () => {
    const phone = delivery?.customer?.phone || '+225 07 00 00 00 00';
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  };

  const handleProblem = () => {
    Alert.alert(
      'Signaler un problème',
      'Que voulez-vous faire ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Appeler le client', onPress: callCustomer },
        { text: 'Client absent', onPress: () => handleCustomerAbsent() },
        { text: 'Contacter le support', onPress: () => navigation.navigate('SupportChat') },
      ]
    );
  };

  const handleCustomerAbsent = () => {
    Alert.alert(
      'Client absent',
      'Patientez 5 minutes puis contactez le support si le client ne répond pas.',
      [{ text: 'OK' }]
    );
  };

  // Signaler l'arrivée chez le client
  const handleArrived = async () => {
    if (arriving) return;
    
    setArriving(true);
    try {
      const orderId = delivery?.id || delivery?.order_id;
      if (orderId) {
        await arriveAtCustomer(orderId);
        console.log('✅ Arrivée chez le client signalée');
      }
      // Naviguer vers l'écran de code de confirmation
      navigation.navigate('ConfirmationCode', { delivery });
    } catch (error) {
      console.error('Erreur arrivée client:', error);
      // Même en cas d'erreur, permettre de continuer
      Alert.alert(
        'Information',
        'Erreur de synchronisation. Vous pouvez continuer.',
        [{ text: 'OK', onPress: () => navigation.navigate('ConfirmationCode', { delivery }) }]
      );
    } finally {
      setArriving(false);
    }
  };

  const estimatedTime = Math.ceil(
    Math.sqrt(
      Math.pow(customerLocation.latitude - driverLocation.latitude, 2) +
      Math.pow(customerLocation.longitude - driverLocation.longitude, 2)
    ) * 1000
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
            latitude: (driverLocation.latitude + customerLocation.latitude) / 2,
            longitude: (driverLocation.longitude + customerLocation.longitude) / 2,
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

          {/* Customer marker */}
          <Marker coordinate={customerLocation}>
            <View style={styles.customerMarker}>
              <Ionicons name="location" size={20} color="#FFFFFF" />
            </View>
          </Marker>

          {/* Route line */}
          <Polyline
            coordinates={[driverLocation, customerLocation]}
            strokeColor={COLORS.error}
            strokeWidth={4}
          />
        </MapView>

        {/* Top info bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.etaContainer}>
            <Ionicons name="time-outline" size={16} color={COLORS.error} />
            <Text style={styles.etaText}>{estimatedTime || 5} min</Text>
          </View>
          <TouchableOpacity style={styles.problemBtn} onPress={handleProblem}>
            <Ionicons name="warning-outline" size={24} color={COLORS.warning} />
          </TouchableOpacity>
        </View>

        {/* Status badge */}
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Commande en cours de livraison</Text>
        </View>

        {/* Navigation button */}
        <TouchableOpacity style={styles.navButton} onPress={openExternalNavigation}>
          <Ionicons name="navigate" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Center button */}
        <TouchableOpacity 
          style={styles.centerButton}
          onPress={() => mapRef.current?.fitToCoordinates([driverLocation, customerLocation], {
            edgePadding: { top: 100, right: 50, bottom: 250, left: 50 },
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
            <View style={[styles.stepDot, styles.stepDotCompleted]}>
              <Ionicons name="checkmark" size={8} color="#FFFFFF" />
            </View>
            <View style={[styles.stepLine, styles.stepLineActive]} />
            <View style={[styles.stepDot, styles.stepDotActive]} />
          </View>
          <View style={styles.stepLabels}>
            <Text style={styles.stepLabelCompleted}>Récupération ✓</Text>
            <Text style={styles.stepLabelActive}>Livraison</Text>
          </View>
        </View>

        <View style={styles.customerInfo}>
          <View style={styles.customerIcon}>
            <Ionicons name="person" size={24} color={COLORS.error} />
          </View>
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>{delivery?.customer?.name || 'Client'}</Text>
            <Text style={styles.customerArea}>{delivery?.customer?.area || 'Quartier'}</Text>
            <Text style={styles.customerLandmark}>{delivery?.customer?.landmark || ''}</Text>
          </View>
          <TouchableOpacity style={styles.callButton} onPress={callCustomer}>
            <Ionicons name="call" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.orderInfo}>
          <Ionicons name="cube-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.orderInfoText}>
            Commande #{delivery?.id || 'BAIB-12345'} • {delivery?.restaurant?.name || 'Restaurant'}
          </Text>
        </View>

        <View style={styles.earningsPreview}>
          <Ionicons name="cash-outline" size={18} color={COLORS.success} />
          <Text style={styles.earningsText}>
            Vous gagnerez <Text style={styles.earningsAmount}>{delivery?.earnings?.toLocaleString() || 1750} F</Text> à la livraison
          </Text>
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
            {arriving ? 'SIGNALEMENT EN COURS...' : 'JE SUIS ARRIVÉ CHEZ LE CLIENT'}
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
  customerMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.error,
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
  statusBadge: {
    position: 'absolute',
    top: 70,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.error + '15',
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.error,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: COLORS.error,
  },
  stepDotCompleted: {
    backgroundColor: COLORS.success,
  },
  stepLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.border,
  },
  stepLineActive: {
    backgroundColor: COLORS.success,
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
    color: COLORS.error,
  },
  stepLabelCompleted: {
    fontSize: 12,
    color: COLORS.success,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  customerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  customerArea: { 
    fontSize: 14, 
    fontWeight: '500',
    color: COLORS.text, 
    marginTop: 2
  },
  customerLandmark: { 
    fontSize: 12, 
    color: COLORS.textSecondary, 
    marginTop: 2
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.error + '15',
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
    marginBottom: 8,
  },
  orderInfoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  earningsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.success + '10',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  earningsText: {
    fontSize: 13,
    color: COLORS.text,
  },
  earningsAmount: {
    fontWeight: 'bold',
    color: COLORS.success,
  },
  arrivedButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.error, 
    paddingVertical: 16, 
    borderRadius: 14,
  },
  arrivedButtonDisabled: {
    backgroundColor: COLORS.error + '80',
  },
  arrivedButtonText: { 
    color: '#FFFFFF', 
    fontSize: 15, 
    fontWeight: 'bold' 
  },
});

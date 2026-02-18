import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';

export default function MapLocationSelectorScreen({ navigation, route }) {
  const { onSelectLocation, location: initialLocation } = route.params || {};
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || null);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState({
    lat: initialLocation?.lat || 5.3600, // Abidjan par défaut
    lng: initialLocation?.lng || -4.0083,
  });
  const [mapKey, setMapKey] = useState(0); // Pour forcer le re-render de la WebView
  const webViewRef = useRef(null);

  const handleSelectLocation = () => {
    if (selectedLocation) {
      if (onSelectLocation) {
        onSelectLocation(selectedLocation);
      }
      navigation.goBack();
    } else {
      Alert.alert('Erreur', 'Veuillez sélectionner un emplacement sur la carte');
    }
  };

  useEffect(() => {
    // Charger la position actuelle au démarrage si pas de position initiale
    if (!initialLocation) {
      loadCurrentLocation();
    }
  }, []);

  const loadCurrentLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const newCenter = {
        lat: current.coords.latitude,
        lng: current.coords.longitude,
      };
      
      setMapCenter(newCenter);
      setMapKey(prev => prev + 1); // Force le re-render de la WebView
      
      // Centrer la carte sur la position actuelle via JavaScript
      if (webViewRef.current && window.setMapCenter) {
        const script = `
          if (window.setMapCenter) {
            window.setMapCenter(${newCenter.lat}, ${newCenter.lng});
          }
          true;
        `;
        webViewRef.current.injectJavaScript(script);
      }

      // Obtenir l'adresse
      const [address] = await Location.reverseGeocodeAsync({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });

      const label = [address?.street, address?.streetNumber].filter(Boolean).join(' ');
      const city = address?.city || address?.subAdministrativeArea || '';
      const fullAddress = [label, city].filter(Boolean).join(', ') || 'Position actuelle';

      setSelectedLocation({
        lat: current.coords.latitude,
        lng: current.coords.longitude,
        address: fullAddress,
      });
    } catch (error) {
      console.error('Erreur localisation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickCurrentLocation = async () => {
    await loadCurrentLocation();
  };

  const handleMapMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'location_selected') {
        const { lat, lng } = data;
        
        try {
          // Obtenir l'adresse pour les nouvelles coordonnées
          const [address] = await Location.reverseGeocodeAsync({
            latitude: lat,
            longitude: lng,
          });

          const label = [address?.street, address?.streetNumber].filter(Boolean).join(' ');
          const city = address?.city || address?.subAdministrativeArea || '';
          const fullAddress = [label, city].filter(Boolean).join(', ') || 'Position sélectionnée';

          setSelectedLocation({
            lat,
            lng,
            address: fullAddress,
          });
        } catch (error) {
          console.error('Erreur reverse geocoding:', error);
          setSelectedLocation({
            lat,
            lng,
            address: 'Position sélectionnée',
          });
        }
      }
    } catch (error) {
      console.error('Erreur parsing message:', error);
    }
  };

  // Générer le HTML de la carte avec OpenStreetMap (gratuit, pas besoin de clé API)
  const generateMapHTML = () => {
    const { lat, lng } = mapCenter;
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; height: 100%; overflow: hidden; }
            #map { width: 100%; height: 100vh; }
            .loading { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #666; z-index: 1000; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <div class="loading" id="loading">Chargement de la carte...</div>
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <script>
            let map, marker;
            const center = [${lat}, ${lng}];
            
            function initMap() {
              document.getElementById('loading').style.display = 'none';
              
              map = L.map('map').setView(center, 15);
              
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
              }).addTo(map);
              
              // Icône personnalisée pour le marqueur
              const customIcon = L.divIcon({
                className: 'custom-marker',
                html: '<div style="background-color: #007AFF; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                iconSize: [32, 32],
                iconAnchor: [16, 16],
              });
              
              marker = L.marker(center, {
                draggable: true,
                icon: customIcon,
              }).addTo(map);
              
              // Écouter les clics sur la carte
              map.on('click', (e) => {
                const position = { lat: e.latlng.lat, lng: e.latlng.lng };
                marker.setLatLng([position.lat, position.lng]);
                sendLocation(position);
              });
              
              // Écouter le déplacement du marqueur
              marker.on('dragend', (e) => {
                const position = e.target.getLatLng();
                sendLocation({ lat: position.lat, lng: position.lng });
              });
              
              function sendLocation(position) {
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'location_selected',
                    lat: position.lat,
                    lng: position.lng,
                  }));
                }
              }
              
              // Exposer les fonctions globalement pour les appels depuis React Native
              window.map = map;
              window.marker = marker;
              window.setMapCenter = function(lat, lng) {
                const newCenter = [lat, lng];
                map.setView(newCenter, map.getZoom());
                marker.setLatLng(newCenter);
              };
            }
            
            // Initialiser la carte quand Leaflet est chargé
            if (typeof L !== 'undefined') {
              initMap();
            } else {
              window.addEventListener('load', initMap);
            }
          </script>
        </body>
      </html>
    `;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sélectionner un emplacement</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Carte interactive avec WebView */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          key={mapKey}
          style={styles.map}
          source={{ html: generateMapHTML() }}
          onMessage={handleMapMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
        />
        
        {/* Bouton pour centrer sur position actuelle */}
        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={handlePickCurrentLocation}
          disabled={loading}
        >
          <Ionicons 
            name="locate" 
            size={24} 
            color={loading ? COLORS.textLight : COLORS.primary} 
          />
        </TouchableOpacity>
      </View>

      {/* Informations */}
      {selectedLocation && (
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="location" size={24} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Adresse sélectionnée</Text>
              <Text style={styles.infoValue}>{selectedLocation.address}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            !selectedLocation && styles.confirmButtonDisabled,
          ]}
          onPress={handleSelectLocation}
          disabled={!selectedLocation}
        >
          <Text style={styles.confirmButtonText}>Confirmer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

MapLocationSelectorScreen.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
  }).isRequired,
  route: PropTypes.shape({
    params: PropTypes.shape({
      onSelectLocation: PropTypes.func,
    }),
  }),
};

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
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  currentLocationButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoSection: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  footer: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

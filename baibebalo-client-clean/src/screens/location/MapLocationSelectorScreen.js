import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import * as Location from 'expo-location';

export default function MapLocationSelectorScreen({ navigation, route }) {
  const { onSelectLocation } = route.params || {};
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const handlePickCurrentLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Nous avons besoin de votre localisation.');
        return;
      }

      const current = await Location.getCurrentPositionAsync({});
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
      Alert.alert('Emplacement sélectionné', fullAddress);
    } catch (error) {
      console.error('Erreur localisation:', error);
      Alert.alert('Erreur', 'Impossible d\'obtenir votre localisation.');
    } finally {
      setLoading(false);
    }
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

      {/* Carte (placeholder) */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={64} color={COLORS.textLight} />
          <Text style={styles.mapText}>Carte interactive</Text>
          <Text style={styles.mapSubtext}>
            Utilisez la carte pour sélectionner votre emplacement
          </Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={handlePickCurrentLocation}
            disabled={loading}
          >
            <Text style={styles.selectButtonText}>
              {loading ? 'Localisation...' : 'Utiliser ma position actuelle'}
            </Text>
          </TouchableOpacity>
        </View>
        {selectedLocation && (
          <View style={styles.marker}>
            <Ionicons name="location" size={32} color={COLORS.primary} />
          </View>
        )}
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
    backgroundColor: COLORS.border,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  mapText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  mapSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  selectButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  selectButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  marker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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

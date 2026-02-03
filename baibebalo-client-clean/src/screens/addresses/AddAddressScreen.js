import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';
import * as Location from 'expo-location';
import { COLORS } from '../../constants/colors';
import { addAddress, updateAddress } from '../../api/users';

export default function AddAddressScreen({ route, navigation }) {
  const { address: existingAddress, isEdit, fromCheckout } = route.params || {};
  const [formData, setFormData] = useState({
    label: existingAddress?.label || '',
    street: existingAddress?.street || '',
    city: existingAddress?.city || 'Korhogo',
    postal_code: existingAddress?.postal_code || '',
    delivery_instructions: existingAddress?.delivery_instructions || '',
    is_default: existingAddress?.is_default || false,
    latitude: existingAddress?.latitude || null,
    longitude: existingAddress?.longitude || null,
  });
  const [loading, setLoading] = useState(false);

  const handleGetCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Nous avons besoin de votre localisation');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setFormData((prev) => ({
        ...prev,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }));

      // Reverse geocoding pour obtenir l'adresse
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address) {
        setFormData((prev) => ({
          ...prev,
          street: `${address.street || ''} ${address.streetNumber || ''}`.trim(),
          city: address.city || address.subAdministrativeArea || 'Abidjan',
          postal_code: address.postalCode || '',
        }));
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'obtenir votre localisation');
    }
  };

  const handlePickOnMap = () => {
    navigation.navigate('MapLocationSelector', {
      onSelectLocation: (location) => {
        setFormData((prev) => ({
          ...prev,
          street: location.address || prev.street,
          latitude: location.lat,
          longitude: location.lng,
        }));
      },
    });
  };

  const handleSave = async () => {
    console.log('📍 handleSave - Données du formulaire:', formData);
    
    if (!formData.label.trim()) {
      Alert.alert('Erreur', 'Le titre de l\'adresse est requis');
      return;
    }
    if (!formData.street.trim()) {
      Alert.alert('Erreur', 'L\'adresse est requise');
      return;
    }

    setLoading(true);
    try {
      console.log('📍 Envoi de l\'adresse...', { isEdit, formData });
      if (isEdit && existingAddress) {
        const result = await updateAddress(existingAddress.id, formData);
        console.log('📍 Résultat updateAddress:', result);
      } else {
        const result = await addAddress(formData);
        console.log('📍 Résultat addAddress:', result);
      }

      // Si on vient de CheckoutScreen, retourner directement sans alerte
      if (fromCheckout) {
        navigation.goBack();
      } else {
        Alert.alert(
          'Succès',
          isEdit ? 'Adresse mise à jour' : 'Adresse ajoutée',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Erreur',
        error.response?.data?.error?.message || 'Erreur lors de l\'enregistrement'
      );
    } finally {
      setLoading(false);
    }
  };

  const saveLabel = loading
    ? 'Enregistrement...'
    : isEdit
    ? 'Mettre à jour'
    : 'Enregistrer l\'adresse';

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.sheetHeader}>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.sheetTitle}>
            {isEdit ? 'Modifier l\'adresse' : 'Ajouter une adresse'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Map Placeholder */}
          <View style={styles.mapSection}>
            <View style={styles.mapContainer}>
              <View style={styles.mapPlaceholder}>
                <Ionicons name="map-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.mapText}>Carte de localisation</Text>
              </View>
              <View style={styles.mapPin}>
                <Ionicons name="location" size={18} color={COLORS.white} />
              </View>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={handleGetCurrentLocation}
              >
                <Ionicons name="locate" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.mapHint}>
              Faites glisser la carte pour ajuster votre position précisément.
            </Text>
            <TouchableOpacity style={styles.mapAction} onPress={handlePickOnMap}>
              <Ionicons name="map" size={16} color={COLORS.primary} />
              <Text style={styles.mapActionText}>Choisir sur la carte</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Titre de l'adresse</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Maison, Bureau, Chez Maman"
                value={formData.label}
                onChangeText={(text) => setFormData({ ...formData, label: text })}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Adresse textuelle</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Recherche d'adresse..."
                  value={formData.street}
                  onChangeText={(text) => setFormData({ ...formData, street: text })}
                />
                <Ionicons
                  name="map"
                  size={20}
                  color={COLORS.primary}
                  style={styles.inputIcon}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Ville</Text>
              <TextInput
                style={styles.input}
                placeholder="Ville"
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Code postal</Text>
              <TextInput
                style={styles.input}
                placeholder="Code postal"
                value={formData.postal_code}
                onChangeText={(text) => setFormData({ ...formData, postal_code: text })}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Instructions de livraison</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Portail noir, sonnerie à gauche, 2ème étage..."
                value={formData.delivery_instructions}
                onChangeText={(text) =>
                  setFormData({ ...formData, delivery_instructions: text })
                }
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.field}>
              <View style={styles.switchContainer}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>Définir comme par défaut</Text>
                  <Text style={styles.switchHint}>
                    Utiliser cette adresse pour vos prochaines commandes
                  </Text>
                </View>
                <Switch
                  value={formData.is_default}
                  onValueChange={(value) =>
                    setFormData({ ...formData, is_default: value })
                  }
                  trackColor={{ false: COLORS.border, true: COLORS.primary + '80' }}
                  thumbColor={formData.is_default ? COLORS.primary : COLORS.textLight}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>{saveLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

AddAddressScreen.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
    navigate: PropTypes.func.isRequired,
  }).isRequired,
  route: PropTypes.shape({
    params: PropTypes.shape({
      address: PropTypes.object,
      isEdit: PropTypes.bool,
      fromCheckout: PropTypes.bool,
    }),
  }),
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  sheet: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  mapSection: {
    padding: 16,
  },
  mapContainer: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  mapPin: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -17 }, { translateY: -17 }],
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  locationButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: COLORS.white,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  mapHint: {
    fontSize: 12,
    color: COLORS.textLight,
    paddingHorizontal: 4,
  },
  mapAction: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  mapActionText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    paddingLeft: 4,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputContainer: {
    position: 'relative',
  },
  inputWithIcon: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    paddingRight: 48,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputIcon: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  textArea: {
    minHeight: 100,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  switchHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  footer: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

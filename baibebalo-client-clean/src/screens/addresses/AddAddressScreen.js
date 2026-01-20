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
import * as Location from 'expo-location';
import { COLORS } from '../../constants/colors';
import { addAddress, updateAddress } from '../../api/users';

export default function AddAddressScreen({ route, navigation }) {
  const { address: existingAddress, isEdit, fromCheckout } = route.params || {};
  const [formData, setFormData] = useState({
    label: existingAddress?.label || '',
    street: existingAddress?.street || '',
    city: existingAddress?.city || 'Abidjan',
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
      setFormData({
        ...formData,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Reverse geocoding pour obtenir l'adresse
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address) {
        setFormData({
          ...formData,
          street: `${address.street || ''} ${address.streetNumber || ''}`.trim(),
          city: address.city || address.subAdministrativeArea || 'Abidjan',
          postal_code: address.postalCode || '',
        });
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'obtenir votre localisation');
    }
  };

  const handleSave = async () => {
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
      if (isEdit && existingAddress) {
        await updateAddress(existingAddress.id, formData);
      } else {
        await addAddress(formData);
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Map Placeholder */}
        <View style={styles.mapSection}>
          <View style={styles.mapContainer}>
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.mapText}>Carte de localisation</Text>
            </View>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={handleGetCurrentLocation}
            >
              <Ionicons name="locate" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.mapHint}>
            Faites glisser la carte pour ajuster votre position précisément.
          </Text>
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
                <Text style={styles.switchLabel}>Définir comme adresse par défaut</Text>
                <Text style={styles.switchHint}>
                  Cette adresse sera utilisée par défaut pour vos commandes
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
          <Text style={styles.saveButtonText}>
            {loading
              ? 'Enregistrement...'
              : isEdit
              ? 'Mettre à jour'
              : 'Enregistrer l\'adresse'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  mapSection: {
    padding: 16,
  },
  mapContainer: {
    width: '100%',
    height: 200,
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

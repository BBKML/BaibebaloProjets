import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import * as Location from 'expo-location';

export default function RegisterStep2Screen({ navigation, route }) {
  const step1Data = route.params?.step1Data || {};
  const [formData, setFormData] = useState({
    address: '',
    neighborhood: '',
    landmark: '',
    latitude: null,
    longitude: null,
  });
  const [errors, setErrors] = useState({});
  const [loadingLocation, setLoadingLocation] = useState(false);
  const insets = useSafeAreaInsets();

  const requestLocationPermission = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'La localisation est nécessaire pour continuer');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setFormData({
        ...formData,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      Alert.alert('Succès', 'Position GPS enregistrée !');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'obtenir la localisation. Veuillez réessayer.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.address.trim()) newErrors.address = 'Adresse requise';
    if (!formData.neighborhood.trim()) newErrors.neighborhood = 'Quartier requis';
    if (!formData.latitude || !formData.longitude) {
      newErrors.location = 'Veuillez obtenir votre position GPS';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      navigation.navigate('RegisterStep3', {
        step1Data,
        step2Data: formData,
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Localisation</Text>
          <Text style={styles.stepText}>Étape 2 sur 3</Text>
        </View>

        {/* Indicateur de progression */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressStep, styles.progressActive]} />
          <View style={[styles.progressStep, styles.progressActive]} />
          <View style={styles.progressStep} />
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse complète *</Text>
            <TextInput
              style={[styles.textArea, errors.address && styles.inputError]}
              placeholder="Ex: Rue du Commerce, près du marché central"
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              multiline
              numberOfLines={3}
            />
            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quartier / Zone *</Text>
            <TextInput
              style={[styles.input, errors.neighborhood && styles.inputError]}
              placeholder="Ex: Cocody, Yopougon, Korhogo centre"
              value={formData.neighborhood}
              onChangeText={(text) => setFormData({ ...formData, neighborhood: text })}
            />
            {errors.neighborhood && <Text style={styles.errorText}>{errors.neighborhood}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Points de repère (optionnel)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Face à la station Total, derrière l'église"
              value={formData.landmark}
              onChangeText={(text) => setFormData({ ...formData, landmark: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Position GPS *</Text>
            <TouchableOpacity
              style={[
                styles.locationButton,
                formData.latitude && styles.locationButtonSuccess,
                errors.location && styles.locationButtonError,
              ]}
              onPress={requestLocationPermission}
              disabled={loadingLocation}
            >
              {loadingLocation ? (
                <Text style={styles.locationButtonText}>Recherche en cours...</Text>
              ) : formData.latitude ? (
                <>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  <View>
                    <Text style={[styles.locationButtonText, { color: COLORS.success }]}>
                      Position enregistrée
                    </Text>
                    <Text style={styles.coordinatesText}>
                      {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <Ionicons name="location-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.locationButtonText}>Obtenir ma position</Text>
                </>
              )}
            </TouchableOpacity>
            {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
            <Text style={styles.helperText}>
              Placez-vous à l'entrée de votre restaurant pour une position précise
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Suivant</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  stepText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  progressActive: {
    backgroundColor: COLORS.primary,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  locationButton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  locationButtonSuccess: {
    borderColor: COLORS.success,
    borderStyle: 'solid',
  },
  locationButtonError: {
    borderColor: COLORS.error,
  },
  locationButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  coordinatesText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  footer: {
    marginTop: 24,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

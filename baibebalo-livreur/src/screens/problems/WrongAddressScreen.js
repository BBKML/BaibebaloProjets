import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS } from '../../constants/colors';
import { reportWrongAddress } from '../../api/orders';

export default function WrongAddressScreen({ navigation, route }) {
  const delivery = route.params?.delivery;
  const orderId = delivery?.id || delivery?.order_id;
  const [correctAddress, setCorrectAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [additionalDistanceKm, setAdditionalDistanceKm] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Autorisez la localisation pour remplir les coordonnées.');
        setLoadingLocation(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(String(loc.coords.latitude.toFixed(6)));
      setLongitude(String(loc.coords.longitude.toFixed(6)));
    } catch (e) {
      console.warn('Location:', e);
      Alert.alert('Erreur', 'Impossible d\'obtenir la position.');
    } finally {
      setLoadingLocation(false);
    }
  };

  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  const handleSubmit = async () => {
    const address = correctAddress.trim();
    if (address.length < 5) {
      Alert.alert('Adresse requise', 'Saisissez l\'adresse correcte (au moins 5 caractères).');
      return;
    }
    const lat = Number.parseFloat(latitude, 10);
    const lng = Number.parseFloat(longitude, 10);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      Alert.alert('Coordonnées invalides', 'Vérifiez la latitude (-90 à 90).');
      return;
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      Alert.alert('Coordonnées invalides', 'Vérifiez la longitude (-180 à 180).');
      return;
    }
    if (!orderId) {
      Alert.alert('Erreur', 'Commande introuvable.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        correct_address: address,
        correct_latitude: lat,
        correct_longitude: lng,
      };
      const extraKm = Number.parseFloat(additionalDistanceKm, 10);
      if (!Number.isNaN(extraKm) && extraKm >= 0) payload.additional_distance_km = extraKm;

      const response = await reportWrongAddress(orderId, payload);
      if (response?.success) {
        Alert.alert(
          'Adresse mise à jour',
          response?.message || 'L\'adresse a été corrigée. Vous pouvez continuer la livraison.',
          [{ text: 'OK', onPress: () => navigation.navigate('NavigationToCustomer', { delivery }) }]
        );
      } else {
        Alert.alert('Erreur', response?.error?.message || 'Envoi impossible.');
      }
    } catch (err) {
      console.error('Wrong address:', err);
      Alert.alert(
        'Erreur',
        err?.response?.data?.error?.message || 'Impossible d\'envoyer la correction.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={submitting}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Adresse incorrecte</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Ionicons name="location" size={56} color={COLORS.warning} />
        <Text style={styles.message}>
          Indiquez la bonne adresse et les coordonnées pour continuer la livraison.
        </Text>

        <Text style={styles.label}>Adresse correcte *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Rue du Marché, près de la pharmacie"
          placeholderTextColor={COLORS.textLight}
          value={correctAddress}
          onChangeText={setCorrectAddress}
          multiline
          numberOfLines={2}
        />

        <View style={styles.locationRow}>
          <Text style={styles.label}>Position (coordonnées)</Text>
          <TouchableOpacity style={styles.locationButton} onPress={fetchCurrentLocation} disabled={loadingLocation}>
            {loadingLocation ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="locate" size={20} color={COLORS.primary} />
            )}
            <Text style={styles.locationButtonText}>Ma position</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.coordsRow}>
          <TextInput
            style={[styles.input, styles.coordInput]}
            placeholder="Latitude"
            placeholderTextColor={COLORS.textLight}
            value={latitude}
            onChangeText={setLatitude}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[styles.input, styles.coordInput]}
            placeholder="Longitude"
            placeholderTextColor={COLORS.textLight}
            value={longitude}
            onChangeText={setLongitude}
            keyboardType="decimal-pad"
          />
        </View>

        <Text style={styles.label}>Distance supplémentaire (km, optionnel)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 1.5"
          placeholderTextColor={COLORS.textLight}
          value={additionalDistanceKm}
          onChangeText={setAdditionalDistanceKm}
          keyboardType="decimal-pad"
        />

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Enregistrer l'adresse</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  placeholder: { width: 40 },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 24,
    textAlign: 'center',
  },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 16,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  locationButtonText: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  coordsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  coordInput: { flex: 1 },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});

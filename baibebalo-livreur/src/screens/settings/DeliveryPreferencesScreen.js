import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { COLORS } from '../../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateProfile, getProfile } from '../../api/delivery';

const PREFERENCES_KEY = 'delivery_preferences_settings';

export default function DeliveryPreferencesScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    maxDistance: 5, // km
    minOrderValue: 0, // FCFA
    acceptLargeOrders: true,
    acceptCashPayments: true,
    acceptCardPayments: true,
    acceptMobileMoneyPayments: true,
    autoAccept: false,
    preferredRestaurantTypes: ['all'],
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await getProfile();
      if (response?.success && response?.data?.delivery_person?.preferences) {
        const rawData = response.data.delivery_person.preferences;
        const serverData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        setPreferences(prev => ({ ...prev, ...serverData }));
      } else {
        const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
        if (stored) {
          setPreferences(prev => ({ ...prev, ...JSON.parse(stored) }));
        }
      }
    } catch (error) {
      console.error('Erreur chargement préférences:', error);
      try {
        const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
        if (stored) {
          setPreferences(prev => ({ ...prev, ...JSON.parse(stored) }));
        }
      } catch (e) {
        // Utiliser les valeurs par défaut
      }
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
      await updateProfile({ preferences: JSON.stringify(preferences) });
      
      Alert.alert('Succès', 'Vos préférences ont été enregistrées', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Info', 'Préférences sauvegardées localement');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Préférences de course</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Préférences de course</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.saveButton}>Sauver</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Distance maximale */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distance maximale</Text>
          <View style={styles.card}>
            <View style={styles.sliderContainer}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sliderLabel}>Rayon d'action</Text>
                <Text style={styles.sliderValue}>{preferences.maxDistance} km</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={15}
                step={1}
                value={preferences.maxDistance}
                onValueChange={(v) => updatePreference('maxDistance', v)}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.primary}
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderMinMax}>1 km</Text>
                <Text style={styles.sliderMinMax}>15 km</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Types de commandes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Types de commandes</Text>
          <View style={styles.card}>
            <SettingRow
              icon="cube"
              label="Grosses commandes"
              description="Accepter les commandes volumineuses"
              value={preferences.acceptLargeOrders}
              onToggle={() => updatePreference('acceptLargeOrders', !preferences.acceptLargeOrders)}
            />
          </View>
        </View>

        {/* Modes de paiement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modes de paiement acceptés</Text>
          <View style={styles.card}>
            <SettingRow
              icon="cash"
              label="Espèces"
              description="Accepter les paiements en espèces"
              value={preferences.acceptCashPayments}
              onToggle={() => updatePreference('acceptCashPayments', !preferences.acceptCashPayments)}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="card"
              label="Carte bancaire"
              description="Paiements par carte"
              value={preferences.acceptCardPayments}
              onToggle={() => updatePreference('acceptCardPayments', !preferences.acceptCardPayments)}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="phone-portrait"
              label="Mobile Money"
              description="Orange, MTN, Moov Money"
              value={preferences.acceptMobileMoneyPayments}
              onToggle={() => updatePreference('acceptMobileMoneyPayments', !preferences.acceptMobileMoneyPayments)}
            />
          </View>
        </View>

        {/* Automatisation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Automatisation</Text>
          <View style={styles.card}>
            <SettingRow
              icon="flash"
              label="Acceptation automatique"
              description="Accepter automatiquement les courses correspondant à vos critères"
              value={preferences.autoAccept}
              onToggle={() => updatePreference('autoAccept', !preferences.autoAccept)}
            />
          </View>
          {preferences.autoAccept && (
            <View style={styles.warningCard}>
              <Ionicons name="warning-outline" size={18} color={COLORS.warning} />
              <Text style={styles.warningText}>
                Les courses seront automatiquement acceptées. Assurez-vous d'être disponible.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({ icon, label, description, value, onToggle }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon} size={20} color={COLORS.primary} />
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>{label}</Text>
          {description && <Text style={styles.settingDescription}>{description}</Text>}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.border, true: COLORS.primary + '50' }}
        thumbColor={value ? COLORS.primary : '#f4f3f4'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  placeholder: { width: 40 },
  saveButton: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 12, marginLeft: 4 },
  card: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 68 },
  sliderContainer: { padding: 16 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sliderLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  sliderValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  slider: { width: '100%', height: 40 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderMinMax: { fontSize: 12, color: COLORS.textSecondary },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  settingIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.primary + '10', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  settingDescription: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  warningCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: COLORS.warning + '15', borderRadius: 8, padding: 12, marginTop: 8 },
  warningText: { flex: 1, fontSize: 12, color: COLORS.warning, lineHeight: 16 },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateProfile, getProfile } from '../../api/delivery';

const AVAILABILITY_KEY = 'delivery_availability_settings';

const DAYS = [
  { id: 'monday', label: 'Lundi' },
  { id: 'tuesday', label: 'Mardi' },
  { id: 'wednesday', label: 'Mercredi' },
  { id: 'thursday', label: 'Jeudi' },
  { id: 'friday', label: 'Vendredi' },
  { id: 'saturday', label: 'Samedi' },
  { id: 'sunday', label: 'Dimanche' },
];

const TIME_SLOTS = [
  { id: 'morning', label: 'Matin', hours: '6h - 12h', icon: 'sunny-outline' },
  { id: 'afternoon', label: 'Après-midi', hours: '12h - 18h', icon: 'partly-sunny-outline' },
  { id: 'evening', label: 'Soir', hours: '18h - 23h', icon: 'moon-outline' },
];

const getDefaultAvailability = () => DAYS.reduce((acc, day) => {
  acc[day.id] = { active: true, slots: ['morning', 'afternoon', 'evening'] };
  return acc;
}, {});

// Valider et fusionner les données avec les valeurs par défaut
const validateAvailability = (data) => {
  const defaults = getDefaultAvailability();
  if (!data || typeof data !== 'object') return defaults;
  
  const validated = { ...defaults };
  DAYS.forEach(day => {
    if (data[day.id] && typeof data[day.id] === 'object') {
      validated[day.id] = {
        active: typeof data[day.id].active === 'boolean' ? data[day.id].active : true,
        slots: Array.isArray(data[day.id].slots) ? data[day.id].slots : ['morning', 'afternoon', 'evening'],
      };
    }
  });
  return validated;
};

// Fonction pour parser JSON de manière sécurisée
const safeJsonParse = (str) => {
  if (!str) return null;
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.log('JSON parse failed for:', typeof str, str?.substring?.(0, 50));
    return null;
  }
};

export default function AvailabilitySettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState(getDefaultAvailability());

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      // Essayer de charger depuis le backend
      const response = await getProfile();
      const rawData = response?.data?.delivery_person?.availability_hours;
      
      if (rawData) {
        const serverData = safeJsonParse(rawData);
        if (serverData) {
          setAvailability(validateAvailability(serverData));
          return;
        }
      }
      
      // Fallback: charger depuis AsyncStorage
      const stored = await AsyncStorage.getItem(AVAILABILITY_KEY);
      if (stored) {
        const localData = safeJsonParse(stored);
        if (localData) {
          setAvailability(validateAvailability(localData));
        }
      }
    } catch (error) {
      console.error('Erreur chargement disponibilités:', error);
      // Garder les valeurs par défaut
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (dayId) => {
    setAvailability(prev => ({
      ...prev,
      [dayId]: { ...prev[dayId], active: !prev[dayId].active }
    }));
  };

  const toggleSlot = (dayId, slotId) => {
    setAvailability(prev => {
      const daySlots = prev[dayId].slots || [];
      const newSlots = daySlots.includes(slotId)
        ? daySlots.filter(s => s !== slotId)
        : [...daySlots, slotId];
      return {
        ...prev,
        [dayId]: { ...prev[dayId], slots: newSlots }
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Sauvegarder localement
      await AsyncStorage.setItem(AVAILABILITY_KEY, JSON.stringify(availability));
      
      // Sauvegarder sur le serveur
      await updateProfile({ availability_hours: JSON.stringify(availability) });
      
      Alert.alert('Succès', 'Vos disponibilités ont été enregistrées', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Info', 'Disponibilités sauvegardées localement');
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
          <Text style={styles.title}>Horaires préférés</Text>
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
        <Text style={styles.title}>Horaires préférés</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.saveButton}>Sauver</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Définissez vos horaires préférés. Vous recevrez en priorité les courses correspondant à vos disponibilités.
          </Text>
        </View>

        {/* Days */}
        {DAYS.map((day) => (
          <View key={day.id} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <View style={styles.dayLeft}>
                <Switch
                  value={availability[day.id]?.active}
                  onValueChange={() => toggleDay(day.id)}
                  trackColor={{ false: COLORS.border, true: COLORS.primary + '50' }}
                  thumbColor={availability[day.id]?.active ? COLORS.primary : '#f4f3f4'}
                />
                <Text style={[styles.dayLabel, !availability[day.id]?.active && styles.dayLabelInactive]}>
                  {day.label}
                </Text>
              </View>
              {availability[day.id]?.active && (
                <Text style={styles.slotsCount}>
                  {availability[day.id]?.slots?.length || 0} créneaux
                </Text>
              )}
            </View>

            {availability[day.id]?.active && (
              <View style={styles.slotsContainer}>
                {TIME_SLOTS.map((slot) => {
                  const isActive = availability[day.id]?.slots?.includes(slot.id);
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={[styles.slotButton, isActive && styles.slotButtonActive]}
                      onPress={() => toggleSlot(day.id, slot.id)}
                    >
                      <Ionicons 
                        name={slot.icon} 
                        size={18} 
                        color={isActive ? COLORS.primary : COLORS.textSecondary} 
                      />
                      <Text style={[styles.slotLabel, isActive && styles.slotLabelActive]}>
                        {slot.label}
                      </Text>
                      <Text style={styles.slotHours}>{slot.hours}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 13, color: COLORS.primary, lineHeight: 18 },
  dayCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  dayLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayLabel: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  dayLabelInactive: { color: COLORS.textSecondary },
  slotsCount: { fontSize: 12, color: COLORS.textSecondary },
  slotsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  slotButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  slotButtonActive: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary,
  },
  slotLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginTop: 4 },
  slotLabelActive: { color: COLORS.primary },
  slotHours: { fontSize: 10, color: COLORS.textLight, marginTop: 2 },
});

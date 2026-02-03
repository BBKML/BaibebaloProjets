import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { COLORS } from '../../constants/colors';
import { restaurantApi } from '../../api/restaurant';
import useAuthStore from '../../store/authStore';

const DAYS = [
  { key: 'monday', label: 'Lundi' },
  { key: 'tuesday', label: 'Mardi' },
  { key: 'wednesday', label: 'Mercredi' },
  { key: 'thursday', label: 'Jeudi' },
  { key: 'friday', label: 'Vendredi' },
  { key: 'saturday', label: 'Samedi' },
  { key: 'sunday', label: 'Dimanche' },
];

const defaultDay = { open: '09:00', close: '22:00', isOpen: true };

function parseOpeningHours(oh) {
  if (!oh || typeof oh !== 'object') return {};
  const parsed = {};
  DAYS.forEach(({ key }) => {
    const d = oh[key];
    if (d && typeof d === 'object') {
      parsed[key] = {
        open: d.open || '09:00',
        close: d.close || '22:00',
        isOpen: d.isOpen !== false,
      };
    } else {
      parsed[key] = { ...defaultDay };
    }
  });
  return parsed;
}

export default function OpeningHoursScreen({ navigation }) {
  const { restaurant, setRestaurant } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState(() => {
    const h = {};
    DAYS.forEach(({ key }) => { h[key] = { ...defaultDay }; });
    return h;
  });

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await restaurantApi.getProfile();
      const r = data?.data?.restaurant || data?.restaurant || data;
      if (r) {
        setRestaurant(r);
        setHours(parseOpeningHours(r.opening_hours));
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: err?.message || 'Impossible de charger les horaires',
      });
    } finally {
      setLoading(false);
    }
  }, [setRestaurant]);

  useFocusEffect(
    useCallback(() => {
      if (restaurant?.opening_hours !== undefined) {
        setHours(parseOpeningHours(restaurant.opening_hours));
        setLoading(false);
      } else if (restaurant) {
        setHours(parseOpeningHours(restaurant.opening_hours || {}));
        setLoading(false);
      } else {
        loadProfile();
      }
    }, [restaurant, loadProfile])
  );

  const updateDay = (dayKey, field, value) => {
    setHours((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await restaurantApi.updateProfile({ opening_hours: hours });
      const data = await restaurantApi.getProfile();
      const r = data?.data?.restaurant || data?.restaurant || data;
      if (r) setRestaurant(r);
      Toast.show({
        type: 'success',
        text1: 'Enregistré',
        text2: 'Horaires mis à jour',
      });
      navigation.goBack();
    } catch (err) {
      const msg = err?.error?.message || err?.message || 'Erreur lors de l\'enregistrement';
      Toast.show({ type: 'error', text1: 'Erreur', text2: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 60}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Horaires</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>Voir détails ci-dessous</Text>

        {DAYS.map(({ key, label }) => {
          const day = hours[key] || { ...defaultDay };
          return (
            <View key={key} style={styles.dayRow}>
              <View style={styles.dayLabel}>
                <Text style={styles.dayName}>{label}</Text>
                <Switch
                  value={day.isOpen}
                  onValueChange={(v) => updateDay(key, 'isOpen', v)}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              </View>
              {day.isOpen ? (
                <View style={styles.timeRow}>
                  <TextInput
                    style={styles.timeInput}
                    value={day.open}
                    onChangeText={(v) => updateDay(key, 'open', v)}
                    placeholder="09:00"
                    placeholderTextColor={COLORS.textLight}
                  />
                  <Text style={styles.timeSeparator}>–</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={day.close}
                    onChangeText={(v) => updateDay(key, 'close', v)}
                    placeholder="22:00"
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
              ) : (
                <Text style={styles.closedText}>Fermé</Text>
              )}
            </View>
          );
        })}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
              <Text style={styles.saveButtonText}>Enregistrer les horaires</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  dayRow: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  dayLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.text,
  },
  timeSeparator: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  closedText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});

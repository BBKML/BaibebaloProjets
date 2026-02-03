import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import { registerDelivery } from '../../api/auth';

const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const slots = [
  { id: 'morning', label: 'Matin', time: '8h-12h' },
  { id: 'afternoon', label: 'Après-midi', time: '12h-18h' },
  { id: 'evening', label: 'Soir', time: '18h-22h' },
];

export default function AvailabilityScheduleScreen({ navigation }) {
  const { updateRegistrationData, registrationData, setRegistrationStep, setPendingRegistration, clearRegistrationData } = useAuthStore();
  const [schedule, setSchedule] = useState(
    registrationData.schedule || 
    days.reduce((acc, day) => ({ ...acc, [day]: { morning: false, afternoon: false, evening: false } }), {})
  );
  const [flexible, setFlexible] = useState(registrationData.flexible || false);
  const [loading, setLoading] = useState(false);

  const toggleSlot = (day, slot) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [slot]: !prev[day][slot],
      },
    }));
  };

  const toggleDay = (day) => {
    const allSelected = slots.every(slot => schedule[day][slot.id]);
    setSchedule(prev => ({
      ...prev,
      [day]: slots.reduce((acc, slot) => ({ ...acc, [slot.id]: !allSelected }), {}),
    }));
  };

  const toggleFlexible = () => {
    setFlexible(!flexible);
    if (!flexible) {
      // Select all slots
      setSchedule(
        days.reduce((acc, day) => ({
          ...acc,
          [day]: slots.reduce((sAcc, slot) => ({ ...sAcc, [slot.id]: true }), {}),
        }), {})
      );
    }
  };

  const hasAnySelection = () => {
    return flexible || days.some(day => slots.some(slot => schedule[day][slot.id]));
  };

  const handleFinish = async () => {
    if (!hasAnySelection()) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un créneau');
      return;
    }

    setLoading(true);

    try {
      await updateRegistrationData({ schedule, flexible });

      // Prepare JSON data for registration
      const data = { ...registrationData, schedule, flexible };
      
      // Debug: log all data
      console.log('Registration data:', JSON.stringify(data, null, 2));
      
      // Build registration payload (authentification par OTP - pas de mot de passe)
      const payload = {
        phone: data.phone || '',
        first_name: data.firstName || '',
        last_name: data.lastName || '',
        vehicle_type: data.vehicleType || '',
        email: data.email || undefined,
        availability: {
          schedule,
          flexible,
        },
      };
      
      // Mobile money (optional)
      if (data.mobileMoneyNumber) {
        payload.mobile_money_number = data.mobileMoneyNumber;
        payload.mobile_money_provider = data.mobileMoneyOperator || '';
      }
      
      // Vehicle plate (required for moto)
      if (data.vehicleType === 'moto' && data.vehiclePlate) {
        payload.vehicle_plate = data.vehiclePlate;
      }
      
      console.log('Sending payload:', JSON.stringify(payload, null, 2));

      const response = await registerDelivery(payload);

      console.log('Registration response:', response);

      if (response.success) {
        // Inscription réussie - le livreur doit attendre la validation
        // Marquer comme inscription en attente
        await setPendingRegistration(true);
        // Clear registration data
        await clearRegistrationData();
        
        // Navigate to pending validation
        Alert.alert(
          'Inscription réussie',
          response.message || 'Votre profil sera validé sous 24-48h.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'PendingValidation' }],
                });
              },
            },
          ]
        );
      } else {
        Alert.alert('Erreur', response.message || 'Erreur lors de l\'inscription');
      }
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert(
        'Erreur',
        error.response?.data?.error?.message || 
        error.response?.data?.message || 
        'Erreur lors de l\'inscription. Réessayez.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
        </View>
        
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepIndicator}>Étape 5/5</Text>
        <Text style={styles.title}>Vos disponibilités</Text>
        <Text style={styles.subtitle}>
          Quand êtes-vous disponible pour livrer?
        </Text>

        {/* Flexible option */}
        <TouchableOpacity style={styles.flexibleOption} onPress={toggleFlexible}>
          <View style={[styles.checkbox, flexible && styles.checkboxChecked]}>
            {flexible && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
          </View>
          <View style={styles.flexibleContent}>
            <Text style={styles.flexibleTitle}>Je suis flexible</Text>
            <Text style={styles.flexibleSubtitle}>Disponible à tout moment</Text>
          </View>
        </TouchableOpacity>

        {/* Schedule Grid */}
        <View style={styles.scheduleContainer}>
          {/* Header */}
          <View style={styles.scheduleHeader}>
            <View style={styles.dayColumn} />
            {slots.map((slot) => (
              <View key={slot.id} style={styles.slotColumn}>
                <Text style={styles.slotLabel}>{slot.label}</Text>
                <Text style={styles.slotTime}>{slot.time}</Text>
              </View>
            ))}
          </View>

          {/* Days */}
          {days.map((day) => (
            <View key={day} style={styles.dayRow}>
              <TouchableOpacity 
                style={styles.dayColumn}
                onPress={() => toggleDay(day)}
              >
                <Text style={styles.dayLabel}>{day}</Text>
              </TouchableOpacity>
              {slots.map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                  style={styles.slotColumn}
                  onPress={() => toggleSlot(day, slot.id)}
                >
                  <View style={[
                    styles.slotCheckbox,
                    schedule[day][slot.id] && styles.slotCheckboxChecked
                  ]}>
                    {schedule[day][slot.id] && (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* Note */}
        <View style={styles.noteContainer}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.noteText}>
            Modifiable à tout moment dans les paramètres
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[
            styles.primaryButton,
            (!hasAnySelection() || loading) && styles.primaryButtonDisabled
          ]}
          onPress={handleFinish}
          disabled={!hasAnySelection() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>TERMINER L'INSCRIPTION</Text>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  progressDotCompleted: {
    backgroundColor: COLORS.primary,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  flexibleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  flexibleContent: {
    flex: 1,
  },
  flexibleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  flexibleSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  scheduleContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scheduleHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundSecondary,
    paddingVertical: 12,
  },
  dayRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 12,
  },
  dayColumn: {
    width: 90,
    paddingLeft: 16,
    justifyContent: 'center',
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  slotColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  slotTime: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  slotCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotCheckboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  noteText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  bottomContainer: {
    padding: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

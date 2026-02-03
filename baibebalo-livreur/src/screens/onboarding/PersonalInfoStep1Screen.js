import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput,
  TouchableOpacity, 
  StatusBar,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';

export default function PersonalInfoStep1Screen({ navigation, route }) {
  const { updateRegistrationData, registrationData } = useAuthStore();
  const [firstName, setFirstName] = useState(registrationData.firstName || '');
  const [lastName, setLastName] = useState(registrationData.lastName || '');
  const [email, setEmail] = useState(registrationData.email || '');
  const [birthDate, setBirthDate] = useState(
    registrationData.birthDate ? new Date(registrationData.birthDate) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const getMinBirthDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date;
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('fr-FR');
  };

  // Authentification par OTP - pas de mot de passe requis
  const isValidForm = () => {
    return firstName.trim() && lastName.trim() && birthDate;
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  const handleContinue = async () => {
    if (!isValidForm()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Check age (18+)
    const age = new Date().getFullYear() - birthDate.getFullYear();
    if (age < 18) {
      Alert.alert('Erreur', 'Vous devez avoir au moins 18 ans pour devenir livreur');
      return;
    }

    await updateRegistrationData({
      firstName,
      lastName,
      email,
      birthDate: birthDate.toISOString(),
    });

    navigation.navigate('PersonalInfoStep2');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={0}
      >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>
        
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.stepIndicator}>Étape 1/5</Text>
        <Text style={styles.title}>Vos informations personnelles</Text>
        <Text style={styles.subtitle}>
          Ces informations sont nécessaires pour créer votre compte livreur
        </Text>

        {/* Form */}
        <View style={styles.form}>
          {/* First Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prénom *</Text>
            <TextInput
              style={styles.input}
              placeholder="Votre prénom"
              placeholderTextColor={COLORS.textLight}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
          </View>

          {/* Last Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom *</Text>
            <TextInput
              style={styles.input}
              placeholder="Votre nom"
              placeholderTextColor={COLORS.textLight}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
          </View>

          {/* Birth Date */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date de naissance * (18 ans minimum)</Text>
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={birthDate ? styles.dateText : styles.datePlaceholder}>
                {birthDate ? formatDate(birthDate) : 'Sélectionner une date'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={birthDate || getMinBirthDate()}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              maximumDate={getMinBirthDate()}
            />
          )}

          {/* Email (optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email (optionnel)</Text>
            <TextInput
              style={styles.input}
              placeholder="votre@email.com"
              placeholderTextColor={COLORS.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Note sur l'authentification OTP */}
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Votre compte sera sécurisé par code SMS (OTP). Pas de mot de passe à retenir !
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[
            styles.primaryButton,
            !isValidForm() && styles.primaryButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!isValidForm()}
        >
          <Text style={styles.primaryButtonText}>CONTINUER</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
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
  progressDotActive: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  placeholder: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 280,
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
    marginBottom: 32,
    lineHeight: 20,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.primary,
    lineHeight: 20,
  },
  dateInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 16,
    color: COLORS.text,
  },
  datePlaceholder: {
    fontSize: 16,
    color: COLORS.textLight,
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

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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { Picker } from '@react-native-picker/picker';

const RESTAURANT_TYPES = [
  'Restaurant',
  'Maquis',
  'Fast-food',
  'Boulangerie',
  'Pâtisserie',
  'Grillades',
  'Bar-restaurant',
];

export default function RegisterStep1Screen({ navigation }) {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const insets = useSafeAreaInsets();

  const validate = () => {
    const newErrors = {};
    
    // Nom
    if (!formData.name.trim()) newErrors.name = 'Nom requis';
    else if (formData.name.length < 3) newErrors.name = 'Minimum 3 caractères';
    
    // Type
    if (!formData.type) newErrors.type = 'Type requis';
    
    // Téléphone
    if (!formData.phone.trim()) newErrors.phone = 'Téléphone requis';
    else if (formData.phone.length < 8) newErrors.phone = 'Numéro invalide';
    
    // Email
    if (!formData.email.trim()) newErrors.email = 'Email requis';
    else if (!formData.email.includes('@')) newErrors.email = 'Email invalide';
    
    // Mot de passe
    if (!formData.password) {
      newErrors.password = 'Mot de passe requis';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Minimum 8 caractères';
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      newErrors.password = 'Doit contenir une minuscule';
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password = 'Doit contenir une majuscule';
    } else if (!/(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Doit contenir un chiffre';
    }
    
    // Confirmation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      navigation.navigate('RegisterStep2', { step1Data: formData });
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
          <Text style={styles.title}>Inscription</Text>
          <Text style={styles.stepText}>Étape 1 sur 3</Text>
        </View>

        {/* Indicateur de progression */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressStep, styles.progressActive]} />
          <View style={styles.progressStep} />
          <View style={styles.progressStep} />
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom du restaurant *</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Ex: Le Bon Maquis"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Type d'établissement *</Text>
            <View style={[styles.pickerContainer, errors.type && styles.inputError]}>
              <Picker
                selectedValue={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
                style={styles.picker}
              >
                <Picker.Item label="Sélectionner un type" value="" />
                {RESTAURANT_TYPES.map((type) => (
                  <Picker.Item key={type} label={type} value={type} />
                ))}
              </Picker>
            </View>
            {errors.type && <Text style={styles.errorText}>{errors.type}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone *</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="+225 XX XX XX XX XX"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              keyboardType="phone-pad"
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="contact@restaurant.com"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.passwordInput, errors.password && styles.inputError]}
                placeholder="Minimum 8 caractères"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmer le mot de passe *</Text>
            <TextInput
              style={[styles.input, errors.confirmPassword && styles.inputError]}
              placeholder="Retapez votre mot de passe"
              value={formData.confirmPassword}
              onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          {/* Indicateurs de force du mot de passe */}
          <View style={styles.passwordRules}>
            <View style={styles.ruleItem}>
              <Ionicons 
                name={formData.password.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'} 
                size={14} 
                color={formData.password.length >= 8 ? COLORS.success : COLORS.textSecondary} 
              />
              <Text style={[styles.ruleText, formData.password.length >= 8 && styles.ruleTextValid]}>
                8+ caractères
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons 
                name={/[A-Z]/.test(formData.password) ? 'checkmark-circle' : 'ellipse-outline'} 
                size={14} 
                color={/[A-Z]/.test(formData.password) ? COLORS.success : COLORS.textSecondary} 
              />
              <Text style={[styles.ruleText, /[A-Z]/.test(formData.password) && styles.ruleTextValid]}>
                Majuscule
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons 
                name={/[a-z]/.test(formData.password) ? 'checkmark-circle' : 'ellipse-outline'} 
                size={14} 
                color={/[a-z]/.test(formData.password) ? COLORS.success : COLORS.textSecondary} 
              />
              <Text style={[styles.ruleText, /[a-z]/.test(formData.password) && styles.ruleTextValid]}>
                Minuscule
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons 
                name={/\d/.test(formData.password) ? 'checkmark-circle' : 'ellipse-outline'} 
                size={14} 
                color={/\d/.test(formData.password) ? COLORS.success : COLORS.textSecondary} 
              />
              <Text style={[styles.ruleText, /\d/.test(formData.password) && styles.ruleTextValid]}>
                Chiffre
              </Text>
            </View>
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
    marginBottom: 16,
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
  pickerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 0,
  },
  eyeButton: {
    padding: 14,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
  },
  passwordRules: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ruleText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  ruleTextValid: {
    color: COLORS.success,
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

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

const MOBILE_MONEY_PROVIDERS = ['Orange Money', 'MTN Mobile Money', 'Moov Money'];

export default function RegisterStep5Screen({ navigation, route }) {
  const step1Data = route.params?.step1Data || {};
  const step2Data = route.params?.step2Data || {};
  const step3Data = route.params?.step3Data || {};
  const step4Data = route.params?.step4Data || {};
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    mobileMoneyProvider: '',
    accountHolderName: '',
    accountNumber: '',
    bankRIB: '',
    acceptTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const insets = useSafeAreaInsets();

  const validate = () => {
    const newErrors = {};
    
    // Validation mot de passe (doit correspondre aux règles backend)
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
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    
    // Validation finances
    if (!formData.mobileMoneyProvider) newErrors.mobileMoneyProvider = 'Opérateur requis';
    if (!formData.accountHolderName.trim()) newErrors.accountHolderName = 'Nom requis';
    if (!formData.accountNumber.trim()) newErrors.accountNumber = 'Numéro requis';
    if (!formData.acceptTerms) newErrors.acceptTerms = 'Vous devez accepter les conditions';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      navigation.navigate('RegisterStep6', {
        step1Data,
        step2Data,
        step3Data,
        step4Data,
        step5Data: formData,
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
          <Text style={styles.title}>Informations financières</Text>
          <Text style={styles.stepText}>Étape 5 sur 6</Text>
        </View>

        <View style={styles.form}>
          {/* Section Mot de passe */}
          <View style={styles.sectionHeader}>
            <Ionicons name="lock-closed" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Créer votre mot de passe</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.passwordInput, errors.password && styles.inputError]}
                placeholder="Minimum 6 caractères"
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

          {/* Règles du mot de passe */}
          <View style={styles.passwordRules}>
            <Text style={styles.rulesTitle}>Le mot de passe doit contenir :</Text>
            <View style={styles.ruleItem}>
              <Ionicons 
                name={formData.password.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'} 
                size={16} 
                color={formData.password.length >= 8 ? COLORS.success : COLORS.textSecondary} 
              />
              <Text style={[styles.ruleText, formData.password.length >= 8 && styles.ruleTextValid]}>
                Au moins 8 caractères
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons 
                name={/[A-Z]/.test(formData.password) ? 'checkmark-circle' : 'ellipse-outline'} 
                size={16} 
                color={/[A-Z]/.test(formData.password) ? COLORS.success : COLORS.textSecondary} 
              />
              <Text style={[styles.ruleText, /[A-Z]/.test(formData.password) && styles.ruleTextValid]}>
                Une lettre majuscule
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons 
                name={/[a-z]/.test(formData.password) ? 'checkmark-circle' : 'ellipse-outline'} 
                size={16} 
                color={/[a-z]/.test(formData.password) ? COLORS.success : COLORS.textSecondary} 
              />
              <Text style={[styles.ruleText, /[a-z]/.test(formData.password) && styles.ruleTextValid]}>
                Une lettre minuscule
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons 
                name={/\d/.test(formData.password) ? 'checkmark-circle' : 'ellipse-outline'} 
                size={16} 
                color={/\d/.test(formData.password) ? COLORS.success : COLORS.textSecondary} 
              />
              <Text style={[styles.ruleText, /\d/.test(formData.password) && styles.ruleTextValid]}>
                Un chiffre
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons 
                name={formData.password && formData.password === formData.confirmPassword ? 'checkmark-circle' : 'ellipse-outline'} 
                size={16} 
                color={formData.password && formData.password === formData.confirmPassword ? COLORS.success : COLORS.textSecondary} 
              />
              <Text style={[styles.ruleText, formData.password && formData.password === formData.confirmPassword && styles.ruleTextValid]}>
                Mots de passe identiques
              </Text>
            </View>
          </View>

          {/* Section Finances */}
          <View style={[styles.sectionHeader, { marginTop: 16 }]}>
            <Ionicons name="wallet" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Informations de paiement</Text>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={COLORS.info} />
            <Text style={styles.infoText}>
              Taux de commission : 15-20%{'\n'}
              Fréquence de paiement : Hebdomadaire{'\n'}
              Délai de paiement : 7 jours
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Compte Mobile Money principal *</Text>
            <View style={[styles.pickerContainer, errors.mobileMoneyProvider && styles.inputError]}>
              <Picker
                selectedValue={formData.mobileMoneyProvider}
                onValueChange={(value) => setFormData({ ...formData, mobileMoneyProvider: value })}
                style={styles.picker}
              >
                <Picker.Item label="Sélectionner un opérateur" value="" />
                {MOBILE_MONEY_PROVIDERS.map((provider) => (
                  <Picker.Item key={provider} label={provider} value={provider} />
                ))}
              </Picker>
            </View>
            {errors.mobileMoneyProvider && (
              <Text style={styles.errorText}>{errors.mobileMoneyProvider}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom du titulaire *</Text>
            <TextInput
              style={[styles.input, errors.accountHolderName && styles.inputError]}
              placeholder="Nom complet du titulaire"
              value={formData.accountHolderName}
              onChangeText={(text) => setFormData({ ...formData, accountHolderName: text })}
            />
            {errors.accountHolderName && (
              <Text style={styles.errorText}>{errors.accountHolderName}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Numéro de compte *</Text>
            <TextInput
              style={[styles.input, errors.accountNumber && styles.inputError]}
              placeholder="Numéro de compte Mobile Money"
              value={formData.accountNumber}
              onChangeText={(text) => setFormData({ ...formData, accountNumber: text })}
              keyboardType="phone-pad"
            />
            {errors.accountNumber && (
              <Text style={styles.errorText}>{errors.accountNumber}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>RIB bancaire (optionnel)</Text>
            <TextInput
              style={styles.input}
              placeholder="RIB bancaire si disponible"
              value={formData.bankRIB}
              onChangeText={(text) => setFormData({ ...formData, bankRIB: text })}
            />
          </View>

          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setFormData({ ...formData, acceptTerms: !formData.acceptTerms })}
            >
              <Ionicons
                name={formData.acceptTerms ? 'checkbox' : 'checkbox-outline'}
                size={24}
                color={formData.acceptTerms ? COLORS.primary : COLORS.textSecondary}
              />
            </TouchableOpacity>
            <View style={styles.termsText}>
              <Text style={styles.termsLabel}>
                J'accepte les{' '}
                <Text style={styles.termsLink}>conditions générales</Text>
              </Text>
              {errors.acceptTerms && (
                <Text style={styles.errorText}>{errors.acceptTerms}</Text>
              )}
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
    marginBottom: 32,
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
  form: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
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
  },
  eyeButton: {
    padding: 14,
  },
  passwordRules: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  rulesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  ruleTextValid: {
    color: COLORS.success,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.info + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 24,
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
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 12,
  },
  checkbox: {
    marginTop: 2,
  },
  termsText: {
    flex: 1,
  },
  termsLabel: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '600',
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

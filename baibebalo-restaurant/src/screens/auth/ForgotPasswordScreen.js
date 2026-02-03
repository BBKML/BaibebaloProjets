import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { restaurantAuth } from '../../api/auth';
import Toast from 'react-native-toast-message';

const STEPS = {
  PHONE: 'phone',
  OTP: 'otp',
  NEW_PASSWORD: 'new_password',
  SUCCESS: 'success',
};

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(STEPS.PHONE);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const insets = useSafeAreaInsets();

  // Références pour les champs OTP
  const otpRefs = useRef([]);

  // Étape 1: Envoyer le code OTP
  const handleSendOtp = async () => {
    if (!phone || phone.length < 8) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Veuillez entrer un numéro de téléphone valide',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await restaurantAuth.forgotPassword(phone);
      setRestaurantName(response.data?.restaurant_name || '');
      Toast.show({
        type: 'success',
        text1: 'Code envoyé',
        text2: 'Un code de vérification a été envoyé par SMS',
      });
      setStep(STEPS.OTP);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: error.response?.data?.error?.message || 'Impossible d\'envoyer le code',
      });
    } finally {
      setLoading(false);
    }
  };

  // Gestion de la saisie OTP
  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Passer au champ suivant automatiquement
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    // Retour arrière: revenir au champ précédent
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Étape 2: Vérifier le code OTP
  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Veuillez entrer le code à 6 chiffres',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await restaurantAuth.verifyResetOtp(phone, otpCode);
      setResetToken(response.data?.reset_token);
      Toast.show({
        type: 'success',
        text1: 'Code vérifié',
        text2: 'Vous pouvez maintenant définir votre nouveau mot de passe',
      });
      setStep(STEPS.NEW_PASSWORD);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: error.response?.data?.error?.message || 'Code incorrect',
      });
    } finally {
      setLoading(false);
    }
  };

  // Étape 3: Réinitialiser le mot de passe
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Le mot de passe doit contenir au moins 6 caractères',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Les mots de passe ne correspondent pas',
      });
      return;
    }

    setLoading(true);
    try {
      await restaurantAuth.resetPassword(phone, resetToken, newPassword);
      Toast.show({
        type: 'success',
        text1: 'Succès',
        text2: 'Votre mot de passe a été réinitialisé',
      });
      setStep(STEPS.SUCCESS);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: error.response?.data?.error?.message || 'Impossible de réinitialiser le mot de passe',
      });
    } finally {
      setLoading(false);
    }
  };

  // Renvoyer le code
  const handleResendCode = async () => {
    setOtp(['', '', '', '', '', '']);
    await handleSendOtp();
  };

  // Rendu selon l'étape
  const renderStep = () => {
    switch (step) {
      case STEPS.PHONE:
        return (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed" size={60} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Mot de passe oublié ?</Text>
            <Text style={styles.subtitle}>
              Entrez votre numéro de téléphone pour recevoir un code de vérification
            </Text>

            <View style={styles.form}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Numéro de téléphone</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="06 00 00 00 00"
                    placeholderTextColor={COLORS.textSecondary + '99'}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Envoyer le code</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        );

      case STEPS.OTP:
        return (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="chatbubble-ellipses" size={60} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Vérification</Text>
            <Text style={styles.subtitle}>
              Entrez le code à 6 chiffres envoyé au {phone}
            </Text>
            {restaurantName && (
              <Text style={styles.restaurantName}>Restaurant: {restaurantName}</Text>
            )}

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (otpRefs.current[index] = ref)}
                  style={[styles.otpInput, digit && styles.otpInputFilled]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value.replace(/[^0-9]/g, ''), index)}
                  onKeyPress={(e) => handleOtpKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Vérifier</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.resendButton} onPress={handleResendCode}>
              <Text style={styles.resendText}>Renvoyer le code</Text>
            </TouchableOpacity>
          </>
        );

      case STEPS.NEW_PASSWORD:
        return (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="key" size={60} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Nouveau mot de passe</Text>
            <Text style={styles.subtitle}>
              Créez un nouveau mot de passe sécurisé
            </Text>

            <View style={styles.form}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Nouveau mot de passe</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textSecondary + '99'}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Confirmer le mot de passe</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textSecondary + '99'}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.passwordRules}>
                <Text style={styles.ruleText}>
                  <Ionicons 
                    name={newPassword.length >= 6 ? 'checkmark-circle' : 'ellipse-outline'} 
                    size={14} 
                    color={newPassword.length >= 6 ? COLORS.success : COLORS.textSecondary} 
                  />
                  {' '}Au moins 6 caractères
                </Text>
                <Text style={styles.ruleText}>
                  <Ionicons 
                    name={newPassword === confirmPassword && confirmPassword ? 'checkmark-circle' : 'ellipse-outline'} 
                    size={14} 
                    color={newPassword === confirmPassword && confirmPassword ? COLORS.success : COLORS.textSecondary} 
                  />
                  {' '}Les mots de passe correspondent
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Réinitialiser</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        );

      case STEPS.SUCCESS:
        return (
          <>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
            </View>
            <Text style={styles.title}>Mot de passe réinitialisé!</Text>
            <Text style={styles.subtitle}>
              Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.primaryButtonText}>Se connecter</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </>
        );
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (step === STEPS.PHONE || step === STEPS.SUCCESS) {
                navigation.goBack();
              } else {
                // Revenir à l'étape précédente
                if (step === STEPS.OTP) setStep(STEPS.PHONE);
                else if (step === STEPS.NEW_PASSWORD) setStep(STEPS.OTP);
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.logo}>BAIBEBALO</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress indicator */}
        {step !== STEPS.SUCCESS && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, step === STEPS.PHONE && styles.progressDotActive]} />
            <View style={styles.progressLine} />
            <View style={[styles.progressDot, step === STEPS.OTP && styles.progressDotActive]} />
            <View style={styles.progressLine} />
            <View style={[styles.progressDot, step === STEPS.NEW_PASSWORD && styles.progressDotActive]} />
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {renderStep()}
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
    flexGrow: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -0.03,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.border,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 48,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  restaurantName: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 24,
  },
  form: {
    width: '100%',
    gap: 16,
  },
  fieldContainer: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    width: '100%',
  },
  input: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: 15,
    fontSize: 16,
    color: COLORS.text,
  },
  passwordWrapper: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'stretch',
  },
  passwordInput: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: 15,
    fontSize: 16,
    color: COLORS.text,
  },
  eyeButton: {
    height: 56,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 15,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 32,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  otpInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendButton: {
    paddingVertical: 12,
    marginTop: 16,
  },
  resendText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  passwordRules: {
    gap: 8,
    marginTop: 8,
  },
  ruleText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});

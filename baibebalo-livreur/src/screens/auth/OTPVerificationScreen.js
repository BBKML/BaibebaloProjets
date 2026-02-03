import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput,
  TouchableOpacity, 
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { verifyOTP, sendOTP } from '../../api/auth';
import useAuthStore from '../../store/authStore';

export default function OTPVerificationScreen({ navigation, route }) {
  const { phone, isLogin } = route.params;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(45);
  const inputRefs = useRef([]);
  const hasFocusedRef = useRef(false);
  const { login, updateRegistrationData, setRegistrationStep } = useAuthStore();

  useEffect(() => {
    // Focus first input une seule fois, après que le layout soit prêt (évite clignotement)
    if (hasFocusedRef.current) return;
    const focusTimer = setTimeout(() => {
      if (!hasFocusedRef.current) {
        hasFocusedRef.current = true;
        inputRefs.current[0]?.focus();
      }
    }, 400);
    return () => clearTimeout(focusTimer);
  }, []);

  useEffect(() => {
    // Compte à rebours : ne met à jour que quand prev > 0 pour limiter les re-renders
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : prev));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = (value, index) => {
    if (value.length > 1) {
      // Handle paste
      const otpArray = value.slice(0, 6).split('');
      const newOtp = [...otp];
      otpArray.forEach((char, i) => {
        if (index + i < 6) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + otpArray.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const getOtpString = () => otp.join('');

  const isOtpComplete = () => otp.every(digit => digit !== '');

  const handleVerify = async () => {
    if (!isOtpComplete()) {
      Alert.alert('Erreur', 'Veuillez entrer le code complet');
      return;
    }

    setLoading(true);
    try {
      const response = await verifyOTP(phone, getOtpString());
      
      console.log('OTP Response:', JSON.stringify(response, null, 2));
      
      // Cas 1: Livreur existant et actif - connexion réussie
      if (response.data?.token || response.data?.accessToken) {
        const token = response.data.token || response.data.accessToken;
        const user = response.data.user;
        console.log('Logging in user:', user);
        console.log('User status:', user.status);
        console.log('With token:', token.substring(0, 50) + '...');
        
        // Effacer le flag pendingRegistration si présent
        const { setPendingRegistration } = useAuthStore.getState();
        await setPendingRegistration(false);
        
        // Le login va déclencher un changement d'état dans le store
        // AppNavigator va automatiquement naviguer vers la bonne route
        await login(user, token);
        
        console.log('Login completed! AppNavigator will handle navigation automatically.');
        // Ne PAS faire de navigation ici - AppNavigator s'en charge
        return;
      }
      
      // Cas 2: Livreur en attente de validation
      if (response.data?.needsValidation || response.data?.user?.validation_status === 'pending') {
        // Marquer comme inscription en attente et naviguer vers PendingValidation
        const { setPendingRegistration } = useAuthStore.getState();
        await setPendingRegistration(true);
        navigation.reset({
          index: 0,
          routes: [{ name: 'PendingValidation' }],
        });
        return;
      }
      
      // Cas 3: Nouveau livreur - continuer vers l'inscription
      if (response.data?.isNewUser) {
        await updateRegistrationData({ phone, otpVerified: true });
        await setRegistrationStep(1);
        navigation.navigate('PersonalInfoStep1', { phone });
        return;
      }
      
      // Cas par défaut - aller vers l'inscription
      await updateRegistrationData({ phone, otpVerified: true });
      await setRegistrationStep(1);
      navigation.navigate('PersonalInfoStep1', { phone });
      
    } catch (error) {
      console.error('Error verifying OTP:', error);
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          'Code invalide. Réessayez.';
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;

    try {
      await sendOTP(phone);
      setResendTimer(45);
      Alert.alert('Succès', 'Un nouveau code a été envoyé');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de renvoyer le code');
    }
  };

  const formatPhone = (phoneNumber) => {
    // Format +225XXXXXXXXXX to +225 XX XX XX XX XX
    const digits = phoneNumber.replace('+225', '');
    let formatted = '+225 ';
    for (let i = 0; i < digits.length; i += 2) {
      formatted += digits.slice(i, i + 2) + ' ';
    }
    return formatted.trim();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>Entrez le code reçu</Text>
          <Text style={styles.subtitle}>
            Code envoyé au {formatPhone(phone)}
          </Text>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[
                  styles.otpInput,
                  digit && styles.otpInputFilled
                ]}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={6}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Resend */}
          <View style={styles.resendContainer}>
            {resendTimer > 0 ? (
              <Text style={styles.resendTimer}>
                Renvoyer dans {resendTimer}s
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Renvoyer le code</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity 
            style={[
              styles.primaryButton,
              !isOtpComplete() && styles.primaryButtonDisabled
            ]}
            onPress={handleVerify}
            disabled={!isOtpComplete() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>VÉRIFIER</Text>
            )}
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
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 40,
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
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
  resendContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  resendTimer: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  bottomContainer: {
    padding: 24,
    paddingBottom: 32,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.textLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

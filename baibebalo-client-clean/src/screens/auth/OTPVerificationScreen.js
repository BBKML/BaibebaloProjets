import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';

export default function OTPVerificationScreen({ navigation, route }) {
  console.log('🟢 OTPVerificationScreen - RENDU', {
    hasNavigation: !!navigation,
    hasRoute: !!route,
    phoneNumber: route?.params?.phoneNumber,
  });
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(300);
  const inputRefs = useRef([]);
  const { verifyOTP, isLoading, phoneNumber, sendOTP, otpAttempts, otpMaxAttempts, otpExpiresAt } =
    useAuthStore();
  const targetPhone = route?.params?.phoneNumber || phoneNumber;
  const attemptsRemaining = Math.max(0, (otpMaxAttempts || 3) - (otpAttempts || 0));
  const isExpired = otpExpiresAt ? Date.now() > otpExpiresAt : false;

  useEffect(() => {
    setTimeLeft(300);
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetPhone]);

  const handleCodeChange = (value, index) => {
    if (value.length > 1) {
      // Si l'utilisateur colle un code complet
      const pastedCode = value.split('').slice(0, 6);
      const newCode = [...code];
      pastedCode.forEach((digit, i) => {
        if (i < 6) newCode[i] = digit;
      });
      setCode(newCode);
      // Focus sur le dernier input
      if (pastedCode.length === 6) {
        inputRefs.current[5]?.focus();
      }
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Passer au champ suivant
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (attemptsRemaining === 0) {
      Alert.alert('Erreur', 'Nombre maximal de tentatives atteint. Réessayez plus tard.');
      return;
    }

    if (isExpired) {
      Alert.alert('Erreur', 'Le code OTP a expiré. Veuillez demander un nouveau code.');
      return;
    }

    const otpCode = code.join('');
    if (otpCode.length !== 6) {
      Alert.alert('Erreur', 'Veuillez entrer le code complet');
      return;
    }

    const result = await verifyOTP(otpCode);
    
    if (result.success) {
      // Attendre que le store soit mis à jour
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Récupérer les données directement depuis la réponse ET depuis le store
      const responseData = result.data || {};
      const isNewUser = responseData.isNewUser || false;
      
      // Utiliser l'utilisateur depuis la réponse (plus fiable que le store qui peut avoir un délai)
      const userFromResponse = responseData.user || responseData.data?.user;
      const { user: userFromStore } = useAuthStore.getState();
      const user = userFromResponse || userFromStore;
      
      console.log('🔍 OTPVerification - Vérification profil:', {
        isNewUser,
        userFromResponse: userFromResponse ? { id: userFromResponse.id, first_name: userFromResponse.first_name, last_name: userFromResponse.last_name } : null,
        userFromStore: userFromStore ? { id: userFromStore.id, first_name: userFromStore.first_name, last_name: userFromStore.last_name } : null,
      });
      
      // Le backend peut utiliser full_name ou first_name/last_name
      const hasFullName = user?.full_name && user.full_name.trim().length > 0;
      const hasFirstLastName = user?.first_name && user?.last_name;
      const hasProfile = hasFullName || hasFirstLastName;
      
      console.log('🔍 OTPVerification - État du profil:', {
        hasFullName,
        hasFirstLastName,
        hasProfile,
        targetRoute: (isNewUser || !hasProfile) ? 'ProfileCreation' : 'MainTabs',
      });
      
      const targetRoute = (isNewUser || !hasProfile) ? 'ProfileCreation' : 'MainTabs';
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: targetRoute }],
        })
      );
    } else {
      const remainingAfter = Math.max(0, attemptsRemaining - 1);
      const attemptInfo =
        remainingAfter > 0
          ? `Tentatives restantes : ${remainingAfter}`
          : 'Nombre maximal de tentatives atteint';
      Alert.alert('Erreur', `${result.error}\n${attemptInfo}`);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (timeLeft > 0 || !targetPhone) {
      return;
    }
    try {
      const result = await sendOTP(targetPhone);
      if (result?.success === false || result?.error) {
        Alert.alert('Erreur', result?.error || 'Impossible de renvoyer le code');
        return;
      }
      setTimeLeft(300);
      Alert.alert('Succès', 'Code renvoyé');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de renvoyer le code');
    }
  };

  const formatTimer = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Code de vérification</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Ionicons name="phone-portrait" size={32} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Vérification du numéro</Text>
        <Text style={styles.subtitle}>
          Entrez le code à 6 chiffres envoyé au{'\n'}
          <Text style={styles.phoneText}>{targetPhone || 'votre numéro'}</Text>
        </Text>

        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[styles.codeInput, digit && styles.codeInputFilled]}
              value={digit}
              onChangeText={(value) => handleCodeChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <View style={styles.timerBlock}>
          <Ionicons name="time-outline" size={14} color={COLORS.secondary} />
          <Text style={styles.timerText}>Renvoyer le code dans {formatTimer()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.resendButton, timeLeft > 0 && styles.resendButtonDisabled]}
          onPress={handleResend}
          disabled={timeLeft > 0}
        >
          <Text style={[styles.resendText, timeLeft > 0 && styles.resendTextDisabled]}>
            Renvoyer le code
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={isLoading || attemptsRemaining === 0 || isExpired}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Vérification...' : 'Vérifier maintenant'}
          </Text>
        </TouchableOpacity>
        <View style={styles.attemptsInfo}>
          <Text style={styles.attemptsText}>
            {attemptsRemaining > 0
              ? `Tentatives restantes : ${attemptsRemaining}`
              : 'Trop de tentatives. Réessayez plus tard.'}
          </Text>
          {isExpired && <Text style={styles.attemptsText}>Code expiré.</Text>}
        </View>
      </View>
    </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  phoneText: {
    fontWeight: '700',
    color: COLORS.text,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    width: '100%',
    gap: 8,
  },
  codeInput: {
    flex: 1,
    height: 56,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  codeInputFilled: {
    borderColor: COLORS.primary,
  },
  timerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.secondary + '10',
    marginBottom: 8,
  },
  timerText: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    marginBottom: 8,
  },
  resendText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  resendButtonDisabled: {
    opacity: 0.4,
  },
  resendTextDisabled: {
    color: COLORS.textSecondary,
  },
  attemptsInfo: {
    marginTop: 12,
    alignItems: 'center',
  },
  attemptsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

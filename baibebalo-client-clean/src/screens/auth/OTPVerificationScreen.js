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
import { getTestOTP } from '../../api/auth';

export default function OTPVerificationScreen({ navigation, route }) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [otpCode, setOtpCode] = useState(null);
  const [loadingOTP, setLoadingOTP] = useState(false);
  const inputRefs = useRef([]);
  const { verifyOTP, isLoading, phoneNumber } = useAuthStore();

  // Log pour vérifier que l'écran est monté
  useEffect(() => {
    console.log('✅✅✅ OTPVerificationScreen MONTÉ ET AFFICHÉ!');
    console.log('📱 phoneNumber du store:', phoneNumber);
    console.log('📱 phoneNumber de la route:', route?.params?.phoneNumber);
    console.log('📱 navigation disponible:', !!navigation);
  }, []);

  // Récupérer le code OTP pour les tests
  useEffect(() => {
    const fetchOTP = async () => {
      const currentPhone = route?.params?.phoneNumber || phoneNumber;
      if (currentPhone) {
        setLoadingOTP(true);
        try {
          const result = await getTestOTP(currentPhone);
          if (result?.data?.code) {
            setOtpCode(result.data.code);
            console.log('✅ Code OTP récupéré:', result.data.code);
          }
        } catch (error) {
          console.log('ℹ️ Code OTP non disponible via API. Vérifiez les logs du backend.');
        } finally {
          setLoadingOTP(false);
        }
      }
    };
    
    // Attendre un peu avant de récupérer le code (le temps que le backend le génère)
    const timer = setTimeout(fetchOTP, 1000);
    return () => clearTimeout(timer);
  }, [phoneNumber, route?.params?.phoneNumber]);

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
    const otpCode = code.join('');
    if (otpCode.length !== 6) {
      Alert.alert('Erreur', 'Veuillez entrer le code complet');
      return;
    }

    console.log('🔄 Début vérification OTP...');
    const result = await verifyOTP(otpCode);
    
    if (result.success) {
      console.log('✅ OTP vérifié avec succès');
      // Attendre un peu pour que le store se mette à jour
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Vérifier si c'est un nouvel utilisateur
      const isNewUser = result.data?.isNewUser || result.data?.data?.isNewUser;
      const { user } = useAuthStore.getState();
      // Le backend peut utiliser full_name ou first_name/last_name
      const hasFullName = user?.full_name && user.full_name.trim().length > 0;
      const hasFirstLastName = user?.first_name && user?.last_name;
      const hasProfile = hasFullName || hasFirstLastName;
      
      console.log('📱 État utilisateur:', { 
        isNewUser, 
        hasProfile, 
        hasFullName,
        hasFirstLastName,
        userId: user?.id,
        user: user ? { full_name: user.full_name, first_name: user.first_name, last_name: user.last_name } : null
      });
      
      // Navigation vers l'écran approprié
      const targetRoute = (isNewUser || !hasProfile) ? 'ProfileCreation' : 'MainTabs';
      console.log('🔄 Navigation vers:', targetRoute);
      
      // Utiliser CommonActions pour une navigation plus fiable
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: targetRoute }],
        })
      );
    } else {
      Alert.alert('Erreur', result.error);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {/* Bouton retour */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Vérification</Text>
        <Text style={styles.subtitle}>
          Entrez le code à 6 chiffres envoyé au{'\n'}
          {route?.params?.phoneNumber || phoneNumber || 'votre numéro'}
        </Text>

        {/* Affichage du code OTP pour les tests */}
        {__DEV__ && otpCode && (
          <View style={styles.otpDisplayContainer}>
            <Text style={styles.otpLabel}>Code OTP (TEST) :</Text>
            <TouchableOpacity
              style={styles.otpCodeContainer}
              onPress={() => {
                // Remplir automatiquement le code
                const otpArray = otpCode.split('');
                setCode(otpArray);
                // Focus sur le dernier input
                setTimeout(() => {
                  inputRefs.current[5]?.focus();
                }, 100);
              }}
            >
              <Text style={styles.otpCode}>{otpCode}</Text>
              <Ionicons name="copy-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.otpHint}>Appuyez pour remplir automatiquement</Text>
          </View>
        )}

        {__DEV__ && !otpCode && !loadingOTP && (
          <View style={styles.otpInfoContainer}>
            <Text style={styles.otpInfoText}>
              ℹ️ Code OTP disponible dans les logs du backend
            </Text>
            <Text style={styles.otpInfoSubtext}>
              Vérifiez la table otp_codes ou les logs serveur
            </Text>
          </View>
        )}

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

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Vérification...' : 'Vérifier'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resendButton}
          onPress={() => {
            // TODO: Réenvoyer le code
            Alert.alert('Info', 'Code renvoyé');
          }}
        >
          <Text style={styles.resendText}>Renvoyer le code</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 40,
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  codeInput: {
    width: 50,
    height: 60,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  codeInputFilled: {
    borderColor: COLORS.primary,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
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
    marginTop: 24,
    alignItems: 'center',
  },
  resendText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  otpDisplayContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  otpLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  otpCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  otpCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 8,
  },
  otpHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  otpInfoContainer: {
    backgroundColor: COLORS.white + '80',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  otpInfoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  otpInfoSubtext: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

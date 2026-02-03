import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput,
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { sendOTP } from '../../api/auth';

export default function PhoneInputScreen({ navigation, route }) {
  const isLogin = route.params?.isLogin || false;
  const [phone, setPhone] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatPhoneNumber = (text) => {
    // Remove non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    // Limit to 10 digits
    const limited = cleaned.slice(0, 10);
    // Format: XX XX XX XX XX
    let formatted = '';
    for (let i = 0; i < limited.length; i += 2) {
      if (i > 0) formatted += ' ';
      formatted += limited.slice(i, i + 2);
    }
    return formatted;
  };

  const handlePhoneChange = (text) => {
    setPhone(formatPhoneNumber(text));
  };

  const getCleanPhone = () => {
    return '+225' + phone.replace(/\s/g, '');
  };

  const isValidPhone = () => {
    const cleaned = phone.replace(/\s/g, '');
    return cleaned.length === 10;
  };

  const handleContinue = async () => {
    if (!isValidPhone()) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide');
      return;
    }

    if (!acceptedTerms && !isLogin) {
      Alert.alert('Erreur', 'Veuillez accepter les conditions générales');
      return;
    }

    setLoading(true);
    try {
      await sendOTP(getCleanPhone());
      navigation.navigate('OTPVerification', { 
        phone: getCleanPhone(),
        isLogin 
      });
    } catch (error) {
      console.error('Error sending OTP:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.message || 'Impossible d\'envoyer le code. Réessayez.'
      );
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.title}>
            {isLogin ? 'Connexion' : 'Votre numéro de téléphone'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin 
              ? 'Entrez votre numéro pour vous connecter'
              : 'Nous vous enverrons un code de vérification'
            }
          </Text>

          {/* Phone Input */}
          <View style={styles.phoneInputContainer}>
            <View style={styles.countryCode}>
              <Text style={styles.flag}>🇨🇮</Text>
              <Text style={styles.countryCodeText}>+225</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="XX XX XX XX XX"
              placeholderTextColor={COLORS.textLight}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={handlePhoneChange}
              maxLength={14} // 10 digits + 4 spaces
            />
          </View>

          {/* Terms checkbox (only for registration) */}
          {!isLogin && (
            <TouchableOpacity 
              style={styles.termsContainer}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                {acceptedTerms && (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.termsText}>
                J'accepte les{' '}
                <Text style={styles.termsLink}>conditions générales</Text>
                {' '}et la{' '}
                <Text style={styles.termsLink}>politique de confidentialité</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity 
            style={[
              styles.primaryButton,
              (!isValidPhone() || (!acceptedTerms && !isLogin)) && styles.primaryButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!isValidPhone() || (!acceptedTerms && !isLogin) || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>RECEVOIR LE CODE</Text>
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    backgroundColor: COLORS.backgroundSecondary,
  },
  flag: {
    fontSize: 20,
    marginRight: 8,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.text,
    letterSpacing: 1,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 24,
    paddingRight: 16,
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
  termsText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '600',
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

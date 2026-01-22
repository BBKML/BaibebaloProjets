import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function PhoneEntryScreen({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const { sendOTP, isLoading } = useAuthStore();

  const normalizePhoneNumber = (input) => {
    const digitsOnly = input.replace(/\D/g, '');
    if (digitsOnly.startsWith('225') && digitsOnly.length === 13) {
      return `+${digitsOnly}`;
    }
    if (digitsOnly.length === 10 && digitsOnly.startsWith('0')) {
      return `+225${digitsOnly}`;
    }
    return null;
  };

  const isValidIvorianPhone = (input) => {
    const normalized = normalizePhoneNumber(input);
    if (!normalized) return false;
    return /^\+2250\d{9}$/.test(normalized);
  };

  const handleSendOTP = async () => {
    // Valider le numéro de téléphone
    if (!phoneNumber || !isValidIvorianPhone(phoneNumber)) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro ivoirien valide (+225 XX XX XX XX XX)');
      return;
    }

    // Formater le numéro (ajouter l'indicatif si nécessaire)
    const formattedPhone = normalizePhoneNumber(phoneNumber);
    if (!formattedPhone) {
      Alert.alert('Erreur', 'Numéro de téléphone invalide.');
      return;
    }

    try {
      const result = await sendOTP(formattedPhone);
      console.log('📱 PhoneEntryScreen - Résultat sendOTP:', result);
      
      if (result?.success !== true) {
        Alert.alert(
          'Erreur',
          result?.error || result?.message || 'Erreur lors de l\'envoi du code'
        );
        return;
      }
      
      console.log('✅ OTP envoyé - Navigation vers OTPVerification');
      
      // 🔥 NAVIGATION IMMÉDIATE
      navigation.navigate('OTPVerification', {
        phoneNumber: formattedPhone,
      });
      
      // 🔥 REMETTRE isLoading à false après navigation (sans délai)
      useAuthStore.setState({ isLoading: false });
      console.log('✅ isLoading remis à false après navigation');
      
    } catch (error) {
      console.error('❌ Erreur handleSendOTP:', error);
      const errorMessage = error?.response?.data?.error?.message 
        || error?.response?.data?.message 
        || error?.message 
        || 'Erreur lors de l\'envoi du code';
      
      Alert.alert('Erreur', errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.backgroundPattern} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.brandBadge}>
            <Text style={styles.brandLetter}>B</Text>
          </View>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="help-circle-outline" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Entrez votre numéro de téléphone</Text>
        <Text style={styles.subtitle}>
          Nous vous enverrons un code de confirmation par SMS ou WhatsApp pour sécuriser votre compte.
        </Text>

        <View style={styles.inputWrapper}>
          <View style={styles.prefix}>
            <View style={styles.flag}>
              <View style={styles.flagBarOrange} />
              <View style={styles.flagBarWhite} />
              <View style={styles.flagBarGreen} />
            </View>
            <Text style={styles.prefixText}>+225</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="01 02 03 04 05"
            placeholderTextColor={COLORS.textLight}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoFocus
          />
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSendOTP}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Envoi...' : 'Continuer'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.socialSection}>
          <Text style={styles.socialTitle}>Connexion sociale (phase 2)</Text>
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => Alert.alert('Info', 'Connexion Google disponible en phase 2')}
            >
              <Ionicons name="logo-google" size={18} color={COLORS.text} />
              <Text style={styles.socialText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => Alert.alert('Info', 'Connexion Facebook disponible en phase 2')}
            >
              <Ionicons name="logo-facebook" size={18} color={COLORS.text} />
              <Text style={styles.socialText}>Facebook</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            En continuant, vous acceptez nos{' '}
            <Text style={styles.footerLink}>Conditions d'Utilisation</Text>
          </Text>
          <TouchableOpacity style={styles.secondaryLink} onPress={handleSendOTP} disabled={isLoading}>
            <Text style={styles.secondaryLinkText}>J'ai déjà un compte</Text>
            <Ionicons name="log-in-outline" size={16} color={COLORS.primary} />
          </TouchableOpacity>
          
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundPattern: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(255,107,53,0.03)',
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 40,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  brandBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  brandLetter: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '800',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 6,
    marginBottom: 24,
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    height: 52,
  },
  flag: {
    width: 22,
    height: 14,
    borderRadius: 2,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  flagBarOrange: {
    flex: 1,
    backgroundColor: '#f77f00',
  },
  flagBarWhite: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  flagBarGreen: {
    flex: 1,
    backgroundColor: '#009e60',
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 18,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
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
  footer: {
    marginTop: 'auto',
    paddingTop: 24,
    alignItems: 'center',
    gap: 12,
  },
  socialSection: {
    marginTop: 16,
    alignItems: 'center',
    gap: 10,
  },
  socialTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  socialText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  secondaryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secondaryLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  qaLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  qaLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

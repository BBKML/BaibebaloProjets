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
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';

const operators = [
  { id: 'orange_money', name: 'Orange Money', color: '#FF6600', icon: '🟠' },
  { id: 'mtn_money', name: 'MTN Money', color: '#FFCC00', icon: '🟡' },
  { id: 'moov_money', name: 'Moov Money', color: '#0066CC', icon: '🔵' },
];

export default function MobileMoneySetupScreen({ navigation }) {
  const { updateRegistrationData, registrationData } = useAuthStore();
  const [selectedOperator, setSelectedOperator] = useState(registrationData.mobileMoneyOperator || null);
  const [accountNumber, setAccountNumber] = useState(registrationData.mobileMoneyNumber || '');
  const [holderName, setHolderName] = useState(registrationData.mobileMoneyHolderName || '');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/\D/g, '');
    const limited = cleaned.slice(0, 10);
    let formatted = '';
    for (let i = 0; i < limited.length; i += 2) {
      if (i > 0) formatted += ' ';
      formatted += limited.slice(i, i + 2);
    }
    return formatted;
  };

  const handleNumberChange = (text) => {
    setAccountNumber(formatPhoneNumber(text));
    setVerified(false);
  };

  const isValidForm = () => {
    const cleanedNumber = accountNumber.replace(/\s/g, '');
    const isValid = selectedOperator && cleanedNumber.length === 10 && holderName.trim().length > 0;
    console.log('Form validation:', { 
      selectedOperator, 
      accountNumber, 
      cleanedNumber,
      cleanedNumberLength: cleanedNumber.length,
      holderName,
      isValid 
    });
    return isValid;
  };

  const handleVerify = () => {
    console.log('handleVerify called');
    
    if (!isValidForm()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs correctement:\n- Sélectionnez un opérateur\n- Entrez un numéro à 10 chiffres\n- Entrez le nom du titulaire');
      return;
    }

    setVerifying(true);
    
    // Simulate verification
    setTimeout(() => {
      setVerifying(false);
      setVerified(true);
      Alert.alert('Succès', 'Un micro-paiement de 1 FCFA a été envoyé pour vérifier votre compte');
    }, 2000);
  };

  const handleContinue = async () => {
    if (!verified) {
      Alert.alert('Erreur', 'Veuillez d\'abord vérifier votre compte');
      return;
    }

    // Format phone number as +225XXXXXXXXXX
    const cleanedNumber = accountNumber.replace(/\s/g, '');
    const formattedNumber = `+225${cleanedNumber}`;

    await updateRegistrationData({
      mobileMoneyOperator: selectedOperator,
      mobileMoneyNumber: formattedNumber,
      mobileMoneyHolderName: holderName,
    });

    navigation.navigate('AvailabilitySchedule');
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
        
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressDot, styles.progressDotCompleted]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
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
        <Text style={styles.stepIndicator}>Étape 4/5</Text>
        <Text style={styles.title}>Informations de paiement</Text>
        <Text style={styles.subtitle}>
          Où souhaitez-vous recevoir vos gains?
        </Text>

        {/* Operators */}
        <View style={styles.operatorsContainer}>
          {operators.map((op) => (
            <TouchableOpacity
              key={op.id}
              style={[
                styles.operatorCard,
                selectedOperator === op.id && styles.operatorCardSelected
              ]}
              onPress={() => {
                setSelectedOperator(op.id);
                setVerified(false);
              }}
            >
              <Text style={styles.operatorIcon}>{op.icon}</Text>
              <Text style={[
                styles.operatorName,
                selectedOperator === op.id && styles.operatorNameSelected
              ]}>
                {op.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Account Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Numéro de compte Mobile Money *</Text>
            <TextInput
              style={styles.input}
              placeholder="XX XX XX XX XX"
              placeholderTextColor={COLORS.textLight}
              value={accountNumber}
              onChangeText={handleNumberChange}
              keyboardType="phone-pad"
              maxLength={14}
            />
          </View>

          {/* Holder Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom du titulaire *</Text>
            <TextInput
              style={styles.input}
              placeholder="Doit correspondre à votre identité"
              placeholderTextColor={COLORS.textLight}
              value={holderName}
              onChangeText={(text) => {
                setHolderName(text);
                setVerified(false);
              }}
              autoCapitalize="words"
            />
          </View>

          {/* Verification Notice */}
          <View style={styles.noticeContainer}>
            <Ionicons name="information-circle" size={20} color={COLORS.info} />
            <Text style={styles.noticeText}>
              Un micro-paiement de 1 FCFA sera effectué pour vérifier votre compte
            </Text>
          </View>

          {/* Verify Button */}
          {!verified ? (
            <TouchableOpacity
              style={[
                styles.verifyButton,
                !isValidForm() && styles.verifyButtonDisabled
              ]}
              onPress={handleVerify}
              disabled={verifying}
            >
              {verifying ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.verifyButtonText}>VÉRIFIER MON COMPTE</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.verifiedContainer}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <Text style={styles.verifiedText}>Compte vérifié</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[
            styles.primaryButton,
            !verified && styles.primaryButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!verified}
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
  progressDotCompleted: {
    backgroundColor: COLORS.primary,
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
    marginBottom: 24,
  },
  operatorsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  operatorCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  operatorCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  operatorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  operatorName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  operatorNameSelected: {
    color: COLORS.primary,
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
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.info + '10',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.info,
    lineHeight: 20,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  verifyButtonDisabled: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundSecondary,
  },
  verifyButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.success + '15',
    borderRadius: 12,
    paddingVertical: 16,
  },
  verifiedText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.success,
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

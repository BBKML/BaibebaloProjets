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

export default function PhoneEntryScreen({ navigation }) {
  // Numéro de test pré-rempli
  const [phoneNumber, setPhoneNumber] = useState('0585670940');
  const { sendOTP, isLoading } = useAuthStore();

  const handleSendOTP = async () => {
    // Valider le numéro de téléphone
    if (!phoneNumber || phoneNumber.length < 8) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide');
      return;
    }

    // Formater le numéro (ajouter l'indicatif si nécessaire)
    const formattedPhone = phoneNumber.startsWith('+')
      ? phoneNumber
      : `+225${phoneNumber}`;

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🚀 DÉBUT handleSendOTP');
    console.log('📱 Numéro formaté:', formattedPhone);
    console.log('📱 Navigation object:', navigation);
    console.log('📱 Navigation.navigate type:', typeof navigation?.navigate);
    console.log('═══════════════════════════════════════════════════════════');
    
    let result;
    try {
      result = await sendOTP(formattedPhone);
      
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📋 RÉSULTAT sendOTP COMPLET:');
      console.log(JSON.stringify(result, null, 2));
      console.log('📋 result:', result);
      console.log('📋 result.success:', result?.success);
      console.log('📋 typeof result.success:', typeof result?.success);
      console.log('═══════════════════════════════════════════════════════════');
      
      // NAVIGATION IMMÉDIATE - Naviguer si PAS d'erreur explicite
      const hasError = result?.error || (result?.success === false);
      
      console.log('🔍 DÉCISION NAVIGATION:');
      console.log('  - result:', result);
      console.log('  - result?.success:', result?.success);
      console.log('  - result?.error:', result?.error);
      console.log('  - hasError:', hasError);
      
      // NAVIGUER SI : PAS d'erreur explicite
      if (!hasError) {
      console.log('✅✅✅ NAVIGATION FORCÉE VERS OTPVerification');
      
      // Essayer TOUTES les méthodes de navigation possibles
      const navigateToOTP = () => {
        console.log('🔄 Tentative navigation.navigate...');
        try {
          navigation.navigate('OTPVerification', { phoneNumber: formattedPhone });
          console.log('✅ navigation.navigate RÉUSSI');
        } catch (e) {
          console.error('❌ navigation.navigate ÉCHOUÉ:', e);
        }
      };
      
      const pushToOTP = () => {
        console.log('🔄 Tentative navigation.push...');
        try {
          navigation.push('OTPVerification', { phoneNumber: formattedPhone });
          console.log('✅ navigation.push RÉUSSI');
        } catch (e) {
          console.error('❌ navigation.push ÉCHOUÉ:', e);
        }
      };
      
      const replaceToOTP = () => {
        console.log('🔄 Tentative navigation.replace...');
        try {
          navigation.replace('OTPVerification', { phoneNumber: formattedPhone });
          console.log('✅ navigation.replace RÉUSSI');
        } catch (e) {
          console.error('❌ navigation.replace ÉCHOUÉ:', e);
        }
      };
      
      // Essayer navigate immédiatement
      navigateToOTP();
      
      // Essayer avec requestAnimationFrame
      requestAnimationFrame(() => {
        console.log('🔄 requestAnimationFrame - Tentative navigate...');
        navigateToOTP();
      });
      
      // Essayer avec setTimeout
      setTimeout(() => {
        console.log('🔄 setTimeout 100ms - Tentative navigate...');
        navigateToOTP();
      }, 100);
      
      // Essayer push en fallback
      setTimeout(() => {
        console.log('🔄 setTimeout 200ms - Tentative push...');
        pushToOTP();
      }, 200);
      
      // Essayer replace en dernier recours
      setTimeout(() => {
        console.log('🔄 setTimeout 300ms - Tentative replace...');
        replaceToOTP();
      }, 300);
      
      // NAVIGATION DE SECOURS - Toujours naviguer après 500ms si pas d'erreur
      setTimeout(() => {
        console.log('🔄 NAVIGATION DE SECOURS - 500ms - Forcer navigation...');
        try {
          navigation.navigate('OTPVerification', { phoneNumber: formattedPhone });
          console.log('✅ Navigation de secours RÉUSSI');
        } catch (e) {
          console.error('❌ Navigation de secours ÉCHOUÉ:', e);
        }
      }, 500);
      
      } else {
        // Afficher le message d'erreur à l'utilisateur
        const errorMessage = result?.error || result?.message || 'Erreur lors de l\'envoi du code';
        console.error('❌❌❌ ERREUR - PAS DE NAVIGATION');
        console.error('  - result:', result);
        console.error('  - errorMessage:', errorMessage);
        
        Alert.alert(
          'Erreur',
          errorMessage,
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      // Gérer les erreurs (429, 500, etc.)
      console.error('❌❌❌ EXCEPTION dans handleSendOTP:', error);
      const errorMessage = error?.response?.data?.error?.message 
        || error?.response?.data?.message 
        || error?.message 
        || 'Erreur lors de l\'envoi du code';
      
      Alert.alert(
        'Erreur',
        errorMessage,
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Bienvenue sur BAIBEBALO</Text>
        <Text style={styles.subtitle}>
          Entrez votre numéro de téléphone pour continuer
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Numéro de téléphone</Text>
          <TextInput
            style={styles.input}
            placeholder="07 XX XX XX XX"
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
        </TouchableOpacity>

        {/* BOUTON DE TEST - FORCER LA NAVIGATION */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: COLORS.secondary, marginTop: 10 }]}
          onPress={() => {
            console.log('🧪 TEST - FORCER NAVIGATION DIRECTE');
            console.log('📱 navigation:', navigation);
            console.log('📱 navigation.navigate:', typeof navigation?.navigate);
            try {
              navigation.navigate('OTPVerification', { phoneNumber: phoneNumber || '+2250700000000' });
              console.log('✅ TEST navigation.navigate RÉUSSI');
            } catch (e) {
              console.error('❌ TEST navigation.navigate ÉCHOUÉ:', e);
              Alert.alert('Erreur Test', `Navigation échouée: ${e.message}`);
            }
          }}
        >
          <Text style={styles.buttonText}>🧪 TEST NAVIGATION</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  inputContainer: {
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
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
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
});

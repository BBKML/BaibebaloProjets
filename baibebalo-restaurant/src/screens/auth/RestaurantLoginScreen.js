import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { restaurantAuth } from '../../api/auth';
import useAuthStore from '../../store/authStore';
import Toast from 'react-native-toast-message';

export default function RestaurantLoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const insets = useSafeAreaInsets();
  const { login } = useAuthStore();

  const handleLogin = async () => {
    if (!phone || !password) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Veuillez remplir tous les champs',
      });
      return;
    }

    setLoading(true);
    try {
      // Le backend accepte maintenant phone ou email
      const response = await restaurantAuth.login(phone, password);
      Toast.show({
        type: 'success',
        text1: 'Connexion réussie',
        text2: 'Bienvenue !',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erreur de connexion',
        text2: error.message || 'Vérifiez vos identifiants',
      });
    } finally {
      setLoading(false);
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
        {/* Header avec logo */}
        <View style={styles.topHeader}>
          <Text style={styles.logo}>BAIBEBALO</Text>
        </View>

        {/* Contenu principal */}
        <View style={styles.content}>
          {/* Logo / Image illustration */}
          <View style={styles.imageContainer}>
            <Image
              source={require('../../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Headline */}
          <View style={styles.headlineContainer}>
            <Text style={styles.title}>Connexion Restaurant</Text>
            <Text style={styles.subtitle}>Gérez votre établissement en toute simplicité</Text>
          </View>

          {/* Formulaire */}
          <View style={styles.form}>
            {/* Identifiant (téléphone ou email) */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Téléphone ou Email</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="06 00 00 00 00 ou restaurant@exemple.com"
                  placeholderTextColor={COLORS.textSecondary + '99'}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Mot de passe */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Mot de passe</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textSecondary + '99'}
                  value={password}
                  onChangeText={setPassword}
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

            {/* Mot de passe oublié */}
            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            {/* Bouton de connexion */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Section inscription */}
          <View style={styles.registerSection}>
            <Text style={styles.registerText}>Pas encore partenaire ?</Text>
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => navigation.navigate('RegisterStep1')}
            >
              <Text style={styles.registerButtonText}>Créer un compte restaurant</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              En vous connectant, vous acceptez nos Conditions Générales d'Utilisation et notre Politique de Confidentialité.
            </Text>
          </View>
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
  topHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 32,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  logo: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -0.03,
    textTransform: 'uppercase',
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
  imageContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: 140,
    height: 140,
    borderRadius: 24,
  },
  headlineContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  loginButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerSection: {
    marginTop: 48,
    alignItems: 'center',
    width: '100%',
  },
  registerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  registerButton: {
    backgroundColor: COLORS.primary + '1A',
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  footer: {
    marginTop: 32,
    paddingHorizontal: 16,
    width: '100%',
  },
  footerText: {
    fontSize: 10,
    color: COLORS.textSecondary + '99',
    textAlign: 'center',
    lineHeight: 16,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import { restaurantAuth } from '../../api/auth';
import Toast from 'react-native-toast-message';

export default function RegisterStep4Screen({ navigation, route }) {
  const step1Data = route.params?.step1Data || {};
  const step2Data = route.params?.step2Data || {};
  const step3Data = route.params?.step3Data || {};
  
  const [logo, setLogo] = useState(null);
  const [banner, setBanner] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const pickImage = async (type) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Accès à la galerie nécessaire');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        aspect: type === 'logo' ? [1, 1] : [16, 9],
      });

      const assets = result?.assets || [];

      if (!result?.canceled && assets.length > 0) {
        if (type === 'logo') {
          setLogo(assets[0]);
          setErrors((prev) => ({ ...prev, logo: null }));
        } else {
          setBanner(assets[0]);
        }
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!logo) {
      newErrors.logo = 'Le logo est obligatoire';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      // D'abord tester la connexion au serveur
      console.log('🔍 Test connexion serveur...');
      try {
        const testResponse = await fetch('http://192.168.1.8:5000/api/v1/health', {
          method: 'GET',
          timeout: 5000,
        });
        console.log('✅ Serveur accessible:', testResponse.status);
      } catch (testError) {
        console.log('❌ Serveur inaccessible:', testError.message);
        Alert.alert(
          'Erreur de connexion',
          'Impossible de joindre le serveur. Vérifiez que:\n\n1. Votre téléphone est sur le même WiFi\n2. Le backend est démarré\n3. L\'adresse IP est correcte (192.168.1.8)',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      // Préparer les données d'inscription
      const registrationData = {
        // Étape 1
        name: step1Data.name,
        category: step1Data.type,
        phone: step1Data.phone,
        email: step1Data.email,
        password: step1Data.password,
        
        // Étape 2
        address: step2Data.address,
        district: step2Data.neighborhood,
        landmark: step2Data.landmark,
        latitude: step2Data.latitude,
        longitude: step2Data.longitude,
        delivery_radius: 5,
        
        // Étape 3 - Documents
        document_rccm: step3Data.rccm,
        id_card_front: step3Data.id_card_front,
        id_card_back: step3Data.id_card_back,
        
        // Étape 4
        logo: logo,
        banner: banner,
      };

      console.log('📤 Envoi inscription:', { 
        name: registrationData.name, 
        phone: registrationData.phone,
        hasLogo: !!logo,
        hasBanner: !!banner,
        hasRccm: !!step3Data.rccm,
        hasIdCardFront: !!step3Data.id_card_front,
        hasIdCardBack: !!step3Data.id_card_back,
      });

      const response = await restaurantAuth.register(registrationData);
      
      if (response.success !== false) {
        Toast.show({
          type: 'success',
          text1: 'Inscription réussie !',
          text2: 'Votre demande sera examinée sous 24-48h',
        });
        navigation.navigate('PendingValidation');
      }
    } catch (error) {
      console.error('❌ Erreur inscription:', error);
      const errorMessage = error?.error?.message || error?.message || 'Erreur lors de l\'inscription';
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Logo & Photo</Text>
          <Text style={styles.stepText}>Étape 4 sur 4 - Dernière étape !</Text>
        </View>

        {/* Indicateur de progression */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressStep, styles.progressActive]} />
          <View style={[styles.progressStep, styles.progressActive]} />
          <View style={[styles.progressStep, styles.progressActive]} />
          <View style={[styles.progressStep, styles.progressActive]} />
        </View>

        <View style={styles.form}>
          {/* Logo */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Logo du restaurant *</Text>
            <Text style={styles.helperText}>Format carré recommandé (1:1)</Text>
            
            {logo ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: logo.uri }} style={styles.logoImage} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => setLogo(null)}
                >
                  <Ionicons name="close-circle" size={28} color={COLORS.error} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={() => pickImage('logo')}
                >
                  <Text style={styles.changeButtonText}>Changer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.uploadButton, errors.logo && styles.uploadButtonError]}
                onPress={() => pickImage('logo')}
              >
                <Ionicons name="image-outline" size={40} color={COLORS.primary} />
                <Text style={styles.uploadButtonText}>Ajouter le logo</Text>
              </TouchableOpacity>
            )}
            {errors.logo && <Text style={styles.errorText}>{errors.logo}</Text>}
          </View>

          {/* Bannière */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Photo de couverture (optionnel)</Text>
            <Text style={styles.helperText}>Format paysage recommandé (16:9)</Text>
            
            {banner ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: banner.uri }} style={styles.bannerImage} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => setBanner(null)}
                >
                  <Ionicons name="close-circle" size={28} color={COLORS.error} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={() => pickImage('banner')}
                >
                  <Text style={styles.changeButtonText}>Changer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage('banner')}
              >
                <Ionicons name="images-outline" size={40} color={COLORS.primary} />
                <Text style={styles.uploadButtonText}>Ajouter une photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={COLORS.info} />
            <Text style={styles.infoText}>
              Après validation, vous pourrez compléter :{'\n'}
              • Horaires d'ouverture{'\n'}
              • Informations de paiement{'\n'}
              • Photos supplémentaires
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.white} />
                <Text style={styles.submitButtonText}>Soumettre ma demande</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
    marginBottom: 20,
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
    color: COLORS.success,
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  progressActive: {
    backgroundColor: COLORS.primary,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonError: {
    borderColor: COLORS.error,
  },
  uploadButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  imagePreview: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  logoImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    backgroundColor: COLORS.background,
  },
  bannerImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.white,
    borderRadius: 14,
  },
  changeButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.info + '15',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
  footer: {
    marginTop: 24,
  },
  submitButton: {
    backgroundColor: COLORS.success,
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

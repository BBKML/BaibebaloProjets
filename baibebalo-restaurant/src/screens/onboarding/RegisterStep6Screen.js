import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import { restaurantAuth } from '../../api/auth';
import Toast from 'react-native-toast-message';

const MEDIA_TYPES = [
  { id: 'logo', label: 'Logo du restaurant', required: true, aspectRatio: '1:1', minSize: '500x500' },
  { id: 'banner', label: 'Photo de bannière', required: true, aspectRatio: '16:9', minSize: '1280x720' },
  { id: 'restaurant', label: 'Photos du restaurant (optionnel)', required: false, multiple: true, max: 5, min: 0 },
  { id: 'dishes', label: 'Photos de plats (optionnel)', required: false, multiple: true, max: 10, min: 0 },
];

export default function RegisterStep6Screen({ navigation, route }) {
  console.log('📱 RegisterStep6Screen - Montage');
  
  const step1Data = route.params?.step1Data || {};
  const step2Data = route.params?.step2Data || {};
  const step3Data = route.params?.step3Data || {};
  const step4Data = route.params?.step4Data || {};
  const step5Data = route.params?.step5Data || {};
  
  console.log('📱 Données reçues:', {
    step1: !!step1Data?.name,
    step2: !!step2Data?.address,
    step3: !!step3Data,
    step4: !!step4Data,
    step5: !!step5Data?.password,
  });
  
  const [media, setMedia] = useState({
    logo: null,
    banner: null,
    restaurant: [],
    dishes: [],
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const pickImage = async (mediaId, allowMultiple = false) => {
    try {
      console.log('📸 Demande permission galerie pour:', mediaId);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Accès à la galerie nécessaire');
        return;
      }

      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'images',
        allowsEditing: mediaId === 'logo' || mediaId === 'banner',
        quality: 0.7,
        allowsMultipleSelection: allowMultiple,
      };

      if (mediaId === 'logo') {
        options.aspect = [1, 1];
      } else if (mediaId === 'banner') {
        options.aspect = [16, 9];
      }

      console.log('📸 Ouverture galerie avec options:', options);
      const result = await ImagePicker.launchImageLibraryAsync(options);
      console.log('📸 Résultat ImagePicker:', result?.canceled ? 'annulé' : 'sélectionné');

      // Gérer les deux formats possibles (assets ou images selon la version)
      const assets = result?.assets || result?.images || [];
      
      if (!result?.canceled && assets && assets.length > 0) {
        console.log('📸 Nombre d\'images sélectionnées:', assets.length);
        if (allowMultiple) {
          setMedia((prev) => ({
            ...prev,
            [mediaId]: [...(prev[mediaId] || []), ...assets],
          }));
        } else {
          setMedia((prev) => ({
            ...prev,
            [mediaId]: assets[0],
          }));
        }
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[mediaId];
          return newErrors;
        });
      }
    } catch (error) {
      console.error('❌ Erreur pickImage:', error);
      const errorMessage = error instanceof Error ? error.message : 'Impossible de sélectionner l\'image';
      Alert.alert('Erreur', errorMessage);
    }
  };

  const removeMedia = (mediaId, index = null) => {
    if (index === null) {
      setMedia((prev) => ({
        ...prev,
        [mediaId]: null,
      }));
      return;
    }
    setMedia((prev) => ({
      ...prev,
      [mediaId]: prev[mediaId].filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    const newErrors = {};
    MEDIA_TYPES.forEach((type) => {
      if (type.required) {
        if (type.multiple) {
          const currentMedia = media[type.id] || [];
          if (type.min && currentMedia.length < type.min) {
            newErrors[type.id] = `Minimum ${type.min} photos requis`;
          } else if (type.max && currentMedia.length > type.max) {
            newErrors[type.id] = `Maximum ${type.max} photos autorisées`;
          } else if (currentMedia.length === 0) {
            newErrors[type.id] = 'Au moins une photo requise';
          }
        } else {
          if (!media[type.id]) {
            newErrors[type.id] = 'Photo requise';
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('📤 handleSubmit - Début soumission');
    
    if (!validate()) {
      console.log('❌ Validation échouée');
      return;
    }

    setLoading(true);
    try {
      console.log('📤 Préparation des données...');
      // Préparer toutes les données d'inscription pour le backend
      const registrationData = {
        // Étape 1 - Informations de base
        name: step1Data.name,
        category: step1Data.type,
        cuisine_type: step1Data.cuisineCategory,
        phone: step1Data.phone,
        email: step1Data.email,
        description: step1Data.description,
        
        // Étape 2 - Localisation
        address: step2Data.address,
        district: step2Data.neighborhood,
        landmark: step2Data.landmark,
        latitude: step2Data.latitude,
        longitude: step2Data.longitude,
        delivery_radius: step2Data.deliveryRadius || 5,
        
        // Étape 3 - Horaires
        opening_hours: step3Data,
        
        // Étape 4 - Documents (images)
        document_rccm: step4Data.rccm,
        id_card_front: step4Data.id_card_front || step4Data.id,
        id_card_back: step4Data.id_card_back,
        document_facade: step4Data.facade,
        document_menu: step4Data.menu,
        document_hygiene: step4Data.hygiene,
        
        // Étape 5 - Mot de passe et finances
        password: step5Data.password,
        mobile_money_number: step5Data.accountNumber,
        mobile_money_provider: step5Data.mobileMoneyProvider,
        account_holder_name: step5Data.accountHolderName,
        bank_rib: step5Data.bankRIB,
        
        // Étape 6 - Médias
        logo: media.logo,
        banner: media.banner,
        photos: media.restaurant,
        dish_photos: media.dishes,
      };

      const response = await restaurantAuth.register(registrationData);
      
      // Le backend retourne { success: true, message: "...", data: { restaurant: {...} } }
      if (response.success !== false) {
        Toast.show({
          type: 'success',
          text1: 'Inscription soumise',
          text2: response.message || 'Votre demande est en cours d\'examen',
        });

        navigation.navigate('PendingValidation');
      }
    } catch (error) {
      const errorMessage = error.error?.message || error.message || 'Erreur lors de la soumission';
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
          <Text style={styles.title}>Médias</Text>
          <Text style={styles.stepText}>Étape 6 sur 6</Text>
        </View>

        <View style={styles.form}>
          {MEDIA_TYPES.map((type) => {
            const currentMedia = type.multiple ? (media[type.id] || []) : media[type.id];
            const hasError = !!errors[type.id];

            return (
              <View key={type.id} style={styles.mediaContainer}>
                <View style={styles.mediaHeader}>
                  <Text style={styles.mediaLabel}>
                    {type.label} {type.required && '*'}
                  </Text>
                  {type.minSize && (
                    <Text style={styles.mediaSize}>Min: {type.minSize}</Text>
                  )}
                </View>

                {type.multiple ? (
                  <View style={styles.multipleContainer}>
                    {currentMedia.map((item, index) => (
                      <View key={`media-${type.id}-${item.uri || index}`} style={styles.mediaPreview}>
                        <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removeMedia(type.id, index)}
                        >
                          <Ionicons name="close-circle" size={20} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {(!type.max || currentMedia.length < type.max) ? (
                      <TouchableOpacity
                        style={[styles.uploadButton, hasError && styles.uploadButtonError]}
                        onPress={() => pickImage(type.id, true)}
                      >
                        <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
                        <Text style={styles.uploadButtonText}>Ajouter</Text>
                      </TouchableOpacity>
                    ) : null}
                    {type.min ? (
                      <Text style={styles.mediaCount}>
                        {currentMedia.length} / {type.min} minimum
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <>
                    {currentMedia ? (
                      <View style={styles.mediaPreview}>
                        <Image source={{ uri: currentMedia.uri }} style={styles.mediaImage} />
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removeMedia(type.id)}
                        >
                          <Ionicons name="close-circle" size={20} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.uploadButton, hasError && styles.uploadButtonError]}
                        onPress={() => pickImage(type.id)}
                      >
                        <Ionicons name="cloud-upload-outline" size={24} color={COLORS.primary} />
                        <Text style={styles.uploadButtonText}>Télécharger</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {hasError ? <Text style={styles.errorText}>{errors[type.id]}</Text> : null}
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Soumission...' : 'Soumettre le dossier'}
            </Text>
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
    marginBottom: 32,
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
    color: COLORS.textSecondary,
  },
  form: {
    flex: 1,
  },
  mediaContainer: {
    marginBottom: 24,
  },
  mediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mediaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  mediaSize: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  uploadButton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonError: {
    borderColor: COLORS.error,
  },
  uploadButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  mediaPreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  mediaImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  multipleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
    width: '100%',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    marginTop: 24,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

RegisterStep6Screen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
    goBack: PropTypes.func.isRequired,
  }).isRequired,
  route: PropTypes.shape({
    params: PropTypes.shape({
      step1Data: PropTypes.object,
      step2Data: PropTypes.object,
      step3Data: PropTypes.object,
      step4Data: PropTypes.object,
      step5Data: PropTypes.object,
    }),
  }).isRequired,
};

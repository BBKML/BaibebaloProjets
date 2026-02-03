import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput,
  TouchableOpacity, 
  StatusBar,
  ScrollView,
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';

export default function PersonalInfoStep2Screen({ navigation }) {
  const { updateRegistrationData, registrationData } = useAuthStore();
  const [profilePhoto, setProfilePhoto] = useState(registrationData.profilePhoto || null);
  const [address, setAddress] = useState(registrationData.address || '');
  const [quartier, setQuartier] = useState(registrationData.quartier || '');
  const [city, setCity] = useState(registrationData.city || 'Korhogo');
  const scrollRef = useRef(null);
  const quartierInputRef = useRef(null);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission refusée', 'Veuillez autoriser l\'accès à la galerie');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission refusée', 'Veuillez autoriser l\'accès à la caméra');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Photo de profil',
      'Choisissez une option',
      [
        { text: 'Prendre une photo', onPress: takePhoto },
        { text: 'Choisir dans la galerie', onPress: pickImage },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const isValidForm = () => {
    return profilePhoto && address.trim() && quartier.trim() && city.trim();
  };

  const handleContinue = async () => {
    if (!isValidForm()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs et ajouter une photo');
      return;
    }

    await updateRegistrationData({
      profilePhoto,
      address,
      quartier,
      city,
    });

    navigation.navigate('VehicleSelection');
  };

  const scrollToInput = (yOffset) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: yOffset, animated: true });
    }, 150);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>
        
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.stepIndicator}>Étape 1/5</Text>
        <Text style={styles.title}>Photo et adresse</Text>
        <Text style={styles.subtitle}>
          Ajoutez une photo de profil claire et votre adresse de résidence
        </Text>

        {/* Profile Photo */}
        <View style={styles.photoSection}>
          <TouchableOpacity style={styles.photoContainer} onPress={showImageOptions}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={40} color={COLORS.primary} />
                <Text style={styles.photoPlaceholderText}>Ajouter une photo</Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse de résidence *</Text>
            <TextInput
              style={styles.input}
              placeholder="Rue, numéro, immeuble..."
              placeholderTextColor={COLORS.textLight}
              value={address}
              onChangeText={setAddress}
            />
          </View>

          {/* Quartier */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quartier *</Text>
            <TextInput
              style={styles.input}
              placeholder="Votre quartier"
              placeholderTextColor={COLORS.textLight}
              value={quartier}
              onChangeText={setQuartier}
              onFocus={() => scrollToInput(320)}
            />
          </View>

          {/* City */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ville *</Text>
            <TextInput
              style={styles.input}
              placeholder="Votre ville"
              placeholderTextColor={COLORS.textLight}
              value={city}
              onChangeText={setCity}
              onFocus={() => scrollToInput(400)}
            />
          </View>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[
            styles.primaryButton,
            !isValidForm() && styles.primaryButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!isValidForm()}
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
  scrollView: {
    flex: 1,
  },
  keyboardView: {
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
    marginBottom: 32,
    lineHeight: 20,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  photoContainer: {
    position: 'relative',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary + '15',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
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

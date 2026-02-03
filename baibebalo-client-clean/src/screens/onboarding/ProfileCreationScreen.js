import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import { updateMyProfile, uploadProfilePicture } from '../../api/users';
import useAuthStore from '../../store/authStore';
import { normalizeUploadUrl } from '../../utils/url';

export default function ProfileCreationScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user, setUser, completeProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    first_name: route?.params?.first_name || '',
    last_name: route?.params?.last_name || '',
    email: route?.params?.email || '',
    gender: 'male',
    date_of_birth: '',
  });
  const [profileImage, setProfileImage] = useState(null);

  const requestImagePermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Nous avons besoin de l\'accès à vos photos');
      }
    }
  };

  React.useEffect(() => {
    requestImagePermission();
  }, []);

  const getMimeTypeFromUri = (uri) => {
    if (!uri) return 'image/jpeg';
    const extension = uri.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'gif':
        return 'image/gif';
      case 'jpg':
      case 'jpeg':
      default:
        return 'image/jpeg';
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Nous avons besoin de l\'accès à vos photos');
        return;
      }

      const mediaTypeImages =
        ImagePicker.MediaType?.Images ?? ImagePicker.MediaTypeOptions?.Images;
      const result = await ImagePicker.launchImageLibraryAsync({
        ...(mediaTypeImages ? { mediaTypes: mediaTypeImages } : {}),
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        setProfileImage(asset.uri);

        const formData = new FormData();
        formData.append('profile_picture', {
          uri: asset.uri,
          name: asset.fileName || `profile-${Date.now()}.jpg`,
          type: asset.mimeType || getMimeTypeFromUri(asset.uri),
        });

        const uploadResponse = await uploadProfilePicture(formData);
        const uploadedUrl =
          uploadResponse?.data?.profile_picture
          || uploadResponse?.data?.user?.profile_picture
          || uploadResponse?.profile_picture;
        if (uploadedUrl) {
          setProfileImage(normalizeUploadUrl(uploadedUrl));
        }
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const normalizeGenderForApi = (gender) => {
    if (!gender) return null;
    const normalized = gender.toLowerCase();
    const map = { m: 'male', f: 'female', o: 'other' };
    return map[normalized] || normalized;
  };

  const normalizeDateForApi = (date) => {
    if (!date) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
      const [day, month, year] = date.split('/');
      return `${year}-${month}-${day}`;
    }
    return date;
  };

  const handleSave = async () => {
    if (!profile.first_name.trim() || !profile.last_name.trim()) {
      Alert.alert('Erreur', 'Le nom et le prénom sont obligatoires');
      return;
    }

    setLoading(true);
    try {
      // Construire le nom complet
      const fullName = `${profile.first_name} ${profile.last_name}`.trim();
      
      const profileData = {
        first_name: profile.first_name.trim(),
        last_name: profile.last_name.trim(),
        email: profile.email || null,
        gender: normalizeGenderForApi(profile.gender),
        date_of_birth: normalizeDateForApi(profile.date_of_birth),
      };

      const updatedUser = await updateMyProfile(profileData);
      
      // Mettre à jour l'utilisateur dans le store et persister (isNewUser: false)
      if (user) {
        const userData = updatedUser?.data?.user ?? updatedUser?.data ?? updatedUser ?? profileData;
        await completeProfile({
          ...userData,
          first_name: profile.first_name,
          last_name: profile.last_name,
          full_name: fullName,
        });
      }

      // Navigation vers l'écran principal
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (error) {
      Alert.alert(
        'Erreur',
        error.response?.data?.error?.message || 'Erreur lors de la sauvegarde'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Contenu */}
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Parlez-nous de vous</Text>
          <Text style={styles.subtitle}>
            Complétez vos informations pour commencer à utiliser BAIBEBALO.
          </Text>
        </View>

        {/* Photo de profil */}
        <View style={styles.profilePhotoSection}>
          <View style={styles.profileImageContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={64} color={COLORS.textSecondary} />
              </View>
            )}
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={pickImage}
            >
              <Ionicons name="camera" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={pickImage}>
            <Text style={styles.addPhotoText}>Ajouter une photo</Text>
          </TouchableOpacity>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          {/* Nom */}
          <View style={styles.field}>
            <Text style={styles.label}>Nom (Obligatoire)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Coulibaly"
              placeholderTextColor={COLORS.textLight}
              value={profile.last_name}
              onChangeText={(text) => setProfile({ ...profile, last_name: text })}
            />
          </View>

          {/* Prénom */}
          <View style={styles.field}>
            <Text style={styles.label}>Prénom (Obligatoire)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Jean-Marc"
              placeholderTextColor={COLORS.textLight}
              value={profile.first_name}
              onChangeText={(text) => setProfile({ ...profile, first_name: text })}
            />
          </View>

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Email (Optionnel)</Text>
            <TextInput
              style={styles.input}
              placeholder="votre@email.com"
              placeholderTextColor={COLORS.textLight}
              value={profile.email}
              onChangeText={(text) => setProfile({ ...profile, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Genre */}
          <View style={styles.field}>
            <Text style={styles.label}>Genre</Text>
            <View style={styles.genderContainer}>
              {[
                { value: 'male', label: 'Homme' },
                { value: 'female', label: 'Femme' },
                { value: 'other', label: 'Autre' },
              ].map((gender) => (
                <TouchableOpacity
                  key={gender.value}
                  style={[
                    styles.genderButton,
                    profile.gender === gender.value && styles.genderButtonActive,
                  ]}
                  onPress={() => setProfile({ ...profile, gender: gender.value })}
                >
                  <Text
                    style={[
                      styles.genderText,
                      profile.gender === gender.value && styles.genderTextActive,
                    ]}
                  >
                    {gender.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date de naissance */}
          <View style={styles.field}>
            <Text style={styles.label}>Date de naissance</Text>
            <TextInput
              style={styles.input}
              placeholder="JJ/MM/AAAA ou AAAA-MM-JJ"
              placeholderTextColor={COLORS.textLight}
              value={profile.date_of_birth}
              onChangeText={(text) => setProfile({ ...profile, date_of_birth: text })}
            />
          </View>
        </View>

        <View style={styles.pattern} />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Enregistrement...' : 'Terminer'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
  },
  backButton: {
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 140, // Espace pour les boutons + safe area
  },
  headerSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  profilePhotoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: COLORS.border,
  },
  profileImagePlaceholder: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  form: {
    gap: 24,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    paddingLeft: 4,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  genderButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  genderTextActive: {
    color: COLORS.white,
  },
  pattern: {
    height: 80,
    marginTop: 24,
    backgroundColor: COLORS.primary + '08',
    borderRadius: 16,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 24,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
});

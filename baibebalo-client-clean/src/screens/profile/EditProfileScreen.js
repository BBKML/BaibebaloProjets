import React, { useState, useEffect } from 'react';
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
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import { getMyProfile, updateMyProfile, uploadProfilePicture } from '../../api/users';
import { normalizeUploadUrl } from '../../utils/url';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAuthStore from '../../store/authStore';

export default function EditProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    full_name: '',
    email: '',
    phone_number: '',
    gender: 'male',
    date_of_birth: '',
  });
  const [profileImage, setProfileImage] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadProfile();
    requestImagePermission();
  }, []);

  const requestImagePermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Nous avons besoin de l\'accès à vos photos');
      }
    }
  };

  const normalizeGenderFromApi = (gender) => {
    if (!gender) return 'male';
    const normalized = gender.toLowerCase();
    const map = { m: 'male', f: 'female', o: 'other' };
    return map[normalized] || normalized;
  };

  const normalizeGenderForApi = (gender) => {
    if (!gender) return null;
    const normalized = gender.toLowerCase();
    const map = { m: 'male', f: 'female', o: 'other' };
    return map[normalized] || normalized;
  };

  const normalizeDateForApi = (date) => {
    if (date == null || (typeof date === 'string' && date.trim() === '')) return null;
    const d = String(date).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
      const [day, month, year] = d.split('/');
      return `${year}-${month}-${day}`;
    }
    return null;
  };

  const formatDateForDisplay = (value) => {
    if (!value) return '';
    const strValue = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(strValue)) {
      return strValue.slice(0, 10);
    }
    if (/^\d{2}\/\d{2}\/\d{4}/.test(strValue)) {
      return strValue.slice(0, 10);
    }
    return strValue;
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await getMyProfile();
      const userData = response.data?.data?.user || response.data?.user || response.data || {};
      const fullName = userData.full_name 
        || [userData.first_name, userData.last_name].filter(Boolean).join(' ').trim();
      setProfile({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        full_name: fullName || '',
        email: userData.email || '',
        phone_number: userData.phone_number || userData.phone || '',
        gender: normalizeGenderFromApi(userData.gender),
        date_of_birth: formatDateForDisplay(userData.date_of_birth),
      });
      if (userData.profile_picture || userData.profile_image_url) {
        setProfileImage(
          normalizeUploadUrl(userData.profile_picture || userData.profile_image_url)
        );
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
    } finally {
      setLoading(false);
    }
  };

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

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        setProfileImage(asset.uri);
        setUploadingPhoto(true);
        try {
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
            setProfileImage(uploadedUrl);
            // Mettre à jour le store + AsyncStorage immédiatement
            const updatedUser = { ...(user || {}), profile_picture: uploadedUrl };
            setUser(updatedUser);
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

            // Recharger le profil depuis l'API pour mettre à jour le cache de ProfileScreen
            try {
              const freshResponse = await getMyProfile();
              const freshUser = freshResponse?.data?.data?.user || freshResponse?.data?.user || freshResponse?.data;
              if (freshUser?.id) {
                const merged = { ...updatedUser, ...freshUser, profile_picture: uploadedUrl };
                setUser(merged);
                await AsyncStorage.setItem('user', JSON.stringify(merged));
              }
            } catch (_) {
              // Si l'API échoue, l'URL dans le store suffit
            }
          }
        } catch (uploadError) {
          Alert.alert('Erreur upload', uploadError?.message || 'Impossible d\'envoyer la photo');
        } finally {
          setUploadingPhoto(false);
        }
      }
    } catch (error) {
      Alert.alert('Erreur', error?.message || 'Impossible de sélectionner l\'image');
    }
  };

  const splitFullName = (fullName, fallbackFirst, fallbackLast) => {
    if (!fullName || !fullName.trim()) {
      return {
        first_name: fallbackFirst || '',
        last_name: fallbackLast || '',
      };
    }
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return { first_name: parts[0], last_name: '' };
    }
    return {
      first_name: parts[0],
      last_name: parts.slice(1).join(' '),
    };
  };

  const handleSave = async () => {
    if (!profile.full_name.trim()) {
      Alert.alert('Erreur', 'Le nom est requis');
      return;
    }

    setSaving(true);
    try {
      const { first_name, last_name } = splitFullName(
        profile.full_name,
        profile.first_name,
        profile.last_name
      );
      const profileData = {
        first_name,
        last_name,
        email: profile.email,
        gender: normalizeGenderForApi(profile.gender),
        date_of_birth: normalizeDateForApi(profile.date_of_birth),
      };
      await updateMyProfile(profileData);
      Alert.alert('Succès', 'Profil mis à jour', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert(
        'Erreur',
        error.response?.data?.error?.message || 'Erreur lors de la mise à jour'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <ScrollView keyboardShouldPersistTaps="handled">
      {/* Profile Image */}
      <View style={styles.imageSection}>
        <View style={styles.imageContainer}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Ionicons name="person" size={48} color={COLORS.textSecondary} />
            </View>
          )}
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={uploadingPhoto ? undefined : pickImage}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="camera" size={20} color={COLORS.white} />
            )}
          </TouchableOpacity>
          {uploadingPhoto && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.white} />
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.changePhotoButton} onPress={uploadingPhoto ? undefined : pickImage} disabled={uploadingPhoto}>
          <Text style={styles.changePhotoText}>
            {uploadingPhoto ? 'Envoi en cours...' : 'Changer la photo'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Form Fields */}
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Nom</Text>
          <TextInput
            style={styles.input}
            placeholder="Votre nom"
            value={profile.full_name}
            onChangeText={(text) => setProfile({ ...profile, full_name: text })}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="votre@email.com"
            value={profile.email}
            onChangeText={(text) => setProfile({ ...profile, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Téléphone</Text>
          <TextInput
            style={styles.input}
            placeholder="07 XX XX XX XX"
            value={profile.phone_number}
            onChangeText={(text) => setProfile({ ...profile, phone_number: text })}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Genre</Text>
          <View style={styles.genderContainer}>
            {['male', 'female', 'other'].map((gender) => (
              <TouchableOpacity
                key={gender}
                style={[
                  styles.genderButton,
                  profile.gender === gender && styles.genderButtonActive,
                ]}
                onPress={() => setProfile({ ...profile, gender })}
              >
                <Text
                  style={[
                    styles.genderText,
                    profile.gender === gender && styles.genderTextActive,
                  ]}
                >
                  {gender === 'male' ? 'Homme' : gender === 'female' ? 'Femme' : 'Autre'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Date de naissance</Text>
          <TextInput
            style={styles.input}
            placeholder="JJ/MM/AAAA ou AAAA-MM-JJ"
            value={profile.date_of_birth}
            onChangeText={(text) => setProfile({ ...profile, date_of_birth: text })}
          />
        </View>
      </View>

      {/* Save Button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 32) }]}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  imageSection: {
    alignItems: 'center',
    padding: 32,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: COLORS.border,
  },
  profileImagePlaceholder: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 64,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
  },
  changePhotoText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
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
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

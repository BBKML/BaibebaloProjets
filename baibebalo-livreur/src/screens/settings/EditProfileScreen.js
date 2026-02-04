import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  Image,
  ActionSheetIOS,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import { getProfile, updateProfile } from '../../api/delivery';
import { getImageUrl } from '../../utils/url';
import apiClient from '../../api/client';

export default function EditProfileScreen({ navigation }) {
  const { user, updateUser } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [vehicleType, setVehicleType] = useState(user?.vehicle_type || 'moto');
  const [vehiclePlate, setVehiclePlate] = useState(user?.vehicle_plate || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.profile_photo || null);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await getProfile();
      if (response?.success && response?.data?.delivery_person) {
        const profile = response.data.delivery_person;
        setFirstName(profile.first_name || '');
        setLastName(profile.last_name || '');
        setVehicleType(profile.vehicle_type || 'moto');
        setVehiclePlate(profile.vehicle_plate || '');
        if (profile.profile_photo) {
          setProfilePhoto(profile.profile_photo);
        }
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePhoto = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuler', 'Prendre une photo', 'Choisir dans la galerie'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            takePhoto();
          } else if (buttonIndex === 2) {
            pickImage();
          }
        }
      );
    } else {
      Alert.alert(
        'Changer la photo',
        'Choisissez une option',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Prendre une photo', onPress: takePhoto },
          { text: 'Choisir dans la galerie', onPress: pickImage },
        ]
      );
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de la permission pour utiliser la caméra');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadPhoto(result.assets[0]);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de la permission pour accéder à vos photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      uploadPhoto(result.assets[0]);
    }
  };

  const uploadPhoto = async (imageAsset) => {
    setUploadingPhoto(true);
    try {
      // Créer FormData pour l'upload
      const formData = new FormData();
      const filename = imageAsset.uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: imageAsset.uri,
        name: filename || 'profile.jpg',
        type,
      });
      formData.append('document_type', 'profile_photo');

      // Upload vers le serveur
      const response = await apiClient.post('/delivery/upload-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.success && response.data?.data?.url) {
        const photoUrl = response.data.data.url;
        setProfilePhoto(photoUrl);
        await updateUser({ profile_photo: photoUrl });
        Alert.alert('Succès', 'Photo de profil mise à jour');
      } else {
        // Utiliser l'URI locale comme fallback
        setProfilePhoto(imageAsset.uri);
        await updateUser({ profile_photo: imageAsset.uri });
        Alert.alert('Info', 'Photo sauvegardée localement');
      }
    } catch (error) {
      console.error('Erreur upload photo:', error);
      // Utiliser l'URI locale comme fallback
      setProfilePhoto(imageAsset.uri);
      await updateUser({ profile_photo: imageAsset.uri });
      Alert.alert('Info', 'Photo sauvegardée localement. Elle sera synchronisée plus tard.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Erreur', 'Le prénom et le nom sont requis');
      return;
    }

    setLoading(true);
    try {
      // Appeler l'API backend pour mettre à jour le profil
      const response = await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        vehicle_type: vehicleType,
        vehicle_plate: vehiclePlate.trim() || null,
      });

      if (response?.success) {
        // Mettre à jour le store local
        await updateUser({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          vehicle_type: vehicleType,
          vehicle_plate: vehiclePlate.trim() || null,
        });
        Alert.alert('Succès', 'Profil mis à jour avec succès');
        navigation.goBack();
      } else {
        Alert.alert('Erreur', response?.error?.message || 'Impossible de mettre à jour le profil');
      }
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      Alert.alert('Erreur', error.response?.data?.error?.message || 'Impossible de mettre à jour le profil');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Modifier le profil</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Photo de profil */}
        <View style={styles.photoSection}>
          <TouchableOpacity style={styles.photoContainer} onPress={handleChangePhoto} disabled={uploadingPhoto}>
            {uploadingPhoto ? (
              <ActivityIndicator size="large" color={COLORS.primary} />
            ) : profilePhoto ? (
              <Image source={{ uri: getImageUrl(profilePhoto) || profilePhoto }} style={styles.photo} />
            ) : (
              <Ionicons name="person" size={48} color={COLORS.primary} />
            )}
            {!uploadingPhoto && (
              <View style={styles.cameraOverlay}>
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.changePhotoButton, uploadingPhoto && styles.changePhotoButtonDisabled]} 
            onPress={handleChangePhoto}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? (
              <>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.changePhotoText}>Téléchargement...</Text>
              </>
            ) : (
              <>
                <Ionicons name="camera" size={16} color={COLORS.primary} />
                <Text style={styles.changePhotoText}>Changer la photo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          {/* Prénom */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prénom</Text>
            <TextInput
              style={styles.input}
              placeholder="Votre prénom"
              placeholderTextColor={COLORS.textLight}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
          </View>

          {/* Nom */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom</Text>
            <TextInput
              style={styles.input}
              placeholder="Votre nom"
              placeholderTextColor={COLORS.textLight}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
          </View>

          {/* Téléphone (non modifiable) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone</Text>
            <View style={styles.disabledInput}>
              <Ionicons name="call" size={18} color={COLORS.textSecondary} />
              <Text style={styles.disabledText}>{user?.phone || '+225 XX XX XX XX'}</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              </View>
            </View>
            <Text style={styles.hint}>Le numéro de téléphone ne peut pas être modifié</Text>
          </View>

          {/* Type de véhicule */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Type de véhicule</Text>
            <View style={styles.vehicleOptions}>
              {[
                { value: 'moto', label: 'Moto', icon: 'bicycle' },
                { value: 'bike', label: 'Vélo', icon: 'walk' },
                { value: 'foot', label: 'À pied', icon: 'footsteps' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.vehicleOption,
                    vehicleType === option.value && styles.vehicleOptionActive
                  ]}
                  onPress={() => setVehicleType(option.value)}
                >
                  <Ionicons 
                    name={option.icon} 
                    size={24} 
                    color={vehicleType === option.value ? COLORS.primary : COLORS.textSecondary} 
                  />
                  <Text style={[
                    styles.vehicleOptionText,
                    vehicleType === option.value && styles.vehicleOptionTextActive
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Plaque d'immatriculation (si moto) */}
          {vehicleType === 'moto' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Plaque d'immatriculation</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: AB 1234 CD"
                placeholderTextColor={COLORS.textLight}
                value={vehiclePlate}
                onChangeText={setVehiclePlate}
                autoCapitalize="characters"
              />
            </View>
          )}

          {/* Info sécurité */}
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Votre compte est sécurisé par code SMS (OTP). Pour changer de numéro, contactez le support.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bouton Enregistrer */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>ENREGISTRER</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: COLORS.white, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  title: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: COLORS.text 
  },
  placeholder: { 
    width: 40 
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 20,
  },
  changePhotoButtonDisabled: {
    opacity: 0.7,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
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
  disabledInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  disabledText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B98115',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.primary,
    lineHeight: 18,
  },
  bottomContainer: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  vehicleOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  vehicleOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  vehicleOptionText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  vehicleOptionTextActive: {
    color: COLORS.primary,
  },
});

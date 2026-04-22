import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import { restaurantApi } from '../../api/restaurant';
import useAuthStore from '../../store/authStore';
import { getImageUrl } from '../../utils/url';

export default function EditRestaurantProfileScreen({ navigation }) {
  const { restaurant, updateRestaurant } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    neighborhood: '',
    deliveryRadius: 15,
  });
  const [logo, setLogo] = useState(null);
  const [banner, setBanner] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        description: restaurant.description || '',
        phone: restaurant.phone || '',
        email: restaurant.email || '',
        address: restaurant.address || '',
        neighborhood: restaurant.neighborhood || restaurant.district || '',
        deliveryRadius: restaurant.deliveryRadius || restaurant.delivery_radius || 15,
      });
      // Charger les images existantes (comme objets avec uri pour affichage)
      if (restaurant.logo) {
        setLogo({ uri: restaurant.logo, isExisting: true });
      }
      if (restaurant.banner) {
        setBanner({ uri: restaurant.banner, isExisting: true });
      }
      if (restaurant.photos && Array.isArray(restaurant.photos)) {
        setPhotos(restaurant.photos.map(photo => ({ uri: photo, isExisting: true })));
      }
    }
  }, [restaurant]);

  const pickImage = async (type) => {
    console.log(`📷 pickImage appelé pour: ${type}`);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log(`🔐 Permission galerie: ${status}`);
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la galerie');
        return;
      }

      console.log(`🖼️ Ouverture ImagePicker pour ${type}...`);
      // Dans Expo SDK 54, mediaTypes doit être un tableau ['images']
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        aspect: type === 'banner' ? [16, 9] : [1, 1],
      });
      // Gérer les deux formats possibles (assets ou images selon la version)
      const assets = result.assets || result.images || [];
      
      console.log(`📸 Résultat ImagePicker pour ${type}:`, {
        canceled: result.canceled,
        hasAssets: !!(result.assets && result.assets.length > 0),
        hasImages: !!(result.images && result.images.length > 0),
        assetsCount: result.assets?.length || 0,
        imagesCount: result.images?.length || 0,
        assetsLength: assets.length,
        firstAsset: assets[0] ? {
          hasUri: !!assets[0].uri,
          uri: assets[0].uri?.substring(0, 50) + '...',
          hasMimeType: !!assets[0].mimeType,
          mimeType: assets[0].mimeType,
          hasType: !!assets[0].type,
          type: assets[0].type,
          keys: Object.keys(assets[0] || {}),
        } : null,
        resultKeys: Object.keys(result || {}),
      });
      
      if (result.canceled) {
        console.log(`❌ Sélection annulée pour ${type}`);
        return;
      }
      
      if (!assets || assets.length === 0) {
        console.error(`❌ Aucun asset trouvé pour ${type}`, { result });
        Alert.alert('Erreur', 'Aucune image sélectionnée');
        return;
      }
      
      if (!assets[0]) {
        console.error(`❌ Premier asset invalide pour ${type}`, { assets });
        Alert.alert('Erreur', 'Image invalide');
        return;
      }
      
      const asset = assets[0];
      const imageUri = asset.uri || asset;
      
      // Vérifier que l'URI est valide
      if (!imageUri) {
        console.error(`❌ URI manquante pour ${type}`, { asset });
        Alert.alert('Erreur', 'Impossible de récupérer l\'URI de l\'image');
        return;
      }
      
      const imageData = {
        uri: imageUri,
        type: asset.mimeType || asset.type || 'image/jpeg',
        name: `${type}_${Date.now()}.jpg`,
        isExisting: false, // Marquer comme nouvelle image
      };
      
      console.log(`✅ Image sélectionnée (${type}):`, {
        uri: imageUri.substring(0, 100) + '...',
        type: imageData.type,
        name: imageData.name,
        uriStartsWith: imageUri.substring(0, 20),
        hasUri: !!imageUri,
        fullUri: imageUri, // Log complet pour debug
      });

      if (type === 'logo') {
        setLogo(imageData);
        console.log('✅ Logo défini dans le state');
      } else if (type === 'banner') {
        setBanner(imageData);
        console.log('✅ Banner défini dans le state');
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la sélection d'image (${type}):`, error);
      console.error('❌ Stack trace:', error.stack);
      const errorMessage = error instanceof Error ? error.message : 'Impossible de sélectionner l\'image';
      Alert.alert('Erreur', errorMessage);
    }
  };

  const pickPhotos = async () => {
    console.log('📸 pickPhotos appelé');
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log(`🔐 Permission galerie: ${status}`);
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la galerie');
        return;
      }

      console.log('🖼️ Ouverture ImagePicker pour photos multiples...');
      // Dans Expo SDK 54, mediaTypes doit être un tableau ['images']
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        allowsMultipleSelection: true,
      });
      console.log('📸 Résultat ImagePicker pour photos:', {
        canceled: result.canceled,
        hasAssets: !!(result.assets && result.assets.length > 0),
        hasImages: !!(result.images && result.images.length > 0),
        assetsCount: result.assets?.length || 0,
        imagesCount: result.images?.length || 0,
      });

      // Gérer les deux formats possibles (assets ou images selon la version)
      const assets = result.assets || result.images || [];
      
      console.log('📸 Résultat ImagePicker pour photos:', {
        canceled: result.canceled,
        hasAssets: !!(result.assets && result.assets.length > 0),
        hasImages: !!(result.images && result.images.length > 0),
        assetsCount: result.assets?.length || 0,
        imagesCount: result.images?.length || 0,
        assetsLength: assets.length,
      });
      
      if (result.canceled) {
        console.log('❌ Sélection de photos annulée');
        return;
      }
      
      if (!assets || assets.length === 0) {
        console.error('❌ Aucun asset trouvé pour photos', { result });
        Alert.alert('Erreur', 'Aucune photo sélectionnée');
        return;
      }
      
      const newPhotos = assets.map((asset, index) => {
        const imageUri = asset.uri || asset;
        if (!imageUri) {
          console.warn(`⚠️ Photo[${index}] sans URI, ignorée`, { asset });
          return null;
        }
        return {
          uri: imageUri,
          type: asset.mimeType || asset.type || 'image/jpeg',
          name: `photo_${Date.now()}_${index}.jpg`,
          isExisting: false, // Marquer comme nouvelles photos
        };
      }).filter(Boolean); // Filtrer les photos invalides
      
      if (newPhotos.length === 0) {
        console.error('❌ Aucune photo valide après filtrage', { assets });
        Alert.alert('Erreur', 'Aucune photo valide sélectionnée');
        return;
      }
      
      console.log(`✅ ${newPhotos.length} photo(s) sélectionnée(s):`, newPhotos.map((p, i) => ({
        index: i,
        uri: p.uri.substring(0, 100) + '...',
        type: p.type,
        name: p.name,
        fullUri: p.uri, // Log complet pour debug
      })));
      
      setPhotos([...photos, ...newPhotos]);
      console.log(`✅ ${newPhotos.length} photo(s) ajoutée(s) au state. Total: ${photos.length + newPhotos.length}`);
    } catch (error) {
      console.error('❌ Erreur lors de la sélection de photos:', error);
      console.error('❌ Stack trace:', error.stack);
      const errorMessage = error instanceof Error ? error.message : 'Impossible de sélectionner les photos';
      Alert.alert('Erreur', errorMessage);
    }
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    console.log('💾 handleSave appelé - Début de la sauvegarde');
    console.log('📊 État actuel:', {
      hasLogo: !!logo,
      logoIsNew: !!(logo && !logo.isExisting),
      hasBanner: !!banner,
      bannerIsNew: !!(banner && !banner.isExisting),
      photosCount: photos.length,
      newPhotosCount: photos.filter(p => !p.isExisting).length,
    });
    setLoading(true);
    try {
      const updateData = {
        name: formData.name,
        description: formData.description,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        district: formData.neighborhood,
        delivery_radius: formData.deliveryRadius,
      };

      // Ajouter les images seulement si elles sont nouvelles (pas isExisting)
      // Les images existantes seront préservées côté backend
      if (logo) {
        if (!logo.isExisting && logo.uri) {
          // Nouvelle image à uploader
          updateData.logo = logo;
          console.log('📷 Logo: Nouvelle image à uploader', { uri: logo.uri?.substring(0, 50) + '...', type: logo.type, name: logo.name });
        } else if (logo.uri) {
          // Garder l'URL existante pour que le backend la préserve
          updateData.logo = logo.uri;
          console.log('📷 Logo: URL existante préservée', logo.uri?.substring(0, 50) + '...');
        }
      }
      
      if (banner) {
        if (!banner.isExisting && banner.uri) {
          // Nouvelle image à uploader
          updateData.banner = banner;
          console.log('🖼️ Banner: Nouvelle image à uploader', { uri: banner.uri?.substring(0, 50) + '...', type: banner.type, name: banner.name });
        } else if (banner.uri) {
          // Garder l'URL existante
          updateData.banner = banner.uri;
          console.log('🖼️ Banner: URL existante préservée', banner.uri?.substring(0, 50) + '...');
        }
      }
      
      // Pour les photos, séparer les nouvelles des existantes
      if (photos.length > 0) {
        const newPhotos = photos.filter(p => !p.isExisting && p.uri);
        const existingPhotos = photos.filter(p => p.isExisting && p.uri).map(p => p.uri);
        if (newPhotos.length > 0) {
          updateData.photos = newPhotos;
          console.log('📸 Photos: Nouvelles images à uploader', newPhotos.length, newPhotos.map(p => ({ uri: p.uri?.substring(0, 50) + '...', type: p.type, name: p.name })));
        }
        if (existingPhotos.length > 0) {
          updateData.existingPhotos = existingPhotos;
          console.log('📸 Photos: URLs existantes préservées', existingPhotos.length, existingPhotos);
        }
      }
      
      console.log('📤 Données complètes à envoyer:', {
        hasLogo: !!updateData.logo,
        logoIsNew: !!(updateData.logo && typeof updateData.logo === 'object' && updateData.logo.uri && !updateData.logo.isExisting),
        logoIsString: typeof updateData.logo === 'string',
        logoUri: updateData.logo && typeof updateData.logo === 'object' ? updateData.logo.uri?.substring(0, 50) + '...' : updateData.logo,
        hasBanner: !!updateData.banner,
        bannerIsNew: !!(updateData.banner && typeof updateData.banner === 'object' && updateData.banner.uri && !updateData.banner.isExisting),
        bannerIsString: typeof updateData.banner === 'string',
        bannerUri: updateData.banner && typeof updateData.banner === 'object' ? updateData.banner.uri?.substring(0, 50) + '...' : updateData.banner,
        newPhotosCount: updateData.photos ? updateData.photos.length : 0,
        existingPhotosCount: updateData.existingPhotos ? updateData.existingPhotos.length : 0,
        allKeys: Object.keys(updateData),
      });
      
      console.log('🚀 Appel API updateProfile...');
      const response = await restaurantApi.updateProfile(updateData);
      console.log('✅ Réponse API updateProfile:', {
        success: response.success,
        hasData: !!response.data,
        hasRestaurant: !!response.data?.restaurant,
        restaurantKeys: response.data?.restaurant ? Object.keys(response.data.restaurant) : [],
      });
      
      // Le backend retourne { success: true, data: { restaurant: {...} } }
      const updatedRestaurant = response.data?.restaurant ?? response.restaurant;
      if (updatedRestaurant) {
        console.log('🔄 Mise à jour du store avec:', {
          id: updatedRestaurant.id,
          name: updatedRestaurant.name,
          hasLogo: !!updatedRestaurant.logo,
          hasBanner: !!updatedRestaurant.banner,
          photosCount: updatedRestaurant.photos ? (Array.isArray(updatedRestaurant.photos) ? updatedRestaurant.photos.length : 0) : 0,
        });
        updateRestaurant(updatedRestaurant);
      }
      
      Alert.alert('Succès', 'Profil modifié avec succès', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('❌ Erreur mise à jour profil:', error);
      console.error('❌ Détails erreur:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        stack: error.stack?.substring(0, 500),
      });
      const errorMessage = error.response?.data?.error?.message || error.error?.message || error.message || 'Impossible de modifier le profil';
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Modifier le profil</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom commercial *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nom du restaurant"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Description du restaurant"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={4}
            maxLength={150}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Téléphone *</Text>
          <TextInput
            style={styles.input}
            placeholder="+225 XX XX XX XX XX"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="contact@restaurant.com"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Adresse</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Adresse complète"
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Quartier</Text>
          <TextInput
            style={styles.input}
            placeholder="Quartier"
            value={formData.neighborhood}
            onChangeText={(text) => setFormData({ ...formData, neighborhood: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Rayon de livraison</Text>
          <View style={styles.radiusContainer}>
            <Text style={styles.radiusValue}>{formData.deliveryRadius} km</Text>
            <View style={styles.sliderContainer}>
              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => {
                  if (formData.deliveryRadius > 1) {
                    setFormData({ ...formData, deliveryRadius: formData.deliveryRadius - 1 });
                  }
                }}
              >
                <Ionicons name="remove" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <View style={styles.sliderTrack}>
                <View
                  style={[
                    styles.sliderFill,
                    { width: `${(formData.deliveryRadius / 20) * 100}%` },
                  ]}
                />
              </View>
              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => {
                  if (formData.deliveryRadius < 20) {
                    setFormData({ ...formData, deliveryRadius: formData.deliveryRadius + 1 });
                  }
                }}
              >
                <Ionicons name="add" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Logo */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Logo du restaurant</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('logo')}>
            {logo && logo.uri ? (
              <Image source={{ uri: logo.isExisting ? getImageUrl(logo.uri) : logo.uri }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera" size={32} color={COLORS.textSecondary} />
                <Text style={styles.imagePlaceholderText}>Ajouter un logo</Text>
              </View>
            )}
            <View style={styles.imageOverlay}>
              <Ionicons name="camera" size={20} color={COLORS.white} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Bannière */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Photo de bannière</Text>
          <TouchableOpacity style={styles.bannerPicker} onPress={() => pickImage('banner')}>
            {banner && banner.uri ? (
              <Image source={{ uri: banner.isExisting ? getImageUrl(banner.uri) : banner.uri }} style={styles.bannerPreview} />
            ) : (
              <View style={styles.bannerPlaceholder}>
                <Ionicons name="image" size={32} color={COLORS.textSecondary} />
                <Text style={styles.imagePlaceholderText}>Ajouter une bannière</Text>
              </View>
            )}
            <View style={styles.imageOverlay}>
              <Ionicons name="camera" size={20} color={COLORS.white} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Photos du restaurant */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Photos du restaurant</Text>
          <TouchableOpacity style={styles.addPhotoButton} onPress={pickPhotos}>
            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
            <Text style={styles.addPhotoText}>Ajouter des photos</Text>
          </TouchableOpacity>
          {photos.length > 0 && (
            <View style={styles.photosGrid}>
              {photos.map((photo, index) => (
                <View key={`photo-${photo.uri || photo.name || index}`} style={styles.photoItem}>
                  <Image source={{ uri: (photo.isExisting ? getImageUrl(photo.uri || photo) : (photo.uri || photo)) }} style={styles.photoPreview} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  inputGroup: {
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
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  radiusContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  radiusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderTrack: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  footer: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  imagePicker: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
  },
  bannerPicker: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerPreview: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    gap: 8,
    marginBottom: 12,
  },
  addPhotoText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
});

EditRestaurantProfileScreen.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
  }).isRequired,
};

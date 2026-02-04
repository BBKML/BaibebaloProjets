import React, { useState } from 'react';
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
import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import { restaurantMenu } from '../../api/menu';
import useRestaurantStore from '../../store/restaurantStore';
import { Picker } from '@react-native-picker/picker';
import { getImageUrl } from '../../utils/url';

const PREPARATION_TIMES = [10, 15, 20, 30, 45, 60];

const TAGS = [
  { id: 'spicy', label: 'Épicé', icon: 'flame' },
  { id: 'vegetarian', label: 'Végétarien', icon: 'leaf' },
  { id: 'meat', label: 'Viande', icon: 'restaurant' },
  { id: 'fish', label: 'Poisson', icon: 'fish' },
  { id: 'local', label: 'Spécialité locale', icon: 'home' },
  { id: 'fast', label: 'Préparation rapide', icon: 'flash' },
  { id: 'popular', label: 'Populaire', icon: 'star' },
  { id: 'new', label: 'Nouveau', icon: 'sparkles' },
];

export default function AddMenuItemScreen({ navigation, route }) {
  const { categoryId } = route.params || {};
  const { categories, addMenuItem } = useRestaurantStore();
  const [formData, setFormData] = useState({
    name: '',
    categoryId: categoryId || '',
    description: '',
    price: '',
    preparationTime: 20,
    mainImage: null,
    additionalImages: [],
    stockStatus: 'in_stock',
    stockQuantity: null,
    tags: [],
    keywords: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const pickImage = async (isMain = true) => {
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
        aspect: isMain ? [1, 1] : undefined,
      });

      // Gérer les deux formats possibles (assets ou images selon la version)
      const assets = result.assets || result.images || [];
      
      if (!result.canceled && assets && assets.length > 0) {
        if (isMain) {
          setFormData({ ...formData, mainImage: assets[0] });
        } else if (formData.additionalImages.length < 3) {
          setFormData({
            ...formData,
            additionalImages: [...formData.additionalImages, assets[0]],
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Impossible de sélectionner l\'image';
      Alert.alert('Erreur', errorMessage);
    }
  };

  const removeImage = (index) => {
    if (index === 'main') {
      setFormData({ ...formData, mainImage: null });
    } else {
      const newImages = formData.additionalImages.filter((_, i) => i !== index);
      setFormData({ ...formData, additionalImages: newImages });
    }
  };

  const toggleTag = (tagId) => {
    const newTags = formData.tags.includes(tagId)
      ? formData.tags.filter((id) => id !== tagId)
      : [...formData.tags, tagId];
    setFormData({ ...formData, tags: newTags });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Nom requis';
    if (!formData.categoryId) newErrors.categoryId = 'Catégorie requise';
    if (!formData.price || Number.parseFloat(formData.price) <= 0) {
      newErrors.price = 'Prix valide requis';
    }
    if (!formData.mainImage) newErrors.mainImage = 'Photo principale requise';
    if (formData.description.length > 250) {
      newErrors.description = 'Max 250 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const itemData = {
        name: formData.name,
        category_id: formData.categoryId,
        description: formData.description,
        price: Number.parseFloat(formData.price),
        preparation_time: formData.preparationTime,
        is_available: formData.stockStatus !== 'out_of_stock',
        tags: formData.tags,
      };
      
      // Ajouter stock_quantity seulement si le statut est 'limited' et qu'une valeur est fournie
      if (formData.stockStatus === 'limited' && formData.stockQuantity !== null && formData.stockQuantity !== undefined) {
        itemData.stock_quantity = Number.parseInt(formData.stockQuantity, 10);
      }
      
      // Ajouter la photo si présente
      if (formData.mainImage?.uri) {
        itemData.photo = {
          uri: formData.mainImage.uri,
          type: formData.mainImage.mimeType || formData.mainImage.type || 'image/jpeg',
          name: formData.mainImage.fileName || `menu_${Date.now()}.jpg`,
        };
      }
      
      const response = await restaurantMenu.createItem(itemData);
      // Le backend retourne { success: true, data: { menu_item: {...} } }
      const createdItem = response.data?.menu_item || response.menu_item || response.item;
      if (createdItem) {
        addMenuItem(createdItem);
        Alert.alert('Succès', 'Article créé avec succès', [
          { 
            text: 'Ajouter options', 
            onPress: () => navigation.navigate('ItemVariationsOptions', { 
              itemId: createdItem.id, 
              itemName: createdItem.name 
            })
          },
          { text: 'Terminer', onPress: () => navigation.goBack() },
        ]);
      } else {
        navigation.goBack();
      }
    } catch (error) {
      const errorMessage = error.error?.message || error.message || 'Impossible de créer l\'article';
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
        <Text style={styles.title}>Ajouter un article</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom du plat *</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder="Ex: Poulet Bicyclette Braisé"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Catégorie *</Text>
          <View style={[styles.pickerContainer, errors.categoryId && styles.inputError]}>
            <Picker
              selectedValue={formData.categoryId}
              onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              style={styles.picker}
            >
              <Picker.Item label="Sélectionner une catégorie" value="" />
              {categories.map((cat) => (
                <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
              ))}
            </Picker>
          </View>
          {errors.categoryId && <Text style={styles.errorText}>{errors.categoryId}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Description ({formData.description.length}/250)
          </Text>
          <TextInput
            style={[styles.textArea, errors.description && styles.inputError]}
            placeholder="Décrivez le plat..."
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={4}
            maxLength={250}
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Prix (FCFA) *</Text>
          <TextInput
            style={[styles.input, errors.price && styles.inputError]}
            placeholder="3000"
            value={formData.price}
            onChangeText={(text) => setFormData({ ...formData, price: text })}
            keyboardType="numeric"
          />
          {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Temps de préparation</Text>
          <View style={styles.timeContainer}>
            {PREPARATION_TIMES.map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeChip,
                  formData.preparationTime === time && styles.timeChipSelected,
                ]}
                onPress={() => setFormData({ ...formData, preparationTime: time })}
              >
                <Text
                  style={[
                    styles.timeChipText,
                    formData.preparationTime === time && styles.timeChipTextSelected,
                  ]}
                >
                  {time} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Photo principale *</Text>
          {formData.mainImage ? (
            <View style={styles.imagePreview}>
              <Image source={{ uri: getImageUrl(formData.mainImage.uri) || formData.mainImage.uri }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => removeImage('main')}
              >
                <Ionicons name="close-circle" size={24} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.uploadButton, errors.mainImage && styles.uploadButtonError]}
              onPress={() => pickImage(true)}
            >
              <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
              <Text style={styles.uploadButtonText}>Ajouter une photo</Text>
            </TouchableOpacity>
          )}
          {errors.mainImage && <Text style={styles.errorText}>{errors.mainImage}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Photos supplémentaires (max 3)</Text>
          <View style={styles.additionalImagesContainer}>
            {formData.additionalImages.map((image, index) => (
              <View key={`additional-image-${image.uri || index}`} style={styles.additionalImagePreview}>
                <Image source={{ uri: getImageUrl(image.uri) || image.uri }} style={styles.additionalImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
            {formData.additionalImages.length < 3 && (
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={() => pickImage(false)}
              >
                <Ionicons name="add" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Stock et disponibilité</Text>
          <View style={styles.stockOptions}>
            {[
              { key: 'in_stock', label: 'En stock', icon: 'checkmark-circle' },
              { key: 'limited', label: 'Stock limité', icon: 'warning' },
              { key: 'out_of_stock', label: 'Rupture de stock', icon: 'close-circle' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.stockOption,
                  formData.stockStatus === option.key && styles.stockOptionSelected,
                ]}
                onPress={() => setFormData({ ...formData, stockStatus: option.key })}
              >
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={formData.stockStatus === option.key ? COLORS.primary : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.stockOptionText,
                    formData.stockStatus === option.key && styles.stockOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {formData.stockStatus === 'limited' && (
            <TextInput
              style={styles.input}
              placeholder="Quantité restante"
              value={formData.stockQuantity?.toString() || ''}
              onChangeText={(text) => setFormData({ ...formData, stockQuantity: Number.parseInt(text, 10) || null })}
              keyboardType="numeric"
            />
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tags</Text>
          <View style={styles.tagsContainer}>
            {TAGS.map((tag) => (
              <TouchableOpacity
                key={tag.id}
                style={[
                  styles.tag,
                  formData.tags.includes(tag.id) && styles.tagSelected,
                ]}
                onPress={() => toggleTag(tag.id)}
              >
                <Ionicons
                  name={tag.icon}
                  size={16}
                  color={formData.tags.includes(tag.id) ? COLORS.white : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.tagText,
                    formData.tags.includes(tag.id) && styles.tagTextSelected,
                  ]}
                >
                  {tag.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mots-clés de recherche</Text>
          <TextInput
            style={styles.input}
            placeholder="poulet, grillé, braisé, bicyclette"
            value={formData.keywords}
            onChangeText={(text) => setFormData({ ...formData, keywords: text })}
          />
          <Text style={styles.hintText}>
            Séparez les mots-clés par des virgules
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Création...' : 'Créer l\'article'}
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
  pickerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timeChipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  timeChipTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
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
  imagePreview: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  additionalImagesContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  additionalImagePreview: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  additionalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  stockOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 6,
  },
  stockOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  stockOptionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  stockOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  tagSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tagTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  footer: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

AddMenuItemScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
    goBack: PropTypes.func.isRequired,
  }).isRequired,
  route: PropTypes.shape({
    params: PropTypes.shape({
      categoryId: PropTypes.string,
    }),
  }).isRequired,
};

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { restaurantMenu } from '../../api/menu';
import useRestaurantStore from '../../store/restaurantStore';

const CATEGORY_ICONS = [
  'restaurant',
  'fast-food',
  'wine',
  'ice-cream',
  'cafe',
  'pizza',
  'fish',
  'nutrition',
  'basket',
  'flame',
];

export default function AddCategoryModal({ navigation, route }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: CATEGORY_ICONS[0],
    order: 0,
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const insets = useSafeAreaInsets();

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Nom de la catégorie requis';
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
      const categoryData = {
        name: formData.name,
        description: formData.description || '',
        display_order: formData.order,
      };
      
      const response = await restaurantMenu.createCategory(categoryData);
      // Le backend retourne { success: true, data: { category: {...} } }
      if (response.success !== false) {
        navigation.goBack();
        // Le MenuScreen rechargera automatiquement via useFocusEffect
      }
    } catch (error) {
      const errorMessage = error.error?.message || error.message || 'Impossible de créer la catégorie';
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      onRequestClose={() => navigation.goBack()}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.modal, { paddingBottom: insets.bottom }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Ajouter une catégorie</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom de la catégorie *</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Ex: Entrées, Plats Principaux"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                autoFocus={true}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description de la catégorie"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Icône</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconsScroll}>
                <View style={styles.iconsContainer}>
                  {CATEGORY_ICONS.map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      style={[
                        styles.iconOption,
                        formData.icon === icon && styles.iconOptionSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, icon })}
                    >
                      <Ionicons
                        name={icon}
                        size={24}
                        color={formData.icon === icon ? COLORS.primary : COLORS.textSecondary}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ordre d'affichage</Text>
              <View style={styles.orderContainer}>
                <TouchableOpacity
                  style={styles.orderButton}
                  onPress={() => setFormData({ ...formData, order: Math.max(0, formData.order - 1) })}
                >
                  <Ionicons name="remove" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.orderValue}>{formData.order}</Text>
                <TouchableOpacity
                  style={styles.orderButton}
                  onPress={() => setFormData({ ...formData, order: formData.order + 1 })}
                >
                  <Ionicons name="add" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.toggleContainer}>
                <Text style={styles.label}>Visibilité</Text>
                <TouchableOpacity
                  style={[styles.toggle, formData.isActive && styles.toggleActive]}
                  onPress={() => setFormData({ ...formData, isActive: !formData.isActive })}
                >
                  <View style={[styles.toggleThumb, formData.isActive && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>
              <Text style={styles.toggleLabel}>
                {formData.isActive ? 'Catégorie visible' : 'Catégorie masquée'}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelButton, loading && styles.buttonDisabled]}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Création...' : 'Créer la catégorie'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: 400,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 10,
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
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 48,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 14,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
  },
  iconsScroll: {
    marginTop: 8,
  },
  iconsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  iconOption: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  iconOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  orderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  orderButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    minWidth: 60,
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.white,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  toggleLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  submitButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

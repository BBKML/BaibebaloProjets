import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { COLORS } from '../../constants/colors';
import { restaurantMenu } from '../../api/menu';

const SIDE_DISHES = ['Riz', 'Attiéké', 'Foutou', 'Alloco', 'Frites', 'Salade'];
const SPICE_LEVELS = ['Pas épicé', 'Légèrement épicé', 'Épicé', 'Très épicé'];

export default function ItemVariationsOptionsScreen({ navigation, route }) {
  const { itemId, itemName, existingOptions } = route.params || {};
  const [variations, setVariations] = useState({
    sizes: [],
    sideDishes: [],
    supplements: [],
    spiceLevels: [],
    allowNotes: true,
  });
  const [newSize, setNewSize] = useState({ name: '', priceModifier: 0 });
  const [newSupplement, setNewSupplement] = useState({ name: '', price: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Charger les variations existantes si fournies
    if (existingOptions) {
      setVariations({
        sizes: existingOptions.sizes || [],
        sideDishes: existingOptions.sideDishes || [],
        supplements: existingOptions.supplements || [],
        spiceLevels: existingOptions.spiceLevels || [],
        allowNotes: existingOptions.allowNotes !== false,
      });
    }
  }, [existingOptions]);

  const addSize = () => {
    if (!newSize.name.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de taille');
      return;
    }
    setVariations({
      ...variations,
      sizes: [...variations.sizes, { ...newSize, id: Date.now() }],
    });
    setNewSize({ name: '', priceModifier: 0 });
  };

  const removeSize = (id) => {
    setVariations({
      ...variations,
      sizes: variations.sizes.filter((s) => s.id !== id),
    });
  };

  const toggleSideDish = (dish) => {
    const newSideDishes = variations.sideDishes.includes(dish)
      ? variations.sideDishes.filter((d) => d !== dish)
      : [...variations.sideDishes, dish];
    setVariations({ ...variations, sideDishes: newSideDishes });
  };

  const addSupplement = () => {
    if (!newSupplement.name.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de supplément');
      return;
    }
    if (newSupplement.price <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un prix valide');
      return;
    }
    setVariations({
      ...variations,
      supplements: [...variations.supplements, { ...newSupplement, id: Date.now() }],
    });
    setNewSupplement({ name: '', price: 0 });
  };

  const removeSupplement = (id) => {
    setVariations({
      ...variations,
      supplements: variations.supplements.filter((s) => s.id !== id),
    });
  };

  const toggleSpiceLevel = (level) => {
    const newLevels = variations.spiceLevels.includes(level)
      ? variations.spiceLevels.filter((l) => l !== level)
      : [...variations.spiceLevels, level];
    setVariations({ ...variations, spiceLevels: newLevels });
  };

  const handleSave = async () => {
    if (!itemId) {
      Alert.alert('Erreur', 'ID de l\'article manquant');
      return;
    }

    setSaving(true);
    try {
      // Convertir les variations en format customization_options
      const customizationOptions = [];

      // Ajouter les tailles si présentes
      if (variations.sizes.length > 0) {
        customizationOptions.push({
          key: 'size',
          label: 'Portion',
          type: 'single',
          required: true,
          choices: variations.sizes.map(s => ({
            value: s.name.toLowerCase().replace(/\s+/g, '_'),
            label: s.name,
            price: s.priceModifier || 0,
          })),
        });
      }

      // Ajouter les accompagnements si présents
      if (variations.sideDishes.length > 0) {
        customizationOptions.push({
          key: 'side_dish',
          label: 'Accompagnement',
          type: 'single',
          required: false,
          choices: variations.sideDishes.map(dish => ({
            value: dish.toLowerCase().replace(/\s+/g, '_'),
            label: dish,
            price: 0,
          })),
        });
      }

      // Ajouter les niveaux d'épices si présents
      if (variations.spiceLevels.length > 0) {
        customizationOptions.push({
          key: 'spice_level',
          label: 'Niveau d\'épice',
          type: 'single',
          required: false,
          choices: variations.spiceLevels.map(level => ({
            value: level.toLowerCase().replace(/\s+/g, '_').replace(/'/g, ''),
            label: level,
            price: 0,
          })),
        });
      }

      // Ajouter les suppléments si présents
      if (variations.supplements.length > 0) {
        customizationOptions.push({
          key: 'supplements',
          label: 'Suppléments',
          type: 'multiple',
          required: false,
          choices: variations.supplements.map(s => ({
            value: s.name.toLowerCase().replace(/\s+/g, '_'),
            label: s.name,
            price: s.price || 0,
          })),
        });
      }

      // Sauvegarder via l'API
      await restaurantMenu.updateItemOptions(itemId, customizationOptions);

      Toast.show({
        type: 'success',
        text1: 'Options enregistrées',
        text2: 'Les options de personnalisation ont été sauvegardées',
      });

      navigation.goBack();
    } catch (error) {
      console.error('Erreur sauvegarde options:', error);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: error?.message || 'Impossible de sauvegarder les options',
      });
    } finally {
      setSaving(false);
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
        <Text style={styles.title}>Options et variations</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {itemName && (
          <Text style={styles.itemName}>Pour : {itemName}</Text>
        )}

        {/* Tailles */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tailles</Text>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => {
                // Toggle pour activer/désactiver les tailles
              }}
            >
              <Text style={styles.toggleText}>Activer</Text>
            </TouchableOpacity>
          </View>

          {variations.sizes.map((size) => (
            <View key={size.id} style={styles.variationItem}>
              <View style={styles.variationInfo}>
                <Text style={styles.variationName}>{size.name}</Text>
                <Text style={styles.variationPrice}>
                  {size.priceModifier >= 0 ? '+' : ''}{size.priceModifier} FCFA
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeSize(size.id)}
              >
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.addForm}>
            <TextInput
              style={styles.addInput}
              placeholder="Nom (Ex: Grand)"
              value={newSize.name}
              onChangeText={(text) => setNewSize({ ...newSize, name: text })}
            />
            <TextInput
              style={[styles.addInput, styles.priceInput]}
              placeholder="+500"
              value={newSize.priceModifier.toString()}
              onChangeText={(text) => setNewSize({ ...newSize, priceModifier: parseInt(text) || 0 })}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.addButton} onPress={addSize}>
              <Ionicons name="add" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Accompagnements disponibles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accompagnements disponibles</Text>
          <Text style={styles.hintText}>Le client pourra choisir parmi ces options</Text>
          <View style={styles.checkboxContainer}>
            {SIDE_DISHES.map((dish) => (
              <TouchableOpacity
                key={dish}
                style={styles.checkboxItem}
                onPress={() => toggleSideDish(dish)}
              >
              <View style={[
                styles.checkbox,
                variations.sideDishes.includes(dish) && styles.checkboxChecked,
              ]}>
                {variations.sideDishes.includes(dish) && (
                  <Ionicons name="checkmark" size={16} color={COLORS.white} />
                )}
              </View>
                <Text style={styles.checkboxLabel}>{dish}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Niveaux d'épices */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Niveaux d'épice</Text>
          <Text style={styles.hintText}>Permettre au client de choisir le niveau d'épice</Text>
          <View style={styles.checkboxContainer}>
            {SPICE_LEVELS.map((level) => (
              <TouchableOpacity
                key={level}
                style={styles.checkboxItem}
                onPress={() => toggleSpiceLevel(level)}
              >
              <View style={[
                styles.checkbox,
                variations.spiceLevels.includes(level) && styles.checkboxChecked,
              ]}>
                {variations.spiceLevels.includes(level) && (
                  <Ionicons name="checkmark" size={16} color={COLORS.white} />
                )}
              </View>
                <Text style={styles.checkboxLabel}>
                  {level === 'Pas épicé' && '🌶️ '}
                  {level === 'Légèrement épicé' && '🌶️🌶️ '}
                  {level === 'Épicé' && '🌶️🌶️🌶️ '}
                  {level === 'Très épicé' && '🌶️🌶️🌶️🌶️ '}
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Suppléments disponibles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suppléments disponibles</Text>

          {variations.supplements.map((supplement) => (
            <View key={supplement.id} style={styles.variationItem}>
              <View style={styles.variationInfo}>
                <Text style={styles.variationName}>{supplement.name}</Text>
                <Text style={styles.variationPrice}>+{supplement.price} FCFA</Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeSupplement(supplement.id)}
              >
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.addForm}>
            <TextInput
              style={styles.addInput}
              placeholder="Nom du supplément"
              value={newSupplement.name}
              onChangeText={(text) => setNewSupplement({ ...newSupplement, name: text })}
            />
            <TextInput
              style={[styles.addInput, styles.priceInput]}
              placeholder="Prix"
              value={newSupplement.price.toString()}
              onChangeText={(text) => setNewSupplement({ ...newSupplement, price: parseInt(text) || 0 })}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.addButton} onPress={addSupplement}>
              <Ionicons name="add" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes spéciales */}
        <View style={styles.section}>
          <View style={styles.toggleContainer}>
            <Text style={styles.sectionTitle}>Permettre des notes spéciales</Text>
            <TouchableOpacity
              style={[styles.toggle, variations.allowNotes && styles.toggleActive]}
              onPress={() => setVariations({ ...variations, allowNotes: !variations.allowNotes })}
            >
              <View style={[styles.toggleThumb, variations.allowNotes && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hintText}>
            Les clients pourront ajouter des instructions spéciales lors de la commande
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>Enregistrer les options</Text>
          )}
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
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 8,
  },
  toggleText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  variationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  variationInfo: {
    flex: 1,
  },
  variationName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  variationPrice: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  removeButton: {
    padding: 8,
  },
  addForm: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  addInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  priceInput: {
    flex: 0.5,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxContainer: {
    gap: 12,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  checkboxChecked: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  checkboxLabel: {
    fontSize: 16,
    color: COLORS.text,
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
  hintText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
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
    opacity: 0.7,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

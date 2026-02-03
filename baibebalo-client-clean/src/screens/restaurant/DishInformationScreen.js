import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useCartStore from '../../store/cartStore';

export default function DishInformationScreen({ navigation, route }) {
  const { dish, restaurantId, restaurantName } = route.params || {};
  const addItem = useCartStore((s) => s.addItem);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  if (!dish) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Plat non trouvé</Text>
      </View>
    );
  }

  const calculateOptionsTotal = () => {
    if (!dish?.customization_options) return 0;
    let total = 0;
    dish.customization_options.forEach((option) => {
      const val = selectedOptions[option.key];
      if (val && option.choices) {
        if (Array.isArray(val)) {
          val.forEach((v) => {
            const c = option.choices.find((x) => x.value === v);
            if (c?.price) total += parseFloat(c.price) || 0;
          });
        } else {
          const c = option.choices.find((x) => x.value === val);
          if (c?.price) total += parseFloat(c.price) || 0;
        }
      }
    });
    return total;
  };

  const unitPrice = (parseFloat(dish?.price) || 0) + calculateOptionsTotal();
  const totalPrice = unitPrice * quantity;

  const handleAddToCart = () => {
    const currentRestaurantId = restaurantId || dish?.restaurant_id;
    const currentRestaurantName = restaurantName || dish?.restaurant_name;
    if (!currentRestaurantId) {
      Alert.alert('Erreur', 'Restaurant non identifié.');
      return;
    }
    const customizations = Object.entries(selectedOptions)
      .filter(([, value]) => value !== null && value !== '' && (Array.isArray(value) ? value.length > 0 : true))
      .map(([key, value]) => ({ key, value }));
    const optionsTotal = calculateOptionsTotal();
    const priceWithOptions = (parseFloat(dish.price) || 0) + optionsTotal;
    const result = addItem(
      {
        ...dish,
        price: priceWithOptions,
        base_price: dish.price,
        options_total: optionsTotal,
        quantity,
        customizations,
        notes: notes.trim() || undefined,
      },
      currentRestaurantId,
      currentRestaurantName
    );
    if (result?.requiresConfirm) {
      Alert.alert(
        'Changer de restaurant',
        `Votre panier contient des plats d'un autre restaurant. Voulez-vous le vider ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Vider et ajouter',
            style: 'destructive',
            onPress: () => {
              addItem(
                {
                  ...dish,
                  price: priceWithOptions,
                  base_price: dish.price,
                  options_total: optionsTotal,
                  quantity,
                  customizations,
                  notes: notes.trim() || undefined,
                },
                currentRestaurantId,
                currentRestaurantName,
                { force: true }
              );
              navigation.goBack();
            },
          },
        ]
      );
      return;
    }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.heroWrapper}>
        <Image
          source={{ uri: dish.image_url || 'https://via.placeholder.com/400' }}
          style={styles.dishImage}
        />
        <View style={styles.heroGradient} />
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.dishHeader}>
          <View style={styles.tagBadge}>
            <Ionicons name="flame" size={12} color={COLORS.primary} />
            <Text style={styles.tagText}>Signature Dish</Text>
          </View>
          <Text style={styles.dishName}>{dish.name}</Text>
          <Text style={styles.dishPrice}>{dish.price || 0} FCFA</Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{dish.description || 'Aucune description disponible.'}</Text>
        </View>

        {/* Options à cocher (accompagnement, épice, etc.) */}
        {dish.customization_options && dish.customization_options.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choisir vos options</Text>
            {dish.customization_options.map((option, index) => (
              <View key={index} style={styles.optionBlock}>
                <Text style={styles.optionLabelTitle}>{option.label}</Text>
                {(option.type === 'single' || option.type === 'radio') && option.choices?.map((choice) => {
                  const isSelected = selectedOptions[option.key] === choice.value;
                  return (
                    <TouchableOpacity
                      key={choice.value}
                      style={[styles.choiceRow, isSelected && styles.choiceRowSelected]}
                      onPress={() =>
                        setSelectedOptions({ ...selectedOptions, [option.key]: choice.value })
                      }
                      activeOpacity={0.7}
                    >
                      <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <Text style={[styles.choiceRowText, isSelected && styles.choiceRowTextSelected]}>
                        {choice.label}
                      </Text>
                      {choice.price > 0 && (
                        <Text style={styles.choiceRowPrice}>+{choice.price} FCFA</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
                {option.type === 'multiple' && option.choices?.map((choice) => {
                  const current = selectedOptions[option.key] || [];
                  const isSelected = current.includes(choice.value);
                  return (
                    <TouchableOpacity
                      key={choice.value}
                      style={[styles.choiceRow, isSelected && styles.choiceRowSelected]}
                      onPress={() => {
                        const next = isSelected
                          ? current.filter((v) => v !== choice.value)
                          : [...current, choice.value];
                        setSelectedOptions({ ...selectedOptions, [option.key]: next });
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                      </View>
                      <Text style={[styles.choiceRowText, isSelected && styles.choiceRowTextSelected]}>
                        {choice.label}
                      </Text>
                      {choice.price > 0 && (
                        <Text style={styles.choiceRowPrice}>+{choice.price} FCFA</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* Notes spéciales */}
        {dish.customization_options?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes (optionnel)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Ex: Sans oignons, sauce à part..."
              placeholderTextColor={COLORS.textLight}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>
        )}

        {/* Informations nutritionnelles */}
        {dish.nutritional_info && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations nutritionnelles</Text>
            <View style={styles.nutritionGrid}>
              {Object.entries(dish.nutritional_info).map(([key, value]) => (
                <View key={key} style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{value}</Text>
                  <Text style={styles.nutritionLabel}>{key}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Allergènes */}
        {dish.allergens && dish.allergens.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Allergènes</Text>
            <View style={styles.allergensContainer}>
              {dish.allergens.map((allergen, index) => (
                <View key={index} style={styles.allergenTag}>
                  <Text style={styles.allergenText}>{allergen}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Ingrédients */}
        {dish.ingredients && dish.ingredients.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingrédients</Text>
            {dish.ingredients.map((ingredient, index) => (
              <View key={index} style={styles.ingredientItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                <Text style={styles.ingredientText}>{ingredient}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Temps de préparation */}
        {dish.preparation_time && (
          <View style={styles.section}>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>
                Temps de préparation: {dish.preparation_time} minutes
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.quantityBlock}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            <Ionicons name="remove" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{quantity}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity((q) => q + 1)}>
            <Ionicons name="add" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.totalBlock}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{totalPrice.toLocaleString('fr-FR')} FCFA</Text>
        </View>
        <TouchableOpacity style={styles.customizeButton} onPress={handleAddToCart}>
          <Ionicons name="cart" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  heroWrapper: {
    position: 'relative',
  },
  content: {
    flex: 1,
  },
  dishImage: {
    width: '100%',
    height: 280,
    backgroundColor: COLORS.border,
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dishHeader: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary + '10',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  dishName: {
    flex: 1,
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
  },
  dishPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 6,
  },
  section: {
    padding: 16,
    backgroundColor: COLORS.white,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  optionBlock: {
    marginBottom: 20,
  },
  optionLabelTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  choiceRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioOuterSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  choiceRowText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  choiceRowTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  choiceRowPrice: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  notesInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    minHeight: 80,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quantityBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 4,
    gap: 8,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    minWidth: 28,
    textAlign: 'center',
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  nutritionItem: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    minWidth: 80,
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  allergensContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  allergenTag: {
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  allergenText: {
    fontSize: 12,
    color: COLORS.warning,
    fontWeight: '600',
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  ingredientText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  totalBlock: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  customizeButton: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 32,
  },
});

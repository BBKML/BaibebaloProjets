import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useCartStore from '../../store/cartStore';

export default function CustomizeDishScreen({ navigation, route }) {
  const { dish } = route.params || {};
  const { addItem } = useCartStore();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [notes, setNotes] = useState('');

  const handleAddToCart = () => {
    if (!dish) return;

    const customizations = Object.entries(selectedOptions)
      .filter(([_, value]) => value !== null && value !== '')
      .map(([key, value]) => ({ key, value }));

    addItem({
      ...dish,
      quantity,
      customizations,
      notes: notes.trim() || undefined,
    });

    navigation.goBack();
  };

  const incrementQuantity = () => setQuantity(quantity + 1);
  const decrementQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  if (!dish) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Plat non trouvé</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Image du plat */}
        <Image
          source={{ uri: dish.image_url || 'https://via.placeholder.com/400' }}
          style={styles.dishImage}
        />

        {/* Informations du plat */}
        <View style={styles.dishInfo}>
          <Text style={styles.dishName}>{dish.name}</Text>
          <Text style={styles.dishDescription}>{dish.description}</Text>
          <View style={styles.dishPrice}>
            <Text style={styles.price}>{dish.price || 0} FCFA</Text>
          </View>
        </View>

        {/* Options de personnalisation */}
        {dish.customization_options && dish.customization_options.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personnaliser</Text>
            {dish.customization_options.map((option, index) => (
              <View key={index} style={styles.optionGroup}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                {option.type === 'radio' ? (
                  option.choices.map((choice) => (
                    <TouchableOpacity
                      key={choice.value}
                      style={[
                        styles.choiceButton,
                        selectedOptions[option.key] === choice.value &&
                          styles.choiceButtonSelected,
                      ]}
                      onPress={() =>
                        setSelectedOptions({
                          ...selectedOptions,
                          [option.key]: choice.value,
                        })
                      }
                    >
                      <View style={styles.choiceContent}>
                        <Text
                          style={[
                            styles.choiceText,
                            selectedOptions[option.key] === choice.value &&
                              styles.choiceTextSelected,
                          ]}
                        >
                          {choice.label}
                        </Text>
                        {choice.price && (
                          <Text
                            style={[
                              styles.choicePrice,
                              selectedOptions[option.key] === choice.value &&
                                styles.choicePriceSelected,
                            ]}
                          >
                            +{choice.price} FCFA
                          </Text>
                        )}
                      </View>
                      {selectedOptions[option.key] === choice.value && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color={COLORS.primary}
                        />
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.comingSoon}>Bientôt disponible</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Notes spéciales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes spéciales (optionnel)</Text>
          <View style={styles.notesContainer}>
            <Text style={styles.notesPlaceholder}>
              Ex: Sans oignons, sauce à part...
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer avec quantité et bouton */}
      <View style={styles.footer}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={decrementQuantity}
          >
            <Ionicons name="remove" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={incrementQuantity}
          >
            <Ionicons name="add" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddToCart}>
          <Text style={styles.addButtonText}>
            Ajouter • {(dish.price || 0) * quantity} FCFA
          </Text>
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
  content: {
    flex: 1,
  },
  dishImage: {
    width: '100%',
    height: 300,
    backgroundColor: COLORS.border,
  },
  dishInfo: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dishName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  dishDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  dishPrice: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  section: {
    padding: 16,
    backgroundColor: COLORS.white,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  optionGroup: {
    marginBottom: 24,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  choiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },
  choiceButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  choiceContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  choiceText: {
    fontSize: 16,
    color: COLORS.text,
  },
  choiceTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  choicePrice: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 12,
  },
  choicePriceSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  comingSoon: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  notesContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
  },
  notesPlaceholder: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 4,
    gap: 16,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    minWidth: 30,
    textAlign: 'center',
  },
  addButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 32,
  },
});

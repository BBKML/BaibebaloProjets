import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
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

    const restaurantId = dish.restaurant_id || dish.restaurant?.id;
    const restaurantName = dish.restaurant_name || dish.restaurant?.name;

    const result = addItem(
      {
        ...dish,
        quantity,
        customizations,
        notes: notes.trim() || undefined,
      },
      restaurantId,
      restaurantName
    );

    if (result?.requiresConfirm) {
      Alert.alert(
        'Changer de restaurant',
        `Votre panier contient déjà des plats de ${result.currentRestaurantName || 'un autre restaurant'}. Voulez-vous le vider ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Vider et ajouter',
            style: 'destructive',
            onPress: () => {
              addItem(
                {
                  ...dish,
                  quantity,
                  customizations,
                  notes: notes.trim() || undefined,
                },
                restaurantId,
                restaurantName,
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
      <View style={styles.overlay} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerImage}>
            <Image
              source={{ uri: dish.image_url || 'https://via.placeholder.com/400' }}
              style={styles.dishImage}
            />
            <View style={styles.headerOverlay} />
            <View style={styles.headerContent}>
              <Text style={styles.popularTag}>Populaire</Text>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.dishName}>{dish.name}</Text>
                </View>
                <TouchableOpacity style={styles.shareButton}>
                  <Ionicons name="share-social" size={18} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text style={styles.dishDescription}>{dish.description}</Text>

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
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.comingSoon}>Bientôt disponible</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes spéciales (optionnel)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Ex: Sans oignons, sauce à part..."
              placeholderTextColor={COLORS.textLight}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={decrementQuantity}
            >
              <Ionicons name="remove" size={18} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={incrementQuantity}
            >
              <Ionicons name="add" size={18} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {(dish.price || 0) * quantity} FCFA
            </Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAddToCart}>
            <Ionicons name="cart" size={18} color={COLORS.white} />
            <Text style={styles.addButtonText}>Ajouter au panier</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginVertical: 8,
  },
  content: {
    flex: 1,
  },
  headerImage: {
    position: 'relative',
  },
  dishImage: {
    width: '100%',
    height: 220,
    backgroundColor: COLORS.border,
  },
  headerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  headerContent: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  popularTag: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    textTransform: 'uppercase',
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dishName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
  },
  dishDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
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
  notesInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
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
    alignSelf: 'flex-start',
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
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  totalLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
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

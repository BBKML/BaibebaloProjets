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
  const { dish, restaurantId, restaurantName } = route.params || {};
  const { addItem } = useCartStore();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [notes, setNotes] = useState('');

  // Calcul du prix total des options sélectionnées
  const calculateOptionsTotal = () => {
    if (!dish?.customization_options) return 0;
    
    let optionsTotal = 0;
    dish.customization_options.forEach(option => {
      const selectedValue = selectedOptions[option.key];
      if (selectedValue && option.choices) {
        // Gérer les sélections multiples (array) et simples (string)
        if (Array.isArray(selectedValue)) {
          // Type multiple - additionner les prix de tous les éléments sélectionnés
          selectedValue.forEach(val => {
            const selectedChoice = option.choices.find(c => c.value === val);
            if (selectedChoice?.price) {
              optionsTotal += parseFloat(selectedChoice.price) || 0;
            }
          });
        } else {
          // Type single/radio - un seul élément
          const selectedChoice = option.choices.find(c => c.value === selectedValue);
          if (selectedChoice?.price) {
            optionsTotal += parseFloat(selectedChoice.price) || 0;
          }
        }
      }
    });
    return optionsTotal;
  };

  // Prix unitaire = Prix de base (avec promotion si applicable) + Options
  const basePrice = (dish?.is_promotion_active && dish?.effective_price) 
    ? parseFloat(dish.effective_price) 
    : (parseFloat(dish?.price) || 0);
  const unitPrice = basePrice + calculateOptionsTotal();
  
  // Prix total = Prix unitaire × Quantité
  const totalPrice = unitPrice * quantity;

  // #region agent log
  React.useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/66128188-ae85-488b-8573-429b47c72881',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CustomizeDishScreen.js:17',message:'CustomizeDishScreen mounted',data:{dishExists:!!dish,dishRestaurantId:dish?.restaurant_id||'NULL',dishRestaurantName:dish?.restaurant_name||'NULL',routeRestaurantId:restaurantId||'NULL',routeRestaurantName:restaurantName||'NULL',dishKeys:dish?Object.keys(dish).join(','):'NO_DISH'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
  }, []);
  // #endregion

  const handleAddToCart = () => {
    if (!dish) return;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/66128188-ae85-488b-8573-429b47c72881',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CustomizeDishScreen.js:23',message:'handleAddToCart called',data:{dishHasRestaurantId:!!dish.restaurant_id,dishHasRestaurant:!!dish.restaurant,dishRestaurantId:dish.restaurant_id||'NULL',dishRestaurantName:dish.restaurant_name||'NULL'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion

    const customizations = Object.entries(selectedOptions)
      .filter(([_, value]) => value !== null && value !== '')
      .map(([key, value]) => ({ key, value }));

    // Essayer plusieurs sources pour restaurantId et restaurantName
    const currentRestaurantId = restaurantId || dish?.restaurant_id || dish?.restaurant?.id;
    const currentRestaurantName = restaurantName || dish?.restaurant_name || dish?.restaurant?.name;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/66128188-ae85-488b-8573-429b47c72881',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CustomizeDishScreen.js:35',message:'RestaurantId resolution',data:{fromRoute:restaurantId||'NULL',fromDish:dish?.restaurant_id||'NULL',fromDishRestaurant:dish?.restaurant?.id||'NULL',finalRestaurantId:currentRestaurantId||'NULL',finalRestaurantName:currentRestaurantName||'NULL'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
    // #endregion

    if (!currentRestaurantId) {
      Alert.alert('Erreur', 'Impossible d\'identifier le restaurant. Veuillez réessayer.');
      return;
    }

    // Calculer le prix avec les options
    // Utiliser le prix promotionnel si disponible, sinon le prix normal
    const basePrice = (dish.is_promotion_active && dish.effective_price) 
      ? dish.effective_price 
      : (parseFloat(dish.price) || 0);
    const originalBasePrice = parseFloat(dish.original_price || dish.price || 0);
    const optionsTotal = calculateOptionsTotal();
    const priceWithOptions = basePrice + optionsTotal;

    const result = addItem(
      {
        ...dish,
        price: priceWithOptions, // Prix incluant les options (avec promotion si applicable)
        base_price: basePrice, // Prix de base (avec promotion si applicable)
        original_price: originalBasePrice, // Prix original sans promotion
        effective_price: dish.effective_price || dish.price, // Prix effectif avec promotion
        is_promotion_active: dish.is_promotion_active || false,
        options_total: optionsTotal, // Total des options pour référence
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
                  price: priceWithOptions,
                  base_price: basePrice,
                  original_price: originalBasePrice,
                  effective_price: dish.effective_price || dish.price,
                  is_promotion_active: dish.is_promotion_active || false,
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
                  <View style={styles.optionHeader}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    {option.required && option.key !== 'side_dish' && (
                      <Text style={styles.requiredBadge}>Obligatoire</Text>
                    )}
                  </View>
                  
                  {/* Type single ou radio - choix unique */}
                  {(option.type === 'single' || option.type === 'radio') && option.choices?.map((choice) => (
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
                      <View style={styles.radioOuter}>
                        {selectedOptions[option.key] === choice.value && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.choiceText,
                          selectedOptions[option.key] === choice.value &&
                            styles.choiceTextSelected,
                        ]}
                      >
                        {choice.label}
                      </Text>
                      {choice.price > 0 && (
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
                  ))}
                  
                  {/* Type multiple - choix multiples (suppléments) */}
                  {option.type === 'multiple' && option.choices?.map((choice) => {
                    const currentSelections = selectedOptions[option.key] || [];
                    const isSelected = currentSelections.includes(choice.value);
                    
                    return (
                      <TouchableOpacity
                        key={choice.value}
                        style={[
                          styles.choiceButton,
                          isSelected && styles.choiceButtonSelected,
                        ]}
                        onPress={() => {
                          const newSelections = isSelected
                            ? currentSelections.filter(v => v !== choice.value)
                            : [...currentSelections, choice.value];
                          setSelectedOptions({
                            ...selectedOptions,
                            [option.key]: newSelections,
                          });
                        }}
                      >
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                          {isSelected && (
                            <Ionicons name="checkmark" size={14} color={COLORS.white} />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.choiceText,
                            isSelected && styles.choiceTextSelected,
                          ]}
                        >
                          {choice.label}
                        </Text>
                        {choice.price > 0 && (
                          <Text
                            style={[
                              styles.choicePrice,
                              isSelected && styles.choicePriceSelected,
                            ]}
                          >
                            +{choice.price} FCFA
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
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
            {dish?.is_promotion_active && dish?.effective_price && dish?.original_price && (
              <View style={styles.promotionPriceContainer}>
                <Text style={styles.totalValueOriginal}>
                  {((dish.original_price + calculateOptionsTotal()) * quantity).toLocaleString('fr-FR')} FCFA
                </Text>
                <View style={styles.promotionBadge}>
                  <Text style={styles.promotionBadgeText}>
                    -{Math.round((1 - dish.effective_price / dish.original_price) * 100)}%
                  </Text>
                </View>
              </View>
            )}
            <Text style={styles.totalValue}>
              {totalPrice.toLocaleString('fr-FR')} FCFA
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
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  requiredBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  choiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: 8,
    backgroundColor: COLORS.background,
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
    flex: 1,
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
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
    marginTop: 12,
  },
  totalLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
  },
  promotionPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalValueOriginal: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  promotionBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  promotionBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
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

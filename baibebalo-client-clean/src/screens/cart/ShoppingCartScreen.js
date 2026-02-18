import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useSafeAreaPadding } from '../../hooks/useSafeAreaPadding';
import useCartStore from '../../store/cartStore';
import { getSuggestedItems } from '../../api/restaurants';

// Configuration des seuils (doit correspondre au backend)
const FREE_DELIVERY_THRESHOLD = 20000; // FCFA
const BUNDLE_DISCOUNT_PERCENT = 5; // %

export default function ShoppingCartScreen({ navigation }) {
  const { items, restaurantName, restaurantId, getTotal, updateQuantity, removeItem, clearCart, addItem } = useCartStore();
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionTips, setSuggestionTips] = useState(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const { paddingTop, tabBarTotalHeight } = useSafeAreaPadding({ withTabBar: true });

  const total = getTotal();
  
  // Calcul du seuil de livraison gratuite
  const freeDeliveryThreshold = suggestionTips?.free_delivery_threshold || FREE_DELIVERY_THRESHOLD;
  const isFreeDelivery = total >= freeDeliveryThreshold;
  const amountToFreeDelivery = Math.max(0, freeDeliveryThreshold - total);
  
  // Frais de livraison (0 si seuil atteint)
  const deliveryFee = isFreeDelivery ? 0 : 500;
  const finalTotal = total + deliveryFee;

  useEffect(() => {
    if (restaurantId && items.length > 0) {
      loadSuggestions();
    }
  }, [restaurantId, items]);

  const loadSuggestions = async () => {
    try {
      // Utiliser le nouvel endpoint de suggestions intelligentes
      const cartItemIds = items.map(item => item.id || item.menu_item_id);
      const response = await getSuggestedItems(restaurantId, cartItemIds, 5);
      const data = response.data?.data || response.data || {};
      
      setSuggestions(data.suggestions || []);
      setSuggestionTips(data.tips || null);
    } catch (error) {
      console.error('Erreur lors du chargement des suggestions:', error);
      setSuggestions([]);
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) return;
    navigation.navigate('AddressSelection', {
      nextRouteName: 'Checkout',
    });
  };

  return (
    <View style={[styles.container, { paddingTop }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Panier</Text>
        <TouchableOpacity style={styles.clearButton} onPress={clearCart}>
          <Text style={styles.clearButtonText}>Vider</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyText}>Votre panier est vide</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          >
            <Text style={styles.browseButtonText}>Parcourir les restaurants</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {restaurantName && (
              <View style={styles.restaurantHeader}>
                <Text style={styles.restaurantName}>{restaurantName}</Text>
              </View>
            )}

            {items.map((item) => (
              <View
                key={`${item.id}-${JSON.stringify(item.customizations || [])}`}
                style={styles.cartItem}
              >
                {item.image_url && (
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.itemImage}
                  />
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {!!item.customizations?.length && (
                    <Text style={styles.itemMeta}>
                      {item.customizations.map((opt) => opt.value).join(' • ')}
                    </Text>
                  )}
                  <View style={styles.itemFooter}>
                    <Text style={styles.itemPrice}>
                      {item.price.toLocaleString('fr-FR')} FCFA
                    </Text>
                    <View style={styles.quantityContainer}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(item.id, item.customizations, item.quantity - 1)}
                      >
                        <Ionicons name="remove" size={14} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                      <Text style={styles.quantity}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityButtonActive}
                        onPress={() => updateQuantity(item.id, item.customizations, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={14} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeItem(item.id, item.customizations)}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Bannière livraison gratuite */}
            {!isFreeDelivery && amountToFreeDelivery > 0 && (
              <View style={styles.freeDeliveryBanner}>
                <Ionicons name="bicycle" size={20} color={COLORS.primary} />
                <Text style={styles.freeDeliveryText}>
                  Ajoutez <Text style={styles.freeDeliveryAmount}>{amountToFreeDelivery.toLocaleString('fr-FR')} FCFA</Text> pour la livraison gratuite
                </Text>
              </View>
            )}
            
            {/* Badge livraison gratuite débloquée */}
            {isFreeDelivery && (
              <View style={styles.freeDeliveryUnlocked}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.freeDeliveryUnlockedText}>Livraison gratuite débloquée !</Text>
              </View>
            )}

            {/* Suggestions intelligentes */}
            {suggestions.length > 0 && (
              <View style={styles.suggestionsCard}>
                <Text style={styles.suggestionsTitle}>Suggestions pour vous</Text>
                {suggestionTips?.bundle_message && (
                  <View style={styles.bundleTip}>
                    <Ionicons name="pricetag" size={14} color={COLORS.primary} />
                    <Text style={styles.bundleTipText}>{suggestionTips.bundle_message}</Text>
                  </View>
                )}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsList}>
                  {suggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion.id}
                      style={styles.suggestionItem}
                      onPress={() => {
                        if (restaurantId && restaurantName) {
                          addItem(
                            {
                              id: suggestion.id,
                              name: suggestion.name,
                              price: suggestion.effective_price || suggestion.price,
                              image_url: suggestion.image_url || suggestion.photo,
                              customizations: {},
                            },
                            restaurantId,
                            restaurantName
                          );
                        }
                      }}
                    >
                      {suggestion.image_url || suggestion.photo ? (
                        <Image
                          source={{ uri: suggestion.image_url || suggestion.photo }}
                          style={styles.suggestionImage}
                        />
                      ) : (
                        <View style={styles.suggestionImagePlaceholder}>
                          <Ionicons name="restaurant" size={24} color={COLORS.textLight} />
                        </View>
                      )}
                      {suggestion.suggestion_reason && (
                        <Text style={styles.suggestionReason} numberOfLines={1}>
                          {suggestion.suggestion_reason}
                        </Text>
                      )}
                      <Text style={styles.suggestionName} numberOfLines={2}>
                        {suggestion.name}
                      </Text>
                      <View style={styles.suggestionPriceRow}>
                        <Text style={styles.suggestionPrice}>
                          {parseFloat(suggestion.effective_price || suggestion.price || 0).toLocaleString('fr-FR')} FCFA
                        </Text>
                        {suggestion.is_promotional && suggestion.price !== suggestion.effective_price && (
                          <Text style={styles.suggestionOldPrice}>
                            {parseFloat(suggestion.price || 0).toLocaleString('fr-FR')}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.suggestionAddButton}
                        onPress={() => {
                          if (restaurantId && restaurantName) {
                            addItem(
                              {
                                id: suggestion.id,
                                name: suggestion.name,
                                price: suggestion.effective_price || suggestion.price,
                                image_url: suggestion.image_url || suggestion.photo,
                                customizations: {},
                              },
                              restaurantId,
                              restaurantName
                            );
                          }
                        }}
                      >
                        <Ionicons name="add" size={16} color={COLORS.white} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.promoCard}>
              <Text style={styles.promoLabel}>Code Promo</Text>
              <View style={styles.promoRow}>
                <View style={styles.promoInput}>
                  <Ionicons name="pricetag-outline" size={16} color={COLORS.textSecondary} />
                  <TextInput
                    placeholder="Entrez votre code"
                    placeholderTextColor={COLORS.textLight}
                    style={styles.promoTextInput}
                    value={promoCode}
                    onChangeText={setPromoCode}
                    editable={!promoApplied}
                  />
                </View>
                <TouchableOpacity 
                  style={[styles.applyButton, promoApplied && styles.applyButtonApplied]}
                  onPress={() => {
                    if (promoApplied) {
                      setPromoApplied(false);
                      setPromoCode('');
                    } else if (promoCode.trim()) {
                      // TODO: Valider le code promo avec l'API
                      // Pour l'instant, on simule juste l'application
                      setPromoApplied(true);
                      Alert.alert('Code promo appliqué', 'Le code promo a été appliqué avec succès.');
                    } else {
                      Alert.alert('Code promo requis', 'Veuillez entrer un code promo.');
                    }
                  }}
                >
                  <Text style={styles.applyButtonText}>
                    {promoApplied ? 'Retirer' : 'Appliquer'}
                  </Text>
                </TouchableOpacity>
              </View>
              {promoApplied && (
                <Text style={styles.promoAppliedText}>
                  ✓ Code promo appliqué: {promoCode}
                </Text>
              )}
            </View>

            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Sous-total</Text>
                <Text style={styles.summaryValue}>
                  {total.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Frais de livraison</Text>
                <Text style={styles.summaryValue}>
                  {deliveryFee.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalValue}>
                  {finalTotal.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Bouton Fixe en Bas - au-dessus de la tab bar */}
          <View style={[styles.fixedFooter, { bottom: tabBarTotalHeight + 16 }]}>
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={handleCheckout}
              activeOpacity={0.7}
            >
              <Text style={styles.checkoutButtonText}>Valider la commande</Text>
              <Ionicons name="arrow-forward-circle" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  clearButtonText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  restaurantHeader: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 8,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 16,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.border,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
  },
  itemMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
  },
  quantityButton: {
    width: 24,
    height: 24,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    minWidth: 24,
    textAlign: 'center',
  },
  removeButton: {
    padding: 8,
  },
  promoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  promoLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  promoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  promoInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  promoTextInput: {
    flex: 1,
    height: 44,
    color: COLORS.text,
    fontSize: 14,
  },
  applyButton: {
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonApplied: {
    backgroundColor: COLORS.error || '#FF3B30',
  },
  applyButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },
  promoAppliedText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  summary: {
    backgroundColor: COLORS.white,
    padding: 16,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  // BOUTON FIXE EN BAS
  fixedFooter: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 20,
  },
  checkoutButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  checkoutButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  suggestionsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  suggestionsList: {
    flexDirection: 'row',
  },
  suggestionItem: {
    width: 140,
    marginRight: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    position: 'relative',
  },
  suggestionImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: COLORS.border,
    marginBottom: 8,
  },
  suggestionImagePlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: COLORS.border,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
    minHeight: 32,
  },
  suggestionPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  suggestionAddButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionReason: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  suggestionPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  suggestionOldPrice: {
    fontSize: 12,
    color: COLORS.textLight,
    textDecorationLine: 'line-through',
  },
  // Bannière livraison gratuite
  freeDeliveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    borderStyle: 'dashed',
  },
  freeDeliveryText: {
    fontSize: 13,
    color: COLORS.text,
    marginLeft: 10,
    flex: 1,
  },
  freeDeliveryAmount: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  freeDeliveryUnlocked: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '15',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  freeDeliveryUnlockedText: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600',
    marginLeft: 10,
  },
  bundleTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  bundleTipText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
});
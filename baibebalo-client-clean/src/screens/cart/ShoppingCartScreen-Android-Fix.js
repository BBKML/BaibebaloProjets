import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useCartStore from '../../store/cartStore';

export default function ShoppingCartScreen({ navigation }) {
  const { items, restaurantName, getTotal, updateQuantity, removeItem, clearCart } = useCartStore();

  const total = getTotal();
  const deliveryFee = 1000;
  const finalTotal = total + deliveryFee;

  const handleCheckout = () => {
    if (items.length === 0) return;
    navigation.navigate('AddressSelection', {
      nextRouteName: 'Checkout',
    });
  };

  return (
    <View style={styles.container}>
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

            <View style={styles.promoCard}>
              <Text style={styles.promoLabel}>Code Promo</Text>
              <View style={styles.promoRow}>
                <View style={styles.promoInput}>
                  <Ionicons name="pricetag-outline" size={16} color={COLORS.textSecondary} />
                  <TextInput
                    placeholder="Entrez votre code"
                    placeholderTextColor={COLORS.textLight}
                    style={styles.promoTextInput}
                  />
                </View>
                <TouchableOpacity style={styles.applyButton}>
                  <Text style={styles.applyButtonText}>Appliquer</Text>
                </TouchableOpacity>
              </View>
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

          {/* Bouton Fixe en Bas - TOUJOURS VISIBLE */}
          <View style={styles.fixedFooter}>
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
    paddingVertical: 12,
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
    paddingBottom: 120, // Espace pour le bouton fixe
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
  applyButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
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
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
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
});
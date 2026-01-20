import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useCartStore from '../../store/cartStore';
import { getAddresses } from '../../api/users';
import { createOrder, initiatePayment } from '../../api/orders';
import { validatePromoCode } from '../../api/users';

export default function CheckoutScreen({ navigation }) {
  const { items, getTotal, clearCart, restaurantId } = useCartStore();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [applyingPromo, setApplyingPromo] = useState(false);

  useEffect(() => {
    loadAddresses();
    const unsubscribe = navigation.addListener('focus', loadAddresses);
    return unsubscribe;
  }, [navigation]);

  const loadAddresses = async () => {
    try {
      const response = await getAddresses();
      const userAddresses = response.data?.addresses || [];
      setAddresses(userAddresses);
      if (userAddresses.length > 0) {
        setSelectedAddress(userAddresses[0].id);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des adresses:', error);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('Erreur', 'Veuillez sélectionner une adresse de livraison');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Erreur', 'Votre panier est vide');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        restaurant_id: restaurantId,
        delivery_address_id: selectedAddress,
        payment_method: paymentMethod,
        items: items.map((item) => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          price: item.price,
          customizations: item.customizations,
        })),
        promo_code: promoCode.trim() || null,
      };

      const response = await createOrder(orderData);
      
      // Si paiement mobile money, initier le paiement
      if (paymentMethod === 'mobile_money' && response.data?.id) {
        try {
          // TODO: Récupérer le numéro de téléphone de l'utilisateur
          // await initiatePayment(response.data.id, {
          //   payment_method: 'orange_money',
          //   phone_number: userPhoneNumber,
          // });
        } catch (paymentError) {
          console.error('Erreur lors de l\'initiation du paiement:', paymentError);
          // Continuer quand même, le paiement peut être fait plus tard
        }
      }
      
      clearCart();
      
      // Naviguer vers l'écran de confirmation
      navigation.replace('OrderConfirmation', {
        orderId: response.data.id,
        orderNumber: response.data.order_number || response.data.id,
        estimatedTime: '12:45', // TODO: Calculer depuis estimated_delivery_time
      });
    } catch (error) {
      Alert.alert(
        'Erreur',
        error.response?.data?.error?.message || 'Erreur lors de la création de la commande'
      );
    } finally {
      setLoading(false);
    }
  };

  const total = getTotal();
  const deliveryFee = 1000;
  const finalTotal = total + deliveryFee;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Address Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adresse de livraison</Text>
          {addresses.length === 0 ? (
          <TouchableOpacity
            style={styles.addAddressButton}
            onPress={() => {
              navigation.navigate('AddAddress', { fromCheckout: true });
            }}
          >
              <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
              <Text style={styles.addAddressText}>Ajouter une adresse</Text>
            </TouchableOpacity>
          ) : (
            addresses.map((address) => (
              <TouchableOpacity
                key={address.id}
                style={[
                  styles.addressCard,
                  selectedAddress === address.id && styles.addressCardSelected,
                ]}
                onPress={() => setSelectedAddress(address.id)}
              >
                <Ionicons
                  name={selectedAddress === address.id ? 'radio-button-on' : 'radio-button-off'}
                  size={24}
                  color={selectedAddress === address.id ? COLORS.primary : COLORS.textSecondary}
                />
                <View style={styles.addressInfo}>
                  <Text style={styles.addressLabel}>{address.label || 'Adresse'}</Text>
                  <Text style={styles.addressText}>
                    {address.street}, {address.city}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Promo Code */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Code promo</Text>
          <View style={styles.promoContainer}>
            <TextInput
              style={styles.promoInput}
              placeholder="Entrez un code promo"
              value={promoCode}
              onChangeText={setPromoCode}
              editable={!applyingPromo && promoDiscount === 0}
            />
            <TouchableOpacity
              style={[styles.promoButton, (applyingPromo || promoDiscount > 0) && styles.promoButtonDisabled]}
              onPress={handleApplyPromo}
              disabled={applyingPromo || promoDiscount > 0}
            >
              <Text style={styles.promoButtonText}>
                {applyingPromo ? '...' : promoDiscount > 0 ? '✓' : 'Appliquer'}
              </Text>
            </TouchableOpacity>
          </View>
          {promoDiscount > 0 && (
            <View style={styles.promoDiscountRow}>
              <Text style={styles.promoDiscountLabel}>Réduction appliquée</Text>
              <Text style={styles.promoDiscountValue}>
                -{promoDiscount.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Méthode de paiement</Text>
          <TouchableOpacity
            style={[
              styles.paymentCard,
              paymentMethod === 'mobile_money' && styles.paymentCardSelected,
            ]}
            onPress={() => setPaymentMethod('mobile_money')}
          >
            <Ionicons
              name={paymentMethod === 'mobile_money' ? 'radio-button-on' : 'radio-button-off'}
              size={24}
              color={paymentMethod === 'mobile_money' ? COLORS.primary : COLORS.textSecondary}
            />
            <Text style={styles.paymentText}>Mobile Money</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.paymentCard,
              paymentMethod === 'cash' && styles.paymentCardSelected,
            ]}
            onPress={() => setPaymentMethod('cash')}
          >
            <Ionicons
              name={paymentMethod === 'cash' ? 'radio-button-on' : 'radio-button-off'}
              size={24}
              color={paymentMethod === 'cash' ? COLORS.primary : COLORS.textSecondary}
            />
            <Text style={styles.paymentText}>Espèces</Text>
          </TouchableOpacity>
        </View>

        {/* Promo Code */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Code promo</Text>
          <View style={styles.promoContainer}>
            <TextInput
              style={styles.promoInput}
              placeholder="Entrez un code promo"
              value={promoCode}
              onChangeText={setPromoCode}
              editable={!applyingPromo && promoDiscount === 0}
            />
            <TouchableOpacity
              style={[styles.promoButton, (applyingPromo || promoDiscount > 0) && styles.promoButtonDisabled]}
              onPress={handleApplyPromo}
              disabled={applyingPromo || promoDiscount > 0}
            >
              <Text style={styles.promoButtonText}>
                {applyingPromo ? '...' : promoDiscount > 0 ? '✓' : 'Appliquer'}
              </Text>
            </TouchableOpacity>
          </View>
          {promoDiscount > 0 && (
            <View style={styles.promoDiscountRow}>
              <Text style={styles.promoDiscountLabel}>Réduction appliquée</Text>
              <Text style={styles.promoDiscountValue}>
                -{promoDiscount.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
          )}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Résumé de la commande</Text>
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
          {promoDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Réduction</Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>
                -{promoDiscount.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {finalTotal.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.orderButton, loading && styles.orderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          <Text style={styles.orderButtonText}>
            {loading ? 'Traitement...' : 'Confirmer la commande'}
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
  section: {
    backgroundColor: COLORS.white,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  addAddressText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: 12,
  },
  addressCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  addressInfo: {
    flex: 1,
    marginLeft: 12,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: 12,
  },
  paymentCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  paymentText: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 12,
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
  promoContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  promoButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  promoButtonDisabled: {
    backgroundColor: COLORS.success,
  },
  promoButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  promoDiscountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  promoDiscountLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  promoDiscountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  discountValue: {
    color: COLORS.success,
  },
  footer: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  orderButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  orderButtonDisabled: {
    opacity: 0.6,
  },
  orderButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

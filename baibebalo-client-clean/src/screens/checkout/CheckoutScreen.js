import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';
import { getAddresses } from '../../api/users';
import { createOrder, initiatePayment } from '../../api/orders';
import { validatePromoCode } from '../../api/users';

export default function CheckoutScreen({ navigation, route }) {
  const { items, getTotal, clearCart, restaurantId } = useCartStore();
  const { user } = useAuthStore();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentMethodSelected, setPaymentMethodSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [promoApplied, setPromoApplied] = useState(false);

  useEffect(() => {
    loadAddresses();
    const unsubscribe = navigation.addListener('focus', loadAddresses);
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (route?.params?.selectedAddressId) {
      setSelectedAddress(route.params.selectedAddressId);
    }
  }, [route?.params?.selectedAddressId]);

  const loadAddresses = async () => {
    try {
      const response = await getAddresses();
      const userAddresses = response.data?.addresses || response.data?.data?.addresses || [];
      setAddresses(userAddresses);
      if (userAddresses.length > 0 && !selectedAddress) {
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
      const selectedAddressData = addresses.find((address) => address.id === selectedAddress);
      if (!selectedAddressData) {
        Alert.alert('Erreur', 'Adresse de livraison introuvable');
        return;
      }

      if (!selectedAddressData.latitude || !selectedAddressData.longitude) {
        Alert.alert(
          'Adresse incomplète',
          'Veuillez ajouter la localisation GPS de cette adresse avant de commander.'
        );
        return;
      }

      const orderData = {
        restaurant_id: restaurantId,
        delivery_address: {
          label: selectedAddressData.label || selectedAddressData.title || 'Adresse',
          street: selectedAddressData.street || selectedAddressData.address_line || '',
          city: selectedAddressData.city || selectedAddressData.district || '',
          landmark: selectedAddressData.delivery_instructions || selectedAddressData.landmark || '',
          address_line: selectedAddressData.address_line || selectedAddressData.street || '',
          district: selectedAddressData.district || selectedAddressData.city || '',
          latitude: selectedAddressData.latitude,
          longitude: selectedAddressData.longitude,
        },
        payment_method: paymentMethod,
        items: items.map((item) => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          price: item.price,
          selected_options: item.selected_options || item.customizations || {},
        })),
        promo_code: promoCode.trim() || null,
      };

      const response = await createOrder(orderData);
      const createdOrder = response.data?.order || response.data?.data?.order || response.data;
      
      // Si paiement mobile money, initier le paiement
      if (['orange_money', 'mtn_money', 'moov_money'].includes(paymentMethod) && createdOrder?.id) {
        try {
          const userPhoneNumber = user?.phone;
          if (!userPhoneNumber) {
            Alert.alert('Paiement', 'Numéro de téléphone requis pour le paiement.');
          } else {
            await initiatePayment(createdOrder.id, {
              payment_method: paymentMethod,
              phone_number: userPhoneNumber,
            });
          }
        } catch (paymentError) {
          console.error('Erreur lors de l\'initiation du paiement:', paymentError);
          // Continuer quand même, le paiement peut être fait plus tard
        }
      }
      
      clearCart();
      
      // Naviguer vers l'écran de confirmation
      navigation.replace('OrderConfirmation', {
        orderId: createdOrder?.id,
        orderNumber: createdOrder?.order_number || createdOrder?.id,
        estimatedTime: createdOrder?.estimated_delivery_time
          ? `${createdOrder.estimated_delivery_time}`
          : '12:45',
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

  const openPaymentSelection = () => {
    navigation.navigate('PaymentMethod', {
      selectedMethod: paymentMethod,
      itemsCount: items.length,
      itemsTotal: total,
      deliveryFee,
      onSelect: (method) => {
        setPaymentMethod(method);
        setPaymentMethodSelected(true);
      },
    });
  };

  const formatCustomizations = (customizations) => {
    if (!customizations) return 'Personnalisation: aucune';
    if (Array.isArray(customizations)) {
      const values = customizations
        .map((opt) => (typeof opt === 'string' ? opt : opt?.value))
        .filter(Boolean);
      return values.length ? `Suppléments: ${values.join(', ')}` : 'Personnalisation: aucune';
    }
    if (typeof customizations === 'object') {
      const values = Object.values(customizations).filter(Boolean);
      return values.length ? `Suppléments: ${values.join(', ')}` : 'Personnalisation: aucune';
    }
    return 'Personnalisation: aucune';
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      Alert.alert('Code promo', 'Veuillez saisir un code promo.');
      return;
    }

    setApplyingPromo(true);
    try {
      const response = await validatePromoCode(promoCode.trim());
      const discount = response.data?.discount || response.data?.amount || 0;
      if (discount > 0) {
        setPromoDiscount(discount);
        setPromoApplied(true);
      } else {
        Alert.alert('Code promo', 'Code promo invalide ou expiré.');
      }
    } catch (error) {
      Alert.alert(
        'Code promo',
        error.response?.data?.error?.message || 'Impossible d\'appliquer ce code.'
      );
    } finally {
      setApplyingPromo(false);
    }
  };

  const total = getTotal();
  const deliveryFee = 1000;
  const serviceFee = 250;
  const finalTotal = Math.max(0, total + deliveryFee + serviceFee - promoDiscount);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Résumé de la commande</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.progressWrapper}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Progression</Text>
          <Text style={styles.progressBadge}>Étape 2 sur 3</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Address Selection */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Adresse de livraison</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ManageAddresses')}>
              <Text style={styles.cardAction}>Modifier</Text>
            </TouchableOpacity>
          </View>
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
                  size={22}
                  color={selectedAddress === address.id ? COLORS.primary : COLORS.textSecondary}
                />
                <View style={styles.addressInfo}>
                  <Text style={styles.addressLabel}>{address.label || 'Adresse'}</Text>
                  <Text style={styles.addressText}>
                    {[address.street, address.city].filter(Boolean).join(', ')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Delivery Time */}
        <View style={styles.card}>
          <View style={styles.deliveryRow}>
            <View>
              <Text style={styles.deliveryLabel}>Temps d'attente</Text>
              <Text style={styles.deliveryValue}>40-50 min</Text>
              <Text style={styles.deliveryHint}>
                <Ionicons name="time-outline" size={12} color={COLORS.primary} /> Livraison estimée
              </Text>
            </View>
            <View style={styles.deliveryBadge}>
              <Ionicons name="bicycle" size={28} color={COLORS.primary} />
            </View>
          </View>
        </View>

        {/* Promo Code */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Code promo</Text>
          <View style={styles.promoContainer}>
            <TextInput
              style={styles.promoInput}
              placeholder="Entrez un code promo"
              value={promoCode}
              onChangeText={setPromoCode}
              editable={!applyingPromo && !promoApplied}
            />
            <TouchableOpacity
              style={[styles.promoButton, (applyingPromo || promoApplied) && styles.promoButtonDisabled]}
              onPress={handleApplyPromo}
              disabled={applyingPromo || promoApplied}
            >
              <Text style={styles.promoButtonText}>
                {applyingPromo ? '...' : promoApplied ? '✓' : 'Appliquer'}
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
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Méthode de paiement</Text>
            <TouchableOpacity onPress={openPaymentSelection}>
              <Text style={styles.cardAction}>
                {paymentMethodSelected ? 'Modifier' : 'Choisir'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.paymentSummary}>
            <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
            <Text style={styles.paymentSummaryText}>
              {paymentMethod === 'cash' ? 'Espèces' : 'Mobile Money'}
            </Text>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Détails de l'article</Text>
          <View style={styles.itemsList}>
            {items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <Image
                  source={{ uri: item.image_url || 'https://via.placeholder.com/96' }}
                  style={styles.itemImage}
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemMeta} numberOfLines={1}>
                    {formatCustomizations(item.customizations)}
                  </Text>
                  <View style={styles.itemFooter}>
                    <Text style={styles.itemQty}>Quantité: {item.quantity}</Text>
                    <Text style={styles.itemPrice}>
                      {(item.price * item.quantity).toLocaleString('fr-FR')} FCFA
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Price Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Résumé de la commande</Text>
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
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Taxes & Frais de service</Text>
            <Text style={styles.summaryValue}>
              {serviceFee.toLocaleString('fr-FR')} FCFA
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
          onPress={paymentMethodSelected ? handlePlaceOrder : openPaymentSelection}
          disabled={loading}
        >
          <Text style={styles.orderButtonText}>
            {loading
              ? 'Traitement...'
              : paymentMethodSelected
              ? 'Confirmer la commande'
              : 'Continuer vers le paiement'}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 40,
  },
  progressWrapper: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  progressBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    width: '66%',
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: COLORS.white,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardAction: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  deliveryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 6,
  },
  deliveryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  deliveryHint: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  deliveryBadge: {
    width: 72,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  addressCardSelected: {
    backgroundColor: COLORS.primary + '08',
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
  paymentSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  paymentSummaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  itemsList: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: COLORS.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemQty: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
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
    marginTop: 12,
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

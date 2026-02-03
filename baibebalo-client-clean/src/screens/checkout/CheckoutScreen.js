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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';
import { getAddresses } from '../../api/users';
import { createOrder, initiatePayment, calculateFees } from '../../api/orders';
import { validatePromoCode } from '../../api/users';

export default function CheckoutScreen({ navigation, route }) {
  const items = useCartStore((state) => state.items);
  const getTotal = useCartStore((state) => state.getTotal);
  const clearCart = useCartStore((state) => state.clearCart);
  const restaurantId = useCartStore((state) => state.restaurantId);
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/66128188-ae85-488b-8573-429b47c72881',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CheckoutScreen.js:21',message:'CheckoutScreen initialized',data:{itemsCount:items.length,restaurantId:restaurantId||'NULL'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentMethodSelected, setPaymentMethodSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [promoApplied, setPromoApplied] = useState(false);
  
  // Frais calculés dynamiquement
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [serviceFee, setServiceFee] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [loadingFees, setLoadingFees] = useState(false);
  const [feesError, setFeesError] = useState(null);

  useEffect(() => {
    loadAddresses();
    const unsubscribe = navigation.addListener('focus', () => {
      // #region agent log
      const storeState = useCartStore.getState();
      fetch('http://127.0.0.1:7242/ingest/66128188-ae85-488b-8573-429b47c72881',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CheckoutScreen.js:40',message:'CheckoutScreen focused',data:{restaurantId:restaurantId||'NULL',storeRestaurantId:storeState.restaurantId||'NULL',itemsCount:items.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      loadAddresses();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (route?.params?.selectedAddressId) {
      setSelectedAddress(route.params.selectedAddressId);
    }
  }, [route?.params?.selectedAddressId]);

  // Écouter le retour de PaymentMethod avec la méthode sélectionnée
  useEffect(() => {
    if (route?.params?.selectedPaymentMethod) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/66128188-ae85-488b-8573-429b47c72881',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CheckoutScreen.js:50',message:'Payment method received from route params',data:{selectedPaymentMethod:route.params.selectedPaymentMethod},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      setPaymentMethod(route.params.selectedPaymentMethod);
      setPaymentMethodSelected(true);
    }
  }, [route?.params?.selectedPaymentMethod]);

  // Calculer les frais quand l'adresse ou le panier change
  useEffect(() => {
    const loadFees = async () => {
      if (!selectedAddress || !restaurantId || items.length === 0) {
        setDeliveryFee(0);
        setServiceFee(0);
        return;
      }

      setLoadingFees(true);
      setFeesError(null);
      
      try {
        const subtotal = Number(getTotal());
        if (Number.isNaN(subtotal) || subtotal < 0) {
          setDeliveryFee(0);
          setServiceFee(0);
          setLoadingFees(false);
          return;
        }
        const rid = restaurantId && String(restaurantId).trim();
        const aid = selectedAddress && String(selectedAddress).trim();
        if (!rid || !aid) {
          setDeliveryFee(0);
          setServiceFee(0);
          setLoadingFees(false);
          return;
        }
        const response = await calculateFees(rid, aid, subtotal);
        
        if (response?.success) {
          setDeliveryFee(response.data.delivery_fee);
          setServiceFee(response.data.service_fee ?? 0);
          setDistanceKm(response.data.distance_km);
          setFeesError(null);
        }
      } catch (error) {
        const resData = error.response?.data;
        const code = resData?.error?.code;
        const errorMsg = resData?.error?.message;
        const details = resData?.error?.details;
        console.error('Erreur calcul frais:', {
          code,
          message: errorMsg,
          details,
          status: error.response?.status,
          payload: { restaurantId, selectedAddress, subtotal: Number(getTotal()) },
        });
        if (code === 'OUT_OF_DELIVERY_RANGE') {
          setFeesError(
            'Vous ne faites pas partie de la zone de livraison de ce restaurant. Choisissez une adresse plus proche ou un autre restaurant.'
          );
        } else if (details?.length) {
          setFeesError(details.map((d) => d.message).join('. ') || errorMsg || 'Erreur de validation.');
        } else if (errorMsg) {
          setFeesError(errorMsg);
        } else {
          setFeesError('Impossible de calculer les frais. Vérifiez votre adresse ou réessayez.');
        }
        setDeliveryFee(500);
        setServiceFee(0);
      } finally {
        setLoadingFees(false);
      }
    };

    loadFees();
  }, [selectedAddress, restaurantId, items]);

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
    // #region agent log
    const storeState = useCartStore.getState();
    fetch('http://127.0.0.1:7242/ingest/66128188-ae85-488b-8573-429b47c72881',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CheckoutScreen.js:75',message:'handlePlaceOrder entry',data:{selectedAddress:selectedAddress||'NULL',itemsCount:items.length,restaurantId:restaurantId||'NULL',storeRestaurantId:storeState.restaurantId||'NULL',itemsHaveRestaurantId:items.some(i=>i.restaurantId)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    if (!selectedAddress) {
      Alert.alert('Erreur', 'Veuillez sélectionner une adresse de livraison');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Erreur', 'Votre panier est vide');
      return;
    }

    // Récupérer restaurantId depuis le store directement (fallback si la réactivité échoue)
    const currentRestaurantId = restaurantId || useCartStore.getState().restaurantId;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/66128188-ae85-488b-8573-429b47c72881',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CheckoutScreen.js:95',message:'RestaurantId check',data:{restaurantIdFromHook:restaurantId||'NULL',currentRestaurantId:currentRestaurantId||'NULL'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    if (!currentRestaurantId) {
      Alert.alert('Erreur', 'Restaurant non identifié. Veuillez recommencer votre commande.');
      return;
    }

    setLoading(true);
    try {
      const selectedAddressData = addresses.find((address) => address.id === selectedAddress);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/66128188-ae85-488b-8573-429b47c72881',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CheckoutScreen.js:77',message:'Address data found',data:{addressFound:!!selectedAddressData,addressKeys:selectedAddressData?Object.keys(selectedAddressData):[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (!selectedAddressData) {
        Alert.alert('Erreur', 'Adresse de livraison introuvable');
        setLoading(false);
        return;
      }

      const orderData = {
        restaurant_id: currentRestaurantId,
        delivery_address: {
          label: selectedAddressData.label || selectedAddressData.title || 'Adresse',
          street: selectedAddressData.street || selectedAddressData.address_line || '',
          city: selectedAddressData.city || selectedAddressData.district || '',
          landmark: selectedAddressData.delivery_instructions || selectedAddressData.landmark || '',
          address_line: selectedAddressData.address_line || selectedAddressData.street || '',
          district: selectedAddressData.district || selectedAddressData.city || '',
          latitude: selectedAddressData.latitude || 0,
          longitude: selectedAddressData.longitude || 0,
        },
        payment_method: paymentMethod,
        items: items.map((item) => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/66128188-ae85-488b-8573-429b47c72881',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CheckoutScreen.js:96',message:'Mapping item for order',data:{itemId:item.id,hasSelectedOptions:!!item.selected_options,hasCustomizations:!!item.customizations},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          const itemData = {
            menu_item_id: item.id,
            quantity: item.quantity,
            price: item.price,
          };
          
          // Ajouter selected_options seulement s'il existe et n'est pas vide
          const options = item.selected_options || item.customizations;
          if (options && typeof options === 'object' && Object.keys(options).length > 0) {
            itemData.selected_options = options;
          }
          
          return itemData;
        }),
      };

      // Ajouter promo_code seulement s'il n'est pas vide
      if (promoCode.trim()) {
        orderData.promo_code = promoCode.trim();
      }

      console.log('📦 Données commande envoyées:', JSON.stringify(orderData, null, 2));

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
        }
      }
      
      clearCart();
      
      navigation.replace('OrderConfirmation', {
        orderId: createdOrder?.id,
        orderNumber: createdOrder?.order_number || createdOrder?.id,
        estimatedTime: createdOrder?.estimated_delivery_time
          ? `${createdOrder.estimated_delivery_time}`
          : '12:45',
      });
    } catch (error) {
      console.error('❌ Erreur création commande:', error);
      console.error('❌ Détails erreur:', error.response?.data);
      
      const errorMessage = 
        error.response?.data?.error?.message || 
        error.response?.data?.message ||
        error.message ||
        'Erreur lors de la création de la commande';
      
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const openPaymentSelection = () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/66128188-ae85-488b-8573-429b47c72881',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CheckoutScreen.js:180',message:'openPaymentSelection called',data:{paymentMethod,itemsLength:items.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    const currentTotal = getTotal();
    const currentDeliveryFee = 1000;
    navigation.navigate('PaymentMethod', {
      selectedMethod: paymentMethod,
      itemsCount: items.length,
      itemsTotal: currentTotal,
      deliveryFee: currentDeliveryFee,
      returnRoute: 'Checkout',
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
  const finalTotal = Math.max(0, total + deliveryFee - promoDiscount);

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
                    {[address.street || address.address_line, address.city || address.district].filter(Boolean).join(', ')}
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
                    {formatCustomizations(item.selected_options || item.customizations)}
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
            <View style={styles.summaryLabelRow}>
              <Text style={styles.summaryLabel}>Frais de livraison</Text>
              {distanceKm > 0 && (
                <Text style={styles.summarySubLabel}>({distanceKm.toFixed(1)} km)</Text>
              )}
            </View>
            <Text style={styles.summaryValue}>
              {loadingFees ? '...' : `${deliveryFee.toLocaleString('fr-FR')} FCFA`}
            </Text>
          </View>
          {feesError && (
            <View style={styles.errorRow}>
              <Ionicons name="warning" size={14} color={COLORS.error || '#E53E3E'} />
              <Text style={styles.errorText}>{feesError}</Text>
            </View>
          )}
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

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
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
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summarySubLabel: {
    fontSize: 12,
    color: COLORS.textLight || '#999',
  },
  summaryValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error || '#E53E3E',
    flex: 1,
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
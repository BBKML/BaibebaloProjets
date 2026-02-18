import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { getAddresses } from '../../api/users';
import { calculateExpressFees, createExpressOrder } from '../../api/orders';
import { formatCurrency } from '../../utils/format';

export default function ExpressCheckoutScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [addresses, setAddresses] = useState([]);
  const [pickupAddressId, setPickupAddressId] = useState(null);
  const [deliveryAddressId, setDeliveryAddressId] = useState(null);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [expressDescription, setExpressDescription] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [loadingFees, setLoadingFees] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feesError, setFeesError] = useState(null);

  useEffect(() => {
    loadAddresses();
  }, []);

  useEffect(() => {
    const p = route.params || {};
    if (p.pickupAddressId) {
      setPickupAddressId(p.pickupAddressId);
      navigation.setParams({ pickupAddressId: undefined });
    }
    if (p.deliveryAddressId) {
      setDeliveryAddressId(p.deliveryAddressId);
      navigation.setParams({ deliveryAddressId: undefined });
    }
  }, [route.params?.pickupAddressId, route.params?.deliveryAddressId]);

  useEffect(() => {
    if (pickupAddressId && deliveryAddressId && pickupAddressId !== deliveryAddressId) {
      loadFees();
    } else {
      setDeliveryFee(0);
      setDistanceKm(0);
      setFeesError(null);
    }
  }, [pickupAddressId, deliveryAddressId]);

  const loadAddresses = async () => {
    try {
      const response = await getAddresses();
      const addrs = response.data?.addresses || response.data?.data?.addresses || response.addresses || [];
      setAddresses(addrs);
      if (addrs.length > 0 && !pickupAddressId) setPickupAddressId(addrs[0].id);
      if (addrs.length > 1 && !deliveryAddressId) setDeliveryAddressId(addrs[1].id);
      else if (addrs.length === 1 && !deliveryAddressId) setDeliveryAddressId(addrs[0].id);
    } catch (err) {
      console.error('Erreur chargement adresses:', err);
    }
  };

  const loadFees = async () => {
    if (!pickupAddressId || !deliveryAddressId || pickupAddressId === deliveryAddressId) return;
    setLoadingFees(true);
    setFeesError(null);
    try {
      const response = await calculateExpressFees(pickupAddressId, deliveryAddressId);
      if (response?.success && response?.data) {
        setDeliveryFee(response.data.delivery_fee || 0);
        setDistanceKm(response.data.distance_km || 0);
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Erreur calcul des frais';
      setFeesError(msg);
      setDeliveryFee(0);
    } finally {
      setLoadingFees(false);
    }
  };

  const handleSubmit = async () => {
    if (!pickupAddressId || !deliveryAddressId) {
      Alert.alert('Erreur', 'Veuillez sélectionner les adresses de collecte et de livraison.');
      return;
    }
    if (pickupAddressId === deliveryAddressId) {
      Alert.alert('Erreur', 'L\'adresse de collecte et de livraison doivent être différentes.');
      return;
    }
    if (deliveryFee <= 0) {
      Alert.alert('Erreur', 'Impossible de calculer les frais. Vérifiez vos adresses.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await createExpressOrder({
        pickup_address_id: pickupAddressId,
        delivery_address_id: deliveryAddressId,
        recipient_name: recipientName.trim() || undefined,
        recipient_phone: recipientPhone.trim() || undefined,
        express_description: expressDescription.trim() || undefined,
        special_instructions: specialInstructions.trim() || undefined,
        payment_method: 'cash',
      });

      if (response?.success && response?.data?.order) {
        navigation.navigate('OrderTracking', { orderId: response.data.order.id });
      } else {
        Alert.alert('Erreur', response?.error?.message || 'Échec de la création');
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Erreur lors de la création';
      Alert.alert('Erreur', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const pickupAddr = addresses.find((a) => a.id === pickupAddressId);
  const deliveryAddr = addresses.find((a) => a.id === deliveryAddressId);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Livraison express</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Point de collecte</Text>
        <TouchableOpacity
          style={styles.addressCard}
          onPress={() => navigation.navigate('AddressSelection', {
            returnTo: 'ExpressCheckout',
            returnParamKey: 'pickupAddressId',
          })}
        >
          <Ionicons name="cube-outline" size={24} color={COLORS.primary} />
          <View style={styles.addressInfo}>
            <Text style={styles.addressLabel}>Où récupérer le colis</Text>
            <Text style={styles.addressText}>
              {pickupAddr ? `${pickupAddr.street || pickupAddr.address_line || ''}, ${pickupAddr.city || pickupAddr.district || ''}` : 'Choisir une adresse'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Adresse de livraison</Text>
        <TouchableOpacity
          style={styles.addressCard}
          onPress={() => navigation.navigate('AddressSelection', {
            returnTo: 'ExpressCheckout',
            returnParamKey: 'deliveryAddressId',
          })}
        >
          <Ionicons name="location-outline" size={24} color={COLORS.primary} />
          <View style={styles.addressInfo}>
            <Text style={styles.addressLabel}>Où livrer</Text>
            <Text style={styles.addressText}>
              {deliveryAddr ? `${deliveryAddr.street || deliveryAddr.address_line || ''}, ${deliveryAddr.city || deliveryAddr.district || ''}` : 'Choisir une adresse'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Destinataire (optionnel)</Text>
        <TextInput
          style={styles.input}
          placeholder="Nom du destinataire"
          value={recipientName}
          onChangeText={setRecipientName}
          placeholderTextColor={COLORS.textSecondary}
          returnKeyType="next"
          blurOnSubmit={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Téléphone destinataire"
          value={recipientPhone}
          onChangeText={setRecipientPhone}
          keyboardType="phone-pad"
          placeholderTextColor={COLORS.textSecondary}
          returnKeyType="next"
          blurOnSubmit={false}
        />

        <Text style={styles.sectionTitle}>Description du colis (optionnel)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Ex: Documents, clé, petit colis..."
          value={expressDescription}
          onChangeText={setExpressDescription}
          placeholderTextColor={COLORS.textSecondary}
          multiline
          blurOnSubmit={false}
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Instructions spéciales"
          value={specialInstructions}
          onChangeText={setSpecialInstructions}
          placeholderTextColor={COLORS.textSecondary}
          multiline
          blurOnSubmit={false}
        />

        {loadingFees ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
        ) : feesError ? (
          <Text style={styles.errorText}>{feesError}</Text>
        ) : pickupAddressId && deliveryAddressId && pickupAddressId !== deliveryAddressId && (
          <View style={styles.feesBox}>
            <Text style={styles.feesLabel}>Distance: {distanceKm?.toFixed(1) || 0} km</Text>
            <Text style={styles.feesAmount}>{formatCurrency(deliveryFee)}</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{formatCurrency(deliveryFee)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.submitBtn, (submitting || deliveryFee <= 0) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting || deliveryFee <= 0}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitBtnText}>Confirmer la livraison</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 20,
    marginBottom: 8,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addressInfo: { flex: 1, marginLeft: 12 },
  addressLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  addressText: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 12,
  },
  textArea: { minHeight: 60 },
  loader: { marginVertical: 16 },
  errorText: { color: COLORS.error, fontSize: 14, marginVertical: 8 },
  feesBox: {
    backgroundColor: COLORS.primary + '15',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feesLabel: { fontSize: 14, color: COLORS.textSecondary },
  feesAmount: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  totalAmount: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import {
  getOrdersPendingCashRemittance,
  createCashRemittance,
  getCashRemittanceInfo,
} from '../../api/earnings';

export default function CashRemittanceScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [totalPendingAmount, setTotalPendingAmount] = useState(0);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [method, setMethod] = useState('agency');
  const [reference, setReference] = useState('');
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState('orange_money');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [baibebaloMobileMoneyNumber, setBaibebaloMobileMoneyNumber] = useState('+225XXXXXXXXX');

  const loadPending = useCallback(async () => {
    try {
      const res = await getOrdersPendingCashRemittance();
      if (res?.success && res?.data) {
        setOrders(res.data.orders || []);
        setTotalPendingAmount(res.data.total_pending_amount || 0);
        setSelectedIds(new Set((res.data.orders || []).map((o) => o.id)));
      } else {
        setOrders([]);
        setTotalPendingAmount(0);
      }
    } catch (e) {
      setOrders([]);
      setTotalPendingAmount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPending();
  };

  const toggleOrder = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  };

  const selectedOrders = orders.filter((o) => selectedIds.has(o.id));
  const selectedTotal = selectedOrders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
  const canSubmit = selectedOrders.length > 0 && Math.abs(selectedTotal - totalPendingAmount) < 0.02;

  const handleSubmit = async () => {
    if (selectedOrders.length === 0) {
      Alert.alert('Erreur', 'Sélectionnez au moins une commande.');
      return;
    }
    const amount = Math.round(selectedTotal * 100) / 100;
    const orderIds = selectedOrders.map((o) => o.id);
    const expectedTotal = selectedOrders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
    if (Math.abs(amount - expectedTotal) > 0.01) {
      Alert.alert('Erreur', `Le montant doit correspondre au total des commandes: ${expectedTotal.toFixed(0)} FCFA`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await createCashRemittance({
        amount,
        method,
        order_ids: orderIds,
        reference: reference.trim() || undefined,
      });
      if (res?.success) {
        Alert.alert(
          'Remise enregistrée',
          method === 'agency'
            ? "Présentez-vous à l'agence avec cet argent pour validation."
            : method === 'mobile_money_deposit'
            ? "Dépôt Mobile Money enregistré. L'admin validera après vérification du dépôt."
            : "Après avoir effectué le virement, l'admin validera après vérification.",
          [
            {
              text: 'Voir l\'historique',
              onPress: () => navigation.navigate('CashRemittanceHistory'),
            },
            {
              text: 'OK',
              onPress: () => {
                loadPending();
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert('Erreur', res?.error?.message || 'Erreur lors de la déclaration.');
      }
    } catch (e) {
      Alert.alert(
        'Erreur',
        e.response?.data?.error?.message || 'Erreur lors de la déclaration de la remise.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Remises espèces</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Remises espèces</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CashRemittanceHistory')}>
          <Text style={styles.historyLink}>Historique</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={22} color={COLORS.info} />
          <Text style={styles.infoText}>
            Remettez l'intégralité des encaissements (sans enlever votre part). Choisissez : remise à l'agence ou dépôt sur le compte entreprise.
          </Text>
        </View>

        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={64} color={COLORS.success} />
            <Text style={styles.emptyTitle}>Aucune commande à remettre</Text>
            <Text style={styles.emptySubtext}>
              Les commandes espèces livrées dont la remise n'a pas encore été validée apparaîtront ici.
            </Text>
            <TouchableOpacity style={styles.historyButton} onPress={() => navigation.navigate('CashRemittanceHistory')}>
              <Text style={styles.historyButtonText}>Voir l'historique des remises</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.selectAllRow} onPress={selectAll}>
              <Text style={styles.selectAllText}>
                {selectedIds.size === orders.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </Text>
            </TouchableOpacity>

            <View style={styles.ordersList}>
              {orders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={[styles.orderRow, selectedIds.has(order.id) && styles.orderRowSelected]}
                  onPress={() => toggleOrder(order.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.orderCheck}>
                    <Ionicons
                      name={selectedIds.has(order.id) ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={selectedIds.has(order.id) ? COLORS.primary : COLORS.textLight}
                    />
                  </View>
                  <View style={styles.orderContent}>
                    <Text style={styles.orderNumber}>#{order.order_number}</Text>
                    <Text style={styles.orderRestaurant} numberOfLines={1}>{order.restaurant_name || 'Restaurant'}</Text>
                    <Text style={styles.orderDate}>
                      {order.delivered_at
                        ? new Date(order.delivered_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : ''}
                    </Text>
                  </View>
                  <Text style={styles.orderTotal}>{parseFloat(order.total || 0).toLocaleString()} F</Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedOrders.length > 0 && (
              <>
                <View style={styles.totalCard}>
                  <Text style={styles.totalLabel}>Total à remettre</Text>
                  <Text style={styles.totalAmount}>{selectedTotal.toLocaleString()} FCFA</Text>
                </View>

                <Text style={styles.methodLabel}>Comment remettez-vous l'argent ?</Text>
                <View style={styles.methodRow}>
                  <TouchableOpacity
                    style={[styles.methodButton, method === 'agency' && styles.methodButtonActive]}
                    onPress={() => setMethod('agency')}
                  >
                    <Ionicons name="business-outline" size={24} color={method === 'agency' ? '#FFF' : COLORS.text} />
                    <Text style={[styles.methodButtonText, method === 'agency' && styles.methodButtonTextActive]}>
                      À l'agence
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.methodButton, method === 'bank_deposit' && styles.methodButtonActive]}
                    onPress={() => setMethod('bank_deposit')}
                  >
                    <Ionicons name="card-outline" size={24} color={method === 'bank_deposit' ? '#FFF' : COLORS.text} />
                    <Text style={[styles.methodButtonText, method === 'bank_deposit' && styles.methodButtonTextActive]}>
                      Dépôt compte
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity
                  style={[styles.methodButton, styles.methodButtonFull, method === 'mobile_money_deposit' && styles.methodButtonActive]}
                  onPress={() => setMethod('mobile_money_deposit')}
                >
                  <Ionicons name="phone-portrait-outline" size={24} color={method === 'mobile_money_deposit' ? '#FFF' : COLORS.text} />
                  <Text style={[styles.methodButtonText, method === 'mobile_money_deposit' && styles.methodButtonTextActive]}>
                    Dépôt Mobile Money
                  </Text>
                </TouchableOpacity>

                {method === 'bank_deposit' && (
                  <TextInput
                    style={styles.referenceInput}
                    placeholder="Référence du virement (optionnel)"
                    placeholderTextColor={COLORS.textLight}
                    value={reference}
                    onChangeText={setReference}
                  />
                )}
                
                {method === 'mobile_money_deposit' && (
                  <>
                    <View style={styles.mobileMoneyInfo}>
                      <Ionicons name="information-circle-outline" size={20} color={COLORS.info} />
                      <Text style={styles.mobileMoneyInfoText}>
                        Faites un dépôt Mobile Money sur le numéro Baibebalo :{' '}
                        <Text style={styles.mobileMoneyNumber}>{baibebaloMobileMoneyNumber}</Text>
                      </Text>
                    </View>
                    
                    <Text style={styles.providerLabel}>Provider Mobile Money</Text>
                    <View style={styles.providerRow}>
                      <TouchableOpacity
                        style={[styles.providerButton, mobileMoneyProvider === 'orange_money' && styles.providerButtonActive]}
                        onPress={() => setMobileMoneyProvider('orange_money')}
                      >
                        <Text style={[styles.providerButtonText, mobileMoneyProvider === 'orange_money' && styles.providerButtonTextActive]}>
                          Orange Money
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.providerButton, mobileMoneyProvider === 'mtn_money' && styles.providerButtonActive]}
                        onPress={() => setMobileMoneyProvider('mtn_money')}
                      >
                        <Text style={[styles.providerButtonText, mobileMoneyProvider === 'mtn_money' && styles.providerButtonTextActive]}>
                          MTN MoMo
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.providerButton, mobileMoneyProvider === 'waves' && styles.providerButtonActive]}
                        onPress={() => setMobileMoneyProvider('waves')}
                      >
                        <Text style={[styles.providerButtonText, mobileMoneyProvider === 'waves' && styles.providerButtonTextActive]}>
                          Wave
                        </Text>
                      </TouchableOpacity>
                    </View>
                    
                    <TextInput
                      style={styles.referenceInput}
                      placeholder="Numéro de transaction Mobile Money (obligatoire)"
                      placeholderTextColor={COLORS.textLight}
                      value={reference}
                      onChangeText={setReference}
                    />
                  </>
                )}

                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  disabled={submitting}
                  onPress={handleSubmit}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Déclarer la remise</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  placeholder: { width: 40 },
  historyLink: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.info + '15',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 13, color: COLORS.info },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },
  historyButton: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: COLORS.primary, borderRadius: 12 },
  historyButtonText: { color: '#FFF', fontWeight: '600' },
  selectAllRow: { marginBottom: 12 },
  selectAllText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  ordersList: { gap: 8, marginBottom: 20 },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  orderRowSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  orderCheck: { marginRight: 12 },
  orderContent: { flex: 1 },
  orderNumber: { fontSize: 14, fontWeight: 'bold', color: COLORS.text },
  orderRestaurant: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  orderDate: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  orderTotal: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  totalCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  totalAmount: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
  methodLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  methodRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  methodButtonFull: {
    flex: 1,
    width: '100%',
    marginBottom: 16,
  },
  methodButtonActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  methodButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  methodButtonTextActive: { color: '#FFF' },
  mobileMoneyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.info + '15',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  mobileMoneyInfoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.info,
    lineHeight: 20,
  },
  mobileMoneyNumber: {
    fontWeight: 'bold',
    fontSize: 14,
    color: COLORS.primary,
  },
  providerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  providerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  providerButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  providerButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  providerButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  providerButtonTextActive: {
    color: '#FFF',
  },
  referenceInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    fontSize: 14,
    color: COLORS.text,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getPayoutHistory } from '../../api/earnings';

function formatDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatStatus(status) {
  if (!status) return 'En attente';
  if (status === 'completed' || status === 'success' || status === 'paid') return 'Effectué';
  if (status === 'pending') return 'En attente';
  if (status === 'failed' || status === 'rejected') return 'Échoué';
  return status;
}

export default function PaymentHistoryScreen({ navigation }) {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadPayouts = async () => {
    try {
      setError(null);
      const res = await getPayoutHistory(1, 50);
      if (res?.success && res?.data?.payouts) {
        setPayouts(res.data.payouts);
      } else {
        setPayouts([]);
      }
    } catch (e) {
      console.error('Erreur chargement historique paiements:', e);
      setError('Impossible de charger l\'historique');
      setPayouts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPayouts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadPayouts();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Historique des paiements</Text>
        <View style={styles.placeholder} />
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.textLight} />
          <Text style={styles.emptyStateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); loadPayouts(); }}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={payouts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, payouts.length === 0 && styles.listEmpty]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyStateText}>Aucun paiement</Text>
              <Text style={styles.emptyStateSubtext}>Vos retraits apparaîtront ici</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.paymentItem}>
              <View style={styles.paymentIcon}>
                <Ionicons name="arrow-down" size={20} color={COLORS.info} />
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentDate}>{formatDate(item.created_at)}</Text>
                <Text style={styles.paymentMethod}>
                  {item.payment_reference || 'Mobile Money'} · {formatStatus(item.status)}
                </Text>
              </View>
              <Text style={styles.paymentAmount}>
                -{Number(item.amount || 0).toLocaleString()} F
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  placeholder: { width: 40 },
  list: { padding: 16 },
  listEmpty: { flexGrow: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyStateText: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  retryButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: COLORS.primary, borderRadius: 12 },
  retryButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  paymentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  paymentIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.info + '15', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  paymentInfo: { flex: 1 },
  paymentDate: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  paymentMethod: { fontSize: 12, color: COLORS.textSecondary },
  paymentAmount: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
});

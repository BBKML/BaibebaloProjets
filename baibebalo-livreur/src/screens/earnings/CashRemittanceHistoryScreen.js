import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getMyCashRemittances } from '../../api/earnings';

const statusLabel = {
  pending: 'En attente',
  completed: 'Validée',
  rejected: 'Rejetée',
};

const statusColor = {
  pending: COLORS.warning,
  completed: COLORS.success,
  rejected: COLORS.error,
};

const methodLabel = {
  agency: 'Remise à l\'agence',
  bank_deposit: 'Dépôt sur compte',
};

export default function CashRemittanceHistoryScreen({ navigation }) {
  const [remittances, setRemittances] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (page = 1, refresh = false) => {
    if (refresh) setRefreshing(true);
    else if (page === 1) setLoading(true);
    try {
      const res = await getMyCashRemittances(page, 20);
      if (res?.success && res?.data) {
        const list = res.data.remittances || [];
        setRemittances((prev) => (page === 1 ? list : [...prev, ...list]));
        setPagination({
          page: res.data.pagination?.page || 1,
          total: res.data.pagination?.total || 0,
        });
      }
    } catch (e) {
      if (page === 1) setRemittances([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const onRefresh = () => load(1, true);

  const renderItem = ({ item }) => {
    const status = item.status || 'pending';
    const ordersCount = item.orders_count ?? (Array.isArray(item.orders) ? item.orders.length : 0);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.amount}>{parseFloat(item.amount || 0).toLocaleString()} FCFA</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor[status] + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor[status] }]}>
              {statusLabel[status]}
            </Text>
          </View>
        </View>
        <Text style={styles.method}>{methodLabel[item.method] || item.method}</Text>
        <Text style={styles.ordersCount}>{ordersCount} commande(s)</Text>
        <Text style={styles.date}>
          {item.created_at
            ? new Date(item.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : ''}
        </Text>
        {item.processed_at && (
          <Text style={styles.processedAt}>
            Traitée le {new Date(item.processed_at).toLocaleDateString('fr-FR')}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Historique des remises</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={remittances}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color={COLORS.textLight} />
              <Text style={styles.emptyText}>Aucune remise pour le moment</Text>
              <TouchableOpacity style={styles.newRemittanceButton} onPress={() => navigation.navigate('CashRemittance')}>
                <Text style={styles.newRemittanceButtonText}>Déclarer une remise</Text>
              </TouchableOpacity>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
        />
      )}
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
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  amount: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  method: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 },
  ordersCount: { fontSize: 13, color: COLORS.textLight, marginBottom: 4 },
  date: { fontSize: 12, color: COLORS.textLight },
  processedAt: { fontSize: 11, color: COLORS.textLight, marginTop: 6 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 16 },
  newRemittanceButton: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: COLORS.primary, borderRadius: 12 },
  newRemittanceButtonText: { color: '#FFF', fontWeight: '600' },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { restaurantFinance } from '../../api/finance';

export default function TransactionHistoryScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [filters, setFilters] = useState({
    period: 'month',
    type: 'all',
  });
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  const loadTransactions = async () => {
    try {
      // Convertir les filtres de période en dates
      const dateFilters = {};
      const now = new Date();
      if (filters.period === 'today') {
        dateFilters.start_date = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        dateFilters.end_date = new Date().toISOString();
      } else if (filters.period === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilters.start_date = weekAgo.toISOString();
        dateFilters.end_date = new Date().toISOString();
      } else if (filters.period === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilters.start_date = monthAgo.toISOString();
        dateFilters.end_date = new Date().toISOString();
      }
      
      const response = await restaurantFinance.getTransactions({ ...filters, ...dateFilters });
      // Le backend retourne { success: true, data: { earnings: [...], transactions: [...] } }
      const transactionsData = response.data?.transactions || response.data?.earnings || response.transactions || [];
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const renderTransaction = ({ item }) => {
    const isCredit = item.type === 'credit' || item.amount > 0;
    const isWithdrawal = item.type === 'withdrawal';

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionIconContainer}>
            <Ionicons
              name={isWithdrawal ? 'arrow-down-circle' : 'arrow-up-circle'}
              size={24}
              color={isCredit ? COLORS.success : COLORS.error}
            />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionDescription}>{item.description}</Text>
            <Text style={styles.transactionDate}>
              {new Date(item.date).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <View style={styles.transactionAmountContainer}>
            <Text
              style={[
                styles.transactionAmount,
                isCredit ? styles.transactionAmountCredit : styles.transactionAmountDebit,
              ]}
            >
              {isCredit ? '+' : '-'}
              {Math.abs(item.amount).toLocaleString('fr-FR')} FCFA
            </Text>
            {item.status && (
              <View style={[styles.statusBadge, item.status === 'completed' && styles.statusBadgeCompleted]}>
                <Text style={styles.statusText}>
                  {item.status === 'completed' ? '✅' : '⏳'}
                </Text>
              </View>
            )}
          </View>
        </View>
        {item.details && (
          <View style={styles.transactionDetails}>
            {item.details.commission && (
              <Text style={styles.detailText}>
                Commission : -{item.details.commission.toLocaleString('fr-FR')} FCFA
              </Text>
            )}
            {item.details.orderNumber && (
              <Text style={styles.detailText}>
                Commande : #{item.details.orderNumber}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const periods = [
    { key: 'today', label: "Aujourd'hui" },
    { key: 'week', label: 'Cette semaine' },
    { key: 'month', label: 'Ce mois' },
    { key: 'all', label: 'Tout' },
  ];

  const types = [
    { key: 'all', label: 'Toutes' },
    { key: 'credit', label: 'Revenus' },
    { key: 'withdrawal', label: 'Retraits' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Historique des transactions</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filtres */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Période :</Text>
            {periods.map((period) => (
              <TouchableOpacity
                key={period.key}
                style={[
                  styles.filterChip,
                  filters.period === period.key && styles.filterChipActive,
                ]}
                onPress={() => setFilters({ ...filters, period: period.key })}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filters.period === period.key && styles.filterChipTextActive,
                  ]}
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Type :</Text>
            {types.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.filterChip,
                  filters.type === type.key && styles.filterChipActive,
                ]}
                onPress={() => setFilters({ ...filters, type: type.key })}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filters.type === type.key && styles.filterChipTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Liste des transactions */}
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Aucune transaction</Text>
            <Text style={styles.emptySubtext}>
              Vos transactions apparaîtront ici
            </Text>
          </View>
        }
      />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 36,
  },
  filtersContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filtersScroll: {
    paddingVertical: 12,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  list: {
    padding: 20,
  },
  transactionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionAmountCredit: {
    color: COLORS.success,
  },
  transactionAmountDebit: {
    color: COLORS.error,
  },
  statusBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.warning + '15',
  },
  statusBadgeCompleted: {
    backgroundColor: COLORS.success + '15',
  },
  statusText: {
    fontSize: 12,
  },
  transactionDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});

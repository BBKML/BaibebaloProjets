import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  ScrollView,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useDeliveryStore from '../../store/deliveryStore';

export default function EarningsScreen({ navigation }) {
  const { 
    earningsData, 
    fetchEarnings, 
    recentDeliveries,
    isLoading 
  } = useDeliveryStore();
  
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEarnings();
    setRefreshing(false);
  };

  // Données depuis le store (connectées au backend)
  const balance = earningsData.available_balance;
  const todayEarnings = earningsData.today;
  const weekEarnings = earningsData.this_week;
  const monthEarnings = earningsData.this_month;
  const totalDeliveries = earningsData.total_deliveries;

  // Afficher loading au premier chargement
  if (isLoading && balance === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement des gains...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Mes gains</Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>SOLDE DISPONIBLE</Text>
          <Text style={styles.balanceAmount}>{balance.toLocaleString()} FCFA</Text>
          <TouchableOpacity 
            style={[styles.withdrawButton, balance < 5000 && styles.withdrawButtonDisabled]}
            onPress={() => balance >= 5000 && navigation.navigate('WithdrawRequest')}
            disabled={balance < 5000}
          >
            <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
            <Text style={styles.withdrawButtonText}>
              {balance < 5000 ? 'Min. 5 000 F' : 'Demander un paiement'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statCard}>
            <Text style={styles.statLabel}>Aujourd'hui</Text>
            <Text style={styles.statValue}>{todayEarnings.toLocaleString()} F</Text>
            <Text style={styles.statInfo}>
              {recentDeliveries.filter(d => d.date === "Aujourd'hui").length} courses
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('WeeklyEarnings')}
          >
            <Text style={styles.statLabel}>Cette semaine</Text>
            <Text style={styles.statValue}>{weekEarnings.toLocaleString()} F</Text>
            <Text style={styles.statInfo}>Voir détails →</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('MonthlyEarnings')}
          >
            <Text style={styles.statLabel}>Ce mois</Text>
            <Text style={styles.statValue}>{monthEarnings.toLocaleString()} F</Text>
            <Text style={styles.statInfo}>Voir détails →</Text>
          </TouchableOpacity>
        </View>

        {/* Total Stats */}
        <View style={styles.totalStatsCard}>
          <View style={styles.totalStatItem}>
            <Ionicons name="trophy-outline" size={24} color={COLORS.primary} />
            <Text style={styles.totalStatValue}>{earningsData.total_earnings.toLocaleString()} F</Text>
            <Text style={styles.totalStatLabel}>Total gagné</Text>
          </View>
          <View style={styles.totalStatDivider} />
          <View style={styles.totalStatItem}>
            <Ionicons name="bicycle-outline" size={24} color={COLORS.success} />
            <Text style={styles.totalStatValue}>{totalDeliveries}</Text>
            <Text style={styles.totalStatLabel}>Livraisons</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('PaymentHistory')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="time-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.actionText}>Historique des paiements</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('EarningsDashboard')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="bar-chart-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.actionText}>Détails des gains</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('CashRemittance')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="cash-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.actionText}>Remises espèces</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Livraisons récentes</Text>
        </View>

        <View style={styles.transactionsList}>
          {recentDeliveries.length > 0 ? (
            recentDeliveries.slice(0, 5).map((delivery, index) => (
              <View key={delivery.id || index} style={styles.transactionItem}>
                <View style={[styles.transactionIcon, styles.transactionIconDelivery]}>
                  <Ionicons name="bicycle" size={20} color={COLORS.success} />
                </View>
                <View style={styles.transactionContent}>
                  <Text style={styles.transactionTitle}>{delivery.restaurant}</Text>
                  <Text style={styles.transactionTime}>{delivery.time} - {delivery.date}</Text>
                </View>
                <Text style={styles.transactionAmount}>+{delivery.amount.toLocaleString()} F</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyStateText}>Aucune livraison récente</Text>
              <Text style={styles.emptyStateSubtext}>
                Vos gains apparaîtront ici après vos livraisons
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  balanceCard: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  withdrawButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statInfo: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  transactionsList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionIconDelivery: {
    backgroundColor: COLORS.success + '15',
  },
  transactionIconBonus: {
    backgroundColor: COLORS.warning + '15',
  },
  transactionIconWithdraw: {
    backgroundColor: COLORS.info + '15',
  },
  transactionContent: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  transactionTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  transactionAmountNegative: {
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  withdrawButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  totalStatsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  totalStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
  },
  totalStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  totalStatDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});

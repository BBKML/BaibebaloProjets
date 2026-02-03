import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { restaurantFinance } from '../../api/finance';
import useRestaurantStore from '../../store/restaurantStore';

export default function FinancialDashboardScreen({ navigation }) {
  const { setFinancialData } = useRestaurantStore();
  const [financialData, setLocalFinancialData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      const response = await restaurantFinance.getFinancialDashboard('month');
      // Le backend retourne { success: true, data: { earnings: {...} } }
      const earningsData = response.data?.earnings || response.earnings || response.data;
      
      // Adapter les données au format attendu par l'écran
      const adaptedData = {
        availableBalance: earningsData?.available_balance || earningsData?.balance || 0,
        monthlyRevenue: earningsData?.total_revenue || earningsData?.revenue || 0,
        monthlyCommission: earningsData?.total_commission || earningsData?.commission || 0,
        monthlyWithdrawals: earningsData?.total_withdrawals || earningsData?.withdrawals || 0,
        grossRevenue: earningsData?.gross_revenue || earningsData?.revenue || 0,
        totalCommission: earningsData?.total_commission || earningsData?.commission || 0,
        deliveryFees: earningsData?.delivery_fees || 0,
        netRevenue: earningsData?.net_revenue || earningsData?.revenue || 0,
        commissionRate: earningsData?.commission_rate || 15,
        forecast: earningsData?.forecast || null,
      };
      
      setLocalFinancialData(adaptedData);
      setFinancialData(adaptedData);
    } catch (error) {
      console.error('Error loading financial data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFinancialData();
    setRefreshing(false);
  };

  if (!financialData) {
    return (
      <View style={styles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Gestion Financière</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Solde disponible */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>SOLDE DISPONIBLE</Text>
          <Text style={styles.balanceValue}>
            {financialData.availableBalance?.toLocaleString('fr-FR') || '0'} FCFA
          </Text>
          <TouchableOpacity
            style={styles.withdrawalButton}
            onPress={() => navigation.navigate('WithdrawalRequest')}
          >
            <Text style={styles.withdrawalButtonText}>Demander un retrait</Text>
          </TouchableOpacity>
        </View>

        {/* Statistiques */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>
              {financialData.monthlyRevenue?.toLocaleString('fr-FR') || '0'} FCFA
            </Text>
            <Text style={styles.statLabel}>CA ce mois</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.warning + '15' }]}>
            <Ionicons name="trending-down" size={24} color={COLORS.warning} />
            <Text style={[styles.statValue, { color: COLORS.warning }]}>
              {financialData.monthlyCommission?.toLocaleString('fr-FR') || '0'} FCFA
            </Text>
            <Text style={styles.statLabel}>Commission</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.info + '15' }]}>
            <Ionicons name="arrow-up" size={24} color={COLORS.info} />
            <Text style={[styles.statValue, { color: COLORS.info }]}>
              {financialData.monthlyWithdrawals?.toLocaleString('fr-FR') || '0'} FCFA
            </Text>
            <Text style={styles.statLabel}>Retrait ce mois</Text>
          </View>
        </View>

        {/* Détail des revenus */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détail des revenus</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>CA brut</Text>
              <Text style={styles.detailValue}>
                {financialData.grossRevenue?.toLocaleString('fr-FR') || '0'} FCFA
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                Commission plateforme ({financialData.commissionRate || 15}%)
              </Text>
              <Text style={[styles.detailValue, styles.detailValueNegative]}>
                -{financialData.totalCommission?.toLocaleString('fr-FR') || '0'} FCFA
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Frais de livraison</Text>
              <Text style={styles.detailValue}>
                {financialData.deliveryFees?.toLocaleString('fr-FR') || '0'} FCFA
              </Text>
              <Text style={styles.detailNote}>(pour le livreur)</Text>
            </View>
            <View style={[styles.detailRow, styles.detailTotal]}>
              <Text style={styles.detailTotalLabel}>CA net</Text>
              <Text style={styles.detailTotalValue}>
                {financialData.netRevenue?.toLocaleString('fr-FR') || '0'} FCFA
              </Text>
            </View>
          </View>
        </View>

        {/* Info paiements espèces */}
        <View style={styles.cashInfoCard}>
          <Ionicons name="information-circle" size={24} color={COLORS.info} />
          <View style={styles.cashInfoContent}>
            <Text style={styles.cashInfoTitle}>Paiements en espèces</Text>
            <Text style={styles.cashInfoText}>
              Les commandes payées en espèces par le client sont encaissées par le livreur. La plateforme vous règle après que le livreur ait remis les fonds (agence ou compte entreprise). Le solde disponible inclut ces montants une fois la remise validée.
            </Text>
          </View>
        </View>

        {/* Actions rapides */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('TransactionHistory')}
          >
            <Ionicons name="list" size={24} color={COLORS.primary} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Historique des transactions</Text>
              <Text style={styles.actionDescription}>Voir toutes vos transactions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('InvoicesReceipts')}
          >
            <Ionicons name="document-text" size={24} color={COLORS.primary} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Factures et reçus</Text>
              <Text style={styles.actionDescription}>Télécharger vos factures</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Prévisions */}
        {financialData.forecast && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prévisions de revenus</Text>
            <View style={styles.forecastCard}>
              <View style={styles.forecastRow}>
                <Text style={styles.forecastLabel}>Semaine prochaine</Text>
                <Text style={styles.forecastValue}>
                  {financialData.forecast.nextWeek?.toLocaleString('fr-FR') || '0'} FCFA
                </Text>
              </View>
              <View style={styles.forecastRow}>
                <Text style={styles.forecastLabel}>Ce mois (projection)</Text>
                <Text style={styles.forecastValue}>
                  {financialData.forecast.thisMonth?.toLocaleString('fr-FR') || '0'} FCFA
                </Text>
              </View>
              {financialData.forecast.optimizationTip && (
                <View style={styles.tipCard}>
                  <Ionicons name="bulb" size={20} color={COLORS.warning} />
                  <Text style={styles.tipText}>{financialData.forecast.optimizationTip}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  balanceCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 20,
  },
  withdrawalButton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  withdrawalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  detailCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    marginTop: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  detailValueNegative: {
    color: COLORS.error,
  },
  detailNote: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 8,
  },
  detailTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  detailTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  forecastCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  forecastLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  forecastValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.warning + '15',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 18,
  },
  cashInfoCard: {
    flexDirection: 'row',
    backgroundColor: (COLORS.info || '#0EA5E9') + '12',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info || '#0EA5E9',
  },
  cashInfoContent: {
    flex: 1,
  },
  cashInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  cashInfoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

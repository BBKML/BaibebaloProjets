import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getLoyaltyPoints } from '../../api/users';

const MOCK_TRANSACTIONS = [
  { id: 'tx-1', type: 'earned', amount: 50, title: 'Commande', subtitle: 'Commande livrée', icon: 'restaurant', dateLabel: 'Récent' },
  { id: 'tx-2', type: 'earned', amount: 10, title: 'Avis laissé', subtitle: 'Feedback client', icon: 'star', dateLabel: 'Récent' },
  { id: 'tx-3', type: 'redeemed', amount: -100, title: 'Réduction', subtitle: 'Coupon utilisé', icon: 'ticket', dateLabel: 'Récent' },
  { id: 'tx-4', type: 'earned', amount: 25, title: 'Bonus inscription', subtitle: 'Cadeau de bienvenue', icon: 'gift', dateLabel: 'Récent' },
  { id: 'tx-5', type: 'redeemed', amount: -150, title: 'Course offerte', subtitle: 'Transport Baibebalo', icon: 'car', dateLabel: 'Récent' },
];

const FCFA_PER_POINT = 5;

export default function PointsHistoryScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await getLoyaltyPoints();
      const data = response?.data || response;
      const pts = Number(data?.points) || 0;
      setPoints(pts);
      setTransactions(MOCK_TRANSACTIONS);
    } catch (error) {
      console.error('Erreur chargement points:', error);
      Alert.alert('Erreur', 'Impossible de charger les points de fidélité.');
      setTransactions(MOCK_TRANSACTIONS);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((item) => {
    if (filter === 'earned') {
      return item.type === 'earned';
    }
    if (filter === 'redeemed') {
      return item.type === 'redeemed';
    }
    return true;
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Historique des points</Text>
        <View style={styles.iconButtonPlaceholder} />
      </View>

      <ScrollView>
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Mon solde Baibebalo</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceValue}>{points.toLocaleString('fr-FR')}</Text>
              <Text style={styles.balanceSuffix}>pts</Text>
            </View>
          </View>
          <View style={styles.balanceFooter}>
            <View>
              <Text style={styles.balanceMetaLabel}>Valeur estimée</Text>
              <Text style={styles.balanceMetaValue}>~ {(points * FCFA_PER_POINT).toLocaleString('fr-FR')} FCFA</Text>
            </View>
            <TouchableOpacity style={styles.exchangeButton}>
              <Text style={styles.exchangeButtonText}>Échanger</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filterRow}>
          {[
            { id: 'all', label: 'Tous' },
            { id: 'earned', label: 'Gains' },
            { id: 'redeemed', label: 'Utilisés' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.filterTab, filter === tab.id && styles.filterTabActive]}
              onPress={() => setFilter(tab.id)}
            >
              <Text style={[styles.filterText, filter === tab.id && styles.filterTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Transactions récentes</Text>
          <View style={styles.listBadge}>
            <Text style={styles.listBadgeText}>30 derniers jours</Text>
          </View>
        </View>

        <View style={styles.listContent}>
          {filteredTransactions.map((item) => {
            const isEarned = item.type === 'earned';
            return (
              <View key={item.id} style={styles.transactionCard}>
                <View style={styles.transactionInfo}>
                  <View style={styles.transactionIcon}>
                    <Ionicons name={item.icon} size={20} color={COLORS.primary} />
                  </View>
                  <View>
                    <Text style={styles.transactionTitle}>
                      {isEarned ? '+' : ''}{Math.abs(item.amount)} points pour {item.title}
                    </Text>
                    <View style={styles.transactionSubtitleRow}>
                      <Ionicons name={item.icon} size={12} color={COLORS.textSecondary} />
                      <Text style={styles.transactionSubtitle}>{item.subtitle}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.transactionMeta}>
                  <Text style={[styles.transactionAmount, isEarned ? styles.amountEarned : styles.amountRedeemed]}>
                    {isEarned ? '+' : ''}{Math.abs(item.amount)}
                  </Text>
                  <Text style={styles.transactionDate}>{item.dateLabel}</Text>
                </View>
              </View>
            );
          })}
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPlaceholder: {
    width: 40,
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  balanceCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  balanceHeader: {
    backgroundColor: COLORS.primary,
    padding: 16,
  },
  balanceLabel: {
    fontSize: 12,
    color: COLORS.white + 'CC',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.white,
  },
  balanceSuffix: {
    fontSize: 16,
    color: COLORS.white + 'CC',
    marginBottom: 4,
    marginLeft: 6,
  },
  balanceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  balanceMetaLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  balanceMetaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  exchangeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  exchangeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  filterTabActive: {
    backgroundColor: COLORS.white,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.primary,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  listBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  listBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  listContent: {
    paddingHorizontal: 12,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transactionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  transactionSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  transactionSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  transactionMeta: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  amountEarned: {
    color: COLORS.primary,
  },
  amountRedeemed: {
    color: COLORS.text,
  },
  transactionDate: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  bottomSpacer: {
    height: 40,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 32,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function PointsHistoryScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    // TODO: Implémenter l'appel API
    // Simuler des données pour l'instant
    setTimeout(() => {
      setTransactions([
        {
          id: 1,
          type: 'earned',
          amount: 50,
          description: 'Commande #12345',
          date: '2024-01-15',
          time: '14:30',
        },
        {
          id: 2,
          type: 'redeemed',
          amount: -100,
          description: 'Réduction appliquée',
          date: '2024-01-10',
          time: '10:15',
        },
        {
          id: 3,
          type: 'earned',
          amount: 30,
          description: 'Parrainage - Ami invité',
          date: '2024-01-08',
          time: '16:45',
        },
      ]);
      setLoading(false);
    }, 1000);
  };

  const renderTransaction = ({ item }) => {
    const isEarned = item.type === 'earned';
    
    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionIcon}>
          <Ionicons
            name={isEarned ? 'add-circle' : 'remove-circle'}
            size={24}
            color={isEarned ? COLORS.success : COLORS.error}
          />
        </View>
        <View style={styles.transactionContent}>
          <Text style={styles.transactionDescription}>{item.description}</Text>
          <Text style={styles.transactionDate}>
            {item.date} à {item.time}
          </Text>
        </View>
        <Text
          style={[
            styles.transactionAmount,
            isEarned ? styles.amountEarned : styles.amountRedeemed,
          ]}
        >
          {isEarned ? '+' : ''}{item.amount} pts
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historique des points</Text>
        <Text style={styles.headerSubtitle}>
          Consultez toutes vos transactions de points
        </Text>
      </View>

      {/* Liste des transactions */}
      {transactions.length > 0 ? (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>Aucune transaction</Text>
          <Text style={styles.emptySubtitle}>
            Vos transactions de points apparaîtront ici
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 24,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  listContent: {
    padding: 16,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionContent: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  amountEarned: {
    color: COLORS.success,
  },
  amountRedeemed: {
    color: COLORS.error,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 32,
  },
});

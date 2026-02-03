import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { restaurantFinance } from '../../api/finance';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function InvoicesReceiptsScreen({ navigation }) {
  const [invoices, setInvoices] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      // Utiliser l'historique des retraits comme factures (le backend n'a pas d'endpoint spécifique pour les factures)
      const response = await restaurantFinance.getPayoutHistory();
      // Le backend retourne { success: true, data: { payout_requests: [...] } }
      const payoutRequests = response.data?.payout_requests || response.payout_requests || [];
      
      // Adapter les données de retraits au format factures
      const adaptedInvoices = payoutRequests.map((payout, index) => ({
        id: payout.id,
        number: `FACT-${payout.id.substring(0, 8).toUpperCase()}`,
        period: `Période ${new Date(payout.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
        amount: payout.amount,
        status: payout.status === 'completed' ? 'paid' : 'pending',
        startDate: payout.created_at,
        endDate: payout.processed_at || payout.created_at,
        transactionsCount: 1,
        commission: 0,
      }));
      
      setInvoices(adaptedInvoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  };

  const handleDownload = async (invoiceId) => {
    try {
      Alert.alert('Info', 'La génération de factures PDF sera disponible prochainement');
      // TODO: Implémenter la génération PDF côté backend
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de télécharger la facture');
    }
  };

  const handleEmail = async (invoiceId) => {
    try {
      Alert.alert('Info', 'L\'envoi par email sera disponible prochainement');
      // TODO: Implémenter l'envoi par email côté backend
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer la facture');
    }
  };

  const renderInvoice = ({ item }) => (
    <View style={styles.invoiceCard}>
      <View style={styles.invoiceHeader}>
        <View style={styles.invoiceInfo}>
          <Text style={styles.invoiceTitle}>Facture #{item.number}</Text>
          <Text style={styles.invoicePeriod}>
            {item.period || `${new Date(item.startDate).toLocaleDateString('fr-FR')} - ${new Date(item.endDate).toLocaleDateString('fr-FR')}`}
          </Text>
        </View>
        <View style={styles.invoiceAmountContainer}>
          <Text style={styles.invoiceAmount}>
            {item.amount.toLocaleString('fr-FR')} FCFA
          </Text>
          <View style={[styles.statusBadge, item.status === 'paid' && styles.statusBadgePaid]}>
            <Text style={styles.statusText}>
              {item.status === 'paid' ? 'Payé' : 'En attente'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.invoiceDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Période</Text>
          <Text style={styles.detailValue}>
            {new Date(item.startDate).toLocaleDateString('fr-FR')} - {new Date(item.endDate).toLocaleDateString('fr-FR')}
          </Text>
        </View>
        {item.transactionsCount && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transactions</Text>
            <Text style={styles.detailValue}>{item.transactionsCount}</Text>
          </View>
        )}
        {item.commission && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Commission</Text>
            <Text style={styles.detailValue}>
              {item.commission.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        )}
      </View>

      <View style={styles.invoiceActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDownload(item.id)}
        >
          <Ionicons name="download-outline" size={20} color={COLORS.primary} />
          <Text style={styles.actionButtonText}>Télécharger PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEmail(item.id)}
        >
          <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
          <Text style={styles.actionButtonText}>Envoyer par email</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Factures et reçus</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={invoices}
        renderItem={renderInvoice}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Aucune facture</Text>
            <Text style={styles.emptySubtext}>
              Vos factures apparaîtront ici après chaque période de paiement
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
  list: {
    padding: 20,
  },
  invoiceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  invoicePeriod: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  invoiceAmountContainer: {
    alignItems: 'flex-end',
  },
  invoiceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.warning + '15',
  },
  statusBadgePaid: {
    backgroundColor: COLORS.success + '15',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  invoiceDetails: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
  invoiceActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '15',
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
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

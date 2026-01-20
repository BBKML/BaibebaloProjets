import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getSupportTickets } from '../../api/support';

export default function MyClaimsTrackingScreen({ navigation }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    try {
      setLoading(true);
      const response = await getSupportTickets();
      // Le backend peut retourner les tickets dans response.data.tickets ou response.data
      const tickets = response.data?.tickets || response.data || [];
      setClaims(Array.isArray(tickets) ? tickets : []);
    } catch (error) {
      console.error('Erreur lors du chargement des réclamations:', error);
      setClaims([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadClaims();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'en_cours':
        return COLORS.warning;
      case 'resolu':
        return COLORS.success;
      case 'ferme':
        return COLORS.textSecondary;
      default:
        return COLORS.info;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'en_cours':
        return 'En cours';
      case 'resolu':
        return 'Résolu';
      case 'ferme':
        return 'Fermé';
      default:
        return status;
    }
  };

  const renderClaim = ({ item }) => (
    <TouchableOpacity
      style={styles.claimCard}
      onPress={() => navigation.navigate('ClaimTicketDetails', { ticketId: item.id || item.ticket_id })}
    >
      <View style={styles.claimHeader}>
        <View style={styles.claimInfo}>
          <Text style={styles.ticketNumber}>{item.ticket_number}</Text>
          <Text style={styles.claimSubject}>{item.subject}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>
      <View style={styles.claimFooter}>
        <View style={styles.claimMeta}>
          <Ionicons name="receipt-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.claimMetaText}>Commande #{item.order_id}</Text>
        </View>
        <Text style={styles.claimDate}>
          {new Date(item.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {claims.length > 0 ? (
        <FlatList
          data={claims}
          renderItem={renderClaim}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={80} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>Aucune réclamation</Text>
          <Text style={styles.emptySubtitle}>
            Vous n'avez pas encore de réclamations enregistrées
          </Text>
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => navigation.navigate('ReportProblem')}
          >
            <Text style={styles.reportButtonText}>Signaler un problème</Text>
          </TouchableOpacity>
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
  listContent: {
    padding: 16,
  },
  claimCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  claimInfo: {
    flex: 1,
    marginRight: 12,
  },
  ticketNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  claimSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  claimFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  claimMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  claimMetaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  claimDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  reportButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  reportButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 32,
  },
});

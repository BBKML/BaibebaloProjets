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
import { COLORS } from '../../constants/colors';
import { getSupportTickets } from '../../api/support';

export default function MyClaimsTrackingScreen({ navigation }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('active');

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

  const normalizeStatus = (status) => {
    switch (status) {
      case 'open':
        return 'en_cours';
      case 'in_progress':
        return 'en_cours';
      case 'waiting_customer':
        return 'en_attente';
      case 'resolved':
        return 'resolu';
      case 'closed':
        return 'ferme';
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    const normalized = normalizeStatus(status);
    switch (normalized) {
      case 'en_cours':
        return COLORS.warning;
      case 'resolu':
        return COLORS.success;
      case 'ferme':
        return COLORS.textSecondary;
      case 'en_attente':
        return COLORS.info;
      default:
        return COLORS.info;
    }
  };

  const getStatusLabel = (status) => {
    const normalized = normalizeStatus(status);
    switch (normalized) {
      case 'en_cours':
        return 'En cours';
      case 'resolu':
        return 'Résolu';
      case 'ferme':
        return 'Fermé';
      case 'en_attente':
        return 'En attente';
      default:
        return status;
    }
  };

  const activeClaims = claims.filter((item) => {
    const status = normalizeStatus(item.status);
    return status === 'en_cours' || status === 'en_attente';
  });
  const resolvedClaims = claims.filter((item) => normalizeStatus(item.status) === 'resolu');
  const displayedClaims = tab === 'active' ? activeClaims : resolvedClaims;

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
        <Text style={styles.topBarTitle}>Mes Réclamations</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="search" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'active' && styles.tabButtonActive]}
          onPress={() => setTab('active')}
        >
          <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>En cours</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'history' && styles.tabButtonActive]}
          onPress={() => setTab('history')}
        >
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>Historique</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.newTicketCard}>
          <View>
            <Text style={styles.newTicketTitle}>Un problème ?</Text>
            <Text style={styles.newTicketSubtitle}>Signalez-le nous en quelques secondes.</Text>
          </View>
          <TouchableOpacity
            style={styles.newTicketButton}
            onPress={() => navigation.navigate('ReportProblem')}
          >
            <Text style={styles.newTicketButtonText}>Nouveau ticket</Text>
          </TouchableOpacity>
        </View>

        {displayedClaims.length > 0 ? (
          <View style={styles.claimsList}>
            {displayedClaims.map((item) => (
              <TouchableOpacity
                key={item.id || item.ticket_id}
                style={styles.claimCard}
                onPress={() => navigation.navigate('ClaimTicketDetails', { ticketId: item.id || item.ticket_id })}
              >
                <View style={styles.claimIcon}>
                  <Ionicons name="receipt-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={styles.claimInfo}>
                  <View style={styles.claimHeader}>
                    <Text style={styles.ticketNumber}>{item.ticket_number || '#TICKET-000'}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                      <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
                    </View>
                  </View>
                  <Text style={styles.claimSubject} numberOfLines={1}>
                    {item.subject}
                  </Text>
                  <Text style={styles.claimMeta}>
                    {new Date(item.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>Aucune réclamation</Text>
            <Text style={styles.emptySubtitle}>
              Tout semble en ordre ! Vos tickets apparaîtront ici.
            </Text>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  tabs: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabButton: {
    paddingVertical: 10,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  newTicketCard: {
    backgroundColor: COLORS.primary + '12',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  newTicketTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  newTicketSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  newTicketButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  newTicketButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  claimsList: {
    gap: 12,
  },
  claimCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  claimIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimInfo: {
    flex: 1,
  },
  claimHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  ticketNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  claimSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  claimMeta: {
    fontSize: 11,
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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 32,
  },
});

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

export default function ReferralHistoryScreen({ navigation }) {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    loadReferralHistory();
  }, []);

  const loadReferralHistory = async () => {
    try {
      setLoading(true);
      // TODO: Implémenter l'appel API
      // Simuler des données pour l'instant
      setTimeout(() => {
        const data = [
          {
            id: 1,
            friend_name: 'Kouassi Jean',
            friend_phone: '+225 07 XX XX XX XX',
            status: 'completed',
            points_earned: 500,
            date: '2024-01-15',
          },
          {
            id: 2,
            friend_name: 'Marie Kouassi',
            friend_phone: '+225 05 XX XX XX XX',
            status: 'pending',
            points_earned: 0,
            date: '2024-01-10',
          },
          {
            id: 3,
            friend_name: 'Paul Yapi',
            friend_phone: '+225 01 XX XX XX XX',
            status: 'completed',
            points_earned: 500,
            date: '2024-01-05',
          },
        ];
        setReferrals(data);
        setTotalEarnings(data.reduce((sum, ref) => sum + ref.points_earned, 0));
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setLoading(false);
    }
  };

  const renderReferral = ({ item }) => {
    const isCompleted = item.status === 'completed';
    
    return (
      <View style={styles.referralCard}>
        <View style={styles.referralHeader}>
          <View style={styles.referralInfo}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={24} color={COLORS.textSecondary} />
            </View>
            <View style={styles.referralDetails}>
              <Text style={styles.friendName}>{item.friend_name}</Text>
              <Text style={styles.friendPhone}>{item.friend_phone}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, isCompleted ? styles.statusBadgeSuccess : styles.statusBadgePending]}>
            <Text style={[styles.statusText, isCompleted ? styles.statusTextSuccess : styles.statusTextPending]}>
              {isCompleted ? 'Complété' : 'En attente'}
            </Text>
          </View>
        </View>
        <View style={styles.referralFooter}>
          <View style={styles.referralMeta}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.referralDate}>
              {new Date(item.date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
          {isCompleted && (
            <View style={styles.pointsContainer}>
              <Ionicons name="gift" size={16} color={COLORS.success} />
              <Text style={styles.pointsText}>+{item.points_earned} pts</Text>
            </View>
          )}
        </View>
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
      {/* Header avec statistiques */}
      <View style={styles.header}>
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>Total gagné</Text>
          <Text style={styles.statsValue}>{totalEarnings} points</Text>
        </View>
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>Amis invités</Text>
          <Text style={styles.statsValue}>{referrals.length}</Text>
        </View>
      </View>

      {/* Liste des parrainages */}
      {referrals.length > 0 ? (
        <FlatList
          data={referrals}
          renderItem={renderReferral}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={80} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>Aucun parrainage</Text>
          <Text style={styles.emptySubtitle}>
            Invitez vos amis pour commencer à gagner des points
          </Text>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => navigation.navigate('ReferralProgram')}
          >
            <Text style={styles.inviteButtonText}>Inviter des amis</Text>
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
  header: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statsCard: {
    flex: 1,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statsLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  listContent: {
    padding: 16,
  },
  referralCard: {
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
  referralHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  referralInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  friendPhone: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeSuccess: {
    backgroundColor: COLORS.success + '20',
  },
  statusBadgePending: {
    backgroundColor: COLORS.warning + '20',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextSuccess: {
    color: COLORS.success,
  },
  statusTextPending: {
    color: COLORS.warning,
  },
  referralFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  referralMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  referralDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
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
  inviteButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  inviteButtonText: {
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

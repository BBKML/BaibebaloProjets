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
import { getReferrals } from '../../api/users';

const REWARD_PER_COMPLETED = 500;

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
      const response = await getReferrals();
      const data = response?.data || response;
      const list = Array.isArray(data?.referrals) ? data.referrals : [];
      const mapped = list.map((r) => {
        const name = [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || r.phone || 'Inconnu';
        const date = r.created_at
          ? new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
          : '--';
        return {
          id: r.id || `ref-${r.referee_id}-${r.created_at}`,
          friend_name: name,
          status: r.status === 'completed' ? 'completed' : 'pending',
          points_earned: r.status === 'completed' ? REWARD_PER_COMPLETED : 0,
          date,
        };
      });
      setReferrals(mapped);
      setTotalEarnings(mapped.reduce((sum, ref) => sum + ref.points_earned, 0));
    } catch (error) {
      console.error('Erreur lors du chargement des parrainages:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'historique des parrainages.');
    } finally {
      setLoading(false);
    }
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
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Historique Parrainages</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="help-circle-outline" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView>
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>Total des gains cumulés</Text>
          <View style={styles.earningsRow}>
            <Text style={styles.earningsValue}>{totalEarnings.toLocaleString('fr-FR')}</Text>
            <Text style={styles.earningsCurrency}>FCFA</Text>
          </View>
          <TouchableOpacity
            style={styles.inviteFriendsButton}
            onPress={() => navigation.navigate('ReferralProgram')}
          >
            <Ionicons name="share-social-outline" size={14} color={COLORS.primary} />
            <Text style={styles.inviteFriendsText}>Inviter des amis</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mes Parrainages ({referrals.length})</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ReferralProgram')}>
            <Text style={styles.sectionAction}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listContent}>
          {referrals.map((item) => {
            const isCompleted = item.status === 'completed';
            return (
              <View key={item.id} style={styles.referralCard}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={22} color={COLORS.textSecondary} />
                  <View style={[styles.statusIcon, isCompleted ? styles.statusIconSuccess : styles.statusIconPending]}>
                    <Ionicons name={isCompleted ? 'checkmark' : 'time'} size={10} color={COLORS.white} />
                  </View>
                </View>
                <View style={styles.referralInfo}>
                  <View style={styles.referralHeader}>
                    <Text style={styles.friendName}>{item.friend_name}</Text>
                    <Text style={styles.referralDate}>{item.date}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={[styles.statusText, isCompleted ? styles.statusTextSuccess : styles.statusTextPending]}>
                      {isCompleted ? 'Première commande' : 'Inscrit'}
                    </Text>
                  </View>
                </View>
                <View style={styles.referralAmount}>
                  <Text style={styles.amountText}>
                    {isCompleted ? `+${item.points_earned}` : '--'}
                  </Text>
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
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  earningsCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 8,
  },
  earningsLabel: {
    fontSize: 12,
    color: COLORS.white + 'CC',
    textTransform: 'uppercase',
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginTop: 6,
    marginBottom: 16,
  },
  earningsValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
  },
  earningsCurrency: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white + 'CC',
    marginBottom: 2,
  },
  inviteFriendsButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  inviteFriendsText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  referralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  statusIconSuccess: {
    backgroundColor: COLORS.primary,
  },
  statusIconPending: {
    backgroundColor: COLORS.border,
  },
  referralInfo: {
    flex: 1,
  },
  referralHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  friendName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  referralDate: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  statusBadge: {
    marginTop: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusTextSuccess: {
    color: COLORS.primary,
  },
  statusTextPending: {
    color: COLORS.warning,
  },
  referralAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
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

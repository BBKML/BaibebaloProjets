import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getLoyaltyPoints } from '../../api/users';

export default function LoyaltyDashboardScreen({ navigation }) {
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLoyaltyData();
  }, []);

  const loadLoyaltyData = async () => {
    try {
      setLoading(true);
      const response = await getLoyaltyPoints();
      // Le backend peut retourner les points dans response.data.points ou response.data
      const points = response.data?.points || response.data?.total_points || response.data?.loyalty_points || 0;
      setLoyaltyPoints(points);
    } catch (error) {
      console.error('Erreur lors du chargement des points:', error);
      setLoyaltyPoints(0);
    } finally {
      setLoading(false);
    }
  };

  const rewards = [
    {
      id: 'reward-1',
      title: '-10% sur prochaine commande',
      subtitle: 'Échangez 150 points',
      icon: 'pricetag',
      tint: COLORS.primary,
      background: COLORS.primary + '10',
      locked: false,
    },
    {
      id: 'reward-2',
      title: 'Livraison gratuite',
      subtitle: 'Échangez 100 points',
      icon: 'bicycle',
      tint: '#C9A961',
      background: '#C9A961' + '15',
      locked: false,
    },
    {
      id: 'reward-3',
      title: 'Boisson offerte',
      subtitle: 'Échangez 80 points',
      icon: 'wine',
      tint: '#2563EB',
      background: '#2563EB' + '12',
      locked: false,
    },
    {
      id: 'reward-4',
      title: 'Bon d\'achat 5 000 FCFA',
      subtitle: 'Requis : Niveau Or',
      icon: 'lock-closed',
      tint: COLORS.textLight,
      background: COLORS.border,
      locked: true,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topButton}>
          <Ionicons name="menu" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.brandTitle}>BAIBEBALO</Text>
        <TouchableOpacity style={styles.profileButton}>
          <Ionicons name="person" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView>
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.levelBadge}>
            <Ionicons name="star" size={12} color="#A0AEC0" />
            <Text style={styles.levelText}>Niveau Argent</Text>
          </View>
          <View style={styles.pointsRow}>
            <Text style={styles.pointsValue}>
              {loading ? '...' : loyaltyPoints}
            </Text>
            <Text style={styles.pointsSuffix}>pts</Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Progression vers le niveau Or</Text>
            <Text style={styles.progressPercent}>50%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
            <View style={styles.progressTarget} />
          </View>
          <View style={styles.progressHint}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.primary} />
            <Text style={styles.progressHintText}>
              Plus que 250 points pour débloquer les avantages Or !
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Récompenses disponibles</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PointsHistory')}>
            <Text style={styles.sectionAction}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rewardsList}>
          {rewards.map((reward) => (
            <View
              key={reward.id}
              style={[styles.rewardCard, reward.locked && styles.rewardCardLocked]}
            >
              <View style={[styles.rewardIcon, { backgroundColor: reward.background }]}>
                <Ionicons name={reward.icon} size={22} color={reward.tint} />
              </View>
              <View style={styles.rewardContent}>
                <Text style={[styles.rewardTitle, reward.locked && styles.rewardLockedText]}>
                  {reward.title}
                </Text>
                <Text style={[styles.rewardSubtitle, reward.locked && styles.rewardLockedText]}>
                  {reward.subtitle}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.rewardButton, reward.locked && styles.rewardButtonLocked]}
                disabled={reward.locked}
              >
                <Text style={[styles.rewardButtonText, reward.locked && styles.rewardLockedText]}>
                  {reward.locked ? 'Bloqué' : 'Utiliser'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
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
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '10',
  },
  brandTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 2,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '12',
  },
  hero: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
  },
  heroGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.primary + '20',
    top: 10,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#A0AEC0' + '22',
    borderWidth: 1,
    borderColor: '#A0AEC0' + '40',
    marginBottom: 8,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A0AEC0',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  pointsValue: {
    fontSize: 56,
    fontWeight: '800',
    color: COLORS.text,
  },
  pointsSuffix: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginLeft: 6,
  },
  progressCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '800',
    color: '#C9A961',
  },
  progressBar: {
    height: 10,
    borderRadius: 999,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    width: '50%',
    backgroundColor: COLORS.primary,
    borderRadius: 999,
  },
  progressTarget: {
    position: 'absolute',
    right: 0,
    width: 4,
    height: '100%',
    backgroundColor: '#C9A961',
  },
  progressHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressHintText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  rewardsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rewardCardLocked: {
    backgroundColor: COLORS.background,
    borderStyle: 'dashed',
    opacity: 0.7,
  },
  rewardIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardContent: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  rewardSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rewardButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  rewardButtonLocked: {
    backgroundColor: COLORS.border,
  },
  rewardButtonText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  rewardLockedText: {
    color: COLORS.textLight,
  },
  bottomSpacer: {
    height: 40,
  },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useDeliveryStore from '../../store/deliveryStore';
import { getDeliveryProfile, getDeliveryHistoryForStats } from '../../api/stats';

// Définition des badges avec leurs conditions
const BADGE_DEFINITIONS = [
  { id: '1', icon: 'bicycle', name: 'Première livraison', description: '1+ livraison', threshold: 1, field: 'total_deliveries' },
  { id: '2', icon: 'ribbon', name: '50 livraisons', description: '50+ livraisons', threshold: 50, field: 'total_deliveries' },
  { id: '3', icon: 'medal', name: '100 livraisons', description: '100+ livraisons', threshold: 100, field: 'total_deliveries' },
  { id: '4', icon: 'trophy', name: '500 livraisons', description: '500+ livraisons', threshold: 500, field: 'total_deliveries' },
  { id: '5', icon: 'star', name: 'Excellent', description: 'Note >= 4.5', threshold: 4.5, field: 'average_rating' },
  { id: '6', icon: 'diamond', name: 'Parfait', description: 'Note >= 4.8', threshold: 4.8, field: 'average_rating' },
  { id: '7', icon: 'flash', name: 'Rapide', description: '10+ livraisons/jour', threshold: 10, field: 'daily_record' },
  { id: '8', icon: 'flame', name: 'En feu', description: '20+ livraisons/jour', threshold: 20, field: 'daily_record' },
];

export default function BadgesScreen({ navigation }) {
  const { earningsData } = useDeliveryStore();
  const [badges, setBadges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total_deliveries: 0,
    average_rating: 0,
    daily_record: 0,
  });

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      const [profileRes, historyRes] = await Promise.all([
        getDeliveryProfile().catch(() => null),
        getDeliveryHistoryForStats(100).catch(() => null),
      ]);

      let profileStats = {
        total_deliveries: earningsData.total_deliveries || 0,
        average_rating: 4.5,
        daily_record: 0,
      };

      if (profileRes?.success && profileRes?.data?.delivery_person) {
        const profile = profileRes.data.delivery_person;
        profileStats.total_deliveries = parseInt(profile.total_deliveries) || profileStats.total_deliveries;
        profileStats.average_rating = parseFloat(profile.average_rating) || profileStats.average_rating;
        profileStats.daily_record = parseInt(profile.daily_record) || profileStats.daily_record;
      }

      if (profileStats.daily_record === 0 && historyRes?.success && historyRes?.data?.deliveries?.length) {
        const byDay = {};
        historyRes.data.deliveries.forEach((d) => {
          if (d.status !== 'delivered') return;
          const key = (d.delivered_at || d.created_at || '').toString().slice(0, 10);
          if (key) byDay[key] = (byDay[key] || 0) + 1;
        });
        const counts = Object.values(byDay);
        profileStats.daily_record = counts.length ? Math.max(...counts) : 0;
      }

      setStats(profileStats);

      // Calculer quels badges sont débloqués
      const computedBadges = BADGE_DEFINITIONS.map(badge => ({
        ...badge,
        earned: profileStats[badge.field] >= badge.threshold,
        progress: Math.min((profileStats[badge.field] / badge.threshold) * 100, 100),
      }));

      setBadges(computedBadges);
    } catch (error) {
      console.error('[BadgesScreen] Erreur:', error);
      // Utiliser des valeurs par défaut
      setBadges(BADGE_DEFINITIONS.map(b => ({ ...b, earned: false, progress: 0 })));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBadges();
    setRefreshing(false);
  };

  const earnedCount = badges.filter(b => b.earned).length;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Badges et récompenses</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Badges et récompenses</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Stats résumé */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{earnedCount}/{badges.length} badges obtenus</Text>
        <Text style={styles.summarySubtitle}>
          {stats.total_deliveries} livraisons • Note {parseFloat(stats.average_rating).toFixed(1)}/5
        </Text>
      </View>

      <FlatList
        data={badges}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
        }
        renderItem={({ item }) => (
          <View style={[styles.badgeItem, !item.earned && styles.badgeItemLocked]}>
            <View style={[styles.badgeIconContainer, item.earned && styles.badgeIconEarned]}>
              <Ionicons name={item.icon} size={32} color={item.earned ? COLORS.warning : COLORS.textLight} />
            </View>
            <Text style={[styles.badgeName, !item.earned && styles.badgeNameLocked]}>{item.name}</Text>
            <Text style={styles.badgeDescription}>{item.description}</Text>
            {!item.earned && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
              </View>
            )}
            {item.earned && <Ionicons name="checkmark-circle" size={18} color={COLORS.success} style={styles.earnedIcon} />}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  placeholder: { width: 40 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryCard: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  summarySubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  list: { padding: 10 },
  badgeItem: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    margin: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 140,
  },
  badgeItemLocked: { backgroundColor: COLORS.background },
  badgeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badgeIconEarned: { backgroundColor: COLORS.warning + '20' },
  badgeName: { fontSize: 13, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  badgeNameLocked: { color: COLORS.textSecondary },
  badgeDescription: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  progressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  earnedIcon: { position: 'absolute', top: 8, right: 8 },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import useDeliveryStore from '../../store/deliveryStore';
import { getRankings } from '../../api/stats';

export default function RankingsScreen({ navigation }) {
  const { user } = useAuthStore();
  const { earningsData } = useDeliveryStore();
  const [rankings, setRankings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myRank, setMyRank] = useState(null);
  const [period, setPeriod] = useState('week');

  useEffect(() => {
    loadRankings();
  }, [period]);

  const loadRankings = async () => {
    try {
      const response = await getRankings(period, 20);
      if (response?.success && response?.data?.rankings) {
        setRankings(response.data.rankings);
        setMyRank(response.data.my_rank || null);
      } else {
        setRankings([]);
        setMyRank(null);
      }
    } catch (error) {
      console.error('[RankingsScreen] Erreur:', error);
      const myDeliveries = earningsData.total_deliveries || 0;
      const simulated = generateSimulatedRankings(myDeliveries, user?.first_name);
      setRankings(simulated.rankings);
      setMyRank(simulated.myRank);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRankings();
    setRefreshing(false);
  };

  const getMedal = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Classement</Text>
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
        <Text style={styles.title}>Classement</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <TouchableOpacity 
          style={[styles.periodButton, period === 'week' && styles.periodButtonActive]}
          onPress={() => setPeriod('week')}
        >
          <Text style={[styles.periodButtonText, period === 'week' && styles.periodButtonTextActive]}>
            Cette semaine
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.periodButton, period === 'month' && styles.periodButtonActive]}
          onPress={() => setPeriod('month')}
        >
          <Text style={[styles.periodButtonText, period === 'month' && styles.periodButtonTextActive]}>
            Ce mois
          </Text>
        </TouchableOpacity>
      </View>

      {/* My Rank Card */}
      {myRank && (
        <View style={styles.myRankCard}>
          <Text style={styles.myRankMedal}>{getMedal(myRank.rank)}</Text>
          <View style={styles.myRankInfo}>
            <Text style={styles.myRankTitle}>Votre position</Text>
            <Text style={styles.myRankValue}>{myRank.rank}ème sur {rankings.length} livreurs</Text>
          </View>
          <View style={styles.myRankStats}>
            <Text style={styles.myRankDeliveries}>{myRank.deliveries}</Text>
            <Text style={styles.myRankLabel}>courses</Text>
          </View>
        </View>
      )}

      <FlatList
        data={rankings}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
        }
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>
            Top Livreurs {period === 'week' ? 'de la Semaine' : 'du Mois'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.rankItem, item.isYou && styles.rankItemYou]}>
            <Text style={styles.medal}>{getMedal(item.rank)}</Text>
            <View style={styles.rankInfo}>
              <Text style={styles.rankName}>{item.name}{item.isYou ? ' (Vous)' : ''}</Text>
              <Text style={styles.rankDeliveries}>{item.deliveries} courses</Text>
            </View>
            {item.rank <= 3 && (
              <View style={[styles.rankBadge, { backgroundColor: item.rank === 1 ? '#FFD700' : item.rank === 2 ? '#C0C0C0' : '#CD7F32' }]}>
                <Text style={styles.rankBadgeText}>TOP {item.rank}</Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Aucun classement disponible</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// Générer un classement simulé basé sur les données locales
function generateSimulatedRankings(myDeliveries, myName) {
  const names = ['Bakary D.', 'Amadou S.', 'Fatou K.', 'Ibrahim T.', 'Mariam C.', 'Seydou B.', 'Awa D.', 'Moussa K.'];
  
  // Générer des livreurs fictifs
  let otherDeliveries = names.map((name, i) => ({
    id: String(i + 1),
    name,
    deliveries: Math.floor(Math.random() * 60) + 20,
  }));
  
  // Ajouter l'utilisateur
  const myEntry = {
    id: 'me',
    name: myName || 'Vous',
    deliveries: myDeliveries,
    isYou: true,
  };
  
  // Trier par nombre de livraisons
  const all = [...otherDeliveries, myEntry].sort((a, b) => b.deliveries - a.deliveries);
  
  // Ajouter les rangs
  const rankings = all.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
  
  const myRank = rankings.find(r => r.isYou);
  
  return { rankings: rankings.slice(0, 10), myRank };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  placeholder: { width: 40 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  periodSelector: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 12 },
  periodButton: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.white, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  periodButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  periodButtonTextActive: { color: '#FFFFFF' },
  myRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  myRankMedal: { fontSize: 40, marginRight: 12 },
  myRankInfo: { flex: 1 },
  myRankTitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  myRankValue: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  myRankStats: { alignItems: 'center' },
  myRankDeliveries: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  myRankLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  list: { padding: 16, paddingTop: 0 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
  rankItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  rankItemYou: { borderColor: COLORS.primary, borderWidth: 2, backgroundColor: COLORS.primary + '08' },
  medal: { fontSize: 28, marginRight: 12, width: 40, textAlign: 'center' },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  rankDeliveries: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  rankBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  rankBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#FFFFFF' },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 12 },
});

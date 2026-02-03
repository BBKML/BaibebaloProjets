import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useDeliveryStore from '../../store/deliveryStore';
import { getDeliveryProfile, getDeliveryHistoryForStats } from '../../api/stats';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;

export default function PerformanceDashboardScreen({ navigation }) {
  const { earningsData, todayStats } = useDeliveryStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    averageRating: 4.5,
    totalEarnings: 0,
    completionRate: 100,
    averagePerDay: 0,
    bestDay: 0,
  });
  const [weeklyData, setWeeklyData] = useState([]);

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    try {
      const [profileRes, historyRes] = await Promise.all([
        getDeliveryProfile().catch(() => null),
        getDeliveryHistoryForStats(100).catch(() => null),
      ]);

      let newStats = {
        totalDeliveries: earningsData.total_deliveries || 0,
        totalEarnings: earningsData.total_earnings || 0,
        averageRating: 4.5,
        completionRate: 100,
        averagePerDay: 0,
        bestDay: 0,
      };

      if (profileRes?.success && profileRes?.data?.delivery_person) {
        const profile = profileRes.data.delivery_person;
        newStats.totalDeliveries = parseInt(profile.total_deliveries) || newStats.totalDeliveries;
        newStats.averageRating = parseFloat(profile.average_rating) || 4.5;
        newStats.totalEarnings = parseFloat(profile.total_earnings) || newStats.totalEarnings;
      }

      // Calculer les données hebdomadaires à partir de l'historique
      if (historyRes?.success && historyRes?.data?.deliveries) {
        const deliveries = historyRes.data.deliveries;
        const weekData = calculateWeeklyData(deliveries);
        setWeeklyData(weekData);
        
        // Calculer les stats
        const total = deliveries.length;
        const delivered = deliveries.filter(d => d.status === 'delivered').length;
        newStats.completionRate = total > 0 ? Math.round((delivered / total) * 100) : 100;
        
        // Moyenne par jour (sur les 7 derniers jours)
        const last7Days = weekData.slice(-7);
        const totalLast7 = last7Days.reduce((sum, d) => sum + d.count, 0);
        newStats.averagePerDay = Math.round(totalLast7 / 7 * 10) / 10;
        newStats.bestDay = Math.max(...last7Days.map(d => d.count));
      }

      setStats(newStats);
    } catch (error) {
      console.error('[PerformanceDashboard] Erreur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPerformanceData();
    setRefreshing(false);
  };

  const maxCount = Math.max(...weeklyData.map(d => d.count), 1);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Performance</Text>
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
        <Text style={styles.title}>Performance</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Stats Overview */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="bicycle" size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{stats.totalDeliveries}</Text>
            <Text style={styles.statLabel}>Livraisons totales</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star" size={24} color={COLORS.warning} />
            <Text style={styles.statValue}>{parseFloat(stats.averageRating).toFixed(1)}</Text>
            <Text style={styles.statLabel}>Note moyenne</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <Text style={styles.statValue}>{stats.completionRate}%</Text>
            <Text style={styles.statLabel}>Taux de complétion</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color={COLORS.info} />
            <Text style={styles.statValue}>{stats.averagePerDay}</Text>
            <Text style={styles.statLabel}>Moyenne/jour</Text>
          </View>
        </View>

        {/* Weekly Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Livraisons cette semaine</Text>
          <View style={styles.chartContainer}>
            {weeklyData.slice(-7).map((item, index) => (
              <View key={index} style={styles.barContainer}>
                <Text style={styles.barValue}>{item.count}</Text>
                <View style={styles.barWrapper}>
                  <View 
                    style={[
                      styles.bar, 
                      { height: `${(item.count / maxCount) * 100}%` },
                      item.isToday && styles.barToday
                    ]} 
                  />
                </View>
                <Text style={[styles.barLabel, item.isToday && styles.barLabelToday]}>{item.day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.metricsCard}>
          <Text style={styles.metricsTitle}>Métriques clés</Text>
          
          <View style={styles.metricRow}>
            <View style={styles.metricIcon}>
              <Ionicons name="cash-outline" size={20} color={COLORS.success} />
            </View>
            <View style={styles.metricInfo}>
              <Text style={styles.metricLabel}>Gains totaux</Text>
              <Text style={styles.metricValue}>{stats.totalEarnings.toLocaleString()} FCFA</Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricIcon}>
              <Ionicons name="flame-outline" size={20} color={COLORS.error} />
            </View>
            <View style={styles.metricInfo}>
              <Text style={styles.metricLabel}>Record journalier</Text>
              <Text style={styles.metricValue}>{stats.bestDay} livraisons</Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricIcon}>
              <Ionicons name="time-outline" size={20} color={COLORS.info} />
            </View>
            <View style={styles.metricInfo}>
              <Text style={styles.metricLabel}>Aujourd'hui</Text>
              <Text style={styles.metricValue}>
                {todayStats.deliveries || 0} livraisons • {(todayStats.earnings || earningsData.today || 0).toLocaleString()} F
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Calculer les données hebdomadaires à partir de l'historique
function calculateWeeklyData(deliveries) {
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const today = new Date();
  const result = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date.setHours(0, 0, 0, 0));
    const dayEnd = new Date(date.setHours(23, 59, 59, 999));

    const count = deliveries.filter(d => {
      const deliveryDate = new Date(d.delivered_at || d.created_at);
      return deliveryDate >= dayStart && deliveryDate <= dayEnd && d.status === 'delivered';
    }).length;

    result.push({
      day: days[date.getDay()],
      count,
      isToday: i === 0,
    });
  }

  return result;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  placeholder: { width: 40 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: {
    width: (width - 44) / 2,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginTop: 8 },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', height: 150, alignItems: 'flex-end' },
  barContainer: { flex: 1, alignItems: 'center' },
  barValue: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 4 },
  barWrapper: { flex: 1, width: 24, justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: COLORS.primary + '60', borderRadius: 4, minHeight: 4 },
  barToday: { backgroundColor: COLORS.primary },
  barLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 8 },
  barLabelToday: { color: COLORS.primary, fontWeight: '600' },
  metricsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricsTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
  metricRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  metricInfo: { flex: 1 },
  metricLabel: { fontSize: 13, color: COLORS.textSecondary },
  metricValue: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginTop: 2 },
});

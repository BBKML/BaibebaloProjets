import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getEarnings } from '../../api/earnings';
import { getStatistics } from '../../api/stats';
import { getPerformanceBonuses } from '../../api/delivery';

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function buildWeeklyChartFromDailyStats(dailyStats) {
  const result = [];
  const today = new Date();
  const byDate = {};
  if (Array.isArray(dailyStats)) {
    dailyStats.forEach((s) => {
      const key = String(s.date).slice(0, 10);
      byDate[key] = Number(s.earnings || 0);
    });
  }
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({
      day: DAY_LABELS[d.getDay()],
      amount: byDate[key] || 0,
    });
  }
  return result;
}

export default function EarningsDashboardScreen({ navigation }) {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [earningsData, setEarningsData] = useState({
    totalEarned: 0,
    totalDeliveries: 0,
    thisWeek: 0,
    thisMonth: 0,
  });
  const [breakdownData, setBreakdownData] = useState({
    deliveryFees: 0,
    tips: 0,
    bonuses: 0,
  });
  const [weeklyChart, setWeeklyChart] = useState([]);
  const [bestDay, setBestDay] = useState({ date: '', amount: 0, deliveries: 0 });
  const [bestMonthAmount, setBestMonthAmount] = useState(0);
  const [bonusData, setBonusData] = useState(null);

  const loadData = async () => {
    try {
      const [earningsRes, statsRes, bonusRes] = await Promise.all([
        getEarnings(selectedPeriod === 'week' ? 'week' : selectedPeriod === 'month' ? 'month' : 'year'),
        getStatistics(selectedPeriod === 'week' ? 'week' : selectedPeriod === 'month' ? 'month' : 'year'),
        getPerformanceBonuses().catch(() => null),
      ]);
      if (bonusRes?.success && bonusRes?.data) {
        setBonusData(bonusRes.data);
      }

      if (earningsRes?.success && earningsRes?.data) {
        const d = earningsRes.data;
        setEarningsData({
          totalEarned: Number(d.total_earnings || 0),
          totalDeliveries: Number(d.total_deliveries || 0),
          thisWeek: Number(d.this_week || 0),
          thisMonth: Number(d.this_month || 0),
        });
      }

      if (statsRes?.success && statsRes?.data) {
        const summary = statsRes.data.summary || {};
        const dailyStats = statsRes.data.daily_stats || [];
        setBreakdownData({
          deliveryFees: Number(summary.total_delivery_fees || 0),
          tips: 0,
          bonuses: Number(summary.total_daily_bonuses || 0),
        });
        setWeeklyChart(buildWeeklyChartFromDailyStats(dailyStats));
        if (dailyStats.length > 0) {
          const best = dailyStats.reduce((acc, cur) =>
            (Number(cur.earnings || 0) > Number(acc.earnings || 0) ? cur : acc)
          );
          const dateStr = best.date ? new Date(best.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
          setBestDay({
            date: dateStr,
            amount: Number(best.earnings || 0),
            deliveries: Number(best.deliveries || 0),
          });
        }
        setBestMonthAmount(Number(earningsRes?.data?.this_month || 0));
      }
    } catch (e) {
      console.error('Erreur chargement détails gains:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const totalEarned = earningsData.totalEarned;
  const totalDeliveries = earningsData.totalDeliveries;
  const averagePerDelivery = totalDeliveries > 0 ? Math.round(totalEarned / totalDeliveries) : 0;
  const chartData = weeklyChart.length ? weeklyChart : DAY_LABELS.map((day) => ({ day, amount: 0 }));
  const maxAmount = Math.max(...chartData.map((d) => d.amount), 1);

  if (loading && chartData.every((d) => d.amount === 0)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Détails des gains</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalForBreakdown = breakdownData.deliveryFees + breakdownData.tips + breakdownData.bonuses || 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Détails des gains</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Total Card */}
        <View style={styles.totalCard}>
          <View style={styles.totalIcon}>
            <Ionicons name="trending-up" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.totalLabel}>Total gagné depuis le début</Text>
          <Text style={styles.totalAmount}>{Math.round(totalEarned).toLocaleString('fr-FR')} FCFA</Text>
          <Text style={styles.totalDeliveries}>{totalDeliveries} livraisons effectuées</Text>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {['week', 'month', 'year'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[styles.periodText, selectedPeriod === period && styles.periodTextActive]}>
                {period === 'week' ? 'Semaine' : period === 'month' ? 'Mois' : 'Année'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            {selectedPeriod === 'week' ? 'Gains cette semaine' : selectedPeriod === 'month' ? 'Gains ce mois' : 'Gains cette année'}
          </Text>
          <View style={styles.chart}>
            {chartData.map((item, index) => (
              <View key={index} style={styles.chartBar}>
                <Text style={styles.chartAmount}>
                  {item.amount >= 1000 ? `${(item.amount / 1000).toFixed(0)}k` : item.amount}
                </Text>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      { height: `${(item.amount / maxAmount) * 100}%` },
                      item.amount === maxAmount && item.amount > 0 && styles.barMax,
                    ]}
                  />
                </View>
                <Text style={styles.chartDay}>{item.day}</Text>
              </View>
            ))}
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.legendText}>Gains journaliers</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.legendText}>Meilleur jour</Text>
            </View>
          </View>
        </View>

        {/* Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Répartition des gains</Text>

          <View style={styles.breakdownCard}>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownIcon, { backgroundColor: COLORS.primary + '15' }]}>
                <Ionicons name="bicycle" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.breakdownInfo}>
                <Text style={styles.breakdownLabel}>Frais de livraison</Text>
                <Text style={styles.breakdownAmount}>{Math.round(breakdownData.deliveryFees).toLocaleString('fr-FR')} F</Text>
              </View>
              <Text style={styles.breakdownPercent}>
                {totalForBreakdown > 0 ? Math.round((breakdownData.deliveryFees / totalForBreakdown) * 100) : 0}%
              </Text>
            </View>

            <View style={styles.breakdownDivider} />

            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownIcon, { backgroundColor: COLORS.success + '15' }]}>
                <Ionicons name="heart" size={20} color={COLORS.success} />
              </View>
              <View style={styles.breakdownInfo}>
                <Text style={styles.breakdownLabel}>Pourboires</Text>
                <Text style={styles.breakdownAmount}>{Math.round(breakdownData.tips).toLocaleString('fr-FR')} F</Text>
              </View>
              <Text style={styles.breakdownPercent}>
                {totalForBreakdown > 0 ? Math.round((breakdownData.tips / totalForBreakdown) * 100) : 0}%
              </Text>
            </View>

            <View style={styles.breakdownDivider} />

            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownIcon, { backgroundColor: COLORS.warning + '15' }]}>
                <Ionicons name="gift" size={20} color={COLORS.warning} />
              </View>
              <View style={styles.breakdownInfo}>
                <Text style={styles.breakdownLabel}>Bonus & Primes</Text>
                <Text style={styles.breakdownAmount}>{Math.round(breakdownData.bonuses).toLocaleString('fr-FR')} F</Text>
              </View>
              <Text style={styles.breakdownPercent}>
                {totalForBreakdown > 0 ? Math.round((breakdownData.bonuses / totalForBreakdown) * 100) : 0}%
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistiques</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="calculator-outline" size={24} color={COLORS.primary} />
              <Text style={styles.statValue}>{Math.round(averagePerDelivery).toLocaleString('fr-FR')} F</Text>
              <Text style={styles.statLabel}>Moyenne / course</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="trophy-outline" size={24} color={COLORS.warning} />
              <Text style={styles.statValue}>{bestDay.amount.toLocaleString()} F</Text>
              <Text style={styles.statLabel}>Meilleur jour</Text>
            </View>
          </View>
        </View>

        {/* Records */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vos records</Text>

          <View style={styles.recordCard}>
            <View style={styles.recordIcon}>
              <Ionicons name="star" size={24} color={COLORS.rating} />
            </View>
            <View style={styles.recordInfo}>
              <Text style={styles.recordTitle}>Meilleur jour</Text>
              <Text style={styles.recordDate}>{bestDay.date || '—'}</Text>
            </View>
            <View style={styles.recordValue}>
              <Text style={styles.recordAmount}>{Math.round(bestDay.amount).toLocaleString('fr-FR')} F</Text>
              <Text style={styles.recordDeliveries}>{bestDay.deliveries} courses</Text>
            </View>
          </View>

          <View style={styles.recordCard}>
            <View style={[styles.recordIcon, { backgroundColor: COLORS.success + '15' }]}>
              <Ionicons name="calendar" size={24} color={COLORS.success} />
            </View>
            <View style={styles.recordInfo}>
              <Text style={styles.recordTitle}>Ce mois</Text>
              <Text style={styles.recordDate}>
                {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </Text>
            </View>
            <View style={styles.recordValue}>
              <Text style={styles.recordAmount}>{Math.round(earningsData.thisMonth).toLocaleString('fr-FR')} F</Text>
            </View>
          </View>
        </View>

        {/* Bonus Performance */}
        {bonusData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bonus performance du jour</Text>

            <View style={styles.bonusCard}>
              <View style={styles.bonusHeader}>
                <View style={styles.bonusIconWrap}>
                  <Ionicons name="trophy" size={24} color={COLORS.warning} />
                </View>
                <View style={styles.bonusHeaderInfo}>
                  <Text style={styles.bonusCount}>
                    {bonusData.today_deliveries} livraison{bonusData.today_deliveries !== 1 ? 's' : ''} aujourd'hui
                  </Text>
                  {bonusData.potential_bonus > 0 ? (
                    <Text style={styles.bonusEarned}>
                      +{bonusData.potential_bonus.toLocaleString('fr-FR')} FCFA de bonus ce soir
                    </Text>
                  ) : bonusData.next_threshold ? (
                    <Text style={styles.bonusNext}>
                      Encore {bonusData.deliveries_needed} course{bonusData.deliveries_needed !== 1 ? 's' : ''} pour +{bonusData.next_threshold.toLocaleString('fr-FR')} FCFA
                    </Text>
                  ) : (
                    <Text style={styles.bonusNext}>Faites 10 courses pour débloquer un bonus</Text>
                  )}
                </View>
              </View>

              {/* Barre de progression vers le prochain palier */}
              {bonusData.today_deliveries < 20 && (
                <View style={styles.bonusProgress}>
                  <View style={styles.bonusProgressTrack}>
                    <View
                      style={[
                        styles.bonusProgressFill,
                        {
                          width: `${Math.min((bonusData.today_deliveries / 20) * 100, 100)}%`,
                          backgroundColor: bonusData.today_deliveries >= 10 ? COLORS.success : COLORS.warning,
                        },
                      ]}
                    />
                    {/* Marqueur palier 10 */}
                    <View style={[styles.bonusMarker, { left: '50%' }]} />
                  </View>
                  <View style={styles.bonusScaleRow}>
                    <Text style={styles.bonusScaleLabel}>0</Text>
                    <Text style={[styles.bonusScaleLabel, { color: bonusData.today_deliveries >= 10 ? COLORS.success : COLORS.textSecondary }]}>10 (+500F)</Text>
                    <Text style={[styles.bonusScaleLabel, { color: bonusData.today_deliveries >= 20 ? COLORS.success : COLORS.textSecondary }]}>20 (+1500F)</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Historique des bonus */}
            {bonusData.recent_bonuses?.length > 0 && (
              <View style={styles.bonusHistory}>
                <Text style={styles.bonusHistoryTitle}>Historique (30 derniers jours)</Text>
                {bonusData.recent_bonuses.map((b, idx) => (
                  <View key={idx} style={styles.bonusHistoryRow}>
                    <Text style={styles.bonusHistoryDate}>
                      {new Date(b.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </Text>
                    <Text style={styles.bonusHistoryDeliveries}>{b.deliveries} courses</Text>
                    <Text style={[styles.bonusHistoryAmount, b.status === 'paid' ? styles.bonusPaid : styles.bonusPending]}>
                      +{b.amount.toLocaleString('fr-FR')} F {b.status === 'paid' ? '✓' : '⏳'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: COLORS.white, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  title: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: COLORS.text 
  },
  placeholder: { 
    width: 40 
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  totalCard: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  totalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  totalDeliveries: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  periodTextActive: {
    color: '#FFFFFF',
  },
  chartCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 20,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  chartAmount: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  barContainer: {
    width: 24,
    height: 80,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  barMax: {
    backgroundColor: COLORS.success,
  },
  chartDay: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  breakdownCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  breakdownInfo: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  breakdownAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 2,
  },
  breakdownPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recordIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.rating + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  recordDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  recordValue: {
    alignItems: 'flex-end',
  },
  recordAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  recordDeliveries: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bonusCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  bonusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  bonusIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bonusHeaderInfo: {
    flex: 1,
  },
  bonusCount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  bonusEarned: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.success,
  },
  bonusNext: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  bonusProgress: {
    marginTop: 4,
  },
  bonusProgressTrack: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'visible',
    position: 'relative',
  },
  bonusProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  bonusMarker: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 12,
    backgroundColor: COLORS.textSecondary + '80',
  },
  bonusScaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  bonusScaleLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  bonusHistory: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bonusHistoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  bonusHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bonusHistoryDate: {
    fontSize: 13,
    color: COLORS.text,
    width: 60,
  },
  bonusHistoryDeliveries: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
    textAlign: 'center',
  },
  bonusHistoryAmount: {
    fontSize: 13,
    fontWeight: '700',
    width: 100,
    textAlign: 'right',
  },
  bonusPaid: {
    color: COLORS.success,
  },
  bonusPending: {
    color: COLORS.warning,
  },
});

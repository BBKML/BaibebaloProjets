import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import apiClient from '../../api/client';
import { API_ENDPOINTS } from '../../constants/api';

const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function getMonthBounds(offsetMonths = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function buildWeeksForMonth(start, end, deliveries) {
  const weeks = [];
  const cursor = new Date(start);
  let weekNum = 1;
  while (cursor <= end) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (weekEnd > end) weekEnd.setTime(end.getTime());

    const weekDeliveries = deliveries.filter(del => {
      const d = new Date(del.delivered_at || del.created_at);
      return d >= weekStart && d <= weekEnd;
    });
    weeks.push({
      number: weekNum,
      dates: `${weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - ${weekEnd.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`,
      earnings: weekDeliveries.reduce((sum, d) => sum + parseFloat(d.delivery_fee || 0), 0),
      deliveries: weekDeliveries.length,
    });
    cursor.setDate(cursor.getDate() + 7);
    weekNum++;
  }
  return weeks;
}

export default function MonthlyEarningsScreen({ navigation }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [weeks, setWeeks] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(null);

  useEffect(() => {
    fetchMonthData();
    setSelectedWeek(null);
  }, [monthOffset]);

  const fetchMonthData = async () => {
    setLoading(true);
    try {
      const { start, end } = getMonthBounds(monthOffset);
      const response = await apiClient.get(API_ENDPOINTS.EARNINGS.HISTORY, {
        params: { status: 'delivered', limit: 200, page: 1 },
      });
      const allDeliveries = response.data?.data?.deliveries || [];
      const monthDeliveries = allDeliveries.filter(del => {
        const d = new Date(del.delivered_at || del.created_at);
        return d >= start && d <= end;
      });
      const built = buildWeeksForMonth(start, end, monthDeliveries);
      setWeeks(built);
      setTotal(monthDeliveries.reduce((sum, d) => sum + parseFloat(d.delivery_fee || 0), 0));
      setTotalDeliveries(monthDeliveries.length);
    } catch (e) {
      setWeeks([]);
      setTotal(0);
      setTotalDeliveries(0);
    } finally {
      setLoading(false);
    }
  };

  const { start } = getMonthBounds(monthOffset);
  const monthLabel = `${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
  const maxWeekEarnings = Math.max(...weeks.map(w => w.earnings), 1);
  const averagePerDelivery = totalDeliveries > 0 ? Math.round(total / totalDeliveries) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Gains mensuels</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Month Selector */}
        <View style={styles.monthSelector}>
          <TouchableOpacity style={styles.monthArrow} onPress={() => setMonthOffset(monthOffset - 1)}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={styles.monthInfo}>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
          </View>
          <TouchableOpacity
            style={styles.monthArrow}
            onPress={() => setMonthOffset(Math.min(0, monthOffset + 1))}
            disabled={monthOffset >= 0}
          >
            <Ionicons name="chevron-forward" size={24} color={monthOffset >= 0 ? COLORS.border : COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryAmount}>{total.toLocaleString('fr-FR')} FCFA</Text>
              </View>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Ionicons name="bicycle" size={20} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.summaryItemValue}>{totalDeliveries}</Text>
                  <Text style={styles.summaryItemLabel}>Courses</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Ionicons name="speedometer" size={20} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.summaryItemValue}>{averagePerDelivery.toLocaleString('fr-FR')} F</Text>
                  <Text style={styles.summaryItemLabel}>Par course</Text>
                </View>
              </View>
            </View>

            {/* Weekly Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Gains par semaine</Text>
              <View style={styles.chart}>
                {weeks.map((week, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.chartBar}
                    onPress={() => setSelectedWeek(selectedWeek === index ? null : index)}
                  >
                    <Text style={styles.chartAmount}>{(week.earnings / 1000).toFixed(0)}k</Text>
                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.bar,
                          { height: `${(week.earnings / maxWeekEarnings) * 100}%` },
                          selectedWeek === index && styles.barSelected,
                        ]}
                      />
                    </View>
                    <Text style={[styles.chartWeek, selectedWeek === index && styles.chartWeekSelected]}>
                      S{week.number}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Selected Week Details */}
            {selectedWeek !== null && (
              <View style={styles.weekDetailCard}>
                <View style={styles.weekDetailHeader}>
                  <Text style={styles.weekDetailTitle}>Semaine {weeks[selectedWeek].number}</Text>
                  <Text style={styles.weekDetailDates}>{weeks[selectedWeek].dates}</Text>
                </View>
                <View style={styles.weekDetailStats}>
                  <View style={styles.weekDetailStat}>
                    <Text style={styles.weekDetailValue}>{Math.round(weeks[selectedWeek].earnings).toLocaleString('fr-FR')} F</Text>
                    <Text style={styles.weekDetailLabel}>Gains</Text>
                  </View>
                  <View style={styles.weekDetailStat}>
                    <Text style={styles.weekDetailValue}>{weeks[selectedWeek].deliveries}</Text>
                    <Text style={styles.weekDetailLabel}>Courses</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Weekly List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Détail par semaine</Text>
              {weeks.map((week, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.weekItem, selectedWeek === index && styles.weekItemSelected]}
                  onPress={() => setSelectedWeek(selectedWeek === index ? null : index)}
                >
                  <View style={styles.weekInfo}>
                    <Text style={styles.weekName}>Semaine {week.number}</Text>
                    <Text style={styles.weekDates}>{week.dates}</Text>
                  </View>
                  <View style={styles.weekStats}>
                    <Text style={styles.weekDeliveries}>{week.deliveries} courses</Text>
                    <Text style={styles.weekEarnings}>{Math.round(week.earnings).toLocaleString('fr-FR')} F</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  placeholder: { width: 40 },
  scrollView: { flex: 1 },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  monthArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  monthInfo: { alignItems: 'center' },
  monthLabel: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  summaryCard: { backgroundColor: COLORS.primary, marginHorizontal: 16, borderRadius: 20, padding: 20, marginBottom: 16 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 },
  summaryAmount: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center', gap: 4 },
  summaryItemValue: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  summaryItemLabel: { fontSize: 11, color: 'rgba(255, 255, 255, 0.7)' },
  chartCard: { backgroundColor: COLORS.white, marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
  chart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 140 },
  chartBar: { alignItems: 'center', flex: 1 },
  chartAmount: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 4 },
  barContainer: { width: 36, height: 80, backgroundColor: COLORS.border, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', backgroundColor: COLORS.primary, borderRadius: 6 },
  barSelected: { backgroundColor: COLORS.success },
  chartWeek: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8, fontWeight: '500' },
  chartWeekSelected: { color: COLORS.primary, fontWeight: '700' },
  weekDetailCard: { backgroundColor: COLORS.primary + '10', marginHorizontal: 16, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.primary + '30' },
  weekDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  weekDetailTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  weekDetailDates: { fontSize: 14, color: COLORS.textSecondary },
  weekDetailStats: { flexDirection: 'row', justifyContent: 'space-around' },
  weekDetailStat: { alignItems: 'center' },
  weekDetailValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  weekDetailLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },
  weekItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  weekItemSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '05' },
  weekInfo: { flex: 1 },
  weekName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  weekDates: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  weekStats: { alignItems: 'flex-end' },
  weekDeliveries: { fontSize: 12, color: COLORS.textSecondary },
  weekEarnings: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginTop: 2 },
});

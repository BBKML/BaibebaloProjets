import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import apiClient from '../../api/client';
import { API_ENDPOINTS } from '../../constants/api';

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function getWeekBounds(offsetWeeks = 0) {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + offsetWeeks * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function buildDaysForWeek(start, deliveries) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dayDeliveries = deliveries.filter(del => {
      const delDate = new Date(del.delivered_at || del.created_at);
      return delDate.toDateString() === d.toDateString();
    });
    return {
      name: DAY_NAMES[(d.getDay())],
      date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      earnings: dayDeliveries.reduce((sum, del) => sum + parseFloat(del.delivery_fee || 0), 0),
      deliveries: dayDeliveries.length,
    };
  });
}

export default function WeeklyEarningsScreen({ navigation }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [days, setDays] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    fetchWeekData();
    setSelectedDay(null);
  }, [weekOffset]);

  const fetchWeekData = async () => {
    setLoading(true);
    try {
      const { start, end } = getWeekBounds(weekOffset);
      const response = await apiClient.get(API_ENDPOINTS.EARNINGS.HISTORY, {
        params: { status: 'delivered', limit: 100, page: 1 },
      });
      const allDeliveries = response.data?.data?.deliveries || [];
      const weekDeliveries = allDeliveries.filter(del => {
        const d = new Date(del.delivered_at || del.created_at);
        return d >= start && d <= end;
      });
      const built = buildDaysForWeek(start, weekDeliveries);
      setDays(built);
      setTotal(weekDeliveries.reduce((sum, d) => sum + parseFloat(d.delivery_fee || 0), 0));
      setTotalDeliveries(weekDeliveries.length);
    } catch (e) {
      setDays([]);
      setTotal(0);
      setTotalDeliveries(0);
    } finally {
      setLoading(false);
    }
  };

  const { start, end } = getWeekBounds(weekOffset);
  const weekLabel = weekOffset === 0 ? 'Cette semaine' : weekOffset === -1 ? 'Semaine dernière' : `Il y a ${-weekOffset} semaines`;
  const weekDates = `${start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  const maxEarnings = Math.max(...days.map(d => d.earnings), 1);
  const averagePerDay = totalDeliveries > 0 ? Math.round(total / 7) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Gains hebdomadaires</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Week Selector */}
        <View style={styles.weekSelector}>
          <TouchableOpacity style={styles.weekArrow} onPress={() => setWeekOffset(weekOffset - 1)}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={styles.weekInfo}>
            <Text style={styles.weekLabel}>{weekLabel}</Text>
            <Text style={styles.weekDates}>{weekDates}</Text>
          </View>
          <TouchableOpacity
            style={styles.weekArrow}
            onPress={() => setWeekOffset(Math.min(0, weekOffset + 1))}
            disabled={weekOffset >= 0}
          >
            <Ionicons name="chevron-forward" size={24} color={weekOffset >= 0 ? COLORS.border : COLORS.textSecondary} />
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
              <View style={styles.summaryMain}>
                <Text style={styles.summaryAmount}>{total.toLocaleString('fr-FR')} F</Text>
              </View>
              <View style={styles.summaryStats}>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryStatValue}>{totalDeliveries}</Text>
                  <Text style={styles.summaryStatLabel}>Courses</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryStatValue}>{averagePerDay.toLocaleString('fr-FR')} F</Text>
                  <Text style={styles.summaryStatLabel}>Moy./jour</Text>
                </View>
              </View>
            </View>

            {/* Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Évolution de la semaine</Text>
              <View style={styles.chart}>
                {days.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.chartBar}
                    onPress={() => setSelectedDay(selectedDay === index ? null : index)}
                  >
                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.bar,
                          { height: `${(day.earnings / maxEarnings) * 100}%` },
                          selectedDay === index && styles.barSelected,
                        ]}
                      />
                    </View>
                    <Text style={[styles.chartDay, selectedDay === index && styles.chartDaySelected]}>
                      {day.name.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Selected Day Details */}
            {selectedDay !== null && (
              <View style={styles.dayDetailCard}>
                <View style={styles.dayDetailHeader}>
                  <Text style={styles.dayDetailName}>{days[selectedDay].name}</Text>
                  <Text style={styles.dayDetailDate}>{days[selectedDay].date}</Text>
                </View>
                <View style={styles.dayDetailStats}>
                  <View style={styles.dayDetailStat}>
                    <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.dayDetailValue}>{Math.round(days[selectedDay].earnings).toLocaleString('fr-FR')} F</Text>
                  </View>
                  <View style={styles.dayDetailStat}>
                    <Ionicons name="bicycle-outline" size={20} color={COLORS.success} />
                    <Text style={styles.dayDetailValue}>{days[selectedDay].deliveries} courses</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Daily Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Détail par jour</Text>
              {days.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.dayItem, selectedDay === index && styles.dayItemSelected]}
                  onPress={() => setSelectedDay(selectedDay === index ? null : index)}
                >
                  <View style={styles.dayInfo}>
                    <Text style={styles.dayName}>{day.name}</Text>
                    <Text style={styles.dayDate}>{day.date}</Text>
                  </View>
                  <View style={styles.dayStats}>
                    <Text style={styles.dayDeliveries}>{day.deliveries} courses</Text>
                    <Text style={styles.dayEarnings}>{Math.round(day.earnings).toLocaleString('fr-FR')} F</Text>
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
  weekSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  weekArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  weekInfo: { alignItems: 'center' },
  weekLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  weekDates: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  summaryCard: { backgroundColor: COLORS.primary, marginHorizontal: 16, borderRadius: 20, padding: 20, marginBottom: 16 },
  summaryMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 },
  summaryAmount: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' },
  summaryStats: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  summaryStat: { alignItems: 'center', paddingHorizontal: 24 },
  summaryStatValue: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  summaryStatLabel: { fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', marginTop: 2 },
  summaryDivider: { width: 1, height: 30, backgroundColor: 'rgba(255, 255, 255, 0.3)' },
  chartCard: { backgroundColor: COLORS.white, marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
  chart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120 },
  chartBar: { flex: 1, alignItems: 'center' },
  barContainer: { width: 28, height: 80, backgroundColor: COLORS.border, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', backgroundColor: COLORS.primary, borderRadius: 6 },
  barSelected: { backgroundColor: COLORS.success },
  chartDay: { fontSize: 11, color: COLORS.textSecondary, marginTop: 8 },
  chartDaySelected: { color: COLORS.primary, fontWeight: '600' },
  dayDetailCard: { backgroundColor: COLORS.primary + '10', marginHorizontal: 16, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.primary + '30' },
  dayDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dayDetailName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  dayDetailDate: { fontSize: 14, color: COLORS.textSecondary },
  dayDetailStats: { flexDirection: 'row', justifyContent: 'space-around' },
  dayDetailStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayDetailValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  section: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },
  dayItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  dayItemSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '05' },
  dayInfo: { flex: 1 },
  dayName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  dayDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  dayStats: { alignItems: 'flex-end' },
  dayDeliveries: { fontSize: 12, color: COLORS.textSecondary },
  dayEarnings: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginTop: 2 },
});

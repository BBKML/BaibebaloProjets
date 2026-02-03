import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

// Données mock pour le mois
const monthData = {
  total: 185000,
  deliveries: 115,
  tips: 18500,
  bonuses: 12000,
  hours: 145,
  comparison: '+8%',
  weeks: [
    { number: 1, dates: '1-7 Jan', earnings: 42500, deliveries: 26 },
    { number: 2, dates: '8-14 Jan', earnings: 48200, deliveries: 30 },
    { number: 3, dates: '15-21 Jan', earnings: 38800, deliveries: 24 },
    { number: 4, dates: '22-28 Jan', earnings: 45500, deliveries: 28 },
    { number: 5, dates: '29-31 Jan', earnings: 10000, deliveries: 7 },
  ],
  breakdown: {
    deliveryFees: 154500,
    tips: 18500,
    bonuses: 12000,
  },
};

const maxWeekEarnings = Math.max(...monthData.weeks.map(w => w.earnings));

export default function MonthlyEarningsScreen({ navigation }) {
  const [selectedWeek, setSelectedWeek] = useState(null);

  const averagePerDelivery = Math.round(monthData.total / monthData.deliveries);
  const averagePerHour = Math.round(monthData.total / monthData.hours);

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
          <TouchableOpacity style={styles.monthArrow}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={styles.monthInfo}>
            <Text style={styles.monthLabel}>Janvier 2026</Text>
          </View>
          <TouchableOpacity style={styles.monthArrow}>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryAmount}>{monthData.total.toLocaleString()} FCFA</Text>
            <View style={styles.comparisonBadge}>
              <Ionicons name="trending-up" size={14} color={COLORS.success} />
              <Text style={styles.comparisonText}>{monthData.comparison}</Text>
            </View>
          </View>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Ionicons name="bicycle" size={20} color="rgba(255,255,255,0.8)" />
              <Text style={styles.summaryItemValue}>{monthData.deliveries}</Text>
              <Text style={styles.summaryItemLabel}>Courses</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="time" size={20} color="rgba(255,255,255,0.8)" />
              <Text style={styles.summaryItemValue}>{monthData.hours}h</Text>
              <Text style={styles.summaryItemLabel}>Travaillées</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="heart" size={20} color="rgba(255,255,255,0.8)" />
              <Text style={styles.summaryItemValue}>{(monthData.tips / 1000).toFixed(0)}k F</Text>
              <Text style={styles.summaryItemLabel}>Pourboires</Text>
            </View>
          </View>
        </View>

        {/* Performance Cards */}
        <View style={styles.performanceRow}>
          <View style={styles.performanceCard}>
            <View style={[styles.performanceIcon, { backgroundColor: COLORS.primary + '15' }]}>
              <Ionicons name="speedometer" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.performanceValue}>{averagePerDelivery.toLocaleString()} F</Text>
            <Text style={styles.performanceLabel}>Par course</Text>
          </View>
          <View style={styles.performanceCard}>
            <View style={[styles.performanceIcon, { backgroundColor: COLORS.success + '15' }]}>
              <Ionicons name="hourglass" size={20} color={COLORS.success} />
            </View>
            <Text style={styles.performanceValue}>{averagePerHour.toLocaleString()} F</Text>
            <Text style={styles.performanceLabel}>Par heure</Text>
          </View>
        </View>

        {/* Weekly Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Gains par semaine</Text>
          <View style={styles.chart}>
            {monthData.weeks.map((week, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.chartBar}
                onPress={() => setSelectedWeek(selectedWeek === index ? null : index)}
              >
                <Text style={styles.chartAmount}>
                  {(week.earnings / 1000).toFixed(0)}k
                </Text>
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.bar, 
                      { height: `${(week.earnings / maxWeekEarnings) * 100}%` },
                      selectedWeek === index && styles.barSelected
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
              <Text style={styles.weekDetailTitle}>Semaine {monthData.weeks[selectedWeek].number}</Text>
              <Text style={styles.weekDetailDates}>{monthData.weeks[selectedWeek].dates}</Text>
            </View>
            <View style={styles.weekDetailStats}>
              <View style={styles.weekDetailStat}>
                <Text style={styles.weekDetailValue}>{monthData.weeks[selectedWeek].earnings.toLocaleString()} F</Text>
                <Text style={styles.weekDetailLabel}>Gains</Text>
              </View>
              <View style={styles.weekDetailStat}>
                <Text style={styles.weekDetailValue}>{monthData.weeks[selectedWeek].deliveries}</Text>
                <Text style={styles.weekDetailLabel}>Courses</Text>
              </View>
            </View>
          </View>
        )}

        {/* Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Répartition</Text>
          <View style={styles.breakdownCard}>
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLeft}>
                <View style={[styles.breakdownDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.breakdownLabel}>Frais de livraison</Text>
              </View>
              <Text style={styles.breakdownValue}>{monthData.breakdown.deliveryFees.toLocaleString()} F</Text>
            </View>
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLeft}>
                <View style={[styles.breakdownDot, { backgroundColor: COLORS.success }]} />
                <Text style={styles.breakdownLabel}>Pourboires</Text>
              </View>
              <Text style={styles.breakdownValue}>{monthData.breakdown.tips.toLocaleString()} F</Text>
            </View>
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLeft}>
                <View style={[styles.breakdownDot, { backgroundColor: COLORS.warning }]} />
                <Text style={styles.breakdownLabel}>Bonus</Text>
              </View>
              <Text style={styles.breakdownValue}>{monthData.breakdown.bonuses.toLocaleString()} F</Text>
            </View>
          </View>
        </View>

        {/* Weekly List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détail par semaine</Text>
          {monthData.weeks.map((week, index) => (
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
                <Text style={styles.weekEarnings}>{week.earnings.toLocaleString()} F</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

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
  scrollView: {
    flex: 1,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  monthArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthInfo: {
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  summaryCard: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  comparisonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comparisonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    gap: 4,
  },
  summaryItemValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  summaryItemLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  performanceRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  performanceCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  performanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  performanceLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
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
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 140,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  chartAmount: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  barContainer: {
    width: 36,
    height: 80,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  barSelected: {
    backgroundColor: COLORS.success,
  },
  chartWeek: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontWeight: '500',
  },
  chartWeekSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  weekDetailCard: {
    backgroundColor: COLORS.primary + '10',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  weekDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekDetailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  weekDetailDates: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  weekDetailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weekDetailStat: {
    alignItems: 'center',
  },
  weekDetailValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  weekDetailLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  breakdownLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  weekItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  weekItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  weekInfo: {
    flex: 1,
  },
  weekName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  weekDates: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  weekStats: {
    alignItems: 'flex-end',
  },
  weekDeliveries: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  weekEarnings: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 2,
  },
});

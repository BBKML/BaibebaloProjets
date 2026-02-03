import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

// Données mock pour la semaine
const weekData = {
  total: 67800,
  deliveries: 42,
  averagePerDay: 9685,
  comparison: '+12%', // vs semaine dernière
  days: [
    { name: 'Lundi', date: '27 Jan', earnings: 8500, deliveries: 5, hours: 4.5 },
    { name: 'Mardi', date: '28 Jan', earnings: 12300, deliveries: 7, hours: 6 },
    { name: 'Mercredi', date: '29 Jan', earnings: 9800, deliveries: 6, hours: 5 },
    { name: 'Jeudi', date: '30 Jan', earnings: 11200, deliveries: 7, hours: 5.5 },
    { name: 'Vendredi', date: '31 Jan', earnings: 14500, deliveries: 9, hours: 7 },
    { name: 'Samedi', date: '1 Fév', earnings: 8200, deliveries: 5, hours: 4 },
    { name: 'Dimanche', date: '2 Fév', earnings: 3300, deliveries: 3, hours: 2 },
  ],
};

const maxEarnings = Math.max(...weekData.days.map(d => d.earnings));

export default function WeeklyEarningsScreen({ navigation }) {
  const [selectedDay, setSelectedDay] = useState(null);

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
          <TouchableOpacity style={styles.weekArrow}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={styles.weekInfo}>
            <Text style={styles.weekLabel}>Cette semaine</Text>
            <Text style={styles.weekDates}>27 Jan - 2 Fév 2026</Text>
          </View>
          <TouchableOpacity style={styles.weekArrow}>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryMain}>
            <Text style={styles.summaryAmount}>{weekData.total.toLocaleString()} F</Text>
            <View style={styles.comparisonBadge}>
              <Ionicons name="trending-up" size={14} color={COLORS.success} />
              <Text style={styles.comparisonText}>{weekData.comparison}</Text>
            </View>
          </View>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>{weekData.deliveries}</Text>
              <Text style={styles.summaryStatLabel}>Courses</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>{weekData.averagePerDay.toLocaleString()} F</Text>
              <Text style={styles.summaryStatLabel}>Moy./jour</Text>
            </View>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Évolution de la semaine</Text>
          <View style={styles.chart}>
            {weekData.days.map((day, index) => (
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
                      selectedDay === index && styles.barSelected
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
              <Text style={styles.dayDetailName}>{weekData.days[selectedDay].name}</Text>
              <Text style={styles.dayDetailDate}>{weekData.days[selectedDay].date}</Text>
            </View>
            <View style={styles.dayDetailStats}>
              <View style={styles.dayDetailStat}>
                <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
                <Text style={styles.dayDetailValue}>{weekData.days[selectedDay].earnings.toLocaleString()} F</Text>
              </View>
              <View style={styles.dayDetailStat}>
                <Ionicons name="bicycle-outline" size={20} color={COLORS.success} />
                <Text style={styles.dayDetailValue}>{weekData.days[selectedDay].deliveries} courses</Text>
              </View>
              <View style={styles.dayDetailStat}>
                <Ionicons name="time-outline" size={20} color={COLORS.info} />
                <Text style={styles.dayDetailValue}>{weekData.days[selectedDay].hours}h</Text>
              </View>
            </View>
          </View>
        )}

        {/* Daily Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détail par jour</Text>
          {weekData.days.map((day, index) => (
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
                <Text style={styles.dayEarnings}>{day.earnings.toLocaleString()} F</Text>
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
  weekSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  weekArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekInfo: {
    alignItems: 'center',
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  weekDates: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  summaryMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
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
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryStat: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  summaryStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  summaryStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
    height: 120,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    width: 28,
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
  chartDay: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  chartDaySelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  dayDetailCard: {
    backgroundColor: COLORS.primary + '10',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  dayDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayDetailName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  dayDetailDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  dayDetailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayDetailStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  section: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  dayItem: {
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
  dayItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  dayDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dayStats: {
    alignItems: 'flex-end',
  },
  dayDeliveries: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  dayEarnings: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 2,
  },
});

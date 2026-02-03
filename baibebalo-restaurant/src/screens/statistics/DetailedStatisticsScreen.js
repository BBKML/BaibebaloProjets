import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

export default function DetailedStatisticsScreen({ navigation }) {
  const [period, setPeriod] = useState('month');
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadStatistics();
  }, [period]);

  const loadStatistics = async () => {
    try {
      const { restaurantApi } = require('../../api/restaurant');
      
      // Charger les statistiques depuis le backend
      const statsResponse = await restaurantApi.getStatistics(period);
      const statsData = statsResponse.data?.statistics || statsResponse.statistics || {};
      
      // Utiliser les données du backend directement
      const totalOrders = statsData.delivered_orders + statsData.cancelled_orders || 0;
      const delivered = statsData.delivered_orders || 0;
      const cancelled = statsData.cancelled_orders || 0;
      const refused = statsData.accepted_vs_refused?.[1]?.population || 0;
      const accepted = statsData.accepted_vs_refused?.[0]?.population || 0;
      
      // Calculer le CA total depuis les données quotidiennes
      const totalRevenue = statsData.daily_stats?.reduce((sum, day) => sum + (day.revenue || 0), 0) || statsData.today_revenue || 0;
      
      setStats({
        totalOrders: totalOrders || delivered + cancelled + refused,
        deliveredOrders: delivered,
        cancelledOrders: cancelled,
        refusedOrders: refused,
        totalRevenue: totalRevenue,
        averageOrderValue: delivered > 0 ? totalRevenue / delivered : 0,
        averagePreparationTime: statsData.average_preparation_time || 0,
        dailyStats: statsData.daily_stats || [],
        topDishes: statsData.top_dishes || [],
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
      // Données par défaut en cas d'erreur
      setStats({
        totalOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        refusedOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        averagePreparationTime: 0,
        dailyStats: [],
        topDishes: [],
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStatistics();
    setRefreshing(false);
  };

  const periods = [
    { key: 'today', label: "Aujourd'hui" },
    { key: 'week', label: 'Cette semaine' },
    { key: 'month', label: 'Ce mois' },
    { key: 'custom', label: 'Personnalisée' },
  ];

  if (!stats) {
    return (
      <View style={styles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Statistiques détaillées</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Filtres période */}
        <View style={styles.filtersContainer}>
          {periods.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.filterChip, period === p.key && styles.filterChipActive]}
              onPress={() => setPeriod(p.key)}
            >
              <Text
                style={[styles.filterChipText, period === p.key && styles.filterChipTextActive]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Vue d'ensemble */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
          <View style={styles.overviewCard}>
            <View style={styles.overviewRow}>
              <Text style={styles.overviewLabel}>Commandes totales</Text>
              <Text style={styles.overviewValue}>{stats.totalOrders}</Text>
            </View>
            <View style={styles.overviewRow}>
              <Text style={styles.overviewLabel}>Commandes livrées</Text>
              <Text style={[styles.overviewValue, { color: COLORS.success }]}>
                {stats.deliveredOrders} ({Math.round((stats.deliveredOrders / stats.totalOrders) * 100)}%)
              </Text>
            </View>
            <View style={styles.overviewRow}>
              <Text style={styles.overviewLabel}>Commandes annulées</Text>
              <Text style={[styles.overviewValue, { color: COLORS.error }]}>
                {stats.cancelledOrders} ({Math.round((stats.cancelledOrders / stats.totalOrders) * 100)}%)
              </Text>
            </View>
            <View style={styles.overviewRow}>
              <Text style={styles.overviewLabel}>Commandes refusées</Text>
              <Text style={[styles.overviewValue, { color: COLORS.warning }]}>
                {stats.refusedOrders} ({Math.round((stats.refusedOrders / stats.totalOrders) * 100)}%)
              </Text>
            </View>
            <View style={[styles.overviewRow, styles.overviewTotal]}>
              <Text style={styles.overviewTotalLabel}>CA total</Text>
              <Text style={styles.overviewTotalValue}>
                {stats.totalRevenue.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
            <View style={styles.overviewRow}>
              <Text style={styles.overviewLabel}>CA moyen par commande</Text>
              <Text style={styles.overviewValue}>
                {stats.averageOrderValue.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
            <View style={styles.overviewRow}>
              <Text style={styles.overviewLabel}>Temps moy. de préparation</Text>
              <Text style={styles.overviewValue}>{stats.averagePreparationTime} minutes</Text>
            </View>
          </View>
        </View>

        {/* Statistiques par jour */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistiques par jour</Text>
          <View style={styles.dailyStatsCard}>
            {stats.dailyStats && stats.dailyStats.length > 0 ? (
              stats.dailyStats.map((day, index) => (
                <View key={index} style={styles.dailyStatRow}>
                  <Text style={styles.dailyStatDate}>{day.date}</Text>
                  <View style={styles.dailyStatInfo}>
                    <Text style={styles.dailyStatOrders}>{day.orders} commandes</Text>
                    <Text style={styles.dailyStatRevenue}>{day.revenue.toLocaleString('fr-FR')} FCFA</Text>
                  </View>
                  <Text style={styles.dailyStatRate}>
                    {day.acceptanceRate}% acceptées
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Aucune donnée disponible</Text>
            )}
          </View>
        </View>

        {/* Top plats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plats les plus vendus</Text>
          <View style={styles.topDishesCard}>
            {stats.topDishes && stats.topDishes.length > 0 ? (
              stats.topDishes.map((dish, index) => (
                <View key={index} style={styles.topDishRow}>
                  <View style={styles.topDishRank}>
                    <Text style={styles.topDishRankText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.topDishInfo}>
                    <Text style={styles.topDishName}>{dish.name}</Text>
                    <Text style={styles.topDishStats}>
                      {dish.sales} ventes - {dish.revenue.toLocaleString('fr-FR')} FCFA
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Aucune donnée disponible</Text>
            )}
          </View>
        </View>

        {/* Export */}
        <TouchableOpacity style={styles.exportButton}>
          <Ionicons name="download-outline" size={20} color={COLORS.primary} />
          <Text style={styles.exportButtonText}>Exporter les données</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 70,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  overviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  overviewTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    marginTop: 8,
  },
  overviewLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  overviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  overviewTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  overviewTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  dailyStatsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  dailyStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dailyStatDate: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    width: 80,
  },
  dailyStatInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  dailyStatOrders: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  dailyStatRevenue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  dailyStatRate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    width: 80,
    textAlign: 'right',
  },
  topDishesCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  topDishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  topDishRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topDishRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  topDishInfo: {
    flex: 1,
  },
  topDishName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  topDishStats: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

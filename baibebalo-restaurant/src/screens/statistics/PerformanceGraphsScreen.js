import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { COLORS } from '../../constants/colors';
import { restaurantApi } from '../../api/restaurant';

const { width } = Dimensions.get('window');

export default function PerformanceGraphsScreen({ navigation }) {
  const [period, setPeriod] = useState('week');
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadGraphData();
  }, [period]);

  const loadGraphData = async () => {
    try {
      setLoading(true);
      const response = await restaurantApi.getStatistics(period);
      const stats = response.data?.statistics || response.statistics || {};
      
      // Utiliser les données réelles du backend
      setGraphData({
        revenueEvolution: stats.revenue_evolution || {
          labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
          datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }],
        },
        ordersPerDay: stats.orders_per_day || {
          labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
          datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }],
        },
        peakHours: stats.peak_hours || {
          labels: Array.from({ length: 24 }, (_, i) => i.toString()),
          datasets: [{ data: Array.from({ length: 24 }, () => 0) }],
        },
        acceptedVsRefused: stats.accepted_vs_refused || [
          { name: 'Acceptées', population: 0, color: COLORS.success, legendFontColor: COLORS.text },
          { name: 'Refusées', population: 0, color: COLORS.error, legendFontColor: COLORS.text },
        ],
      });
    } catch (error) {
      console.error('Error loading graph data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données des graphiques');
      // Données par défaut en cas d'erreur
      setGraphData({
        revenueEvolution: {
          labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
          datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }],
        },
        ordersPerDay: {
          labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
          datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }],
        },
        peakHours: {
          labels: Array.from({ length: 24 }, (_, i) => i.toString()),
          datasets: [{ data: Array.from({ length: 24 }, () => 0) }],
        },
        acceptedVsRefused: [
          { name: 'Acceptées', population: 0, color: COLORS.success, legendFontColor: COLORS.text },
          { name: 'Refusées', population: 0, color: COLORS.error, legendFontColor: COLORS.text },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    backgroundColor: COLORS.white,
    backgroundGradientFrom: COLORS.white,
    backgroundGradientTo: COLORS.white,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(18, 23, 21, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: COLORS.primary,
    },
  };

  if (loading || !graphData) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 16, color: COLORS.textSecondary }}>Chargement des données...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Graphiques de performance</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Filtre période */}
        <View style={styles.periodSelector}>
          {['week', 'month'].map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodButton, period === p && styles.periodButtonActive]}
              onPress={() => setPeriod(p)}
            >
              <Text
                style={[styles.periodButtonText, period === p && styles.periodButtonTextActive]}
              >
                {p === 'week' ? '7 derniers jours' : '30 derniers jours'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Évolution du CA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Évolution du CA</Text>
          <View style={styles.chartContainer}>
            <LineChart
              data={graphData.revenueEvolution}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </View>
        </View>

        {/* Nombre de commandes par jour */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nombre de commandes par jour</Text>
          <View style={styles.chartContainer}>
            <BarChart
              data={graphData.ordersPerDay}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              showValuesOnTopOfBars
            />
          </View>
        </View>

        {/* Heures de pointe */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Heures de pointe</Text>
          <View style={styles.chartContainer}>
            <BarChart
              data={graphData.peakHours}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              showValuesOnTopOfBars={false}
              fromZero
            />
          </View>
        </View>

        {/* Acceptées vs Refusées */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acceptées vs Refusées</Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={graphData.acceptedVsRefused}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
            />
          </View>
        </View>
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
  periodSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  periodButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  periodButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  periodButtonText: {
    fontSize: 14,
    color: COLORS.text,
  },
  periodButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});

PerformanceGraphsScreen.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
  }).isRequired,
};

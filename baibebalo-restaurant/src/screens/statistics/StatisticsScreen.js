import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

export default function StatisticsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Statistiques</Text>
        </View>

        <View style={styles.content}>
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('DetailedStatistics')}
          >
            <Ionicons name="stats-chart" size={32} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Statistiques détaillées</Text>
            <Text style={styles.cardDescription}>
              Analyse complète de vos performances
            </Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} style={styles.cardArrow} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('PerformanceGraphs')}
          >
            <Ionicons name="bar-chart" size={32} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Graphiques de performance</Text>
            <Text style={styles.cardDescription}>
              Visualisez vos données en graphiques
            </Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} style={styles.cardArrow} />
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardDescription: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  cardArrow: {
    marginLeft: 'auto',
  },
});

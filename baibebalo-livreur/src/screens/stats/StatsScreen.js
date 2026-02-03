import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  ScrollView,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useDeliveryStore from '../../store/deliveryStore';
import { getDeliveryProfile, getDeliveryHistoryForStats } from '../../api/stats';

export default function StatsScreen({ navigation }) {
  const { earningsData } = useDeliveryStore();
  
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    completionRate: 100,
    averageRating: 4.5,
    memberSince: 'Nouveau',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setError(null);
    try {
      console.log('[StatsScreen] Chargement des stats...');
      
      // Charger le profil et l'historique pour calculer les stats
      const [profileResponse, historyResponse] = await Promise.all([
        getDeliveryProfile().catch((err) => {
          console.log('[StatsScreen] Erreur profil:', err?.response?.status, err?.message);
          return null;
        }),
        getDeliveryHistoryForStats(100).catch((err) => {
          console.log('[StatsScreen] Erreur historique:', err?.response?.status, err?.message);
          return null;
        }),
      ]);

      console.log('[StatsScreen] Profile response success:', profileResponse?.success);

      let newStats = {
        totalDeliveries: earningsData.total_deliveries || 0,
        completionRate: 100,
        averageRating: 4.5,
        memberSince: 'Nouveau',
      };

      // Profil
      if (profileResponse?.success && profileResponse?.data?.delivery_person) {
        const profile = profileResponse.data.delivery_person;
        console.log('[StatsScreen] Profile found:', profile.first_name, profile.total_deliveries);
        
        // S'assurer que les valeurs sont des nombres
        newStats.totalDeliveries = parseInt(profile.total_deliveries) || newStats.totalDeliveries;
        newStats.averageRating = parseFloat(profile.average_rating || profile.rating) || 4.5;
        
        // Calculer "membre depuis"
        if (profile.created_at) {
          const created = new Date(profile.created_at);
          const now = new Date();
          const months = Math.floor((now - created) / (1000 * 60 * 60 * 24 * 30));
          if (months < 1) {
            newStats.memberSince = 'Nouveau';
          } else if (months === 1) {
            newStats.memberSince = '1 mois';
          } else {
            newStats.memberSince = `${months} mois`;
          }
        }
      } else {
        // Pas de profil - utiliser les données du store
        console.log('[StatsScreen] Pas de profil, utilisation du store');
      }

      // Historique pour le taux de complétion
      if (historyResponse?.success && historyResponse?.data?.deliveries) {
        const deliveries = historyResponse.data.deliveries;
        const total = deliveries.length;
        const delivered = deliveries.filter(d => d.status === 'delivered').length;
        newStats.completionRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : 100;
        console.log('[StatsScreen] Historique:', total, 'livraisons,', delivered, 'complétées');
      }

      // Utiliser les données du store si disponibles
      if (earningsData.total_deliveries > 0) {
        newStats.totalDeliveries = earningsData.total_deliveries;
      }

      console.log('[StatsScreen] Stats finales:', newStats);
      setStats(newStats);
    } catch (err) {
      console.error('[StatsScreen] Erreur chargement stats:', err);
      setError('Impossible de charger les statistiques');
      // Utiliser des valeurs par défaut en cas d'erreur
      setStats({
        totalDeliveries: earningsData.total_deliveries || 0,
        completionRate: 100,
        averageRating: 4.5,
        memberSince: 'Nouveau',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  // Données de satisfaction (valeurs par défaut si pas de données backend)
  const avgRating = parseFloat(stats.averageRating) || 4.5;
  const satisfactionRatings = [
    { label: 'Rapidité', value: Math.max(avgRating, 0) },
    { label: 'Courtoisie', value: Math.max(avgRating - 0.1, 0) },
    { label: 'Propreté', value: Math.max(avgRating - 0.2, 0) },
    { label: 'Respect consignes', value: Math.max(avgRating, 0) },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement des statistiques...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Bandeau d'erreur si nécessaire */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={16} color={COLORS.warning} />
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Statistiques</Text>
        </View>

        {/* Overview Card */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Text style={styles.overviewTitle}>Membre depuis</Text>
            <Text style={styles.overviewValue}>{stats.memberSince || 'Nouveau'}</Text>
          </View>
          
          <View style={styles.overviewStats}>
            <View style={styles.overviewStat}>
              <Text style={styles.overviewStatValue}>{stats.totalDeliveries || 0}</Text>
              <Text style={styles.overviewStatLabel}>Courses totales</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewStat}>
              <Text style={styles.overviewStatValue}>{stats.completionRate || 100}%</Text>
              <Text style={styles.overviewStatLabel}>Taux de complétion</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewStat}>
              <Text style={styles.overviewStatValue}>{parseFloat(stats.averageRating || 4.5).toFixed(1)}</Text>
              <Text style={styles.overviewStatLabel}>Note moyenne</Text>
            </View>
          </View>
        </View>

        {/* Rating Breakdown */}
        <View style={styles.ratingCard}>
          <Text style={styles.cardTitle}>Satisfaction client</Text>
          
          {satisfactionRatings.map((item) => (
            <View key={item.label} style={styles.ratingItem}>
              <Text style={styles.ratingLabel}>{item.label}</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons 
                    key={star}
                    name="star" 
                    size={16} 
                    color={star <= Math.round(item.value) ? COLORS.rating : COLORS.border} 
                  />
                ))}
              </View>
              <Text style={styles.ratingValue}>{item.value.toFixed(1)}/5</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('PerformanceDashboard')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="trending-up" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Performance</Text>
              <Text style={styles.actionSubtitle}>Voir les graphiques détaillés</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Rankings')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="trophy" size={24} color={COLORS.warning} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Classement</Text>
              <Text style={styles.actionSubtitle}>Top livreurs de la semaine</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Badges')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="ribbon" size={24} color={COLORS.success} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Badges et récompenses</Text>
              <Text style={styles.actionSubtitle}>Voir mes badges</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('CustomerRatings')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="chatbubbles" size={24} color={COLORS.info} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Avis clients</Text>
              <Text style={styles.actionSubtitle}>Derniers commentaires</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('PersonalGoals')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="flag" size={24} color={COLORS.error} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Objectifs personnels</Text>
              <Text style={styles.actionSubtitle}>Définir vos objectifs</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  overviewCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  overviewTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  overviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  overviewStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewStat: {
    flex: 1,
    alignItems: 'center',
  },
  overviewStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  overviewStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  overviewDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  ratingCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  ratingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  ratingLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
    marginRight: 12,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    width: 40,
    textAlign: 'right',
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  actionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.warning,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

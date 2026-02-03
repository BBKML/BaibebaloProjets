import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { restaurantReviews } from '../../api/reviews';

const RATING_CRITERIA = [
  { id: 'food_quality', label: 'Qualité de la nourriture' },
  { id: 'order_accuracy', label: 'Respect de la commande' },
  { id: 'preparation_time', label: 'Temps de préparation' },
  { id: 'packaging', label: 'Emballage' },
  { id: 'value_for_money', label: 'Rapport qualité/prix' },
];

export default function CustomerReviewsDashboardScreen({ navigation }) {
  const [reviewsData, setReviewsData] = useState(null);
  const [recentReviews, setRecentReviews] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const response = await restaurantReviews.getReviews();
      // Le backend retourne { success: true, data: { reviews: [...], stats: {...} } }
      const reviewsData = response.data?.reviews || response.reviews || [];
      const statsData = response.data?.stats || response.stats || {};
      
      // Adapter les données au format attendu
      const adaptedData = {
        overallRating: statsData.average_rating || statsData.rating || 0,
        totalReviews: statsData.total_reviews || statsData.count || reviewsData.length,
        ratingDistribution: statsData.rating_distribution || {},
        criteriaRatings: {
          food_quality: statsData.food_quality_rating || 0,
          order_accuracy: statsData.order_accuracy_rating || 0,
          preparation_time: statsData.preparation_time_rating || 0,
          packaging: statsData.packaging_rating || 0,
          value_for_money: statsData.value_for_money_rating || 0,
        },
        recentReviews: reviewsData.slice(0, 10).map(review => ({
          id: review.id,
          customerName: review.user_name || review.customer_name || 'Client',
          rating: review.restaurant_rating || review.rating || 0,
          comment: review.comment || '',
          date: review.created_at || review.date,
          tags: review.tags || [],
          hasResponse: !!review.restaurant_response,
        })),
      };
      
      setReviewsData(adaptedData);
      setRecentReviews(adaptedData.recentReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReviews();
    setRefreshing(false);
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons
        key={i}
        name={i < rating ? 'star' : 'star-outline'}
        size={16}
        color={i < rating ? COLORS.warning : COLORS.border}
      />
    ));
  };

  const renderRatingBar = (stars, count, total) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <View style={styles.ratingBarRow}>
        <View style={styles.ratingBarStars}>
          {Array.from({ length: 5 }, (_, i) => (
            <Ionicons
              key={i}
              name={i < stars ? 'star' : 'star-outline'}
              size={12}
              color={i < stars ? COLORS.warning : COLORS.border}
            />
          ))}
        </View>
        <View style={styles.ratingBarContainer}>
          <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
        </View>
        <Text style={styles.ratingBarCount}>{count}</Text>
      </View>
    );
  };

  if (!reviewsData) {
    return (
      <View style={styles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  const { overallRating, totalReviews, ratingDistribution, criteriaRatings } = reviewsData;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Avis et Réputation</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Note globale */}
        <View style={styles.overallRatingCard}>
          <View style={styles.ratingStarsContainer}>
            {renderStars(Math.round(overallRating))}
          </View>
          <Text style={styles.overallRatingValue}>
            {overallRating.toFixed(1)} / 5
          </Text>
          <Text style={styles.overallRatingCount}>
            Basée sur {totalReviews} avis
          </Text>
        </View>

        {/* Répartition des notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Répartition des notes</Text>
          <View style={styles.ratingDistributionCard}>
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingDistribution?.[stars] || 0;
              return (
                <View key={stars}>
                  {renderRatingBar(stars, count, totalReviews)}
                </View>
              );
            })}
          </View>
        </View>

        {/* Critères détaillés */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Critères détaillés</Text>
          <View style={styles.criteriaCard}>
            {RATING_CRITERIA.map((criterion) => {
              const rating = criteriaRatings?.[criterion.id] || 0;
              return (
                <View key={criterion.id} style={styles.criterionRow}>
                  <Text style={styles.criterionLabel}>{criterion.label}</Text>
                  <View style={styles.criterionRating}>
                    {renderStars(Math.round(rating))}
                    <Text style={styles.criterionValue}>{rating.toFixed(1)}/5</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Derniers avis */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Derniers avis</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ReviewsList')}>
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          {recentReviews.length > 0 ? (
            <FlatList
              data={recentReviews.slice(0, 5)}
              renderItem={({ item }) => (
                <View style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewHeaderLeft}>
                      <View style={styles.ratingStarsSmall}>
                        {renderStars(item.rating)}
                      </View>
                      <Text style={styles.reviewCustomerName}>{item.customerName}</Text>
                    </View>
                    <Text style={styles.reviewDate}>{item.date}</Text>
                  </View>
                  {item.comment && (
                    <Text style={styles.reviewComment}>"{item.comment}"</Text>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <View style={styles.reviewTags}>
                      {item.tags.map((tag, index) => (
                        <View key={index} style={styles.reviewTag}>
                          <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                          <Text style={styles.reviewTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {!item.hasResponse && (
                    <TouchableOpacity
                      style={styles.respondButton}
                      onPress={() => navigation.navigate('ReviewResponseModal', { reviewId: item.id })}
                    >
                      <Ionicons name="chatbubble-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.respondButtonText}>Répondre</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyReviews}>
              <Text style={styles.emptyText}>Aucun avis pour le moment</Text>
            </View>
          )}
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
  overallRatingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  ratingStarsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  overallRatingValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  overallRatingCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  ratingDistributionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBarStars: {
    flexDirection: 'row',
    width: 60,
  },
  ratingBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: COLORS.warning,
  },
  ratingBarCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    width: 30,
    textAlign: 'right',
  },
  criteriaCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  criterionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  criterionLabel: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  criterionRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  criterionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    minWidth: 40,
  },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingStarsSmall: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewCustomerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  reviewComment: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  reviewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  reviewTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '15',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  reviewTagText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '500',
  },
  respondButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 8,
    gap: 6,
    marginTop: 8,
  },
  respondButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyReviews: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});

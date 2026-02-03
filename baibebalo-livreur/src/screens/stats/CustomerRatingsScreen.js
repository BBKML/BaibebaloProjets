import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getReviews } from '../../api/stats';
import useDeliveryStore from '../../store/deliveryStore';

export default function CustomerRatingsScreen({ navigation }) {
  const { recentDeliveries } = useDeliveryStore();
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const response = await getReviews(1, 20);
      if (response?.success && response?.data?.reviews) {
        setReviews(response.data.reviews);
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error('Erreur chargement avis:', error);
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatReviewDate = (isoDate) => {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReviews();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Avis clients</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Avis clients</Text>
        <View style={styles.placeholder} />
      </View>
      <FlatList
        data={reviews}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>Aucun avis</Text>
            <Text style={styles.emptySubtitle}>Les avis des clients apparaîtront ici</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.reviewItem}>
            <View style={styles.reviewHeader}>
              <View style={styles.stars}>
                {[1,2,3,4,5].map(s => <Ionicons key={s} name="star" size={16} color={s <= (item.rating || 0) ? COLORS.rating : COLORS.border} />)}
              </View>
              <Text style={styles.reviewDate}>{formatReviewDate(item.created_at)}</Text>
            </View>
            {(item.restaurant_name || item.customer_name) && (
              <Text style={styles.reviewRestaurant}>
                {item.restaurant_name ? `${item.restaurant_name}${item.customer_name ? ` · ${item.customer_name}` : ''}` : item.customer_name}
              </Text>
            )}
            {item.comment ? <Text style={styles.reviewComment}>"{item.comment}"</Text> : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  placeholder: { width: 40 },
  list: { padding: 16, flexGrow: 1 },
  reviewItem: { backgroundColor: COLORS.white, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stars: { flexDirection: 'row', gap: 2 },
  reviewDate: { fontSize: 12, color: COLORS.textSecondary },
  reviewRestaurant: { fontSize: 12, color: COLORS.primary, marginBottom: 4, fontWeight: '500' },
  reviewComment: { fontSize: 14, color: COLORS.text, fontStyle: 'italic' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
});

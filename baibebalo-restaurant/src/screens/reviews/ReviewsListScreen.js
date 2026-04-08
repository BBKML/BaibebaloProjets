import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { restaurantReviews } from '../../api/reviews';

function renderStars(rating) {
  return Array.from({ length: 5 }, (_, i) => (
    <Ionicons
      key={i}
      name={i < rating ? 'star' : 'star-outline'}
      size={16}
      color={i < rating ? COLORS.warning : COLORS.border}
    />
  ));
}

export default function ReviewsListScreen({ navigation }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const loadReviews = async () => {
    try {
      const response = await restaurantReviews.getReviews({ page: 1, limit: 100 });
      const list = response?.data?.reviews || response?.reviews || [];
      setReviews(list.map((r) => ({
        id: r.id,
        customerName: r.user_name || r.customer_name || 'Client',
        rating: r.restaurant_rating ?? r.rating ?? 0,
        comment: r.comment || '',
        date: r.created_at || r.date,
        tags: r.tags || [],
        hasResponse: !!r.restaurant_response,
      })));
    } catch (err) {
      console.error('Load reviews:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadReviews();
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.stars}>{renderStars(item.rating)}</View>
          <Text style={styles.customerName}>{item.customerName}</Text>
        </View>
        <Text style={styles.date}>
          {item.date ? new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
        </Text>
      </View>
      {item.comment ? <Text style={styles.comment}>"{item.comment}"</Text> : null}
      {!item.hasResponse && (
        <TouchableOpacity
          style={styles.respondBtn}
          onPress={() => navigation.navigate('ReviewResponseModal', { reviewId: item.id, review: item })}
        >
          <Ionicons name="chatbubble-outline" size={16} color={COLORS.primary} />
          <Text style={styles.respondBtnText}>Répondre</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Tous les avis</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Tous les avis</Text>
        <View style={styles.placeholder} />
      </View>
      <FlatList
        data={reviews}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun avis</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { marginRight: 12 },
  title: { flex: 1, fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  placeholder: { width: 36 },
  listContent: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  headerLeft: { flex: 1 },
  stars: { flexDirection: 'row', gap: 2, marginBottom: 4 },
  customerName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  date: { fontSize: 12, color: COLORS.textSecondary },
  comment: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 8 },
  respondBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  respondBtnText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { paddingVertical: 48, alignItems: 'center' },
  emptyText: { fontSize: 16, color: COLORS.textSecondary },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getRestaurants } from '../../api/restaurants';

export default function CategoryResultsScreen({ navigation, route }) {
  const { category } = route.params || {};
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRestaurants();
  }, [category]);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      const response = await getRestaurants({
        category: category?.id || category?.name,
      });
      setRestaurants(response.data?.restaurants || []);
    } catch (error) {
      console.error('Erreur lors du chargement des restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderRestaurant = ({ item }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: item.id })}
    >
      <View style={styles.restaurantImageWrapper}>
        <Image
          source={{ uri: item.banner || item.logo || item.image_url || 'https://via.placeholder.com/300' }}
          style={styles.restaurantImage}
        />
        <View style={styles.badgeRow}>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color={COLORS.warning} />
            <Text style={styles.ratingText}>{item.rating || '4.5'}</Text>
          </View>
          <View style={styles.timeBadge}>
            <Ionicons name="time-outline" size={12} color={COLORS.white} />
            <Text style={styles.timeText}>{item.estimated_delivery_time || '30-45'} min</Text>
          </View>
        </View>
      </View>
      <View style={styles.restaurantInfo}>
        <View style={styles.restaurantHeader}>
          <Text style={styles.restaurantName}>{item.name}</Text>
          <TouchableOpacity style={styles.favoriteButton}>
            <Ionicons name="heart" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.restaurantCategory}>
          {item.category || category?.name} • {item.distance || '2.5 km'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{category?.name || 'Catégorie'}</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoTag}>Spécialités Ivoiriennes</Text>
        <Text style={styles.infoCount}>
          {restaurants.length} RESTAURANTS
        </Text>
      </View>

      <View style={styles.filtersRow}>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>Pertinence</Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options" size={14} color={COLORS.textSecondary} />
          <Text style={styles.filterText}>Filtres</Text>
        </TouchableOpacity>
      </View>

      {restaurants.length > 0 ? (
        <FlatList
          data={restaurants}
          renderItem={renderRestaurant}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="restaurant-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>Aucun restaurant</Text>
          <Text style={styles.emptySubtitle}>
            Aucun restaurant trouvé dans cette catégorie
          </Text>
        </View>
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoTag: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoCount: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  listContent: {
    padding: 16,
  },
  restaurantCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  restaurantImageWrapper: {
    position: 'relative',
  },
  restaurantImage: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.border,
  },
  badgeRow: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 8,
  },
  ratingBadge: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  timeBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  restaurantInfo: {
    padding: 12,
  },
  restaurantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  favoriteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '10',
  },
  restaurantCategory: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 32,
  },
});

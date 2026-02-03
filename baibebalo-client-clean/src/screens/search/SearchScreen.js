import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getRestaurants, getCategories, getPopularSearches } from '../../api/restaurants';
import { searchCatalog } from '../../api/search';
import SearchFiltersModal from './SearchFiltersModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SearchScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [dishResultsFromApi, setDishResultsFromApi] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState({});
  const [recentSearches, setRecentSearches] = useState([]);
  const [popularSearches, setPopularSearches] = useState(['Pizza', 'Burger', 'Choucouya', 'Alloco', 'Boissons']);
  const [categoryChips, setCategoryChips] = useState(['Restaurant', 'Fast-food', 'Maquis', 'Grillades', 'Pizza', 'Plats légers']);

  useEffect(() => {
    loadTrending();
    loadRecentSearches();
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [categoriesRes, popularSearchesRes] = await Promise.all([
        getCategories().catch(() => ({ data: { categories: [] } })),
        getPopularSearches(5).catch(() => ({ data: { searches: [] } })),
      ]);

      const apiCategories = categoriesRes.data?.categories || [];
      if (apiCategories.length > 0) {
        setCategoryChips(apiCategories.map((cat) => cat.label));
      }

      const apiSearches = popularSearchesRes.data?.searches || [];
      if (apiSearches.length > 0) {
        setPopularSearches(apiSearches);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  };
  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem('recentSearches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des recherches récentes:', error);
    }
  };

  const saveRecentSearch = async (query) => {
    const normalized = query.trim();
    if (!normalized) return;
    const updated = [normalized, ...recentSearches.filter((q) => q !== normalized)].slice(0, 6);
    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des recherches:', error);
    }
  };

  useEffect(() => {
    if (searchQuery.length > 2) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [searchQuery]);

  const loadTrending = async () => {
    try {
      const response = await getRestaurants({ limit: 5 });
      setTrending(response.data?.restaurants || []);
    } catch (error) {
      console.error('Erreur lors du chargement des tendances:', error);
    }
  };

  const buildSearchParams = () => {
    const {
      minRating = 0,
      maxDeliveryTime = 60,
      priceRange = 'all',
      cuisineType = [],
      sortBy = 'distance',
      freeDelivery = false,
      newRestaurants = false,
      mobileMoney = false,
      promotions = false,
    } = filters || {};

    const params = {
      q: searchQuery,
      min_rating: minRating || undefined,
      max_delivery_time: maxDeliveryTime || undefined,
      free_delivery: freeDelivery || undefined,
      new_restaurants: newRestaurants || undefined,
      mobile_money: mobileMoney || undefined,
      promotions: promotions || undefined,
    };

    if (cuisineType?.length) {
      params.cuisine_type = cuisineType[0];
    }

    if (priceRange === 'low') {
      params.max_price = 5000;
    } else if (priceRange === 'medium') {
      params.min_price = 5000;
      params.max_price = 15000;
    } else if (priceRange === 'high') {
      params.min_price = 15000;
    }

    if (sortBy === 'rating') params.sort = 'rating';
    if (sortBy === 'distance') params.sort = 'distance';
    if (sortBy === 'delivery_time') params.sort = 'distance';
    if (sortBy === 'price_low') params.sort = 'popularity';
    if (sortBy === 'price_high') params.sort = 'popularity';

    return params;
  };

  const performSearch = async () => {
    setLoading(true);
    try {
      const response = await searchCatalog(buildSearchParams());
      const payload = response.data?.data || response.data;
      const restaurants = payload?.restaurants || [];
      const dishes = payload?.dishes || [];
      setResults(restaurants);
      setDishResultsFromApi(
        dishes.map((dish, index) => ({
          id: dish.id || `dish-${index}`,
          name: dish.name || 'Plat',
          price: dish.price || 0,
          restaurantName: dish.restaurant_name || dish.restaurant || 'Restaurant',
          image: dish.image_url || dish.photo || 'https://via.placeholder.com/100',
        }))
      );
      await saveRecentSearch(searchQuery);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseDistance = (distance) => {
    if (!distance) return null;
    const match = `${distance}`.match(/([\d.]+)/);
    return match ? Number(match[1]) : null;
  };

  const parseDeliveryTime = (time) => {
    if (!time) return null;
    const match = `${time}`.match(/(\d+)\s*-\s*(\d+)/);
    if (match) return Number(match[2]);
    const single = `${time}`.match(/(\d+)/);
    return single ? Number(single[1]) : null;
  };

  const applyFilters = (items, activeFilters) => {
    const {
      minRating = 0,
      maxDeliveryTime = 60,
      priceRange = 'all',
      cuisineType = [],
      sortBy = 'distance',
      freeDelivery = false,
      newRestaurants = false,
      mobileMoney = false,
      promotions = false,
    } = activeFilters || {};

    let filtered = [...items];
    if (minRating > 0) {
      filtered = filtered.filter((item) => (item.rating || 0) >= minRating);
    }
    if (maxDeliveryTime) {
      filtered = filtered.filter((item) => {
        const time = parseDeliveryTime(item.estimated_delivery_time);
        return time ? time <= maxDeliveryTime : true;
      });
    }
    if (priceRange !== 'all') {
      filtered = filtered.filter((item) => {
        const range = item.price_range || item.average_price;
        if (!range) return true;
        if (priceRange === 'low') return range <= 5000;
        if (priceRange === 'medium') return range > 5000 && range <= 15000;
        if (priceRange === 'high') return range > 15000;
        return true;
      });
    }
    if (cuisineType?.length) {
      filtered = filtered.filter((item) =>
        cuisineType.some((cuisine) =>
          `${item.cuisine_type || item.category || ''}`.toLowerCase().includes(cuisine.toLowerCase())
        )
      );
    }

    if (freeDelivery) {
      filtered = filtered.filter((item) => !item.delivery_fee || item.delivery_fee === 0);
    }
    if (newRestaurants) {
      filtered = filtered.filter((item) => item.is_new || item.created_at);
    }
    if (mobileMoney) {
      filtered = filtered.filter((item) => item.accepts_mobile_money || item.payment_methods?.includes('mobile_money'));
    }
    if (promotions) {
      filtered = filtered.filter((item) => item.is_promoted || item.promo_active);
    }

    if (sortBy === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'delivery_time') {
      filtered.sort(
        (a, b) => (parseDeliveryTime(a.estimated_delivery_time) || 0) - (parseDeliveryTime(b.estimated_delivery_time) || 0)
      );
    } else if (sortBy === 'price_low') {
      filtered.sort((a, b) => (a.average_price || 0) - (b.average_price || 0));
    } else if (sortBy === 'price_high') {
      filtered.sort((a, b) => (b.average_price || 0) - (a.average_price || 0));
    } else if (sortBy === 'distance') {
      filtered.sort((a, b) => (parseDistance(a.distance) || 0) - (parseDistance(b.distance) || 0));
    }

    return filtered;
  };

  const filteredResults = applyFilters(results, filters);
  const filteredTrending = applyFilters(trending, filters);

  const renderRestaurant = ({ item }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: item.id })}
    >
      <Image
        source={{ uri: item.banner || item.logo || item.image_url || 'https://via.placeholder.com/300' }}
        style={styles.restaurantImage}
      />
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{item.name}</Text>
        <Text style={styles.restaurantCategory}>{item.category}</Text>
        <View style={styles.restaurantMeta}>
          <Ionicons name="star" size={14} color={COLORS.warning} />
          <Text style={styles.rating}>{item.rating || '4.5'}</Text>
          <Text style={styles.separator}>•</Text>
          <Text style={styles.distance}>{item.distance || '2.5 km'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const fallbackDishResults = filteredResults.map((restaurant, index) => ({
    id: `dish-${restaurant.id || index}`,
    name: restaurant.featured_dish || restaurant.speciality || 'Plat populaire',
    price: restaurant.average_price || 3500,
    restaurantName: restaurant.name || 'Restaurant',
    image: restaurant.banner || restaurant.logo || restaurant.image_url || 'https://via.placeholder.com/100',
  }));
  const dishResults = dishResultsFromApi.length > 0 ? dishResultsFromApi : fallbackDishResults;

  const matchedCategories = categoryChips.filter((cat) =>
    cat.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Barre de recherche */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un restaurant, un plat..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            onSubmitEditing={() => saveRecentSearch(searchQuery)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setFiltersVisible(true)}>
            <Ionicons name="options" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Résultats ou tendances */}
      {searchQuery.length > 2 ? (
        filteredResults.length > 0 ? (
          <FlatList
            data={filteredResults}
            renderItem={renderRestaurant}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.resultsHeader}>
                <Text style={styles.sectionTitle}>
                  {filteredResults.length} résultat{filteredResults.length > 1 ? 's' : ''} trouvé{filteredResults.length > 1 ? 's' : ''}
                </Text>
                {matchedCategories.length > 0 && (
                  <View style={styles.categoryRow}>
                    {matchedCategories.map((cat) => (
                      <View key={cat} style={styles.categoryChip}>
                        <Text style={styles.categoryChipText}>{cat}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {dishResults.length > 0 && (
                  <View style={styles.dishResultsSection}>
                    <Text style={styles.sectionSubtitle}>Plats correspondants</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dishResultsRow}>
                      {dishResults.map((dish) => (
                        <View key={dish.id} style={styles.dishResultCard}>
                          <Image source={{ uri: dish.image }} style={styles.dishResultImage} />
                          <Text style={styles.dishResultName} numberOfLines={1}>{dish.name}</Text>
                          <Text style={styles.dishResultMeta} numberOfLines={1}>{dish.restaurantName}</Text>
                          <Text style={styles.dishResultPrice}>{dish.price.toLocaleString('fr-FR')} FCFA</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
                <Text style={styles.sectionSubtitle}>Restaurants correspondants</Text>
              </View>
            }
          />
        ) : !loading ? (
          <ScrollView contentContainerStyle={styles.emptyContainer}>
            <View style={styles.emptyCard}>
              <Ionicons name="search" size={56} color={COLORS.primary} style={styles.emptyIcon} />
              <Ionicons name="sad-outline" size={36} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Aucun résultat trouvé</Text>
            <Text style={styles.emptySubtitle}>
              Nous n'avons rien trouvé pour votre recherche. Essayez de rechercher autre chose ou vérifiez l'orthographe.
            </Text>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.resetButtonText}>Réinitialiser</Text>
            </TouchableOpacity>
            <View style={styles.suggestionsSection}>
              <Text style={styles.suggestionsTitle}>Suggestions pour vous</Text>
              <View style={styles.suggestionsRow}>
                {categoryChips.map((chip) => (
                  <TouchableOpacity
                    key={chip}
                    style={styles.suggestionChip}
                    onPress={() => setSearchQuery(chip)}
                  >
                    <Ionicons name="restaurant" size={16} color={COLORS.primary} />
                    <Text style={styles.suggestionText}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        ) : null
      ) : (
        <View style={styles.trendingContainer}>
          {recentSearches.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Historique des recherches</Text>
              <View style={styles.historyRow}>
                {recentSearches.map((query) => (
                  <TouchableOpacity
                    key={query}
                    style={styles.historyChip}
                    onPress={() => setSearchQuery(query)}
                  >
                    <Ionicons name="time-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.historyText}>{query}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          <Text style={styles.sectionTitle}>Recherches populaires</Text>
          <View style={styles.historyRow}>
            {popularSearches.map((chip) => (
              <TouchableOpacity
                key={chip}
                style={styles.historyChip}
                onPress={() => setSearchQuery(chip)}
              >
                <Ionicons name="flame-outline" size={14} color={COLORS.primary} />
                <Text style={styles.historyText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.sectionTitle}>Tendances</Text>
          <FlatList
            data={filteredTrending}
            renderItem={renderRestaurant}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
          />
        </View>
      )}
      <SearchFiltersModal
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        onApply={(nextFilters) => setFilters(nextFilters)}
        initialFilters={filters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchBarContainer: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  listContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  resultsHeader: {
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  dishResultsSection: {
    marginBottom: 12,
  },
  dishResultsRow: {
    gap: 10,
    paddingBottom: 4,
  },
  dishResultCard: {
    width: 140,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dishResultImage: {
    width: '100%',
    height: 80,
    borderRadius: 10,
    backgroundColor: COLORS.border,
    marginBottom: 6,
  },
  dishResultName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  dishResultMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dishResultPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 4,
  },
  historyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  restaurantCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  restaurantImage: {
    width: 100,
    height: 100,
    backgroundColor: COLORS.border,
  },
  restaurantInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  restaurantCategory: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 4,
  },
  separator: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginHorizontal: 8,
  },
  distance: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  trendingContainer: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyCard: {
    width: 200,
    height: 200,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  emptyIcon: {
    opacity: 0.2,
    position: 'absolute',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  resetButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  resetButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionsSection: {
    width: '100%',
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
});
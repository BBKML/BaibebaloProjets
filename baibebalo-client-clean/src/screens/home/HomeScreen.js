import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getRestaurants } from '../../api/restaurants';
import useCartStore from '../../store/cartStore';

export default function HomeScreen({ navigation }) {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { getItemCount } = useCartStore();

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      const response = await getRestaurants({
        search: searchQuery || undefined,
      });
      setRestaurants(response.data?.restaurants || []);
    } catch (error) {
      console.error('Erreur lors du chargement des restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const promoCards = [
    {
      id: 'welcome',
      title: '-30% de réduction',
      subtitle: 'Sur votre première commande avec BAIBEBALO',
      cta: 'Commander maintenant',
      image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600',
      accent: COLORS.primary,
    },
    {
      id: 'weekend',
      title: 'Weekend Spécial',
      subtitle: 'Frais de livraison offerts sur les restaurants locaux',
      cta: 'Voir les offres',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600',
      accent: COLORS.accent,
    },
  ];

  const categories = [
    {
      id: 'restaurants',
      label: 'Restaurants',
      image: 'https://images.unsplash.com/photo-1548365328-8b849e6f6f7f?w=200',
    },
    {
      id: 'fast',
      label: 'Fast-Food',
      image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=200',
    },
    {
      id: 'pizza',
      label: 'Pizza',
      image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200',
    },
    {
      id: 'grillades',
      label: 'Grillades',
      image: 'https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?w=200',
    },
    {
      id: 'light',
      label: 'Plats légers',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200',
    },
    {
      id: 'grocery',
      label: 'Épicerie',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
    },
    {
      id: 'pharmacy',
      label: 'Pharmacie',
      image: 'https://images.unsplash.com/photo-1587370560942-ad2a04eabb6d?w=200',
    },
    {
      id: 'parcel',
      label: 'Livraison colis',
      image: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=200',
    },
  ];

  const bestDishes = (restaurants || []).slice(0, 6).map((restaurant, index) => ({
    id: `dish-${restaurant.id || index}`,
    name: restaurant.speciality || 'Plat populaire',
    price: restaurant.average_price || 3500,
    restaurantName: restaurant.name || 'Restaurant',
    image: restaurant.image_url || 'https://via.placeholder.com/120',
  }));

  const recommendations = (restaurants || []).slice(0, 4).map((restaurant, index) => ({
    id: `reco-${restaurant.id || index}`,
    name: restaurant.name || 'Restaurant recommandé',
    subtitle: restaurant.cuisine_type || 'Cuisine variée',
    image: restaurant.image_url || 'https://via.placeholder.com/160',
  }));

  const renderRestaurant = ({ item }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: item.id })}
    >
      <View style={styles.restaurantImageWrapper}>
        <Image
          source={{ uri: item.image_url || 'https://via.placeholder.com/300' }}
          style={styles.restaurantImage}
        />
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={12} color={COLORS.warning} />
          <Text style={styles.ratingBadgeText}>{item.rating || '4.5'}</Text>
        </View>
      </View>
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{item.name}</Text>
        <Text style={styles.cuisine} numberOfLines={1}>
          {item.cuisine_type || 'Cuisine variée'}
        </Text>
        <View style={styles.restaurantMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color={COLORS.primary} />
            <Text style={styles.metaText}>
              {item.estimated_delivery_time || '30-45'} min
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="bicycle" size={12} color={COLORS.primary} />
            <Text style={styles.metaText}>
              {item.delivery_fee ? `${item.delivery_fee} FCFA` : 'Gratuit'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const cartItemCount = getItemCount();

  return (
    <View style={styles.container}>
      <FlatList
        data={restaurants}
        renderItem={renderRestaurant}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadRestaurants} />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={styles.locationContainer}>
                <View style={styles.locationBadge}>
                  <Ionicons name="location" size={16} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.locationLabel}>Livraison à</Text>
                  <View style={styles.locationRow}>
                    <Text style={styles.locationText}>Cocody Angré</Text>
                    <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.notificationButton}>
                <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.searchContainer}
              onPress={() => navigation.navigate('Search')}
            >
              <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
              <Text style={styles.searchInputPlaceholder}>
                Rechercher un restaurant, un plat...
              </Text>
            </TouchableOpacity>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.promoRow}
            >
              {promoCards.map((card) => (
                <View key={card.id} style={[styles.promoCard, { backgroundColor: card.accent }]}>
                  <View style={styles.promoContent}>
                    <Text style={styles.promoTag}>Offre spéciale</Text>
                    <Text style={styles.promoTitle}>{card.title}</Text>
                    <Text style={styles.promoSubtitle}>{card.subtitle}</Text>
                    <TouchableOpacity style={styles.promoButton}>
                      <Text style={styles.promoButtonText}>{card.cta}</Text>
                    </TouchableOpacity>
                  </View>
                  <Image source={{ uri: card.image }} style={styles.promoImage} />
                </View>
              ))}
            </ScrollView>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Catégories</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                <Text style={styles.sectionAction}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesRow}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.categoryItem}
                  onPress={() => navigation.navigate('CategoryResults', { category: { name: cat.label } })}
                >
                  <Image source={{ uri: cat.image }} style={styles.categoryImage} />
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitleLarge}>Populaires près de chez vous</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun restaurant trouvé</Text>
          </View>
        }
        ListFooterComponent={
          <>
            {bestDishes.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Meilleurs plats</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                    <Text style={styles.sectionAction}>Voir tout</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dishRow}>
                  {bestDishes.map((dish) => (
                    <View key={dish.id} style={styles.dishCard}>
                      <Image source={{ uri: dish.image }} style={styles.dishImage} />
                      <Text style={styles.dishName} numberOfLines={1}>{dish.name}</Text>
                      <Text style={styles.dishRestaurant} numberOfLines={1}>{dish.restaurantName}</Text>
                      <Text style={styles.dishPrice}>{dish.price.toLocaleString('fr-FR')} FCFA</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {recommendations.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Vous pourriez aimer</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recoRow}>
                  {recommendations.map((reco) => (
                    <View key={reco.id} style={styles.recoCard}>
                      <Image source={{ uri: reco.image }} style={styles.recoImage} />
                      <Text style={styles.recoName} numberOfLines={1}>{reco.name}</Text>
                      <Text style={styles.recoSubtitle} numberOfLines={1}>{reco.subtitle}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        }
      />

      {/* Cart Button */}
      {cartItemCount > 0 && (
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => navigation.navigate('ShoppingCart')}
        >
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
          </View>
          <Ionicons name="cart" size={24} color={COLORS.white} />
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.mapButton}>
        <Ionicons name="map" size={16} color={COLORS.primary} />
        <Text style={styles.mapButtonText}>Voir Carte</Text>
      </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  notificationButton: {
    padding: 8,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  searchInputPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textLight,
  },
  listContent: {
    paddingBottom: 120,
  },
  promoRow: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 12,
  },
  promoCard: {
    width: 300,
    height: 160,
    borderRadius: 24,
    padding: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  promoContent: {
    flex: 1,
    paddingRight: 12,
  },
  promoTag: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  promoTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 6,
  },
  promoSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  promoButton: {
    marginTop: 10,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  promoButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  promoImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    opacity: 0.9,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  categoriesRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 16,
  },
  categoryItem: {
    alignItems: 'center',
    gap: 6,
  },
  categoryImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionTitleLarge: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  restaurantCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 16,
  },
  restaurantImageWrapper: {
    position: 'relative',
  },
  restaurantImage: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.border,
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  restaurantInfo: {
    padding: 16,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  restaurantMeta: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  cuisine: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  cartButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  cartBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  mapButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mapButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionBlock: {
    marginTop: 12,
  },
  dishRow: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 12,
  },
  dishCard: {
    width: 140,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dishImage: {
    width: '100%',
    height: 90,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    marginBottom: 8,
  },
  dishName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  dishRestaurant: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dishPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 4,
  },
  recoRow: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 12,
  },
  recoCard: {
    width: 180,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recoImage: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    marginBottom: 8,
  },
  recoName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  recoSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

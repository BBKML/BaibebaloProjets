import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getRestaurantDetail, getRestaurantMenu } from '../../api/restaurants';
import { addFavorite, removeFavorite, getFavorites } from '../../api/users';
import useCartStore from '../../store/cartStore';

export default function RestaurantDetailScreen({ route, navigation }) {
  const { restaurantId } = route.params;
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const { addItem, restaurantId: cartRestaurantId } = useCartStore();

  useEffect(() => {
    loadRestaurantData();
    checkFavoriteStatus();
  }, [restaurantId]);

  const checkFavoriteStatus = async () => {
    try {
      const response = await getFavorites();
      const favorites = response.data?.favorites || response.data || [];
      const favoriteIds = favorites.map(fav => fav.restaurant_id || fav.id || fav.restaurant?.id);
      setIsFavorite(favoriteIds.includes(restaurantId));
    } catch (error) {
      console.error('Erreur lors de la vérification des favoris:', error);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      if (isFavorite) {
        await removeFavorite(restaurantId);
        setIsFavorite(false);
      } else {
        await addFavorite(restaurantId);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Erreur lors de la modification des favoris:', error);
    }
  };

  const loadRestaurantData = async () => {
    try {
      setLoading(true);
      const [restaurantRes, menuRes] = await Promise.all([
        getRestaurantDetail(restaurantId),
        getRestaurantMenu(restaurantId),
      ]);
      const restaurantData = restaurantRes.data;
      setRestaurant(restaurantData);
      setMenu(menuRes.data?.menu_items || []);
      if (menuRes.data?.categories?.[0]) {
        setSelectedCategory(menuRes.data.categories[0].id);
      }
      
      // Vérifier si le restaurant est fermé
      if (restaurantData.is_closed || restaurantData.status === 'closed') {
        navigation.navigate('RestaurantClosed', { restaurant: restaurantData });
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item) => {
    addItem(
      {
        id: item.id,
        name: item.name,
        price: item.price,
        image_url: item.image_url,
        customizations: {},
      },
      restaurant.id,
      restaurant.name
    );
  };

  const filteredMenu = selectedCategory
    ? menu.filter((item) => item.category_id === selectedCategory)
    : menu;

  if (loading || !restaurant) {
    return (
      <View style={styles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header Image */}
      <Image
        source={{ uri: restaurant.image_url || 'https://via.placeholder.com/400' }}
        style={styles.headerImage}
      />

      {/* Restaurant Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{restaurant.name}</Text>
        <View style={styles.metaRow}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#fbbf24" />
            <Text style={styles.rating}>{restaurant.rating || '4.5'}</Text>
          </View>
          <Text style={styles.deliveryTime}>
            {restaurant.estimated_delivery_time || '30-45'} min
          </Text>
          <Text style={styles.priceRange}>
            {restaurant.price_range || '$$'}
          </Text>
        </View>
        <Text style={styles.description}>{restaurant.description}</Text>
      </View>

      {/* Menu Categories */}
      {menu.length > 0 && (
        <>
          <View style={styles.categoriesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {menu.map((item, index) => {
                const categoryId = item.category_id;
                const isSelected = selectedCategory === categoryId;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipSelected,
                    ]}
                    onPress={() => setSelectedCategory(categoryId)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        isSelected && styles.categoryTextSelected,
                      ]}
                    >
                      {item.category_name || 'Menu'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            {filteredMenu.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => handleAddToCart(item)}
              >
                <View style={styles.menuItemContent}>
                  <View style={styles.menuItemInfo}>
                    <Text style={styles.menuItemName}>{item.name}</Text>
                    <Text style={styles.menuItemDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                    <Text style={styles.menuItemPrice}>
                      {item.price?.toLocaleString('fr-FR')} FCFA
                    </Text>
                  </View>
                  {item.image_url && (
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.menuItemImage}
                    />
                  )}
                </View>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => handleAddToCart(item)}
                >
                  <Ionicons name="add" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerImage: {
    width: '100%',
    height: 250,
    backgroundColor: COLORS.border,
  },
  infoContainer: {
    padding: 16,
    backgroundColor: COLORS.white,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  favoriteButton: {
    padding: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  deliveryTime: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  priceRange: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  categoriesContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: COLORS.white,
  },
  menuContainer: {
    padding: 16,
  },
  menuItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItemContent: {
    flexDirection: 'row',
    padding: 16,
  },
  menuItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  addButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

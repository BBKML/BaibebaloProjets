import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Linking,
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
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const { addItem, getTotal, getItemCount } = useCartStore();

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
      const categoryList = menuRes.data?.categories || [];
      setCategories(categoryList);
      if (categoryList[0]) {
        setSelectedCategory(categoryList[0].id);
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
    const result = addItem(
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

    if (result?.requiresConfirm) {
      Alert.alert(
        'Changer de restaurant',
        `Votre panier contient déjà des plats de ${result.currentRestaurantName || 'un autre restaurant'}. Voulez-vous le vider ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Vider et ajouter',
            style: 'destructive',
            onPress: () => {
              addItem(
                {
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  image_url: item.image_url,
                  customizations: {},
                },
                restaurant.id,
                restaurant.name,
                { force: true }
              );
            },
          },
        ]
      );
    }
  };

  const handleCallRestaurant = () => {
    if (!restaurant?.phone) {
      Alert.alert('Info', 'Numéro du restaurant indisponible.');
      return;
    }
    Linking.openURL(`tel:${restaurant.phone}`);
  };

  const handleViewOnMap = () => {
    navigation.navigate('MapLocationSelector', {
      location: {
        lat: restaurant?.latitude,
        lng: restaurant?.longitude,
        address: restaurant?.address,
      },
    });
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
      <View style={styles.heroWrapper}>
        <Image
          source={{ uri: restaurant.image_url || 'https://via.placeholder.com/400' }}
          style={styles.headerImage}
        />
        <View style={styles.heroOverlay} />
        <View style={styles.heroActions}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.heroActionsRight}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="search" size={18} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleToggleFavorite}>
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={18}
                color={COLORS.white}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.logoCircle}>
          <Ionicons name="restaurant" size={28} color={COLORS.primary} />
        </View>
        <Text style={styles.name}>{restaurant.name}</Text>
        <Text style={styles.cuisineText}>
          {restaurant.cuisine_type || 'Cuisine Ivoirienne'} • {restaurant.price_range || '$$'}
        </Text>
        <View style={styles.badgesRow}>
          {(restaurant.is_new || restaurant.is_promoted) && (
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>{restaurant.is_new ? 'Nouveau' : 'Promo'}</Text>
            </View>
          )}
          {restaurant.rating >= 4.5 && (
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>Top noté</Text>
            </View>
          )}
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Rating</Text>
            <View style={styles.statValueRow}>
              <Ionicons name="star" size={14} color={COLORS.warning} />
              <Text style={styles.statValue}>{restaurant.rating || '4.5'}</Text>
            </View>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Delivery</Text>
            <Text style={styles.statValue}>{restaurant.estimated_delivery_time || '30-45'} min</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Fee</Text>
            <Text style={styles.statValue}>{restaurant.delivery_fee || 500} FCFA</Text>
          </View>
        </View>
      </View>

      <View style={styles.practicalInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>
            {restaurant.address || 'Adresse non disponible'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>
            {restaurant.is_closed || restaurant.status === 'closed' ? 'Fermé' : 'Ouvert'} •
            {` ${restaurant.opening_hours || '09:00 - 23:00'}`}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="bicycle-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>
            {restaurant.delivery_fee ? `${restaurant.delivery_fee} FCFA` : 'Livraison gratuite'}
          </Text>
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.infoAction} onPress={handleViewOnMap}>
            <Ionicons name="map-outline" size={16} color={COLORS.primary} />
            <Text style={styles.infoActionText}>Voir sur la carte</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.infoAction} onPress={handleCallRestaurant}>
            <Ionicons name="call-outline" size={16} color={COLORS.primary} />
            <Text style={styles.infoActionText}>Appeler</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Categories */}
      {menu.length > 0 && (
        <>
          <View style={styles.categoriesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipSelected,
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        isSelected && styles.categoryTextSelected,
                      ]}
                    >
                      {cat.name || 'Menu'}
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
                onPress={() => navigation.navigate('DishInformation', { dish: item })}
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Avis et notes</Text>
        <View style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>Note globale</Text>
          <Text style={styles.reviewValue}>{restaurant.rating || '4.5'} / 5</Text>
          <Text style={styles.reviewSub}>Basé sur les avis clients</Text>
        </View>
        <View style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>Commentaires récents</Text>
          <Text style={styles.reviewText}>“Excellent service et plats savoureux.”</Text>
          <Text style={styles.reviewMeta}>Jean D. • Il y a 2 jours</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations complémentaires</Text>
        <Text style={styles.infoText}>Modes de paiement: Mobile Money, Espèces</Text>
        <Text style={styles.infoText}>Options de livraison: Standard, Express</Text>
        <Text style={styles.infoText}>Allergènes: Arachides, Lait</Text>
      </View>

      {getItemCount() > 0 && (
        <View style={styles.cartBar}>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => navigation.navigate('ShoppingCart')}
          >
            <View style={styles.cartCount}>
              <Text style={styles.cartCountText}>{getItemCount()}</Text>
            </View>
            <Text style={styles.cartText}>Voir le panier</Text>
            <Text style={styles.cartTotal}>
              {getTotal().toLocaleString('fr-FR')} FCFA
            </Text>
          </TouchableOpacity>
        </View>
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
    height: 280,
    backgroundColor: COLORS.border,
  },
  heroWrapper: {
    position: 'relative',
  },
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  heroActions: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroActionsRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: -40,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  cuisineText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  practicalInfo: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  infoAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  infoActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  categoriesContainer: {
    paddingVertical: 12,
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
    paddingBottom: 120,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
  },
  reviewTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  reviewSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  reviewText: {
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 4,
  },
  reviewMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
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
  cartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
  },
  cartButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartCount: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cartCountText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  cartText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  cartTotal: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});

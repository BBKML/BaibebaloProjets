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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { getRestaurantDetail, getRestaurantMenu, getRestaurantReviews } from '../../api/restaurants';
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
  const [reviews, setReviews] = useState([]);
  const [reviewFilter, setReviewFilter] = useState('recent'); // 'recent', 'helpful', 'photos'
  const [showAllReviews, setShowAllReviews] = useState(false);
  const insets = useSafeAreaInsets();
  const { addItem, getTotal, getItemCount } = useCartStore();

  useEffect(() => {
    loadRestaurantData();
    checkFavoriteStatus();
    loadReviews();
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

  const loadReviews = async () => {
    try {
      const response = await getRestaurantReviews(restaurantId, {
        filter: reviewFilter,
        limit: showAllReviews ? 50 : 5,
      });
      const reviewsData = response.data?.reviews || response.data?.data?.reviews || response.data || [];
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
    } catch (error) {
      console.error('Erreur lors du chargement des avis:', error);
      setReviews([]);
    }
  };

  useEffect(() => {
    if (restaurantId) {
      loadReviews();
    }
  }, [reviewFilter, showAllReviews, restaurantId]);

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
      
      // L'API retourne les données dans menuRes.data.data
      const menuData = menuRes.data?.data || menuRes.data;
      const categoryList = menuData?.categories || [];
      
      // Extraire tous les items de toutes les catégories
      const allItems = categoryList.flatMap(cat => 
        (cat.items || []).map(item => ({
          ...item,
          category_id: cat.id,
          category_name: cat.name
        }))
      );
      
      setMenu(allItems);
      setCategories(categoryList);
      
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/66128188-ae85-488b-8573-429b47c72881',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RestaurantDetailScreen.js:95',message:'handleAddToCart called',data:{restaurantId:restaurantId,restaurantExists:!!restaurant,restaurantIdFromRestaurant:restaurant?.id||'NULL',restaurantName:restaurant?.name||'NULL',itemId:item.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    if (!restaurant) {
      Alert.alert('Erreur', 'Les informations du restaurant ne sont pas encore chargées. Veuillez réessayer.');
      return;
    }

    const currentRestaurantId = restaurant.id || restaurantId;
    const currentRestaurantName = restaurant.name || 'Restaurant';

    // Si l'article a des options de personnalisation, naviguer vers l'écran de personnalisation
    if (item.customization_options && item.customization_options.length > 0) {
      navigation.navigate('CustomizeDish', {
        dish: {
          ...item,
          restaurant_id: currentRestaurantId,
          restaurant_name: currentRestaurantName,
        },
        restaurantId: currentRestaurantId,
        restaurantName: currentRestaurantName,
      });
      return;
    }

    // Sinon, ajouter directement au panier
    const result = addItem(
      {
        id: item.id,
        name: item.name,
        price: item.price,
        image_url: item.image_url,
        customizations: {},
      },
      currentRestaurantId,
      currentRestaurantName
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
                currentRestaurantId,
                currentRestaurantName,
                { force: true }
              );
            },
          },
        ]
      );
      return;
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/66128188-ae85-488b-8573-429b47c72881',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RestaurantDetailScreen.js:135',message:'Item added to cart',data:{result:result?.added||result?.updated||'other',restaurantId:currentRestaurantId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
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
          source={{ uri: restaurant.banner || restaurant.logo || restaurant.image_url || 'https://via.placeholder.com/400' }}
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
                onPress={() => {
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/66128188-ae85-488b-8573-429b47c72881',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RestaurantDetailScreen.js:316',message:'Navigating to DishInformation',data:{restaurantId:restaurantId,restaurantExists:!!restaurant,restaurantIdFromRestaurant:restaurant?.id||'NULL',restaurantName:restaurant?.name||'NULL',itemId:item.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
                  // #endregion
                  const currentRestaurantId = restaurant?.id || restaurantId;
                  const currentRestaurantName = restaurant?.name || 'Restaurant';
                  navigation.navigate('DishInformation', { 
                    dish: {
                      ...item,
                      restaurant_id: currentRestaurantId,
                      restaurant_name: currentRestaurantName,
                    },
                    restaurantId: currentRestaurantId,
                    restaurantName: currentRestaurantName,
                  });
                }}
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

      {/* Section Avis et notes améliorée */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Avis et notes</Text>
        
        {/* Note globale avec jauge visuelle */}
        <View style={styles.ratingCard}>
          <View style={styles.ratingHeader}>
            <View style={styles.ratingMain}>
              <Text style={styles.ratingValue}>{restaurant.rating || '4.5'}</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= Math.round(restaurant.rating || 4.5) ? 'star' : 'star-outline'}
                    size={20}
                    color={COLORS.warning}
                  />
                ))}
              </View>
              <Text style={styles.ratingCount}>
                {reviews.length > 0 ? `${reviews.length} avis` : 'Aucun avis'}
              </Text>
            </View>
          </View>

          {/* Répartition des notes */}
          {reviews.length > 0 && (
            <View style={styles.ratingDistribution}>
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = reviews.filter(r => Math.round(r.rating || r.restaurant_rating) === rating).length;
                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <View key={rating} style={styles.ratingBarRow}>
                    <Text style={styles.ratingBarLabel}>{rating}★</Text>
                    <View style={styles.ratingBarContainer}>
                      <View style={[styles.ratingBar, { width: `${percentage}%` }]} />
                    </View>
                    <Text style={styles.ratingBarCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Filtres d'avis */}
        {reviews.length > 0 && (
          <View style={styles.reviewFilters}>
            <TouchableOpacity
              style={[styles.filterChip, reviewFilter === 'recent' && styles.filterChipActive]}
              onPress={() => setReviewFilter('recent')}
            >
              <Text style={[styles.filterChipText, reviewFilter === 'recent' && styles.filterChipTextActive]}>
                Plus récents
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, reviewFilter === 'helpful' && styles.filterChipActive]}
              onPress={() => setReviewFilter('helpful')}
            >
              <Text style={[styles.filterChipText, reviewFilter === 'helpful' && styles.filterChipTextActive]}>
                Plus utiles
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, reviewFilter === 'photos' && styles.filterChipActive]}
              onPress={() => setReviewFilter('photos')}
            >
              <Text style={[styles.filterChipText, reviewFilter === 'photos' && styles.filterChipTextActive]}>
                Avec photos
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Liste des avis */}
        {reviews.length > 0 ? (
          <View style={styles.reviewsList}>
            {(showAllReviews ? reviews : reviews.slice(0, 3)).map((review, index) => (
              <View key={review.id || index} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewUser}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewAvatarText}>
                        {(review.user?.first_name?.[0] || review.user?.name?.[0] || 'U').toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.reviewUserInfo}>
                      <Text style={styles.reviewUserName}>
                        {review.user?.first_name && review.user?.last_name
                          ? `${review.user.first_name} ${review.user.last_name[0]}.`
                          : review.user?.name || 'Client'}
                      </Text>
                      <View style={styles.reviewRating}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= (review.rating || review.restaurant_rating || 0) ? 'star' : 'star-outline'}
                            size={12}
                            color={COLORS.warning}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.reviewDate}>
                    {review.created_at
                      ? new Date(review.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : 'Récent'}
                  </Text>
                </View>
                {review.comment || review.restaurant_comment ? (
                  <Text style={styles.reviewComment}>
                    {review.comment || review.restaurant_comment}
                  </Text>
                ) : null}
                {review.photos && review.photos.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewPhotos}>
                    {review.photos.map((photo, photoIndex) => (
                      <Image
                        key={photoIndex}
                        source={{ uri: photo }}
                        style={styles.reviewPhoto}
                      />
                    ))}
                  </ScrollView>
                )}
                {review.restaurant_response && (
                  <View style={styles.restaurantResponse}>
                    <Text style={styles.restaurantResponseLabel}>Réponse du restaurant :</Text>
                    <Text style={styles.restaurantResponseText}>{review.restaurant_response}</Text>
                  </View>
                )}
              </View>
            ))}
            {reviews.length > 3 && !showAllReviews && (
              <TouchableOpacity
                style={styles.showMoreButton}
                onPress={() => setShowAllReviews(true)}
              >
                <Text style={styles.showMoreText}>
                  Voir tous les avis ({reviews.length})
                </Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            {showAllReviews && reviews.length > 3 && (
              <TouchableOpacity
                style={styles.showMoreButton}
                onPress={() => setShowAllReviews(false)}
              >
                <Text style={styles.showMoreText}>Voir moins</Text>
                <Ionicons name="chevron-up" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.noReviews}>
            <Ionicons name="star-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.noReviewsText}>Aucun avis pour le moment</Text>
            <Text style={styles.noReviewsSubtext}>Soyez le premier à noter ce restaurant !</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations complémentaires</Text>
        <Text style={styles.infoText}>Modes de paiement: Mobile Money, Espèces</Text>
        <Text style={styles.infoText}>Options de livraison: Standard, Express</Text>
        <Text style={styles.infoText}>Allergènes: Arachides, Lait</Text>
      </View>

      {getItemCount() > 0 && (
        <View style={[styles.cartBar, { bottom: insets.bottom + 24 }]}>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' })}
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
    paddingBottom: 140, // Espace pour le cart bar + safe area
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
  ratingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  ratingHeader: {
    marginBottom: 16,
  },
  ratingMain: {
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  ratingCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  ratingDistribution: {
    marginTop: 16,
    gap: 8,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBarLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    width: 24,
  },
  ratingBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  ratingBar: {
    height: '100%',
    backgroundColor: COLORS.warning,
    borderRadius: 4,
  },
  ratingBarCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    width: 24,
    textAlign: 'right',
  },
  reviewFilters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  reviewsList: {
    gap: 12,
  },
  reviewItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  reviewUserInfo: {
    flex: 1,
  },
  reviewUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  reviewComment: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewPhotos: {
    marginBottom: 12,
  },
  reviewPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: COLORS.border,
  },
  restaurantResponse: {
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  restaurantResponseLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  restaurantResponseText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  noReviews: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 32,
    alignItems: 'center',
  },
  noReviewsText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noReviewsSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
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
    bottom: 24, // Sera ajusté dynamiquement avec insets
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
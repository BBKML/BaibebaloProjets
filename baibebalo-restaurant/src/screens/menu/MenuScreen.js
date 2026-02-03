import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Switch,
  Image,
} from 'react-native';
import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import useRestaurantStore from '../../store/restaurantStore';
import { restaurantMenu } from '../../api/menu';

export default function MenuScreen({ navigation, route }) {
  const { menu, categories, setMenu, setCategories } = useRestaurantStore();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedItems, setSelectedItems] = useState({});
  const [showAddMenu, setShowAddMenu] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadMenu();
  }, []);

  // Recharger le menu quand l'écran est focus (après création/modification)
  useFocusEffect(
    React.useCallback(() => {
      loadMenu();
    }, [])
  );

  const loadMenu = async () => {
    try {
      const [menuResponse, categoriesResponse] = await Promise.all([
        restaurantMenu.getMenu(),
        restaurantMenu.getCategories(),
      ]);
      
      const menuData = menuResponse.data?.menu || menuResponse.menu || [];
      const categoriesData = categoriesResponse.data?.categories || categoriesResponse.categories || [];
      
      setMenu(menuData);
      setCategories(categoriesData);
      
      // Ouvrir la première catégorie par défaut
      if (categoriesData.length > 0 && !expandedCategories[categoriesData[0].id]) {
        setExpandedCategories({ [categoriesData[0].id]: true });
      }
    } catch (error) {
      console.error('Error loading menu:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMenu();
    setRefreshing(false);
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const toggleItemAvailability = async (itemId, currentStatus) => {
    try {
      await restaurantMenu.toggleAvailability(itemId);
      // Recharger le menu
      await loadMenu();
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  const getItemsByCategory = (categoryId) => {
    return menu.filter(item => item.category_id === categoryId || item.categoryId === categoryId);
  };

  const formatCurrency = (price) => {
    if (!price) return '0,00 FCFA';
    return Number.parseFloat(price).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' FCFA';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* TopAppBar */}
      <View style={styles.topBar}>
        <View style={styles.topBarContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Menu Overview</Text>
          <TouchableOpacity style={styles.searchButton}>
            <Ionicons name="search" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ButtonGroup Section */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.addItemButton}
            onPress={() => navigation.navigate('AddMenuItem')}
          >
            <Ionicons name="fast-food-outline" size={16} color={COLORS.white} />
            <Text style={styles.addItemButtonText}>Article</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addCategoryButton}
            onPress={() => navigation.navigate('AddCategory')}
          >
            <Ionicons name="folder-outline" size={16} color={COLORS.white} />
            <Text style={styles.addCategoryButtonText}>Catégorie</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bulkEditButton}
            onPress={() => navigation.navigate('BulkMenuEdit')}
          >
            <Ionicons name="settings-outline" size={16} color={COLORS.text} />
            <Text style={styles.bulkEditButtonText}>En masse</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Categories (Accordions) */}
        <View style={styles.categoriesContainer}>
          {categories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={64} color={COLORS.textLight} />
              <Text style={styles.emptyText}>Aucune catégorie</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('AddCategory')}
              >
                <Text style={styles.emptyButtonText}>Créer une catégorie</Text>
              </TouchableOpacity>
            </View>
          ) : (
            categories.map((category) => {
              const isExpanded = expandedCategories[category.id];
              const categoryItems = getItemsByCategory(category.id);

              return (
                <View key={category.id} style={styles.categoryCard}>
                  <TouchableOpacity
                    style={styles.categoryHeader}
                    onPress={() => toggleCategory(category.id)}
                  >
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryName}>{category.name}</Text>
                      <Text style={styles.categoryCount}>{categoryItems.length} articles</Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.itemsContainer}>
                      {categoryItems.length === 0 ? (
                        <View style={styles.emptyCategoryContainer}>
                          <Ionicons name="restaurant-outline" size={48} color={COLORS.border} />
                          <Text style={styles.emptyCategoryText}>Développer pour voir les plats</Text>
                        </View>
                      ) : (
                        categoryItems.map((item) => (
                          <TouchableOpacity 
                            key={item.id} 
                            style={styles.menuItem}
                            onPress={() => navigation.navigate('EditMenuItem', { itemId: item.id })}
                            activeOpacity={0.7}
                          >
                            {/* Image de l'article */}
                            <View style={styles.menuItemImageContainer}>
                              {item.photo || item.image_url || item.image ? (
                                <Image 
                                  source={{ uri: item.photo || item.image_url || item.image }} 
                                  style={styles.menuItemImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.menuItemImagePlaceholder}>
                                  <Ionicons name="fast-food-outline" size={24} color={COLORS.textLight} />
                                </View>
                              )}
                              {item.is_available === false && (
                                <View style={styles.unavailableBadge}>
                                  <Text style={styles.unavailableBadgeText}>Indispo</Text>
                                </View>
                              )}
                            </View>
                            
                            {/* Infos de l'article */}
                            <View style={styles.menuItemInfo}>
                              <Text style={styles.menuItemName} numberOfLines={2}>{item.name}</Text>
                              {item.description ? (
                                <Text style={styles.menuItemDescription} numberOfLines={1}>
                                  {item.description}
                                </Text>
                              ) : null}
                              <Text style={styles.menuItemPrice}>{formatCurrency(item.price)}</Text>
                            </View>
                            
                            {/* Actions */}
                            <View style={styles.menuItemActions}>
                              <Switch
                                value={item.is_available !== false}
                                onValueChange={() => toggleItemAvailability(item.id, item.is_available)}
                                trackColor={{ false: COLORS.border, true: COLORS.primary + '60' }}
                                thumbColor={item.is_available !== false ? COLORS.primary : COLORS.textLight}
                              />
                              <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
                            </View>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Floating Add Button with Menu */}
      {showAddMenu && (
        <View style={styles.floatingMenuOverlay}>
          <TouchableOpacity 
            style={styles.floatingMenuBackdrop}
            onPress={() => setShowAddMenu(false)}
          />
          <View style={styles.floatingMenuContainer}>
            <TouchableOpacity
              style={styles.floatingMenuItem}
              onPress={() => {
                setShowAddMenu(false);
                navigation.navigate('AddMenuItem');
              }}
            >
              <View style={[styles.floatingMenuIcon, { backgroundColor: COLORS.primary }]}>
                <Ionicons name="fast-food" size={20} color={COLORS.white} />
              </View>
              <Text style={styles.floatingMenuText}>Ajouter un article</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.floatingMenuItem}
              onPress={() => {
                setShowAddMenu(false);
                navigation.navigate('AddCategory');
              }}
            >
              <View style={[styles.floatingMenuIcon, { backgroundColor: COLORS.success }]}>
                <Ionicons name="folder" size={20} color={COLORS.white} />
              </View>
              <Text style={styles.floatingMenuText}>Ajouter une catégorie</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      <TouchableOpacity
        style={[styles.floatingButton, showAddMenu && styles.floatingButtonActive]}
        onPress={() => setShowAddMenu(!showAddMenu)}
      >
        <Ionicons 
          name={showAddMenu ? 'close' : 'add'} 
          size={24} 
          color={COLORS.white} 
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  topBarTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  searchButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexWrap: 'wrap',
  },
  addItemButton: {
    flex: 1,
    minWidth: 90,
    height: 40,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addItemButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
  addCategoryButton: {
    flex: 1,
    minWidth: 90,
    height: 40,
    backgroundColor: COLORS.success,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addCategoryButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
  bulkEditButton: {
    flex: 1,
    minWidth: 90,
    height: 40,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bulkEditButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    padding: 16,
    gap: 8,
  },
  categoryCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    gap: 24,
  },
  categoryInfo: {
    flexDirection: 'column',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  itemsContainer: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    gap: 12,
  },
  menuItemImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
    position: 'relative',
  },
  menuItemImage: {
    width: '100%',
    height: '100%',
  },
  menuItemImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  unavailableBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  menuItemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  menuItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  menuItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  menuItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyCategoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyCategoryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 80,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  floatingButtonActive: {
    backgroundColor: COLORS.text,
    transform: [{ rotate: '45deg' }],
  },
  floatingMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  floatingMenuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  floatingMenuContainer: {
    position: 'absolute',
    bottom: 150,
    right: 24,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  floatingMenuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingMenuText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
});

MenuScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
    goBack: PropTypes.func.isRequired,
  }).isRequired,
  route: PropTypes.shape({
    params: PropTypes.object,
  }),
};

MenuScreen.defaultProps = {
  route: {
    params: {},
  },
};

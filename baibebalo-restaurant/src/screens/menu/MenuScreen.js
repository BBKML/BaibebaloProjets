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
import { getImageUrl } from '../../utils/url';
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

  const totalItems = menu.length;
  const availableItems = menu.filter(i => i.is_available !== false).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mon Menu</Text>
          <Text style={styles.headerSub}>{totalItems} plats • {availableItems} disponibles</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('BulkMenuEdit')}
          >
            <Ionicons name="create-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barre d'actions rapides */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionBarBtn}
          onPress={() => navigation.navigate('AddMenuItem')}
        >
          <Ionicons name="add-circle" size={16} color={COLORS.primary} />
          <Text style={styles.actionBarBtnText}>Nouveau plat</Text>
        </TouchableOpacity>
        <View style={styles.actionBarDivider} />
        <TouchableOpacity
          style={styles.actionBarBtn}
          onPress={() => navigation.navigate('AddCategory')}
        >
          <Ionicons name="folder-open-outline" size={16} color="#3b82f6" />
          <Text style={[styles.actionBarBtnText, { color: '#3b82f6' }]}>Catégorie</Text>
        </TouchableOpacity>
        <View style={styles.actionBarDivider} />
        <TouchableOpacity
          style={styles.actionBarBtn}
          onPress={() => navigation.navigate('BulkMenuEdit')}
        >
          <Ionicons name="list-outline" size={16} color={COLORS.textSecondary} />
          <Text style={[styles.actionBarBtnText, { color: COLORS.textSecondary }]}>Modifier en masse</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Menu Categories (Accordions) */}
        <View style={styles.categoriesContainer}>
          {categories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="fast-food-outline" size={40} color={COLORS.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>Menu vide</Text>
              <Text style={styles.emptyText}>Commencez par créer une catégorie puis ajoutez vos plats</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('AddCategory')}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.emptyButtonText}>Créer une catégorie</Text>
              </TouchableOpacity>
            </View>
          ) : (
            categories.map((category) => {
              const isExpanded = expandedCategories[category.id];
              const categoryItems = getItemsByCategory(category.id);
              const availableInCat = categoryItems.filter(i => i.is_available !== false).length;

              return (
                <View key={category.id} style={styles.categoryCard}>
                  <TouchableOpacity
                    style={styles.categoryHeader}
                    onPress={() => toggleCategory(category.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categoryLeft}>
                      <View style={styles.categoryDot} />
                      <View>
                        <Text style={styles.categoryName}>{category.name}</Text>
                        <Text style={styles.categoryCount}>
                          {categoryItems.length} plat{categoryItems.length > 1 ? 's' : ''} • {availableInCat} dispo
                        </Text>
                      </View>
                    </View>
                    <View style={styles.categoryRight}>
                      <TouchableOpacity
                        style={styles.categoryAddBtn}
                        onPress={() => navigation.navigate('AddMenuItem', { categoryId: category.id })}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="add" size={18} color={COLORS.primary} />
                      </TouchableOpacity>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={COLORS.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.itemsContainer}>
                      {categoryItems.length === 0 ? (
                        <TouchableOpacity
                          style={styles.emptyCategoryRow}
                          onPress={() => navigation.navigate('AddMenuItem', { categoryId: category.id })}
                        >
                          <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                          <Text style={styles.emptyCategoryText}>Ajouter un premier plat</Text>
                        </TouchableOpacity>
                      ) : (
                        categoryItems.map((item, idx) => (
                          <TouchableOpacity
                            key={item.id}
                            style={[
                              styles.menuItem,
                              idx === categoryItems.length - 1 && styles.menuItemLast,
                              item.is_available === false && styles.menuItemUnavailable,
                            ]}
                            onPress={() => navigation.navigate('EditMenuItem', { itemId: item.id })}
                            activeOpacity={0.75}
                          >
                            {/* Image */}
                            <View style={styles.menuItemImgWrap}>
                              {item.photo || item.image_url || item.image ? (
                                <Image
                                  source={{ uri: getImageUrl(item.photo || item.image_url || item.image) }}
                                  style={styles.menuItemImg}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.menuItemImgEmpty}>
                                  <Ionicons name="fast-food-outline" size={22} color={COLORS.textSecondary} />
                                </View>
                              )}
                              {item.is_available === false && (
                                <View style={styles.unavailableOverlay}>
                                  <Text style={styles.unavailableText}>Indispo</Text>
                                </View>
                              )}
                            </View>

                            {/* Infos */}
                            <View style={styles.menuItemBody}>
                              <Text style={[styles.menuItemName, item.is_available === false && styles.menuItemNameUnavail]} numberOfLines={1}>
                                {item.name}
                              </Text>
                              {item.description ? (
                                <Text style={styles.menuItemDesc} numberOfLines={1}>{item.description}</Text>
                              ) : null}
                              <Text style={styles.menuItemPrice}>{formatCurrency(item.price)}</Text>
                            </View>

                            {/* Switch dispo */}
                            <Switch
                              value={item.is_available !== false}
                              onValueChange={() => toggleItemAvailability(item.id, item.is_available)}
                              trackColor={{ false: '#e2e8f0', true: COLORS.primary + '55' }}
                              thumbColor={item.is_available !== false ? COLORS.primary : '#94a3b8'}
                              ios_backgroundColor="#e2e8f0"
                            />
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
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 2,
  },
  actionBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  actionBarBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  actionBarDivider: { width: 1, height: 24, backgroundColor: COLORS.border },

  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  // Categories
  categoriesContainer: { padding: 16, gap: 10 },
  categoryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    paddingHorizontal: 16,
  },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  categoryDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  categoryName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  categoryCount: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  categoryRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryAddBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },

  // Items
  itemsContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border + '60',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '50',
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuItemUnavailable: { opacity: 0.55 },
  menuItemImgWrap: {
    width: 56, height: 56, borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  menuItemImg: { width: '100%', height: '100%' },
  menuItemImgEmpty: {
    width: '100%', height: '100%',
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10,
  },
  unavailableOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  unavailableText: {
    color: '#fff', fontSize: 9, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  menuItemBody: { flex: 1 },
  menuItemName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  menuItemNameUnavail: { color: COLORS.textSecondary },
  menuItemDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  menuItemPrice: { fontSize: 14, fontWeight: '800', color: COLORS.primary, marginTop: 3 },

  // Empty category row
  emptyCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  emptyCategoryText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },

  // Empty global
  emptyContainer: {
    alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 },
  emptyButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  emptyButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // FAB
  floatingButton: {
    position: 'absolute', bottom: 90, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10,
    elevation: 8, zIndex: 100,
  },
  floatingButtonActive: { backgroundColor: COLORS.text },
  floatingMenuOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99,
  },
  floatingMenuBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  floatingMenuContainer: {
    position: 'absolute', bottom: 160, right: 20,
    backgroundColor: COLORS.white, borderRadius: 16, padding: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 10,
    minWidth: 200,
  },
  floatingMenuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14, gap: 12,
    borderRadius: 10,
  },
  floatingMenuIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  floatingMenuText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
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

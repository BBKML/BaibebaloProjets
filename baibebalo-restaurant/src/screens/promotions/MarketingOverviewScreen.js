import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { restaurantPromotions } from '../../api/promotions';

const PROMOTION_STATUS = {
  active: { label: 'Active', color: COLORS.success },
  scheduled: { label: 'Programmée', color: COLORS.info },
  expired: { label: 'Expirée', color: COLORS.textSecondary },
  paused: { label: 'En pause', color: COLORS.warning },
};

export default function MarketingOverviewScreen({ navigation }) {
  const [promotions, setPromotions] = useState([]);
  const [filters, setFilters] = useState({ status: 'all' });
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const insets = useSafeAreaInsets();

  // Recharger à chaque fois que l'écran revient au premier plan (ex: après création)
  useFocusEffect(
    useCallback(() => {
      loadPromotions();
    }, [filters])
  );

  const loadPromotions = async () => {
    try {
      const response = await restaurantPromotions.getPromotions(filters);
      // Le backend retourne { success: true, data: { promotions: [...], pagination: {...} } }
      const promotionsData = response.data?.promo_codes || response.data?.promotions || response.promotions || [];
      
      // Adapter les données au format attendu
      const now = new Date();
      const adaptedPromotions = promotionsData.map(promo => ({
        id: promo.id,
        type: promo.type,
        code: promo.code,
        typeLabel: promo.type === 'percentage' ? 'Réduction %' :
                   promo.type === 'fixed_amount' ? 'Montant fixe' :
                   promo.type === 'free_delivery' ? 'Livraison gratuite' :
                   promo.type === 'bundle' ? 'Offre groupée' : promo.type,
        discount: promo.value,
        min_order_amount: promo.min_order_amount,
        valid_from: promo.valid_from,
        valid_until: promo.valid_until,
        usage_limit: promo.usage_limit,
        uses: promo.used_count || promo.usage_count || 0,
        is_active: promo.is_active,
        status: promo.is_active
          ? (new Date(promo.valid_until) > now
            ? (new Date(promo.valid_from) > now ? 'scheduled' : 'active')
            : 'expired')
          : 'paused',
      }));
      
      setPromotions(adaptedPromotions);
      
      // Calculer les stats
      const activePromos = adaptedPromotions.filter(p => p.status === 'active');
      setStats({
        totalActive: activePromos.length,
        totalRevenue: 0, // À calculer depuis les commandes
        totalUses: adaptedPromotions.reduce((sum, p) => sum + (p.uses || 0), 0),
      });
    } catch (error) {
      console.error('Error loading promotions:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPromotions();
    setRefreshing(false);
  };

  const handleTogglePromotion = async (promotionId, isActive) => {
    try {
      await restaurantPromotions.togglePromotion(promotionId);
      await loadPromotions();
    } catch (error) {
      const errorMessage = error.error?.message || error.message || 'Erreur';
      Alert.alert('Erreur', errorMessage);
    }
  };

  const handleDeletePromotion = (promotionId) => {
    Alert.alert(
      'Supprimer la promotion',
      'Êtes-vous sûr de vouloir supprimer cette promotion ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await restaurantPromotions.deletePromotion(promotionId);
              await loadPromotions();
            } catch (error) {
              Alert.alert('Erreur', error.message);
            }
          },
        },
      ]
    );
  };

  const renderPromotion = ({ item }) => {
    const status = PROMOTION_STATUS[item.status] || PROMOTION_STATUS.active;
    const running = item.status === 'active';

    const discountLabel =
      item.type === 'free_delivery'
        ? 'Livraison gratuite'
        : item.type === 'percentage'
        ? `${item.discount}% de réduction`
        : `${Number(item.discount).toLocaleString('fr-FR')} FCFA de réduction`;

    return (
      <View style={styles.promotionCard}>
        {/* Code + statut */}
        <View style={styles.promotionHeader}>
          <View style={styles.codeBox}>
            <Ionicons name="pricetag" size={14} color={COLORS.primary} />
            <Text style={styles.codeText}>{item.code}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '18' }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {/* Valeur */}
        <Text style={styles.discountValue}>{discountLabel}</Text>
        <Text style={styles.typeLabel}>{item.typeLabel}</Text>

        {/* Détails */}
        <View style={styles.promotionDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>
              {new Date(item.valid_from).toLocaleDateString('fr-FR')} →{' '}
              {new Date(item.valid_until).toLocaleDateString('fr-FR')}
            </Text>
          </View>
          {item.min_order_amount > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="cart-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>
                Min : {Number(item.min_order_amount).toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>
              {item.uses} utilisation{item.uses !== 1 ? 's' : ''}
              {item.usage_limit ? ` / ${item.usage_limit}` : ''}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.promotionActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('CreateAdvancedPromotion', { promotion: item })}
          >
            <Ionicons name="create-outline" size={16} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleTogglePromotion(item.id, running)}
          >
            <Ionicons
              name={running ? 'pause-circle-outline' : 'play-circle-outline'}
              size={16}
              color={running ? COLORS.warning : COLORS.success}
            />
            <Text style={[styles.actionButtonText, { color: running ? COLORS.warning : COLORS.success }]}>
              {running ? 'Pause' : 'Activer'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeletePromotion(item.id)}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const statusFilters = [
    { key: 'all', label: 'Toutes' },
    { key: 'active', label: 'Actives' },
    { key: 'scheduled', label: 'Programmées' },
    { key: 'expired', label: 'Expirées' },
  ];

  const filteredPromotions = promotions.filter((promo) => {
    if (filters.status === 'all') return true;
    return promo.status === filters.status;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Mes Promotions</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateAdvancedPromotion')}
        >
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Statistiques */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalActive || 0}</Text>
            <Text style={styles.statLabel}>Actives</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>
              {stats.totalRevenue?.toLocaleString('fr-FR') || '0'} FCFA
            </Text>
            <Text style={styles.statLabel}>CA généré</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>
              {stats.totalUses || 0}
            </Text>
            <Text style={styles.statLabel}>Utilisations</Text>
          </View>
        </View>
      )}

      {/* Filtres */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterGroup}>
            {statusFilters.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip,
                  filters.status === filter.key && styles.filterChipActive,
                ]}
                onPress={() => setFilters({ ...filters, status: filter.key })}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filters.status === filter.key && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Liste des promotions */}
      <FlatList
        data={filteredPromotions}
        renderItem={renderPromotion}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetag-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Aucune promotion</Text>
            <Text style={styles.emptySubtext}>
              Créez votre première promotion pour attirer plus de clients
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('CreateAdvancedPromotion')}
            >
              <Text style={styles.emptyButtonText}>Créer une promotion</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  filtersContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterGroup: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
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
    fontSize: 14,
    color: COLORS.text,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  list: {
    padding: 20,
  },
  promotionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  promotionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary + '12',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1.5,
  },
  discountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  typeLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  promotionDetails: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  promotionActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '15',
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  deleteButton: {
    backgroundColor: COLORS.error + '15',
  },
  actionButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: COLORS.error,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
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
});

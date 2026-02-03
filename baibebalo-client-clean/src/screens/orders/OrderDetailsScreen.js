import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Share,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { STATUS_LABELS, STATUS_COLORS } from '../../constants/orderStatus';
import { getOrderDetail, cancelOrder, reviewOrder } from '../../api/orders';
import { formatDateTime, formatCurrency, calculateOrderTotal, calculateOrderSubtotal } from '../../utils/format';

export default function OrderDetailsScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canEditReview, setCanEditReview] = useState(false);

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await getOrderDetail(orderId);
      const orderData = response.data?.order || response.data?.data?.order || response.data;
      setOrder(orderData);
      
      // Vérifier si l'avis peut être modifié (dans les 48h après livraison)
      if (orderData.status === 'delivered') {
        const deliveredDate = new Date(orderData.delivered_at || orderData.updated_at || orderData.created_at);
        const now = new Date();
        const hoursSinceDelivery = (now - deliveredDate) / (1000 * 60 * 60);
        // Permettre la modification si livré depuis moins de 48h et qu'un avis existe
        setCanEditReview(hoursSinceDelivery <= 48 && (orderData.review || orderData.restaurant_rating));
      } else {
        setCanEditReview(false);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de la commande');
    } finally {
      setLoading(false);
    }
  };

  const handleEditReview = () => {
    if (!order) return;
    // Préparer les données de l'avis existant
    const existingReview = {
      restaurant_rating: order.restaurant_rating || order.review?.restaurant_rating,
      delivery_rating: order.delivery_rating || order.review?.delivery_rating,
      restaurant_comment: order.restaurant_comment || order.review?.restaurant_comment,
      delivery_comment: order.delivery_comment || order.review?.delivery_comment,
      tags: order.review?.tags || [],
      tip_amount: order.review?.tip_amount,
      experience_comment: order.review?.experience_comment,
    };
    navigation.navigate('OrderReview', { 
      orderId: order.id,
      existingReview,
      isEdit: true,
    });
  };

  const handleReorder = () => {
    const restaurantId = order.restaurant?.id;
    if (restaurantId) {
      navigation.navigate('RestaurantDetail', { restaurantId });
      return;
    }
    Alert.alert('Commande', 'Impossible de relancer cette commande.');
  };

  const handleSupport = () => {
    navigation.navigate('ContactSupport');
  };

  const handleShareOrder = async () => {
    try {
      const orderSummary = `Commande #${order.order_number || order.id}\n` +
        `Restaurant: ${order.restaurant?.name || 'N/A'}\n` +
        `Total: ${formatCurrency(total)}\n` +
        `Date: ${formatDateTime(order.created_at)}\n` +
        `Statut: ${STATUS_LABELS[order.status] || order.status}`;
      
      await Share.share({
        message: orderSummary,
        title: `Commande ${order.order_number || order.id}`,
      });
    } catch (error) {
      console.error('Erreur lors du partage:', error);
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      const orderSummary = `Commande #${order.order_number || order.id}\n` +
        `Restaurant: ${order.restaurant?.name || 'N/A'}\n` +
        `Total: ${formatCurrency(total)}\n` +
        `Date: ${formatDateTime(order.created_at)}\n` +
        `Statut: ${STATUS_LABELS[order.status] || order.status}`;
      
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(orderSummary)}`;
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert('WhatsApp', 'WhatsApp n\'est pas installé sur cet appareil.');
      }
    } catch (error) {
      console.error('Erreur partage WhatsApp:', error);
      Alert.alert('Erreur', 'Impossible de partager sur WhatsApp.');
    }
  };

  const handleViewRefundPolicy = () => {
    navigation.navigate('HelpCenter');
  };

  const handleRequestRefund = () => {
    if (!order) return;
    
    // Vérifier si la commande est éligible pour un remboursement
    const refundableStatuses = ['delivered', 'cancelled'];
    const hoursSinceOrder = order.created_at 
      ? (new Date() - new Date(order.created_at)) / (1000 * 60 * 60)
      : 999;
    
    if (!refundableStatuses.includes(order.status)) {
      Alert.alert(
        'Remboursement',
        'Les remboursements ne sont disponibles que pour les commandes livrées ou annulées.'
      );
      return;
    }
    
    if (hoursSinceOrder > 24) {
      Alert.alert(
        'Délai dépassé',
        'Les demandes de remboursement doivent être faites dans les 24h suivant la livraison. Veuillez contacter le support pour une assistance personnalisée.'
      );
      return;
    }
    
    // Naviguer vers l'écran de signalement de problème avec pré-remplissage
    navigation.navigate('ReportProblem', {
      orderId: order.id,
      preSelectedProblem: 'payment',
    });
  };

  const handleTrackOrder = () => {
    navigation.navigate('OrderTracking', { orderId });
  };

  const handleCallRestaurant = () => {
    const phone = order?.restaurant?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Contact', 'Le numéro du restaurant n\'est pas disponible.');
    }
  };

  const handleOpenChat = () => {
    navigation.navigate('OrderChat', {
      orderId: order.id,
      restaurantName: order.restaurant?.name,
    });
  };

  const handleCancelOrder = () => {
    if (!order) return;
    // Vérifier si la commande peut être annulée
    // Statuts annulables : pending, confirmed, accepted, preparing
    const cancellableStatuses = ['pending', 'confirmed', 'accepted', 'preparing'];
    if (!cancellableStatuses.includes(order.status)) {
      Alert.alert(
        'Annulation impossible',
        'Cette commande ne peut plus être annulée. Elle est déjà en cours de livraison ou a été livrée.'
      );
      return;
    }

    Alert.alert(
      'Annuler la commande',
      'Êtes-vous sûr de vouloir annuler cette commande ?',
      [
        {
          text: 'Non',
          style: 'cancel',
        },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelOrder(orderId);
              Alert.alert('Succès', 'Votre commande a été annulée.', [
                {
                  text: 'OK',
                  onPress: () => {
                    loadOrderDetails(); // Recharger les détails
                    navigation.goBack();
                  },
                },
              ]);
            } catch (error) {
              console.error('Erreur lors de l\'annulation:', error);
              Alert.alert(
                'Erreur',
                error.response?.data?.message || 'Impossible d\'annuler la commande. Veuillez réessayer.'
              );
            }
          },
        },
      ]
    );
  };

  const paymentLabel = () => {
    const method = order?.payment_method || order?.payment?.method;
    if (method === 'orange_money') return 'Orange Money';
    if (method === 'mtn_money') return 'MTN Mobile Money';
    if (method === 'cash') return 'Espèces';
    return 'Mobile Money';
  };

  if (loading || !order) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Utiliser les fonctions utilitaires partagées pour garantir la cohérence
  const subtotal = calculateOrderSubtotal(order);
  const total = calculateOrderTotal(order);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails de la commande</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      {/* Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View>
            <Text style={styles.statusLabel}>ID de commande</Text>
            <Text style={styles.orderNumber}>
              #{order.order_number || order.id}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: STATUS_COLORS[order.status] + '20' },
            ]}
          >
            <Text
              style={[styles.statusText, { color: STATUS_COLORS[order.status] }]}
            >
              {STATUS_LABELS[order.status]}
            </Text>
          </View>
        </View>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.dateText}>
            {formatDateTime(order.created_at)}
          </Text>
        </View>
      </View>

      {/* Delivery Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Adresse de livraison</Text>
        <View style={styles.addressCard}>
          <View style={styles.addressIcon}>
            <Ionicons name="location" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.addressInfo}>
            <Text style={styles.addressLabel}>
              {order.delivery_address?.label
                || order.delivery_address?.title
                || 'Adresse'}
            </Text>
            <Text style={styles.addressText}>
              {order.delivery_address?.street
                || order.delivery_address?.address_line
                || ''}
            </Text>
            <Text style={styles.addressText}>
              {order.delivery_address?.city
                || order.delivery_address?.district
                || ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Order Items */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Articles commandés</Text>
          <Text style={styles.itemsCount}>
            {order.items?.length || 0} Articles
          </Text>
        </View>
        {order.items?.map((item) => (
          <View
            key={item.id || item.menu_item?.id || `${item.name}-${item.price}`}
            style={styles.itemCard}
          >
            {item.menu_item?.image_url && (
              <Image
                source={{ uri: item.menu_item.image_url }}
                style={styles.itemImage}
              />
            )}
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>
                {item.menu_item?.name || item.name}
              </Text>
              <Text style={styles.itemQuantity}>x{item.quantity}</Text>
            </View>
            <Text style={styles.itemPrice}>
              {formatCurrency(
                (item.unit_price || item.price || item.menu_item?.price || item.menu_item_snapshot?.price || 0) * (item.quantity || 1)
              )}
            </Text>
          </View>
        ))}
      </View>

      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Résumé</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sous-total</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(subtotal)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Frais de livraison</Text>
            <Text style={styles.summaryValue}>
              {(order.delivery_fee || 0) === 0
                ? 'Gratuit'
                : formatCurrency(order.delivery_fee || 0)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Taxes</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(order.taxes || 0)}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(total || order.total || 0)}
            </Text>
          </View>
          <View style={styles.paymentRow}>
            <View style={styles.paymentInfo}>
              <Ionicons name="wallet-outline" size={18} color={COLORS.warning} />
              <Text style={styles.paymentLabel}>{paymentLabel()}</Text>
            </View>
            <Text style={styles.paymentStatus}>Payé</Text>
          </View>
          
          {/* Lien vers politique de remboursement */}
          <TouchableOpacity 
            style={styles.refundPolicyLink}
            onPress={handleViewRefundPolicy}
          >
            <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
            <Text style={styles.refundPolicyText}>Politique de remboursement</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {/* Bouton Suivre la commande - affiché si la commande n'est pas annulée ou livrée */}
        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <TouchableOpacity style={styles.primaryButton} onPress={handleTrackOrder}>
            <Ionicons name="location" size={18} color={COLORS.white} />
            <Text style={styles.primaryButtonText}>Suivre la commande</Text>
          </TouchableOpacity>
        )}
        
        {/* Bouton Annuler - affiché seulement si la commande peut être annulée */}
        {['pending', 'confirmed', 'accepted', 'preparing'].includes(order.status) && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelOrder}>
            <Ionicons name="close-circle-outline" size={18} color={COLORS.error || '#FF3B30'} />
            <Text style={styles.cancelButtonText}>Annuler ma commande</Text>
          </TouchableOpacity>
        )}

        {/* Bouton Modifier mon avis - affiché si la commande est livrée et dans les 48h */}
        {canEditReview && order.status === 'delivered' && (
          <TouchableOpacity style={styles.editReviewButton} onPress={handleEditReview}>
            <Ionicons name="create-outline" size={18} color={COLORS.primary} />
            <Text style={styles.editReviewButtonText}>Modifier mon avis</Text>
          </TouchableOpacity>
        )}

        {/* Bouton Demander un remboursement - affiché si la commande est livrée/annulée et dans les 24h */}
        {order.status === 'delivered' && (
          <TouchableOpacity style={styles.refundButton} onPress={handleRequestRefund}>
            <Ionicons name="card-outline" size={18} color={COLORS.warning} />
            <Text style={styles.refundButtonText}>Demander un remboursement</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.primaryButton} onPress={handleReorder}>
          <Ionicons name="refresh" size={18} color={COLORS.white} />
          <Text style={styles.primaryButtonText}>Commander à nouveau</Text>
        </TouchableOpacity>
        
        {/* Boutons de partage */}
        <View style={styles.shareButtonsRow}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShareOrder}>
            <Ionicons name="share-social" size={18} color={COLORS.primary} />
            <Text style={styles.shareButtonText}>Partager</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton} onPress={handleShareWhatsApp}>
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            <Text style={styles.shareButtonText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
        
        {/* Bouton Chat avec le restaurant */}
        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <TouchableOpacity style={styles.chatRestaurantButton} onPress={handleOpenChat}>
            <Ionicons name="chatbubbles-outline" size={18} color={COLORS.white} />
            <Text style={styles.chatRestaurantText}>Discuter avec le restaurant</Text>
          </TouchableOpacity>
        )}
        
        {/* Bouton Appeler le restaurant */}
        {order.restaurant?.phone && (
          <TouchableOpacity style={styles.callRestaurantButton} onPress={handleCallRestaurant}>
            <Ionicons name="call-outline" size={18} color={COLORS.primary} />
            <Text style={styles.callRestaurantText}>Appeler le restaurant</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.secondaryButton} onPress={handleSupport}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.secondaryButtonText}>Contacter le support</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: {
    flex: 1,
    marginLeft: 12,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  statusCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  itemsCount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  addressCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addressIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressInfo: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  itemCard: {
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
    paddingTop: 16,
    marginTop: 8,
    backgroundColor: COLORS.primary + '08',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderRadius: 8,
    marginHorizontal: -12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  paymentRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  paymentStatus: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.error || '#FF3B30',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButtonText: {
    color: COLORS.error || '#FF3B30',
    fontSize: 16,
    fontWeight: '700',
  },
  shareButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  shareButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  editReviewButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  editReviewButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  refundPolicyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  refundPolicyText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  refundButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.warning,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  refundButtonText: {
    color: COLORS.warning,
    fontSize: 16,
    fontWeight: '700',
  },
  callRestaurantButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  callRestaurantText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  chatRestaurantButton: {
    backgroundColor: COLORS.success || '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  chatRestaurantText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

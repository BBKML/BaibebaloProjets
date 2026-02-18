import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  TextInput,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import socketService from '../../services/socketService';

// Import conditionnel de react-native-maps (nécessite un build de développement)
let MapView, Marker;
try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
} catch (error) {
  // react-native-maps n'est pas disponible dans Expo Go
  MapView = null;
  Marker = null;
}
import { restaurantOrders } from '../../api/orders';
import useRestaurantStore from '../../store/restaurantStore';

const STATUS_COLORS = {
  pending: COLORS.pending,
  new: COLORS.pending,
  accepted: COLORS.confirmed,
  preparing: COLORS.preparing,
  ready: COLORS.ready,
  driver_en_route: COLORS.delivering,
  delivering: COLORS.delivering,
  delivered: COLORS.delivered,
  cancelled: COLORS.cancelled,
  refused: COLORS.cancelled,
};

const STATUS_LABELS = {
  pending: 'En attente',
  new: 'Nouvelle',
  accepted: 'Acceptée',
  preparing: 'En préparation',
  ready: 'Prête',
  picked_up: 'Récupérée',
  driver_en_route: 'Livreur en route', // Affiché quand ready + delivery_person_id
  delivering: 'En livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  refused: 'Refusée',
};

const getStatusLabel = (order) => {
  if (order?.status === 'ready' && order?.delivery_person_id) {
    return STATUS_LABELS.driver_en_route;
  }
  if (order?.status === 'picked_up') {
    return STATUS_LABELS.picked_up;
  }
  return STATUS_LABELS[order?.status] || order?.status;
};

export default function OrderDetailsScreen({ navigation, route }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState('20');
  const [driverArrived, setDriverArrived] = useState(false);
  const [driverInfo, setDriverInfo] = useState(null);
  const { updateOrder } = useRestaurantStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  // Écouter les événements WebSocket liés au livreur
  useEffect(() => {
    // Livreur arrivé au restaurant
    const unsubArrived = socketService.on('delivery_arrived', (data) => {
      console.log('🚚 Événement delivery_arrived reçu:', data);
      if (data.order_id === orderId || data.orderId === orderId) {
        setDriverArrived(true);
        setDriverInfo(data.delivery_person || data.driver);
        Vibration.vibrate([0, 500, 200, 500]); // Vibration pattern
        Alert.alert(
          '🚚 Livreur arrivé !',
          `${data.delivery_person?.first_name || 'Le livreur'} est arrivé pour récupérer la commande.`,
          [{ text: 'OK' }]
        );
        // Recharger les détails pour avoir les dernières infos
        loadOrderDetails();
      }
    });

    // Commande récupérée par le livreur
    const unsubPickedUp = socketService.on('order_picked_up', (data) => {
      console.log('📦 Événement order_picked_up reçu:', data);
      if (data.order_id === orderId || data.orderId === orderId) {
        Alert.alert(
          '📦 Commande récupérée',
          'Le livreur a récupéré la commande et est en route vers le client.',
          [{ text: 'OK' }]
        );
        loadOrderDetails();
      }
    });

    // Livreur assigné à la commande
    const unsubAssigned = socketService.on('delivery_assigned', (data) => {
      console.log('🚚 Événement delivery_assigned reçu:', data);
      if (data.order_id === orderId || data.orderId === orderId) {
        setDriverInfo(data.delivery_person || data.driver);
        const driverName = data.delivery_person?.first_name || data.driver?.first_name || 'Un livreur';
        Alert.alert(
          '🚴 Livreur assigné !',
          `${driverName} va récupérer la commande chez vous.`,
          [{ text: 'OK' }]
        );
        loadOrderDetails();
      }
    });

    // Commande annulée par le client
    const unsubCancelled = socketService.on('order_cancelled', (data) => {
      console.log('❌ Événement order_cancelled reçu:', data);
      if (data.order_id === orderId || data.orderId === orderId) {
        Vibration.vibrate([0, 500, 200, 500]);
        Alert.alert(
          '❌ Commande annulée',
          `Le client a annulé cette commande.\n\nRaison: ${data.reason || 'Non spécifiée'}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Recharger les détails pour mettre à jour le statut
                loadOrderDetails();
                // Retourner à la liste si nécessaire
                navigation.goBack();
              },
            },
          ]
        );
        loadOrderDetails();
      }
    });

    return () => {
      unsubArrived();
      unsubPickedUp();
      unsubAssigned();
      unsubCancelled();
    };
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      const response = await restaurantOrders.getOrderDetails(orderId);
      // Le backend retourne { success: true, data: { order: {...} } }
      const orderData = response.data?.order || response.order;
      setOrder(orderData);
      if (orderData) {
        updateOrder(orderData);
      }
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de charger les détails de la commande');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleMessage = (phone) => {
    Linking.openURL(`sms:${phone}`);
  };

  const handleOpenChat = () => {
    navigation.navigate('CustomerChat', {
      orderId: order.id,
      customerName: order.customerName,
      orderNumber: order.orderNumber || order.order_number,
    });
  };

  const handleAccept = () => {
    setShowTimeModal(true);
  };

  const confirmAccept = async () => {
    try {
      const time = Number.parseInt(estimatedTime, 10) || 20;
      if (time < 5 || time > 180) {
        Alert.alert('Erreur', 'Le temps de préparation doit être entre 5 et 180 minutes');
        return;
      }
      setShowTimeModal(false);
      await restaurantOrders.acceptOrder(orderId, time);
      await loadOrderDetails();
      Alert.alert('Succès', 'Commande acceptée');
    } catch (error) {
      const errorMessage = error.error?.message || error.message || 'Impossible d\'accepter la commande';
      Alert.alert('Erreur', errorMessage);
    }
  };

  const handleRefuse = () => {
    navigation.navigate('RefuseOrderModal', { orderId });
  };

  const handleStartPreparation = async () => {
    try {
      await restaurantOrders.startPreparation(orderId);
      await loadOrderDetails();
      Alert.alert('Succès', 'Préparation démarrée');
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de démarrer la préparation');
    }
  };

  const handleMarkReady = async () => {
    try {
      await restaurantOrders.markReady(orderId);
      await loadOrderDetails();
      Alert.alert('Succès', 'Commande marquée comme prête');
    } catch (error) {
      Alert.alert('Erreur', error.message);
    }
  };

  if (loading || !order) {
    return (
      <View style={styles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  const statusColor = (order?.status === 'ready' && order?.delivery_person_id) 
    ? STATUS_COLORS.driver_en_route 
    : (STATUS_COLORS[order.status] || COLORS.textSecondary);
  const statusLabel = getStatusLabel(order);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.orderNumber}>#{order.order_number || order.orderNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Informations client */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations client</Text>
          <View style={styles.clientCard}>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{order.customerName}</Text>
              <Text style={styles.clientPhone}>{order.customerPhone}</Text>
            </View>
            <View style={styles.clientActions}>
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={() => handleCall(order.customerPhone)}
              >
                <Ionicons name="call" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={() => handleMessage(order.customerPhone)}
              >
                <Ionicons name="chatbubble-outline" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionIcon, { backgroundColor: COLORS.primary }]}
                onPress={handleOpenChat}
              >
                <Ionicons name="chatbubbles" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Adresse de livraison */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adresse de livraison</Text>
          <View style={styles.addressCard}>
            <Ionicons name="location" size={20} color={COLORS.primary} />
            <View style={styles.addressContent}>
              <Text style={styles.addressText}>
                {order.deliveryAddress || order.delivery_address?.address_line || 'Adresse non disponible'}
              </Text>
              {order.deliveryLandmark && (
                <Text style={styles.landmarkText}>Près de : {order.deliveryLandmark}</Text>
              )}
              {order.special_instructions && (
                <Text style={styles.instructionsText}>
                  Instructions : {order.special_instructions}
                </Text>
              )}
            </View>
          </View>
          {order.deliveryLatitude && order.deliveryLongitude && (
            <View style={styles.mapContainer}>
              {MapView ? (
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: order.deliveryLatitude,
                    longitude: order.deliveryLongitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  {Marker && (
                    <Marker
                      coordinate={{
                        latitude: order.deliveryLatitude,
                        longitude: order.deliveryLongitude,
                      }}
                    />
                  )}
                </MapView>
              ) : (
                <TouchableOpacity
                  style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }]}
                  onPress={() => {
                    const lat = Number.parseFloat(order.deliveryLatitude);
                    const lng = Number.parseFloat(order.deliveryLongitude);
                    const url = `https://www.google.com/maps?q=${lat},${lng}`;
                    Linking.openURL(url).catch(() => {
                      Alert.alert('Erreur', 'Impossible d\'ouvrir la carte');
                    });
                  }}
                >
                  <Ionicons name="location" size={48} color={COLORS.primary} />
                  <Text style={styles.mapFallbackText}>Carte non disponible</Text>
                  <Text style={styles.mapFallbackSubtext}>
                    Lat: {Number.parseFloat(order.deliveryLatitude).toFixed(6)}
                  </Text>
                  <Text style={styles.mapFallbackSubtext}>
                    Lng: {Number.parseFloat(order.deliveryLongitude).toFixed(6)}
                  </Text>
                  <Text style={styles.mapFallbackLink}>Appuyez pour ouvrir dans Google Maps</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Articles commandés */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Articles commandés</Text>
          {order.items?.map((item, index) => {
            // Extraire les options sélectionnées
            const selectedOptions = item.selected_options || item.customizations || [];
            const hasOptions = (Array.isArray(selectedOptions) && selectedOptions.length > 0) || 
                              (typeof selectedOptions === 'object' && Object.keys(selectedOptions).length > 0);
            
            return (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name || item.item_name || 'Article'}</Text>
                  <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                </View>
                
                {/* Afficher les options sélectionnées */}
                {hasOptions && (
                  <View style={styles.itemVariations}>
                    {Array.isArray(selectedOptions) ? (
                      selectedOptions.map((option, oIndex) => (
                        <Text key={oIndex} style={styles.variationText}>
                          • {option.label || option.key}: {option.value_label || option.value || option.choice}
                          {option.price > 0 && ` (+${option.price} FCFA)`}
                        </Text>
                      ))
                    ) : (
                      Object.entries(selectedOptions).map(([key, value], oIndex) => (
                        <Text key={oIndex} style={styles.variationText}>
                          • {key}: {typeof value === 'object' ? value.label || value.value : value}
                          {value?.price > 0 && ` (+${value.price} FCFA)`}
                        </Text>
                      ))
                    )}
                  </View>
                )}
                
                {/* Anciennes variations (compatibilité) */}
                {item.variations && !hasOptions && (
                  <View style={styles.itemVariations}>
                    {item.variations.map((variation, vIndex) => (
                      <Text key={vIndex} style={styles.variationText}>
                        • {variation}
                      </Text>
                    ))}
                  </View>
                )}
                
                {/* Notes spéciales */}
                {(item.notes || item.special_notes) && (
                  <View style={styles.notesContainer}>
                    <Ionicons name="chatbubble-outline" size={14} color={COLORS.warning} />
                    <Text style={styles.itemNotes}>
                      {item.notes || item.special_notes}
                    </Text>
                  </View>
                )}
                
                <Text style={styles.itemPrice}>
                  {Number.parseFloat(item.subtotal || (item.unit_price || item.price || 0) * (item.quantity || 1)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA
                </Text>
              </View>
            );
          })}
        </View>

        {/* Récapitulatif financier */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Récapitulatif financier</Text>
          <View style={styles.financialCard}>
            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>Sous-total articles</Text>
              <Text style={styles.financialValue}>
                {(() => {
                  // Recalculer le sous-total à partir des items pour éviter les erreurs
                  const calculatedSubtotal = order.items?.reduce((sum, item) => {
                    // Utiliser item.subtotal s'il existe, sinon calculer unit_price * quantity
                    const itemSubtotal = item.subtotal || ((item.unit_price || item.price || 0) * (item.quantity || 1));
                    return sum + Number.parseFloat(itemSubtotal || 0);
                  }, 0) || 0;
                  
                  // Utiliser le sous-total calculé s'il est disponible, sinon utiliser celui de la commande
                  const displaySubtotal = calculatedSubtotal > 0 ? calculatedSubtotal : (order.subtotal || 0);
                  return Number.parseFloat(displaySubtotal).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                })()} FCFA
              </Text>
            </View>
            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>Frais de livraison</Text>
              <Text style={styles.financialValue}>
                {order.deliveryFee || order.delivery_fee ? Number.parseFloat(order.deliveryFee || order.delivery_fee || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} FCFA (payé par client)
              </Text>
            </View>
            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>Commission BAIBEBALO</Text>
              <Text style={styles.financialValue}>
                {(() => {
                  // Utiliser la commission calculée par le backend (toujours disponible)
                  const commission = order.commission !== null && order.commission !== undefined 
                    ? Number.parseFloat(order.commission) 
                    : 0;
                  const commissionRate = order.commissionRate || order.commission_rate || 15;
                  
                  // Si la commission est 0 mais qu'on a un subtotal, recalculer
                  if (commission === 0 && order.subtotal && order.subtotal > 0) {
                    const recalculatedCommission = (order.subtotal * commissionRate) / 100;
                    return `${recalculatedCommission.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA (${commissionRate}%)`;
                  }
                  
                  return `${commission.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA (${commissionRate}%)`;
                })()}
              </Text>
            </View>
            <View style={[styles.financialRow, styles.financialTotal]}>
              <Text style={styles.financialTotalLabel}>Votre revenu net</Text>
              <Text style={styles.financialTotalValue}>
                {(() => {
                  // Utiliser le revenu net calculé par le backend
                  const netRevenue = order.netRevenue !== null && order.netRevenue !== undefined 
                    ? Number.parseFloat(order.netRevenue) 
                    : (order.net_revenue !== null && order.net_revenue !== undefined 
                      ? Number.parseFloat(order.net_revenue) 
                      : 0);
                  
                  // Si le revenu net est 0 mais qu'on a un subtotal et une commission, recalculer
                  if (netRevenue === 0 && order.subtotal && order.subtotal > 0) {
                    const commission = order.commission !== null && order.commission !== undefined 
                      ? Number.parseFloat(order.commission) 
                      : 0;
                    const commissionRate = order.commissionRate || order.commission_rate || 15;
                    const actualCommission = commission > 0 ? commission : (order.subtotal * commissionRate) / 100;
                    const recalculatedNetRevenue = order.subtotal - actualCommission;
                    return `${Math.max(0, recalculatedNetRevenue).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA`;
                  }
                  
                  return `${Math.max(0, netRevenue).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA`;
                })()}
              </Text>
            </View>
          </View>
        </View>

        {/* Mode de paiement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mode de paiement</Text>
          <View style={styles.paymentCard}>
            <Ionicons
              name={order.paymentMethod === 'cash' ? 'cash' : 'card'}
              size={24}
              color={COLORS.primary}
            />
            <Text style={styles.paymentText}>
              {order.paymentMethod === 'cash'
                ? 'Paiement à la livraison'
                : 'Déjà payé par Mobile Money'}
            </Text>
          </View>
        </View>

        {/* Historique des actions */}
        {order.history && order.history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historique</Text>
            <View style={styles.historyContainer}>
              {order.history.map((action, index) => (
                <View key={index} style={styles.historyItem}>
                  <View style={styles.historyDot} />
                  <View style={styles.historyContent}>
                    <Text style={styles.historyText}>{action.description}</Text>
                    <Text style={styles.historyTime}>{action.timestamp}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Actions selon statut */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {order.status === 'pending' || order.status === 'new' ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.footerButton, styles.acceptButton]} onPress={handleAccept}>
              <Ionicons name="checkmark" size={20} color={COLORS.white} />
              <Text style={styles.acceptButtonText}>ACCEPTER LA COMMANDE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerButton, styles.refuseButton]} onPress={handleRefuse}>
              <Ionicons name="close" size={20} color={COLORS.white} />
              <Text style={styles.refuseButtonText}>REFUSER</Text>
            </TouchableOpacity>
          </View>
        ) : order.status === 'accepted' ? (
          <TouchableOpacity style={[styles.footerButton, styles.startButton]} onPress={handleStartPreparation}>
            <Ionicons name="play" size={20} color={COLORS.white} />
            <Text style={styles.startButtonText}>DÉMARRER LA PRÉPARATION</Text>
          </TouchableOpacity>
        ) : order.status === 'preparing' ? (
          <TouchableOpacity style={[styles.footerButton, styles.readyButton]} onPress={handleMarkReady}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
            <Text style={styles.readyButtonText}>COMMANDE PRÊTE</Text>
          </TouchableOpacity>
        ) : order.status === 'ready' ? (
          <View style={styles.waitingContainer}>
            {driverArrived ? (
              <View style={styles.driverArrivedBanner}>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text style={styles.driverArrivedText}>Livreur arrivé !</Text>
              </View>
            ) : (
              <Text style={styles.waitingText}>En attente du livreur...</Text>
            )}
            {(order.driverName || order.delivery_person_name || driverInfo) && (
              <View style={styles.driverInfo}>
                <View style={styles.driverAvatar}>
                  <Ionicons name="person" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.driverDetails}>
                  <Text style={styles.driverName}>
                    {order.driverName || order.delivery_person_name || driverInfo?.first_name || 'Livreur'}
                  </Text>
                  {(order.vehicle_type || driverInfo?.vehicle_type) && (
                    <View style={styles.vehicleInfo}>
                      <Ionicons 
                        name={order.vehicle_type === 'motorcycle' ? 'bicycle' : 'walk'} 
                        size={14} 
                        color={COLORS.textSecondary} 
                      />
                      <Text style={styles.vehicleText}>
                        {order.vehicle_type || driverInfo?.vehicle_type}
                        {(order.vehicle_plate || driverInfo?.vehicle_plate) && ` • ${order.vehicle_plate || driverInfo?.vehicle_plate}`}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.contactDriverButton}
                  onPress={() => handleCall(order.driverPhone || order.delivery_person_phone || driverInfo?.phone)}
                >
                  <Ionicons name="call" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : order.status === 'delivering' ? (
          <View style={styles.deliveringContainer}>
            <Ionicons name="bicycle" size={24} color={COLORS.delivering} />
            <Text style={styles.deliveringText}>En cours de livraison</Text>
          </View>
        ) : null}
      </View>

      {/* Modal pour le temps de préparation */}
      <Modal
        visible={showTimeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Temps de préparation estimé</Text>
            <Text style={styles.modalSubtitle}>Entrez le temps en minutes (5-180 min)</Text>
            <TextInput
              style={styles.timeInput}
              value={estimatedTime}
              onChangeText={setEstimatedTime}
              keyboardType="numeric"
              placeholder="20"
              placeholderTextColor={COLORS.textSecondary}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowTimeModal(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmAccept}
              >
                <Text style={styles.modalConfirmText}>Accepter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerContent: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120, // Espace pour le footer
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  clientCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  clientPhone: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  clientActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  addressContent: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  landmarkText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 12,
    color: COLORS.primary,
    fontStyle: 'italic',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
  },
  map: {
    flex: 1,
  },
  mapFallbackText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  mapFallbackSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  mapFallbackLink: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 12,
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  itemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  itemQuantity: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  itemVariations: {
    marginBottom: 8,
  },
  variationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: COLORS.warning + '15',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemNotes: {
    flex: 1,
    fontSize: 12,
    color: COLORS.warning,
    fontStyle: 'italic',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  financialCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  financialLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  financialValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  financialTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    marginTop: 8,
  },
  financialTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  financialTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  paymentText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  historyContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  historyItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 12,
    marginTop: 6,
  },
  historyContent: {
    flex: 1,
  },
  historyText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  footer: {
    padding: 20,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    minHeight: 56,
  },
  acceptButton: {
    backgroundColor: COLORS.success,
  },
  refuseButton: {
    backgroundColor: COLORS.error,
  },
  startButton: {
    backgroundColor: COLORS.primary,
  },
  readyButton: {
    backgroundColor: COLORS.success,
  },
  acceptButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  refuseButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  startButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  readyButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  waitingContainer: {
    alignItems: 'center',
  },
  waitingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  driverArrivedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  driverArrivedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 12,
    width: '100%',
    gap: 12,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  vehicleText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  driverText: {
    fontSize: 14,
    color: COLORS.text,
  },
  contactDriverButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactDriverText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  deliveringContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  deliveringText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.delivering,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 20,
    backgroundColor: COLORS.background,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: COLORS.background,
  },
  modalConfirmButton: {
    backgroundColor: COLORS.primary,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

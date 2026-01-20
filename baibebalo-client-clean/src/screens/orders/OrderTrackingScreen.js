import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { STATUS_LABELS, STATUS_COLORS } from '../../constants/orderStatus';
import { trackOrder } from '../../api/orders';
import io from 'socket.io-client';
import { API_CONFIG } from '../../constants/api';

export default function OrderTrackingScreen({ route }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
    
    // Connexion Socket.io pour les mises à jour en temps réel
    const socket = io(API_CONFIG.BASE_URL.replace('/api/v1', ''), {
      transports: ['websocket'],
    });

    socket.on('order:updated', (updatedOrder) => {
      if (updatedOrder.id === orderId) {
        setOrder(updatedOrder);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const response = await trackOrder(orderId);
      // Le backend peut retourner la commande dans response.data.order ou response.data
      setOrder(response.data?.order || response.data);
    } catch (error) {
      console.error('Erreur lors du chargement de la commande:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !order) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const statusSteps = [
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'picked_up',
    'delivering',
    'delivered',
  ];

  const currentStatusIndex = statusSteps.indexOf(order.status);

  return (
    <ScrollView style={styles.container}>
      {/* Status Timeline */}
      <View style={styles.timelineContainer}>
        {statusSteps.map((status, index) => {
          const isCompleted = index <= currentStatusIndex;
          const isCurrent = index === currentStatusIndex;
          const isLast = index === statusSteps.length - 1;

          return (
            <View key={status} style={styles.timelineItem}>
              <View style={styles.timelineContent}>
                <View
                  style={[
                    styles.timelineDot,
                    isCompleted && styles.timelineDotCompleted,
                    isCurrent && styles.timelineDotCurrent,
                  ]}
                >
                  {isCompleted && (
                    <Ionicons name="checkmark" size={16} color={COLORS.white} />
                  )}
                </View>
                {!isLast && (
                  <View
                    style={[
                      styles.timelineLine,
                      isCompleted && styles.timelineLineCompleted,
                    ]}
                  />
                )}
              </View>
              <View style={styles.timelineLabel}>
                <Text
                  style={[
                    styles.timelineLabelText,
                    isCompleted && styles.timelineLabelTextCompleted,
                  ]}
                >
                  {STATUS_LABELS[status]}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Order Details */}
      <View style={styles.detailsContainer}>
        <Text style={styles.sectionTitle}>Détails de la commande</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Numéro de commande</Text>
          <Text style={styles.detailValue}>#{order.order_number}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Restaurant</Text>
          <Text style={styles.detailValue}>{order.restaurant?.name}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Adresse de livraison</Text>
          <Text style={styles.detailValue}>
            {order.delivery_address?.street}, {order.delivery_address?.city}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total</Text>
          <Text style={[styles.detailValue, styles.totalValue]}>
            {order.total_amount?.toLocaleString('fr-FR')} FCFA
          </Text>
        </View>
      </View>

      {/* Items */}
      <View style={styles.itemsContainer}>
        <Text style={styles.sectionTitle}>Articles</Text>
        {order.items?.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.menu_item?.name}</Text>
            <Text style={styles.itemQuantity}>x{item.quantity}</Text>
            <Text style={styles.itemPrice}>
              {(item.price * item.quantity).toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  timelineContainer: {
    backgroundColor: COLORS.white,
    padding: 24,
    marginBottom: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineContent: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timelineDotCurrent: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timelineLine: {
    width: 2,
    height: 40,
    backgroundColor: COLORS.border,
    marginTop: 4,
  },
  timelineLineCompleted: {
    backgroundColor: COLORS.primary,
  },
  timelineLabel: {
    flex: 1,
    justifyContent: 'center',
  },
  timelineLabelText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  timelineLabelTextCompleted: {
    color: COLORS.text,
    fontWeight: '600',
  },
  detailsContainer: {
    backgroundColor: COLORS.white,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  itemsContainer: {
    backgroundColor: COLORS.white,
    padding: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  itemQuantity: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginHorizontal: 12,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
});

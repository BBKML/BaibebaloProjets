import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Vibration,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useDeliveryStore from '../../store/deliveryStore';
import { acceptOrder, declineOrder } from '../../api/orders';
import soundService from '../../services/soundService';

export default function NewDeliveryAlertScreen({ navigation, route }) {
  const { clearPendingAlert, setCurrentDelivery } = useDeliveryStore();
  const proposal = route.params?.proposal || route.params?.delivery;
  const initialSeconds = proposal?.expires_in_seconds != null
    ? Math.max(1, Math.floor(Number(proposal.expires_in_seconds)))
    : 120;
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const respondedRef = useRef(false);

  const orderId = proposal?.order_id || proposal?.id;
  const restaurantName = proposal?.restaurant_name || proposal?.restaurant?.name || 'Restaurant';
  const restaurantAddress = proposal?.restaurant_address || proposal?.restaurant?.address || '';
  const deliveryFee = Number(proposal?.delivery_fee ?? proposal?.total ?? proposal?.earnings ?? 0);
  const customerArea = proposal?.customer_area || proposal?.customer?.area || proposal?.delivery_address?.address_line || 'Livraison';
  const landmark = proposal?.landmark || proposal?.customer?.landmark || '';
  const totalDistance = proposal?.total_distance_km ?? proposal?.customer?.totalDistance ?? 0;
  const estimatedTime = proposal?.estimated_time_minutes ?? proposal?.estimatedTime ?? 25;

  const handleDecline = useCallback(async () => {
    if (respondedRef.current) return;
    respondedRef.current = true;
    setDeclining(true);
    clearPendingAlert();
    try {
      if (orderId) await declineOrder(orderId, 'Refus proposition');
      navigation.goBack();
    } catch (e) {
      respondedRef.current = false;
      setDeclining(false);
      Alert.alert('Erreur', e?.response?.data?.error?.message || 'Impossible de refuser.');
    }
  }, [orderId, clearPendingAlert, navigation]);

  const handleAccept = useCallback(async () => {
    if (respondedRef.current || !orderId) return;
    respondedRef.current = true;
    setAccepting(true);
    clearPendingAlert();
    try {
      await acceptOrder(orderId);
      setCurrentDelivery({ id: orderId, order_id: orderId, earnings: deliveryFee, restaurant: { name: restaurantName, address: restaurantAddress }, customer: { area: customerArea, landmark }, estimatedTime });
      navigation.replace('NavigationToRestaurant', { orderId });
    } catch (e) {
      respondedRef.current = false;
      setAccepting(false);
      Alert.alert('Erreur', e?.response?.data?.error?.message || 'Impossible d\'accepter la course.');
    }
  }, [orderId, deliveryFee, restaurantName, restaurantAddress, customerArea, landmark, estimatedTime, clearPendingAlert, setCurrentDelivery, navigation]);

  useEffect(() => {
    // Démarrer l'alerte sonore en boucle (son + vibration)
    soundService.startLoopingAlert();

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      soundService.stopLoopingAlert();
    };
  }, [handleDecline]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="notifications" size={28} color="#FFFFFF" />
          <Text style={styles.headerTitle}>NOUVELLE COURSE DISPONIBLE</Text>
        </View>

        {/* Delivery Info Card */}
        <View style={styles.infoCard}>
          {/* Pickup */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="restaurant" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.sectionLabel}>Récupération</Text>
            </View>
            <Text style={styles.sectionTitle}>{restaurantName}</Text>
            {restaurantAddress ? <Text style={styles.sectionSubtitle}>{restaurantAddress}</Text> : null}
            {totalDistance > 0 ? (
              <Text style={styles.sectionDistance}>Distance totale: {Number(totalDistance).toFixed(1)} km</Text>
            ) : null}
          </View>

          <View style={styles.divider} />

          {/* Delivery */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, styles.sectionIconDelivery]}>
                <Ionicons name="location" size={20} color={COLORS.error} />
              </View>
              <Text style={styles.sectionLabel}>Livraison</Text>
            </View>
            <Text style={styles.sectionTitle}>{customerArea}</Text>
            {landmark ? <Text style={styles.sectionSubtitle}>{landmark}</Text> : null}
            {totalDistance > 0 ? (
              <Text style={styles.sectionDistance}>Distance totale: {Number(totalDistance).toFixed(1)} km</Text>
            ) : null}
          </View>

          <View style={styles.divider} />

          {/* Earnings & Time */}
          <View style={styles.earningsRow}>
            <View style={styles.earningItem}>
              <Ionicons name="cash" size={24} color={COLORS.success} />
              <Text style={styles.earningValue}>{deliveryFee.toLocaleString()} FCFA</Text>
              <Text style={styles.earningLabel}>Rémunération</Text>
            </View>
            <View style={styles.earningItem}>
              <Ionicons name="time" size={24} color={COLORS.info} />
              <Text style={styles.earningValue}>{estimatedTime} min</Text>
              <Text style={styles.earningLabel}>Temps estimé</Text>
            </View>
          </View>
        </View>

        {/* Timer */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Répondre dans:</Text>
          <Text style={styles.timerValue}>00:{timeLeft.toString().padStart(2, '0')}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.acceptButton, (accepting || declining) && styles.buttonDisabled]}
            onPress={handleAccept}
            disabled={accepting || declining}
          >
            {accepting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="checkmark" size={24} color="#FFFFFF" />}
            <Text style={styles.acceptButtonText}>{accepting ? 'Acceptation…' : 'ACCEPTER'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.declineButton, (accepting || declining) && styles.buttonDisabled]}
            onPress={handleDecline}
            disabled={accepting || declining}
          >
            {declining ? <ActivityIndicator size="small" color={COLORS.error} /> : <Ionicons name="close" size={24} color={COLORS.error} />}
            <Text style={styles.declineButtonText}>{declining ? '…' : 'REFUSER'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  section: {
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconDelivery: {
    backgroundColor: COLORS.error + '15',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  sectionDistance: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  earningsRow: {
    flexDirection: 'row',
    paddingTop: 16,
  },
  earningItem: {
    flex: 1,
    alignItems: 'center',
  },
  earningValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
  },
  earningLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.success,
    paddingVertical: 18,
    borderRadius: 16,
  },
  acceptButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    paddingVertical: 18,
    borderRadius: 16,
  },
  declineButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.error,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

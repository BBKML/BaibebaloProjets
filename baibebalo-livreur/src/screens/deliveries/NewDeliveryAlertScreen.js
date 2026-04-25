import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
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

  const isUrgent = timeLeft <= 10;
  const isWarning = timeLeft <= 30 && timeLeft > 10;

  const timerColor = isUrgent ? COLORS.error : isWarning ? '#F59E0B' : COLORS.success;

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
      setCurrentDelivery({
        id: orderId,
        order_id: orderId,
        earnings: deliveryFee,
        restaurant: { name: restaurantName, address: restaurantAddress },
        customer: { area: customerArea, landmark },
        estimatedTime,
      });
      navigation.replace('NavigationToRestaurant', { orderId });
    } catch (e) {
      respondedRef.current = false;
      setAccepting(false);
      Alert.alert('Erreur', e?.response?.data?.error?.message || 'Impossible d\'accepter la course.');
    }
  }, [orderId, deliveryFee, restaurantName, restaurantAddress, customerArea, landmark, estimatedTime, clearPendingAlert, setCurrentDelivery, navigation]);

  useEffect(() => {
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

  const formatTimer = (s) => {
    if (s >= 60) return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
    return `00:${s.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconBg}>
          <Ionicons name="bicycle" size={22} color={COLORS.white} />
        </View>
        <Text style={styles.headerTitle}>NOUVELLE COURSE !</Text>
      </View>

      {/* Route Card */}
      <View style={styles.routeCard}>
        {/* Pickup */}
        <View style={styles.routeRow}>
          <View style={styles.routeLeft}>
            <View style={[styles.routeDot, { backgroundColor: COLORS.primary }]} />
            <View style={styles.routeLine} />
          </View>
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>RÉCUPÉRATION</Text>
            <Text style={styles.routeName}>{restaurantName}</Text>
            {restaurantAddress ? <Text style={styles.routeAddress}>{restaurantAddress}</Text> : null}
          </View>
        </View>

        {/* Delivery */}
        <View style={[styles.routeRow, { marginTop: 4 }]}>
          <View style={styles.routeLeft}>
            <View style={[styles.routeDot, { backgroundColor: COLORS.error }]} />
          </View>
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>LIVRAISON</Text>
            <Text style={styles.routeName}>{customerArea}</Text>
            {landmark ? <Text style={styles.routeAddress}>{landmark}</Text> : null}
          </View>
        </View>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{deliveryFee.toLocaleString()}</Text>
          <Text style={styles.metricUnit}>FCFA</Text>
          <Text style={styles.metricLabel}>Rémunération</Text>
        </View>

        {totalDistance > 0 && (
          <View style={[styles.metricCard, styles.metricCardAlt]}>
            <Text style={styles.metricValue}>{Number(totalDistance).toFixed(1)}</Text>
            <Text style={styles.metricUnit}>km</Text>
            <Text style={styles.metricLabel}>Distance</Text>
          </View>
        )}

        <View style={[styles.metricCard, styles.metricCardAlt]}>
          <Text style={styles.metricValue}>{estimatedTime}</Text>
          <Text style={styles.metricUnit}>min</Text>
          <Text style={styles.metricLabel}>Durée estimée</Text>
        </View>
      </View>

      {/* Timer */}
      <View style={styles.timerSection}>
        <View style={[styles.timerRing, { borderColor: timerColor }]}>
          <Text style={[styles.timerValue, { color: timerColor }]}>{formatTimer(timeLeft)}</Text>
          <Text style={styles.timerSubtext}>
            {isUrgent ? '⚠️ Dernières secondes !' : isWarning ? 'Dépêchez-vous !' : 'secondes restantes'}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {/* Decline — petit lien discret */}
        <TouchableOpacity
          onPress={handleDecline}
          disabled={accepting || declining}
          style={styles.declineLink}
          activeOpacity={0.6}
        >
          {declining
            ? <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
            : <Text style={styles.declineLinkText}>Refuser cette course</Text>
          }
        </TouchableOpacity>

        {/* Accept — pleine largeur, gros bouton vert */}
        <TouchableOpacity
          style={[styles.acceptButton, (accepting || declining) && styles.buttonDisabled]}
          onPress={handleAccept}
          disabled={accepting || declining}
          activeOpacity={0.85}
        >
          {accepting ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={28} color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>ACCEPTER LA COURSE</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  headerIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 20,
    marginBottom: 16,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 56,
  },
  routeLeft: {
    alignItems: 'center',
    width: 20,
    marginRight: 14,
    paddingTop: 4,
  },
  routeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  routeLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
    marginBottom: -4,
    minHeight: 20,
  },
  routeInfo: {
    flex: 1,
    paddingBottom: 8,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 3,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  metricsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.success,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  metricCardAlt: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  timerSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  timerRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  timerValue: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: 1,
  },
  timerSubtext: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
    textAlign: 'center',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  declineLink: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  declineLinkText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    textDecorationLine: 'underline',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: COLORS.success,
    paddingVertical: 20,
    borderRadius: 18,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  acceptButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

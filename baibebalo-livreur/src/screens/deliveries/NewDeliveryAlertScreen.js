import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Vibration
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useDeliveryStore from '../../store/deliveryStore';

export default function NewDeliveryAlertScreen({ navigation, route }) {
  const { clearPendingAlert, setCurrentDelivery } = useDeliveryStore();
  const [timeLeft, setTimeLeft] = useState(30);

  // Mock delivery data
  const delivery = route.params?.delivery || {
    id: 'BAIB-12345',
    restaurant: {
      name: 'Restaurant Chez Marie',
      address: 'Rue des Écoles, Centre-ville',
      distance: 1.2,
    },
    customer: {
      area: 'Quartier Tchengué',
      landmark: 'Près de l\'école primaire',
      totalDistance: 3.5,
    },
    earnings: 1750,
    estimatedTime: 25,
  };

  useEffect(() => {
    // Vibrate on mount
    Vibration.vibrate([0, 500, 200, 500]);

    // Countdown timer
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
      Vibration.cancel();
    };
  }, []);

  const handleAccept = () => {
    setCurrentDelivery(delivery);
    clearPendingAlert();
    navigation.replace('NavigationToRestaurant', { delivery });
  };

  const handleDecline = () => {
    clearPendingAlert();
    navigation.goBack();
  };

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
            <Text style={styles.sectionTitle}>{delivery.restaurant.name}</Text>
            <Text style={styles.sectionSubtitle}>{delivery.restaurant.address}</Text>
            <Text style={styles.sectionDistance}>
              Distance: {delivery.restaurant.distance} km
            </Text>
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
            <Text style={styles.sectionTitle}>{delivery.customer.area}</Text>
            <Text style={styles.sectionSubtitle}>{delivery.customer.landmark}</Text>
            <Text style={styles.sectionDistance}>
              Distance totale: {delivery.customer.totalDistance} km
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Earnings & Time */}
          <View style={styles.earningsRow}>
            <View style={styles.earningItem}>
              <Ionicons name="cash" size={24} color={COLORS.success} />
              <Text style={styles.earningValue}>{delivery.earnings.toLocaleString()} FCFA</Text>
              <Text style={styles.earningLabel}>Rémunération</Text>
            </View>
            <View style={styles.earningItem}>
              <Ionicons name="time" size={24} color={COLORS.info} />
              <Text style={styles.earningValue}>{delivery.estimatedTime} min</Text>
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
          <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
            <Ionicons name="checkmark" size={24} color="#FFFFFF" />
            <Text style={styles.acceptButtonText}>ACCEPTER</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
            <Ionicons name="close" size={24} color={COLORS.error} />
            <Text style={styles.declineButtonText}>REFUSER</Text>
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
});

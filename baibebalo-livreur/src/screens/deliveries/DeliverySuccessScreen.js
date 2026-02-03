import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useDeliveryStore from '../../store/deliveryStore';

export default function DeliverySuccessScreen({ navigation, route }) {
  const { clearCurrentDelivery, incrementDeliveries, addEarnings } = useDeliveryStore();
  
  const earnings = route.params?.earnings || 1750;
  const rating = route.params?.rating || 5;

  const handleDone = () => {
    clearCurrentDelivery();
    incrementDeliveries();
    addEarnings(earnings);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  const handleViewEarnings = () => {
    clearCurrentDelivery();
    incrementDeliveries();
    addEarnings(earnings);
    navigation.reset({
      index: 0,
      routes: [
        { name: 'Main' },
        { name: 'EarningsDashboard' },
      ],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconBackground}>
            <Ionicons name="checkmark-circle" size={80} color="#FFFFFF" />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Livraison effectuée!</Text>
        
        {/* Earnings */}
        <View style={styles.earningsCard}>
          <Ionicons name="add" size={24} color={COLORS.success} />
          <Text style={styles.earningsAmount}>{earnings.toLocaleString()} FCFA</Text>
          <Text style={styles.earningsLabel}>ajouté à vos gains</Text>
        </View>

        {/* Rating */}
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingLabel}>Note du client:</Text>
          <View style={styles.ratingStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons 
                key={star}
                name="star" 
                size={28} 
                color={star <= rating ? COLORS.rating : 'rgba(255, 255, 255, 0.3)'} 
              />
            ))}
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={handleDone}
        >
          <Text style={styles.primaryButtonText}>RETOUR À L'ACCUEIL</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={handleViewEarnings}
        >
          <Text style={styles.secondaryButtonText}>VOIR MES GAINS</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 32,
  },
  earningsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 32,
  },
  earningsAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  earningsLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  ratingContainer: {
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 4,
  },
  actionsContainer: {
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
});

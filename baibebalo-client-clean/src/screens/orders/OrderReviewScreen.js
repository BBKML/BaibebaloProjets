import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { reviewOrder } from '../../api/orders';

export default function OrderReviewScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [restaurantComment, setRestaurantComment] = useState('');
  const [deliveryComment, setDeliveryComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (restaurantRating === 0) {
      Alert.alert('Erreur', 'Veuillez noter le restaurant');
      return;
    }

    setLoading(true);
    try {
      await reviewOrder(orderId, {
        restaurant_rating: restaurantRating,
        delivery_rating: deliveryRating || restaurantRating,
        restaurant_comment: restaurantComment,
        delivery_comment: deliveryComment,
      });

      Alert.alert(
        'Merci !',
        'Votre avis a été enregistré',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Erreur',
        error.response?.data?.error?.message || 'Erreur lors de l\'enregistrement de l\'avis'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating, onRatingChange) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onRatingChange(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={32}
              color={star <= rating ? COLORS.primary : COLORS.border}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Votre avis nous intéresse</Text>
        </View>

        {/* Restaurant Rating */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="restaurant" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Notez le Restaurant</Text>
          </View>
          {renderStars(restaurantRating, setRestaurantRating)}
          <TextInput
            style={styles.commentInput}
            placeholder="Partagez votre expérience avec le restaurant..."
            placeholderTextColor={COLORS.textLight}
            value={restaurantComment}
            onChangeText={setRestaurantComment}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Delivery Rating */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="bicycle" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Notez la Livraison</Text>
          </View>
          {renderStars(deliveryRating, setDeliveryRating)}
          <TextInput
            style={styles.commentInput}
            placeholder="Comment était la livraison ?"
            placeholderTextColor={COLORS.textLight}
            value={deliveryComment}
            onChangeText={setDeliveryComment}
            multiline
            numberOfLines={4}
          />
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Envoi...' : 'Envoyer mon avis'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  starButton: {
    padding: 4,
  },
  commentInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  footer: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

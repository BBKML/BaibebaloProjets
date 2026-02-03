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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { reviewOrder } from '../../api/orders';

export default function OrderReviewScreen({ route, navigation }) {
  const { orderId, existingReview, isEdit } = route.params || {};
  const insets = useSafeAreaInsets();
  const [restaurantRating, setRestaurantRating] = useState(existingReview?.restaurant_rating || 0);
  const [deliveryRating, setDeliveryRating] = useState(existingReview?.delivery_rating || 0);
  const [restaurantComment, setRestaurantComment] = useState(existingReview?.restaurant_comment || '');
  const [deliveryComment, setDeliveryComment] = useState(existingReview?.delivery_comment || '');
  const [selectedTags, setSelectedTags] = useState(existingReview?.tags || []);
  const [tipAmount, setTipAmount] = useState(existingReview?.tip_amount || null);
  const [experienceComment, setExperienceComment] = useState(existingReview?.experience_comment || '');
  const [loading, setLoading] = useState(false);

  const restaurantTags = ['Délicieux', 'Bien chaud', 'Copieux', 'Bien emballé'];
  const tipOptions = [500, 1000];

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
        tags: selectedTags,
        tip_amount: tipAmount,
        experience_comment: experienceComment,
      });

      Alert.alert(
        'Merci !',
        isEdit ? 'Votre avis a été modifié' : 'Votre avis a été enregistré',
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
              size={34}
              color={star <= rating ? COLORS.primary : COLORS.border}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.overlay} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.sheetHeader}>
          <View style={styles.headerSpacer} />
          <Text style={styles.title}>
            {isEdit ? 'Modifier votre avis' : 'Votre avis nous intéresse'}
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* Restaurant Rating */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="restaurant" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Notez le Restaurant</Text>
          </View>
          {renderStars(restaurantRating, setRestaurantRating)}
          <View style={styles.tagsRow}>
            {restaurantTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
          <View style={styles.tipRow}>
            <Text style={styles.tipLabel}>Ajouter un pourboire</Text>
            <View style={styles.tipButtons}>
              {tipOptions.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.tipButton,
                    tipAmount === amount && styles.tipButtonSelected,
                  ]}
                  onPress={() => setTipAmount(amount)}
                >
                  <Text
                    style={[
                      styles.tipButtonText,
                      tipAmount === amount && styles.tipButtonTextSelected,
                    ]}
                  >
                    {amount.toLocaleString('fr-FR')} FCFA
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.tipButton,
                  tipAmount === 0 && styles.tipButtonSelected,
                ]}
                onPress={() => setTipAmount(0)}
              >
                <Text
                  style={[
                    styles.tipButtonText,
                    tipAmount === 0 && styles.tipButtonTextSelected,
                  ]}
                >
                  Autre
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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

        <View style={styles.section}>
          <Text style={styles.feedbackLabel}>Votre expérience (optionnel)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Qu'est-ce qui vous a plu dans cette commande ?"
            placeholderTextColor={COLORS.textLight}
            value={experienceComment}
            onChangeText={setExperienceComment}
            multiline
            numberOfLines={4}
          />
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Envoi...' : (isEdit ? 'Modifier mon avis' : 'Envoyer mon avis')}
          </Text>
          <Ionicons name="send" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerSpacer: {
    width: 40,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    paddingBottom: 140, // Espace pour le footer + safe area
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    flex: 1,
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
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tagTextSelected: {
    color: COLORS.white,
  },
  tipRow: {
    marginTop: 8,
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  tipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  tipButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  tipButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  tipButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  tipButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tipButtonTextSelected: {
    color: COLORS.primary,
  },
  feedbackLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    paddingLeft: 4,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
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

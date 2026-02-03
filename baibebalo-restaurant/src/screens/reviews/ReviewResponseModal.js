import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { restaurantReviews } from '../../api/reviews';

const RESPONSE_TEMPLATES = [
  'Merci pour votre avis !',
  'Nous sommes ravis que vous ayez apprécié !',
  'Merci pour votre retour, nous en tenons compte.',
  'Nous sommes désolés pour cette expérience. Nous allons améliorer.',
];

export default function ReviewResponseModal({ navigation, route }) {
  const { reviewId, review } = route.params || {};
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const insets = useSafeAreaInsets();

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setResponse(template);
  };

  const handleSubmit = async () => {
    if (!response.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une réponse');
      return;
    }

    setLoading(true);
    try {
      const responseData = await restaurantReviews.respondToReview(reviewId, response.trim());
      // Le backend retourne { success: true, data: { review: {...} } }
      if (responseData.success !== false) {
        Alert.alert('Succès', 'Réponse publiée', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      const errorMessage = error.error?.message || error.message || 'Impossible de publier la réponse';
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      onRequestClose={() => navigation.goBack()}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { paddingBottom: insets.bottom }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Répondre à l'avis</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
            {/* Avis original */}
            {review && (
              <View style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewHeaderLeft}>
                    <View style={styles.ratingStars}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Ionicons
                          key={i}
                          name={i < review.rating ? 'star' : 'star-outline'}
                          size={16}
                          color={i < review.rating ? COLORS.warning : COLORS.border}
                        />
                      ))}
                    </View>
                    <Text style={styles.reviewCustomerName}>{review.customerName}</Text>
                  </View>
                  <Text style={styles.reviewDate}>{review.date}</Text>
                </View>
                {review.comment && (
                  <Text style={styles.reviewComment}>"{review.comment}"</Text>
                )}
              </View>
            )}

            {/* Modèles de réponse */}
            <View style={styles.section}>
              <Text style={styles.label}>Modèles de réponse</Text>
              <View style={styles.templatesContainer}>
                {RESPONSE_TEMPLATES.map((template, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.templateButton,
                      selectedTemplate === template && styles.templateButtonSelected,
                    ]}
                    onPress={() => handleTemplateSelect(template)}
                  >
                    <Text
                      style={[
                        styles.templateText,
                        selectedTemplate === template && styles.templateTextSelected,
                      ]}
                    >
                      {template}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Zone de réponse */}
            <View style={styles.section}>
              <Text style={styles.label}>Votre réponse *</Text>
              <TextInput
                style={styles.responseInput}
                placeholder="Écrivez votre réponse..."
                value={response}
                onChangeText={setResponse}
                multiline
                numberOfLines={6}
                maxLength={500}
                placeholderTextColor={COLORS.textLight}
              />
              <Text style={styles.charCount}>{response.length}/500</Text>
            </View>

            {/* Conseils */}
            <View style={styles.tipCard}>
              <Ionicons name="bulb-outline" size={20} color={COLORS.warning} />
              <Text style={styles.tipText}>
                Conseils : Répondez de manière professionnelle et courtoise. Les réponses publiques montrent votre engagement envers vos clients.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelButton, loading && styles.buttonDisabled]}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, (!response.trim() || loading) && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={!response.trim() || loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Publication...' : 'Publier la réponse'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  reviewCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewCustomerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  reviewComment: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  templatesContainer: {
    gap: 8,
  },
  templateButton: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  templateButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  templateText: {
    fontSize: 14,
    color: COLORS.text,
  },
  templateTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  responseInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.warning + '15',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  submitButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

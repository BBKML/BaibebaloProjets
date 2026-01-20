import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function ReportProblemScreen({ navigation, route }) {
  const { orderId } = route.params || {};
  const [problemType, setProblemType] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const problemTypes = [
    {
      id: 'order_issue',
      label: 'Problème avec la commande',
      icon: 'receipt-outline',
    },
    {
      id: 'delivery_issue',
      label: 'Problème de livraison',
      icon: 'bicycle-outline',
    },
    {
      id: 'payment_issue',
      label: 'Problème de paiement',
      icon: 'card-outline',
    },
    {
      id: 'food_quality',
      label: 'Qualité de la nourriture',
      icon: 'restaurant-outline',
    },
    {
      id: 'other',
      label: 'Autre',
      icon: 'help-circle-outline',
    },
  ];

  const handleSubmit = async () => {
    if (!problemType) {
      Alert.alert('Erreur', 'Veuillez sélectionner un type de problème');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Erreur', 'Veuillez décrire le problème');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implémenter l'appel API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      navigation.navigate('SupportFeedbackSuccess');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer le signalement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Signaler un problème</Text>
        <Text style={styles.headerSubtitle}>
          Décrivez le problème que vous avez rencontré
        </Text>
      </View>

      {/* Type de problème */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Type de problème</Text>
        {problemTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.problemTypeCard,
              problemType === type.id && styles.problemTypeCardSelected,
            ]}
            onPress={() => setProblemType(type.id)}
          >
            <Ionicons
              name={type.icon}
              size={24}
              color={problemType === type.id ? COLORS.primary : COLORS.text}
            />
            <Text
              style={[
                styles.problemTypeText,
                problemType === type.id && styles.problemTypeTextSelected,
              ]}
            >
              {type.label}
            </Text>
            {problemType === type.id && (
              <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description du problème</Text>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Décrivez en détail le problème rencontré..."
          placeholderTextColor={COLORS.textLight}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
          maxLength={1000}
        />
        <Text style={styles.characterCount}>
          {description.length}/1000 caractères
        </Text>
      </View>

      {/* Informations de commande */}
      {orderId && (
        <View style={styles.section}>
          <View style={styles.orderInfoCard}>
            <Ionicons name="receipt" size={24} color={COLORS.primary} />
            <View style={styles.orderInfoContent}>
              <Text style={styles.orderInfoLabel}>Commande concernée</Text>
              <Text style={styles.orderInfoValue}>#{orderId}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Bouton de soumission */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Envoi en cours...' : 'Envoyer le signalement'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 24,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  section: {
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  problemTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 12,
  },
  problemTypeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  problemTypeText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  problemTypeTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  descriptionInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  orderInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  orderInfoContent: {
    flex: 1,
  },
  orderInfoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  orderInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  footer: {
    padding: 16,
    marginBottom: 32,
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
    fontWeight: '700',
  },
});

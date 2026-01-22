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
import { reportOrderIssue } from '../../api/orders';

export default function ReportProblemScreen({ navigation, route }) {
  const { orderId } = route.params || {};
  const [problemType, setProblemType] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(orderId || '84920');

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

  const mapProblemTypeToCategory = (typeId) => {
    switch (typeId) {
      case 'order_issue':
        return 'wrong_items';
      case 'delivery_issue':
        return 'late_delivery';
      case 'payment_issue':
        return 'other';
      case 'food_quality':
        return 'quality_issue';
      default:
        return 'other';
    }
  };

  const handleSubmit = async () => {
    if (!problemType) {
      Alert.alert('Erreur', 'Veuillez sélectionner un type de problème');
      return;
    }

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      Alert.alert('Erreur', 'Veuillez décrire le problème');
      return;
    }

    if (trimmedDescription.length < 10) {
      Alert.alert(
        'Description trop courte',
        'Merci de fournir au moins 10 caractères.'
      );
      return;
    }

    setLoading(true);
    try {
      const targetOrderId = orderId || selectedOrder;
      if (!targetOrderId) {
        Alert.alert('Erreur', 'Veuillez sélectionner une commande');
        return;
      }
      await reportOrderIssue(targetOrderId, {
        issue_type: mapProblemTypeToCategory(problemType),
        description: trimmedDescription,
      });

      navigation.navigate('SupportFeedbackSuccess');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer le signalement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Signaler un problème</Text>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Quel est le problème ?</Text>
          </View>
          <View style={styles.selectCard}>
            {problemTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.problemTypeRow,
                  problemType === type.id && styles.problemTypeRowActive,
                ]}
                onPress={() => setProblemType(type.id)}
              >
                <Ionicons
                  name={type.icon}
                  size={18}
                  color={problemType === type.id ? COLORS.primary : COLORS.textSecondary}
                />
                <Text style={styles.problemTypeText}>{type.label}</Text>
                {problemType === type.id && (
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Associer à une commande</Text>
          </View>
          {[
            { id: '84920', total: '15.500 FCFA', date: '12 Oct 2023' },
            { id: '84815', total: '8.200 FCFA', date: '10 Oct 2023' },
          ].map((order) => {
            const isSelected = selectedOrder === order.id;
            return (
              <TouchableOpacity
                key={order.id}
                style={[styles.orderCard, isSelected && styles.orderCardActive]}
                onPress={() => setSelectedOrder(order.id)}
              >
                <View style={[styles.orderIcon, isSelected && styles.orderIconActive]}>
                  <Ionicons name="bag" size={18} color={COLORS.primary} />
                </View>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderTitle}>Commande #{order.id}</Text>
                  <Text style={styles.orderSubtitle}>{order.date} • {order.total}</Text>
                </View>
                <View style={[styles.orderCheck, isSelected && styles.orderCheckActive]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Dites-nous en plus</Text>
          </View>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Décrivez ce qui s'est passé avec le plus de détails possible..."
            placeholderTextColor={COLORS.textLight}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={1000}
          />
          <Text style={styles.helperText}>Min. 10 caractères</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeader}>
              <Ionicons name="camera" size={18} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Photos (max. 3)</Text>
            </View>
            <Text style={styles.photoCount}>1/3</Text>
          </View>
          <View style={styles.photoRow}>
            <View style={styles.photoPreview}>
              <TouchableOpacity style={styles.photoDelete}>
                <Ionicons name="trash" size={12} color={COLORS.error} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.photoAdd}>
              <Ionicons name="add" size={20} color={COLORS.primary} />
              <Text style={styles.photoAddText}>Ajouter</Text>
            </TouchableOpacity>
            <View style={styles.photoPlaceholder}>
              <Ionicons name="image" size={20} color={COLORS.textLight} />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Envoi en cours...' : 'Envoyer la réclamation'}
          </Text>
          <Ionicons name="send" size={16} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.footerHint}>Notre équipe vous répondra sous 24h</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 140,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  selectCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 8,
    gap: 4,
  },
  problemTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  problemTypeRowActive: {
    backgroundColor: COLORS.primary + '10',
  },
  problemTypeText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  orderCardActive: {
    borderColor: COLORS.primary,
  },
  orderIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderIconActive: {
    backgroundColor: COLORS.primary + '10',
  },
  orderInfo: {
    flex: 1,
    marginLeft: 10,
  },
  orderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  orderSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  orderCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderCheckActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
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
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  photoCount: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoPreview: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    position: 'relative',
  },
  photoDelete: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photoAdd: {
    width: 90,
    height: 90,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.primary + '50',
    backgroundColor: COLORS.primary + '08',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoAddText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  photoPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 14,
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
    fontSize: 14,
    fontWeight: '700',
  },
  footerHint: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

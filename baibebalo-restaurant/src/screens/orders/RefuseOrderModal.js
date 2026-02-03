import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { restaurantOrders } from '../../api/orders';
import useRestaurantStore from '../../store/restaurantStore';

const REFUSAL_REASONS = [
  { id: 'out_of_stock', label: 'Article épuisé', type: 'out_of_stock' },
  { id: 'closed', label: 'Fermeture exceptionnelle', type: 'closing_soon' },
  { id: 'too_many_orders', label: 'Trop de commandes en cours', type: 'too_busy' },
  { id: 'technical_issue', label: 'Problème technique', type: 'other' },
  { id: 'other', label: 'Autre (préciser)', type: 'other' },
];

export default function RefuseOrderModal({ navigation, route }) {
  const { orderId } = route.params;
  const [selectedReason, setSelectedReason] = useState(null);
  const [otherReason, setOtherReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateOrder } = useRestaurantStore();
  const insets = useSafeAreaInsets();

  const handleRefuse = async () => {
    if (!selectedReason) {
      Alert.alert('Erreur', 'Veuillez sélectionner un motif de refus');
      return;
    }

    if (selectedReason === 'other' && !otherReason.trim()) {
      Alert.alert('Erreur', 'Veuillez préciser le motif de refus');
      return;
    }

    setLoading(true);
    try {
      const reasonObj = REFUSAL_REASONS.find(r => r.id === selectedReason);
      const reason = selectedReason === 'other' ? otherReason : reasonObj?.label;
      const rejectionType = reasonObj?.type || 'other';
      
      await restaurantOrders.refuseOrder(orderId, reason, rejectionType);
      updateOrder(orderId, { status: 'rejected' });
      
      Alert.alert('Succès', 'Commande refusée', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de refuser la commande');
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
            <Text style={styles.title}>Refuser la commande</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.description}>
              Veuillez sélectionner un motif de refus :
            </Text>

            <View style={styles.reasonsList}>
              {REFUSAL_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    styles.reasonItem,
                    selectedReason === reason.id && styles.reasonItemSelected,
                  ]}
                  onPress={() => setSelectedReason(reason.id)}
                >
                  <View style={styles.radioContainer}>
                    <View
                      style={[
                        styles.radio,
                        selectedReason === reason.id && styles.radioSelected,
                      ]}
                    >
                      {selectedReason === reason.id && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.reasonText,
                        selectedReason === reason.id && styles.reasonTextSelected,
                      ]}
                    >
                      {reason.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {selectedReason === 'other' && (
              <View style={styles.otherReasonContainer}>
                <Text style={styles.otherReasonLabel}>Précisez le motif :</Text>
                <TextInput
                  style={styles.otherReasonInput}
                  placeholder="Entrez le motif de refus..."
                  value={otherReason}
                  onChangeText={setOtherReason}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={COLORS.textLight}
                />
              </View>
            )}

            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color={COLORS.warning} />
              <Text style={styles.warningText}>
                Le refus fréquent de commandes peut affecter votre visibilité sur la plateforme.
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
              style={[
                styles.confirmButton,
                (!selectedReason || loading) && styles.buttonDisabled,
              ]}
              onPress={handleRefuse}
              disabled={!selectedReason || loading}
            >
              <Text style={styles.confirmButtonText}>
                {loading ? 'Traitement...' : 'Confirmer le refus'}
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
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  reasonsList: {
    gap: 12,
    marginBottom: 20,
  },
  reasonItem: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  reasonItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  reasonText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  reasonTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  otherReasonContainer: {
    marginTop: 12,
    marginBottom: 20,
  },
  otherReasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  otherReasonInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.warning + '15',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
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
  confirmButton: {
    flex: 1,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../../constants/colors';
import { restaurantPromotions } from '../../api/promotions';
import useRestaurantStore from '../../store/restaurantStore';

const PROMOTION_TYPES = [
  { id: 'total_discount', label: 'Réduction sur le total', icon: 'receipt' },
  { id: 'item_discount', label: 'Réduction sur un plat', icon: 'restaurant' },
  { id: 'bundle', label: 'Offre groupée', icon: 'cube' },
  { id: 'free_delivery', label: 'Livraison gratuite', icon: 'car' },
  { id: 'new_customer', label: 'Nouveau client', icon: 'person-add' },
];

export default function CreateAdvancedPromotionScreen({ navigation }) {
  const { menu } = useRestaurantStore();
  const [formData, setFormData] = useState({
    type: 'total_discount',
    selectedItem: null,
    discount: '',
    discountType: 'percentage', // percentage or fixed
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    minOrderAmount: null,
    maxUses: null,
    perCustomerLimit: null,
    newCustomersOnly: false,
    loyalCustomersOnly: false,
    showBadge: true,
    notifySubscribers: true,
    paidVisibility: false,
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const validate = () => {
    if (!formData.discount || parseFloat(formData.discount) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer une réduction valide');
      return false;
    }
    if (formData.discountType === 'percentage' && parseFloat(formData.discount) > 100) {
      Alert.alert('Erreur', 'La réduction ne peut pas dépasser 100%');
      return false;
    }
    if (formData.type === 'item_discount' && !formData.selectedItem) {
      Alert.alert('Erreur', 'Veuillez sélectionner un plat');
      return false;
    }
    if (formData.endDate <= formData.startDate) {
      Alert.alert('Erreur', 'La date de fin doit être après la date de début');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      // Mapper les types de promotion vers le format backend
      const typeMapping = {
        'total_discount': 'percentage',
        'item_discount': 'percentage', // ou 'fixed_amount' selon le discountType
        'bundle': 'bundle',
        'free_delivery': 'free_delivery',
        'new_customer': 'percentage',
      };
      
      const backendType = typeMapping[formData.type] || 'percentage';
      const promotionValue = formData.discountType === 'percentage' 
        ? parseFloat(formData.discount) 
        : parseFloat(formData.discount);
      
      const promotionData = {
        type: backendType,
        value: promotionValue,
        menu_item_id: formData.type === 'item_discount' && formData.selectedItem?.id ? formData.selectedItem.id : undefined,
        valid_from: formData.startDate.toISOString(),
        valid_until: formData.endDate.toISOString(),
        min_order_amount: formData.minOrderAmount || undefined,
        usage_limit: formData.maxUses || undefined,
        code: formData.code || undefined,
      };
      
      const response = await restaurantPromotions.createPromotion(promotionData);
      // Le backend retourne { success: true, data: { promotion: {...} } }
      if (response.success !== false) {
        Alert.alert('Succès', 'Promotion créée avec succès', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      const errorMessage = error.error?.message || error.message || 'Impossible de créer la promotion';
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Créer une promotion</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type de promotion */}
        <View style={styles.section}>
          <Text style={styles.label}>Type de promotion *</Text>
          <View style={styles.typesContainer}>
            {PROMOTION_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  formData.type === type.id && styles.typeCardSelected,
                ]}
                onPress={() => setFormData({ ...formData, type: type.id })}
              >
                <Ionicons
                  name={type.icon}
                  size={24}
                  color={formData.type === type.id ? COLORS.primary : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.typeLabel,
                    formData.type === type.id && styles.typeLabelSelected,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sélection du plat (si type item_discount) */}
        {formData.type === 'item_discount' && (
          <View style={styles.section}>
            <Text style={styles.label}>Plat sélectionné *</Text>
            <TouchableOpacity
              style={styles.itemSelector}
              onPress={() => {
                // TODO: Ouvrir modal de sélection de plat
                Alert.alert('Info', 'Sélection de plat à implémenter');
              }}
            >
              <Text style={styles.itemSelectorText}>
                {formData.selectedItem?.name || 'Sélectionner un plat'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Réduction */}
        <View style={styles.section}>
          <Text style={styles.label}>Réduction *</Text>
          <View style={styles.discountContainer}>
            <View style={styles.discountTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.discountTypeButton,
                  formData.discountType === 'percentage' && styles.discountTypeButtonSelected,
                ]}
                onPress={() => setFormData({ ...formData, discountType: 'percentage', discount: '' })}
              >
                <Text
                  style={[
                    styles.discountTypeText,
                    formData.discountType === 'percentage' && styles.discountTypeTextSelected,
                  ]}
                >
                  %
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.discountTypeButton,
                  formData.discountType === 'fixed' && styles.discountTypeButtonSelected,
                ]}
                onPress={() => setFormData({ ...formData, discountType: 'fixed', discount: '' })}
              >
                <Text
                  style={[
                    styles.discountTypeText,
                    formData.discountType === 'fixed' && styles.discountTypeTextSelected,
                  ]}
                >
                  FCFA
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.discountInput}
              placeholder={formData.discountType === 'percentage' ? '20' : '500'}
              value={formData.discount}
              onChangeText={(text) => setFormData({ ...formData, discount: text })}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Période */}
        <View style={styles.section}>
          <Text style={styles.label}>Période de validité *</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateInput}>
              <Text style={styles.dateLabel}>Début</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                <Text style={styles.dateText}>
                  {formData.startDate.toLocaleDateString('fr-FR')} à{' '}
                  {formData.startDate.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateInput}>
              <Text style={styles.dateLabel}>Fin</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                <Text style={styles.dateText}>
                  {formData.endDate.toLocaleDateString('fr-FR')} à{' '}
                  {formData.endDate.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showStartDatePicker && (
            <DateTimePicker
              value={formData.startDate}
              mode="datetime"
              display="default"
              onChange={(event, date) => {
                setShowStartDatePicker(false);
                if (date) {
                  setFormData({ ...formData, startDate: date });
                }
              }}
            />
          )}

          {showEndDatePicker && (
            <DateTimePicker
              value={formData.endDate}
              mode="datetime"
              display="default"
              onChange={(event, date) => {
                setShowEndDatePicker(false);
                if (date) {
                  setFormData({ ...formData, endDate: date });
                }
              }}
            />
          )}
        </View>

        {/* Conditions */}
        <View style={styles.section}>
          <Text style={styles.label}>Conditions</Text>
          <View style={styles.conditionsContainer}>
            <View style={styles.conditionRow}>
              <Text style={styles.conditionLabel}>Montant minimum de commande</Text>
              <TextInput
                style={styles.conditionInput}
                placeholder="0 FCFA"
                value={formData.minOrderAmount?.toString() || ''}
                onChangeText={(text) =>
                  setFormData({ ...formData, minOrderAmount: parseInt(text) || null })
                }
                keyboardType="numeric"
              />
            </View>
            <View style={styles.conditionRow}>
              <Text style={styles.conditionLabel}>Limiter le nombre d'utilisations</Text>
              <TextInput
                style={styles.conditionInput}
                placeholder="Illimité"
                value={formData.maxUses?.toString() || ''}
                onChangeText={(text) =>
                  setFormData({ ...formData, maxUses: parseInt(text) || null })
                }
                keyboardType="numeric"
              />
            </View>
            <View style={styles.conditionRow}>
              <Text style={styles.conditionLabel}>Limiter à X par client</Text>
              <TextInput
                style={styles.conditionInput}
                placeholder="Illimité"
                value={formData.perCustomerLimit?.toString() || ''}
                onChangeText={(text) =>
                  setFormData({ ...formData, perCustomerLimit: parseInt(text) || null })
                }
                keyboardType="numeric"
              />
            </View>
            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() =>
                  setFormData({ ...formData, newCustomersOnly: !formData.newCustomersOnly })
                }
              >
                <Ionicons
                  name={formData.newCustomersOnly ? 'checkbox' : 'checkbox-outline'}
                  size={24}
                  color={formData.newCustomersOnly ? COLORS.primary : COLORS.textSecondary}
                />
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>Nouveaux clients uniquement</Text>
            </View>
            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() =>
                  setFormData({ ...formData, loyalCustomersOnly: !formData.loyalCustomersOnly })
                }
              >
                <Ionicons
                  name={formData.loyalCustomersOnly ? 'checkbox' : 'checkbox-outline'}
                  size={24}
                  color={formData.loyalCustomersOnly ? COLORS.primary : COLORS.textSecondary}
                />
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>Clients fidèles uniquement</Text>
            </View>
          </View>
        </View>

        {/* Visibilité */}
        <View style={styles.section}>
          <Text style={styles.label}>Visibilité</Text>
          <View style={styles.visibilityContainer}>
            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setFormData({ ...formData, showBadge: !formData.showBadge })}
              >
                <Ionicons
                  name={formData.showBadge ? 'checkbox' : 'checkbox-outline'}
                  size={24}
                  color={formData.showBadge ? COLORS.primary : COLORS.textSecondary}
                />
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>Afficher badge "PROMO" sur l'app</Text>
            </View>
            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() =>
                  setFormData({ ...formData, notifySubscribers: !formData.notifySubscribers })
                }
              >
                <Ionicons
                  name={formData.notifySubscribers ? 'checkbox' : 'checkbox-outline'}
                  size={24}
                  color={formData.notifySubscribers ? COLORS.primary : COLORS.textSecondary}
                />
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>Notifier mes abonnés</Text>
            </View>
            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() =>
                  setFormData({ ...formData, paidVisibility: !formData.paidVisibility })
                }
              >
                <Ionicons
                  name={formData.paidVisibility ? 'checkbox' : 'checkbox-outline'}
                  size={24}
                  color={formData.paidVisibility ? COLORS.primary : COLORS.textSecondary}
                />
              </TouchableOpacity>
              <View style={styles.checkboxContent}>
                <Text style={styles.checkboxLabel}>Mise en avant payante</Text>
                <Text style={styles.checkboxDescription}>(+5 000 FCFA)</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? 'Création...' : 'Créer la promotion'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
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
  typesContainer: {
    gap: 12,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 12,
  },
  typeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  typeLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  typeLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  itemSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemSelectorText: {
    fontSize: 14,
    color: COLORS.text,
  },
  discountContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  discountTypeContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  discountTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  discountTypeButtonSelected: {
    backgroundColor: COLORS.primary,
  },
  discountTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  discountTypeTextSelected: {
    color: COLORS.white,
  },
  discountInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.text,
    flex: 1,
  },
  conditionsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  conditionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conditionLabel: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  conditionInput: {
    width: 120,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'right',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    padding: 4,
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  checkboxContent: {
    flex: 1,
  },
  checkboxDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  visibilityContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  footer: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

import React, { useState, useEffect } from 'react';
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
import useRestaurantStore from '../../store/restaurantStore';

const PROMOTION_TYPES = [
  { id: 'percentage', label: 'Réduction en pourcentage' },
  { id: 'fixed', label: 'Réduction fixe (FCFA)' },
];

export default function DishPromotionsScreen({ navigation, route }) {
  const { itemId, itemName } = route.params || {};
  const { menu } = useRestaurantStore();
  const [formData, setFormData] = useState({
    type: 'percentage',
    discount: '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 jours
    quantityLimit: null,
    showBadge: true,
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const item = menu.find((i) => i.id === itemId);
  const basePrice = item?.price || 0;

  const calculateDiscount = () => {
    if (!formData.discount) return 0;
    if (formData.type === 'percentage') {
      return (basePrice * parseFloat(formData.discount)) / 100;
    }
    return parseFloat(formData.discount);
  };

  const finalPrice = basePrice - calculateDiscount();

  const validate = () => {
    if (!formData.discount || parseFloat(formData.discount) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer une réduction valide');
      return false;
    }
    if (formData.type === 'percentage' && parseFloat(formData.discount) > 100) {
      Alert.alert('Erreur', 'La réduction ne peut pas dépasser 100%');
      return false;
    }
    if (formData.endDate <= formData.startDate) {
      Alert.alert('Erreur', 'La date de fin doit être après la date de début');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      // TODO: Sauvegarder la promotion via API
      Alert.alert('Succès', 'Promotion créée avec succès', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de créer la promotion');
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
        <Text style={styles.title}>Promotion sur article</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {itemName && (
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{itemName}</Text>
            <Text style={styles.itemPrice}>Prix actuel : {basePrice} FCFA</Text>
          </View>
        )}

        {/* Type de réduction */}
        <View style={styles.section}>
          <Text style={styles.label}>Type de réduction *</Text>
          <View style={styles.typeContainer}>
            {PROMOTION_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeOption,
                  formData.type === type.id && styles.typeOptionSelected,
                ]}
                onPress={() => setFormData({ ...formData, type: type.id, discount: '' })}
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    formData.type === type.id && styles.typeOptionTextSelected,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Réduction */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Réduction {formData.type === 'percentage' ? '(%)' : '(FCFA)'} *
          </Text>
          <TextInput
            style={styles.input}
            placeholder={formData.type === 'percentage' ? '20' : '500'}
            value={formData.discount}
            onChangeText={(text) => setFormData({ ...formData, discount: text })}
            keyboardType="numeric"
          />
        </View>

        {/* Aperçu */}
        {formData.discount && (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Aperçu</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Prix original</Text>
              <Text style={styles.previewOriginalPrice}>{basePrice} FCFA</Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Réduction</Text>
              <Text style={styles.previewDiscount}>
                -{formData.type === 'percentage' ? `${formData.discount}%` : `${formData.discount} FCFA`}
              </Text>
            </View>
            <View style={[styles.previewRow, styles.previewTotal]}>
              <Text style={styles.previewTotalLabel}>Nouveau prix</Text>
              <Text style={styles.previewTotalPrice}>{finalPrice.toFixed(0)} FCFA</Text>
            </View>
          </View>
        )}

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
                  {formData.startDate.toLocaleDateString('fr-FR')}
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
                  {formData.endDate.toLocaleDateString('fr-FR')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showStartDatePicker && (
            <DateTimePicker
              value={formData.startDate}
              mode="date"
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
              mode="date"
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

        {/* Limitation de quantité */}
        <View style={styles.section}>
          <Text style={styles.label}>Limitation de quantité (optionnel)</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre maximum d'utilisations"
            value={formData.quantityLimit?.toString() || ''}
            onChangeText={(text) => setFormData({ ...formData, quantityLimit: parseInt(text) || null })}
            keyboardType="numeric"
          />
        </View>

        {/* Badge PROMO */}
        <View style={styles.section}>
          <View style={styles.toggleContainer}>
            <Text style={styles.label}>Afficher badge "PROMO"</Text>
            <TouchableOpacity
              style={[styles.toggle, formData.showBadge && styles.toggleActive]}
              onPress={() => setFormData({ ...formData, showBadge: !formData.showBadge })}
            >
              <View style={[styles.toggleThumb, formData.showBadge && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
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
  itemInfo: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: COLORS.textSecondary,
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
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  typeOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  typeOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  typeOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  previewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    marginTop: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  previewOriginalPrice: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  previewDiscount: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: '600',
  },
  previewTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  previewTotalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
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
    fontSize: 14,
    color: COLORS.text,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.white,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  footer: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

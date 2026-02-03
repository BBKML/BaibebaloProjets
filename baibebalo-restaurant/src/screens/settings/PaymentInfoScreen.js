import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { COLORS } from '../../constants/colors';
import { restaurantApi } from '../../api/restaurant';
import useAuthStore from '../../store/authStore';

const OPERATORS = [
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'mtn_money', label: 'MTN Money' },
  { value: 'moov_money', label: 'Moov Money' },
];

export default function PaymentInfoScreen({ navigation }) {
  const { restaurant, setRestaurant } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [operatorModalVisible, setOperatorModalVisible] = useState(false);
  const [form, setForm] = useState({
    mobile_money_number: '',
    mobile_money_provider: '',
    account_holder_name: '',
    bank_rib: '',
  });

  const commissionRate = restaurant?.commission_rate != null
    ? Number(restaurant.commission_rate)
    : 15;
  const commissionLabel = `${commissionRate.toFixed(2)} % · Propriétaire`;

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await restaurantApi.getProfile();
      const r = data?.data?.restaurant || data?.restaurant || data;
      if (r) {
        setRestaurant(r);
        setForm({
          mobile_money_number: r.mobile_money_number || '',
          mobile_money_provider: r.mobile_money_provider || '',
          account_holder_name: r.account_holder_name || '',
          bank_rib: r.bank_rib || '',
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: err?.message || 'Impossible de charger le profil',
      });
    } finally {
      setLoading(false);
    }
  }, [setRestaurant]);

  // Toujours recharger le profil à l'ouverture pour avoir la commission à jour (appliquée par l'admin)
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSave = async () => {
    try {
      setSaving(true);
      await restaurantApi.updateProfile({
        mobile_money_number: form.mobile_money_number || undefined,
        mobile_money_provider: form.mobile_money_provider || undefined,
        account_holder_name: form.account_holder_name || undefined,
        bank_rib: form.bank_rib || undefined,
      });
      const data = await restaurantApi.getProfile();
      const r = data?.data?.restaurant || data?.restaurant || data;
      if (r) setRestaurant(r);
      Toast.show({
        type: 'success',
        text1: 'Enregistré',
        text2: 'Informations de paiement mises à jour',
      });
      navigation.goBack();
    } catch (err) {
      const msg = err?.error?.message || err?.message || 'Erreur lors de l\'enregistrement';
      Toast.show({ type: 'error', text1: 'Erreur', text2: msg });
    } finally {
      setSaving(false);
    }
  };

  const operatorLabel = OPERATORS.find(o => o.value === form.mobile_money_provider)?.label || 'Non renseigné';

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 60}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Informations de paiement</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.row}>
            <Ionicons name="wallet-outline" size={22} color={COLORS.primary} />
            <Text style={styles.label}>Mobile Money</Text>
          </View>
          <TextInput
            style={styles.input}
            value={form.mobile_money_number}
            onChangeText={(v) => setForm((f) => ({ ...f, mobile_money_number: v }))}
            placeholder="Ex: +2250712345678"
            placeholderTextColor={COLORS.textLight}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Ionicons name="business-outline" size={22} color={COLORS.primary} />
            <Text style={styles.label}>Opérateur</Text>
          </View>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setOperatorModalVisible(true)}
          >
            <Text style={form.mobile_money_provider ? styles.selectText : styles.selectPlaceholder}>
              {operatorLabel}
            </Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Ionicons name="pricetag-outline" size={22} color={COLORS.primary} />
            <Text style={styles.label}>Commission</Text>
          </View>
          <View style={styles.readOnlyBox}>
            <Text style={styles.readOnlyText}>{commissionLabel}</Text>
            <Text style={styles.readOnlyHint}>Définie par la plateforme · non modifiable</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Ionicons name="person-outline" size={22} color={COLORS.primary} />
            <Text style={styles.label}>Nom du titulaire du compte</Text>
          </View>
          <TextInput
            style={styles.input}
            value={form.account_holder_name}
            onChangeText={(v) => setForm((f) => ({ ...f, account_holder_name: v }))}
            placeholder="Nom du propriétaire du compte"
            placeholderTextColor={COLORS.textLight}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Ionicons name="card-outline" size={22} color={COLORS.primary} />
            <Text style={styles.label}>RIB (optionnel)</Text>
          </View>
          <TextInput
            style={styles.input}
            value={form.bank_rib}
            onChangeText={(v) => setForm((f) => ({ ...f, bank_rib: v }))}
            placeholder="Relevé d’identité bancaire"
            placeholderTextColor={COLORS.textLight}
            keyboardType="default"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={operatorModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOperatorModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setOperatorModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Choisir l’opérateur</Text>
            {OPERATORS.map((op) => (
              <TouchableOpacity
                key={op.value}
                style={styles.modalOption}
                onPress={() => {
                  setForm((f) => ({ ...f, mobile_money_provider: op.value }));
                  setOperatorModalVisible(false);
                }}
              >
                <Text style={styles.modalOptionText}>{op.label}</Text>
                {form.mobile_money_provider === op.value && (
                  <Ionicons name="checkmark" size={22} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setOperatorModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectText: {
    fontSize: 16,
    color: COLORS.text,
  },
  selectPlaceholder: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  readOnlyBox: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  readOnlyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  readOnlyHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalOptionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  modalCancel: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});

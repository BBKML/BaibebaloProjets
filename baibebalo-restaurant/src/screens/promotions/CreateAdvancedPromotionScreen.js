import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { restaurantPromotions } from '../../api/promotions';
import Toast from 'react-native-toast-message';

const PROMO_TYPES = [
  {
    id: 'percentage',
    label: 'Réduction en %',
    icon: 'pricetag',
    description: 'Ex: -20% sur la commande',
    color: '#3B82F6',
  },
  {
    id: 'fixed_amount',
    label: 'Réduction fixe (FCFA)',
    icon: 'cash',
    description: 'Ex: -500 FCFA sur la commande',
    color: '#10B981',
  },
  {
    id: 'free_delivery',
    label: 'Livraison gratuite',
    icon: 'bicycle',
    description: 'Offrir les frais de livraison',
    color: '#F59E0B',
  },
];

const QUICK_CODES = ['BIENVENUE', 'PROMO10', 'FLASH20', 'FIDELITE', 'ETE2024'];

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function CreateAdvancedPromotionScreen({ navigation, route }) {
  const editingPromotion = route.params?.promotion || null;
  const insets = useSafeAreaInsets();

  const [type, setType] = useState(editingPromotion?.type || 'percentage');
  const [code, setCode] = useState(editingPromotion?.code || '');
  const [value, setValue] = useState(editingPromotion?.value?.toString() || '');
  const [minOrderAmount, setMinOrderAmount] = useState(
    editingPromotion?.min_order_amount?.toString() || ''
  );
  const [maxDiscount, setMaxDiscount] = useState(
    editingPromotion?.max_discount?.toString() || ''
  );
  const [usageLimit, setUsageLimit] = useState(
    editingPromotion?.usage_limit?.toString() || ''
  );
  const [validFrom, setValidFrom] = useState(
    editingPromotion?.valid_from ? new Date(editingPromotion.valid_from) : new Date()
  );
  const [validUntil, setValidUntil] = useState(
    editingPromotion?.valid_until
      ? new Date(editingPromotion.valid_until)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  );
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const selectedType = PROMO_TYPES.find((t) => t.id === type);

  const validate = () => {
    const newErrors = {};
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      newErrors.code = 'Le code promo est obligatoire';
    } else if (cleanCode.length < 3 || cleanCode.length > 50) {
      newErrors.code = 'Entre 3 et 50 caractères';
    } else if (!/^[A-Z0-9_-]+$/.test(cleanCode)) {
      newErrors.code = 'Lettres majuscules, chiffres, tirets et _ uniquement';
    }

    if (type !== 'free_delivery') {
      if (!value.trim()) {
        newErrors.value = 'La valeur est obligatoire';
      } else if (isNaN(parseFloat(value)) || parseFloat(value) <= 0) {
        newErrors.value = 'Valeur invalide';
      } else if (type === 'percentage' && parseFloat(value) > 100) {
        newErrors.value = 'Maximum 100%';
      }
    }

    if (validUntil <= validFrom) {
      newErrors.dates = 'La date de fin doit être après la date de début';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        type,
        value: type === 'free_delivery' ? 0 : parseFloat(value),
        valid_from: validFrom.toISOString(),
        valid_until: validUntil.toISOString(),
        min_order_amount: minOrderAmount ? parseFloat(minOrderAmount) : undefined,
        max_discount: maxDiscount ? parseFloat(maxDiscount) : undefined,
        usage_limit: usageLimit ? parseInt(usageLimit, 10) : undefined,
      };

      if (editingPromotion) {
        await restaurantPromotions.updatePromotion(editingPromotion.id, payload);
        Toast.show({ type: 'success', text1: 'Promotion mise à jour' });
      } else {
        await restaurantPromotions.createPromotion(payload);
        Toast.show({
          type: 'success',
          text1: 'Code promo créé !',
          text2: `Code : ${payload.code}`,
        });
      }
      navigation.goBack();
    } catch (error) {
      const msg =
        error?.error?.message || error?.message || 'Impossible de créer la promotion';
      Toast.show({ type: 'error', text1: 'Erreur', text2: msg });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) =>
    date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const adjustDate = (current, days) => {
    const d = new Date(current);
    d.setDate(d.getDate() + days);
    return d;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editingPromotion ? 'Modifier le code promo' : 'Nouveau code promo'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Section : Type */}
        <Text style={styles.sectionTitle}>Type de réduction</Text>
        <View style={styles.card}>
          {PROMO_TYPES.map((t, i) => (
            <React.Fragment key={t.id}>
              <TouchableOpacity
                style={[styles.typeRow, type === t.id && styles.typeRowSelected]}
                onPress={() => setType(t.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.typeIconBox, { backgroundColor: t.color + '20' }]}>
                  <Ionicons name={t.icon} size={20} color={t.color} />
                </View>
                <View style={styles.typeInfo}>
                  <Text style={[styles.typeLabel, type === t.id && { color: COLORS.primary }]}>
                    {t.label}
                  </Text>
                  <Text style={styles.typeDesc}>{t.description}</Text>
                </View>
                <View
                  style={[
                    styles.radioOuter,
                    type === t.id && { borderColor: COLORS.primary },
                  ]}
                >
                  {type === t.id && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
              {i < PROMO_TYPES.length - 1 && <View style={styles.sep} />}
            </React.Fragment>
          ))}
        </View>

        {/* Section : Code promo */}
        <Text style={styles.sectionTitle}>Code promo *</Text>
        <View style={styles.card}>
          <View style={styles.codeInputRow}>
            <TextInput
              style={[styles.codeInput, errors.code && styles.inputError]}
              placeholder="Ex: BIENVENUE20"
              value={code}
              onChangeText={(t) => {
                setCode(t.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
                setErrors((e) => ({ ...e, code: null }));
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={50}
            />
            <TouchableOpacity
              style={styles.genBtn}
              onPress={() => setCode(generateCode())}
            >
              <Ionicons name="refresh" size={18} color={COLORS.primary} />
              <Text style={styles.genBtnText}>Générer</Text>
            </TouchableOpacity>
          </View>
          {errors.code ? (
            <Text style={styles.errorText}>{errors.code}</Text>
          ) : (
            <Text style={styles.hint}>
              Lettres majuscules, chiffres, tirets (ex: PROMO-20, ETE2024)
            </Text>
          )}

          {/* Raccourcis */}
          <Text style={styles.quickLabel}>Suggestions rapides</Text>
          <View style={styles.quickRow}>
            {QUICK_CODES.map((qc) => (
              <TouchableOpacity
                key={qc}
                style={[styles.quickChip, code === qc && styles.quickChipActive]}
                onPress={() => setCode(qc)}
              >
                <Text
                  style={[styles.quickChipText, code === qc && styles.quickChipTextActive]}
                >
                  {qc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section : Valeur (masqué pour livraison gratuite) */}
        {type !== 'free_delivery' && (
          <>
            <Text style={styles.sectionTitle}>
              {type === 'percentage' ? 'Pourcentage de réduction *' : 'Montant de réduction *'}
            </Text>
            <View style={styles.card}>
              <View style={styles.valueRow}>
                <TextInput
                  style={[styles.valueInput, errors.value && styles.inputError]}
                  placeholder={type === 'percentage' ? '20' : '500'}
                  value={value}
                  onChangeText={(t) => {
                    setValue(t);
                    setErrors((e) => ({ ...e, value: null }));
                  }}
                  keyboardType="numeric"
                />
                <View style={styles.valueSuffix}>
                  <Text style={styles.valueSuffixText}>
                    {type === 'percentage' ? '%' : 'FCFA'}
                  </Text>
                </View>
              </View>
              {errors.value && <Text style={styles.errorText}>{errors.value}</Text>}
              {type === 'percentage' && (
                <View style={{ marginTop: 12, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {[5, 10, 15, 20, 30].map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={[
                        styles.quickChip,
                        value === v.toString() && styles.quickChipActive,
                      ]}
                      onPress={() => setValue(v.toString())}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          value === v.toString() && styles.quickChipTextActive,
                        ]}
                      >
                        {v}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {type === 'percentage' && (
                <View style={styles.condRow}>
                  <Text style={styles.condLabel}>Réduction max (FCFA)</Text>
                  <TextInput
                    style={styles.condInput}
                    placeholder="Illimitée"
                    value={maxDiscount}
                    onChangeText={setMaxDiscount}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>
          </>
        )}

        {/* Section : Conditions */}
        <Text style={styles.sectionTitle}>Conditions d'utilisation</Text>
        <View style={styles.card}>
          <View style={styles.condRow}>
            <View style={styles.condLabelBox}>
              <Ionicons name="cart-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.condLabel}>Commande minimum (FCFA)</Text>
            </View>
            <TextInput
              style={styles.condInput}
              placeholder="Aucun"
              value={minOrderAmount}
              onChangeText={setMinOrderAmount}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.sep} />
          <View style={styles.condRow}>
            <View style={styles.condLabelBox}>
              <Ionicons name="people-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.condLabel}>Nombre d'utilisations max</Text>
            </View>
            <TextInput
              style={styles.condInput}
              placeholder="Illimité"
              value={usageLimit}
              onChangeText={setUsageLimit}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Section : Durée */}
        <Text style={styles.sectionTitle}>Durée de validité</Text>
        <View style={styles.card}>
          {errors.dates && (
            <Text style={[styles.errorText, { marginBottom: 8 }]}>{errors.dates}</Text>
          )}

          <View style={styles.datesRow}>
            {/* Début */}
            <View style={styles.dateBox}>
              <Text style={styles.dateBoxLabel}>Début</Text>
              <View style={styles.dateDisplay}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                <Text style={styles.dateDisplayText}>{formatDate(validFrom)}</Text>
              </View>
              <View style={styles.dateAdjust}>
                <TouchableOpacity
                  style={styles.dateAdjBtn}
                  onPress={() => setValidFrom(adjustDate(validFrom, -1))}
                >
                  <Ionicons name="remove" size={14} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.dateAdjLabel}>jour</Text>
                <TouchableOpacity
                  style={styles.dateAdjBtn}
                  onPress={() => setValidFrom(adjustDate(validFrom, 1))}
                >
                  <Ionicons name="add" size={14} color={COLORS.text} />
                </TouchableOpacity>
              </View>
            </View>

            <Ionicons name="arrow-forward" size={18} color={COLORS.textSecondary} style={{ marginTop: 28 }} />

            {/* Fin */}
            <View style={styles.dateBox}>
              <Text style={styles.dateBoxLabel}>Fin</Text>
              <View style={styles.dateDisplay}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.error} />
                <Text style={styles.dateDisplayText}>{formatDate(validUntil)}</Text>
              </View>
              <View style={styles.dateAdjust}>
                <TouchableOpacity
                  style={styles.dateAdjBtn}
                  onPress={() => setValidUntil(adjustDate(validUntil, -1))}
                >
                  <Ionicons name="remove" size={14} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.dateAdjLabel}>jour</Text>
                <TouchableOpacity
                  style={styles.dateAdjBtn}
                  onPress={() => setValidUntil(adjustDate(validUntil, 1))}
                >
                  <Ionicons name="add" size={14} color={COLORS.text} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Raccourcis durée */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {[
              { label: '7 jours', days: 7 },
              { label: '14 jours', days: 14 },
              { label: '30 jours', days: 30 },
              { label: '3 mois', days: 90 },
            ].map(({ label, days }) => {
              const end = adjustDate(new Date(), days);
              const isActive =
                Math.abs(validUntil - end) < 24 * 3600 * 1000;
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.quickChip, isActive && styles.quickChipActive]}
                  onPress={() => {
                    setValidFrom(new Date());
                    setValidUntil(end);
                  }}
                >
                  <Text style={[styles.quickChipText, isActive && styles.quickChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Aperçu */}
        <Text style={styles.sectionTitle}>Aperçu</Text>
        <View style={[styles.previewCard, { borderColor: selectedType?.color || COLORS.primary }]}>
          <View style={styles.previewTop}>
            <View
              style={[
                styles.previewBadge,
                { backgroundColor: (selectedType?.color || COLORS.primary) + '20' },
              ]}
            >
              <Text
                style={[styles.previewCode, { color: selectedType?.color || COLORS.primary }]}
              >
                {code || 'VOTRECODE'}
              </Text>
            </View>
            <Text style={styles.previewValue}>
              {type === 'free_delivery'
                ? 'Livraison offerte'
                : type === 'percentage'
                ? `${value || '?'}% de réduction`
                : `${value || '?'} FCFA de réduction`}
            </Text>
          </View>
          <View style={styles.previewDetails}>
            {minOrderAmount ? (
              <Text style={styles.previewDetail}>
                • Commande min : {minOrderAmount} FCFA
              </Text>
            ) : null}
            {usageLimit ? (
              <Text style={styles.previewDetail}>• Max {usageLimit} utilisations</Text>
            ) : null}
            <Text style={styles.previewDetail}>
              • Valide du {formatDate(validFrom)} au {formatDate(validUntil)}
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
              <Text style={styles.submitBtnText}>
                {editingPromotion ? 'Mettre à jour' : 'Créer le code promo'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.text },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 0 },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    overflow: 'hidden',
  },

  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderRadius: 10,
  },
  typeRowSelected: { backgroundColor: COLORS.primary + '08' },
  typeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeInfo: { flex: 1 },
  typeLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  typeDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },

  sep: { height: 1, backgroundColor: COLORS.border + '60', marginVertical: 4 },

  codeInputRow: { flexDirection: 'row', gap: 10 },
  codeInput: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 2,
  },
  inputError: { borderColor: COLORS.error },
  genBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  genBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
  errorText: { fontSize: 12, color: COLORS.error, marginTop: 6 },
  quickLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 14, marginBottom: 8 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  quickChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  quickChipTextActive: { color: COLORS.white },

  valueRow: { flexDirection: 'row', gap: 0, overflow: 'hidden', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  valueInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    backgroundColor: COLORS.white,
    borderWidth: 0,
  },
  valueSuffix: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  valueSuffixText: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },

  condRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 8,
  },
  condLabelBox: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  condLabel: { fontSize: 14, color: COLORS.text, flex: 1 },
  condInput: {
    width: 110,
    height: 40,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'right',
  },

  datesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateBox: { flex: 1 },
  dateBoxLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateDisplayText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  dateAdjust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  dateAdjBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateAdjLabel: { fontSize: 11, color: COLORS.textSecondary },

  previewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: 16,
    marginTop: 4,
  },
  previewTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  previewBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  previewCode: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  previewValue: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.text },
  previewDetails: { gap: 4 },
  previewDetail: { fontSize: 12, color: COLORS.textSecondary },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});

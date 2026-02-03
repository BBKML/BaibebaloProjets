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
import { COLORS } from '../../constants/colors';
import { restaurantFinance } from '../../api/finance';
import useRestaurantStore from '../../store/restaurantStore';

const MIN_WITHDRAWAL = 10000;

export default function WithdrawalRequestScreen({ navigation }) {
  const { financialData } = useRestaurantStore();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const availableBalance = financialData?.availableBalance || 0;
  const mobileMoneyAccount = financialData?.mobileMoneyAccount || 'Non configuré';

  const handleWithdrawal = async () => {
    const withdrawalAmount = parseFloat(amount);

    if (!amount || isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    if (withdrawalAmount < MIN_WITHDRAWAL) {
      Alert.alert(
        'Erreur',
        `Le montant minimum de retrait est de ${MIN_WITHDRAWAL.toLocaleString('fr-FR')} FCFA`
      );
      return;
    }

    if (withdrawalAmount > availableBalance) {
      Alert.alert('Erreur', 'Montant supérieur au solde disponible');
      return;
    }

    Alert.alert(
      'Confirmer le retrait',
      `Voulez-vous retirer ${withdrawalAmount.toLocaleString('fr-FR')} FCFA vers ${mobileMoneyAccount} ?\n\nDélai de traitement : 24-48h`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await restaurantFinance.requestWithdrawal(withdrawalAmount);
              // Le backend retourne { success: true, message: "...", data: { payout_request: {...} } }
              const successMessage = response.message || 'Votre demande de retrait a été enregistrée. Vous recevrez une confirmation par SMS/Email.';
              Alert.alert('Succès', successMessage, [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              const errorMessage = error.error?.message || error.message || 'Impossible de traiter la demande';
              Alert.alert('Erreur', errorMessage);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const setMaxAmount = () => {
    setAmount(availableBalance.toString());
  };

  const setQuickAmount = (value) => {
    if (value <= availableBalance) {
      setAmount(value.toString());
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
        <Text style={styles.title}>Demande de retrait</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Informations */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Solde disponible</Text>
            <Text style={styles.infoValue}>
              {availableBalance.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Compte Mobile Money</Text>
            <Text style={styles.infoValue}>{mobileMoneyAccount}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Montant minimum</Text>
            <Text style={styles.infoValue}>
              {MIN_WITHDRAWAL.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Délai de traitement</Text>
            <Text style={styles.infoValue}>24-48h</Text>
          </View>
        </View>

        {/* Montant */}
        <View style={styles.section}>
          <Text style={styles.label}>Montant à retirer (FCFA) *</Text>
          <View style={styles.amountInputContainer}>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.maxButton} onPress={setMaxAmount}>
              <Text style={styles.maxButtonText}>MAX</Text>
            </TouchableOpacity>
          </View>
          {amount && parseFloat(amount) > 0 && (
            <Text style={styles.amountPreview}>
              Vous recevrez : {parseFloat(amount).toLocaleString('fr-FR')} FCFA
            </Text>
          )}
        </View>

        {/* Montants rapides */}
        <View style={styles.section}>
          <Text style={styles.label}>Montants rapides</Text>
          <View style={styles.quickAmountsContainer}>
            {[25000, 50000, 100000, 200000].map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.quickAmountButton,
                  value > availableBalance && styles.quickAmountButtonDisabled,
                ]}
                onPress={() => setQuickAmount(value)}
                disabled={value > availableBalance}
              >
                <Text
                  style={[
                    styles.quickAmountText,
                    value > availableBalance && styles.quickAmountTextDisabled,
                  ]}
                >
                  {value.toLocaleString('fr-FR')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Avertissement */}
        <View style={styles.warningCard}>
          <Ionicons name="information-circle" size={20} color={COLORS.info} />
          <Text style={styles.warningText}>
            Le retrait sera effectué vers votre compte Mobile Money enregistré. Vous recevrez une confirmation par SMS/Email une fois le virement effectué.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.withdrawButton,
            (!amount || parseFloat(amount) < MIN_WITHDRAWAL || loading) &&
              styles.withdrawButtonDisabled,
          ]}
          onPress={handleWithdrawal}
          disabled={!amount || parseFloat(amount) < MIN_WITHDRAWAL || loading}
        >
          <Text style={styles.withdrawButtonText}>
            {loading ? 'Traitement...' : 'Demander le retrait'}
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
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
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
  amountInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  amountInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  maxButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  maxButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  amountPreview: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  quickAmountsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAmountButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: 'center',
  },
  quickAmountButtonDisabled: {
    opacity: 0.5,
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  quickAmountTextDisabled: {
    color: COLORS.textSecondary,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.info + '15',
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
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  withdrawButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  withdrawButtonDisabled: {
    opacity: 0.5,
  },
  withdrawButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

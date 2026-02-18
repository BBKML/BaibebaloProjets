import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useDeliveryStore from '../../store/deliveryStore';
import { requestPayout } from '../../api/earnings';

const MIN_WITHDRAWAL = 5000; // Demande avant le lundi (paiement automatique le lundi à partir de 1000 F)

export default function WithdrawRequestScreen({ navigation }) {
  const { earningsData, fetchEarnings } = useDeliveryStore();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  
  const balance = earningsData.available_balance;
  const parsedAmount = parseInt(amount) || 0;
  const isValidAmount = parsedAmount >= MIN_WITHDRAWAL && parsedAmount <= balance;

  const handleWithdraw = async () => {
    if (!isValidAmount) {
      if (parsedAmount < MIN_WITHDRAWAL) {
        Alert.alert('Erreur', `Le montant minimum est ${MIN_WITHDRAWAL.toLocaleString()} FCFA`);
      } else {
        Alert.alert('Erreur', 'Solde insuffisant');
      }
      return;
    }

    setLoading(true);
    try {
      const response = await requestPayout(parsedAmount);
      
      if (response?.success) {
        Alert.alert(
          'Demande envoyée',
          `Votre demande de retrait de ${parsedAmount.toLocaleString()} FCFA a été enregistrée.\n\nTraitement sous 24-48h.`,
          [
            {
              text: 'OK',
              onPress: () => {
                fetchEarnings(); // Rafraîchir les données
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        Alert.alert('Erreur', response?.error?.message || 'Erreur lors de la demande de retrait');
      }
    } catch (error) {
      console.error('Erreur retrait:', error);
      Alert.alert('Erreur', error.response?.data?.error?.message || 'Erreur lors de la demande de retrait');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Demande de retrait</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.content}>
        <Text style={styles.balanceLabel}>Solde disponible</Text>
        <Text style={styles.balance}>{balance.toLocaleString()} FCFA</Text>
        
        <TextInput
          style={[styles.input, !isValidAmount && amount && styles.inputError]}
          placeholder="Montant à retirer"
          placeholderTextColor={COLORS.textLight}
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
        />
        
        {amount && !isValidAmount && (
          <Text style={styles.errorText}>
            {parsedAmount < MIN_WITHDRAWAL 
              ? `Minimum ${MIN_WITHDRAWAL.toLocaleString()} FCFA` 
              : 'Solde insuffisant'}
          </Text>
        )}
        
        <View style={styles.quickAmounts}>
          {[MIN_WITHDRAWAL, 10000, 25000].filter(v => v <= balance).map(val => (
            <TouchableOpacity 
              key={val} 
              style={[styles.quickButton, parsedAmount === val && styles.quickButtonActive]} 
              onPress={() => setAmount(String(val))}
            >
              <Text style={[styles.quickButtonText, parsedAmount === val && styles.quickButtonTextActive]}>
                {val.toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
          {balance >= MIN_WITHDRAWAL && (
            <TouchableOpacity 
              style={[styles.quickButton, parsedAmount === balance && styles.quickButtonActive]} 
              onPress={() => setAmount(String(balance))}
            >
              <Text style={[styles.quickButtonText, parsedAmount === balance && styles.quickButtonTextActive]}>Tout</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.info} />
          <Text style={styles.infoText}>
            Demande avant le lundi (min. 5000 F). Sinon, paiement automatique chaque lundi dès 1000 F. Traitement sous 24-48h via Mobile Money.
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.primaryButton, (!isValidAmount || loading) && styles.primaryButtonDisabled]} 
          disabled={!isValidAmount || loading}
          onPress={handleWithdraw}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>DEMANDER LE PAIEMENT</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  placeholder: { width: 40 },
  content: { flex: 1, padding: 24 },
  balanceLabel: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  balance: { fontSize: 36, fontWeight: 'bold', color: COLORS.text, textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, fontSize: 18, textAlign: 'center', borderWidth: 1, borderColor: COLORS.border, marginBottom: 8, color: COLORS.text },
  inputError: { borderColor: COLORS.error },
  errorText: { fontSize: 12, color: COLORS.error, textAlign: 'center', marginBottom: 16 },
  quickAmounts: { flexDirection: 'row', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
  quickButton: { flex: 1, minWidth: 70, backgroundColor: COLORS.white, padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  quickButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  quickButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  quickButtonTextActive: { color: '#FFFFFF' },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.info + '15', padding: 16, borderRadius: 12, marginBottom: 24 },
  infoText: { flex: 1, fontSize: 13, color: COLORS.info },
  primaryButton: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  primaryButtonDisabled: { backgroundColor: COLORS.textLight },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});

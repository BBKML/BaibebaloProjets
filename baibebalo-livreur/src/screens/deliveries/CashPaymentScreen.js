import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function CashPaymentScreen({ navigation, route }) {
  const delivery = route.params?.delivery;
  const amount = Math.round(delivery?.total || delivery?.amount || 0);
  const earnings = Math.round(delivery?.earnings || delivery?.delivery_fee || 0);
  const [confirming, setConfirming] = useState(false);

  const handlePaymentReceived = () => {
    if (confirming) return;
    Alert.alert(
      'Confirmer le paiement',
      `Avez-vous bien reçu ${amount.toLocaleString('fr-FR')} FCFA en espèces ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, paiement reçu',
          onPress: () => {
            setConfirming(true);
            navigation.navigate('DeliverySuccess', { earnings, delivery });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Paiement en espèces</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.content}>
        <Ionicons name="cash" size={64} color={COLORS.success} />
        <Text style={styles.amount}>{amount.toLocaleString('fr-FR')} FCFA</Text>
        <Text style={styles.message}>Montant à collecter</Text>
        <TouchableOpacity
          style={[styles.primaryButton, confirming && styles.primaryButtonDisabled]}
          onPress={handlePaymentReceived}
          disabled={confirming}
        >
          <Text style={styles.primaryButtonText}>
            {confirming ? 'Confirmation...' : 'PAIEMENT REÇU'}
          </Text>
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
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  amount: { fontSize: 36, fontWeight: 'bold', color: COLORS.text, marginTop: 16 },
  message: { fontSize: 16, color: COLORS.textSecondary, marginTop: 8, marginBottom: 32 },
  primaryButton: { backgroundColor: COLORS.primary, paddingVertical: 16, paddingHorizontal: 48, borderRadius: 12 },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});

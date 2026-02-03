import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { confirmDelivery } from '../../api/orders';

export default function ConfirmationCodeScreen({ navigation, route }) {
  const [code, setCode] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const delivery = route.params?.delivery;

  // Valider le code et confirmer la livraison
  const handleValidate = async () => {
    if (code.length < 4 || confirming) return;

    setError('');
    setConfirming(true);

    try {
      const orderId = delivery?.id || delivery?.order_id;
      const earnings = delivery?.earnings || 1750;
      
      if (orderId) {
        // Envoyer le code de confirmation au backend
        const response = await confirmDelivery(orderId, {
          delivery_code: code,
        });
        
        console.log('✅ Livraison confirmée:', response);
        
        // Récupérer les gains depuis la réponse si disponibles
        const finalEarnings = response?.data?.earnings || earnings;
        
        navigation.navigate('DeliverySuccess', { 
          earnings: finalEarnings,
          delivery,
        });
      } else {
        // Fallback si pas d'ID
        navigation.navigate('DeliverySuccess', { earnings, delivery });
      }
    } catch (err) {
      console.error('Erreur confirmation livraison:', err);
      
      // Vérifier si c'est une erreur de code invalide
      if (err.response?.data?.error?.code === 'INVALID_CODE') {
        setError('Code incorrect. Redemandez le code au client.');
      } else {
        // En cas d'erreur réseau, permettre de continuer
        Alert.alert(
          'Erreur de synchronisation',
          'Voulez-vous réessayer ou continuer malgré l\'erreur ?',
          [
            { text: 'Réessayer', style: 'cancel' },
            { 
              text: 'Continuer', 
              onPress: () => navigation.navigate('DeliverySuccess', { 
                earnings: delivery?.earnings || 1750,
                delivery,
              })
            },
          ]
        );
      }
    } finally {
      setConfirming(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Code de confirmation</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.content}>
        <Ionicons name="keypad" size={64} color={COLORS.primary} />
        <Text style={styles.message}>Demandez le code au client</Text>
        
        {/* Afficher le montant à collecter si paiement cash */}
        {delivery?.payment_method === 'cash' && (
          <View style={styles.cashInfo}>
            <Ionicons name="cash-outline" size={20} color={COLORS.warning} />
            <Text style={styles.cashText}>
              Montant à collecter : <Text style={styles.cashAmount}>{(delivery?.total || delivery?.order_total || 0).toLocaleString()} FCFA</Text>
            </Text>
          </View>
        )}
        
        <TextInput
          style={[styles.codeInput, error && styles.codeInputError]}
          value={code}
          onChangeText={(text) => {
            setCode(text);
            setError('');
          }}
          placeholder="- - - -"
          placeholderTextColor={COLORS.textLight}
          keyboardType="number-pad"
          maxLength={4}
          textAlign="center"
          editable={!confirming}
        />
        
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
        
        <TouchableOpacity 
          style={[styles.primaryButton, (code.length < 4 || confirming) && styles.primaryButtonDisabled]}
          onPress={handleValidate}
          disabled={code.length < 4 || confirming}
        >
          {confirming ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>VALIDER LA LIVRAISON</Text>
          )}
        </TouchableOpacity>
        
        {/* Option si le client n'a pas de code */}
        <TouchableOpacity 
          style={styles.noCodeButton}
          onPress={() => Alert.alert(
            'Client sans code',
            'Demandez au client de vérifier ses SMS ou de contacter le support.',
            [{ text: 'OK' }]
          )}
        >
          <Text style={styles.noCodeText}>Le client n'a pas de code ?</Text>
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
  message: { fontSize: 16, color: COLORS.textSecondary, marginTop: 16, marginBottom: 24 },
  cashInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '15',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
    gap: 10,
  },
  cashText: { fontSize: 14, color: COLORS.text },
  cashAmount: { fontWeight: 'bold', color: COLORS.warning },
  codeInput: { 
    fontSize: 36, 
    fontWeight: 'bold', 
    color: COLORS.text, 
    letterSpacing: 16, 
    marginBottom: 16, 
    width: 200,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  codeInputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  primaryButton: { 
    backgroundColor: COLORS.primary, 
    paddingVertical: 16, 
    paddingHorizontal: 48, 
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  primaryButtonDisabled: { backgroundColor: COLORS.textLight },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  noCodeButton: {
    marginTop: 24,
    padding: 12,
  },
  noCodeText: {
    fontSize: 14,
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
});

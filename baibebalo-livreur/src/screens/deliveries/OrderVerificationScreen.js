import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { confirmPickup } from '../../api/orders';

const checklistFood = [
  { id: 'bags', label: 'Nombre de sacs correct' },
  { id: 'sealed', label: 'Commande bien fermée/emballée' },
  { id: 'drinks', label: 'Boissons incluses' },
  { id: 'cutlery', label: 'Couverts et serviettes' },
];

const checklistExpress = [
  { id: 'received', label: 'Colis récupéré' },
  { id: 'condition', label: 'Colis en bon état' },
  { id: 'sealed', label: 'Emballage correct et fermé' },
];

export default function OrderVerificationScreen({ navigation, route }) {
  const [checked, setChecked] = useState({});
  const [confirming, setConfirming] = useState(false);
  const delivery = route.params?.delivery;
  const isExpress = delivery?.order_type === 'express';
  const checklist = isExpress ? checklistExpress : checklistFood;

  const toggleCheck = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));

  // Confirmer la récupération de la commande (cochage non obligatoire)
  const handleConfirmPickup = async () => {
    if (confirming) return;

    setConfirming(true);
    try {
      const orderId = delivery?.id || delivery?.order_id;
      if (orderId) {
        await confirmPickup(orderId);
        console.log('✅ Récupération confirmée');
      }
      // Naviguer vers la livraison au client
      navigation.navigate('NavigationToCustomer', { delivery });
    } catch (error) {
      console.error('Erreur confirmation pickup:', error);
      // Même en cas d'erreur, permettre de continuer
      Alert.alert(
        'Information',
        'Erreur de synchronisation. Vous pouvez continuer.',
        [{ text: 'OK', onPress: () => navigation.navigate('NavigationToCustomer', { delivery }) }]
      );
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
        <Text style={styles.title}>Vérification</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>
          {isExpress ? 'Vérifier le colis' : 'Vérifier la commande'}
        </Text>
        {checklist.map(item => (
          <TouchableOpacity key={item.id} style={styles.checkItem} onPress={() => toggleCheck(item.id)}>
            <View style={[styles.checkbox, checked[item.id] && styles.checkboxChecked]}>
              {checked[item.id] && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[styles.primaryButton, confirming && styles.primaryButtonDisabled]}
          onPress={handleConfirmPickup}
          disabled={confirming}
        >
          {confirming ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {isExpress ? 'COLIS RÉCUPÉRÉ' : 'COMMANDE RÉCUPÉRÉE'}
            </Text>
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
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 20 },
  checkItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkLabel: { flex: 1, fontSize: 14, color: COLORS.text },
  bottomContainer: { padding: 24, paddingBottom: 32 },
  primaryButton: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  primaryButtonDisabled: { backgroundColor: COLORS.textLight },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});

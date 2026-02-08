import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function PaymentMethodScreen({ navigation, route }) {
  const [selectedMethod, setSelectedMethod] = useState(
    route?.params?.selectedMethod || 'cash'
  );
  const itemsCount = route?.params?.itemsCount || 3;
  const itemsTotal = route?.params?.itemsTotal || 4950;
  const deliveryFee = route?.params?.deliveryFee || 500;
  const totalAmount = itemsTotal + deliveryFee;

  const PAYMENT_METHODS = [
    {
      id: 'cash',
      name: 'Paiement à la livraison',
      description: 'Payez en espèces au livreur',
      icon: 'cash-outline',
      accent: COLORS.primary,
      enabled: true,
      recommended: true,
    },
    // Tous les autres modes de paiement sont commentés
    // {
    //   id: 'orange_money',
    //   name: 'Orange Money',
    //   description: null,
    //   icon: 'phone-portrait',
    //   accent: '#f58220',
    // },
    // {
    //   id: 'mtn_money',
    //   name: 'MTN Mobile Money',
    //   description: null,
    //   icon: 'flash',
    //   accent: '#f7c948',
    // },
  ];

  // Filtrer pour n'afficher que les méthodes activées
  const availableMethods = PAYMENT_METHODS.filter(m => m.enabled);

  const handleSelect = () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/66128188-ae85-488b-8573-429b47c72881',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PaymentMethodScreen.js:45',message:'handleSelect called',data:{selectedMethod,returnRoute:route?.params?.returnRoute},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    const returnRoute = route?.params?.returnRoute || 'Checkout';
    // Passer le résultat via navigation au lieu d'une fonction callback
    navigation.navigate(returnRoute, {
      selectedPaymentMethod: selectedMethod,
      // Préserver les autres params existants
      ...(route?.params?.selectedAddressId && { selectedAddressId: route.params.selectedAddressId }),
    });
  };

  const renderPaymentMethod = (method) => {
    const isSelected = selectedMethod === method.id;
    return (
      <TouchableOpacity
        key={method.id}
        style={[styles.methodCard, isSelected && styles.methodCardSelected]}
        onPress={() => setSelectedMethod(method.id)}
      >
        <View style={styles.methodRow}>
          <View style={styles.methodIcon}>
            <Ionicons name={method.icon} size={22} color={method.accent} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodName}>{method.name}</Text>
            {!!method.description && (
              <Text style={styles.methodDescription}>{method.description}</Text>
            )}
          </View>
          <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
            {isSelected && <View style={styles.radioButtonInner} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiement</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.stepper}>
          <View style={styles.stepBar} />
          <View style={styles.stepBar} />
          <View style={styles.stepBar} />
        </View>
        <Text style={styles.stepLabel}>Étape 3 sur 3</Text>

        <Text style={styles.sectionTitle}>Choisissez votre mode de paiement</Text>
        <Text style={styles.sectionSubtitle}>
          Sélectionnez comment vous souhaitez régler votre commande.
        </Text>

        <View style={styles.methodsContainer}>
          {availableMethods.map(renderPaymentMethod)}
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Articles ({itemsCount})</Text>
            <Text style={styles.summaryValue}>
              {itemsTotal.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Frais de livraison</Text>
            <Text style={styles.summaryValue}>
              {deliveryFee.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Montant Total</Text>
          <Text style={styles.totalValue}>
            {totalAmount.toLocaleString('fr-FR')} FCFA
          </Text>
        </View>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleSelect}
        >
          <Text style={styles.confirmButtonText}>Confirmer la commande</Text>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 16,
    paddingBottom: 140,
  },
  stepper: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  stepBar: {
    flex: 1,
    height: 6,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  stepLabel: {
    marginTop: 8,
    marginBottom: 24,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  methodsContainer: {
    gap: 12,
  },
  methodCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: 4,
  },
  methodCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryCard: {
    marginTop: 20,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
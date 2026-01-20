import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function DeliveryArrivalScreen({ navigation, route }) {
  const { orderId } = route.params || {};
  const [order, setOrder] = useState({
    id: orderId,
    total: 15000,
    paymentMethod: 'Mobile Money',
  });

  const handleConfirmDelivery = () => {
    // TODO: Confirmer la livraison via API
    navigation.navigate('OrderReview', { orderId });
  };

  const handleCallDriver = () => {
    // TODO: Appeler le livreur
    console.log('Appeler le livreur');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header avec animation */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
        </View>
        <Text style={styles.headerTitle}>Votre commande est arrivée !</Text>
        <Text style={styles.headerSubtitle}>
          Le livreur est à votre adresse
        </Text>
      </View>

      {/* Informations de livraison */}
      <View style={styles.deliverySection}>
        <View style={styles.deliveryCard}>
          <View style={styles.deliveryInfoRow}>
            <Ionicons name="location" size={24} color={COLORS.primary} />
            <View style={styles.deliveryInfoContent}>
              <Text style={styles.deliveryLabel}>Adresse de livraison</Text>
              <Text style={styles.deliveryValue}>
                Cocody Angré, Abidjan
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsSection}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <View style={styles.instructionsCard}>
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.instructionText}>
              Vérifiez que tous les articles sont présents
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.instructionText}>
              Vérifiez l'état de la commande
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.instructionText}>
              Effectuez le paiement si nécessaire
            </Text>
          </View>
        </View>
      </View>

      {/* Résumé de la commande */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Résumé de la commande</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>{order.total} FCFA</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Méthode de paiement</Text>
            <Text style={styles.summaryValue}>{order.paymentMethod}</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.callButton}
          onPress={handleCallDriver}
        >
          <Ionicons name="call" size={20} color={COLORS.primary} />
          <Text style={styles.callButtonText}>Appeler le livreur</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirmDelivery}
        >
          <Text style={styles.confirmButtonText}>Confirmer la réception</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 32,
    backgroundColor: COLORS.success + '20',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  deliverySection: {
    padding: 16,
    marginTop: 8,
  },
  deliveryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  deliveryInfoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  deliveryInfoContent: {
    flex: 1,
  },
  deliveryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  deliveryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  instructionsSection: {
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  instructionsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  summarySection: {
    padding: 16,
    marginTop: 8,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  actionsSection: {
    padding: 16,
    marginTop: 8,
    marginBottom: 32,
    gap: 12,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});

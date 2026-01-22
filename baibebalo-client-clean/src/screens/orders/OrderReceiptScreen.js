import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getOrderDetail } from '../../api/orders';

export default function OrderReceiptScreen({ navigation, route }) {
  const { orderId } = route.params || {};
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await getOrderDetail(orderId);
      const orderData = response.data?.order || response.data?.data?.order || response.data;
      setOrder(orderData);
    } catch (error) {
      console.error('Erreur lors du chargement de la commande:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de la commande');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    Alert.alert('Info', 'Fonctionnalité de téléchargement PDF à venir');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Chargement du reçu...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Commande non trouvée</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reçu de commande</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.receiptContainer}>
          <View style={styles.receiptHeader}>
            <View style={styles.logoBadge}>
              <Ionicons name="bag" size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.logo}>BAIBEBALO</Text>
            <View style={styles.paidBadge}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
              <Text style={styles.paidText}>Payé</Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View>
              <Text style={styles.metaLabel}>N° Commande</Text>
              <Text style={styles.metaValue}>#{order.order_number || order.id}</Text>
            </View>
            <View style={styles.metaRight}>
              <Text style={styles.metaLabel}>Date & Heure</Text>
              <Text style={styles.metaValue}>
                {new Date(order.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                {new Date(order.created_at).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>

          {order.delivery_address && (
            <View style={styles.section}>
              <View style={styles.addressRow}>
                <Ionicons name="location" size={18} color={COLORS.textSecondary} />
                <View>
                  <Text style={styles.sectionTitleSmall}>Livré à</Text>
                  <Text style={styles.addressText}>
                    {order.delivery_address.street
                      || order.delivery_address.address_line
                      || order.delivery_address.address
                      || ''}
                  </Text>
                  {(order.delivery_address.city || order.delivery_address.district) && (
                    <Text style={styles.addressText}>
                      {order.delivery_address.city || order.delivery_address.district}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitleSmall}>Articles commandés</Text>
            {order.items?.map((item) => (
              <View
                key={`${item.id || item.menu_item?.id}-${item.quantity}`}
                style={styles.itemRow}
              >
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name || item.menu_item?.name}</Text>
                  <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  {(item.price || item.menu_item?.price || 0) * item.quantity} FCFA
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sous-total</Text>
              <Text style={styles.totalValue}>{order.subtotal || order.total} FCFA</Text>
            </View>
            {order.delivery_fee && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Frais de livraison</Text>
                <Text style={styles.totalValue}>{order.delivery_fee} FCFA</Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.totalRowFinal]}>
              <Text style={styles.totalLabelFinal}>TOTAL</Text>
              <Text style={styles.totalValueFinal}>{order.total} FCFA</Text>
            </View>
          </View>

          <View style={styles.paymentRow}>
            <View style={styles.paymentInfo}>
              <Ionicons name="card-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.paymentMethod}>
                {order.payment_method === 'mobile_money' && 'Mobile Money'}
                {order.payment_method === 'cash' && 'Espèces'}
                {order.payment_method === 'card' && 'Carte bancaire'}
                {!order.payment_method && 'Non spécifié'}
              </Text>
            </View>
            <Text style={styles.paymentRef}>Réf: {order.transaction_ref || 'OM-928374192'}</Text>
          </View>

          <Text style={styles.footerNote}>
            Merci d'avoir choisi BAIBEBALO. Pour toute réclamation, contactez notre support.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.downloadBar}>
        <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadPDF}>
          <Ionicons name="document-outline" size={18} color={COLORS.white} />
          <Text style={styles.downloadText}>Télécharger PDF</Text>
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
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  receiptContainer: {
    backgroundColor: COLORS.white,
    margin: 16,
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 6,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 2,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paidText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 16,
    marginBottom: 16,
  },
  metaLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  metaRight: {
    alignItems: 'flex-end',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitleSmall: {
    fontSize: 10,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  addressRow: {
    flexDirection: 'row',
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalRowFinal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
  },
  totalLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalLabelFinal: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalValueFinal: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  paymentMethod: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentRef: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  footerNote: {
    marginTop: 12,
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  downloadBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: COLORS.background,
  },
  downloadButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  downloadText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 32,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
    marginTop: 32,
  },
});

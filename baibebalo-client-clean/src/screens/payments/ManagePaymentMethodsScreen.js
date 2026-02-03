import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function ManagePaymentMethodsScreen({ navigation }) {
  const [defaultMethod, setDefaultMethod] = useState('orange');

  const paymentMethods = [
    {
      id: 'orange',
      name: 'Orange Money',
      detail: '07 •• •• •• 12',
      color: '#f58220',
      icon: 'phone-portrait-outline',
    },
    {
      id: 'mtn',
      name: 'MTN Mobile Money',
      detail: '05 •• •• •• 45',
      color: '#ffcc00',
      icon: 'phone-portrait-outline',
    },
    {
      id: 'cash',
      name: 'Espèces (Cash)',
      detail: 'Toujours disponible',
      color: COLORS.primary,
      icon: 'cash-outline',
    },
  ];

  const handleAddPayment = () => {
    Alert.alert(
      'Ajouter un moyen de paiement',
      'Fonctionnalité en cours de développement.'
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Moyens de paiement</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Comptes liés</Text>

        {paymentMethods.map((method) => {
          const isDefault = defaultMethod === method.id;
          return (
            <View key={method.id} style={styles.methodCard}>
              <View style={[styles.methodIcon, { backgroundColor: method.color + '20' }]}>
                <Ionicons name={method.icon} size={24} color={method.color} />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>{method.name}</Text>
                <Text style={styles.methodDetail}>{method.detail}</Text>
              </View>
              <View style={styles.methodActions}>
                <Switch
                  value={isDefault}
                  onValueChange={() => setDefaultMethod(method.id)}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
                {isDefault && <Text style={styles.defaultBadge}>Par défaut</Text>}
              </View>
            </View>
          );
        })}

        <TouchableOpacity style={styles.addButton} onPress={handleAddPayment}>
          <Ionicons name="add-circle" size={20} color={COLORS.primary} />
          <Text style={styles.addButtonText}>Ajouter un moyen de paiement</Text>
        </TouchableOpacity>

        <View style={styles.securityInfo}>
          <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.securityText}>
            Vos transactions sont sécurisées et cryptées par les protocoles de paiement BAIBEBALO.
          </Text>
        </View>
      </ScrollView>
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
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  methodIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  methodDetail: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  methodActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  defaultBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: COLORS.primary + '08',
    marginTop: 4,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 8,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const kitItems = [
  { id: 'bag', icon: 'cube-outline', name: 'Sac isotherme BAIBEBALO', price: 15000 },
  { id: 'vest', icon: 'shirt-outline', name: 'Gilet réfléchissant', price: 5000 },
  { id: 'holder', icon: 'phone-portrait-outline', name: 'Support téléphone', price: 3000 },
];

export default function StarterKitScreen({ navigation }) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('deduction');

  const toggleItem = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const totalPrice = kitItems
    .filter(item => selectedItems.includes(item.id))
    .reduce((sum, item) => sum + item.price, 0);

  const handleContinue = () => {
    navigation.navigate('WelcomeActivated');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kit de démarrage</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.subtitle}>
          Équipez-vous pour livrer (optionnel)
        </Text>

        {/* Items List */}
        <View style={styles.itemsList}>
          {kitItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.itemCard,
                selectedItems.includes(item.id) && styles.itemCardSelected,
              ]}
              onPress={() => toggleItem(item.id)}
            >
              <View style={[
                styles.checkbox,
                selectedItems.includes(item.id) && styles.checkboxChecked,
              ]}>
                {selectedItems.includes(item.id) && (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                )}
              </View>
              
              <View style={styles.itemIcon}>
                <Ionicons name={item.icon} size={24} color={COLORS.primary} />
              </View>
              
              <View style={styles.itemContent}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>
                  {item.price.toLocaleString()} FCFA
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Total */}
        {selectedItems.length > 0 && (
          <>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>
                {totalPrice.toLocaleString()} FCFA
              </Text>
            </View>

            {/* Payment Options */}
            <View style={styles.paymentSection}>
              <Text style={styles.paymentTitle}>Options de paiement:</Text>
              
              <TouchableOpacity 
                style={[
                  styles.paymentOption,
                  paymentMethod === 'now' && styles.paymentOptionSelected,
                ]}
                onPress={() => setPaymentMethod('now')}
              >
                <View style={[
                  styles.radio,
                  paymentMethod === 'now' && styles.radioSelected,
                ]}>
                  {paymentMethod === 'now' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.paymentOptionText}>Payer maintenant</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.paymentOption,
                  paymentMethod === 'deduction' && styles.paymentOptionSelected,
                ]}
                onPress={() => setPaymentMethod('deduction')}
              >
                <View style={[
                  styles.radio,
                  paymentMethod === 'deduction' && styles.radioSelected,
                ]}>
                  {paymentMethod === 'deduction' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.paymentOptionText}>Déduction sur premières courses</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.paymentOption,
                  paymentMethod === 'pickup' && styles.paymentOptionSelected,
                ]}
                onPress={() => setPaymentMethod('pickup')}
              >
                <View style={[
                  styles.radio,
                  paymentMethod === 'pickup' && styles.radioSelected,
                ]}>
                  {paymentMethod === 'pickup' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.paymentOptionText}>Retirer en boutique</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.skipButton}
          onPress={handleContinue}
        >
          <Text style={styles.skipButtonText}>PASSER CETTE ÉTAPE</Text>
        </TouchableOpacity>
        
        {selectedItems.length > 0 && (
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleContinue}
          >
            <Text style={styles.primaryButtonText}>COMMANDER</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  itemsList: {
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  paymentSection: {
    marginTop: 24,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  paymentOptionSelected: {},
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  paymentOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  bottomContainer: {
    padding: 24,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

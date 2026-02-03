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

export default function ContractSigningScreen({ navigation }) {
  const [accepted, setAccepted] = useState(false);

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
        <Text style={styles.headerTitle}>Contrat de prestation</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Contract Summary */}
        <View style={styles.contractCard}>
          <Text style={styles.contractTitle}>Résumé du contrat</Text>
          
          <View style={styles.contractSection}>
            <Text style={styles.sectionTitle}>Type de contrat</Text>
            <Text style={styles.sectionText}>Prestataire de services indépendant</Text>
          </View>

          <View style={styles.contractSection}>
            <Text style={styles.sectionTitle}>Rémunération</Text>
            <Text style={styles.sectionText}>
              70% des frais de livraison + bonus selon objectifs
            </Text>
          </View>

          <View style={styles.contractSection}>
            <Text style={styles.sectionTitle}>Responsabilités</Text>
            <Text style={styles.sectionText}>
              • Livrer les commandes dans les délais{'\n'}
              • Maintenir un service de qualité{'\n'}
              • Respecter les règles de sécurité routière{'\n'}
              • Garder les équipements en bon état
            </Text>
          </View>

          <View style={styles.contractSection}>
            <Text style={styles.sectionTitle}>Conditions générales</Text>
            <Text style={styles.sectionText}>
              Ce contrat peut être résilié par l'une ou l'autre des parties avec un préavis de 7 jours.
            </Text>
          </View>
        </View>

        {/* Terms checkbox */}
        <TouchableOpacity 
          style={styles.termsContainer}
          onPress={() => setAccepted(!accepted)}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
            {accepted && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
          </View>
          <Text style={styles.termsText}>
            J'ai lu et j'accepte les termes du contrat
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[
            styles.primaryButton,
            !accepted && styles.primaryButtonDisabled,
          ]}
          onPress={() => navigation.navigate('StarterKit')}
          disabled={!accepted}
        >
          <Ionicons name="create-outline" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>SIGNER LE CONTRAT</Text>
        </TouchableOpacity>
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
  contractCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  contractTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  contractSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  bottomContainer: {
    padding: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

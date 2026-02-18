import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const faqData = [
  {
    id: '1',
    question: 'Comment recevoir des courses ?',
    answer: 'Activez votre disponibilité sur l\'écran d\'accueil. Les courses à proximité vous seront automatiquement proposées.',
    icon: 'bicycle-outline',
  },
  {
    id: '2',
    question: 'Comment me connecter à mon compte ?',
    answer: 'Entrez votre numéro de téléphone et validez avec le code OTP reçu par SMS. Pas de mot de passe nécessaire !',
    icon: 'phone-portrait-outline',
  },
  {
    id: '3',
    question: 'Quand suis-je payé ?',
    answer: 'Vos gains sont disponibles après chaque livraison. Paiement automatique chaque lundi (dès 1000 FCFA). Pour une demande avant le lundi : minimum 5000 FCFA.',
    icon: 'wallet-outline',
  },
  {
    id: '4',
    question: 'Que faire si le client est absent ?',
    answer: 'Utilisez le bouton "Client absent" dans l\'application. Attendez 5 minutes, puis suivez les instructions pour retourner au restaurant ou trouver une solution.',
    icon: 'person-outline',
  },
  {
    id: '5',
    question: 'Comment signaler un problème ?',
    answer: 'Pendant une course, appuyez sur le bouton d\'aide. En cas d\'urgence (accident, santé), utilisez le bouton d\'urgence rouge.',
    icon: 'warning-outline',
  },
  {
    id: '6',
    question: 'Mes documents sont-ils sécurisés ?',
    answer: 'Oui, tous vos documents sont stockés de manière sécurisée et ne sont utilisés que pour la vérification de votre profil.',
    icon: 'shield-checkmark-outline',
  },
];

export default function HelpCenterScreen({ navigation }) {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleContactSupport = () => {
    navigation.navigate('SupportChat');
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+2250787097996');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Centre d'aide</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={handleContactSupport}>
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.primary + '15' }]}>
              <Ionicons name="chatbubbles" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.quickActionText}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={handleCallSupport}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="call" size={24} color="#10B981" />
            </View>
            <Text style={styles.quickActionText}>Appeler</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.contactNumbers}>05 85 67 09 40 / 07 87 09 79 96</Text>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Questions fréquentes</Text>
          <View style={styles.faqList}>
            {faqData.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.faqItem}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.faqHeader}>
                  <View style={styles.faqIcon}>
                    <Ionicons name={item.icon} size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Ionicons 
                    name={expandedId === item.id ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color={COLORS.textSecondary} 
                  />
                </View>
                {expandedId === item.id && (
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Emergency Info */}
        <View style={styles.emergencyCard}>
          <View style={styles.emergencyIcon}>
            <Ionicons name="warning" size={24} color="#EF4444" />
          </View>
          <View style={styles.emergencyContent}>
            <Text style={styles.emergencyTitle}>Urgence ?</Text>
            <Text style={styles.emergencyText}>
              En cas d'accident ou de situation dangereuse, utilisez le bouton d'urgence dans l'application ou appelez le 170.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: COLORS.white, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  title: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: COLORS.text 
  },
  placeholder: { 
    width: 40 
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 32,
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  contactNumbers: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: -16,
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  faqList: {
    gap: 8,
  },
  faqItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  faqIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  faqAnswer: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
    marginLeft: 48,
  },
  emergencyCard: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  emergencyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#991B1B',
    marginBottom: 4,
  },
  emergencyText: {
    fontSize: 13,
    color: '#B91C1C',
    lineHeight: 18,
  },
});

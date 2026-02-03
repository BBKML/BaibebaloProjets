import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import api from '../../api/auth';
import { API_ENDPOINTS } from '../../constants/api';

const PROBLEM_TYPES = [
  { id: 'orders', label: 'Problème avec les commandes', icon: 'receipt-outline' },
  { id: 'payments', label: 'Problème de paiement', icon: 'cash-outline' },
  { id: 'app', label: 'Bug dans l\'application', icon: 'bug-outline' },
  { id: 'account', label: 'Problème de compte', icon: 'person-outline' },
  { id: 'other', label: 'Autre problème', icon: 'help-circle-outline' },
];

export default function ReportProblemScreen({ navigation }) {
  const [selectedType, setSelectedType] = useState(null);
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Erreur', 'Veuillez sélectionner un type de problème');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      Alert.alert('Erreur', 'Veuillez décrire votre problème (minimum 10 caractères)');
      return;
    }

    setLoading(true);
    try {
      // Envoyer le rapport au backend
      const response = await api.post(API_ENDPOINTS.SUPPORT.CREATE_TICKET, {
        type: selectedType,
        description: description.trim(),
        email: email.trim() || undefined,
      });
      
      const ticketNumber = response.data?.data?.ticket?.ticket_number || '';
      
      Alert.alert(
        'Rapport envoyé ✓',
        `Merci pour votre signalement${ticketNumber ? ` (Ticket #${ticketNumber})` : ''}. Notre équipe va examiner votre problème et vous recontactera si nécessaire.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Erreur envoi rapport:', error);
      const errorMessage = error.response?.data?.error?.message || 
                          error.message || 
                          'Impossible d\'envoyer le rapport. Veuillez réessayer.';
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Signaler un problème</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type de problème */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Type de problème *</Text>
          <View style={styles.typesContainer}>
            {PROBLEM_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeButton,
                  selectedType === type.id && styles.typeButtonSelected,
                ]}
                onPress={() => setSelectedType(type.id)}
              >
                <Ionicons
                  name={type.icon}
                  size={24}
                  color={selectedType === type.id ? COLORS.primary : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    selectedType === type.id && styles.typeButtonTextSelected,
                  ]}
                >
                  {type.label}
                </Text>
                {selectedType === type.id && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description du problème *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Décrivez votre problème en détail..."
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={6}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        {/* Email de contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email de contact (optionnel)</Text>
          <TextInput
            style={styles.input}
            placeholder="votre@email.com"
            placeholderTextColor={COLORS.textLight}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Text style={styles.helperText}>
            Nous utiliserons cet email pour vous répondre si nécessaire.
          </Text>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={COLORS.info} />
          <Text style={styles.infoText}>
            Votre rapport sera examiné dans les 24-48 heures. En cas d'urgence, contactez-nous directement.
          </Text>
        </View>
      </ScrollView>

      {/* Bouton envoyer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <Text style={styles.submitButtonText}>Envoi en cours...</Text>
          ) : (
            <>
              <Ionicons name="send" size={20} color={COLORS.white} />
              <Text style={styles.submitButtonText}>Envoyer le rapport</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  typesContainer: {
    gap: 10,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  typeButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  typeButtonText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  typeButtonTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  textArea: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    fontSize: 14,
    color: COLORS.text,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.info + '15',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.info,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

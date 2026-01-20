import React, { useState } from 'react';
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

export default function AccountSecurityScreen({ navigation }) {
  const securityOptions = [
    {
      icon: 'lock-closed-outline',
      label: 'Changer le mot de passe',
      description: 'Mettez à jour votre mot de passe',
      onPress: () => {
        Alert.alert('Info', 'Fonctionnalité à venir');
      },
    },
    {
      icon: 'phone-portrait-outline',
      label: 'Numéro de téléphone',
      description: 'Gérer votre numéro de téléphone',
      onPress: () => {
        Alert.alert('Info', 'Fonctionnalité à venir');
      },
    },
    {
      icon: 'mail-outline',
      label: 'Email',
      description: 'Gérer votre adresse email',
      onPress: () => {
        Alert.alert('Info', 'Fonctionnalité à venir');
      },
    },
    {
      icon: 'finger-print-outline',
      label: 'Authentification à deux facteurs',
      description: 'Ajouter une couche de sécurité supplémentaire',
      onPress: () => {
        Alert.alert('Info', 'Fonctionnalité à venir');
      },
    },
    {
      icon: 'shield-checkmark-outline',
      label: 'Sessions actives',
      description: 'Gérer vos appareils connectés',
      onPress: () => {
        Alert.alert('Info', 'Fonctionnalité à venir');
      },
    },
    {
      icon: 'information-circle-outline',
      label: 'Conseils de sécurité',
      description: 'Découvrez comment protéger votre compte',
      onPress: () => navigation.navigate('SafetySecurityTips'),
    },
  ];

  const safetyTips = [
    'Ne partagez jamais votre mot de passe',
    'Utilisez un mot de passe fort et unique',
    'Activez l\'authentification à deux facteurs',
    'Déconnectez-vous des appareils publics',
    'Signalez toute activité suspecte',
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sécurité du compte</Text>
        <Text style={styles.headerSubtitle}>
          Gérez la sécurité de votre compte BAIBEBALO
        </Text>
      </View>

      {/* Options de sécurité */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paramètres de sécurité</Text>
        {securityOptions.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.optionCard}
            onPress={option.onPress}
          >
            <View style={styles.optionIcon}>
              <Ionicons name={option.icon} size={24} color={COLORS.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionLabel}>{option.label}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Conseils de sécurité */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conseils de sécurité</Text>
        <View style={styles.tipsContainer}>
          {safetyTips.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={COLORS.success}
              />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Supprimer le compte */}
      <View style={styles.dangerSection}>
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={() => {
            Alert.alert(
              'Supprimer le compte',
              'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Supprimer',
                  style: 'destructive',
                  onPress: () => {
                    navigation.navigate('DeleteAccountConfirmation');
                  },
                },
              ]
            );
          }}
        >
          <Ionicons name="trash-outline" size={24} color={COLORS.error} />
          <Text style={styles.dangerButtonText}>Supprimer mon compte</Text>
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
    padding: 24,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  section: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingLeft: 4,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  tipsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  dangerSection: {
    padding: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.error,
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
  },
});

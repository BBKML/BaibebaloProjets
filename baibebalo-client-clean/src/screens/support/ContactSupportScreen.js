import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function ContactSupportScreen({ navigation }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [message, setMessage] = useState('');

  const supportOptions = [
    {
      id: 'chat',
      icon: 'chatbubble-ellipses-outline',
      title: 'Chat en direct',
      description: 'Parlez avec notre équipe en temps réel',
      color: COLORS.primary,
    },
    {
      id: 'email',
      icon: 'mail-outline',
      title: 'Email',
      description: 'support@baibebalo.ci',
      color: COLORS.info,
    },
    {
      id: 'phone',
      icon: 'call-outline',
      title: 'Téléphone',
      description: '+225 XX XX XX XX XX',
      color: COLORS.success,
    },
    {
      id: 'report',
      icon: 'alert-circle-outline',
      title: 'Signaler un problème',
      description: 'Signalez un problème avec votre commande',
      color: COLORS.warning,
    },
  ];

  const handleSelectOption = (option) => {
    setSelectedOption(option);
    if (option.id === 'chat') {
      navigation.navigate('LiveChatSupport');
    } else if (option.id === 'report') {
      navigation.navigate('ReportProblem');
    } else if (option.id === 'phone') {
      // TODO: Implémenter l'appel téléphonique
      Alert.alert('Appel', 'Fonctionnalité d\'appel à venir');
    } else if (option.id === 'email') {
      // TODO: Implémenter l'envoi d'email
      Alert.alert('Email', 'Fonctionnalité d\'email à venir');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contactez-nous</Text>
        <Text style={styles.headerSubtitle}>
          Choisissez votre méthode de contact préférée
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        {supportOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.optionCard}
            onPress={() => handleSelectOption(option)}
          >
            <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
              <Ionicons name={option.icon} size={32} color={option.color} />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>{option.title}</Text>
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

      <View style={styles.quickMessageSection}>
        <Text style={styles.sectionTitle}>Message rapide</Text>
        <TextInput
          style={styles.messageInput}
          placeholder="Décrivez votre problème..."
          placeholderTextColor={COLORS.textLight}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
        />
        <TouchableOpacity style={styles.sendButton}>
          <Text style={styles.sendButtonText}>Envoyer</Text>
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
  optionsContainer: {
    padding: 16,
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  quickMessageSection: {
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  messageInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  sendButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

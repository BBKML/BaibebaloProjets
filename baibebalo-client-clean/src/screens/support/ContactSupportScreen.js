import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function ContactSupportScreen({ navigation }) {
  const supportPhone = '+22500000000';
  const supportEmail = 'support@baibebalo.ci';
  const supportWhatsApp = '+22500000000';

  const supportOptions = [
    {
      id: 'chat',
      icon: 'chatbubble-ellipses',
      title: 'Chat en direct',
      description: 'Réponse moyenne : 2 mins',
      color: COLORS.primary,
      badge: 'Disponible',
    },
    {
      id: 'whatsapp',
      icon: 'logo-whatsapp',
      title: 'WhatsApp Business',
      description: 'Messagerie instantanée',
      color: '#25D366',
    },
    {
      id: 'phone',
      icon: 'call',
      title: 'Appeler le support',
      description: '+225 00 00 00 00',
      color: COLORS.text,
    },
    {
      id: 'email',
      icon: 'mail',
      title: 'Envoyer un Email',
      description: 'Pour les demandes non-urgentes',
      color: COLORS.text,
    },
  ];

  const handleSelectOption = async (option) => {
    if (option.id === 'chat') {
      navigation.navigate('LiveChatSupport');
      return;
    }
    if (option.id === 'whatsapp') {
      const url = `https://wa.me/${supportWhatsApp.replace('+', '')}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('WhatsApp', 'Impossible d\'ouvrir WhatsApp sur cet appareil.');
      }
      return;
    }
    if (option.id === 'phone') {
      const url = `tel:${supportPhone}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Appel', 'Impossible de lancer l\'appel.');
      }
      return;
    }
    if (option.id === 'email') {
      const url = `mailto:${supportEmail}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Email', 'Impossible d\'ouvrir le client email.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Contactez-nous</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="information" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.openBadge}>
            <Ionicons name="time" size={12} color={COLORS.primary} />
            <Text style={styles.openBadgeText}>Ouvert: 08:00 - 20:00</Text>
          </View>
          <Text style={styles.headerTitle}>Comment pouvons-nous vous aider aujourd'hui ?</Text>
          <Text style={styles.headerSubtitle}>
            Nos conseillers BAIBEBALO sont prêts à vous répondre en temps réel.
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {supportOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionCard}
              onPress={() => handleSelectOption(option)}
            >
              <View style={[styles.optionIcon, { backgroundColor: option.color + '15' }]}>
                <Ionicons name={option.icon} size={26} color={option.color} />
              </View>
              <View style={styles.optionInfo}>
                <View style={styles.optionHeader}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  {option.badge && (
                    <View style={styles.statusBadge}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusBadgeText}>{option.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.helpCenterCard}>
          <Text style={styles.helpCenterTitle}>Centre d'aide BAIBEBALO</Text>
          <Text style={styles.helpCenterText}>
            Trouvez des réponses rapides aux questions fréquentes.
          </Text>
          <TouchableOpacity
            style={styles.helpCenterButton}
            onPress={() => navigation.navigate('HelpCenter')}
          >
            <Text style={styles.helpCenterButtonText}>Consulter la FAQ</Text>
            <Ionicons name="open-outline" size={14} color={COLORS.primary} />
          </TouchableOpacity>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary + '12',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  openBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionInfo: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary + '12',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  helpCenterCard: {
    marginTop: 24,
    backgroundColor: COLORS.primary + '08',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.primary + '15',
    alignItems: 'center',
  },
  helpCenterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  helpCenterText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  helpCenterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  helpCenterButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function SafetySecurityTipsScreen({ navigation }) {
  const tips = [
    {
      icon: 'lock-closed',
      title: 'Protégez votre mot de passe',
      description: 'Ne partagez jamais votre mot de passe avec qui que ce soit. Utilisez un mot de passe fort et unique.',
    },
    {
      icon: 'shield-checkmark',
      title: 'Activez l\'authentification à deux facteurs',
      description: 'Ajoutez une couche de sécurité supplémentaire à votre compte en activant la 2FA.',
    },
    {
      icon: 'log-out',
      title: 'Déconnectez-vous des appareils publics',
      description: 'Toujours vous déconnecter après avoir utilisé l\'application sur un appareil partagé.',
    },
    {
      icon: 'eye-off',
      title: 'Vérifiez les permissions',
      description: 'Vérifiez régulièrement les permissions accordées à l\'application dans les paramètres de votre appareil.',
    },
    {
      icon: 'warning',
      title: 'Signalez les activités suspectes',
      description: 'Si vous remarquez une activité suspecte sur votre compte, contactez immédiatement le support.',
    },
    {
      icon: 'refresh',
      title: 'Mettez à jour régulièrement',
      description: 'Gardez l\'application à jour pour bénéficier des dernières corrections de sécurité.',
    },
    {
      icon: 'mail',
      title: 'Vérifiez vos emails',
      description: 'Vérifiez régulièrement vos emails pour les notifications de sécurité et les changements de compte.',
    },
    {
      icon: 'link',
      title: 'Évitez les liens suspects',
      description: 'Ne cliquez jamais sur des liens suspects reçus par email ou SMS, même s\'ils semblent provenir de BAIBEBALO.',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conseils de sécurité</Text>
        <Text style={styles.headerSubtitle}>
          Protégez votre compte et vos données personnelles
        </Text>
      </View>

      <View style={styles.tipsContainer}>
        {tips.map((tip, index) => (
          <View key={index} style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons name={tip.icon} size={32} color={COLORS.primary} />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipDescription}>{tip.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerBox}>
          <Ionicons name="shield-checkmark" size={24} color={COLORS.success} />
          <Text style={styles.footerText}>
            Votre sécurité est notre priorité. En suivant ces conseils, vous protégez votre compte et vos données.
          </Text>
        </View>
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
  tipsContainer: {
    padding: 16,
    gap: 12,
  },
  tipCard: {
    flexDirection: 'row',
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
  tipIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  tipDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    marginBottom: 32,
  },
  footerBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.success + '20',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  footerText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
});

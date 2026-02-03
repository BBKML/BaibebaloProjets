import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { COLORS } from '../../constants/colors';

export default function PrivacyPolicyScreen({ navigation }) {
  const sections = [
    {
      title: '1. Collecte des informations',
      content:
        'Nous collectons les informations que vous nous fournissez directement, notamment votre nom, numéro de téléphone, adresse email, et adresse de livraison.',
    },
    {
      title: '2. Utilisation des informations',
      content:
        'Nous utilisons vos informations pour traiter vos commandes, améliorer nos services, vous contacter concernant vos commandes, et vous envoyer des communications marketing (avec votre consentement).',
    },
    {
      title: '3. Partage des informations',
      content:
        'Nous ne vendons pas vos informations personnelles. Nous pouvons partager vos informations avec nos partenaires de livraison et nos restaurants uniquement dans le cadre de l\'exécution de vos commandes.',
    },
    {
      title: '4. Sécurité des données',
      content:
        'Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos informations personnelles contre tout accès non autorisé, altération, divulgation ou destruction.',
    },
    {
      title: '5. Vos droits',
      content:
        'Vous avez le droit d\'accéder, de modifier, de supprimer vos informations personnelles, et de vous opposer au traitement de vos données. Contactez-nous pour exercer ces droits.',
    },
    {
      title: '6. Cookies',
      content:
        'Nous utilisons des cookies pour améliorer votre expérience sur notre application. Vous pouvez désactiver les cookies dans les paramètres de votre appareil.',
    },
    {
      title: '7. Modifications',
      content:
        'Nous pouvons modifier cette politique de confidentialité à tout moment. Les modifications seront publiées sur cette page avec une date de mise à jour.',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Conditions & Confidentialité</Text>
        <View style={styles.topBarSpacer} />
      </View>
      <View style={styles.progress} />

      <ScrollView style={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>§</Text>
          </View>
          <Text style={styles.headerTitle}>Aspects Juridiques</Text>
          <Text style={styles.headerDate}>Dernière mise à jour : 24 Mai 2024</Text>
        </View>

        <View style={styles.intro}>
          <Text style={styles.introText}>
            Bienvenue sur <Text style={styles.highlight}>BAIBEBALO</Text>. En utilisant
            notre service, vous acceptez les présentes conditions.
          </Text>
        </View>

        {sections.map((section, index) => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{String(index + 1).padStart(2, '0')}</Text>
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Questions ?</Text>
          <Text style={styles.contactText}>
            Contactez-nous : support@baibebalo.ci
          </Text>
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.declineButton}>
          <Text style={styles.declineText}>Refuser</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptButton}>
          <Text style={styles.acceptText}>J'accepte</Text>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 18,
    color: COLORS.text,
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  topBarSpacer: {
    width: 36,
  },
  progress: {
    height: 2,
    backgroundColor: COLORS.border,
  },
  scroll: {
    flex: 1,
  },
  header: {
    padding: 24,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerIconText: {
    fontSize: 20,
    color: COLORS.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  intro: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  introText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  highlight: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionBadge: {
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionContent: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  contactSection: {
    padding: 24,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  contactText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  declineText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  acceptButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  acceptText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
});

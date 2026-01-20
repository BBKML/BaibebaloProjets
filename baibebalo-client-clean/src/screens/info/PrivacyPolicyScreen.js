import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Politique de confidentialité</Text>
        <Text style={styles.headerDate}>Dernière mise à jour: 15 janvier 2024</Text>
      </View>

      <View style={styles.intro}>
        <Text style={styles.introText}>
          Chez BAIBEBALO, nous nous engageons à protéger votre vie privée.
          Cette politique explique comment nous collectons, utilisons et
          protégeons vos informations personnelles.
        </Text>
      </View>

      {sections.map((section, index) => (
        <View key={index} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionContent}>{section.content}</Text>
        </View>
      ))}

      <View style={styles.contactSection}>
        <Text style={styles.contactTitle}>Questions ?</Text>
        <Text style={styles.contactText}>
          Si vous avez des questions concernant cette politique de
          confidentialité, contactez-nous à : support@baibebalo.ci
        </Text>
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
  headerDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  intro: {
    padding: 24,
    backgroundColor: COLORS.white,
    marginTop: 8,
  },
  introText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  section: {
    padding: 24,
    backgroundColor: COLORS.white,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  contactSection: {
    padding: 24,
    backgroundColor: COLORS.white,
    marginTop: 8,
    marginBottom: 32,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  contactText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
});

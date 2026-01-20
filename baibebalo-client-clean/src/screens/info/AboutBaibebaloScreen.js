import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function AboutBaibebaloScreen({ navigation }) {
  const handleOpenLink = (url) => {
    Linking.openURL(url).catch((err) =>
      console.error('Erreur lors de l\'ouverture du lien:', err)
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>BAIBEBALO</Text>
        </View>
        <Text style={styles.tagline}>
          Vos plats préférés livrés chez vous
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>À propos</Text>
        <Text style={styles.sectionText}>
          BAIBEBALO est une plateforme de livraison de repas qui connecte
          les clients aux meilleurs restaurants de Côte d'Ivoire. Notre mission
          est de rendre la nourriture de qualité accessible à tous, rapidement
          et facilement.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Version</Text>
        <Text style={styles.versionText}>1.0.0</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        <TouchableOpacity
          style={styles.contactItem}
          onPress={() => handleOpenLink('mailto:support@baibebalo.ci')}
        >
          <Ionicons name="mail-outline" size={24} color={COLORS.primary} />
          <Text style={styles.contactText}>support@baibebalo.ci</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.contactItem}
          onPress={() => handleOpenLink('tel:+225XXXXXXXXX')}
        >
          <Ionicons name="call-outline" size={24} color={COLORS.primary} />
          <Text style={styles.contactText}>+225 XX XX XX XX XX</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suivez-nous</Text>
        <View style={styles.socialContainer}>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleOpenLink('https://facebook.com/baibebalo')}
          >
            <Ionicons name="logo-facebook" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleOpenLink('https://instagram.com/baibebalo')}
          >
            <Ionicons name="logo-instagram" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleOpenLink('https://twitter.com/baibebalo')}
          >
            <Ionicons name="logo-twitter" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2024 BAIBEBALO. Tous droits réservés.
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
    padding: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.white + 'CC',
    textAlign: 'center',
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
  sectionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  versionText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  contactText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

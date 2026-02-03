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
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>À propos</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <View style={styles.brandSection}>
        <View style={styles.logoBadge}>
          <Ionicons name="bicycle" size={36} color={COLORS.white} />
        </View>
        <Text style={styles.logo}>BAIBEBALO</Text>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>

      <View style={styles.missionCard}>
        <Text style={styles.missionTitle}>Notre mission</Text>
        <Text style={styles.missionText}>
          BAIBEBALO est votre plateforme tout‑en‑un pour la livraison et les services
          locaux, pensée pour le marché ivoirien. Nous connectons les meilleurs
          services à votre porte.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connectez‑vous avec nous</Text>
        <TouchableOpacity
          style={styles.contactItem}
          onPress={() => handleOpenLink('https://baibebalo.ci')}
        >
          <View style={styles.contactIcon}>
            <Ionicons name="globe-outline" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.contactText}>Site officiel</Text>
          <Ionicons name="open-outline" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.contactItem}
          onPress={() => handleOpenLink('https://facebook.com/baibebalo')}
        >
          <View style={styles.contactIcon}>
            <Ionicons name="logo-facebook" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.contactText}>Facebook</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.contactItem}
          onPress={() => handleOpenLink('https://instagram.com/baibebalo')}
        >
          <View style={styles.contactIcon}>
            <Ionicons name="logo-instagram" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.contactText}>Instagram</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  topBarSpacer: {
    width: 40,
  },
  brandSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  logoBadge: {
    width: 90,
    height: 90,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logo: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  versionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  missionCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  missionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  missionText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
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

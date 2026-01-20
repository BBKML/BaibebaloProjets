import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function AppMaintenanceScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="construct" size={80} color={COLORS.warning} />
        </View>
        <Text style={styles.title}>Maintenance en cours</Text>
        <Text style={styles.message}>
          BAIBEBALO est actuellement en maintenance pour améliorer votre expérience.
        </Text>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={COLORS.info} />
          <Text style={styles.infoText}>
            Nous serons de retour très bientôt. Merci de votre patience.
          </Text>
        </View>
        <View style={styles.detailsBox}>
          <Text style={styles.detailsTitle}>Détails de la maintenance :</Text>
          <Text style={styles.detailsText}>• Amélioration des performances</Text>
          <Text style={styles.detailsText}>• Mise à jour des fonctionnalités</Text>
          <Text style={styles.detailsText}>• Correction de bugs</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.info + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  detailsBox: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  detailsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
});

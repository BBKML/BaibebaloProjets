import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function UpdateRequiredScreen({ navigation }) {
  const handleUpdate = () => {
    // Ouvrir le store approprié
    const storeUrl = Platform.OS === 'ios'
      ? 'https://apps.apple.com/app/baibebalo'
      : 'https://play.google.com/store/apps/details?id=com.baibebalo.app';
    
    Linking.openURL(storeUrl).catch((err) =>
      console.error('Erreur lors de l\'ouverture du store:', err)
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="download" size={80} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Mise à jour requise</Text>
        <Text style={styles.message}>
          Une nouvelle version de BAIBEBALO est disponible. Veuillez mettre à jour l'application pour continuer à utiliser nos services.
        </Text>
        <View style={styles.featuresBox}>
          <Text style={styles.featuresTitle}>Nouvelles fonctionnalités :</Text>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.featureText}>Amélioration des performances</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.featureText}>Nouvelles fonctionnalités</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.featureText}>Corrections de bugs</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
          <Ionicons name="arrow-down-circle" size={24} color={COLORS.white} />
          <Text style={styles.updateButtonText}>Mettre à jour maintenant</Text>
        </TouchableOpacity>
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
  featuresBox: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    width: '100%',
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  updateButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

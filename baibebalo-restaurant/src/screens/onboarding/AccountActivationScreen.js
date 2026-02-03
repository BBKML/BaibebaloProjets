import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';

export default function AccountActivationScreen({ navigation }) {
  const { updateRestaurant } = useAuthStore();
  const insets = useSafeAreaInsets();

  const handleActivate = () => {
    // Mettre à jour le statut du restaurant
    updateRestaurant({ isActive: true, isOnboarded: true });
    // Navigation sera gérée automatiquement par le navigateur
  };

  const handleSkip = () => {
    // Permettre de passer cette étape pour l'instant
    updateRestaurant({ isOnboarded: true });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={100} color={COLORS.success} />
        </View>

        <Text style={styles.title}>Compte activé avec succès !</Text>

        <Text style={styles.description}>
          Bienvenue sur BAIBEBALO. Vous pouvez maintenant créer votre menu et commencer à recevoir des commandes.
        </Text>

        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <Text style={styles.featureText}>Gérer votre menu</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <Text style={styles.featureText}>Recevoir des commandes</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <Text style={styles.featureText}>Suivre vos performances</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <Text style={styles.featureText}>Gérer vos finances</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.activateButton} onPress={handleActivate}>
          <Text style={styles.activateButtonText}>Créer mon menu</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Passer cette étape pour l'instant</Text>
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
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  featuresList: {
    width: '100%',
    marginBottom: 32,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: COLORS.text,
  },
  activateButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  activateButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
});

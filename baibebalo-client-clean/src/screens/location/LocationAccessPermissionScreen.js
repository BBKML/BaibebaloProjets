import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS } from '../../constants/colors';

export default function LocationAccessPermissionScreen({ navigation, route }) {
  const { onPermissionGranted } = route.params || {};
  const [loading, setLoading] = useState(false);

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        if (onPermissionGranted) {
          onPermissionGranted();
        }
        navigation.goBack();
      } else {
        Alert.alert(
          'Permission refusée',
          'Pour utiliser cette fonctionnalité, vous devez autoriser l\'accès à la localisation. Vous pouvez l\'activer dans les paramètres de votre appareil.',
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Ouvrir les paramètres',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de demander la permission');
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    {
      icon: 'location',
      title: 'Livraison précise',
      description: 'Trouvez votre adresse plus rapidement',
    },
    {
      icon: 'restaurant',
      title: 'Restaurants proches',
      description: 'Découvrez les restaurants à proximité',
    },
    {
      icon: 'time',
      title: 'Temps de livraison',
      description: 'Estimation précise du temps de livraison',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icône */}
        <View style={styles.iconContainer}>
          <Ionicons name="location" size={80} color={COLORS.primary} />
        </View>

        {/* Titre */}
        <Text style={styles.title}>Autoriser la localisation</Text>
        <Text style={styles.subtitle}>
          BAIBEBALO a besoin de votre localisation pour améliorer votre expérience
        </Text>

        {/* Avantages */}
        <View style={styles.benefitsContainer}>
          {benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name={benefit.icon} size={24} color={COLORS.primary} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDescription}>{benefit.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Information */}
        <View style={styles.infoBox}>
          <Ionicons name="lock-closed" size={20} color={COLORS.info} />
          <Text style={styles.infoText}>
            Votre localisation est utilisée uniquement pour améliorer nos services.
            Nous ne partageons jamais vos données de localisation.
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.skipButtonText}>Passer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.allowButton, loading && styles.allowButtonDisabled]}
          onPress={handleRequestPermission}
          disabled={loading}
        >
          <Text style={styles.allowButtonText}>
            {loading ? 'Demande en cours...' : 'Autoriser'}
          </Text>
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  benefitsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.info + '20',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  skipButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  allowButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  allowButtonDisabled: {
    opacity: 0.5,
  },
  allowButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});

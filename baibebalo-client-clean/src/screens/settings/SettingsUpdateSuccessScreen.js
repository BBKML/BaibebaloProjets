import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function SettingsUpdateSuccessScreen({ navigation, route }) {
  const { message, onContinue } = route.params || {};

  useEffect(() => {
    // Auto-fermer après 3 secondes
    const timer = setTimeout(() => {
      if (onContinue) {
        onContinue();
      } else {
        navigation.goBack();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Paramètres</Text>
        <View style={styles.iconButtonPlaceholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.illustration}>
          <View style={styles.illustrationGlow} />
          <View style={styles.illustrationCircle}>
            <View style={styles.illustrationInner}>
              <Ionicons name="checkmark-circle" size={56} color={COLORS.success} />
            </View>
          </View>
          <View style={styles.dotTop} />
          <View style={styles.squareLeft} />
        </View>

        <Text style={styles.title}>Succès !</Text>
        <Text style={styles.message}>
          {message || 'Vos paramètres ont été mis à jour avec succès. L\'application est maintenant synchronisée.'}
        </Text>

        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continuer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Text style={styles.closeButtonText}>Fermer</Text>
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPlaceholder: {
    width: 40,
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  illustration: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  illustrationGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.success + '10',
  },
  illustrationCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.success + '20',
  },
  illustrationInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.success + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotTop: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary + '60',
  },
  squareLeft: {
    position: 'absolute',
    bottom: 20,
    left: -12,
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.success + '40',
    transform: [{ rotate: '12deg' }],
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  continueButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    marginTop: 12,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
  },
});

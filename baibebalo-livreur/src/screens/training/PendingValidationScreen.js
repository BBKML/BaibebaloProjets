import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import { getCheckStatus } from '../../api/delivery';

const steps = [
  { id: 1, label: 'Informations personnelles', completed: true },
  { id: 2, label: 'Documents uploadés', completed: true },
  { id: 3, label: 'Vérification en cours (24-48h)', current: true },
  { id: 4, label: 'Formation', pending: true },
  { id: 5, label: 'Activation', pending: true },
];

export default function PendingValidationScreen({ navigation }) {
  const [checking, setChecking] = useState(false);
  const { setPendingRegistration, login, logout } = useAuthStore();

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const token = await AsyncStorage.getItem('delivery_token');
      if (!token) {
        setChecking(false);
        Alert.alert(
          'Inscription non active',
          'Réessayez plus tard ou reconnectez-vous pour vérifier votre statut.',
          [
            { text: 'OK' },
            {
              text: 'Se reconnecter',
              onPress: async () => {
                await setPendingRegistration(false);
                await logout();
                navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
              },
            },
          ]
        );
        return;
      }

      const res = await getCheckStatus();
      const { status, delivery_person } = res.data || {};

      if (status === 'active' && delivery_person) {
        await setPendingRegistration(false);
        await login(delivery_person, token);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
        return;
      }

      Alert.alert(
        'Inscription non active',
        'Votre compte n\'est pas encore validé. Réessayez plus tard.'
      );
    } catch (error) {
      console.error('Error checking status:', error);
      Alert.alert(
        'Inscription non active',
        'Votre compte n\'est pas encore validé. Réessayez plus tard.'
      );
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await setPendingRegistration(false);
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="time-outline" size={64} color={COLORS.primary} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Dossier en cours de validation</Text>
        <Text style={styles.subtitle}>
          Notre équipe vérifie vos documents. Cela prend généralement 24 à 48 heures.
        </Text>

        {/* Timeline */}
        <View style={styles.timeline}>
          {steps.map((step, index) => (
            <View key={step.id} style={styles.timelineItem}>
              <View style={styles.timelineIndicator}>
                <View style={[
                  styles.timelineDot,
                  step.completed && styles.timelineDotCompleted,
                  step.current && styles.timelineDotCurrent,
                  step.pending && styles.timelineDotPending,
                ]}>
                  {step.completed && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                  {step.current && (
                    <View style={styles.currentDotInner} />
                  )}
                </View>
                {index < steps.length - 1 && (
                  <View style={[
                    styles.timelineLine,
                    step.completed && styles.timelineLineCompleted,
                  ]} />
                )}
              </View>
              <Text style={[
                styles.timelineText,
                step.completed && styles.timelineTextCompleted,
                step.current && styles.timelineTextCurrent,
                step.pending && styles.timelineTextPending,
              ]}>
                {step.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="notifications-outline" size={24} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Vous recevrez une notification dès que votre dossier sera validé
          </Text>
        </View>
      </View>

      {/* Bottom */}
      <View style={styles.bottomContainer}>
        {/* Bouton Vérifier le statut */}
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={handleCheckStatus}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Vérifier mon statut</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Bouton Se déconnecter */}
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.primary} />
          <Text style={styles.secondaryButtonText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 40,
  },
  timeline: {
    width: '100%',
    paddingLeft: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  timelineIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: COLORS.primary,
  },
  timelineDotCurrent: {
    backgroundColor: COLORS.white,
    borderWidth: 3,
    borderColor: COLORS.warning,
  },
  currentDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.warning,
  },
  timelineDotPending: {
    backgroundColor: COLORS.border,
  },
  timelineLine: {
    width: 2,
    height: 32,
    backgroundColor: COLORS.border,
  },
  timelineLineCompleted: {
    backgroundColor: COLORS.primary,
  },
  timelineText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
    flex: 1,
  },
  timelineTextCompleted: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  timelineTextCurrent: {
    color: COLORS.warning,
    fontWeight: '600',
  },
  timelineTextPending: {
    color: COLORS.textLight,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginTop: 32,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.primary,
    lineHeight: 20,
  },
  bottomContainer: {
    padding: 24,
    paddingBottom: 32,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

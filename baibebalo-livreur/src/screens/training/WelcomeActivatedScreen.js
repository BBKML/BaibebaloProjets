import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';

export default function WelcomeActivatedScreen({ navigation }) {
  const { user, setIsActivated } = useAuthStore();

  const handleStart = async () => {
    await setIsActivated(true);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.content}>
        {/* Confetti decoration */}
        <View style={styles.confettiContainer}>
          <Text style={styles.confetti}>🎉</Text>
        </View>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {user?.profile_photo ? (
            <Image source={{ uri: user.profile_photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={48} color={COLORS.primary} />
            </View>
          )}
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Bienvenue dans l'équipe!</Text>
        <Text style={styles.subtitle}>
          Votre compte est maintenant actif. Vous pouvez commencer à livrer et gagner de l'argent.
        </Text>

        {/* Badge */}
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <Ionicons name="ribbon" size={20} color={COLORS.warning} />
            <Text style={styles.badgeText}>Nouveau Livreur</Text>
          </View>
        </View>

        {/* Stats preview */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0 F</Text>
            <Text style={styles.statLabel}>Gains</Text>
          </View>
        </View>
      </View>

      {/* Bottom */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={handleStart}
        >
          <Ionicons name="bicycle" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>COMMENCER À LIVRER</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confettiContainer: {
    position: 'absolute',
    top: 60,
  },
  confetti: {
    fontSize: 48,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  checkBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  badgeContainer: {
    marginBottom: 32,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 20,
  },
  bottomContainer: {
    padding: 24,
    paddingBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

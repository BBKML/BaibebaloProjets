import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function QuizResultScreen({ navigation, route }) {
  const { score = 18, total = 20, passed = true } = route.params || {};
  const percentage = Math.round((score / total) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.content}>
        {/* Icon */}
        <View style={[
          styles.iconContainer,
          passed ? styles.iconContainerSuccess : styles.iconContainerFail
        ]}>
          <Ionicons 
            name={passed ? 'trophy' : 'refresh'} 
            size={64} 
            color={passed ? COLORS.success : COLORS.error} 
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {passed ? 'Félicitations!' : 'Pas encore...'}
        </Text>
        
        {/* Score */}
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreValue}>{score}/{total}</Text>
          <Text style={styles.scorePercent}>({percentage}%)</Text>
        </View>

        {/* Message */}
        <Text style={styles.message}>
          {passed 
            ? 'Vous avez réussi le quiz de certification. Vous pouvez maintenant télécharger votre certificat et continuer le processus.'
            : 'Il faut 80% pour réussir. Révisez les modules et réessayez!'
          }
        </Text>

        {/* Certificate button (if passed) */}
        {passed && (
          <TouchableOpacity style={styles.certificateButton}>
            <Ionicons name="download-outline" size={20} color={COLORS.primary} />
            <Text style={styles.certificateButtonText}>TÉLÉCHARGER LE CERTIFICAT</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom */}
      <View style={styles.bottomContainer}>
        {passed ? (
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.navigate('ContractSigning')}
          >
            <Text style={styles.primaryButtonText}>CONTINUER</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('TrainingModules')}
            >
              <Ionicons name="book-outline" size={20} color={COLORS.primary} />
              <Text style={styles.secondaryButtonText}>REVOIR LES MODULES</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => navigation.replace('CertificationQuiz')}
            >
              <Text style={styles.primaryButtonText}>RÉESSAYER LE QUIZ</Text>
            </TouchableOpacity>
          </>
        )}
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
    justifyContent: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconContainerSuccess: {
    backgroundColor: COLORS.success + '15',
  },
  iconContainerFail: {
    backgroundColor: COLORS.error + '15',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scorePercent: {
    fontSize: 24,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  certificateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  certificateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  bottomContainer: {
    padding: 24,
    paddingBottom: 32,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

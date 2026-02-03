import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const modules = [
  {
    id: 1,
    icon: 'phone-portrait-outline',
    title: 'Utilisation de l\'application',
    duration: '10 minutes',
    completed: false,
    locked: false,
  },
  {
    id: 2,
    icon: 'people-outline',
    title: 'Standards de service',
    duration: '10 minutes',
    completed: false,
    locked: true,
  },
  {
    id: 3,
    icon: 'car-outline',
    title: 'Sécurité routière',
    duration: '10 minutes',
    completed: false,
    locked: true,
  },
  {
    id: 4,
    icon: 'shield-checkmark-outline',
    title: 'Hygiène et qualité',
    duration: '5 minutes',
    completed: false,
    locked: true,
  },
];

export default function TrainingModulesScreen({ navigation }) {
  const [moduleList, setModuleList] = useState(modules);
  
  const completedCount = moduleList.filter(m => m.completed).length;
  const progressPercent = (completedCount / moduleList.length) * 100;

  const handleStartModule = (module) => {
    if (module.locked) return;
    navigation.navigate('TrainingModuleDetail', { moduleId: module.id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Formation obligatoire</Text>
          <Text style={styles.subtitle}>
            Complétez tous les modules pour commencer à livrer
          </Text>
        </View>

        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progression</Text>
            <Text style={styles.progressText}>{completedCount}/{moduleList.length} modules</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* Modules List */}
        <View style={styles.modulesList}>
          {moduleList.map((module, index) => (
            <TouchableOpacity
              key={module.id}
              style={[
                styles.moduleCard,
                module.completed && styles.moduleCardCompleted,
                module.locked && styles.moduleCardLocked,
              ]}
              onPress={() => handleStartModule(module)}
              disabled={module.locked}
            >
              <View style={[
                styles.moduleIcon,
                module.completed && styles.moduleIconCompleted,
                module.locked && styles.moduleIconLocked,
              ]}>
                <Ionicons 
                  name={module.icon} 
                  size={24} 
                  color={module.completed ? '#FFFFFF' : module.locked ? COLORS.textLight : COLORS.primary} 
                />
              </View>

              <View style={styles.moduleContent}>
                <Text style={[
                  styles.moduleTitle,
                  module.locked && styles.moduleTitleLocked,
                ]}>
                  {module.title}
                </Text>
                <Text style={styles.moduleDuration}>Durée: {module.duration}</Text>
              </View>

              <View style={styles.moduleAction}>
                {module.completed ? (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                ) : module.locked ? (
                  <Ionicons name="lock-closed" size={20} color={COLORS.textLight} />
                ) : (
                  <TouchableOpacity style={styles.startButton}>
                    <Text style={styles.startButtonText}>COMMENCER</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quiz Section */}
        {completedCount === moduleList.length && (
          <View style={styles.quizCard}>
            <Ionicons name="school" size={32} color={COLORS.primary} />
            <Text style={styles.quizTitle}>Prêt pour le quiz?</Text>
            <Text style={styles.quizSubtitle}>
              Validez vos connaissances avec un quiz de 20 questions
            </Text>
            <TouchableOpacity 
              style={styles.quizButton}
              onPress={() => navigation.navigate('CertificationQuiz')}
            >
              <Text style={styles.quizButtonText}>PASSER LE QUIZ</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  progressCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  modulesList: {
    gap: 12,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  moduleCardCompleted: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  moduleCardLocked: {
    opacity: 0.6,
  },
  moduleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  moduleIconCompleted: {
    backgroundColor: COLORS.primary,
  },
  moduleIconLocked: {
    backgroundColor: COLORS.border,
  },
  moduleContent: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  moduleTitleLocked: {
    color: COLORS.textLight,
  },
  moduleDuration: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  moduleAction: {
    marginLeft: 12,
  },
  completedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quizCard: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  quizTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 8,
  },
  quizSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  quizButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  quizButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

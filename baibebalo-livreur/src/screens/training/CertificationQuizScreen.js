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

const quizQuestions = [
  {
    id: 1,
    question: 'Que faire à l\'arrivée au restaurant?',
    options: [
      'Entrer directement et prendre la commande',
      'Signaler votre arrivée dans l\'application',
      'Appeler le client',
      'Attendre dehors sans rien faire',
    ],
    correct: 1,
  },
  {
    id: 2,
    question: 'Combien de temps devez-vous attendre si le client ne répond pas?',
    options: ['5 minutes', '10 minutes', '15 minutes', '20 minutes'],
    correct: 1,
  },
  // Add more questions as needed
];

export default function CertificationQuizScreen({ navigation }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answers, setAnswers] = useState([]);

  const question = quizQuestions[currentQuestion];
  const progressPercent = ((currentQuestion + 1) / quizQuestions.length) * 100;

  const handleSelectAnswer = (index) => {
    setSelectedAnswer(index);
  };

  const handleNext = () => {
    if (selectedAnswer === null) return;

    const newAnswers = [...answers, selectedAnswer];
    setAnswers(newAnswers);

    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      // Calculate score
      const score = newAnswers.reduce((acc, answer, index) => {
        return acc + (answer === quizQuestions[index].correct ? 1 : 0);
      }, 0);
      const percentage = (score / quizQuestions.length) * 100;
      
      navigation.replace('QuizResult', { 
        score, 
        total: quizQuestions.length,
        passed: percentage >= 80,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quiz de certification</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Question {currentQuestion + 1}/{quizQuestions.length}
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Question */}
        <View style={styles.questionCard}>
          <Text style={styles.questionNumber}>Question {currentQuestion + 1}</Text>
          <Text style={styles.questionText}>{question.question}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsList}>
          {question.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionCard,
                selectedAnswer === index && styles.optionCardSelected,
              ]}
              onPress={() => handleSelectAnswer(index)}
            >
              <View style={[
                styles.optionRadio,
                selectedAnswer === index && styles.optionRadioSelected,
              ]}>
                {selectedAnswer === index && (
                  <View style={styles.optionRadioInner} />
                )}
              </View>
              <Text style={[
                styles.optionText,
                selectedAnswer === index && styles.optionTextSelected,
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[
            styles.primaryButton,
            selectedAnswer === null && styles.primaryButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={selectedAnswer === null}
        >
          <Text style={styles.primaryButtonText}>
            {currentQuestion < quizQuestions.length - 1 ? 'QUESTION SUIVANTE' : 'TERMINER'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  questionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 26,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioSelected: {
    borderColor: COLORS.primary,
  },
  optionRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  bottomContainer: {
    padding: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
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
  primaryButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

// Questions d'exemple - À remplacer par les vraies questions
const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: 'Quel est le délai maximum pour répondre à une nouvelle commande ?',
    options: [
      '5 minutes',
      '2 minutes',
      '10 minutes',
      '15 minutes',
    ],
    correctAnswer: 1,
  },
  {
    id: 2,
    question: 'Quel est le taux de commission de la plateforme ?',
    options: [
      '10-15%',
      '15-20%',
      '20-25%',
      '25-30%',
    ],
    correctAnswer: 1,
  },
  {
    id: 3,
    question: 'Que devez-vous faire si vous ne pouvez pas honorer une commande ?',
    options: [
      'Ignorer la commande',
      'Refuser avec un motif valide',
      'Attendre que le client annule',
      'Accepter quand même',
    ],
    correctAnswer: 1,
  },
  {
    id: 4,
    question: 'Quand êtes-vous payé pour vos commandes ?',
    options: [
      'Immédiatement',
      'Hebdomadaire',
      'Mensuel',
      'Trimestriel',
    ],
    correctAnswer: 1,
  },
  {
    id: 5,
    question: 'Quelle est la note minimale recommandée pour maintenir votre visibilité ?',
    options: [
      '3.0/5',
      '3.5/5',
      '4.0/5',
      '4.5/5',
    ],
    correctAnswer: 2,
  },
];

const MIN_SCORE = 80; // 80% minimum

export default function QualificationQuizScreen({ navigation }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const insets = useSafeAreaInsets();

  const handleAnswer = (questionId, answerIndex) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answerIndex,
    }));
  };

  const handleNext = () => {
    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateScore();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    QUIZ_QUESTIONS.forEach((question) => {
      if (answers[question.id] === question.correctAnswer) {
        correct++;
      }
    });

    const score = (correct / QUIZ_QUESTIONS.length) * 100;
    setShowResults(true);

    if (score >= MIN_SCORE) {
      // Quiz réussi
      setTimeout(() => {
        navigation.navigate('AccountActivation');
      }, 2000);
    }
  };

  const retakeQuiz = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
  };

  if (showResults) {
    const correct = QUIZ_QUESTIONS.filter(
      (q) => answers[q.id] === q.correctAnswer
    ).length;
    const score = (correct / QUIZ_QUESTIONS.length) * 100;
    const passed = score >= MIN_SCORE;

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.resultsContainer}>
          <View style={[styles.iconContainer, passed && styles.iconContainerSuccess]}>
            <Ionicons
              name={passed ? 'checkmark-circle' : 'close-circle'}
              size={80}
              color={passed ? COLORS.success : COLORS.error}
            />
          </View>

          <Text style={styles.resultsTitle}>
            {passed ? 'Félicitations !' : 'Score insuffisant'}
          </Text>

          <View style={styles.scoreContainer}>
            <Text style={styles.scoreValue}>{score.toFixed(0)}%</Text>
            <Text style={styles.scoreLabel}>
              {correct} / {QUIZ_QUESTIONS.length} bonnes réponses
            </Text>
          </View>

          {passed ? (
            <Text style={styles.resultsMessage}>
              Vous pouvez maintenant activer votre compte et commencer à recevoir des commandes !
            </Text>
          ) : (
            <>
              <Text style={styles.resultsMessage}>
                Score minimum requis : {MIN_SCORE}%{'\n'}
                Veuillez revoir la formation et réessayer.
              </Text>
              <TouchableOpacity style={styles.retakeButton} onPress={retakeQuiz}>
                <Text style={styles.retakeButtonText}>Réessayer</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  const question = QUIZ_QUESTIONS[currentQuestion];
  const selectedAnswer = answers[question.id];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Quiz de Validation</Text>
        <Text style={styles.progressText}>
          Question {currentQuestion + 1} / {QUIZ_QUESTIONS.length}
        </Text>
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100}%` },
          ]}
        />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{question.question}</Text>
        </View>

        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.option,
                selectedAnswer === index && styles.optionSelected,
              ]}
              onPress={() => handleAnswer(question.id, index)}
            >
              <View
                style={[
                  styles.radioButton,
                  selectedAnswer === index && styles.radioButtonSelected,
                ]}
              >
                {selectedAnswer === index && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
              <Text
                style={[
                  styles.optionText,
                  selectedAnswer === index && styles.optionTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          {currentQuestion > 0 && (
            <TouchableOpacity
              style={styles.previousButton}
              onPress={handlePrevious}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
              <Text style={styles.previousButtonText}>Précédent</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.nextButton,
              selectedAnswer === undefined && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={selectedAnswer === undefined}
          >
            <Text style={styles.nextButtonText}>
              {currentQuestion === QUIZ_QUESTIONS.length - 1
                ? 'Terminer'
                : 'Suivant'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  questionContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 26,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 12,
  },
  optionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  footer: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  previousButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  previousButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    gap: 8,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconContainerSuccess: {
    // Pas de style supplémentaire nécessaire
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  resultsMessage: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retakeButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  retakeButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

const TRAINING_SECTIONS = [
  {
    id: 1,
    title: 'Fonctionnement de la plateforme',
    completed: false,
  },
  {
    id: 2,
    title: 'Gestion des commandes',
    completed: false,
  },
  {
    id: 3,
    title: 'Standards de qualité',
    completed: false,
  },
  {
    id: 4,
    title: 'Emballage et préparation',
    completed: false,
  },
  {
    id: 5,
    title: 'Communication avec clients/livreurs',
    completed: false,
  },
];

export default function PartnerTrainingScreen({ navigation }) {
  const [currentSection, setCurrentSection] = useState(0);
  const [sections, setSections] = useState(TRAINING_SECTIONS);
  const [videoStatus, setVideoStatus] = useState({});
  const videoRef = useRef(null);
  const insets = useSafeAreaInsets();

  const markSectionComplete = (sectionId) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, completed: true } : section
      )
    );
  };

  const handleVideoEnd = () => {
    markSectionComplete(sections[currentSection].id);
  };

  const handleNext = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    } else {
      // Toutes les sections complétées
      navigation.navigate('QualificationQuiz');
    }
  };

  const allSectionsCompleted = sections.every((s) => s.completed);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Formation Partenaire</Text>
        <Text style={styles.subtitle}>
          Section {currentSection + 1} sur {sections.length}
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={{ uri: 'https://example.com/training-video.mp4' }} // TODO: Remplacer par l'URL réelle
            style={styles.video}
            useNativeControls
            resizeMode="contain"
            onPlaybackStatusUpdate={(status) => {
              setVideoStatus(() => status);
              if (status.didJustFinish) {
                handleVideoEnd();
              }
            }}
          />
        </View>

        <View style={styles.sectionInfo}>
          <Text style={styles.sectionTitle}>
            {sections[currentSection].title}
          </Text>
          <Text style={styles.sectionDescription}>
            Durée estimée : 15 minutes
          </Text>
        </View>

        <View style={styles.sectionsList}>
          <Text style={styles.sectionsTitle}>Sections de formation :</Text>
          {sections.map((section, index) => (
            <View key={section.id} style={styles.sectionItem}>
              <View style={styles.sectionItemLeft}>
                <View
                  style={[
                    styles.sectionNumber,
                    section.completed && styles.sectionNumberCompleted,
                    index === currentSection && styles.sectionNumberActive,
                  ]}
                >
                  {section.completed ? (
                    <Ionicons name="checkmark" size={16} color={COLORS.white} />
                  ) : (
                    <Text style={styles.sectionNumberText}>{index + 1}</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.sectionItemText,
                    section.completed && styles.sectionItemTextCompleted,
                  ]}
                >
                  {section.title}
                </Text>
              </View>
              {section.completed && (
                <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            !allSectionsCompleted && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!allSectionsCompleted}
        >
          <Text style={styles.nextButtonText}>
            {allSectionsCompleted ? 'Passer le quiz' : 'Complétez toutes les sections'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
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
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: COLORS.black,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  sectionInfo: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sectionsList: {
    marginTop: 24,
  },
  sectionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  sectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  sectionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionNumberActive: {
    backgroundColor: COLORS.primary,
  },
  sectionNumberCompleted: {
    backgroundColor: COLORS.success,
  },
  sectionNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionItemText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  sectionItemTextCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  footer: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
});

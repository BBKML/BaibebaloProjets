import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

const FAQ_CATEGORIES = [
  {
    id: 'getting_started',
    title: 'Démarrage',
    icon: 'rocket',
    questions: [
      {
        q: 'Comment créer mon menu ?',
        a: 'Allez dans l\'onglet Menu, créez des catégories puis ajoutez vos plats avec photos et prix.',
      },
      {
        q: 'Comment recevoir des commandes ?',
        a: 'Une fois votre compte activé, les commandes apparaîtront automatiquement dans l\'onglet Commandes.',
      },
    ],
  },
  {
    id: 'orders',
    title: 'Gestion des commandes',
    icon: 'receipt',
    questions: [
      {
        q: 'Combien de temps ai-je pour répondre à une commande ?',
        a: 'Vous avez 2 minutes pour accepter ou refuser une nouvelle commande.',
      },
      {
        q: 'Que faire si je ne peux pas honorer une commande ?',
        a: 'Vous pouvez refuser avec un motif valide (article épuisé, fermeture exceptionnelle, etc.).',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Paiements',
    icon: 'cash',
    questions: [
      {
        q: 'Quand suis-je payé ?',
        a: 'Les paiements sont effectués hebdomadairement, avec un délai de 7 jours après la commande.',
      },
      {
        q: 'Quel est le taux de commission ?',
        a: 'Le taux de commission est de 15-20% selon votre contrat.',
      },
    ],
  },
];

export default function SupportHelpCenterScreen({ navigation }) {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const insets = useSafeAreaInsets();

  const toggleCategory = (categoryId) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
    setExpandedQuestion(null);
  };

  const toggleQuestion = (questionIndex) => {
    setExpandedQuestion(expandedQuestion === questionIndex ? null : questionIndex);
  };

  const handleContact = (method) => {
    if (method === 'chat') {
      navigation.navigate('LiveChatSupport');
    } else if (method === 'email') {
      Linking.openURL('mailto:support@baibebalo.com');
    } else if (method === 'phone') {
      Linking.openURL('tel:+225XXXXXXXXX');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Centre d'aide</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Contact rapide */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Besoin d'aide ?</Text>
          <View style={styles.contactButtons}>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => handleContact('chat')}
            >
              <Ionicons name="chatbubble" size={24} color={COLORS.primary} />
              <Text style={styles.contactButtonText}>Chat en direct</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => handleContact('email')}
            >
              <Ionicons name="mail" size={24} color={COLORS.primary} />
              <Text style={styles.contactButtonText}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => handleContact('phone')}
            >
              <Ionicons name="call" size={24} color={COLORS.primary} />
              <Text style={styles.contactButtonText}>Appeler</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Questions fréquentes</Text>
          {FAQ_CATEGORIES.map((category) => (
            <View key={category.id} style={styles.categoryCard}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(category.id)}
              >
                <View style={styles.categoryHeaderLeft}>
                  <Ionicons name={category.icon} size={24} color={COLORS.primary} />
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                </View>
                <Ionicons
                  name={expandedCategory === category.id ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>

              {expandedCategory === category.id && (
                <View style={styles.questionsContainer}>
                  {category.questions.map((item, index) => (
                    <View key={index} style={styles.questionItem}>
                      <TouchableOpacity
                        style={styles.questionHeader}
                        onPress={() => toggleQuestion(index)}
                      >
                        <Text style={styles.questionText}>{item.q}</Text>
                        <Ionicons
                          name={expandedQuestion === index ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={COLORS.textSecondary}
                        />
                      </TouchableOpacity>
                      {expandedQuestion === index && (
                        <Text style={styles.answerText}>{item.a}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Tutoriels */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tutoriels vidéo</Text>
          <View style={styles.tutorialsContainer}>
            {[
              { title: 'Créer votre menu', duration: '5 min' },
              { title: 'Gérer les commandes', duration: '8 min' },
              { title: 'Configurer les promotions', duration: '6 min' },
            ].map((tutorial, index) => (
              <TouchableOpacity key={index} style={styles.tutorialCard}>
                <Ionicons name="play-circle" size={32} color={COLORS.primary} />
                <View style={styles.tutorialInfo}>
                  <Text style={styles.tutorialTitle}>{tutorial.title}</Text>
                  <Text style={styles.tutorialDuration}>{tutorial.duration}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Signaler un bug */}
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => navigation.navigate('ReportProblem')}
        >
          <Ionicons name="bug-outline" size={20} color={COLORS.error} />
          <Text style={styles.reportButtonText}>Signaler un problème</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactButtonText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  categoryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  questionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  questionItem: {
    marginBottom: 12,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  answerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: 8,
    paddingLeft: 8,
  },
  tutorialsContainer: {
    gap: 12,
  },
  tutorialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  tutorialInfo: {
    flex: 1,
  },
  tutorialTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  tutorialDuration: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error + '15',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginTop: 8,
  },
  reportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
  },
});

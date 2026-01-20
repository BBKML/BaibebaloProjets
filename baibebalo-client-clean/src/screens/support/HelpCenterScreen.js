import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function HelpCenterScreen({ navigation }) {
  const [expandedItems, setExpandedItems] = useState({});

  const faqCategories = [
    {
      title: 'Commandes',
      items: [
        {
          question: 'Comment passer une commande ?',
          answer: 'Sélectionnez un restaurant, ajoutez des plats à votre panier, puis procédez au paiement.',
        },
        {
          question: 'Puis-je modifier ma commande ?',
          answer: 'Vous pouvez modifier votre commande avant la confirmation. Une fois confirmée, contactez le support.',
        },
        {
          question: 'Combien de temps prend la livraison ?',
          answer: 'La livraison prend généralement entre 30 et 45 minutes selon votre localisation.',
        },
      ],
    },
    {
      title: 'Paiement',
      items: [
        {
          question: 'Quels modes de paiement sont acceptés ?',
          answer: 'Nous acceptons Mobile Money (Orange Money, MTN), espèces et cartes bancaires.',
        },
        {
          question: 'Puis-je payer à la livraison ?',
          answer: 'Oui, vous pouvez choisir le paiement en espèces à la livraison.',
        },
      ],
    },
    {
      title: 'Compte',
      items: [
        {
          question: 'Comment créer un compte ?',
          answer: 'Entrez votre numéro de téléphone, vérifiez avec le code OTP, puis complétez votre profil.',
        },
        {
          question: 'J\'ai oublié mon mot de passe',
          answer: 'Contactez le support pour réinitialiser votre compte.',
        },
      ],
    },
  ];

  const toggleItem = (categoryIndex, itemIndex) => {
    const key = `${categoryIndex}-${itemIndex}`;
    setExpandedItems({
      ...expandedItems,
      [key]: !expandedItems[key],
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Centre d'aide</Text>
        <Text style={styles.headerSubtitle}>
          Trouvez rapidement des réponses à vos questions
        </Text>
      </View>

      {faqCategories.map((category, categoryIndex) => (
        <View key={categoryIndex} style={styles.category}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
          {category.items.map((item, itemIndex) => {
            const key = `${categoryIndex}-${itemIndex}`;
            const isExpanded = expandedItems[key];

            return (
              <View key={itemIndex} style={styles.faqItem}>
                <TouchableOpacity
                  style={styles.faqQuestion}
                  onPress={() => toggleItem(categoryIndex, itemIndex)}
                >
                  <Text style={styles.faqQuestionText}>{item.question}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.faqAnswerText}>{item.answer}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}

      <View style={styles.contactSection}>
        <Text style={styles.contactTitle}>Besoin d'aide supplémentaire ?</Text>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => navigation.navigate('ContactSupport')}
        >
          <Ionicons name="chatbubble-outline" size={24} color={COLORS.white} />
          <Text style={styles.contactButtonText}>Contacter le support</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 24,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  category: {
    padding: 16,
    marginTop: 8,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  faqItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 12,
  },
  faqAnswer: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  faqAnswerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  contactSection: {
    padding: 24,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  contactButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

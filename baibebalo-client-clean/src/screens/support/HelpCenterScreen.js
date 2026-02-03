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
          question: 'Puis-je annuler ma commande ?',
          answer: 'Oui, vous pouvez annuler votre commande tant qu\'elle n\'est pas en cours de livraison. Allez dans les détails de la commande et cliquez sur "Annuler ma commande".',
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
        {
          question: 'Politique de remboursement',
          answer: 'Les remboursements sont traités sous 48-72h. En cas de problème avec votre commande, contactez le support dans les 24h suivant la livraison. Les remboursements sont effectués via Mobile Money ou crédit sur votre compte BAIBEBALO.',
        },
        {
          question: 'Comment demander un remboursement ?',
          answer: 'Allez dans les détails de votre commande et cliquez sur "Signaler un problème". Sélectionnez le type de problème et décrivez la situation. Notre équipe traitera votre demande sous 48-72h.',
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
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Centre d'aide</Text>
        <View style={styles.iconButtonPlaceholder} />
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Bonjour, comment pouvons-nous vous aider ?</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textLight} />
          <Text style={styles.searchPlaceholder}>Rechercher une solution...</Text>
        </View>
      </View>

      <View style={styles.categoriesGrid}>
        {[
          { id: 'orders', label: 'Commandes', sub: 'Suivi & Livraison', icon: 'bicycle' },
          { id: 'payments', label: 'Paiements', sub: 'Méthodes & Remboursement', icon: 'wallet' },
          { id: 'account', label: 'Compte', sub: 'Sécurité & Profil', icon: 'person' },
          { id: 'promo', label: 'Promotions', sub: 'Codes & Parrainage', icon: 'pricetag' },
        ].map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.categoryCard}
            onPress={() => {
              // Scroll vers la section correspondante dans la FAQ
              const categoryIndex = faqCategories.findIndex(cat => 
                cat.title.toLowerCase().includes(item.id === 'orders' ? 'commandes' : 
                item.id === 'payments' ? 'paiement' : 
                item.id === 'account' ? 'compte' : 'promotion')
              );
              if (categoryIndex >= 0) {
                // Toggle la première question de la catégorie pour la rendre visible
                toggleItem(categoryIndex, 0);
              }
            }}
          >
            <View style={styles.categoryIcon}>
              <Ionicons name={item.icon} size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.categoryTitle}>{item.label}</Text>
            <Text style={styles.categorySubtitle}>{item.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.faqSection}>
        <Text style={styles.sectionTitle}>Questions fréquentes</Text>
        {faqCategories.map((category, categoryIndex) => (
          <View key={category.title}>
            {category.items.map((item, itemIndex) => {
              const key = `${categoryIndex}-${itemIndex}`;
              const isExpanded = expandedItems[key];
              return (
                <View key={item.question} style={styles.faqItem}>
                  <TouchableOpacity
                    style={styles.faqQuestion}
                    onPress={() => toggleItem(categoryIndex, itemIndex)}
                  >
                    <Text style={styles.faqQuestionText}>{item.question}</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
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
      </View>

      <View style={styles.contactSection}>
        <Text style={styles.contactTitle}>Vous ne trouvez pas votre réponse ?</Text>
        <Text style={styles.contactSubtitle}>Notre équipe est disponible 24h/7j</Text>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => navigation.navigate('ContactSupport')}
        >
          <Ionicons name="headset" size={20} color={COLORS.white} />
          <Text style={styles.contactButtonText}>Contactez le support</Text>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
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
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  categorySubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  faqSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  faqItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 12,
  },
  faqAnswer: {
    padding: 16,
    paddingTop: 0,
  },
  faqAnswerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  contactSection: {
    padding: 24,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  contactSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  contactButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});

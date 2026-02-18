import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

let SCREEN_WIDTH = 390;
try {
  const RN = require('react-native');
  if (RN.Dimensions?.get) {
    SCREEN_WIDTH = RN.Dimensions.get('window').width || 390;
  }
} catch (_) {}

export default function OnboardingWelcomeScreen({ navigation }) {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef(null);  // ✅ Référence au ScrollView

  const onboardingPages = [
    {
      title: 'Bienvenue sur',
      titleHighlight: 'BAIBEBALO  KORHOGO',
      subtitle: 'Vos plats préférés livrés chez vous en un clic partout à Korhogo.',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    },
    {
      title: 'Commandez facilement',
      titleHighlight: 'en quelques clics',
      subtitle: 'Parcourez les meilleurs restaurants et commandez vos plats favoris.',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    },
    {
      title: 'Livraison rapide',
      titleHighlight: 'à votre porte',
      subtitle: 'Recevez vos commandes rapidement et en toute sécurité.',
      image: 'https://images.unsplash.com/photo-1556910096-6f5e72db6803?w=400',
    },
  ];

  const handleNext = () => {
    if (currentPage < onboardingPages.length - 1) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      
      // ✅ Faire défiler vers la page suivante
      scrollViewRef.current?.scrollTo({
        x: nextPage * SCREEN_WIDTH,
        animated: true,
      });
    } else {
      // Fin de l'onboarding, naviguer vers l'authentification
      navigation.replace('PhoneEntry');
    }
  };

  const handleSkip = () => {
    navigation.replace('PhoneEntry');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}  // ✅ Ajouter la référence
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const pageIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentPage(pageIndex);
        }}
        style={styles.scrollView}
      >
        {onboardingPages.map((page, index) => (
          <View key={index} style={styles.page}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: page.image }}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay} />
            </View>

            <View style={styles.content}>
              <Text style={styles.title}>
                {page.title}{' '}
                <Text style={styles.titleHighlight}>{page.titleHighlight}</Text>
              </Text>
              <Text style={styles.subtitle}>{page.subtitle}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Indicateurs de page */}
      <View style={styles.indicatorsContainer}>
        {onboardingPages.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              index === currentPage && styles.indicatorActive,
            ]}
          />
        ))}
      </View>

      {/* Bouton Suivant */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {currentPage === onboardingPages.length - 1 ? 'Commencer' : 'Suivant'}
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
    paddingTop: 36,
    paddingHorizontal: 24,
    paddingBottom: 16,
    alignItems: 'flex-end',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: 24,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  content: {
    marginTop: 32,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 36,
  },
  titleHighlight: {
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  indicatorsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 24,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  indicatorActive: {
    width: 28,
    backgroundColor: COLORS.primary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
});
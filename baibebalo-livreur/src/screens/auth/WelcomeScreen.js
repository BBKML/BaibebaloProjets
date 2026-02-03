import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image,
  ScrollView,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const benefits = [
  {
    icon: 'wallet-outline',
    title: 'Revenus flexibles',
    description: 'Gagnez selon vos livraisons',
  },
  {
    icon: 'time-outline',
    title: 'Horaires libres',
    description: 'Soyez votre propre patron',
  },
  {
    icon: 'location-outline',
    title: 'Travaillez près de chez vous',
    description: 'Choisissez votre zone d\'activité',
  },
  {
    icon: 'gift-outline',
    title: 'Bonus et récompenses',
    description: 'Des défis pour booster vos gains',
  },
];

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header Image */}
      <View style={styles.imageContainer}>
        <View style={styles.imagePlaceholder}>
          <Ionicons name="bicycle" size={80} color={COLORS.primary} />
          <Text style={styles.imagePlaceholderText}>Livreur BAIBEBALO</Text>
        </View>
        <View style={styles.imageGradient} />
      </View>
      
      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Devenir Livreur BAIBEBALO</Text>
        
        {/* Benefits list */}
        <ScrollView style={styles.benefitsList} showsVerticalScrollIndicator={false}>
          {benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name={benefit.icon} size={24} color={COLORS.primary} />
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDescription}>{benefit.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
            </View>
          ))}
        </ScrollView>
      </View>
      
      {/* Bottom CTA */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => navigation.navigate('PhoneInput')}
        >
          <Text style={styles.primaryButtonText}>COMMENCER L'INSCRIPTION</Text>
        </TouchableOpacity>
        
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Déjà partenaire ? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('PhoneInput', { isLogin: true })}>
            <Text style={styles.loginLink}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  imageContainer: {
    height: '35%',
    width: '100%',
    position: 'relative',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: COLORS.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginBottom: -1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    marginTop: -60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 24,
  },
  benefitsList: {
    flex: 1,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  benefitDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
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
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});

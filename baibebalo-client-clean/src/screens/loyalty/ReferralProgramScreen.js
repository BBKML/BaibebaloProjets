import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';

export default function ReferralProgramScreen({ navigation }) {
  const { user } = useAuthStore();
  const [referralCode] = useState(user?.referral_code || 'BAIBE1234');
  const [earnings] = useState(0);
  const [referrals] = useState(0);

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Rejoignez BAIBEBALO avec mon code de parrainage ${referralCode} et obtenez des récompenses ! Téléchargez l'app : https://baibebalo.ci`,
        title: 'Code de parrainage BAIBEBALO',
      });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de partager le code');
    }
  };

  const handleCopyCode = () => {
    // TODO: Implémenter la copie dans le presse-papiers
    Alert.alert('Code copié', `Code ${referralCode} copié dans le presse-papiers`);
  };

  const benefits = [
    {
      icon: 'gift-outline',
      title: 'Pour vous',
      description: 'Gagnez 500 points pour chaque ami invité',
    },
    {
      icon: 'people-outline',
      title: 'Pour votre ami',
      description: '500 points de bienvenue + 10% de réduction',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="people" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.headerTitle}>Programme de parrainage</Text>
        <Text style={styles.headerSubtitle}>
          Invitez vos amis et gagnez des récompenses
        </Text>
      </View>

      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{referrals}</Text>
          <Text style={styles.statLabel}>Amis invités</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{earnings}</Text>
          <Text style={styles.statLabel}>Points gagnés</Text>
        </View>
      </View>

      {/* Code de parrainage */}
      <View style={styles.codeSection}>
        <Text style={styles.codeLabel}>Votre code de parrainage</Text>
        <View style={styles.codeContainer}>
          <Text style={styles.codeText}>{referralCode}</Text>
          <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
            <Ionicons name="copy-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.shareButton} onPress={handleShareCode}>
          <Ionicons name="share-social-outline" size={20} color={COLORS.white} />
          <Text style={styles.shareButtonText}>Partager le code</Text>
        </TouchableOpacity>
      </View>

      {/* Avantages */}
      <View style={styles.benefitsSection}>
        <Text style={styles.sectionTitle}>Comment ça marche ?</Text>
        {benefits.map((benefit, index) => (
          <View key={index} style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <Ionicons name={benefit.icon} size={32} color={COLORS.primary} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitDescription}>{benefit.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Historique */}
      <View style={styles.historySection}>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => navigation.navigate('ReferralHistory')}
        >
          <Ionicons name="time-outline" size={24} color={COLORS.text} />
          <Text style={styles.historyButtonText}>Voir l'historique</Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={COLORS.textSecondary}
          />
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
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.primary,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.white + 'CC',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    marginTop: -24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  codeSection: {
    padding: 16,
    marginTop: 8,
  },
  codeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  codeText: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 2,
    textAlign: 'center',
  },
  copyButton: {
    padding: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  shareButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  benefitsSection: {
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  benefitCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 16,
  },
  benefitIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  historySection: {
    padding: 16,
    marginTop: 8,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  historyButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});

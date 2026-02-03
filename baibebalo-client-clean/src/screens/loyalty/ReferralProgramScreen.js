import React, { useState, useEffect } from 'react';
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
import * as Clipboard from 'expo-clipboard';
import { getReferrals } from '../../api/users';

const REWARD_PER_COMPLETED = 500;

export default function ReferralProgramScreen({ navigation }) {
  const { user } = useAuthStore();
  const [referralCode, setReferralCode] = useState(user?.referral_code || '');
  const [earnings, setEarnings] = useState(0);
  const [referrals, setReferrals] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await getReferrals();
        const data = response?.data || response;
        if (cancelled) return;
        const code = data?.referral_code || user?.referral_code || '';
        const list = Array.isArray(data?.referrals) ? data.referrals : [];
        const completed = list.filter((r) => r.status === 'completed').length;
        setReferralCode(code || '—');
        setReferrals(list.length);
        setEarnings(completed * REWARD_PER_COMPLETED);
      } catch (e) {
        if (!cancelled) {
          setReferralCode(user?.referral_code || '—');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.referral_code]);

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

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(referralCode);
      Alert.alert('Code copié', `Code ${referralCode} copié dans le presse-papiers`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de copier le code');
    }
  };

  const shareOptions = [
    { id: 'whatsapp', label: 'WhatsApp', icon: 'chatbubble-ellipses', color: '#25D366' },
    { id: 'facebook', label: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
    { id: 'more', label: 'Plus', icon: 'share-social', color: COLORS.text },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Parrainage</Text>
        <View style={styles.iconButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroImage}>
          <View style={styles.heroOverlay} />
          <Ionicons name="people" size={56} color={COLORS.primary} />
        </View>

        <Text style={styles.heroTitle}>Invitez vos amis & gagnez ensemble</Text>
        <Text style={styles.heroSubtitle}>
          Gagnez <Text style={styles.heroHighlight}>500 FCFA</Text> pour chaque ami qui passe sa première commande.
        </Text>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Votre code unique</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{loading ? '…' : (referralCode || '—')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.copyButton, loading && { opacity: 0.6 }]}
            onPress={handleCopyCode}
            disabled={loading}
          >
            <Ionicons name="copy-outline" size={18} color={COLORS.white} />
            <Text style={styles.copyButtonText}>Copier le code</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.shareTitle}>PARTAGER VIA</Text>
        <View style={styles.shareRow}>
          {shareOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.shareOption}
              onPress={option.id === 'more' ? handleShareCode : handleShareCode}
            >
              <View style={[styles.shareIcon, { backgroundColor: option.color + '15' }]}>
                <Ionicons name={option.icon} size={22} color={option.color} />
              </View>
              <Text style={styles.shareLabel}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{loading ? '…' : referrals}</Text>
            <Text style={styles.statLabel}>Amis invités</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{loading ? '…' : `${earnings} FCFA`}</Text>
            <Text style={styles.statLabel}>Bonus cumulés</Text>
          </View>
        </View>

        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>Comment ça marche ?</Text>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.stepText}>Partagez votre code unique à vos proches.</Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={styles.stepText}>Votre ami s'inscrit et passe sa première commande.</Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              Vous recevez instantanément <Text style={styles.stepHighlight}>500 FCFA</Text> dans votre portefeuille.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => navigation.navigate('ReferralHistory')}
        >
          <Ionicons name="time-outline" size={20} color={COLORS.text} />
          <Text style={styles.historyButtonText}>Voir l'historique</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  heroImage: {
    height: 220,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primary + '10',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  heroHighlight: {
    color: '#FF9B8C',
    fontWeight: '700',
  },
  codeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 12,
  },
  codeBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.primary + '40',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: COLORS.background,
  },
  codeText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 4,
  },
  copyButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  shareTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  shareOption: {
    alignItems: 'center',
    gap: 6,
  },
  shareIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  stepsCard: {
    backgroundColor: COLORS.primary + '08',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  stepsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  stepHighlight: {
    color: COLORS.text,
    fontWeight: '700',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
});

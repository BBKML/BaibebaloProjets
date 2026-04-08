import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import { restaurantApi } from '../../api/restaurant';

const STATUS_CONFIG = {
  active: {
    label: 'Actif',
    color: '#10B981',
    icon: 'checkmark-circle',
    description: 'Votre restaurant est visible et peut recevoir des commandes',
  },
  pending: {
    label: 'En attente de validation',
    color: '#F59E0B',
    icon: 'time',
    description: 'Votre compte est en cours de vérification par notre équipe',
  },
  suspended: {
    label: 'Suspendu',
    color: '#EF4444',
    icon: 'ban',
    description: 'Votre compte a été suspendu. Contactez le support pour plus d\'informations.',
  },
  rejected: {
    label: 'Rejeté',
    color: '#EF4444',
    icon: 'close-circle',
    description: 'Votre demande d\'inscription a été rejetée. Contactez le support.',
  },
};

export default function SettingsScreen({ navigation }) {
  const { restaurant, logout, loadProfile, setRestaurant } = useAuthStore();
  const [isOpen, setIsOpen] = useState(restaurant?.is_open !== false);
  const [isToggling, setIsToggling] = useState(false);
  const insets = useSafeAreaInsets();

  // Recharger le profil à chaque focus pour avoir le statut à jour
  useFocusEffect(
    useCallback(() => {
      if (loadProfile) {
        loadProfile();
      }
    }, [loadProfile])
  );

  // Mettre à jour l'état local quand le restaurant change
  useEffect(() => {
    setIsOpen(restaurant?.is_open !== false);
  }, [restaurant?.is_open]);

  // Fonction pour ouvrir/fermer le restaurant
  const handleToggleStatus = async (newValue) => {
    if (isToggling) return;
    
    setIsToggling(true);
    const previousValue = isOpen;
    setIsOpen(newValue); // Optimistic update
    
    try {
      const response = await restaurantApi.toggleStatus(newValue);
      
      // Mettre à jour le store avec le nouveau statut
      if (response.data?.restaurant) {
        setRestaurant(response.data.restaurant);
      }
      
      Toast.show({
        type: 'success',
        text1: newValue ? 'Restaurant ouvert' : 'Restaurant fermé',
        text2: newValue 
          ? 'Vous pouvez maintenant recevoir des commandes' 
          : 'Vous ne recevrez plus de nouvelles commandes',
      });
      
      console.log('✅ Statut restaurant changé:', newValue ? 'ouvert' : 'fermé');
    } catch (error) {
      // Revert en cas d'erreur
      setIsOpen(previousValue);
      console.error('❌ Erreur toggle status:', error);
      
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: error?.message || 'Impossible de changer le statut',
      });
    } finally {
      setIsToggling(false);
    }
  };

  // Afficher une alerte si le compte est suspendu
  useEffect(() => {
    if (restaurant?.status === 'suspended') {
      Alert.alert(
        '⚠️ Compte suspendu',
        'Votre compte restaurant a été suspendu. Vous ne pouvez plus recevoir de commandes. Contactez le support pour plus d\'informations.',
        [
          { text: 'Contacter le support', onPress: () => navigation.navigate('SupportHelpCenter') },
          { text: 'OK', style: 'cancel' },
        ]
      );
    }
  }, [restaurant?.status, navigation]);

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', style: 'destructive', onPress: logout },
      ]
    );
  };

  const status = restaurant?.status || 'active';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.active;

  const restaurantName = restaurant?.name || 'Mon restaurant';
  const restaurantPhone = restaurant?.phone || '';

  const SettingRow = ({ icon, iconBg, label, subtitle, onPress, right, danger }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg || COLORS.primary + '15' }]}>
        <Ionicons name={icon} size={20} color={danger ? COLORS.error : COLORS.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {right || (onPress && !danger ? (
        <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
      ) : null)}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header avec avatar */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="storefront" size={28} color={COLORS.primary} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.restaurantName} numberOfLines={1}>{restaurantName}</Text>
          {restaurantPhone ? <Text style={styles.restaurantPhone}>{restaurantPhone}</Text> : null}
        </View>
        <View style={[styles.accountBadge, { backgroundColor: statusConfig.color + '20' }]}>
          <Text style={[styles.accountBadgeText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Alerte suspension */}
        {(status === 'suspended' || status === 'rejected') && (
          <TouchableOpacity
            style={styles.alertBanner}
            onPress={() => navigation.navigate('SupportHelpCenter')}
          >
            <Ionicons name="warning" size={18} color="#92400e" />
            <Text style={styles.alertText}>{statusConfig.description}</Text>
            <Ionicons name="chevron-forward" size={16} color="#92400e" />
          </TouchableOpacity>
        )}

        {/* Ouverture rapide */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: isOpen ? '#f0fdf4' : '#fef2f2' }]}>
              <Ionicons name="power" size={20} color={isOpen ? '#10b981' : COLORS.error} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Statut du restaurant</Text>
              <Text style={[styles.rowSub, { color: isOpen ? '#10b981' : COLORS.error }]}>
                {isOpen ? 'Ouvert — Commandes actives' : 'Fermé — Aucune commande'}
              </Text>
            </View>
            {isToggling ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Switch
                value={isOpen}
                onValueChange={handleToggleStatus}
                trackColor={{ false: '#e2e8f0', true: COLORS.primary + '55' }}
                thumbColor={isOpen ? COLORS.primary : '#94a3b8'}
                ios_backgroundColor="#e2e8f0"
              />
            )}
          </View>
        </View>

        {/* Section Restaurant */}
        <Text style={styles.sectionLabel}>RESTAURANT</Text>
        <View style={styles.card}>
          <SettingRow
            icon="storefront-outline"
            label="Informations"
            subtitle="Nom, description, photos"
            onPress={() => navigation.navigate('EditRestaurantProfile')}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="time-outline"
            label="Horaires d'ouverture"
            subtitle="Jours et créneaux"
            onPress={() => navigation.navigate('OpeningHours')}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="wallet-outline"
            label="Coordonnées de paiement"
            subtitle="Mobile Money, compte bancaire"
            onPress={() => navigation.navigate('PaymentInfo')}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="pricetag-outline"
            label="Promotions"
            subtitle="Gérer les offres et réductions"
            onPress={() => navigation.navigate('MarketingOverview')}
          />
        </View>

        {/* Section Finances */}
        <Text style={styles.sectionLabel}>FINANCES</Text>
        <View style={styles.card}>
          <SettingRow
            icon="bar-chart-outline"
            iconBg="#10b98115"
            label="Tableau de bord financier"
            subtitle="Revenus, transactions"
            onPress={() => navigation.navigate('FinancialDashboard')}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="arrow-up-circle-outline"
            iconBg="#3b82f615"
            label="Demander un retrait"
            subtitle="Retirer vos gains"
            onPress={() => navigation.navigate('WithdrawalRequest')}
          />
        </View>

        {/* Section Notifications */}
        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          <SettingRow
            icon="notifications-outline"
            label="Préférences"
            subtitle="Sons, alertes commandes"
            onPress={() => navigation.navigate('NotificationPreferences')}
          />
        </View>

        {/* Section Support */}
        <Text style={styles.sectionLabel}>AIDE & SUPPORT</Text>
        <View style={styles.card}>
          <SettingRow
            icon="help-circle-outline"
            label="Centre d'aide"
            subtitle="FAQ et tutoriels"
            onPress={() => navigation.navigate('SupportHelpCenter')}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="chatbubble-ellipses-outline"
            label="Chat support"
            subtitle="Parler à un agent"
            onPress={() => navigation.navigate('LiveChatSupport')}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="warning-outline"
            label="Signaler un problème"
            onPress={() => navigation.navigate('ReportProblem')}
          />
        </View>

        {/* Déconnexion */}
        <View style={[styles.card, styles.cardLast]}>
          <SettingRow
            icon="log-out-outline"
            iconBg="#fef2f2"
            label="Déconnexion"
            danger
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  headerInfo: { flex: 1 },
  restaurantName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  restaurantPhone: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  accountBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  accountBadgeText: { fontSize: 11, fontWeight: '700' },

  scrollView: { flex: 1 },
  scrollContent: { paddingVertical: 20, paddingHorizontal: 16, gap: 0, paddingBottom: 60 },

  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fef3c7', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#fbbf24',
  },
  alertText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#92400e' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.textSecondary,
    letterSpacing: 0.8, marginTop: 20, marginBottom: 8, marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 0,
  },
  cardLast: { marginTop: 16 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  rowIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  rowLabelDanger: { color: COLORS.error },
  rowSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  separator: {
    height: 1, backgroundColor: COLORS.border + '60', marginLeft: 66,
  },

  // Garder ces styles pour compatibilité
  statusCard: { display: 'none' },
  statusIconContainer: { display: 'none' },
  statusContent: { display: 'none' },
  statusHeader: { display: 'none' },
  statusLabel: { display: 'none' },
  statusBadge: { display: 'none' },
  statusBadgeText: { display: 'none' },
  statusDescription: { display: 'none' },
  contactSupportButton: { display: 'none' },
  contactSupportText: { display: 'none' },
});

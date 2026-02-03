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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Paramètres</Text>
        </View>

        {/* Statut du compte */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statut du compte</Text>
          <View style={[styles.statusCard, { borderColor: statusConfig.color }]}>
            <View style={[styles.statusIconContainer, { backgroundColor: statusConfig.color + '20' }]}>
              <Ionicons name={statusConfig.icon} size={28} color={statusConfig.color} />
            </View>
            <View style={styles.statusContent}>
              <View style={styles.statusHeader}>
                <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
                  <Text style={styles.statusBadgeText}>{status.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.statusDescription}>{statusConfig.description}</Text>
            </View>
          </View>
          {(status === 'suspended' || status === 'rejected') && (
            <TouchableOpacity
              style={styles.contactSupportButton}
              onPress={() => navigation.navigate('SupportHelpCenter')}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.white} />
              <Text style={styles.contactSupportText}>Contacter le support</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Restaurant</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('EditRestaurantProfile')}
          >
            <Ionicons name="restaurant" size={24} color={COLORS.primary} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Informations du restaurant</Text>
              <Text style={styles.settingDescription}>Modifier les informations</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('PaymentInfo')}
          >
            <Ionicons name="wallet" size={24} color={COLORS.primary} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Informations de paiement</Text>
              <Text style={styles.settingDescription}>Mobile Money, opérateur, titulaire, RIB</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('OpeningHours')}
          >
            <Ionicons name="time" size={24} color={COLORS.primary} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Horaires</Text>
              <Text style={styles.settingDescription}>Voir détails ci-dessous</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <Ionicons name="power" size={24} color={isOpen ? COLORS.success : COLORS.error} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Fermer temporairement</Text>
              <Text style={[styles.settingDescription, { color: isOpen ? COLORS.success : COLORS.error }]}>
                {isOpen ? '🟢 Restaurant ouvert' : '🔴 Restaurant fermé'}
              </Text>
            </View>
            {isToggling ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Switch
                value={isOpen}
                onValueChange={handleToggleStatus}
                trackColor={{ false: COLORS.error, true: COLORS.success }}
                thumbColor={isOpen ? COLORS.white : COLORS.white}
                disabled={isToggling}
              />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('NotificationPreferences')}
          >
            <Ionicons name="notifications" size={24} color={COLORS.primary} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Préférences</Text>
              <Text style={styles.settingDescription}>Gérer les notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('SupportHelpCenter')}
          >
            <Ionicons name="help-circle" size={24} color={COLORS.primary} />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Centre d'aide</Text>
              <Text style={styles.settingDescription}>FAQ, tutoriels et support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.settingItem, styles.logoutItem]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={24} color={COLORS.error} />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
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
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  logoutItem: {
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
  },
  statusCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  statusIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusContent: {
    flex: 1,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  statusDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  contactSupportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
    gap: 8,
  },
  contactSupportText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

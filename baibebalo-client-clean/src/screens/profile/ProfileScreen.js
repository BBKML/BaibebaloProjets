import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaPadding } from '../../hooks/useSafeAreaPadding';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import { getMyProfile } from '../../api/users';
import { getNotifications } from '../../api/notifications';
import { normalizeUploadUrl } from '../../utils/url';

export default function ProfileScreen({ navigation }) {
  const { paddingTop, paddingBottom } = useSafeAreaPadding({ withTabBar: true });
  const { user, logout, setUser } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const loadProfile = useCallback(async () => {
    try {
      const response = await getMyProfile();
      const userData = response.data?.data?.user || response.data?.user || response.data || {};
      setProfile(userData);
      if (userData?.id) {
        setUser(user ? { ...user, ...userData } : { ...userData });
      }
      
      // Vérifier si le compte est suspendu
      if (userData.status === 'suspended' || userData.status === 'banned') {
        Alert.alert(
          '⚠️ Compte suspendu',
          'Votre compte a été suspendu. Certaines fonctionnalités peuvent être limitées. Contactez le support pour plus d\'informations.',
          [
            { text: 'Contacter le support', onPress: () => navigation.navigate('HelpCenter') },
            { text: 'OK', style: 'cancel' },
          ]
        );
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
    }
  }, [setUser, user, navigation]);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await getNotifications();
      const notifications = response.data?.notifications || response.notifications || [];
      const unread = notifications.filter(n => !n.read_at).length;
      setUnreadNotifications(unread);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      loadNotifications();
    }, [loadProfile, loadNotifications])
  );

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'PhoneEntry' }],
              });
            })();
          },
        },
      ]
    );
  };

  const accountItems = [
    {
      icon: 'person-outline',
      label: 'Modifier mon profil',
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      icon: 'location-outline',
      label: 'Mes adresses',
      onPress: () => navigation.navigate('ManageAddresses'),
    },
    {
      icon: 'star-outline',
      label: 'Points de fidélité',
      onPress: () => navigation.navigate('LoyaltyDashboard'),
      actionLabel: 'Consulter',
    },
  ];

  const preferenceItems = [
    {
      icon: 'settings-outline',
      label: 'Paramètres',
      onPress: () => navigation.navigate('Settings'),
    },
    {
      icon: 'help-circle-outline',
      label: 'Aide & Support',
      onPress: () => navigation.navigate('HelpCenter'),
    },
    {
      icon: 'document-text-outline',
      label: 'Mes réclamations',
      onPress: () => navigation.navigate('MyClaimsTracking'),
    },
  ];

  const avatarUrl = normalizeUploadUrl(
    profile?.profile_picture
      || profile?.profile_image_url
      || user?.profile_picture
      || user?.profile_image_url
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop, paddingBottom }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Profil</Text>
        <TouchableOpacity 
          style={styles.topBarActions}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={20} color={COLORS.text} />
          {unreadNotifications > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Alerte statut compte */}
      {(profile?.status === 'suspended' || profile?.status === 'banned') && (
        <View style={styles.statusAlert}>
          <Ionicons name="warning" size={20} color={COLORS.white} />
          <Text style={styles.statusAlertText}>
            Votre compte est {profile?.status === 'banned' ? 'banni' : 'suspendu'}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('HelpCenter')}>
            <Text style={styles.statusAlertLink}>Aide</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.profileCard}>
        <View style={styles.avatarWrapper}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
          ) : (
            <Ionicons name="person" size={48} color={COLORS.white} />
          )}
          <TouchableOpacity style={styles.editBadge} onPress={() => navigation.navigate('EditProfile')}>
            <Ionicons name="pencil" size={14} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.name}>
          {profile?.full_name || user?.full_name || 'Utilisateur'}
        </Text>
        <View style={styles.badgesRow}>
          <View style={styles.badge}>
            <Ionicons name="ribbon" size={14} color={COLORS.textSecondary} />
            <Text style={styles.badgeText}>Membre Argent</Text>
          </View>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsText}>
              {(profile?.loyalty_points || 1250).toLocaleString('fr-FR')} pts
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compte</Text>
        {accountItems.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={styles.menuIcon}>
              <Ionicons name={item.icon} size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.menuItemText}>{item.label}</Text>
            {item.actionLabel ? (
              <View style={styles.menuAction}>
                <Text style={styles.menuActionText}>{item.actionLabel}</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Préférences</Text>
        {preferenceItems.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={styles.menuIconMuted}>
              <Ionicons name={item.icon} size={20} color={COLORS.text} />
            </View>
            <Text style={styles.menuItemText}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
          <View style={styles.logoutIcon}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          </View>
          <Text style={styles.logoutText}>Déconnexion</Text>
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
    display: 'none',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  topBarActions: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  statusAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  statusAlertText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  statusAlertLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
    textDecorationLine: 'underline',
  },
  profileCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  avatarWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 120,
    height: 120,
  },
  editBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: COLORS.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  badgeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  pointsBadge: {
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconMuted: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  menuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  menuActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.error + '10',
    borderWidth: 1,
    borderColor: COLORS.error + '30',
    gap: 12,
  },
  logoutIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.error + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.error,
  },
});

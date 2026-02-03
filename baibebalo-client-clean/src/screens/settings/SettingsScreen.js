import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import { normalizeUploadUrl } from '../../utils/url';

export default function SettingsScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [locationEnabled, setLocationEnabled] = React.useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(false);

  const displayName =
    user?.full_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.phone_number ||
    'Mon compte';

  const displaySub =
    user?.email ||
    user?.phone_number ||
    'Gérer votre profil';

  const avatarUrl = normalizeUploadUrl(
    user?.profile_picture || user?.profile_image_url
  );

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  const settingsSections = [
    {
      title: 'Préférences',
      items: [
        {
          icon: 'notifications-outline',
          label: 'Notifications push',
          value: notificationsEnabled,
          onToggle: setNotificationsEnabled,
          type: 'toggle',
        },
        {
          icon: 'mail-outline',
          label: 'Notifications email',
          value: false,
          onToggle: () => {},
          type: 'toggle',
        },
        {
          icon: 'moon-outline',
          label: 'Mode sombre',
          value: darkModeEnabled,
          onToggle: setDarkModeEnabled,
          type: 'toggle',
        },
        {
          icon: 'notifications-outline',
          label: 'Préférences',
          onPress: () => navigation.navigate('NotificationPreferences'),
          type: 'navigate',
        },
        {
          icon: 'location-outline',
          label: 'Autoriser la localisation',
          value: locationEnabled,
          onToggle: setLocationEnabled,
          type: 'toggle',
        },
      ],
    },
    {
      title: 'Système',
      items: [
        {
          icon: 'shield-checkmark-outline',
          label: 'Sécurité du compte',
          onPress: () => navigation.navigate('AccountSecurity'),
          type: 'navigate',
        },
        {
          icon: 'save-outline',
          label: 'Données et stockage',
          onPress: () => navigation.navigate('DataStorage'),
          type: 'navigate',
        },
        {
          icon: 'help-circle-outline',
          label: 'Centre d\'aide',
          onPress: () => navigation.navigate('HelpCenter'),
          type: 'navigate',
        },
      ],
    },
    {
      title: 'Général',
      items: [
        {
          icon: 'language-outline',
          label: 'Langue',
          value: 'Français',
          onPress: () => navigation.navigate('LanguageSettings'),
          type: 'navigate',
        },
        {
          icon: 'wallet-outline',
          label: 'Moyens de paiement',
          onPress: () => navigation.navigate('ManagePaymentMethods'),
          type: 'navigate',
        },
        {
          icon: 'map-outline',
          label: 'Sélecteur de carte',
          onPress: () => navigation.navigate('MapLocationSelector'),
          type: 'navigate',
        },
        {
          icon: 'chatbubble-outline',
          label: 'Support',
          onPress: () => navigation.navigate('ContactSupport'),
          type: 'navigate',
        },
        {
          icon: 'information-circle-outline',
          label: 'À propos de BAIBEBALO',
          onPress: () => navigation.navigate('AboutBaibebalo'),
          type: 'navigate',
        },
        {
          icon: 'document-text-outline',
          label: 'Politique de confidentialité',
          onPress: () => navigation.navigate('PrivacyPolicy'),
          type: 'navigate',
        },
      ],
    },
  ];

  const renderSettingItem = (item, index) => {
    if (item.type === 'toggle') {
      return (
        <TouchableOpacity
          key={index}
          style={styles.settingItem}
          onPress={() => item.onToggle(!item.value)}
        >
          <Ionicons name={item.icon} size={24} color={COLORS.text} />
          <Text style={styles.settingLabel}>{item.label}</Text>
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        key={index}
        style={styles.settingItem}
        onPress={item.onPress}
      >
        <Ionicons name={item.icon} size={24} color={COLORS.text} />
        <Text style={styles.settingLabel}>{item.label}</Text>
        {item.value && <Text style={styles.settingValue}>{item.value}</Text>}
        <Ionicons
          name="chevron-forward"
          size={20}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paramètres</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte</Text>
          <TouchableOpacity
            style={styles.profileCard}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
          >
            <View style={styles.avatarWrapper}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitials}>{initials || 'BB'}</Text>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileSub}>{displaySub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {settingsSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) =>
                renderSettingItem(item, itemIndex)
              )}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Déconnexion</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

SettingsScreen.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  moreButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingLeft: 4,
  },
  sectionContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  avatarWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  profileSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  settingValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  logoutButton: {
    marginTop: 24,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#ffeef0',
    borderWidth: 1,
    borderColor: '#f7d4d9',
  },
  logoutButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '700',
  },
});

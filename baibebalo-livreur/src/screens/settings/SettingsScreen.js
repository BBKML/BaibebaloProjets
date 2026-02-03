import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';

export default function SettingsScreen({ navigation }) {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Déconnecter', 
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        },
      ]
    );
  };

  const settingsSections = [
    {
      title: 'Mon compte',
      items: [
        { icon: 'person-outline', label: 'Modifier le profil', screen: 'EditProfile' },
        { icon: 'document-text-outline', label: 'Mettre à jour les documents', screen: 'UpdateDocuments' },
        { icon: 'bicycle-outline', label: 'Changer de véhicule', screen: 'EditProfile' },
      ],
    },
    {
      title: 'Disponibilités',
      items: [
        { icon: 'time-outline', label: 'Horaires préférés', screen: 'AvailabilitySettings' },
        { icon: 'map-outline', label: 'Zones de travail', screen: 'WorkZones' },
        { icon: 'options-outline', label: 'Préférences de course', screen: 'DeliveryPreferences' },
      ],
    },
    {
      title: 'Notifications',
      items: [
        { icon: 'notifications-outline', label: 'Paramètres de notification', screen: 'NotificationSettings' },
      ],
    },
    {
      title: 'Sécurité',
      items: [
        { icon: 'lock-closed-outline', label: 'Code PIN et sécurité', screen: 'SecuritySettings' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle-outline', label: 'Centre d\'aide', screen: 'HelpCenter' },
        { icon: 'chatbubbles-outline', label: 'Contacter le support', screen: 'SupportChat' },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Paramètres</Text>
        </View>

        {/* Profile Card */}
        <TouchableOpacity 
          style={styles.profileCard}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <View style={styles.profileAvatar}>
            {user?.profile_photo ? (
              <Image source={{ uri: user.profile_photo }} style={styles.avatar} />
            ) : (
              <Ionicons name="person" size={32} color={COLORS.primary} />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.first_name} {user?.last_name}
            </Text>
            <Text style={styles.profilePhone}>{user?.phone || '+225 XX XX XX XX'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Settings Sections */}
        {settingsSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.settingItem,
                    index < section.items.length - 1 && styles.settingItemBorder,
                  ]}
                  onPress={() => navigation.navigate(item.screen)}
                >
                  <View style={styles.settingIcon}>
                    <Ionicons name={item.icon} size={22} color={COLORS.primary} />
                  </View>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
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
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  profilePhone: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 16,
    backgroundColor: COLORS.error + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 24,
  },
});

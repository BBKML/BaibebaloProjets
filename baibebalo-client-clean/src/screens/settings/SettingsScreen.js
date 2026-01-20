import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function SettingsScreen({ navigation }) {
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [locationEnabled, setLocationEnabled] = React.useState(true);

  const settingsSections = [
    {
      title: 'Notifications',
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
          icon: 'notifications-outline',
          label: 'Préférences',
          onPress: () => navigation.navigate('NotificationPreferences'),
          type: 'navigate',
        },
      ],
    },
    {
      title: 'Localisation',
      items: [
        {
          icon: 'location-outline',
          label: 'Autoriser la localisation',
          value: locationEnabled,
          onToggle: setLocationEnabled,
          type: 'toggle',
        },
        {
          icon: 'map-outline',
          label: 'Sélecteur de carte',
          onPress: () => navigation.navigate('MapLocationSelector'),
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
      ],
    },
    {
      title: 'Aide',
      items: [
        {
          icon: 'help-circle-outline',
          label: 'Centre d\'aide',
          onPress: () => navigation.navigate('HelpCenter'),
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
    <ScrollView style={styles.container}>
      {settingsSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionContent}>
            {section.items.map((item, itemIndex) =>
              renderSettingItem(item, itemIndex)
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
});

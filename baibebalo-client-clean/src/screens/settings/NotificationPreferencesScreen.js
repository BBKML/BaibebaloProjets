import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { getNotificationPreferences, updateNotificationPreferences } from '../../api/users';

export default function NotificationPreferencesScreen({ navigation }) {
  const [preferences, setPreferences] = useState({
    orderUpdates: true,
    promotions: true,
    newRestaurants: false,
    deliveryStatus: true,
    paymentReminders: true,
    marketing: false,
    sound: true,
    vibration: true,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await getNotificationPreferences();
        const prefs = response.data?.preferences || response.data?.data?.preferences;
        if (prefs) {
          setPreferences((prev) => ({ ...prev, ...prefs }));
        }
      } catch (error) {
        console.error('Erreur chargement préférences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const notificationCategories = [
    {
      title: 'Commandes',
      items: [
        {
          key: 'orderUpdates',
          label: 'Mises à jour de commande',
          description: 'Notifications sur le statut de vos commandes',
          icon: 'receipt-outline',
        },
        {
          key: 'deliveryStatus',
          label: 'Statut de livraison',
          description: 'Notifications lorsque votre commande est en route',
          icon: 'bicycle-outline',
        },
        {
          key: 'paymentReminders',
          label: 'Rappels de paiement',
          description: 'Rappels pour les paiements en attente',
          icon: 'card-outline',
        },
      ],
    },
    {
      title: 'Promotions',
      items: [
        {
          key: 'promotions',
          label: 'Offres et promotions',
          description: 'Recevez des notifications sur les offres spéciales',
          icon: 'pricetag-outline',
        },
        {
          key: 'newRestaurants',
          label: 'Nouveaux restaurants',
          description: 'Découvrez les nouveaux restaurants ajoutés',
          icon: 'restaurant-outline',
        },
        {
          key: 'marketing',
          label: 'Marketing et actualités',
          description: 'Actualités et communications marketing',
          icon: 'megaphone-outline',
        },
      ],
    },
    {
      title: 'Paramètres',
      items: [
        {
          key: 'sound',
          label: 'Son',
          description: 'Activer les sons de notification',
          icon: 'volume-high-outline',
        },
        {
          key: 'vibration',
          label: 'Vibration',
          description: 'Activer les vibrations',
          icon: 'phone-portrait-outline',
        },
      ],
    },
  ];

  const togglePreference = (key) => {
    setPreferences({
      ...preferences,
      [key]: !preferences[key],
    });
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      await updateNotificationPreferences(preferences);
      navigation.navigate('SettingsUpdateSuccess', {
        message: 'Vos préférences de notifications ont été mises à jour.',
      });
    } catch (error) {
      console.error('Erreur sauvegarde préférences:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Préférences de notifications</Text>
        <Text style={styles.headerSubtitle}>
          Gérez les types de notifications que vous souhaitez recevoir
        </Text>
      </View>

      {notificationCategories.map((category) => (
        <View key={category.title} style={styles.category}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
          {category.items.map((item) => (
            <View key={item.key} style={styles.preferenceItem}>
              <View style={styles.preferenceIcon}>
                <Ionicons name={item.icon} size={24} color={COLORS.primary} />
              </View>
              <View style={styles.preferenceContent}>
                <Text style={styles.preferenceLabel}>{item.label}</Text>
                <Text style={styles.preferenceDescription}>{item.description}</Text>
              </View>
              <Switch
                value={preferences[item.key]}
                onValueChange={() => togglePreference(item.key)}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>
          ))}
        </View>
      ))}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSavePreferences}
          disabled={saving || loading}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Enregistrement...' : 'Enregistrer les préférences'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

NotificationPreferencesScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 24,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  category: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingLeft: 4,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  preferenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  preferenceContent: {
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

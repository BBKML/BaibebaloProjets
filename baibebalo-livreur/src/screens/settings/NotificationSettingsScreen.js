import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Switch, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateProfile } from '../../api/delivery';

const NOTIFICATION_SETTINGS_KEY = 'delivery_notification_settings';

export default function NotificationSettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    newOrders: true,
    orderUpdates: true,
    earnings: true,
    promotions: false,
    news: false,
    soundEnabled: true,
    vibrationEnabled: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Erreur sauvegarde paramètres:', error);
    }
  };

  const toggleSetting = async (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleSaveToServer = async () => {
    setSaving(true);
    try {
      // Envoyer les préférences au serveur
      await updateProfile({ notification_preferences: settings });
      Alert.alert('Succès', 'Paramètres de notification enregistrés');
    } catch (error) {
      console.error('Erreur:', error);
      // Les paramètres sont quand même sauvegardés localement
      Alert.alert('Info', 'Paramètres sauvegardés localement');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity onPress={handleSaveToServer} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.saveButton}>Sauver</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Section Courses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activité</Text>
          <View style={styles.card}>
            <SettingItem
              icon="bicycle"
              label="Nouvelles courses"
              description="Recevoir les propositions de courses"
              value={settings.newOrders}
              onToggle={() => toggleSetting('newOrders')}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="refresh"
              label="Mises à jour commandes"
              description="Changements de statut, annulations"
              value={settings.orderUpdates}
              onToggle={() => toggleSetting('orderUpdates')}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="cash"
              label="Gains"
              description="Notifications de paiement"
              value={settings.earnings}
              onToggle={() => toggleSetting('earnings')}
            />
          </View>
        </View>

        {/* Section Marketing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Marketing</Text>
          <View style={styles.card}>
            <SettingItem
              icon="gift"
              label="Promotions & Bonus"
              description="Offres spéciales et bonus"
              value={settings.promotions}
              onToggle={() => toggleSetting('promotions')}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="newspaper"
              label="Actualités"
              description="Nouvelles fonctionnalités et mises à jour"
              value={settings.news}
              onToggle={() => toggleSetting('news')}
            />
          </View>
        </View>

        {/* Section Son & Vibration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Son & Vibration</Text>
          <View style={styles.card}>
            <SettingItem
              icon="volume-high"
              label="Son"
              description="Activer le son des notifications"
              value={settings.soundEnabled}
              onToggle={() => toggleSetting('soundEnabled')}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="phone-portrait"
              label="Vibration"
              description="Vibrer lors des nouvelles notifications"
              value={settings.vibrationEnabled}
              onToggle={() => toggleSetting('vibrationEnabled')}
            />
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.info} />
          <Text style={styles.infoText}>
            Les notifications "Nouvelles courses" sont importantes pour recevoir des propositions de livraison.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingItem({ icon, label, description, value, onToggle }) {
  return (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon} size={20} color={COLORS.primary} />
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>{label}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.border, true: COLORS.primary + '50' }}
        thumbColor={value ? COLORS.primary : '#f4f3f4'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  placeholder: { width: 40 },
  saveButton: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 12, marginLeft: 4 },
  card: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 68 },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  settingIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.primary + '10', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  settingDescription: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: COLORS.info + '10', borderRadius: 12, padding: 16 },
  infoText: { flex: 1, fontSize: 13, color: COLORS.info, lineHeight: 18 },
});

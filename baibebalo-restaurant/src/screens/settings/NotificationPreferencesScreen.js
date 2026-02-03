import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

const NOTIFICATION_SOUNDS = [
  { id: 'default', label: 'Par défaut', icon: 'notifications' },
  { id: 'urgent', label: 'Urgent', icon: 'alert' },
  { id: 'gentle', label: 'Doux', icon: 'volume-low' },
  { id: 'silent', label: 'Silencieux', icon: 'volume-mute' },
];

export default function NotificationPreferencesScreen({ navigation }) {
  const [preferences, setPreferences] = useState({
    soundEnabled: true,
    selectedSound: 'default',
    vibration: true,
    pushNotifications: true,
    smsEnabled: false,
    emailEnabled: true,
    urgentOnly: false,
  });
  const insets = useSafeAreaInsets();

  const handleSave = () => {
    // TODO: Sauvegarder les préférences
    Alert.alert('Succès', 'Préférences enregistrées', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Préférences de notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Sons d'alerte */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sons d'alerte</Text>
          <View style={styles.soundsContainer}>
            {NOTIFICATION_SOUNDS.map((sound) => (
              <TouchableOpacity
                key={sound.id}
                style={[
                  styles.soundOption,
                  preferences.selectedSound === sound.id && styles.soundOptionSelected,
                ]}
                onPress={() => setPreferences({ ...preferences, selectedSound: sound.id })}
              >
                <Ionicons
                  name={sound.icon}
                  size={24}
                  color={preferences.selectedSound === sound.id ? COLORS.primary : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.soundLabel,
                    preferences.selectedSound === sound.id && styles.soundLabelSelected,
                  ]}
                >
                  {sound.label}
                </Text>
                {preferences.selectedSound === sound.id && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Options de notification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Options</Text>
          <View style={styles.optionsCard}>
            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Ionicons name="volume-high" size={24} color={COLORS.primary} />
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>Activer les sons</Text>
                  <Text style={styles.optionDescription}>
                    Sons d'alerte pour les nouvelles commandes
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.soundEnabled}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, soundEnabled: value })
                }
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Ionicons name="phone-portrait" size={24} color={COLORS.primary} />
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>Vibration</Text>
                  <Text style={styles.optionDescription}>
                    Vibrer lors des notifications
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.vibration}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, vibration: value })
                }
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Ionicons name="notifications" size={24} color={COLORS.primary} />
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>Notifications push</Text>
                  <Text style={styles.optionDescription}>
                    Recevoir des notifications push
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.pushNotifications}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, pushNotifications: value })
                }
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Ionicons name="chatbubble" size={24} color={COLORS.primary} />
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>SMS (commandes importantes)</Text>
                  <Text style={styles.optionDescription}>
                    Recevoir des SMS pour les commandes urgentes
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.smsEnabled}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, smsEnabled: value })
                }
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Ionicons name="mail" size={24} color={COLORS.primary} />
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>Email (rapports quotidiens)</Text>
                  <Text style={styles.optionDescription}>
                    Recevoir les rapports par email
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.emailEnabled}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, emailEnabled: value })
                }
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Ionicons name="alert-circle" size={24} color={COLORS.primary} />
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>Urgentes uniquement</Text>
                  <Text style={styles.optionDescription}>
                    Notifier seulement les commandes urgentes
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.urgentOnly}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, urgentOnly: value })
                }
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Enregistrer les préférences</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  soundsContainer: {
    gap: 12,
  },
  soundOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 12,
  },
  soundOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  soundLabel: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  soundLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  optionsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  footer: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

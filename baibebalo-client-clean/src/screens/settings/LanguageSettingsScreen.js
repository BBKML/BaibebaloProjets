import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../constants/colors';

const LANGUAGE_STORAGE_KEY = 'app_language';

export default function LanguageSettingsScreen({ navigation }) {
  const [selectedLanguage, setSelectedLanguage] = useState('fr');

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((saved) => {
      if (saved) setSelectedLanguage(saved);
    });
  }, []);

  const languages = [
    {
      code: 'fr',
      name: 'Français',
      nativeName: 'Français',
      flag: '🇫🇷',
    },
    {
      code: 'sn',
      name: 'Sénoufo',
      nativeName: 'Sénoufo',
      flag: '🇨🇮',
    },
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇬🇧',
    },
    {
      code: 'ar',
      name: 'العربية',
      nativeName: 'العربية',
      flag: '🇸🇦',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Paramètres de langue</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choisissez votre langue</Text>
        <Text style={styles.headerSubtitle}>
          Sélectionnez la langue préférée pour naviguer dans BAIBEBALO.
        </Text>
      </View>

      <View style={styles.languagesContainer}>
        {languages.map((language) => {
          const isSelected = selectedLanguage === language.code;
          return (
            <TouchableOpacity
              key={language.code}
              style={[styles.languageCard, isSelected && styles.languageCardSelected]}
              onPress={() => setSelectedLanguage(language.code)}
            >
              <View style={styles.languageInfo}>
                <View style={styles.languageIcon}>
                  <Ionicons name="language" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.languageDetails}>
                  <Text style={styles.languageName}>{language.name}</Text>
                  <Text style={styles.languageNativeName}>{language.nativeName}</Text>
                </View>
              </View>
              <View style={styles.radio}>
                {isSelected && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footer}>
        <View style={styles.infoRow}>
          <Ionicons name="information-circle" size={16} color={COLORS.primary} />
          <Text style={styles.infoText}>
            L'application sera redémarrée pour appliquer les changements.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={async () => {
            try {
              await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, selectedLanguage);
              navigation.navigate('SettingsUpdateSuccess', {
                message: 'Votre langue a été mise à jour.',
              });
            } catch (_) {
              Alert.alert('Erreur', 'Impossible de sauvegarder la langue');
            }
          }}
        >
          <Text style={styles.saveButtonText}>Appliquer les changements</Text>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  topBarSpacer: {
    width: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  languagesContainer: {
    padding: 16,
    gap: 12,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  languageIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageDetails: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  languageNativeName: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  footer: {
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

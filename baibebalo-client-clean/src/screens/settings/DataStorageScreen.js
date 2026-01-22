import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAuthStore from '../../store/authStore';

export default function DataStorageScreen({ navigation }) {
  const { logout } = useAuthStore();
  const [cacheSize, setCacheSize] = useState('40 MB');
  const [lowDataMode, setLowDataMode] = useState(true);

  const handleClearCache = () => {
    Alert.alert(
      'Effacer le cache',
      'Êtes-vous sûr de vouloir effacer toutes les données mises en cache ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await AsyncStorage.removeItem('recentSearches');
                setCacheSize('0 MB');
                Alert.alert('Succès', 'Le cache a été effacé');
              } catch (error) {
                console.error('Erreur effacement cache:', error);
                Alert.alert('Erreur', 'Impossible d\'effacer le cache');
              }
            })();
          },
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Effacer toutes les données',
      'Cette action supprimera toutes les données locales de l\'application. Êtes-vous sûr ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user', 'recentSearches']);
                await logout();
                Alert.alert('Succès', 'Toutes les données ont été effacées');
              } catch (error) {
                console.error('Erreur effacement données:', error);
                Alert.alert('Erreur', 'Impossible d\'effacer les données');
              }
            })();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Données et stockage</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Stockage de l'application</Text>
        <Text style={styles.headerSubtitle}>
          Gérez l'espace utilisé par BAIBEBALO sur votre téléphone.
        </Text>
      </View>

      <View style={styles.storageCard}>
        <View style={styles.storageHeader}>
          <View>
            <Text style={styles.storageLabel}>Utilisation totale</Text>
            <Text style={styles.storageValue}>124 Mo utilisés</Text>
          </View>
          <Text style={styles.storagePill}>48% plein</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>
        <View style={styles.storageLegend}>
          <Text style={styles.legendText}>App : 84 Mo</Text>
          <Text style={styles.legendText}>Cache : {cacheSize}</Text>
          <Text style={styles.legendText}>Total : 256 Mo</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gestion du stockage</Text>
        <TouchableOpacity style={styles.actionRow} onPress={handleClearCache}>
          <View style={styles.actionIcon}>
            <Ionicons name="trash-outline" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionLabel}>Vider le cache</Text>
            <Text style={styles.actionDescription}>
              Supprimer les fichiers temporaires pour libérer 40 Mo
            </Text>
          </View>
          <Text style={styles.actionChip}>Vider</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionRow} onPress={handleClearData}>
          <View style={styles.actionIconMuted}>
            <Ionicons name="document-text-outline" size={20} color={COLORS.text} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionLabel}>Gérer les téléchargements</Text>
            <Text style={styles.actionDescription}>
              Factures et reçus enregistrés
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Économie de données</Text>
        <View style={styles.toggleRow}>
          <View style={styles.toggleIcon}>
            <Ionicons name="speedometer" size={20} color={COLORS.warning} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionLabel}>Mode données réduites</Text>
            <Text style={styles.actionDescription}>
              Diminue la qualité des images pour économiser votre forfait
            </Text>
          </View>
          <Switch
            value={lowDataMode}
            onValueChange={setLowDataMode}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </View>
        <View style={styles.actionRow}>
          <View style={styles.actionIconMuted}>
            <Ionicons name="image-outline" size={20} color={COLORS.text} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionLabel}>Qualité des images</Text>
            <Text style={styles.actionDescription}>Automatique</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
        </View>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={18} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Conseil : Utilisez le Wi‑Fi pour télécharger vos reçus et factures.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

DataStorageScreen.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
  }).isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  storageCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    margin: 16,
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  storageLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  storageValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  storagePill: {
    fontSize: 12,
    color: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: 6,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  progressFill: {
    width: '48%',
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  storageLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  legendText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  actionContent: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconMuted: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionChip: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  toggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.warning + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: {
    padding: 16,
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 20,
  },
});

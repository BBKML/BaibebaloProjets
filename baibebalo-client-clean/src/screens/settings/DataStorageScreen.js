import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

export default function DataStorageScreen({ navigation }) {
  const [cacheSize, setCacheSize] = useState('125 MB');
  const [dataUsage, setDataUsage] = useState({
    images: '85 MB',
    videos: '30 MB',
    other: '10 MB',
  });

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
            // TODO: Implémenter l'effacement du cache
            setCacheSize('0 MB');
            Alert.alert('Succès', 'Le cache a été effacé');
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
            // TODO: Implémenter l'effacement des données
            Alert.alert('Succès', 'Toutes les données ont été effacées');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Données et stockage</Text>
        <Text style={styles.headerSubtitle}>
          Gérez l'utilisation du stockage de l'application
        </Text>
      </View>

      {/* Utilisation du stockage */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Utilisation du stockage</Text>
        <View style={styles.storageCard}>
          <View style={styles.storageHeader}>
            <Ionicons name="folder-outline" size={24} color={COLORS.primary} />
            <View style={styles.storageInfo}>
              <Text style={styles.storageLabel}>Cache total</Text>
              <Text style={styles.storageValue}>{cacheSize}</Text>
            </View>
          </View>
          <View style={styles.storageDetails}>
            <View style={styles.storageItem}>
              <Text style={styles.storageItemLabel}>Images</Text>
              <Text style={styles.storageItemValue}>{dataUsage.images}</Text>
            </View>
            <View style={styles.storageItem}>
              <Text style={styles.storageItemLabel}>Vidéos</Text>
              <Text style={styles.storageItemValue}>{dataUsage.videos}</Text>
            </View>
            <View style={styles.storageItem}>
              <Text style={styles.storageItemLabel}>Autres</Text>
              <Text style={styles.storageItemValue}>{dataUsage.other}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleClearCache}
        >
          <Ionicons name="trash-outline" size={24} color={COLORS.warning} />
          <View style={styles.actionContent}>
            <Text style={styles.actionLabel}>Effacer le cache</Text>
            <Text style={styles.actionDescription}>
              Supprime les fichiers temporaires
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardDanger]}
          onPress={handleClearData}
        >
          <Ionicons name="warning-outline" size={24} color={COLORS.error} />
          <View style={styles.actionContent}>
            <Text style={[styles.actionLabel, styles.actionLabelDanger]}>
              Effacer toutes les données
            </Text>
            <Text style={styles.actionDescription}>
              Supprime toutes les données locales
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Informations */}
      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={24}
            color={COLORS.info}
          />
          <Text style={styles.infoText}>
            L'effacement du cache peut améliorer les performances de
            l'application. Vos données personnelles ne seront pas affectées.
          </Text>
        </View>
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
  section: {
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  storageCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  storageInfo: {
    flex: 1,
  },
  storageLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  storageValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  storageDetails: {
    gap: 12,
  },
  storageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storageItemLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  storageItemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  actionCardDanger: {
    borderWidth: 1,
    borderColor: COLORS.error + '40',
  },
  actionContent: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  actionLabelDanger: {
    color: COLORS.error,
  },
  actionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoSection: {
    padding: 16,
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.info + '20',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
});

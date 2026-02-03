import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Switch, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';

export default function SecuritySettingsScreen({ navigation }) {
  const { user } = useAuthStore();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [notifyLogin, setNotifyLogin] = useState(true);

  const handleBiometricToggle = (value) => {
    if (value) {
      Alert.alert(
        'Activer la biométrie',
        'Voulez-vous utiliser votre empreinte digitale ou Face ID pour vous connecter plus rapidement ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Activer', onPress: () => setBiometricEnabled(true) },
        ]
      );
    } else {
      setBiometricEnabled(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Sécurité</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Info OTP */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="shield-checkmark" size={32} color={COLORS.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Authentification par SMS</Text>
            <Text style={styles.infoText}>
              Votre compte est sécurisé par code OTP envoyé par SMS. Pas de mot de passe à retenir !
            </Text>
          </View>
        </View>

        {/* Téléphone vérifié */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Téléphone vérifié</Text>
          <View style={styles.phoneCard}>
            <View style={styles.phoneInfo}>
              <Ionicons name="call" size={20} color={COLORS.primary} />
              <Text style={styles.phoneNumber}>{user?.phone || '+225 XX XX XX XX'}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success || '#10B981'} />
              <Text style={styles.verifiedText}>Vérifié</Text>
            </View>
          </View>
        </View>

        {/* Options de sécurité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Options de sécurité</Text>
          <View style={styles.optionsCard}>
            {/* Biométrie */}
            <View style={styles.optionItem}>
              <View style={styles.optionLeft}>
                <View style={styles.optionIcon}>
                  <Ionicons name="finger-print" size={22} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.optionLabel}>Connexion biométrique</Text>
                  <Text style={styles.optionDescription}>Empreinte digitale / Face ID</Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: COLORS.border, true: COLORS.primary + '50' }}
                thumbColor={biometricEnabled ? COLORS.primary : '#f4f3f4'}
              />
            </View>

            <View style={styles.optionDivider} />

            {/* Notification de connexion */}
            <View style={styles.optionItem}>
              <View style={styles.optionLeft}>
                <View style={styles.optionIcon}>
                  <Ionicons name="notifications" size={22} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.optionLabel}>Alertes de connexion</Text>
                  <Text style={styles.optionDescription}>Notification à chaque nouvelle connexion</Text>
                </View>
              </View>
              <Switch
                value={notifyLogin}
                onValueChange={setNotifyLogin}
                trackColor={{ false: COLORS.border, true: COLORS.primary + '50' }}
                thumbColor={notifyLogin ? COLORS.primary : '#f4f3f4'}
              />
            </View>
          </View>
        </View>

        {/* Sessions actives */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appareil actuel</Text>
          <View style={styles.deviceCard}>
            <View style={styles.deviceIcon}>
              <Ionicons name="phone-portrait" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>Cet appareil</Text>
              <Text style={styles.deviceDetails}>Connecté maintenant</Text>
            </View>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>Actif</Text>
            </View>
          </View>
        </View>

        {/* Conseils de sécurité */}
        <View style={styles.tipsCard}>
          <Ionicons name="bulb-outline" size={20} color={COLORS.warning || '#F59E0B'} />
          <Text style={styles.tipsText}>
            Conseil : Ne partagez jamais votre code OTP avec quelqu'un. BAIBEBALO ne vous demandera jamais votre code par téléphone.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: COLORS.white, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  title: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: COLORS.text 
  },
  placeholder: { 
    width: 40 
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  infoIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.primary,
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    marginLeft: 4,
  },
  phoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  phoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  phoneNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B98115',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  optionsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  optionDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  optionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 68,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  deviceDetails: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  activeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  tipsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
  },
  tipsText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
});

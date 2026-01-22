import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import { deleteUserAccount } from '../../api/support';

export default function DeleteAccountConfirmationScreen({ navigation }) {
  const { logout } = useAuthStore();
  const [confirmationText, setConfirmationText] = useState('');
  const [loading, setLoading] = useState(false);
  const requiredText = 'SUPPRIMER';

  const handleDeleteAccount = async () => {
    if (confirmationText !== requiredText) {
      Alert.alert('Erreur', `Veuillez taper "${requiredText}" pour confirmer`);
      return;
    }

    Alert.alert(
      'Dernière confirmation',
      'Cette action est irréversible. Toutes vos données seront définitivement supprimées. Êtes-vous absolument sûr ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer définitivement',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await deleteUserAccount(null, 'DELETE');
              
              await logout();
              
              Alert.alert(
                'Compte supprimé',
                'Votre compte a été supprimé avec succès.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'PhoneEntry' }],
                      });
                    },
                  },
                ]
              );
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le compte');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Icône d'avertissement */}
        <View style={styles.iconContainer}>
          <Ionicons name="warning" size={80} color={COLORS.error} />
        </View>

        {/* Titre */}
        <Text style={styles.title}>Supprimer mon compte</Text>

        {/* Avertissement */}
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Attention !</Text>
          <Text style={styles.warningText}>
            La suppression de votre compte est définitive et irréversible.
            Toutes vos données seront perdues :
          </Text>
          <View style={styles.warningList}>
            <View style={styles.warningItem}>
              <Ionicons name="close-circle" size={20} color={COLORS.error} />
              <Text style={styles.warningItemText}>Historique de commandes</Text>
            </View>
            <View style={styles.warningItem}>
              <Ionicons name="close-circle" size={20} color={COLORS.error} />
              <Text style={styles.warningItemText}>Adresses enregistrées</Text>
            </View>
            <View style={styles.warningItem}>
              <Ionicons name="close-circle" size={20} color={COLORS.error} />
              <Text style={styles.warningItemText}>Points de fidélité</Text>
            </View>
            <View style={styles.warningItem}>
              <Ionicons name="close-circle" size={20} color={COLORS.error} />
              <Text style={styles.warningItemText}>Préférences et paramètres</Text>
            </View>
          </View>
        </View>

        {/* Confirmation */}
        <View style={styles.confirmationSection}>
          <Text style={styles.confirmationLabel}>
            Pour confirmer, tapez <Text style={styles.confirmationRequired}>{requiredText}</Text>
          </Text>
          <TextInput
            style={[
              styles.confirmationInput,
              confirmationText === requiredText && styles.confirmationInputValid,
            ]}
            placeholder={requiredText}
            placeholderTextColor={COLORS.textLight}
            value={confirmationText}
            onChangeText={setConfirmationText}
            autoCapitalize="characters"
          />
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.deleteButton,
              (confirmationText !== requiredText || loading) && styles.deleteButtonDisabled,
            ]}
            onPress={handleDeleteAccount}
            disabled={confirmationText !== requiredText || loading}
          >
            <Text style={styles.deleteButtonText}>
              {loading ? 'Suppression...' : 'Supprimer mon compte'}
            </Text>
          </TouchableOpacity>
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
  content: {
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  warningBox: {
    backgroundColor: COLORS.error + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.error + '40',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.error,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 16,
  },
  warningList: {
    gap: 12,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningItemText: {
    fontSize: 14,
    color: COLORS.text,
  },
  confirmationSection: {
    marginBottom: 32,
  },
  confirmationLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmationRequired: {
    fontWeight: '700',
    color: COLORS.error,
  },
  confirmationInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  confirmationInputValid: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '10',
  },
  actionsSection: {
    gap: 12,
  },
  cancelButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});

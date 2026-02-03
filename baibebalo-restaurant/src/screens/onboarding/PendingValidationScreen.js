import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { restaurantAuth } from '../../api/auth';
import useAuthStore from '../../store/authStore';

const STATUS_ACTIVE = ['active', 'approved'];
const STATUS_REJECTED = 'rejected';
const STATUS_PENDING = 'pending';

export default function PendingValidationScreen({ navigation }) {
  const [status, setStatus] = useState(null); // null = pas encore vérifié, pending, active, approved, rejected
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // 'success' | 'warning' | 'error' | 'info'
  const insets = useSafeAreaInsets();
  const token = useAuthStore((state) => state.token);

  const setResult = (msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
  };

  const checkStatus = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      if (!token) {
        setStatus(null);
        setResult(
          'Vous n\'êtes pas connecté à cette session. Si l\'admin a déjà validé votre compte, cliquez sur "Se connecter" pour vous connecter avec votre téléphone et mot de passe.',
          'info'
        );
        setLoading(false);
        return;
      }
      
      const response = await restaurantAuth.checkRegistrationStatus();
      const restaurantStatus = response.data?.restaurant?.status || response.restaurant?.status || response.status || 'pending';
      setStatus(restaurantStatus);
      
      if (STATUS_ACTIVE.includes(restaurantStatus)) {
        setResult(
          'Votre compte a été validé. Vous pouvez maintenant cliquer sur "Se connecter" pour accéder à votre espace.',
          'success'
        );
      } else if (restaurantStatus === STATUS_REJECTED) {
        const reason = response.data?.restaurant?.rejection_reason || response.restaurant?.rejection_reason || '';
        setResult(
          reason
            ? `Votre demande a été refusée. Raison : ${reason} Reprenez l'inscription ou contactez le support.`
            : 'Votre demande a été refusée. Reprenez l\'inscription ou contactez le support.',
          'error'
        );
      } else {
        setResult(
          'Votre demande est toujours en cours d\'examen. Vous serez notifié dès qu\'une décision sera prise.',
          'warning'
        );
      }
    } catch (error) {
      const err = error?.error || error;
      const code = err?.code || error?.code;
      
      if (code === 'NO_TOKEN') {
        setStatus(null);
        setResult(
          'Session expirée. Si votre compte a déjà été validé par l\'admin, cliquez sur "Se connecter" pour vous connecter.',
          'info'
        );
      } else {
        setStatus(null);
        setResult(
          'Impossible de vérifier le statut. Vérifiez votre connexion. Si votre compte a été validé, essayez "Se connecter".',
          'error'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    const isApproved = status && STATUS_ACTIVE.includes(status);
    
    if (isApproved) {
      navigation.replace('RestaurantLogin');
      return;
    }
    
    if (status === STATUS_REJECTED) {
      Alert.alert(
        'Connexion impossible',
        'Votre demande a été refusée. Vous ne pouvez pas vous connecter. Reprenez l\'inscription ou contactez le support si le problème vient de l\'inscription.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (status === STATUS_PENDING || status === null) {
      Alert.alert(
        'Compte non validé',
        'Vous ne pouvez pas vous connecter tant que votre compte n\'est pas validé par l\'administrateur. Reprenez l\'inscription si le problème vient de l\'inscription, sinon attendez la validation.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    Alert.alert(
      'Connexion impossible',
      'Vous ne pouvez pas vous connecter. Reprenez l\'inscription si le problème vient de l\'inscription.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="time-outline" size={80} color={COLORS.warning} />
        </View>

        <Text style={styles.title}>Votre demande est en cours d'examen</Text>

        <Text style={styles.description}>
          Nous examinerons votre dossier sous 24-48h. Vous recevrez une notification par email/SMS dès qu'une décision sera prise.
        </Text>

        {message ? (
          <View style={[styles.messageBox, styles[`messageBox_${messageType}`]]}>
            <Ionicons
              name={messageType === 'success' ? 'checkmark-circle' : messageType === 'error' ? 'close-circle' : 'information-circle'}
              size={22}
              color={messageType === 'success' ? COLORS.success : messageType === 'error' ? (COLORS.error || '#E53E3E') : messageType === 'warning' ? COLORS.warning : COLORS.info}
            />
            <Text style={[styles.messageText, styles[`messageText_${messageType}`]]}>{message}</Text>
          </View>
        ) : null}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={COLORS.info} />
          <Text style={styles.infoText}>
            Vous pouvez fermer l'application. Nous vous notifierons dès qu'une décision sera prise.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={checkStatus}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons name="refresh" size={20} color={COLORS.primary} />
          )}
          <Text style={styles.refreshButtonText}>Vérifier le statut</Text>
        </TouchableOpacity>

        {/* Bouton pour aller à la connexion */}
        <TouchableOpacity
          style={styles.loginButton}
          onPress={goToLogin}
        >
          <Ionicons name="log-in-outline" size={20} color={COLORS.white} />
          <Text style={styles.loginButtonText}>Se connecter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  messageBox: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  messageBox_success: {
    backgroundColor: (COLORS.success || '#22C55E') + '18',
  },
  messageBox_error: {
    backgroundColor: (COLORS.error || '#E53E3E') + '18',
  },
  messageBox_warning: {
    backgroundColor: (COLORS.warning || '#F59E0B') + '18',
  },
  messageBox_info: {
    backgroundColor: (COLORS.info || '#3B82F6') + '18',
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  messageText_success: {
    color: COLORS.success || '#22C55E',
  },
  messageText_error: {
    color: COLORS.error || '#E53E3E',
  },
  messageText_warning: {
    color: COLORS.warning || '#F59E0B',
  },
  messageText_info: {
    color: COLORS.info || '#3B82F6',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.info + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  refreshButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  loginButtonText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600',
  },
});

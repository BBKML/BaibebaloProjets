import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { reportClientAbsent } from '../../api/orders';

const ACTIONS = [
  { id: 'wait_more', label: 'Attendre encore', icon: 'time-outline' },
  { id: 'return_restaurant', label: 'Retourner au restaurant', icon: 'arrow-undo-outline' },
  { id: 'leave_neighbor', label: 'Laisser chez un voisin', icon: 'people-outline' },
  { id: 'cancel', label: 'Annuler la livraison', icon: 'close-circle-outline' },
];

export default function ClientAbsentScreen({ navigation, route }) {
  const delivery = route.params?.delivery;
  const orderId = delivery?.id || delivery?.order_id;
  const [attempts, setAttempts] = useState(1);
  const [action, setAction] = useState(null);
  const [waitTimeMinutes, setWaitTimeMinutes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!orderId) {
      Alert.alert('Erreur', 'Commande introuvable.');
      return;
    }
    if (!action) {
      Alert.alert('Action requise', 'Veuillez choisir une action.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = { attempts, action };
      const wait = Number.parseInt(waitTimeMinutes, 10);
      if (!Number.isNaN(wait) && wait >= 0 && wait <= 30) payload.wait_time_minutes = wait;
      const response = await reportClientAbsent(orderId, payload);
      if (response?.success) {
        Alert.alert(
          'Signalement enregistré',
          'Votre signalement a été pris en compte. Suivez les instructions selon l\'action choisie.',
          [{ text: 'OK', onPress: () => navigation.navigate('Deliveries') }]
        );
      } else {
        Alert.alert('Erreur', response?.error?.message || 'Envoi impossible.');
      }
    } catch (err) {
      console.error('Client absent:', err);
      Alert.alert(
        'Erreur',
        err?.response?.data?.error?.message || 'Impossible d\'envoyer le signalement.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={submitting}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Client absent</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Ionicons name="person-remove" size={56} color={COLORS.warning} />
        <Text style={styles.message}>
          Indiquez le nombre de tentatives effectuées et l’action à prendre.
        </Text>

        <Text style={styles.label}>Nombre de tentatives (1–3)</Text>
        <View style={styles.attemptsRow}>
          {[1, 2, 3].map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.attemptBtn, attempts === n && styles.attemptBtnActive]}
              onPress={() => setAttempts(n)}
            >
              <Text style={[styles.attemptText, attempts === n && styles.attemptTextActive]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Temps d’attente (min, optionnel)</Text>
        <TouchableOpacity
          style={styles.waitRow}
          onPress={() => {
            const opts = [0, 5, 10, 15, 20].map((m) => ({
              text: m === 0 ? 'Aucun' : `${m} min`,
              onPress: () => setWaitTimeMinutes(m === 0 ? '' : String(m)),
            }));
            opts.push({ text: 'Annuler', style: 'cancel' });
            Alert.alert('Temps d\'attente', undefined, opts);
          }}
        >
          <Text style={styles.waitValue}>{waitTimeMinutes === '' ? 'Choisir…' : `${waitTimeMinutes} min`}</Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.label}>Action à prendre</Text>
        {ACTIONS.map((a) => (
          <TouchableOpacity
            key={a.id}
            style={[styles.actionCard, action === a.id && styles.actionCardActive]}
            onPress={() => setAction(a.id)}
          >
            <Ionicons name={a.icon} size={24} color={action === a.id ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.actionLabel, action === a.id && styles.actionLabelActive]}>{a.label}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.submitBtn, (!action || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!action || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Envoyer le signalement</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  placeholder: { width: 40 },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  message: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12, marginBottom: 24, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 10 },
  attemptsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  attemptBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attemptBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  attemptText: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  attemptTextActive: { color: COLORS.primary },
  waitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  waitValue: { fontSize: 16, color: COLORS.text },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  actionCardActive: { borderColor: COLORS.primary },
  actionLabel: { fontSize: 16, color: COLORS.text },
  actionLabelActive: { fontWeight: '600', color: COLORS.primary },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});

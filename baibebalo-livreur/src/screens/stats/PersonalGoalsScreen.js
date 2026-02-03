import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import useDeliveryStore from '../../store/deliveryStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GOALS_STORAGE_KEY = 'delivery_personal_goals';

export default function PersonalGoalsScreen({ navigation }) {
  const { dailyGoal, todayStats, earningsData } = useDeliveryStore();
  
  const [goals, setGoals] = useState({
    dailyDeliveries: 10,
    dailyEarnings: 15000,
    weeklyDeliveries: 50,
    monthlyEarnings: 200000,
  });
  const [editing, setEditing] = useState(false);
  const [tempGoals, setTempGoals] = useState(goals);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const stored = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
      if (stored) {
        setGoals(JSON.parse(stored));
        setTempGoals(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erreur chargement objectifs:', error);
    }
  };

  const saveGoals = async () => {
    try {
      await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(tempGoals));
      setGoals(tempGoals);
      setEditing(false);
      Alert.alert('Succès', 'Objectifs mis à jour!');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder les objectifs');
    }
  };

  const calculateProgress = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };

  const todayDeliveries = dailyGoal.completed || 0;
  const todayEarningsValue = todayStats.earnings || earningsData.today || 0;
  const weekEarnings = earningsData.this_week || 0;
  const monthEarnings = earningsData.this_month || 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Objectifs personnels</Text>
        <TouchableOpacity onPress={() => editing ? saveGoals() : setEditing(true)}>
          <Text style={styles.editButton}>{editing ? 'Sauvegarder' : 'Modifier'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Objectif Journalier - Livraisons */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <View style={styles.goalIconContainer}>
              <Ionicons name="bicycle" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.goalInfo}>
              <Text style={styles.goalTitle}>Livraisons aujourd'hui</Text>
              {editing ? (
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={String(tempGoals.dailyDeliveries)}
                    onChangeText={(val) => setTempGoals({ ...tempGoals, dailyDeliveries: parseInt(val) || 0 })}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.inputLabel}>courses</Text>
                </View>
              ) : (
                <Text style={styles.goalProgress}>{todayDeliveries} / {goals.dailyDeliveries}</Text>
              )}
            </View>
          </View>
          {!editing && (
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${calculateProgress(todayDeliveries, goals.dailyDeliveries)}%` }]} />
            </View>
          )}
        </View>

        {/* Objectif Journalier - Gains */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <View style={[styles.goalIconContainer, { backgroundColor: COLORS.success + '15' }]}>
              <Ionicons name="cash" size={24} color={COLORS.success} />
            </View>
            <View style={styles.goalInfo}>
              <Text style={styles.goalTitle}>Gains aujourd'hui</Text>
              {editing ? (
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={String(tempGoals.dailyEarnings)}
                    onChangeText={(val) => setTempGoals({ ...tempGoals, dailyEarnings: parseInt(val) || 0 })}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.inputLabel}>FCFA</Text>
                </View>
              ) : (
                <Text style={styles.goalProgress}>{todayEarningsValue.toLocaleString()} / {goals.dailyEarnings.toLocaleString()} F</Text>
              )}
            </View>
          </View>
          {!editing && (
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, styles.progressBarSuccess, { width: `${calculateProgress(todayEarningsValue, goals.dailyEarnings)}%` }]} />
            </View>
          )}
        </View>

        {/* Objectif Hebdomadaire */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <View style={[styles.goalIconContainer, { backgroundColor: COLORS.info + '15' }]}>
              <Ionicons name="calendar" size={24} color={COLORS.info} />
            </View>
            <View style={styles.goalInfo}>
              <Text style={styles.goalTitle}>Livraisons cette semaine</Text>
              {editing ? (
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={String(tempGoals.weeklyDeliveries)}
                    onChangeText={(val) => setTempGoals({ ...tempGoals, weeklyDeliveries: parseInt(val) || 0 })}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.inputLabel}>courses</Text>
                </View>
              ) : (
                <Text style={styles.goalProgress}>{earningsData.total_deliveries || 0} / {goals.weeklyDeliveries}</Text>
              )}
            </View>
          </View>
          {!editing && (
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, styles.progressBarInfo, { width: `${calculateProgress(earningsData.total_deliveries || 0, goals.weeklyDeliveries)}%` }]} />
            </View>
          )}
        </View>

        {/* Objectif Mensuel - Gains */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <View style={[styles.goalIconContainer, { backgroundColor: COLORS.warning + '15' }]}>
              <Ionicons name="trophy" size={24} color={COLORS.warning} />
            </View>
            <View style={styles.goalInfo}>
              <Text style={styles.goalTitle}>Gains ce mois</Text>
              {editing ? (
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={String(tempGoals.monthlyEarnings)}
                    onChangeText={(val) => setTempGoals({ ...tempGoals, monthlyEarnings: parseInt(val) || 0 })}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.inputLabel}>FCFA</Text>
                </View>
              ) : (
                <Text style={styles.goalProgress}>{monthEarnings.toLocaleString()} / {goals.monthlyEarnings.toLocaleString()} F</Text>
              )}
            </View>
          </View>
          {!editing && (
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, styles.progressBarWarning, { width: `${calculateProgress(monthEarnings, goals.monthlyEarnings)}%` }]} />
            </View>
          )}
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Ionicons name="bulb-outline" size={20} color={COLORS.warning} />
          <Text style={styles.tipsText}>
            Définir des objectifs réalistes vous aide à rester motivé. Commencez petit et augmentez progressivement!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  editButton: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  goalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  goalHeader: { flexDirection: 'row', alignItems: 'center' },
  goalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goalInfo: { flex: 1 },
  goalTitle: { fontSize: 14, color: COLORS.textSecondary },
  goalProgress: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    minWidth: 80,
    textAlign: 'center',
  },
  inputLabel: { fontSize: 14, color: COLORS.textSecondary, marginLeft: 8 },
  progressBarContainer: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  progressBarSuccess: { backgroundColor: COLORS.success },
  progressBarInfo: { backgroundColor: COLORS.info },
  progressBarWarning: { backgroundColor: COLORS.warning },
  tipsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.warning + '15',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  tipsText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 18 },
});

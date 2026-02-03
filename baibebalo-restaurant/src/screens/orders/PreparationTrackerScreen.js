import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Vibration,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { restaurantOrders } from '../../api/orders';
import useRestaurantStore from '../../store/restaurantStore';
import soundService from '../../services/soundService';

export default function PreparationTrackerScreen({ navigation, route }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [checkedItems, setCheckedItems] = useState({});
  const [isOvertime, setIsOvertime] = useState(false);
  const [overtimeAlertShown, setOvertimeAlertShown] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Animation pour l'alerte de dépassement
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadOrder();
    soundService.initialize();
  }, []);

  // Timer et détection du dépassement de temps
  useEffect(() => {
    const interval = setInterval(() => {
      if (order?.preparationStartedAt || order?.accepted_at || order?.created_at) {
        const startTime = new Date(order.preparationStartedAt || order.accepted_at || order.created_at).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);

        // Vérifier si le temps estimé est dépassé
        const estimatedMinutes = order.estimated_preparation_time || order.estimatedTime || 20;
        const estimatedSeconds = estimatedMinutes * 60;

        if (elapsed > estimatedSeconds && !isOvertime) {
          setIsOvertime(true);
          // Déclencher l'alerte une seule fois
          if (!overtimeAlertShown) {
            triggerOvertimeAlert(estimatedMinutes);
            setOvertimeAlertShown(true);
          }
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [order, isOvertime, overtimeAlertShown]);

  // Fonction pour déclencher l'alerte de dépassement
  const triggerOvertimeAlert = async (estimatedMinutes) => {
    // Jouer le son d'alerte
    await soundService.alert();
    Vibration.vibrate([0, 500, 200, 500]);
    
    // Démarrer l'animation de pulsation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    // Afficher l'alerte
    Alert.alert(
      '⏰ Temps dépassé!',
      `Le temps de préparation estimé (${estimatedMinutes} min) est dépassé.\n\nVoulez-vous prolonger le temps ou marquer la commande comme prête?`,
      [
        { 
          text: 'Prolonger', 
          onPress: () => handleUpdateTime(),
          style: 'cancel',
        },
        { 
          text: 'Marquer prête', 
          onPress: () => handleMarkReady(),
        },
      ]
    );
  };

  const loadOrder = async () => {
    try {
      const response = await restaurantOrders.getOrderDetails(orderId);
      // Le backend retourne { success: true, data: { order: {...} } }
      const orderData = response.data?.order || response.order;
      setOrder(orderData);
      
      // Initialiser les items cochés
      const checked = {};
      orderData.items?.forEach((item, index) => {
        checked[index] = false;
      });
      setCheckedItems(checked);
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de charger la commande');
      navigation.goBack();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleItem = (index) => {
    setCheckedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const allItemsChecked = order?.items?.every((_, index) => checkedItems[index]);

  const handleMarkReady = async () => {
    try {
      await restaurantOrders.markReady(orderId);
      Alert.alert('Succès', 'Commande marquée comme prête', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert('Erreur', error.message);
    }
  };

  const handleUpdateTime = () => {
    Alert.prompt(
      'Modifier le temps estimé',
      'Nouveau temps estimé (en minutes) :',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Modifier',
          onPress: async (newTime) => {
            try {
              // Accepter la commande avec le nouveau temps estimé
              await restaurantOrders.acceptOrder(orderId, parseInt(newTime) || 20);
              await loadOrder();
            } catch (error) {
              const errorMessage = error.error?.message || error.message || 'Erreur';
              Alert.alert('Erreur', errorMessage);
            }
          },
        },
      ],
      'plain-text',
      order?.estimated_preparation_time?.toString() || order?.estimatedTime?.toString() || '20'
    );
  };

  if (!order) {
    return (
      <View style={styles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  const estimatedSeconds = (order.estimatedTime || 20) * 60;
  const progress = Math.min((elapsedTime / estimatedSeconds) * 100, 100);
  const remainingTime = Math.max(0, estimatedSeconds - elapsedTime);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: COLORS.preparing }]} />
            <Text style={styles.statusText}>En préparation</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Bannière d'alerte si temps dépassé */}
        {isOvertime && (
          <Animated.View style={[styles.overtimeBanner, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="warning" size={20} color="#FFF" />
            <Text style={styles.overtimeText}>
              ⏰ Temps estimé dépassé! (+{Math.floor((elapsedTime - estimatedSeconds) / 60)} min)
            </Text>
          </Animated.View>
        )}

        {/* Chronomètre */}
        <View style={[styles.timerSection, isOvertime && styles.timerSectionOvertime]}>
          <Text style={styles.timerLabel}>Temps écoulé</Text>
          <Text style={[styles.timerValue, isOvertime && styles.timerValueOvertime]}>
            {formatTime(elapsedTime)}
          </Text>
          <View style={[styles.progressBar, isOvertime && styles.progressBarOvertime]}>
            <View style={[
              styles.progressFill, 
              { width: `${Math.min(progress, 100)}%` },
              isOvertime && styles.progressFillOvertime
            ]} />
          </View>
          <Text style={styles.estimatedTime}>
            Temps estimé : {order.estimated_preparation_time || order.estimatedTime || 20} minutes
          </Text>
          {remainingTime > 0 ? (
            <Text style={styles.remainingTime}>
              Temps restant : ~{Math.ceil(remainingTime / 60)} minutes
            </Text>
          ) : (
            <Text style={styles.overtimeWarning}>
              ⚠️ Dépassement de {Math.floor((elapsedTime - estimatedSeconds) / 60)} min {(elapsedTime - estimatedSeconds) % 60}s
            </Text>
          )}
          <TouchableOpacity
            style={[styles.updateTimeButton, isOvertime && styles.updateTimeButtonUrgent]}
            onPress={handleUpdateTime}
          >
            <Ionicons name="time-outline" size={16} color={isOvertime ? '#E53E3E' : COLORS.primary} />
            <Text style={[styles.updateTimeText, isOvertime && styles.updateTimeTextUrgent]}>
              {isOvertime ? 'Prolonger le temps' : 'Modifier le temps estimé'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Informations commande */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations commande</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Client</Text>
              <Text style={styles.infoValue}>{order.customerName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Articles</Text>
              <Text style={styles.infoValue}>{order.items?.length || 0} articles</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Montant</Text>
              <Text style={styles.infoValue}>{order.total} FCFA</Text>
            </View>
          </View>
        </View>

        {/* Checklist des articles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Checklist de préparation</Text>
          <View style={styles.checklist}>
            {order.items?.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.checklistItem,
                  checkedItems[index] && styles.checklistItemChecked,
                ]}
                onPress={() => toggleItem(index)}
              >
                <View style={styles.checkbox}>
                  {checkedItems[index] && (
                    <Ionicons name="checkmark" size={20} color={COLORS.white} />
                  )}
                </View>
                <View style={styles.checklistItemContent}>
                  <Text
                    style={[
                      styles.checklistItemName,
                      checkedItems[index] && styles.checklistItemNameChecked,
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text style={styles.checklistItemQuantity}>x{item.quantity}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Footer avec action */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.readyButton,
            !allItemsChecked && styles.readyButtonDisabled,
          ]}
          onPress={handleMarkReady}
          disabled={!allItemsChecked}
        >
          <Ionicons name="checkmark-circle" size={24} color={COLORS.white} />
          <Text style={styles.readyButtonText}>COMMANDE PRÊTE</Text>
        </TouchableOpacity>
        {!allItemsChecked && (
          <Text style={styles.hintText}>
            Cochez tous les articles avant de marquer comme prêt
          </Text>
        )}
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
  headerContent: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.preparing + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.preparing,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  timerSection: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  timerLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  timerValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  estimatedTime: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  remainingTime: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 16,
  },
  updateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 8,
  },
  updateTimeText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  checklist: {
    gap: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 12,
  },
  checklistItemChecked: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '10',
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  checklistItemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checklistItemName: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  checklistItemNameChecked: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  checklistItemQuantity: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  footer: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  readyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  readyButtonDisabled: {
    opacity: 0.5,
  },
  readyButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  hintText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  // Styles pour dépassement de temps
  overtimeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E53E3E',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  overtimeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  timerSectionOvertime: {
    borderColor: '#E53E3E',
    borderWidth: 2,
  },
  timerValueOvertime: {
    color: '#E53E3E',
  },
  progressBarOvertime: {
    backgroundColor: '#FED7D7',
  },
  progressFillOvertime: {
    backgroundColor: '#E53E3E',
  },
  overtimeWarning: {
    fontSize: 14,
    color: '#E53E3E',
    fontWeight: 'bold',
    marginTop: 4,
  },
  updateTimeButtonUrgent: {
    borderColor: '#E53E3E',
  },
  updateTimeTextUrgent: {
    color: '#E53E3E',
  },
});

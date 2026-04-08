/**
 * Hook pour afficher les alertes Socket.IO sur tous les écrans du livreur.
 * Connexion uniquement quand enabled ET token sont prêts (évite "Pas de token livreur").
 */
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import socketService from '../services/socketService';
import useAuthStore from '../store/authStore';

export const useDeliverySocketAlerts = (enabled) => {
  const navigation = useNavigation();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!enabled || !token) return;

    let cancelled = false;
    socketService.connect(token).catch((e) => {
      if (!cancelled) console.warn('[SocketAlerts] Connexion:', e?.message || e);
    });

    const unsubscribeNewDelivery = socketService.on('new_delivery_available', (data) => {
      Alert.alert(
        '🚴 Nouvelle livraison disponible !',
        `${data.restaurant_name || 'Restaurant'}\n${(data.delivery_fee || 0).toLocaleString()} FCFA`,
        [
          { text: 'Ignorer', style: 'cancel' },
          { text: 'Voir', onPress: () => navigation.navigate('AvailableDeliveries') },
        ],
        { cancelable: true }
      );
    });

    const unsubscribeOrderReady = socketService.on('order_ready', (data) => {
      Alert.alert(
        '📦 Commande prête !',
        `La commande ${data.order_number || ''} est prête à récupérer chez ${data.restaurant_name || 'le restaurant'}`,
        [
          {
            text: 'Voir',
            onPress: () =>
              navigation.navigate('NavigationToRestaurant', { orderId: data.order_id || data.orderId }),
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
    });

    const unsubscribeOrderCancelled = socketService.on('order_cancelled', (data) => {
      Alert.alert(
        '❌ Commande annulée',
        `La commande ${data.order_number || ''} a été annulée par le client.`,
        [{ text: 'OK' }]
      );
    });

    const unsubscribeOrderProposed = socketService.on('order_proposed', (data) => {
      const orderId = data.order_id || data.orderId;
      if (!orderId) return;
      navigation.navigate('NewDeliveryAlert', { proposal: { ...data, order_id: orderId } });
    });

    return () => {
      cancelled = true;
      unsubscribeNewDelivery();
      unsubscribeOrderReady();
      unsubscribeOrderCancelled();
      unsubscribeOrderProposed();
      socketService.disconnect();
    };
  }, [enabled, token, navigation]);
};

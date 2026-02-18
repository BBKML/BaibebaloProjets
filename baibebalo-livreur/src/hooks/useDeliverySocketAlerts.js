/**
 * Hook pour afficher les alertes Socket.IO sur tous les écrans du livreur.
 * Les alertes s'affichent même lorsque l'utilisateur est sur DeliveriesScreen,
 * pendant une livraison, etc.
 */
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import socketService from '../services/socketService';
import { acceptOrder, declineOrder } from '../api/orders';

export const useDeliverySocketAlerts = (enabled) => {
  const navigation = useNavigation();

  useEffect(() => {
    if (!enabled) return;

    try {
      socketService.connect();
    } catch (e) {
      console.warn('[SocketAlerts] Connexion:', e?.message || e);
    }

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
      const expiresMin = data.expires_in_seconds ? Math.floor(data.expires_in_seconds / 60) : 2;
      Alert.alert(
        '📦 Course proposée',
        `${data.restaurant_name || 'Restaurant'}\n${(data.delivery_fee || data.total || 0).toLocaleString()} FCFA\n\nAcceptez dans les ${expiresMin} min.`,
        [
          {
            text: 'Refuser',
            style: 'cancel',
            onPress: async () => {
              try {
                await declineOrder(data.order_id || data.orderId, 'Refus proposition');
              } catch (e) {
                const msg = e?.response?.data?.error?.message || e?.message || 'Impossible de refuser';
                Alert.alert('Erreur', msg);
              }
            },
          },
          {
            text: 'Accepter',
            onPress: async () => {
              try {
                await acceptOrder(data.order_id);
                navigation.navigate('NavigationToRestaurant', { orderId: data.order_id });
              } catch (e) {
                Alert.alert('Erreur', e?.response?.data?.error?.message || 'Impossible d\'accepter la course.');
              }
            },
          },
        ],
        { cancelable: false }
      );
    });

    return () => {
      unsubscribeNewDelivery();
      unsubscribeOrderReady();
      unsubscribeOrderCancelled();
      unsubscribeOrderProposed();
    };
  }, [enabled, navigation]);
};

import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  registerNotificationToken,
  setupNotificationListeners,
  setupAndroidChannels,
} from '../services/notificationService';
import Toast from 'react-native-toast-message';

/**
 * Hook pour gérer les notifications push pour les livreurs
 */
export const useNotifications = (isAuthenticated) => {
  const navigation = useNavigation();
  const notificationListener = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !navigation?.navigate) {
      return;
    }

    // Initialiser canaux Android + token
    const initNotifications = async () => {
      try {
        await setupAndroidChannels();
        await registerNotificationToken();
      } catch (error) {
        if (__DEV__) {
          console.debug('[useNotifications] Non disponible (normal en Expo Go)');
        }
      }
    };

    initNotifications();

    // Configurer les listeners
    const removeListeners = setupNotificationListeners(
      // Notification reçue en avant-plan
      (notification) => {
        const { title, body, data: notifData } = notification.request.content;

        // Proposition de course : naviguer directement vers l'écran d'alerte
        if (notifData?.type === 'order_proposed' && notifData?.order_id) {
          navigation.navigate('NewDeliveryAlert', {
            proposal: {
              order_id: notifData.order_id,
              order_number: notifData.order_number,
              restaurant_name: notifData.restaurant_name,
              delivery_fee: Number(notifData.delivery_fee || 0),
              expires_in_seconds: Number(notifData.expires_in_seconds || 120),
            },
          });
          return;
        }

        // Autres notifications : afficher un toast
        Toast.show({
          type: 'info',
          text1: title || 'Nouvelle notification',
          text2: body || '',
          visibilityTime: 4000,
        });
      },
      // Notification tapée (app en arrière-plan ou fermée)
      (response) => {
        const { data: notifData } = response.notification.request.content;

        if (notifData?.type === 'order_proposed' && notifData?.order_id) {
          navigation.navigate('NewDeliveryAlert', {
            proposal: {
              order_id: notifData.order_id,
              order_number: notifData.order_number,
              restaurant_name: notifData.restaurant_name,
              delivery_fee: Number(notifData.delivery_fee || 0),
              expires_in_seconds: Number(notifData.expires_in_seconds || 120),
            },
          });
        } else if (notifData?.type === 'payout_completed' || notifData?.screen === 'Earnings') {
          navigation.navigate('Main', { screen: 'Earnings' });
        } else if (notifData?.order_id) {
          navigation.navigate('AvailableDeliveries');
        } else if (notifData?.screen) {
          navigation.navigate(notifData.screen, notifData.params || {});
        }
      }
    );

    notificationListener.current = removeListeners;

    return () => {
      if (notificationListener.current) {
        notificationListener.current();
      }
    };
  }, [isAuthenticated, navigation]);
};

/**
 * Hook pour gérer les notifications en arrière-plan (optionnel, déjà fait dans App.js)
 */
export const useBackgroundNotifications = () => {
  useEffect(() => {
    try {
      const Notifications = require('expo-notifications');
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    } catch (_) {}
  }, []);
};

export default useNotifications;

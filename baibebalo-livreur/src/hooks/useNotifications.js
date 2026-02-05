import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  registerNotificationToken,
  setupNotificationListeners,
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

    // Enregistrer le token au démarrage
    const initNotifications = async () => {
      try {
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
        const { title, body, data } = notification.request.content;
        
        // Afficher un toast
        Toast.show({
          type: 'info',
          text1: title || 'Nouvelle notification',
          text2: body || '',
          visibilityTime: 4000,
        });
      },
      // Notification tapée
      (response) => {
        const { data } = response.notification.request.content;
        
        // Naviguer selon le type de notification
        if (data?.type === 'new_delivery' && data?.order_id) {
          navigation.navigate('AvailableDeliveries');
        } else if (data?.orderId) {
          navigation.navigate('CurrentDelivery', { orderId: data.orderId });
        } else if (data?.screen) {
          navigation.navigate(data.screen, data.params || {});
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

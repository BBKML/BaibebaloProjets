import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import {
  registerNotificationToken,
  setupNotificationListeners,
} from '../services/notificationService';
import Toast from 'react-native-toast-message';

/**
 * Hook pour gérer les notifications push
 */
export const useNotifications = (isAuthenticated) => {
  // Utiliser useNavigation avec gestion d'erreur
  let navigation;
  try {
    navigation = useNavigation();
  } catch (error) {
    // Si navigation n'est pas disponible, on ne peut pas utiliser ce hook
    // Pas de warning - peut être normal si le composant n'est pas encore monté
    return;
  }

  const notificationListener = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Vérifier que navigation est disponible
    if (!navigation || !navigation.navigate) {
      // Pas de warning - peut être normal
      return;
    }

    // Enregistrer le token au démarrage (silencieusement)
    const initNotifications = async () => {
      try {
        await registerNotificationToken();
      } catch (error) {
        // Erreur silencieuse - ne pas perturber l'utilisateur
        // En Expo Go, c'est normal que ça échoue
        if (__DEV__) {
          console.debug('Notifications non disponibles (normal en Expo Go)');
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

        // Mettre à jour le badge si nécessaire
        if (data?.orderId) {
          // Optionnel : recharger les notifications
        }
      },
      // Notification tapée
      (response) => {
        const { data } = response.notification.request.content;
        
        // Naviguer vers la commande si c'est une notification de commande
        if (data?.orderId) {
          navigation.navigate('OrderDetails', { orderId: data.orderId });
        } else if (data?.screen) {
          // Navigation générique basée sur les données
          navigation.navigate(data.screen, data.params || {});
        }
      }
    );

    notificationListener.current = removeListeners;

    // Nettoyer les listeners au démontage
    return () => {
      if (notificationListener.current) {
        notificationListener.current();
      }
    };
  }, [isAuthenticated, navigation?.navigate]);

  return {
    // Fonctions utilitaires si nécessaire
  };
};

/**
 * Hook pour gérer les notifications en arrière-plan
 */
export const useBackgroundNotifications = () => {
  useEffect(() => {
    // Configurer le comportement des notifications en arrière-plan (avec gestion d'erreur)
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    } catch (error) {
      // Dans Expo Go, cette fonction peut échouer - on l'ignore silencieusement
      // Pas de warning - c'est normal en Expo Go
    }
  }, []);
};

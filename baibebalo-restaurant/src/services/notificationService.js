import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { restaurantNotifications } from '../api/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configurer le comportement des notifications (avec gestion d'erreur pour Expo Go)
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

const NOTIFICATION_TOKEN_KEY = 'expo_notification_token';

/**
 * Créer les canaux Android pour les notifications (requis Android 8+)
 */
export const setupAndroidChannels = async () => {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Nouvelles commandes',
      importance: Notifications.AndroidImportance?.MAX ?? 5,
      sound: 'default',
      vibrationPattern: [0, 400, 200, 400],
      enableLights: true,
      lightColor: '#22C55E',
      bypassDnd: true,
      lockscreenVisibility: 1,
    });
    await Notifications.setNotificationChannelAsync('urgent', {
      name: 'Alertes urgentes',
      importance: Notifications.AndroidImportance?.MAX ?? 5,
      sound: 'default',
      vibrationPattern: [0, 500, 100, 500, 100, 500],
      enableLights: true,
      lightColor: '#EF4444',
      bypassDnd: true,
      lockscreenVisibility: 1,
    });
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Général',
      importance: Notifications.AndroidImportance?.DEFAULT ?? 3,
      sound: 'default',
    });
  } catch (e) {
    if (__DEV__) console.debug('[Notification] Channels error:', e?.message);
  }
};

/**
 * Demander les permissions de notifications
 */
export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      // Pas de warning - c'est normal si l'utilisateur refuse les permissions
      return false;
    }

    return true;
  } catch (error) {
    // Erreur silencieuse - peut être normal en Expo Go
    if (__DEV__) {
      console.debug('Erreur lors de la demande de permissions:', error.message);
    }
    return false;
  }
};

/**
 * Obtenir le token de notification Expo
 */
export const getExpoPushToken = async () => {
  try {
    // Vérifier si on a déjà un token enregistré
    const storedToken = await AsyncStorage.getItem(NOTIFICATION_TOKEN_KEY);
    if (storedToken) {
      return storedToken;
    }

    // Vérifier si on est dans Expo Go
    const isExpoGoEnv = Constants?.executionEnvironment === 'storeClient' || 
                        Constants?.appOwnership === 'expo';
    if (isExpoGoEnv) {
      // En Expo Go, ne pas essayer d'obtenir un token
      return null;
    }

    // Vérifier si les notifications push sont supportées
    // Dans Expo Go (SDK 53+), les notifications push ne sont pas supportées
    try {
      // Obtenir un nouveau token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'your-project-id',
      });

      const token = tokenData.data;
      
      // Sauvegarder le token localement
      await AsyncStorage.setItem(NOTIFICATION_TOKEN_KEY, token);

      return token;
    } catch (pushError) {
      // Si c'est une erreur liée à Expo Go, on l'ignore silencieusement
      const errorMessage = pushError.message || '';
      if (errorMessage.includes('Expo Go') || 
          errorMessage.includes('development build') ||
          errorMessage.includes('was removed from Expo Go')) {
        // Pas de warning - c'est normal en Expo Go
        return null;
      }
      // Pour les autres erreurs, on les log en mode debug uniquement
      if (__DEV__) {
        console.debug('Erreur token notification:', errorMessage);
      }
      return null;
    }
  } catch (error) {
    // Erreur silencieuse en production, log en dev
    if (__DEV__) {
      console.debug('Erreur lors de l\'obtention du token Expo:', error.message);
    }
    return null;
  }
};

/**
 * Enregistrer le token au backend
 */
export const registerNotificationToken = async () => {
  try {
    // Vérifier si on est dans Expo Go - si oui, ne pas essayer d'enregistrer
    const isExpoGoEnv = Constants?.executionEnvironment === 'storeClient' || 
                        Constants?.appOwnership === 'expo';
    if (isExpoGoEnv) {
      // En Expo Go, les notifications push ne fonctionnent pas - on retourne silencieusement
      return false;
    }

    await setupAndroidChannels();

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      // Pas de warning - c'est normal si l'utilisateur refuse
      return false;
    }

    const token = await getExpoPushToken();
    if (!token) {
      // Pas de warning - peut être normal (Expo Go, etc.)
      return false;
    }

    // Enregistrer le token au backend
    await restaurantNotifications.saveFcmToken(token);
    if (__DEV__) {
      console.log('✅ Token de notification enregistré:', token.substring(0, 20) + '...');
    }
    
    return true;
  } catch (error) {
    // Erreur silencieuse - ne pas perturber l'utilisateur
    if (__DEV__) {
      console.debug('Erreur lors de l\'enregistrement du token:', error.message);
    }
    return false;
  }
};

/**
 * Configurer les listeners de notifications
 */
export const setupNotificationListeners = (onNotificationReceived, onNotificationTapped) => {
  try {
    // Vérifier si on est dans Expo Go
    const isExpoGoEnv = Constants?.executionEnvironment === 'storeClient' || 
                        Constants?.appOwnership === 'expo';
    if (isExpoGoEnv) {
      // En Expo Go, les listeners ne fonctionnent pas - retourner une fonction vide
      return () => {};
    }

    // Écouter les notifications reçues en avant-plan
    const receivedSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (__DEV__) {
          console.log('📬 Notification reçue:', notification.request.content.title);
        }
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      }
    );

    // Écouter les notifications sur lesquelles l'utilisateur a tapé
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (__DEV__) {
          console.log('👆 Notification tapée:', response.notification.request.content.title);
        }
        if (onNotificationTapped) {
          onNotificationTapped(response);
        }
      }
    );

    return () => {
      try {
        receivedSubscription.remove();
        responseSubscription.remove();
      } catch (error) {
        // Erreur silencieuse lors du nettoyage
        if (__DEV__) {
          console.debug('Erreur lors de la suppression des listeners:', error.message);
        }
      }
    };
  } catch (error) {
    // Si les notifications ne sont pas supportées (Expo Go), on retourne une fonction vide
    // Pas de warning - c'est normal en Expo Go
    return () => {}; // Fonction de nettoyage vide
  }
};

/**
 * Obtenir le nombre de badges (notifications non lues)
 */
export const getBadgeCount = async () => {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    // Erreur silencieuse
    if (__DEV__) {
      console.debug('Erreur lors de la récupération du badge:', error.message);
    }
    return 0;
  }
};

/**
 * Définir le nombre de badges
 */
export const setBadgeCount = async (count) => {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    // Erreur silencieuse
    if (__DEV__) {
      console.debug('Erreur lors de la définition du badge:', error.message);
    }
  }
};

/**
 * Réinitialiser le badge
 */
export const resetBadge = async () => {
  await setBadgeCount(0);
};

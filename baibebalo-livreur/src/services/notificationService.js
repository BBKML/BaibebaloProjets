import Constants from 'expo-constants';
import { saveFCMToken } from '../api/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Pas d'import expo-notifications ici : en APK il peut faire planter l'app au démarrage.
// Chargement paresseux dans chaque fonction qui en a besoin.
function getNotifications() {
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
}

const NOTIFICATION_TOKEN_KEY = 'delivery_notification_token';

/**
 * Demander les permissions de notifications
 */
export const requestNotificationPermissions = async () => {
  const Notifications = getNotifications();
  if (!Notifications) return false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    return true;
  } catch (error) {
    if (__DEV__) {
      console.debug('[Notification] Erreur permissions:', error.message);
    }
    return false;
  }
};

/**
 * Vérifier si on est dans Expo Go
 */
const isExpoGo = () => {
  try {
    return Constants?.executionEnvironment === 'storeClient' || 
           Constants?.appOwnership === 'expo';
  } catch {
    return false;
  }
};

/**
 * Obtenir le token de notification Expo
 */
export const getExpoPushToken = async () => {
  const Notifications = getNotifications();
  if (!Notifications) return null;
  try {
    // Vérifier si on a déjà un token enregistré
    const storedToken = await AsyncStorage.getItem(NOTIFICATION_TOKEN_KEY);
    if (storedToken) {
      return storedToken;
    }

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
      const errorMessage = pushError.message || '';
      if (errorMessage.includes('Expo Go') || 
          errorMessage.includes('development build') ||
          errorMessage.includes('was removed from Expo Go')) {
        return null;
      }
      if (__DEV__) {
        console.debug('[Notification] Erreur token:', errorMessage);
      }
      return null;
    }
  } catch (error) {
    if (__DEV__) {
      console.debug('[Notification] Erreur token Expo:', error.message);
    }
    return null;
  }
};

/**
 * Enregistrer le token au backend
 */
export const registerNotificationToken = async () => {
  try {
    // Vérifier si on est dans Expo Go
    if (isExpoGo()) {
      return false;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    const token = await getExpoPushToken();
    if (!token) {
      return false;
    }

    // Enregistrer le token au backend
    await saveFCMToken(token);
    if (__DEV__) {
      console.log('[Notification] ✅ Token enregistré:', token.substring(0, 20) + '...');
    }
    
    return true;
  } catch (error) {
    if (__DEV__) {
      console.debug('[Notification] Erreur enregistrement:', error.message);
    }
    return false;
  }
};

/**
 * Configurer les listeners de notifications
 */
export const setupNotificationListeners = (onNotificationReceived, onNotificationTapped) => {
  const Notifications = getNotifications();
  if (!Notifications) return () => {};
  try {
    if (isExpoGo()) {
      return () => {};
    }

    // Écouter les notifications reçues en avant-plan
    const receivedSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (__DEV__) {
          console.log('[Notification] 📬 Reçue:', notification.request.content.title);
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
          console.log('[Notification] 👆 Tapée:', response.notification.request.content.title);
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
        if (__DEV__) {
          console.debug('[Notification] Erreur cleanup:', error.message);
        }
      }
    };
  } catch (error) {
    return () => {};
  }
};

/**
 * Afficher une notification locale
 */
export const showLocalNotification = async (title, body, data = {}) => {
  const Notifications = getNotifications();
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null, // Immédiat
    });
  } catch (error) {
    if (__DEV__) {
      console.debug('[Notification] Erreur locale:', error.message);
    }
  }
};

/**
 * Obtenir le nombre de badges
 */
export const getBadgeCount = async () => {
  const Notifications = getNotifications();
  if (!Notifications) return 0;
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    return 0;
  }
};

/**
 * Définir le nombre de badges
 */
export const setBadgeCount = async (count) => {
  const Notifications = getNotifications();
  if (!Notifications) return;
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    // Erreur silencieuse
  }
};

/**
 * Réinitialiser le badge
 */
export const resetBadge = async () => {
  await setBadgeCount(0);
};

export default {
  requestNotificationPermissions,
  getExpoPushToken,
  registerNotificationToken,
  setupNotificationListeners,
  showLocalNotification,
  getBadgeCount,
  setBadgeCount,
  resetBadge,
};

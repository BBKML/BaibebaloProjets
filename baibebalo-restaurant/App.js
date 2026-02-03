import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';

// Configurer le comportement des notifications par défaut (avec gestion d'erreur pour Expo Go)
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (error) {
  // Dans Expo Go (SDK 53+), les notifications push ne sont pas supportées
  // Pas de warning - c'est normal et attendu en Expo Go
  // L'application fonctionnera normalement sans notifications push
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AppNavigator />
      <Toast />
    </SafeAreaProvider>
  );
}

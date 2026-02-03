import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';

// Configurer le comportement des notifications par défaut
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (error) {
  // Dans Expo Go, les notifications push ne sont pas supportées
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

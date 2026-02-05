import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';

// Ne pas importer expo-notifications au top : en APK le module natif peut faire planter l'app au démarrage.
// On configure les notifications après le premier rendu (import dynamique).
function App() {
  useEffect(() => {
    let cancelled = false;
    import('expo-notifications')
      .then((mod) => {
        if (cancelled || !mod?.default) return;
        try {
          mod.default.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: true,
            }),
          });
        } catch (_) {}
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AppNavigator />
        <Toast />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default App;

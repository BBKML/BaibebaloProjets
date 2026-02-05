import { registerRootComponent } from 'expo';
import App from './App';

// Éviter que l'APK plante sur une promise non gérée (ex: requête réseau)
if (typeof global !== 'undefined') {
  const onUnhandled = (e) => {
    if (e?.reason != null) {
      try { console.warn('[UnhandledRejection]', e.reason?.message || e.reason); } catch (_) {}
    }
  };
  if (typeof global.addEventListener === 'function') {
    global.addEventListener('unhandledrejection', onUnhandled);
  }
}

registerRootComponent(App);

# Build de développement EAS (expo-notifications)

## Pourquoi un development build ?

**Expo Go** (SDK 53+) ne prend pas en charge correctement **expo-notifications** (notifications push, permissions, canal Android). Vous verrez par exemple :
- Pas de notification reçue en arrière-plan
- `expo-notifications` non disponible ou erreurs silencieuses
- Message dans les logs du type « Notification locale non disponible (Expo Go?) »

Pour tester les **notifications push** et le **son des alertes** en conditions réelles, il faut utiliser un **development build** EAS (client de développement natif).

## Prérequis

- Compte [Expo](https://expo.dev) (gratuit)
- EAS CLI : `npm install -g eas-cli` puis `eas login`
- Projet déjà lié à EAS (`eas.json` présent, `extra.eas.projectId` dans `app.json`)

## Créer le development build (Android)

1. **Vérifier le profil `development` dans `eas.json`** (déjà présent) :
   ```json
   "development": {
     "developmentClient": true,
     "distribution": "internal"
   }
   ```

2. **Lancer le build** :
   ```bash
   cd baibebalo-livreur
   eas build --platform android --profile development
   ```
   Pour iOS (Mac requis) :
   ```bash
   eas build --platform ios --profile development
   ```

3. **Télécharger et installer l’APK** :
   - À la fin du build, EAS affiche un lien pour télécharger l’APK.
   - Installez-le sur votre appareil (ou émulateur).
   - Ce client est un “Expo Go personnalisé” avec vos natifs (dont notifications).

4. **Lancer le serveur de dev et ouvrir l’app** :
   ```bash
   npx expo start --dev-client
   ```
   Puis scannez le QR code avec l’app **BAIBEBALO Livreur** (development build), pas avec Expo Go.

## Différence avec Expo Go

| | Expo Go | Development build |
|---|--------|-------------------|
| Notifications push | Limitées / non fiables | Complètes |
| expo-notifications | Partiel | Complet |
| Sons (expo-audio) | OK | OK |
| Build | Aucun | `eas build --profile development` |

## Résumé

1. `eas build --platform android --profile development`
2. Installer l’APK fourni par EAS
3. `npx expo start --dev-client` et ouvrir l’app avec le client de dev

Après ça, les notifications et le comportement natif (dont le son des alertes) fonctionnent comme en production.

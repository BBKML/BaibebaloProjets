# 📱 Tester avec Expo Go (Recommandé)

## ✅ Solution Simple : Utiliser Expo Go sur votre téléphone

Au lieu d'utiliser l'émulateur Android (qui a des problèmes de connexion), utilisez **Expo Go** sur votre téléphone réel.

## 📋 Étapes

### 1. Installer Expo Go sur votre téléphone

- **Android** : [Google Play Store - Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iOS** : [App Store - Expo Go](https://apps.apple.com/app/expo-go/id982107779)

### 2. Démarrer le serveur Expo

Dans le terminal, dans le dossier `baibebalo-client-clean` :

```bash
cd baibebalo-client-clean
npm start
```

### 3. Scanner le QR Code

- **Android** : Ouvrez Expo Go → Appuyez sur "Scan QR code" → Scannez le QR code dans le terminal
- **iOS** : Ouvrez l'appareil photo → Scannez le QR code → Appuyez sur "Ouvrir dans Expo Go"

### 4. Tester la navigation

Une fois l'application ouverte sur votre téléphone :

1. **Test direct de navigation** :
   - Cliquez sur le bouton "🧪 TEST NAVIGATION" (sans entrer de numéro)
   - Si la page de vérification s'affiche → ✅ La navigation fonctionne
   - Si la page ne s'affiche pas → ❌ Problème de navigation React Navigation

2. **Test complet** :
   - Entrez le numéro : `0700000000`
   - Cliquez sur "Continuer"
   - Regardez les logs dans le terminal
   - Vérifiez si la page de vérification s'affiche

## 🔍 Voir les logs

Les logs s'affichent dans le terminal où vous avez lancé `npm start`.

Cherchez :
- `═══════════════════════════════════════════════════════════`
- `🚀 DÉBUT handleSendOTP`
- `📋 RÉSULTAT sendOTP COMPLET`
- `🔍 DÉCISION NAVIGATION`
- `✅✅✅ NAVIGATION FORCÉE VERS OTPVerification`
- `✅✅✅ OTPVerificationScreen MONTÉ ET AFFICHÉ!`

## 🎯 Avantages d'Expo Go

- ✅ Pas besoin d'émulateur
- ✅ Test sur un vrai téléphone
- ✅ Hot reload automatique
- ✅ Logs en temps réel
- ✅ Plus rapide et plus fiable

## ❌ Si vous voulez quand même utiliser l'émulateur

Si vous voulez absolument utiliser l'émulateur Android :

1. **Vérifier que l'émulateur est démarré** :
   ```bash
   adb devices
   ```

2. **Redémarrer l'émulateur** si nécessaire

3. **Utiliser l'option tunnel** :
   ```bash
   npm start -- --tunnel
   ```

Mais **Expo Go sur téléphone réel est recommandé** car c'est plus simple et plus fiable ! 📱✨

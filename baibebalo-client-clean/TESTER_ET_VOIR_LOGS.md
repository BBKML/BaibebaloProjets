# 🧪 Tester et Voir les Logs

## 📋 Étapes pour Tester

### 1. Scanner le QR Code

- **Android** : Ouvrez Expo Go → "Scan QR code" → Scannez le QR code dans le terminal
- **iOS** : Ouvrez l'appareil photo → Scannez le QR code → "Ouvrir dans Expo Go"

### 2. Attendre que l'application se charge

Une fois l'application ouverte sur votre téléphone, vous devriez voir l'écran de saisie du numéro.

### 3. Tester la Navigation

#### Test 1 : Navigation Directe (Sans API)

1. **Cliquez sur le bouton "🧪 TEST NAVIGATION"** (en bas de l'écran)
2. **Résultat attendu** : La page de vérification devrait s'afficher
3. **Regardez le terminal** : Vous devriez voir des logs

#### Test 2 : Test Complet (Avec API)

1. **Vérifier que le backend est démarré** :
   ```bash
   cd baibebalo-backend
   npm start
   ```

2. **Dans l'application sur votre téléphone** :
   - Entrez le numéro : `0700000000`
   - Cliquez sur "Continuer"

3. **Regardez le terminal Expo** : Les logs devraient apparaître

## 📊 Logs à Chercher dans le Terminal

Après avoir cliqué sur "Continuer", vous devriez voir dans le terminal :

```
═══════════════════════════════════════════════════════════
🚀 DÉBUT handleSendOTP
📱 Numéro formaté: +2250700000000
📱 Navigation object: [object Object]
📱 Navigation.navigate type: function
═══════════════════════════════════════════════════════════

📡 API sendOTP - Envoi requête: {
  "url": "http://192.168.1.7:5000/api/v1/auth/send-otp",
  "phone": "+2250700000000"
}

📡 API sendOTP - Réponse complète: {
  "status": 200,
  "data": {
    "success": true,
    "message": "Code OTP envoyé par SMS"
  }
}

✅ Réponse API sendOTP complète: {
  "success": true,
  "message": "Code OTP envoyé par SMS"
}

📊 Analyse réponse: {
  "isSuccess": true,
  "response": {...},
  "success": true
}

═══════════════════════════════════════════════════════════
📋 RÉSULTAT sendOTP COMPLET:
{
  "success": true,
  "data": {...},
  "message": "Code envoyé avec succès"
}
═══════════════════════════════════════════════════════════

🔍 DÉCISION NAVIGATION:
  - result: { success: true, ... }
  - result?.success: true
  - result?.error: undefined
  - hasError: false

✅✅✅ NAVIGATION FORCÉE VERS OTPVerification
🔄 Tentative navigation.navigate...
✅ navigation.navigate RÉUSSI

✅✅✅ OTPVerificationScreen MONTÉ ET AFFICHÉ!
```

## ❌ Si vous ne voyez PAS ces logs

Cela signifie que :
1. ❌ Le code ne s'exécute pas
2. ❌ Il y a une erreur avant d'arriver à la navigation
3. ❌ Les logs ne s'affichent pas dans le terminal

## 🔍 Si vous voyez des erreurs

Cherchez les lignes qui commencent par `❌` :

```
❌ Erreur sendOTP: ...
❌ Erreur - result.success n'est pas true: ...
❌ navigation.navigate ÉCHOUÉ: ...
```

## ✅ Action Requise

1. **Testez l'application** sur votre téléphone
2. **Cliquez sur "Continuer"** après avoir entré le numéro
3. **Regardez le terminal Expo** (pas le terminal du backend)
4. **Copiez-collez TOUS les logs** qui apparaissent dans le terminal Expo

---

**Les logs apparaîtront dans le terminal Expo APRÈS avoir testé l'application !** 📊✨

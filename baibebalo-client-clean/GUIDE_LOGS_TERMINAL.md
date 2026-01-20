# 📋 GUIDE : OÙ VOIR LES LOGS DANS LE TERMINAL

## 🎯 Où se trouvent les logs ?

Les logs de votre application React Native/Expo apparaissent dans **plusieurs endroits** selon ce que vous testez :

---

## 1️⃣ **TERMINAL EXPO (Application Mobile)**

### 📍 Emplacement
Le terminal où vous avez lancé `npm start` ou `expo start`

### 🔍 Comment voir les logs

#### **Option A : Terminal Expo standard**
Quand vous lancez :
```bash
cd baibebalo-client-clean
npm start
```

Les logs `console.log()` apparaissent directement dans ce terminal.

#### **Option B : Mode développeur dans Expo Go**
1. Ouvrez **Expo Go** sur votre téléphone
2. Secouez votre téléphone (ou appuyez 3 fois rapidement)
3. Sélectionnez **"Show Developer Menu"**
4. Appuyez sur **"Debug Remote JS"**
5. Les logs apparaîtront dans votre **navigateur** (Chrome DevTools)

#### **Option C : Logs Android (si vous testez sur Android)**
```bash
# Dans un nouveau terminal
npx react-native log-android
```

#### **Option D : Logs iOS (si vous testez sur iOS Simulator)**
```bash
# Dans un nouveau terminal
npx react-native log-ios
```

---

## 2️⃣ **TERMINAL BACKEND (API)**

### 📍 Emplacement
Le terminal où vous avez lancé le backend (ex: `npm start` dans `baibebalo-backend`)

### 🔍 Ce que vous verrez
- ✅ Logs des requêtes API (`POST /api/v1/auth/send-otp`)
- ✅ Logs de vérification OTP (`OTP vérifié avec succès`)
- ✅ Logs de connexion utilisateur (`Utilisateur existant connecté`)
- ✅ Erreurs backend

### 📝 Exemple de logs backend
```
00:45:47 [info]: SMS envoyé avec succès
POST /api/v1/auth/send-otp 200 214.789 ms - 53
00:46:23 [info]: OTP vérifié avec succès
POST /api/v1/auth/verify-otp 200 292.369 ms - 865
```

---

## 3️⃣ **LOGS DANS LE CODE (console.log)**

### 📍 Où sont les logs dans le code ?

#### **AppNavigator.js**
```javascript
console.log('🔄 AppNavigator re-render:', { isAuthenticated, isLoading });
console.log('✅ Navigation automatique vers MainTabs');
```

#### **OTPVerificationScreen.js**
```javascript
console.log('🔄 Début vérification OTP...');
console.log('✅ OTP vérifié avec succès');
console.log('📱 État utilisateur:', { isNewUser, hasProfile });
console.log('🔄 Navigation vers:', targetRoute);
```

### 🔍 Où les voir ?

**Si vous utilisez Expo Go :**
1. Les logs apparaissent dans le **terminal Expo** (où vous avez lancé `npm start`)
2. Ou dans **Chrome DevTools** si vous activez "Debug Remote JS"

**Si vous utilisez un émulateur/simulateur :**
- **Android Studio Logcat** (pour Android)
- **Xcode Console** (pour iOS)

---

## 4️⃣ **CHROME DEVTOOLS (Recommandé pour le débogage)**

### 🚀 Comment activer

1. **Lancez l'app** avec `npm start`
2. **Ouvrez Expo Go** sur votre téléphone
3. **Secouez le téléphone** (ou appuyez 3 fois rapidement)
4. Sélectionnez **"Debug Remote JS"**
5. **Chrome s'ouvrira automatiquement** avec les DevTools
6. Allez dans l'onglet **"Console"**

### ✅ Avantages
- ✅ Logs colorés et formatés
- ✅ Possibilité de mettre des breakpoints
- ✅ Inspecter les variables
- ✅ Voir les erreurs en détail

---

## 5️⃣ **LOGS EN TEMPS RÉEL (Recommandé)**

### 📱 Utiliser React Native Debugger

```bash
# Installer React Native Debugger
npm install -g react-native-debugger
```

Puis :
1. Lancez `npm start`
2. Ouvrez Expo Go
3. Activez "Debug Remote JS"
4. Les logs apparaîtront dans React Native Debugger

---

## 🎯 **RÉSUMÉ RAPIDE**

| Type de log | Où le voir |
|------------|------------|
| **Logs frontend (console.log)** | Terminal Expo OU Chrome DevTools |
| **Logs backend (API)** | Terminal backend |
| **Erreurs React Native** | Terminal Expo (en rouge) |
| **Logs réseau (requêtes)** | Chrome DevTools → Network |
| **Logs de navigation** | Terminal Expo (avec les emojis 🔄 ✅) |

---

## 🔧 **COMMANDES UTILES**

### Voir tous les logs en temps réel
```bash
# Terminal 1 : Backend
cd baibebalo-backend
npm start

# Terminal 2 : Frontend
cd baibebalo-client-clean
npm start

# Terminal 3 : Logs Android (optionnel)
npx react-native log-android
```

### Filtrer les logs dans le terminal
```bash
# Voir uniquement les logs avec "Navigation"
npm start | grep "Navigation"

# Voir uniquement les logs avec "OTP"
npm start | grep "OTP"
```

---

## 📝 **EXEMPLE DE LOGS QUE VOUS DEVRIEZ VOIR**

Quand vous testez la vérification OTP, vous devriez voir :

### Dans le terminal Expo :
```
🔄 Début vérification OTP...
✅ OTP vérifié avec succès
📱 État utilisateur: { isNewUser: false, hasProfile: true, userId: '...' }
🔄 Navigation vers: MainTabs
🔄 AppNavigator re-render: { isAuthenticated: true, isLoading: false }
✅ Navigation automatique vers MainTabs (profil complet)
```

### Dans le terminal Backend :
```
00:46:23 [info]: OTP vérifié avec succès
POST /api/v1/auth/verify-otp 200 292.369 ms - 865
00:46:23 [info]: Utilisateur existant connecté
```

---

## ❓ **PROBLÈME : Je ne vois pas les logs**

### Solution 1 : Vérifier que vous êtes en mode développement
```bash
# Assurez-vous que vous n'êtes pas en mode production
npm start -- --dev
```

### Solution 2 : Activer les logs dans Expo Go
1. Secouez le téléphone
2. Sélectionnez "Show Developer Menu"
3. Activez "Debug Remote JS"

### Solution 3 : Vérifier le terminal
- Assurez-vous que le terminal Expo est **visible** et **actif**
- Faites défiler vers le haut pour voir les anciens logs

### Solution 4 : Utiliser Chrome DevTools
- C'est la méthode la plus fiable pour voir tous les logs

---

## ✅ **CONCLUSION**

**Pour voir les logs de navigation et d'authentification :**

1. **Terminal Expo** (où vous avez lancé `npm start`) → Logs frontend
2. **Terminal Backend** → Logs API
3. **Chrome DevTools** (si "Debug Remote JS" activé) → Logs détaillés

**Les logs avec emojis (🔄 ✅ 📱) apparaissent dans le terminal Expo !**

# 📊 Comment Voir les Logs

## 🎯 Méthode 1 : Terminal Expo (Le Plus Simple)

Les logs s'affichent **directement dans le terminal** où vous avez lancé `npm start`.

### 📋 Étapes :

1. **Ouvrez un terminal** dans le dossier `baibebalo-client-clean`
2. **Lancez le serveur** :
   ```bash
   npm start
   ```
3. **Les logs apparaissent automatiquement** dans ce terminal

### 🔍 Ce que vous verrez :

- ✅ Tous les `console.log()` de votre application
- ✅ Les erreurs JavaScript
- ✅ Les logs réseau (requêtes API)
- ✅ Les logs de navigation

### 📝 Exemple de logs :

```
═══════════════════════════════════════════════════════════
🚀 DÉBUT handleSendOTP
📱 Numéro formaté: +2250700000000
📱 Navigation object: [object Object]
═══════════════════════════════════════════════════════════

📋 RÉSULTAT sendOTP COMPLET:
{
  "success": true,
  "data": {...}
}

✅✅✅ NAVIGATION FORCÉE VERS OTPVerification
✅ navigation.navigate RÉUSSI
✅✅✅ OTPVerificationScreen MONTÉ ET AFFICHÉ!
```

---

## 🎯 Méthode 2 : Menu Développeur dans Expo Go

### 📱 Sur Android :

1. **Secouez votre téléphone** (ou appuyez 3 fois rapidement sur le bouton menu)
2. **Menu apparaît** → Cliquez sur **"Debug Remote JS"**
3. **Ouvrez Chrome** → `chrome://inspect`
4. **Cliquez sur "inspect"** sous votre appareil
5. **Onglet "Console"** → Vous verrez tous les logs

### 📱 Sur iOS :

1. **Secouez votre téléphone** (ou appuyez 3 fois rapidement sur le bouton home)
2. **Menu apparaît** → Cliquez sur **"Debug Remote JS"**
3. **Ouvrez Safari** → Menu "Développement" → Votre appareil
4. **Onglet "Console"** → Vous verrez tous les logs

---

## 🎯 Méthode 3 : React Native Debugger (Avancé)

### Installation :

```bash
npm install -g react-native-debugger
```

### Utilisation :

1. **Lancez React Native Debugger**
2. **Dans Expo Go** : Secouez le téléphone → "Debug Remote JS"
3. **Les logs apparaissent dans React Native Debugger**

---

## 🎯 Méthode 4 : Flipper (Très Avancé)

Flipper est un outil de débogage complet pour React Native.

### Installation :

1. **Téléchargez Flipper** : [flipper.dev](https://fbflipper.com/)
2. **Installez le plugin React Native** dans Flipper
3. **Connectez votre appareil** à Flipper

---

## ✅ Méthode Recommandée : Terminal Expo

**Pour votre cas, utilisez simplement le TERMINAL où vous avez lancé `npm start`.**

C'est la méthode la plus simple et la plus directe. Tous les `console.log()` de votre application apparaissent automatiquement dans ce terminal.

---

## 🔍 Logs Importants à Chercher

Quand vous testez la navigation, cherchez ces logs dans le terminal :

### ✅ Logs de Succès :

```
✅✅✅ OTP ENVOYÉ AVEC SUCCÈS - NAVIGATION IMMÉDIATE
✅✅✅ NAVIGATION FORCÉE VERS OTPVerification
✅ navigation.navigate RÉUSSI
✅✅✅ OTPVerificationScreen MONTÉ ET AFFICHÉ!
```

### ❌ Logs d'Erreur :

```
❌ Erreur - result.success n'est pas true
❌ Erreur avec navigate
❌ TEST navigation.navigate ÉCHOUÉ
```

### 📊 Logs de Debug :

```
═══════════════════════════════════════════════════════════
🚀 DÉBUT handleSendOTP
📋 RÉSULTAT sendOTP COMPLET
🔍 DÉCISION NAVIGATION
```

---

## 💡 Astuce : Filtrer les Logs

Dans le terminal, vous pouvez utiliser `Ctrl+F` pour chercher des mots-clés spécifiques comme :
- `NAVIGATION`
- `OTPVerification`
- `RÉSULTAT`
- `ERREUR`

---

## 🎯 Résumé

**Méthode la plus simple** : Regardez le **TERMINAL** où vous avez lancé `npm start`. Tous les logs y apparaissent automatiquement ! 📊✨

# 🔧 Solution : Erreur 429 (Too Many Requests)

## 📋 Problème

L'erreur **429** apparaît quand vous essayez d'envoyer un code OTP trop rapidement. Le backend a un système anti-spam qui limite les requêtes à **1 requête par minute** pour le même numéro de téléphone.

## ✅ Solution

### 1. **Attendre 1 minute**

Le message d'erreur indique : **"Veuillez attendre 1 minute avant de demander un nouveau code"**

👉 **Solution simple** : Attendez 1 minute complète avant de réessayer.

### 2. **Vérifier les logs**

Si vous voyez cette erreur dans les logs :
```
❌ Erreur sendOTP: {error: 'Request failed with status code 429', ...}
❌ result.success: false
```

Cela signifie que le rate limiting est actif. C'est **normal** et **attendu** pour protéger le système contre le spam.

## 🔍 Comment ça fonctionne

### Backend
- **Rate Limiter** : `smsLimiter` dans `baibebalo-backend/src/middlewares/validators.js`
- **Limite** : 1 requête par minute par numéro de téléphone
- **Message** : "Veuillez attendre 1 minute avant de demander un nouveau code."

### Client
- Le store (`authStore.js`) détecte l'erreur 429
- Extrait le message d'erreur du backend
- Affiche une `Alert` avec le message à l'utilisateur

## 🛠️ Améliorations apportées

### 1. **Gestion améliorée de l'erreur 429**
```javascript
// Dans authStore.js
if (error.response?.status === 429) {
  errorMessage = error.response?.data?.error?.message 
    || error.response?.data?.message 
    || error.message
    || 'Trop de tentatives. Veuillez attendre avant de réessayer.';
}
```

### 2. **Détection des erreurs de rate limiting**
```javascript
// Détecte aussi les erreurs qui mentionnent "attendre" ou "minute"
else if (error.message?.includes('attendre') || error.message?.includes('minute')) {
  errorMessage = error.message;
}
```

### 3. **Affichage amélioré de l'erreur**
```javascript
// Dans PhoneEntryScreen.js
Alert.alert(
  'Erreur',
  errorMessage,
  [{ text: 'OK', style: 'default' }]
);
```

## 📱 Test

1. **Envoyer un OTP** : Entrez votre numéro et cliquez sur "Continuer"
2. **Si erreur 429** : Une alerte s'affiche avec le message "Veuillez attendre 1 minute avant de demander un nouveau code."
3. **Attendre 1 minute** : Ne réessayez pas immédiatement
4. **Réessayer** : Après 1 minute, réessayez d'envoyer le code

## 🎯 Résultat attendu

- ✅ L'erreur 429 est correctement détectée
- ✅ Le message d'erreur est extrait du backend
- ✅ Une alerte s'affiche avec le message clair
- ✅ L'utilisateur sait qu'il doit attendre 1 minute

## 💡 Pour le développement

Si vous testez fréquemment et déclenchez souvent le rate limiting, vous pouvez :

1. **Augmenter temporairement la limite** dans `baibebalo-backend/src/middlewares/validators.js` :
   ```javascript
   const smsLimiter = rateLimit({
     windowMs: 60 * 1000,
     max: 3, // Au lieu de 1 (uniquement pour les tests)
     // ...
   });
   ```

2. **Utiliser différents numéros de test** pour éviter le rate limiting

3. **Attendre 1 minute** entre chaque test (recommandé)

## ✅ Statut

- ✅ Gestion de l'erreur 429 améliorée
- ✅ Extraction du message d'erreur corrigée
- ✅ Affichage de l'alerte amélioré
- ✅ Détection des erreurs de rate limiting améliorée

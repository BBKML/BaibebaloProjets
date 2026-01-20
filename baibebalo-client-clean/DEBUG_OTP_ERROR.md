# 🔧 Debug - Erreur lors de l'envoi du code OTP

## ✅ Corrections appliquées

### 1. Format de la requête corrigé
- **Avant** : L'API envoyait `phoneNumber`
- **Après** : L'API envoie maintenant `phone` (comme attendu par le backend)

### 2. Gestion d'erreur améliorée
- Messages d'erreur plus détaillés
- Détection des erreurs de connexion réseau

## 🔍 Vérifications à faire

### 1. Vérifier que le backend est démarré

```bash
cd baibebalo-backend
npm start
```

Le backend doit être accessible sur `http://localhost:5000` (ou le port configuré).

### 2. Vérifier l'URL de l'API

Dans `src/constants/api.js`, l'URL par défaut est :
```javascript
BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1'
```

**Important** : Si vous testez sur un téléphone physique (pas un émulateur), `localhost` ne fonctionnera pas. Vous devez utiliser l'IP de votre machine.

**Solution** :
1. Trouvez l'IP de votre machine :
   - Windows : `ipconfig` (cherchez "IPv4 Address")
   - Mac/Linux : `ifconfig` ou `ip addr`
2. Modifiez l'URL dans `src/constants/api.js` :
   ```javascript
   BASE_URL: 'http://VOTRE_IP:5000/api/v1'
   ```
   Par exemple : `http://192.168.1.100:5000/api/v1`

### 3. Vérifier les logs du backend

Quand vous essayez d'envoyer un OTP, vérifiez les logs du serveur backend. Vous devriez voir :
- La requête reçue
- Le code OTP généré
- Le message SMS (en mode dev, il s'affiche dans la console)

### 4. Vérifier le format du numéro

Le numéro doit être au format :
- `+2250700000000` (avec indicatif)
- Ou `0700000000` (sera automatiquement formaté en `+2250700000000`)

## 🐛 Erreurs courantes

### Erreur "Network Error" ou "ECONNREFUSED"
**Cause** : Le backend n'est pas accessible
**Solution** :
1. Vérifiez que le backend est démarré
2. Vérifiez l'URL de l'API (utilisez l'IP si sur téléphone physique)
3. Vérifiez le firewall

### Erreur "phone is required"
**Cause** : Le format de la requête est incorrect
**Solution** : ✅ Déjà corrigé - l'API envoie maintenant `phone` au lieu de `phoneNumber`

### Erreur "Numéro invalide"
**Cause** : Le format du numéro ne correspond pas aux attentes
**Solution** : Utilisez un numéro au format ivoirien (10 chiffres après +225)

## 📝 Test rapide

Pour tester si le backend répond :

```bash
curl -X POST http://localhost:5000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2250700000000"}'
```

Si ça fonctionne, vous devriez voir le code OTP dans les logs du serveur.

## ✅ Prochaines étapes

1. Redémarrez l'application mobile
2. Essayez à nouveau d'envoyer un OTP
3. Vérifiez les logs du backend pour voir le code OTP généré
4. Entrez le code dans l'application

**Le problème devrait être résolu maintenant !** 🎉

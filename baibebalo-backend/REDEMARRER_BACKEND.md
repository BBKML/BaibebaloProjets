# 🔄 Redémarrer le Backend

## ⚠️ IMPORTANT

Le backend **DOIT être redémarré** pour que les modifications prennent effet !

## 📋 Étapes

### 1. Arrêter le serveur actuel

Dans le terminal où le backend tourne :
- Appuyez sur `Ctrl + C` pour arrêter le serveur

### 2. Redémarrer le serveur

```bash
cd baibebalo-backend
npm start
```

### 3. Vérifier que le serveur démarre correctement

Vous devriez voir :
```
🚀 BAIBEBALO API - SERVEUR DÉMARRÉ
📍 Port: 5000
🌐 URL locale: http://localhost:5000
🌐 URL réseau: http://192.168.1.7:5000
```

## ✅ Vérification

Après redémarrage, testez l'envoi d'OTP :

1. **Si vous voyez `POST /api/v1/auth/send-otp 429`** → ✅ Le backend fonctionne correctement (rate limiting)
2. **Si vous voyez `POST /api/v1/auth/send-otp 500`** → ❌ Le backend n'a pas été redémarré ou il y a une erreur

## 🎯 Résultat attendu

Après redémarrage, quand vous essayez d'envoyer un OTP trop rapidement :
- **Avant** : `POST /api/v1/auth/send-otp 500` (erreur serveur)
- **Après** : `POST /api/v1/auth/send-otp 429` (rate limiting correct)

# Configuration pour communiquer avec le backend local

## ✅ Fichier .env créé

Un fichier `.env` a été créé pour pointer vers votre backend local.

## 📋 Configuration actuelle

**Backend local**: `http://192.168.1.5:5000`  
**URL API**: `http://192.168.1.5:5000/api/v1`

## 🔄 Pour appliquer les changements

1. **Redémarrer Expo Metro** :
   - Arrêtez Metro (Ctrl+C dans le terminal Metro)
   - Redémarrez avec `npm start` ou `npx expo start`

2. **Recharger l'application** :
   - Appuyez sur `r` dans le terminal Metro pour recharger
   - Ou secouez le téléphone et appuyez sur "Reload"

## ✅ Vérification

Après le redémarrage, vous devriez voir dans les logs du client :
```
📡 API sendOTP - Envoi requête: {
  "url": "http://192.168.1.5:5000/api/v1/auth/send-otp",
  ...
}
```

Et dans les logs du backend local, vous devriez voir :
```
══════════════════════════════════════════════════════════════════
🔐 CODE OTP GÉNÉRÉ (CONNEXION/INSCRIPTION CLIENT)
══════════════════════════════════════════════════════════════════
   📞 Numéro: +2250789707003
   🔑 Code OTP: 123456
   ...
```

## ⚠️ Important

- Assurez-vous que le téléphone et l'ordinateur sont sur le **même réseau WiFi**
- Si l'IP change, modifiez le fichier `.env` avec la nouvelle IP
- Pour retrouver votre IP : `ipconfig` (Windows) ou `ifconfig` (Mac/Linux)

## 🔄 Retour à la production

Pour revenir au backend de production, modifiez `.env` :
```
EXPO_PUBLIC_API_URL=https://baibebaloprojets.onrender.com/api/v1
```

# 🔧 Fix : Erreur "TypeError: fetch failed"

## 📋 Problème

L'erreur `TypeError: fetch failed` apparaît quand Expo essaie de se connecter à l'API Expo pour vérifier les versions des modules natifs, mais la connexion échoue.

## ✅ Solution Appliquée

Le script `start` utilise maintenant le flag `--offline` pour éviter cette vérification réseau :

```json
"start": "expo start --offline"
```

## 🚀 Utilisation

### Démarrer le serveur en mode offline :

```bash
cd baibebalo-client-clean
npm start
```

Ou directement :

```bash
npm start -- --offline
```

## 🎯 Résultat Attendu

Le serveur devrait démarrer sans erreur de connexion :

```
Starting project at C:\Users\booke\BaibebaloProjets\baibebalo-client-clean
Starting Metro Bundler
Metro waiting on exp://192.168.1.7:8081
Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

## 💡 Alternatives

### Si vous avez une connexion Internet stable :

Vous pouvez retirer le flag `--offline` et utiliser :

```bash
npm start
```

### Si vous avez un proxy :

Configurez les variables d'environnement :

```bash
set HTTP_PROXY=http://votre-proxy:port
set HTTPS_PROXY=http://votre-proxy:port
npm start
```

## ✅ Statut

- ✅ Script modifié pour utiliser `--offline` par défaut
- ✅ Évite les erreurs de connexion réseau
- ✅ Le serveur démarre normalement

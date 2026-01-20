# 🔧 Configuration de l'API - Guide de dépannage

## ⚠️ Erreur "Erreur de connexion" avec `/auth/send-otp`

Cette erreur indique que l'application mobile ne peut pas se connecter au backend.

## 🔍 Solutions

### 1. Vérifier que le backend est démarré

```bash
cd baibebalo-backend
npm start
```

Vous devriez voir :
```
✅ Serveur démarré avec succès
📍 Port: 5000
🌐 URL: http://localhost:5000
```

### 2. Vérifier l'URL de l'API

**Si vous testez sur un émulateur Android/iOS :**
- L'URL `http://localhost:5000` devrait fonctionner
- Ou utilisez `http://10.0.2.2:5000` pour Android

**Si vous testez sur un téléphone physique :**
- `localhost` ne fonctionnera PAS
- Vous devez utiliser l'IP de votre machine

#### Trouver votre IP :

**Windows :**
```bash
ipconfig
```
Cherchez "IPv4 Address" (ex: `192.168.1.100`)

**Mac/Linux :**
```bash
ifconfig
# ou
ip addr
```

#### Modifier l'URL dans l'application :

Éditez `baibebalo-client-clean/src/constants/api.js` :

```javascript
export const API_CONFIG = {
  // Pour téléphone physique, remplacez localhost par votre IP
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000/api/v1',
  //                                                          ^^^^^^^^^^^^^^
  //                                                          Votre IP ici
  TIMEOUT: 30000,
  // ...
};
```

### 3. Vérifier le firewall

Le firewall Windows/Mac peut bloquer les connexions entrantes.

**Windows :**
1. Ouvrez "Pare-feu Windows Defender"
2. Cliquez sur "Paramètres avancés"
3. Créez une règle entrante pour le port 5000

**Mac :**
1. Préférences Système > Sécurité > Pare-feu
2. Autorisez Node.js ou le port 5000

### 4. Vérifier que le backend écoute sur toutes les interfaces

Dans `baibebalo-backend/index.js`, le serveur doit écouter sur `0.0.0.0` (toutes les interfaces) et non seulement `localhost` :

```javascript
server.listen(PORT, '0.0.0.0', () => {
  // ...
});
```

### 5. Test rapide avec curl

Testez si le backend répond :

```bash
curl -X POST http://localhost:5000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2250700000000"}'
```

Si ça fonctionne, vous devriez voir une réponse JSON.

### 6. Vérifier les logs du backend

Quand vous essayez d'envoyer un OTP depuis l'app, vérifiez les logs du backend. Vous devriez voir :
- La requête reçue
- Le code OTP généré
- Le message SMS (en mode dev)

## 📱 Configuration pour Expo Go

Si vous utilisez Expo Go sur un téléphone physique :

1. **Trouvez votre IP locale** (voir ci-dessus)
2. **Modifiez `src/constants/api.js`** avec votre IP
3. **Redémarrez Expo** :
   ```bash
   cd baibebalo-client-clean
   npm start
   ```
4. **Scannez le QR code** à nouveau

## 🔄 Alternative : Utiliser ngrok (pour tests rapides)

Si vous avez des problèmes de réseau local, vous pouvez utiliser ngrok :

```bash
# Installer ngrok
npm install -g ngrok

# Créer un tunnel
ngrok http 5000
```

Cela vous donnera une URL publique (ex: `https://abc123.ngrok.io`). Utilisez cette URL dans `API_CONFIG.BASE_URL`.

## ✅ Checklist de vérification

- [ ] Backend démarré et accessible
- [ ] URL de l'API correcte (IP si téléphone physique)
- [ ] Firewall configuré pour autoriser le port 5000
- [ ] Backend écoute sur `0.0.0.0` (toutes les interfaces)
- [ ] Test curl fonctionne
- [ ] Application redémarrée après modification de l'URL

## 🐛 Messages d'erreur courants

| Erreur | Cause | Solution |
|--------|-------|----------|
| `ECONNREFUSED` | Backend non démarré ou URL incorrecte | Démarrer le backend, vérifier l'URL |
| `Network Error` | Problème de réseau/firewall | Vérifier le firewall, utiliser l'IP au lieu de localhost |
| `timeout` | Backend trop lent ou inaccessible | Vérifier les logs du backend |

## 💡 Astuce

Pour éviter de modifier le code à chaque fois, vous pouvez utiliser une variable d'environnement :

1. Créez un fichier `.env` dans `baibebalo-client-clean` :
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api/v1
   ```

2. L'application utilisera automatiquement cette URL.

**Une fois configuré, l'erreur devrait disparaître !** 🎉

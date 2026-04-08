# 🔧 Dépannage - Plateforme BAIBEBALO

Guide pour corriger les problèmes courants sur les applications BAIBEBALO.

---

## 📋 Table des matières

1. [Backend](#backend)
2. [Applications mobiles (Expo)](#applications-mobiles-expo)
3. [Panel Admin](#panel-admin)
4. [Réseau et connexion](#réseau-et-connexion)
5. [Base de données](#base-de-données)
6. [Erreurs courantes](#erreurs-courantes)

---

## Backend

### Le serveur ne démarre pas

**Symptôme** : `Error: listen EADDRINUSE` ou port déjà utilisé

**Solution** :
```bash
# Windows (PowerShell)
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Ou changer le port dans .env
PORT=5001
```

### Variables d'environnement manquantes

**Symptôme** : `❌ Variables d'environnement manquantes en production`

**Solution** :
```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer .env et remplir au minimum :
# - DB_HOST, DB_NAME, DB_USER, DB_PASSWORD
# - JWT_SECRET
# - PORT (5000 par défaut)
```

### Base de données non trouvée

**Symptôme** : `Error: connect ECONNREFUSED` ou `database "baibebalo" does not exist`

**Solution** :
```bash
# Créer la base
psql -U postgres -c "CREATE DATABASE baibebalo;"

# Exécuter les migrations
cd baibebalo-backend
npm run migrate
```

---

## Applications mobiles (Expo)

### Network Error / Impossible de se connecter

**Symptôme** : `Error loading orders: Network Error` ou `Network request failed`

**Solution** :
1. Vérifier que le **backend tourne** (`npm run dev` dans baibebalo-backend)
2. Mettre à jour l'IP dans `.env` :
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.16:5000/api/v1
   ```
   *(Utiliser l'IP affichée au démarrage du backend : "🌐 URL réseau: http://192.168.1.X:5000")*
3. Téléphone et PC sur le **même WiFi**
4. Désactiver le VPN si activé
5. Redémarrer l'app Expo après modification du `.env`

### Erreur de syntaxe (TransformError / Missing semicolon)

**Symptôme** : `Error: TransformError SyntaxError: Missing semicolon`

**Solution** :
```bash
# Vider le cache Metro
npx expo start --clear

# Ou supprimer le cache manuellement
rm -rf node_modules/.cache
npx expo start
```

### OTP non reçu

**Symptôme** : Le code SMS n'arrive pas sur le téléphone

**Solution** :
- En mode `dev`, les SMS ne sont pas envoyés : le code est affiché dans les **logs du backend**
- Vérifier `SMS_PROVIDER` dans le backend (.env)
- Pour tester : utiliser Twilio ou Nexah (configurer les clés API)

### App lente ou freeze

**Solution** :
```bash
# Redémarrer avec cache vide
npx expo start --clear

# Vérifier les dépendances
npm install
```

---

## Panel Admin

### CORS Error

**Symptôme** : `Access to XMLHttpRequest has been blocked by CORS policy`

**Solution** :
- Dans `baibebalo-backend/.env`, ajouter :
  ```
  CORS_ORIGIN=http://localhost:5174,http://192.168.1.16:5174
  ```
- Ou en dev, le backend autorise toutes les origines par défaut

### 401 Unauthorized

**Symptôme** : Redirection vers la page de login

**Solution** :
- Se déconnecter et se reconnecter
- Vérifier que le token n'est pas expiré
- Créer un admin : `cd baibebalo-backend && npm run admin:create`

### Données vides

**Solution** :
- Vérifier `VITE_API_URL` dans `.env` (doit pointer vers le backend)
- Vérifier la console du navigateur (F12) pour les erreurs
- Redémarrer le backend après modification de la config

---

## Réseau et connexion

### Mettre à jour l'IP réseau

Quand l'IP de votre machine change (nouveau WiFi, etc.) :

1. **Backend** : Redémarrer, noter la nouvelle IP affichée
2. **Toutes les apps** : Mettre à jour dans chaque `.env` :
   - `baibebalo-livreur/.env` → `EXPO_PUBLIC_API_URL`
   - `baibebalo-restaurant/.env` → `EXPO_PUBLIC_API_URL`
   - `baibebalo-client-clean/.env` → `EXPO_PUBLIC_API_URL`
   - `baibebalo-admin/.env` → `VITE_API_URL` et `VITE_BACKEND_URL`
3. Mettre à jour l'IP dans les fichiers :
   - `baibebalo-livreur/src/constants/api.js` (DEV_API_URL)
   - `baibebalo-restaurant/src/constants/api.js` (fallback)
   - `baibebalo-livreur/src/services/socketService.js`
   - `baibebalo-client-clean/src/services/socketService.js`

### Téléphone ne trouve pas le serveur

**Solution** :
- Vérifier que le pare-feu Windows autorise le port 5000
- Tester sur le même PC : `http://localhost:5000/health`
- Tester depuis le téléphone : `http://[IP_PC]:5000/health` (dans le navigateur du téléphone)

---

## Base de données

### Réinitialiser la base

```bash
cd baibebalo-backend
npm run migrate:reset   # À utiliser avec précaution !
npm run migrate
npm run seed:test       # Données de test
```

### Vérifier la connexion

```bash
cd baibebalo-backend
node -e "
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'baibebalo',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});
pool.query('SELECT 1').then(() => console.log('✅ Connexion OK')).catch(e => console.error('❌', e.message));
"
```

---

## Erreurs courantes

### `Module not found` / `Cannot find module`

**Solution** :
```bash
# Réinstaller les dépendances
rm -rf node_modules
npm install
```

### `EADDRINUSE` (port déjà utilisé)

**Solution** : Arrêter le processus qui utilise le port ou changer le port dans la config.

### `ENOENT: no such file or directory`

**Solution** : Vérifier les chemins (uploads, logs). Créer les dossiers manquants :
```bash
mkdir -p baibebalo-backend/uploads
mkdir -p baibebalo-backend/logs
```

### `JWT_SECRET is required`

**Solution** : Ajouter `JWT_SECRET` dans le fichier `.env` du backend.

---

## 📞 Support

En cas de problème non résolu :
- **Téléphone** : 05 85 67 09 40 / 07 87 09 79 96
- **Email** : support@baibebalo.ci

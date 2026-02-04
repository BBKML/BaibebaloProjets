# Plan de tests - Baibebalo

Ce document décrit comment vérifier que l’application fonctionne correctement sans erreur.

---

## 1. Backend (baibebalo-backend)

### Test de fumée (sans base de données)
Vérifie que les modules principaux (config, logger, routes) se chargent sans erreur.

```bash
cd baibebalo-backend
npm run test:smoke
```

**Résultat attendu :** `Tous les modules principaux se chargent correctement.`

### Test API complet (serveur + base de données)
Lance le serveur et teste les routes (auth, restaurants, commandes, etc.).  
**Prérequis :** `.env` configuré, PostgreSQL démarré, base créée.

```bash
cd baibebalo-backend
node test-api-complete.js
```

### Lancer le serveur manuellement
```bash
cd baibebalo-backend
npm run dev
```
Puis ouvrir `http://localhost:5000/health` → doit retourner `{"success":true,...}`.

---

## 2. Admin (baibebalo-admin)

### Build de production
Vérifie que l’application React compile sans erreur.

```bash
cd baibebalo-admin
npm run build
```

**Résultat attendu :** build terminé avec `✓ built in ...`, fichiers dans `dist/`.

### Lancer en dev
```bash
cd baibebalo-admin
npm run dev
```
Ouvrir `http://localhost:5173` (ou le port indiqué).

---

## 3. Client mobile (baibebalo-client-clean)

### Vérification des dépendances (Expo)
```bash
cd baibebalo-client-clean
npx expo-doctor
```

Corriger les avertissements si besoin (ex. `npx expo install --check`).

### Lancer l’app
```bash
cd baibebalo-client-clean
npm start
```
Puis scanner le QR code avec Expo Go (Android/iOS) ou lancer un simulateur.

### Export web (optionnel)
Nécessite d’installer le support web :

```bash
npx expo install react-dom react-native-web
npx expo export --platform web
```

---

## 4. Checklist rapide “tout vérifier”

| Étape | Commande | Répertoire |
|-------|----------|------------|
| 1. Backend – fumée | `npm run test:smoke` | `baibebalo-backend` |
| 2. Admin – build | `npm run build` | `baibebalo-admin` |
| 3. Client – doctor | `npx expo-doctor` | `baibebalo-client-clean` |

Ensuite, tests manuels recommandés :

- **Backend :** `npm run dev` puis `GET http://localhost:5000/health`
- **Admin :** `npm run dev` puis navigation dans les pages principales
- **Client :** `npm start` puis parcours des écrans sur appareil / simulateur

---

## 5. Tests API avancés (optionnel)

- **Admin :** `cd baibebalo-backend && node test-admin-endpoints.js` (avec serveur + auth admin)
- **Restaurants / Korhogo :** `node test-api-korhogo.js`
- **Login restaurant :** `node test-restaurant-login.js`
- **Login livreur :** `node test-login-livreur.js`

Ces scripts supposent que le serveur tourne et que la base contient des données de test.

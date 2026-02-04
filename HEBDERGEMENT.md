# Hébergement Baibebalo – Serveur et tests par vos amis

Ce guide explique comment héberger le backend et l’admin sur un serveur, puis permettre à vos amis de tester les **trois applications mobiles** (Client, Livreur, Restaurant) pointant vers ce serveur.

---

## Option gratuite et facile : Render + Vercel

Pour un hébergement **100 % gratuit** et **simple à déployer** (sans serveur à gérer), utilisez :

| Composant | Hébergeur | Gratuit | Difficulté |
|-----------|-----------|---------|------------|
| **Backend (API)** + **PostgreSQL** | [Render](https://render.com) | Oui (limites du free tier) | Très facile |
| **Admin (panel web)** | [Vercel](https://vercel.com) | Oui | Très facile |

Les deux se connectent à votre dépôt GitHub et redéploient à chaque push.

---

### A. Backend sur Render (gratuit)

1. **Créer un compte** sur [render.com](https://render.com) (connexion GitHub possible).

2. **Créer une base PostgreSQL**  
   - Dashboard → **New +** → **PostgreSQL**.  
   - Nom : `baibebalo-db`.  
   - Région : choisir la plus proche (ex. Frankfurt).  
   - **Create Database**.  
   - Une fois créée, ouvrir la DB et noter : **Internal Database URL** (format `postgresql://user:pass@host/dbname`). Vous en aurez besoin pour le Web Service.

3. **Créer un Web Service (API)**  
   - **New +** → **Web Service**.  
   - Connecter votre repo **GitHub** (ex. `BBKML/BaibebaloProjets`).  
   - **Paramètres importants** :  
     - **Root Directory** : `baibebalo-backend`  
     - **Runtime** : `Node`  
     - **Build Command** : `npm install` *(ne pas lancer les migrations ici)*  
     - **Start Command** : `npm run migrate && npm start` *(migrations au démarrage, quand DATABASE_URL est disponible)*  
     - **Instance Type** : **Free**

4. **Variables d’environnement** (onglet **Environment**) — **obligatoire**  
   Sans `DATABASE_URL`, l’API tente de se connecter à `localhost` et le déploiement échoue. Ajoutez **avant** le premier déploiement :

   | Variable | Valeur |
   |----------|--------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | **À l’étape 2**, dans votre base PostgreSQL Render, ouvrez l’onglet **Info** et copiez **Internal Database URL** (format `postgresql://user:motdepasse@host/nomdb`). Collez-la ici. Si vous « liez » la base au Web Service (bouton **Connect** sur la DB), Render peut l’ajouter automatiquement. |
   | `JWT_SECRET` | Une longue chaîne aléatoire (ex. [randomkeygen](https://randomkeygen.com)) |
   | `JWT_REFRESH_SECRET` | Une autre longue chaîne aléatoire |
   | `CORS_ORIGIN` | `*` pour les tests (ou plus tard l’URL Vercel de l’admin) |

   **Après** la première création du service, ajoutez aussi :  
   | `API_BASE_URL` | L’URL du Web Service (ex. `https://baibebalo-api-xxxx.onrender.com`, sans slash final) |

   **Important** : Tant que `DATABASE_URL` n’est pas défini, le backend utilise `localhost` et la migration échoue. Vérifiez que la variable est bien enregistrée (pas d’espace, valeur collée en un seul bloc).

5. **Créer le service**  
   Cliquer sur **Create Web Service**. Render build et démarre l’API. La première fois peut prendre 2–3 minutes.

6. **Récupérer l’URL de l’API**  
   En haut de la page du service : **URL** (ex. `https://baibebalo-api-xxxx.onrender.com`).  
   - Ouvrez `https://votre-url.onrender.com/health` dans le navigateur : vous devez voir `{"success":true,...}`.  
   - **Important** : mettez cette URL dans `API_BASE_URL` dans les variables d’environnement du Web Service, puis **Save Changes** (et redéploiement si besoin).

**Note Render free tier** : le service “s’endort” après ~15 min sans requête. La première requête après ça peut prendre 30–50 secondes (cold start). Pour des tests entre amis, c’est en général acceptable.

---

### B. Admin sur Vercel (gratuit)

1. **Créer un compte** sur [vercel.com](https://vercel.com) (connexion GitHub possible).

2. **Importer le projet**  
   - **Add New…** → **Project**.  
   - Importez le même repo GitHub (**BBKML/BaibebaloProjets**).  
   - **Root Directory** : cliquez sur **Edit** et mettez `baibebalo-admin`.

3. **Configurer le build**  
   - **Framework Preset** : Vite (détecté automatiquement).  
   - **Build Command** : `npm run build` (par défaut).  
   - **Output Directory** : `dist` (par défaut).  
   - **Environment Variable** : ajoutez une variable :  
     - Name : `VITE_API_URL`  
     - Value : `https://votre-api.onrender.com/api/v1` (l’URL Render de l’étape A + `/api/v1`).  
   - Puis **Deploy**.

4. **Récupérer l’URL de l’admin**  
   À la fin du déploiement, Vercel affiche une URL (ex. `https://baibebalo-admin-xxxx.vercel.app`). Ouvrez-la : vous devez voir le panel admin. Si la connexion à l’API échoue, vérifiez que `VITE_API_URL` est bien l’URL Render + `/api/v1` et que CORS sur Render autorise cette origine (`CORS_ORIGIN=*` ou l’URL Vercel).

---

### C. Base de données sur Render (DATABASE_URL)

Render fournit une variable **Internal Database URL** (ex. `postgresql://user:pass@dpg-xxx.region.render.com/dbname`). Le backend Baibebalo **utilise déjà `DATABASE_URL`** : si vous définissez cette variable dans les variables d’environnement du Web Service (en collant l’Internal Database URL depuis le dashboard PostgreSQL Render), la connexion à la base se fera automatiquement. Aucune autre variable DB n’est nécessaire.

---

### D. Les 3 apps mobiles et vos amis

Une fois l’API en ligne (Render) et l’admin (Vercel) :

1. **Dans chaque app** (Client, Livreur, Restaurant), créez un fichier `.env` à la racine avec :  
   `EXPO_PUBLIC_API_URL=https://votre-api.onrender.com/api/v1`  
   (remplacez par votre vraie URL Render).

2. **Tests rapides avec Expo Go**  
   - Sur votre PC : `npx expo start --tunnel` dans chaque app.  
   - Vos amis installent **Expo Go**, scannent le QR code : l’app se charge et appelle votre API Render.

3. **Partage durable (APK)**  
   - Dans chaque `eas.json`, remplacez `https://api.baibebalo.ci` par `https://votre-api.onrender.com` dans les profils `preview` et `production` (section `env.EXPO_PUBLIC_API_URL`).  
   - Puis : `eas build --platform android --profile preview` dans chaque app.  
   - Partagez les 3 liens de téléchargement EAS à vos amis : ils installent l’APK et l’app utilisera votre API Render.

---

## Vue d’ensemble

| Composant | Rôle | Où l’héberger |
|-----------|------|-------------------------------|
| **Backend** (API) | Node.js + PostgreSQL | VPS (DigitalOcean, OVH, etc.) ou Railway / Render |
| **Admin** (panel web) | Build Vite (fichiers statiques) | Même serveur (nginx) ou Vercel / Netlify |
| **3 apps mobiles** | Client, Livreur, Restaurant (Expo) | Pas d’hébergement “serveur” : on construit des APK/IPA et on partage le lien de téléchargement ou on utilise Expo Go |

Les amis installent les apps sur leur téléphone ; les apps appellent l’API sur **votre URL publique** (ex. `https://api.baibebalo.ci`).

---

## Étape 1 – Héberger le backend (API)

### 1.1 Serveur requis

- **Node.js** 18+
- **PostgreSQL** 14+
- Un **domaine** (ex. `api.baibebalo.ci`) ou une **IP** publique

### 1.2 Variables d’environnement (production)

Sur le serveur, créez un fichier `.env` (ou configurez-les dans Railway/Render) :

```env
NODE_ENV=production
PORT=5000

# URL publique de l’API (sans slash final)
API_BASE_URL=https://api.baibebalo.ci

# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=baibebalo
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe_fort

# JWT (générez des clés longues et aléatoires)
JWT_SECRET=votre_jwt_secret_tres_long_et_aleatoire
JWT_REFRESH_SECRET=votre_refresh_secret_tres_long

# CORS : autoriser l’admin et les apps (Expo peut utiliser * en phase test)
# Remplacez par vos URLs réelles quand vous les avez
CORS_ORIGIN=https://admin.baibebalo.ci,https://votre-admin.vercel.app

# URLs des frontends (optionnel, pour emails/liens)
CLIENT_APP_URL=https://expo.dev/...
ADMIN_PANEL_URL=https://admin.baibebalo.ci
```

En phase **test avec amis**, vous pouvez mettre `CORS_ORIGIN=*` pour tout autoriser (à restreindre ensuite).

### 1.3 Lancer l’API en production

**Option A – PM2 (VPS Linux)**

```bash
cd baibebalo-backend
npm ci --production
npm run migrate
npx pm2 start index.js --name baibebalo-api
npx pm2 save
npx pm2 startup
```

**Option B – Railway / Render**

- Connectez le dépôt GitHub.
- Définissez les variables d’environnement ci‑dessus.
- Commande de démarrage : `node index.js` (ou `npm start`).
- Railway/Render vous donnent une URL du type `https://xxx.railway.app` ou `https://xxx.onrender.com` → c’est votre `API_BASE_URL`.

### 1.4 Vérifier l’API

- Ouvrir dans un navigateur : `https://votre-api.com/health`
- Réponse attendue : `{"success":true,...}`

---

## Étape 2 – Héberger l’admin (panel web)

### 2.1 Build avec l’URL de l’API

À la racine de `baibebalo-admin` :

```bash
cd baibebalo-admin
# Remplacez par l’URL réelle de votre backend
export VITE_API_URL=https://api.baibebalo.ci/api/v1
npm run build
```

Le dossier `dist/` contient le site prêt à être servi.

### 2.2 Mise en ligne

- **VPS + nginx** : pointez un vhost vers le dossier `dist/` (et éventuellement un reverse proxy vers l’API).
- **Vercel / Netlify** : déployez le dossier `dist/` ou connectez le repo et définissez `VITE_API_URL` en variable d’environnement de build.

Une fois en ligne, notez l’URL de l’admin (ex. `https://admin.baibebalo.ci`) et mettez‑la dans `CORS_ORIGIN` du backend.

---

## Étape 3 – Configurer les 3 apps mobiles pour la prod

Les trois apps (Client, Livreur, Restaurant) doivent appeler **votre API en production**.

### 3.1 Variable d’environnement commune

Dans chaque app Expo, on utilise **la même URL d’API** :

- **Client** : `baibebalo-client-clean`
- **Livreur** : `baibebalo-livreur`
- **Restaurant** : `baibebalo-restaurant`

Pour la **production / tests amis**, définir l’URL de l’API au moment du build (ou dans un fichier `.env` lu par Expo).

**Option recommandée – `.env` à la racine de chaque app :**

Créez dans chaque dossier d’app un fichier `.env` (et ajoutez‑le au `.gitignore` si vous ne voulez pas le committer) :

```env
EXPO_PUBLIC_API_URL=https://api.baibebalo.ci/api/v1
```

Remplacez `https://api.baibebalo.ci` par votre vraie URL (Railway, Render, ou votre domaine).

Les trois apps lisent déjà `EXPO_PUBLIC_API_URL` (Client et Livreur) ou peuvent être alignées dessus (Restaurant a été mis à jour pour faire pareil). Au prochain build, elles utiliseront cette URL.

### 3.2 Résumé par app

| App | Fichier de config API | Variable |
|-----|------------------------|----------|
| Client | `baibebalo-client-clean/src/constants/api.js` | `EXPO_PUBLIC_API_URL` |
| Livreur | `baibebalo-livreur/src/constants/api.js` | `EXPO_PUBLIC_API_URL` |
| Restaurant | `baibebalo-restaurant/src/constants/api.js` | `EXPO_PUBLIC_API_URL` (aligné) |

---

## Étape 4 – Permettre à vos amis de tester les 3 apps mobiles

Les amis n’ont pas accès à votre code ; ils doivent **installer** les apps sur leur téléphone. Deux approches possibles.

### 4.1 Option A – Expo Go (rapide, pour tests)

1. **Sur votre machine** (backend déjà hébergé et accessible) :
   - Dans chaque app (Client, Livreur, Restaurant), créez un fichier `.env` avec :
     - `EXPO_PUBLIC_API_URL=https://votre-api-publique.com/api/v1`
   - Lancez : `npx expo start --tunnel`
   - Expo affiche un **QR code**.

2. **Vos amis** :
   - Installent **Expo Go** (Android ou iOS).
   - Scannent le QR code de l’app que vous leur montrez (Client, Livreur ou Restaurant).
   - L’app se charge dans Expo Go et appelle votre API en prod (grâce à `EXPO_PUBLIC_API_URL`).

Inconvénient : tant que vous gardez `expo start --tunnel` ouvert, ils peuvent tester ; dès que vous arrêtez, le QR ne marche plus. Idéal pour une démo courte.

### 4.2 Option B – Builds installables (APK / lien EAS) – recommandé pour “héberger et laisser tester”

Avec **EAS (Expo Application Services)** vous générez des **builds** (APK pour Android, possibilité iOS) que vos amis installent une fois. Plus besoin de votre PC allumé.

1. **Compte Expo** : créez un compte sur [expo.dev](https://expo.dev) et installez EAS CLI :
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **Lier le projet EAS** (une fois par app) :
   ```bash
   cd baibebalo-client-clean
   eas build:configure
   ```
   Faites de même dans `baibebalo-livreur` et `baibebalo-restaurant`.

3. **Définir l’URL de l’API pour le build**  
   Avant de lancer le build, assurez‑vous que `EXPO_PUBLIC_API_URL` est défini :
   - soit dans un `.env` à la racine du projet (avec la même valeur pour tous),
   - soit en variable d’environnement EAS (dans le tableau de bord Expo ou dans `eas.json`).

4. **Lancer un build Android (APK)** pour chaque app :
   ```bash
   cd baibebalo-client-clean
   eas build --platform android --profile preview
   ```
   Idem dans `baibebalo-livreur` et `baibebalo-restaurant`.

5. **Partager avec vos amis** :
   - Une fois le build terminé, EAS affiche un **lien de téléchargement** (pour l’APK).
   - Envoyez ce lien à vos amis (Client, Livreur, Restaurant : 3 liens différents).
   - Ils téléchargent et installent l’APK ; l’app utilisera l’API configurée (`EXPO_PUBLIC_API_URL`).

Vous pouvez aussi créer un **profil “preview”** dans `eas.json` pour générer des APK de test (sans passer par le Play Store). Un exemple `eas.json` est fourni plus bas.

---

## Fichiers utiles ajoutés / à créer

- **Backend** : `.env` sur le serveur (voir 1.2). Un `.env.production.example` peut résumer les variables nécessaires.
- **Admin** : build avec `VITE_API_URL` (voir 2.1).
- **Apps mobiles** : `.env` avec `EXPO_PUBLIC_API_URL` dans chaque app (Client, Livreur, Restaurant).
- **EAS** : `eas.json` dans chaque app Expo (voir section suivante) pour `eas build --platform android --profile preview`.

---

## Exemple `eas.json` (pour chaque app Expo)

À la racine de `baibebalo-client-clean`, `baibebalo-livreur` et `baibebalo-restaurant`, vous pouvez ajouter un fichier `eas.json` :

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.baibebalo.ci/api/v1"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.baibebalo.ci/api/v1"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

Remplacez `https://api.baibebalo.ci` par votre URL d’API. Le profil `preview` permet de construire un APK téléchargeable pour vos amis.

---

## Checklist rapide

1. [ ] Backend déployé et `.env` de production configuré (API_BASE_URL, CORS_ORIGIN, DB, JWT).
2. [ ] Admin buildé avec `VITE_API_URL` et déployé ; URL admin ajoutée dans `CORS_ORIGIN` du backend.
3. [ ] Dans chaque app mobile (Client, Livreur, Restaurant) : `EXPO_PUBLIC_API_URL` défini (`.env` ou EAS) vers votre API.
4. [ ] EAS configuré (`eas build:configure`) et builds “preview” lancés pour les 3 apps.
5. [ ] Liens de téléchargement (APK) ou QR code Expo Go partagés avec vos amis.

Après ça, vos amis peuvent tester les trois applications mobiles en se connectant à votre serveur.

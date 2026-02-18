# 🚀 Guide de déploiement Baibebalo — Korhogo

Plateforme de livraison de repas à Korhogo, Côte d'Ivoire.

---

## 📋 Choix techniques

| Élément | Choix |
|---------|-------|
| Hébergement | VPS |
| SMS (OTP) | Nexah |
| Paiement | Pas de paiement en ligne (espèces à la livraison) |
| Notifications | Firebase |
| Géolocalisation | Gratuit |
| Distribution apps | APK direct (Google Drive / site web) |

---

## 🔗 Liens utiles

### Services & Documentation

| Service | Lien | Usage |
|---------|------|-------|
| **Nexah SMS** | https://nexah.net | SMS OTP pour connexion |
| **Firebase Console** | https://console.firebase.google.com | Notifications push |
| **Expo / EAS Build** | https://expo.dev | Build des APK |
| **Let's Encrypt** | https://letsencrypt.org | Certificats HTTPS gratuits |

### Hébergeurs VPS recommandés

| Fournisseur | Lien | Prix indicatif |
|-------------|------|----------------|
| **DigitalOcean** | https://www.digitalocean.com | À partir de 6 $/mois |
| **Hetzner** | https://www.hetzner.com | À partir de 4 €/mois |
| **OVH** | https://www.ovhcloud.com | Variable |
| **Contabo** | https://contabo.com | Prix bas |

### Outils

| Outil | Lien |
|-------|------|
| **Node.js** | https://nodejs.org |
| **PostgreSQL** | https://www.postgresql.org |
| **PM2** | https://pm2.keymetrics.io |
| **Nginx** | https://nginx.org |
| **Certbot** | https://certbot.eff.org |

---

## 🖥️ Installation sur VPS

### 1. Prérequis

- VPS Ubuntu 20.04 ou 22.04 (1 vCPU, 1–2 Go RAM, 25 Go disque)
- Accès SSH root ou sudo
- Nom de domaine pointant vers l’IP du VPS (ex. `api.baibebalo.ci`)

### 2. Mise à jour et installation des paquets

```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Nginx + Certbot (HTTPS)
sudo apt install -y nginx certbot python3-certbot-nginx

# PM2 (gestion des processus Node.js)
sudo npm install -g pm2
```

### 3. Configuration PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE baibebalo;
CREATE USER baibebalo WITH ENCRYPTED PASSWORD 'votre_mot_de_passe_fort';
GRANT ALL PRIVILEGES ON DATABASE baibebalo TO baibebalo;
\q
```

### 4. Déploiement du backend

```bash
# Créer le répertoire
sudo mkdir -p /var/www
cd /var/www

# Cloner le projet (remplacer par votre dépôt Git)
sudo git clone https://github.com/VOTRE_UTILISATEUR/BaibebaloProjets.git
cd BaibebaloProjets/baibebalo-backend

# Installer les dépendances
npm install --production

# Copier et configurer .env
cp .env.example .env
nano .env
```

### 5. Variables d'environnement (.env)

```env
NODE_ENV=production
PORT=5000
API_URL=https://api.baibebalo.ci

# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=baibebalo
DB_USER=baibebalo
DB_PASSWORD=votre_mot_de_passe_fort

# JWT (générer des clés aléatoires longues)
JWT_SECRET=une_cle_tres_longue_et_aleatoire_minimum_256_bits
JWT_REFRESH_SECRET=autre_cle_longue_et_aleatoire_minimum_256_bits

# Nexah SMS
SMS_PROVIDER=nexah
NEXAH_API_KEY=votre_cle_nexah
NEXAH_SENDER_ID=BAIBEBALO
NEXAH_ENDPOINT=https://api.nexah.net/api/v1/sms/send

# Firebase (notifications push)
FIREBASE_PROJECT_ID=votre_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@xxx.iam.gserviceaccount.com

# Stockage local (pas de S3/Cloudinary nécessaire au démarrage)
UPLOAD_PROVIDER=local
UPLOAD_DIR=./uploads

# CORS (ajouter vos URLs)
CORS_ORIGIN=https://votre-site.vercel.app,https://admin.baibebalo.ci

# Rayon de livraison (15 km défaut, 20 km max)
MAX_DELIVERY_RADIUS_KM=20
```

### 6. Migrations et démarrage

```bash
# Exécuter les migrations
npm run migrate

# Créer un admin (optionnel)
npm run admin:create

# Démarrer avec PM2
pm2 start index.js --name baibebalo-api
pm2 save
pm2 startup
```

### 7. Configuration Nginx

Créer le fichier `/etc/nginx/sites-available/baibebalo` :

```nginx
server {
    listen 80;
    server_name api.baibebalo.ci;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activer et tester :

```bash
sudo ln -s /etc/nginx/sites-available/baibebalo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. HTTPS avec Let's Encrypt

```bash
sudo certbot --nginx -d api.baibebalo.ci
```

---

## 📱 Build des applications mobiles (APK)

### Prérequis

- Compte Expo : https://expo.dev
- EAS CLI : `npm install -g eas-cli`
- Connexion : `eas login`

### URL API dans les apps

Vérifier dans chaque `eas.json` que `EXPO_PUBLIC_API_URL` pointe vers votre API :

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.baibebalo.ci/api/v1"
      }
    }
  }
}
```

### Commandes de build

```bash
# App Client (clients Korhogo)
cd baibebalo-client-clean
eas build --platform android --profile production

# App Restaurant (restaurants partenaires)
cd baibebalo-restaurant
eas build --platform android --profile production

# App Livreur (livreurs)
cd baibebalo-livreur
eas build --platform android --profile production
```

### Téléchargement des APK

1. Aller sur https://expo.dev
2. Sélectionner le projet
3. Onglet **Builds** → télécharger les APK générés

---

## 📤 Distribution des APK

### Option 1 : Google Drive

1. Créer un dossier **Baibebalo** sur Google Drive
2. Uploader les 3 APK (Client, Restaurant, Livreur)
3. Partager les liens en mode « Toute personne disposant du lien »
4. Récupérer les liens de téléchargement direct

### Option 2 : Page web simple

Créer une page HTML hébergée (Vercel, Netlify, ou sur le VPS) :

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Télécharger Baibebalo</title>
</head>
<body>
  <h1>📦 Télécharger Baibebalo</h1>
  <p>Plateforme de livraison à Korhogo</p>
  
  <h2>Pour les clients</h2>
  <a href="LINK_APK_CLIENT">Télécharger l'app Client</a>
  
  <h2>Pour les restaurants</h2>
  <a href="LINK_APK_RESTAURANT">Télécharger l'app Restaurant</a>
  
  <h2>Pour les livreurs</h2>
  <a href="LINK_APK_LIVREUR">Télécharger l'app Livreur</a>
</body>
</html>
```

### Liens à partager

| App | Public | Lien |
|-----|--------|------|
| Client | Clients Korhogo | [À remplir après build] |
| Restaurant | Restaurants partenaires | [À remplir après build] |
| Livreur | Livreurs | [À remplir après build] |

---

## ✅ Checklist avant lancement

### Backend

- [ ] VPS provisionné et sécurisé (firewall, SSH)
- [ ] PostgreSQL installé et base créée
- [ ] Backend déployé avec PM2
- [ ] Nginx + HTTPS configurés
- [ ] Fichier `.env` complet (DB, JWT, Nexah, Firebase)
- [ ] Migrations exécutées (`npm run migrate`)
- [ ] API accessible : `https://api.baibebalo.ci/api/v1/health` (ou équivalent)

### Applications

- [ ] `EXPO_PUBLIC_API_URL` mis à jour dans les 3 apps
- [ ] 3 APK générés avec EAS Build
- [ ] APK testés sur téléphones Android réels
- [ ] Liens de téléchargement prêts (Drive ou page web)

### Partenaires

- [ ] Au moins 3 restaurants partenaires
- [ ] Au moins 5 livreurs formés
- [ ] Numéro de support (WhatsApp / téléphone)

---

## 📞 Support

Pour toute question sur le déploiement, consulter :

- Documentation Nexah : https://nexah.net/documentation
- Documentation Expo EAS : https://docs.expo.dev/build/introduction/
- Documentation Firebase : https://firebase.google.com/docs

---

*Dernière mise à jour : Février 2025*

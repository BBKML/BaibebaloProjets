# BAIBEBALO Backend API

Backend API pour la plateforme de livraison locale BAIBEBALO - Korhogo, Côte d'Ivoire

## 📋 Table des matières

- [Présentation](#présentation)
- [Fonctionnalités](#fonctionnalités)
- [Stack Technique](#stack-technique)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Déploiement](#déploiement)

## 🎯 Présentation

BAIBEBALO est une plateforme de livraison locale qui connecte clients, restaurants et livreurs à Korhogo. Ce backend fournit toutes les API nécessaires pour:

- Gestion des utilisateurs (clients, restaurants, livreurs, admins)
- Gestion des commandes en temps réel
- Système de paiement (Cash et Mobile Money)
- Géolocalisation et suivi GPS
- Notifications push et SMS
- Programme de fidélité et parrainage

## ✨ Fonctionnalités

### Pour les Clients
- ✅ Inscription/Connexion par OTP SMS
- ✅ Parcourir les restaurants à proximité
- ✅ Commander repas et produits
- ✅ Suivi en temps réel des commandes
- ✅ Historique et favoris
- ✅ Programme de fidélité
- ✅ Parrainage

### Pour les Restaurants
- ✅ Inscription et validation
- ✅ Gestion du menu (catégories, plats, prix)
- ✅ Réception et traitement des commandes
- ✅ Statistiques de vente
- ✅ Gestion financière
- ✅ Avis clients

### Pour les Livreurs
- ✅ Inscription avec validation de documents
- ✅ Réception des courses disponibles
- ✅ Navigation GPS
- ✅ Gestion des gains
- ✅ Statistiques de performance

### Pour les Admins
- ✅ Dashboard global
- ✅ Gestion des utilisateurs
- ✅ Validation restaurants/livreurs
- ✅ Gestion des commandes
- ✅ Rapports financiers
- ✅ Support client

## 🛠 Stack Technique

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Base de données:** PostgreSQL avec PostGIS
- **Cache:** Redis
- **Real-time:** Socket.IO
- **Authentification:** JWT
- **SMS:** Twilio / Nexah
- **Paiements:** Orange Money, MTN Mobile Money, Moov Money
- **Maps:** Google Maps API
- **Notifications:** Firebase Cloud Messaging
- **Stockage:** AWS S3 / Cloudinary

## 📦 Installation

### Prérequis

```bash
node >= 18.0.0
npm >= 9.0.0
postgresql >= 14
redis >= 6.0
```

### Installation des dépendances

```bash
# Cloner le repository
git clone https://github.com/votre-org/baibebalo-backend.git
cd baibebalo-backend

# Installer les dépendances
npm install
```

### Configuration de la base de données

```bash
# Créer la base de données PostgreSQL
createdb baibebalo

# Exécuter les migrations
npm run migrate
```

## ⚙️ Configuration

### Variables d'environnement

Copier le fichier `.env.example` vers `.env` et configurer:

```bash
cp .env.example .env
```

Éditer `.env` avec vos propres valeurs:

```env
# Serveur
NODE_ENV=development
PORT=5000

# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=baibebalo
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe

# JWT
JWT_SECRET=votre_secret_jwt_tres_securise

# SMS (Twilio)
TWILIO_ACCOUNT_SID=votre_account_sid
TWILIO_AUTH_TOKEN=votre_auth_token
TWILIO_PHONE_NUMBER=+225XXXXXXXXX

# Google Maps
GOOGLE_MAPS_API_KEY=votre_google_maps_key

# Firebase
FIREBASE_PROJECT_ID=votre_project_id
```

## 🚀 Utilisation

### Développement

```bash
# Démarrer en mode développement avec nodemon
npm run dev
```

### Production

```bash
# Démarrer en production
npm start
```

### Migrations et Seeds

```bash
# Exécuter les migrations
npm run migrate

# Charger les données de test
npm run seed
```

### Tests

```bash
# Exécuter les tests
npm test

# Tests avec coverage
npm run test:coverage
```

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api/v1
```

### Endpoints principaux

#### Authentification

```http
POST /api/v1/auth/send-otp
POST /api/v1/auth/verify-otp
POST /api/v1/auth/refresh-token
POST /api/v1/auth/partner/login
POST /api/v1/auth/delivery/login
POST /api/v1/auth/admin/login
```

#### Clients

```http
GET    /api/v1/users/me
PUT    /api/v1/users/me
GET    /api/v1/users/me/addresses
POST   /api/v1/users/me/addresses
PUT    /api/v1/users/me/addresses/:id
DELETE /api/v1/users/me/addresses/:id
GET    /api/v1/users/me/orders
```

#### Restaurants

```http
GET  /api/v1/restaurants
GET  /api/v1/restaurants/:id
GET  /api/v1/restaurants/:id/menu
GET  /api/v1/restaurants/:id/reviews
POST /api/v1/restaurants (inscription)
```

#### Commandes

```http
POST   /api/v1/orders
GET    /api/v1/orders/:id
PUT    /api/v1/orders/:id/cancel
POST   /api/v1/orders/:id/review
GET    /api/v1/orders (historique)
```

#### Livreurs

```http
POST /api/v1/delivery/register
PUT  /api/v1/delivery/status
PUT  /api/v1/delivery/location
GET  /api/v1/delivery/available-orders
PUT  /api/v1/delivery/orders/:id/accept
```

### Format de réponse

Toutes les réponses suivent ce format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Opération réussie",
  "timestamp": "2025-01-11T14:30:00Z"
}
```

En cas d'erreur:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Description de l'erreur"
  },
  "timestamp": "2025-01-11T14:30:00Z"
}
```

### Authentification

Toutes les routes protégées nécessitent un token JWT dans le header:

```http
Authorization: Bearer <token>
```

## 🏗 Architecture

```
baibebalo-backend/
├── src/
│   ├── config/          # Configuration
│   ├── controllers/     # Contrôleurs
│   ├── database/        # DB et migrations
│   ├── middlewares/     # Middlewares
│   ├── models/          # Modèles de données
│   ├── routes/          # Routes Express
│   ├── services/        # Logique métier
│   ├── utils/           # Utilitaires
│   └── server.js        # Point d'entrée
├── logs/                # Fichiers de log
├── tests/               # Tests
├── .env.example         # Variables d'env exemple
├── package.json
└── README.md
```

### Flux d'une requête

```
Client → Express Router → Middleware Auth → Validator → 
Controller → Service → Database → Service → Controller → Client
```

## 🔐 Sécurité

- ✅ HTTPS obligatoire en production
- ✅ Helmet.js pour headers sécurisés
- ✅ Rate limiting par IP
- ✅ JWT avec expiration
- ✅ Validation des entrées
- ✅ Protection CSRF
- ✅ Sanitization des données
- ✅ Logs d'audit

## 📱 WebSocket Events

### Client → Server

```javascript
socket.emit('join_order', { orderId: 'uuid' });
socket.emit('update_location', { latitude, longitude });
```

### Server → Client

```javascript
socket.on('order_status_changed', (data) => {});
socket.on('delivery_location_updated', (data) => {});
socket.on('new_delivery_available', (data) => {});
```

## 🚢 Déploiement

### Avec Docker

```bash
# Build l'image
docker build -t baibebalo-api .

# Lancer le container
docker run -p 5000:5000 --env-file .env baibebalo-api
```

### Avec PM2

```bash
# Installer PM2
npm install -g pm2

# Démarrer l'application
pm2 start src/server.js --name baibebalo-api

# Sauvegarder la configuration
pm2 save

# Démarrer au boot
pm2 startup
```

### Serveurs recommandés

- **VPS:** DigitalOcean, Linode, AWS EC2
- **Configuration minimale:** 2 CPU, 4GB RAM, 50GB SSD
- **OS:** Ubuntu 22.04 LTS

## 📊 Monitoring

- **Logs:** Winston + rotation quotidienne
- **APM:** New Relic / Datadog (optionnel)
- **Uptime:** UptimeRobot
- **Errors:** Sentry (recommandé)

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amazing`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing`)
5. Ouvrir une Pull Request

## 📝 License

MIT License - voir le fichier LICENSE

## 👥 Équipe

- **Lead Developer:** Votre Nom
- **Backend:** Équipe Backend
- **DevOps:** Équipe DevOps

## 📞 Support

- **Email:** support@baibebalo.ci
- **Documentation:** https://docs.baibebalo.ci
- **Issues:** https://github.com/votre-org/baibebalo-backend/issues

---

Made with ❤️ in Korhogo, Côte d'Ivoire
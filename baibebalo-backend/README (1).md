# 🚀 BAIBEBALO Backend API

Plateforme de livraison locale - Korhogo, Côte d'Ivoire

## 📋 Vue d'ensemble

Backend API complet pour la plateforme de livraison BAIBEBALO, conforme au cahier des charges fourni. Ce projet implémente toutes les fonctionnalités nécessaires pour gérer les clients, restaurants, livreurs et commandes.

## ✅ Fichiers créés

### Infrastructure de base (100%)
- ✅ `package.json` - Dépendances et scripts
- ✅ `.env.example` - Template de configuration
- ✅ `index.js` - Point d'entrée principal
- ✅ `src/config/index.js` - Configuration centralisée
- ✅ `src/utils/logger.js` - Système de logging Winston
- ✅ `src/database/db.js` - Connexion PostgreSQL
- ✅ `src/database/migrate.js` - Système de migrations (20 tables)

### Sécurité et validation
- ✅ `src/middlewares/auth.js` - Authentification JWT complète
- ✅ `src/middlewares/validators.js` - Validation et rate limiting

### Documentation
- ✅ `GUIDE_COMPLETION.md` - Guide complet pour terminer le projet

## 📊 Statut du projet

**Complété: ~40%**

### ✅ Fait
- Infrastructure complète (serveur, DB, config)
- Système d'authentification JWT
- Migrations de base de données (20 tables)
- Middlewares de sécurité
- Logging professionnel
- WebSocket (Socket.IO) configuré

### 📝 À compléter
Consultez le fichier `GUIDE_COMPLETION.md` pour:
- Contrôleurs (user, restaurant, order, delivery, admin)
- Routes API complètes
- Services tiers (SMS, Email, Notifications, Paiements)
- Cron jobs
- Tests unitaires

## 🚀 Installation rapide (Windows)

### Prérequis
- Node.js 18+ ([télécharger](https://nodejs.org))
- PostgreSQL 14+ ([télécharger](https://www.postgresql.org/download/windows/))
- Git Bash ou PowerShell

### Étapes

1. **Installer les dépendances:**
```cmd
cd baibebalo-backend
npm install
```

2. **Créer la base de données:**
- Ouvrir pgAdmin ou psql
- Créer la base: `CREATE DATABASE baibebalo;`

3. **Configurer l'environnement:**
```cmd
copy .env.example .env
notepad .env
```

Configuration minimale dans `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=baibebalo
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe

JWT_SECRET=changez_moi_en_production_xyz123
JWT_REFRESH_SECRET=changez_refresh_secret_abc789

NODE_ENV=development
PORT=3000
```

4. **Exécuter les migrations:**
```cmd
npm run migrate
```

Résultat attendu:
```
✅ Migration 1/XX réussie
✅ Migration 2/XX réussie
...
✅ Admin par défaut créé: admin@baibebalo.ci / admin123
🎉 Toutes les migrations ont été exécutées avec succès !
```

5. **Démarrer le serveur:**
```cmd
npm run dev
```

Résultat:
```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 BAIBEBALO API Server                                  ║
║                                                            ║
║   Environment: development                                 ║
║   Port: 3000                                               ║
║   API Version: v1                                          ║
║                                                            ║
║   🔗 http://localhost:3000                                 ║
║   📚 Health: http://localhost:3000/health                  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

6. **Tester l'API:**
```cmd
curl http://localhost:3000/health
```

Réponse:
```json
{
  "success": true,
  "message": "BAIBEBALO API is running",
  "timestamp": "2026-01-11T14:30:00.000Z",
  "environment": "development"
}
```

## 📁 Structure du projet

```
baibebalo-backend/
├── index.js                    # Point d'entrée
├── package.json               # Dépendances
├── .env.example               # Template config
├── GUIDE_COMPLETION.md        # Guide de complétion
├── logs/                      # Logs (auto-créé)
└── src/
    ├── config/
    │   └── index.js           # ✅ Configuration
    ├── controllers/           # À compléter
    │   ├── auth.controller.js # Exemples dans le guide
    │   ├── user.controller.js
    │   ├── restaurant.controller.js
    │   ├── order.controller.js
    │   ├── delivery.controller.js
    │   └── admin.controller.js
    ├── database/
    │   ├── db.js              # ✅ Connexion PostgreSQL
    │   └── migrate.js         # ✅ Migrations (20 tables)
    ├── middlewares/
    │   ├── auth.js            # ✅ JWT auth
    │   └── validators.js      # ✅ Validation
    ├── routes/                # À compléter
    │   ├── auth.routes.js     # Exemple dans le guide
    │   ├── user.routes.js
    │   ├── restaurant.routes.js
    │   ├── order.routes.js
    │   ├── delivery.routes.js
    │   ├── admin.routes.js
    │   └── webhook.routes.js
    ├── services/              # À compléter
    │   ├── auth.service.js    # Exemple dans le guide
    │   ├── sms.service.js     # Exemple dans le guide
    │   ├── notification.service.js
    │   ├── email.service.js
    │   ├── upload.service.js
    │   └── payment/
    │       ├── orange-money.service.js
    │       └── mtn-momo.service.js
    ├── jobs/
    │   └── cron.js            # À créer
    └── utils/
        └── logger.js          # ✅ Logging Winston
```

## 🔌 API Endpoints (Planifiés)

### Authentification
- `POST /api/v1/auth/send-otp` - Envoyer OTP
- `POST /api/v1/auth/verify-otp` - Vérifier OTP
- `POST /api/v1/auth/partner/login` - Connexion restaurant
- `POST /api/v1/auth/delivery/login` - Connexion livreur
- `POST /api/v1/auth/admin/login` - Connexion admin
- `POST /api/v1/auth/refresh-token` - Rafraîchir token

### Clients (`/api/v1/users`)
- `GET /me` - Mon profil
- `PUT /me` - Modifier profil
- `GET /me/addresses` - Mes adresses
- `POST /me/addresses` - Ajouter adresse
- `GET /me/orders` - Mes commandes
- `GET /me/favorites` - Mes favoris

### Restaurants (`/api/v1/restaurants`)
- `GET /` - Liste restaurants
- `GET /:id` - Détails restaurant
- `GET /:id/menu` - Menu restaurant
- `POST /` - Inscription restaurant

### Commandes (`/api/v1/orders`)
- `POST /` - Créer commande
- `GET /:id` - Détails commande
- `PUT /:id/cancel` - Annuler

### Livreurs (`/api/v1/delivery`)
- `POST /register` - Inscription
- `PUT /status` - Changer statut
- `GET /available-orders` - Courses disponibles

### Admin (`/api/v1/admin`)
- `GET /dashboard` - Dashboard
- `GET /restaurants` - Gérer restaurants
- `GET /delivery-persons` - Gérer livreurs

## 🗄️ Base de données

### Tables créées (20)
- `users` - Clients
- `addresses` - Adresses de livraison
- `restaurants` - Restaurants/Partenaires
- `menu_categories` - Catégories de menu
- `menu_items` - Articles du menu
- `delivery_persons` - Livreurs
- `orders` - Commandes
- `order_items` - Articles de commande
- `reviews` - Avis
- `favorites` - Favoris
- `promotions` - Codes promo
- `transactions` - Transactions financières
- `notifications` - Notifications
- `otp_codes` - Codes OTP
- `admins` - Administrateurs
- `payout_requests` - Demandes de retrait
- `support_tickets` - Tickets de support
- `ticket_messages` - Messages de support
- `app_settings` - Paramètres app

### Compte admin par défaut
```
Email: admin@baibebalo.ci
Mot de passe: admin123
```
⚠️ **À CHANGER EN PRODUCTION!**

## 🛠️ Scripts disponibles

```bash
npm start        # Production
npm run dev      # Développement (nodemon)
npm run migrate  # Exécuter migrations
npm run migrate:reset  # Reset DB (DANGER!)
npm test         # Tests (à implémenter)
```

## 📚 Documentation complète

Consultez `GUIDE_COMPLETION.md` pour:
- Exemples de code complets pour tous les contrôleurs
- Implémentation des services SMS, Email, Notifications
- Configuration des paiements Mobile Money
- Création des cron jobs
- Tests et déploiement

## 🔐 Sécurité

- ✅ JWT avec refresh tokens
- ✅ Bcrypt pour les mots de passe
- ✅ Rate limiting sur toutes les routes
- ✅ Helmet.js pour les headers HTTP
- ✅ Validation stricte des inputs
- ✅ CORS configuré
- ✅ Logging de sécurité

## 🚀 Prochaines étapes

1. Compléter les contrôleurs (exemples dans `GUIDE_COMPLETION.md`)
2. Implémenter les services tiers
3. Créer les tests
4. Déployer en production

## 📞 Support

Pour toute question sur ce backend:
- 📧 Email: support@baibebalo.ci
- 📖 Docs: Voir `GUIDE_COMPLETION.md`

## ⚖️ Licence

Propriétaire - BAIBEBALO © 2026

---

**Développé avec ❤️ pour Korhogo, Côte d'Ivoire**

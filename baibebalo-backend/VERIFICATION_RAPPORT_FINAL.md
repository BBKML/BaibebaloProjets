# Rapport de vérification – Backend BAIBEBALO

**Date :** 2025  
**Périmètre :** Structure, routes API, modèles de données, sécurité, temps réel, notifications.

---

## 1. Vérification générale de la structure

### 1.1 Point d’entrée et scripts

| Élément | Statut | Détail |
|--------|--------|--------|
| Point d’entrée principal | OK | `index.js` (script `start`: `node index.js`) |
| Serveur alternatif | Info | `server.js` existe et monte des routes supplémentaires (ads, namespaces admin/partenaires) |
| Configuration | OK | `src/config/index.js` centralise env, DB, JWT, CORS, rate limit, Firebase, SMS, email, upload, notifications |
| Base de données | OK | PostgreSQL via `pg`, pool dans `src/database/db.js`, migrations dans `src/database/migrate.js` |

### 1.2 Organisation des dossiers

```
baibebalo-backend/
├── index.js                 # Entrée principale (Express + Socket.IO client)
├── server.js                # Entrée alternative (avec ads + namespaces admin/partenaires)
├── src/
│   ├── config/              # Configuration centrale
│   ├── controllers/         # Auth, user, restaurant, order, delivery, admin, ads, search, notification
│   ├── routes/              # 12 fichiers de routes API
│   ├── middlewares/         # auth.js, validators.js
│   ├── services/            # Auth, notification, email, SMS, maps, upload, deliveryProposal, payment (MTN, Orange)
│   ├── database/            # db.js, migrate.js, seed
│   ├── utils/               # logger, socketEmitter, socket, syncSettings, earnings, commission, export
│   ├── jobs/                # cron.js (tâches planifiées)
│   └── scripts/            # create-admin, test-admin-login
├── tests/                   # API, integration, performance, security
└── package.json
```

**Conclusion structure :** Organisation claire, séparation config / routes / controllers / services / database. Le point d’entrée par défaut est `index.js` (ads et partnersIo y sont intégrés) ; `server.js` reste une alternative avec les mêmes capacités.

---

## 2. Vérification des routes API

### 2.1 Routes montées dans `index.js` (entrée par défaut)

Toutes sous le préfixe `/api/v1/` (ou `config.apiVersion`) :

| Préfixe | Fichier | Auth | Rôle |
|---------|---------|------|------|
| `/public` | public.routes.js | Non | Données publiques (restaurants, menu, paramètres) |
| `/auth` | auth.routes.js | Partiel | OTP, verify-otp, refresh-token, login partner/admin/delivery, forgot/reset password |
| `/users` | user.routes.js | Oui | Profil client (me, adresses, favoris, fidélité, support, export, préférences notifications) |
| `/restaurants` | restaurant.routes.js | Oui | Partenaire restaurant (profil, menu, commandes, stats, support) |
| `/search` | search.routes.js | Optionnel | Recherche restaurants / plats |
| `/orders` | order.routes.js | Oui | Commandes (création food/express, frais, suivi, annulation, avis, paiement, messages) |
| `/notifications` | notification.routes.js | Oui | Notifications in-app (liste, marquer lu, préférences) |
| `/delivery` | delivery.routes.js | Oui | Livreur (register, profil, statut, position, commandes, accept/decline, gains, cash remittances) |
| `/admin` | admin.routes.js | Oui | Admin (dashboard, users, restaurants, livreurs, commandes, finances, promotions, support, settings, quizzes) |
| `/ads` | ads.routes.js | Selon route | Publicités (bannières, campagnes, stats admin/restaurant) |
| `/webhooks` | webhook.routes.js | Non | Webhooks paiements (phase 2 : Orange Money, MTN MoMo, etc.) |
| `/test` | test.routes.js | Non | Routes de test (login, register, orders, etc.) |

### 2.2 Routes publicités

| Préfixe | Fichier | Statut |
|---------|---------|--------|
| `/ads` | ads.routes.js | **Corrigé :** montées dans `index.js` sous `/api/v1/ads` (bannières, campagnes, stats). |

### 2.3 Protéction des routes

- Routes sensibles : `authenticate` puis `authorize(roles)` selon le cas.
- Orders : ownership et rôles (client, restaurant, delivery, admin) cohérents.
- Admin : `requireAdminPermission(permission)` utilisé où nécessaire.
- Webhooks : pas d’auth (normal). Vérification des signatures prévue en **phase 2 (paiement en ligne)**.

---

## 3. Vérification des modèles de données

### 3.1 Stack

- **Pas d’ORM** : accès direct PostgreSQL via `pg` et `src/database/db.js`.
- **Migrations** : `src/database/migrate.js` (CREATE TABLE IF NOT EXISTS, ALTER, index).
- **Requêtes** : utilisation systématique de paramètres (`$1`, `$2`, …) dans les contrôleurs/services consultés ; pas de concaténation SQL dangereuse sur des entrées utilisateur.

### 3.2 Tables principales (schéma migrate.js)

| Domaine | Tables |
|---------|--------|
| Utilisateurs / auth | `users`, `otp_codes`, `admins` |
| Restaurants | `restaurants`, `menu_categories`, `menu_items` |
| Livraison | `delivery_persons`, `order_delivery_proposals` |
| Commandes | `orders`, `order_items` |
| Adresses / préférences | `addresses`, `favorites` |
| Avis | `reviews` |
| Promotions / fidélité | `promotions`, `loyalty_transactions`, `referrals` |
| Paiements / finances | `transactions`, `payout_requests`, `cash_remittances`, `cash_remittance_orders` |
| Notifications / support | `notifications`, `support_tickets`, `ticket_messages` |
| Admin / config | `app_settings`, `dismissed_alerts`, `audit_logs`, `expenses` |
| Formation | `training_quizzes`, `quiz_results` |
| Activité | `activity_logs` |
| Publicité | `restaurant_ads`, `ad_pricing` |
| SMS / logs | `sms_logs` |

### 3.3 Helpers base de données

- `query(text, params)` avec retry et logging.
- `transaction(callback)` avec BEGIN/COMMIT/ROLLBACK.
- `queryPaginated`, `bulkInsert` (noms de table/colonnes issus du code, pas de l’utilisateur).
- `testConnection`, `getPoolStats`, fermeture gracieuse.

**Conclusion modèles :** Schéma riche et cohérent avec le métier, requêtes paramétrées, pas de risque d’injection SQL identifié dans le code parcouru.

---

## 4. Vérification de la sécurité

### 4.1 Authentification (JWT)

| Élément | Statut | Détail |
|--------|--------|--------|
| Access token | OK | `config.jwt.secret`, `expiresIn` (ex. 7d), issuer/audience |
| Refresh token | OK | Secret et durée séparés, blacklist en mémoire |
| Vérification | OK | `verifyAccessToken` / `verifyRefreshToken`, vérification existence et statut (actif/suspended/deleted) par type (user, restaurant, delivery_person, admin) |
| Révoque | OK | `revokeToken` + blacklist (à migrer en Redis en prod pour persistance et scaling) |

### 4.2 CORS

- **Corrigé :** `index.js` utilise désormais `config.cors.origin` (en dev : toutes origines, en prod : liste `CORS_ORIGIN` ou défaut localhost).

### 4.3 Rate limiting

- Activé **uniquement en production** (`config.env === 'production'`).
- Limiteur global sur `/api/` : fenêtre et max depuis `config.rateLimit` (ex. 15 min, 100 requêtes).
- Clé basée sur l’IP (avec prise en compte de `x-forwarded-for`).
- `app.set('trust proxy', 1)` présent pour les reverse proxies.

### 4.4 Headers et corps des requêtes

- **Helmet** : activé (CSP désactivée, crossOriginResourcePolicy pour fichiers statiques).
- **Body** : `express.json({ limit: '10mb' })`, `express.urlencoded({ extended: true, limit: '10mb' })`.

### 4.5 Validation des entrées

- **express-validator** dans `src/middlewares/validators.js` : `validate`, `sanitizeBody`, validateurs réutilisables (téléphone CI, email, OTP, UUID, pagination, coordonnées, etc.).
- Utilisation dans les routes (auth, user, order, delivery, admin) : chaînes de validateurs + `validate` avant le contrôleur.

### 4.6 Webhooks paiements (phase 2)

- Les webhooks Orange Money, MTN MoMo, etc. sont en place pour la **phase 2 (paiement en ligne)**. La vérification des signatures et la route FedaPay seront ajoutées à ce moment-là.

### 4.7 Configuration production

- **Corrigé :** En production, la validation exige `JWT_SECRET` et, pour la base de données, soit `DATABASE_URL` (Render, Railway, etc.), soit le quadruplet `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.

### 4.8 Résumé sécurité

- Points forts : JWT, rôles, statuts (suspended/deleted), rate limit en prod, validation des entrées, requêtes SQL paramétrées.
- À renforcer plus tard : blacklist JWT en Redis en prod ; vérification des signatures webhooks en **phase 2 (paiement en ligne)**.

---

## 5. Vérification du temps réel (Socket.IO)

### 5.1 Dans `index.js`

- **Namespace `/client`** : authentification par token (user/client), événements `join_order` / `leave_order`, rooms `order_<id>` (vérification que la commande appartient au client).
- **Namespace par défaut** : `io` utilisé pour `join_room` / `leave_room`, `update_location` (livreur → room `order_<id}`), et pour les notifications admin via la room `admin_dashboard` (si des clients admin s’y connectent).

### 5.2 Dans `server.js`

- Namespaces **admin** et **partenaires** (restaurants/livreurs) avec auth JWT et rooms dédiées (`admin_dashboard`, `order_<id>`, `delivery_<id>`, etc.).

### 5.3 Utilitaires

- **socketEmitter.js** : `emitToOrder(app, orderId, event, data)` envoie à la room `order_<id>` sur **io** et **clientIo**, utilisé pour `order_status_changed`, `delivery_assigned`, `delivery_location_updated`, `order_picked_up`, `new_order_message`, etc.
- **socket.js** : `notifyAdminDashboard(io, event, data)`, `notifyNewOrder(io, order)`, `notifyOrderStatusChange(io, orderId, status, additionalData)` vers la room `admin_dashboard`.

### 5.4 Namespace partenaires

- **Corrigé :** Le namespace `/partners` est défini dans `index.js` et exposé via `app.set('partnersIo', partnersNamespace)`. Les restaurants et livreurs peuvent s’y connecter (auth JWT), rejoindre les rooms `order_<id>`, `support_ticket_<id>`, et utiliser `update_availability` et `location_update`. Les notifications temps réel vers les partenaires fonctionnent avec `npm start`.

---

## 6. Vérification des notifications

### 6.1 Stratégie (config)

- **config.notifications.channels** : par type d’événement (otp, order_*, new_order, delivery_*, promotion, etc.) les canaux sont définis (`sms`, `push`, `websocket`). OTP = SMS ; commandes / livraison / promo = push (ou websocket).
- SMS réservé à l’OTP pour limiter les coûts.

### 6.2 Push

- **notification.service.js** : Expo Push (gratuit) et Firebase FCM ; `sendToUser(userId, userType, notification)` ; `sendOrderNotification(orderId, recipientType, eventType)` ; enregistrement en base (`notifications`) ; envoi aux admins.
- Tokens : colonnes `fcm_token` sur `users`, `restaurants`, `delivery_persons` (et admins si utilisé).

### 6.3 Email

- **email.service.js** (nodemailer) : reset password admin, approbation restaurant, etc. Config SMTP/SendGrid/Mailgun dans `config.email`.

### 6.4 In-app

- Table `notifications` ; routes `GET` liste, marquer lu, préférences ; contrôleur dédié ; préférences utilisateur (ex. `notification_preferences` sur `users`).

### 6.5 SMS

- **sms.service.js** : OTP uniquement (Twilio, Orange, Nexah, etc.), config dans `config.sms`.

### 6.6 Admin / broadcast

- Admin : envoi / broadcast / notifications promotionnelles (ex. POST `/admin/notifications/send`, broadcast, promotional).
- Ads : push ciblée pour campagnes (ads.controller).

**Conclusion notifications :** Stratégie claire (push pour la majorité, SMS pour OTP), Expo + FCM, in-app et email en place. Cohérent avec la config et le métier.

---

## 7. Synthèse et actions recommandées

### 7.1 Points forts

- Structure du projet claire (config, routes, controllers, services, database, utils, jobs).
- Routes API bien découpées et protégées par auth et rôles.
- Modèles de données complets, requêtes paramétrées, pas d’injection SQL constatée.
- JWT avec refresh, blacklist, vérification d’existence et de statut.
- Validation des entrées (express-validator) et rate limiting en production.
- Temps réel client (namespace `/client`, rooms `order_<id>`) et émission centralisée (`emitToOrder`).
- Notifications multi-canal (push Expo/FCM, in-app, email, SMS OTP) et stratégie par type d’événement.

### 7.2 Corrections appliquées (hors phase 2 paiement)

- **CORS :** `index.js` utilise `config.cors.origin` (dev : toutes origines, prod : `CORS_ORIGIN` ou défaut).
- **Routes ads :** Montées dans `index.js` sous `/api/v1/ads`.
- **Temps réel partenaires :** Namespace `/partners` et `app.set('partnersIo', …)` ajoutés dans `index.js` (auth restaurant/delivery_person, join_order, location_update, update_availability, etc.).
- **Config production :** Validation mise à jour : `JWT_SECRET` obligatoire ; base de données : soit `DATABASE_URL`, soit `DB_HOST` + `DB_NAME` + `DB_USER` + `DB_PASSWORD`.

### 7.3 À prévoir plus tard

- **Production :** Migrer la blacklist JWT vers Redis pour persistance et multi-instances.
- **Phase 2 (paiement en ligne) :** Vérification des signatures webhooks, route FedaPay si besoin.

---

*Rapport mis à jour après corrections (paiement en ligne exclu, prévu en phase 2).*

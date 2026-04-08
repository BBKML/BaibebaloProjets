# Rapport – Fonctionnalités Admin (routes et controllers)

**Backend BAIBEBALO** – Vérification et corrections appliquées.

---

## 1. Ce qui est implémenté

### 1.1 Validation des restaurants (approuver / rejeter)

| Route | Méthode | Controller | Statut |
|-------|---------|------------|--------|
| `/admin/restaurants/:id/approve` | PUT | `approveRestaurant` | OK |
| `/admin/restaurants/:id/reject` | PUT | `rejectRestaurant` | OK |
| `/admin/restaurants/:id/suspend` | PUT | `suspendRestaurant` | OK |
| `/admin/restaurants/:id/reactivate` | PUT | `reactivateRestaurant` | OK |
| `/admin/restaurants/:id` (détails) | GET | `getRestaurantById` | OK |
| `/admin/restaurants/:id/request-corrections` | POST | `requestRestaurantCorrections` | OK |

**Permission :** `approve_restaurants` pour les actions, `view_restaurants` pour la lecture.

---

### 1.2 Validation des livreurs (approuver / rejeter)

| Route | Méthode | Controller | Statut |
|-------|---------|------------|--------|
| `/admin/delivery-persons/:id/approve` | PUT | `approveDeliveryPerson` | OK |
| `/admin/delivery-persons/:id/reject` | PUT | `rejectDeliveryPerson` | OK |
| `/admin/delivery-persons/:id/suspend` | PUT | `suspendDeliveryPerson` | OK |
| `/admin/delivery-persons/:id` (détails) | GET | `getDeliveryPersonById` | OK |
| `/admin/delivery-persons/:id/request-info` | POST | `requestDeliveryPersonInfo` | OK |

**Permission :** `approve_deliveries` / `view_deliveries`.

---

### 1.3 Gestion des utilisateurs (suspendre / supprimer)

| Route | Méthode | Controller | Statut |
|-------|---------|------------|--------|
| `/admin/users/:id/suspend` | PUT | `suspendUser` | OK |
| `/admin/users/:id/activate` | PUT | `activateUser` | OK |
| `/admin/users/:id` | DELETE | `deleteUser` | OK (ajouté) |
| `/admin/users/bulk-action` | POST | `bulkActionUsers` | OK |
| `/admin/users` (liste) | GET | `getUsers` | OK |
| `/admin/users/:id` (détails) | GET | `getUserById` | OK |

**Correction :** Route **DELETE `/admin/users/:id`** et controller **`deleteUser`** ajoutés (soft delete : `status = 'deleted'`).  
**Permission :** `manage_users`.

---

### 1.4 Suivi des commandes en temps réel

| Route / mécanisme | Description | Statut |
|-------------------|-------------|--------|
| `GET /admin/dashboard/realtime-orders` | Liste des commandes en cours (new, accepted, preparing, ready, delivering) avec filtres | OK |
| `GET /admin/dashboard/geographic` | Données géographiques (carte) pour les commandes actives | OK |
| Socket.IO namespace default + room `admin_dashboard` | Événements `new_order`, `order_updated` pour le dashboard | OK (côté index.js / server.js) |

Les contrôleurs (order, delivery) utilisent `emitToOrder` et `notifyNewOrder(io, order)` pour notifier le dashboard.

---

### 1.5 Gestion financière (paiements restaurants et livreurs)

| Route | Méthode | Controller | Statut |
|-------|---------|------------|--------|
| `GET /admin/finances/overview` | Vue d’ensemble | `getFinancialOverview` | OK |
| `GET /admin/finances/transactions` | Liste des transactions | `getTransactions` | OK |
| `GET /admin/finances/payments/delivery` | Paiements livreurs | `getDeliveryPayments` | OK |
| `GET /admin/finances/payments/restaurants` | Paiements restaurants | `getRestaurantPayments` | OK |
| `GET /admin/finances/payouts` | Demandes de retrait | `getPayoutRequests` | OK |
| `PUT /admin/finances/payouts/:id/process` | Traiter un retrait | `processPayout` | OK |
| `PUT /admin/finances/payouts/:id/mark-paid` | Marquer comme payé | `markPayoutAsPaid` | OK |
| `PUT /admin/finances/payouts/:id/reject` | Rejeter un retrait | `rejectPayout` | OK |
| `PUT /admin/finances/delivery/:id/refresh-balance` | Recalcul solde livreur | `refreshDeliveryBalance` | OK |
| `POST /admin/finances/delivery/refresh-all-balances` | Recalcul tous les soldes livreurs | `refreshAllDeliveryBalances` | OK |
| `PUT /admin/finances/restaurant/:id/refresh-balance` | Recalcul solde restaurant | `refreshRestaurantBalance` | OK |
| `POST /admin/finances/generate-payouts` | Générer les payouts | `generatePayouts` | OK |
| `GET /admin/finances/delivery-cash-owed` | Espèces dues par livreurs | `getDeliveryCashOwed` | OK |
| `GET /admin/finances/cash-remittances` | Remises espèces | `getCashRemittances` | OK |
| `PUT /admin/finances/cash-remittances/:id/confirm` | Confirmer remise | `confirmCashRemittance` | OK |
| `PUT /admin/finances/cash-remittances/:id/reject` | Rejeter remise | `rejectCashRemittance` | OK |
| `GET /admin/finances/commission-settings` | Paramètres de commission | `getCommissionSettings` | OK |
| `PUT /admin/finances/commission-settings` | Modifier commissions | `updateCommissionSettings` | OK |
| `GET /admin/finances/expenses` | Dépenses | `getExpenses` | OK |
| `GET /admin/refunds` | Remboursements | `getRefunds` | OK |
| `PUT /admin/refunds/:id/approve` | Approuver remboursement | `approveRefund` | OK |
| `PUT /admin/refunds/:id/reject` | Rejeter remboursement | `rejectRefund` | OK |

**Permission :** `view_finances`, `process_payouts` selon les actions.

---

### 1.6 Tickets support et réclamations

| Route | Méthode | Controller | Statut |
|-------|---------|------------|--------|
| `GET /admin/support/tickets` | Liste des tickets | `getSupportTickets` | OK |
| `POST /admin/support/tickets` | Créer un ticket (admin) | `createSupportTicket` | OK |
| `GET /admin/support/tickets/:id` | Détail d’un ticket | `getTicketById` | OK |
| `POST /admin/support/tickets/:id/reply` | Répondre à un ticket | `replyToTicket` | OK |
| `PUT /admin/support/tickets/:id/close` | Fermer un ticket | `closeTicket` | OK |

Réponses envoyées en temps réel aux partenaires via `partnersIo` (Socket.IO) quand une réponse est ajoutée.

---

### 1.7 Statistiques et analytics (DAU, MAU, taux de rétention)

| Route | Méthode | Controller | Contenu | Statut |
|-------|---------|------------|---------|--------|
| `GET /admin/analytics/overview` | GET | `getAnalytics` | Vue d’ensemble + **dau**, **mau**, **dau_series**, **retention**, LTV, conversion, revenus | OK (enrichi) |
| `GET /admin/analytics/revenue` | GET | `getRevenue` | Revenus par période | OK |
| `GET /admin/analytics/sales` | GET | `getSalesReport` | Rapport des ventes | OK |
| `GET /admin/analytics/users` | GET | `getUsersReport` | Rapport utilisateurs (inscriptions, top users) | OK |
| `GET /admin/analytics/restaurants` | GET | `getRestaurantsReport` | Rapport restaurants | OK |
| `GET /admin/analytics/deliveries` | GET | `getDeliveriesReport` | Rapport livreurs | OK |
| `GET /admin/analytics/ratings` | GET | `getGlobalRatings` | Notes globales | OK |

**Correction :** Dans **`getAnalytics`**, ajout explicite de :
- **dau** : utilisateurs distincts ayant passé commande aujourd’hui
- **mau** : utilisateurs distincts ayant passé commande sur les 30 derniers jours
- **dau_mau_ratio** : (dau / mau) × 100
- **dau_series** : série quotidienne des DAU sur les 14 derniers jours (pour graphiques)

Le **taux de rétention** était déjà présent dans `getAnalytics` (clients avec 2+ commandes / clients actifs).

---

### 1.8 Configuration de la plateforme (commissions, frais)

| Route | Méthode | Controller | Statut |
|-------|---------|------------|--------|
| `GET /admin/settings` | GET | `getAppSettings` | OK |
| `PUT /admin/settings` | PUT | `updateAppSettings` | OK |
| `GET /admin/finances/commission-settings` | GET | `getCommissionSettings` | OK |
| `PUT /admin/finances/commission-settings` | PUT | `updateCommissionSettings` | OK |

Les paramètres applicatifs (commissions, frais livraison, seuils, etc.) sont gérés via `app_settings` et/ou la config ; les endpoints ci‑dessus permettent de les lire et mettre à jour côté admin.

---

## 2. Corrections appliquées (résumé)

1. **Gestion utilisateurs – suppression**
   - **Route :** `DELETE /api/v1/admin/users/:id`
   - **Controller :** `deleteUser` (soft delete : `status = 'deleted'`, log dans `activity_logs`).
   - **Permission :** `manage_users`.

2. **Analytics – DAU / MAU**
   - **Endpoint :** `GET /api/v1/admin/analytics/overview?period=7d|30d|90d`
   - **Réponse enrichie :** champs `dau`, `mau`, `dau_mau_ratio`, `dau_series` (14 derniers jours).

3. **Cohérence des permissions**
   - Leaderboard livreurs : permission alignée sur `view_deliveries` (au lieu de `view_delivery_persons`).

---

## 3. Récapitulatif par fonctionnalité

| Fonctionnalité | Fait | Manquant / Note |
|----------------|------|------------------|
| Validation restaurants (approuver/rejeter) | Oui | - |
| Validation livreurs (approuver/rejeter) | Oui | - |
| Gestion utilisateurs (suspendre/supprimer) | Oui | Suppression ajoutée (DELETE user) |
| Suivi commandes temps réel | Oui | API + Socket.IO dashboard |
| Gestion financière (paiements, payouts, remises) | Oui | - |
| Tickets support et réclamations | Oui | - |
| Statistiques et analytics (DAU, MAU, rétention) | Oui | DAU/MAU/dau_series ajoutés dans overview |
| Configuration plateforme (commissions, frais) | Oui | settings + commission-settings |

Toutes les fonctionnalités demandées sont couvertes côté backend ; les ajouts réalisés concernent la suppression d’utilisateur par l’admin et les indicateurs DAU/MAU dans l’analytics.

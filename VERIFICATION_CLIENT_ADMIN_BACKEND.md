# Vérification des liens Client / Admin / Backend

## Résumé

| Zone | Écrans/Pages reliés au backend | Écrans/Pages partiellement ou non reliés |
|------|--------------------------------|------------------------------------------|
| **Client** | Auth, Profil, Adresses, Favoris, Restaurants, Commandes, Checkout, Support (tickets, chat), Recherche, Loyalty (dashboard), Notifications, Parrainage (programme), Signaler problème, Suppression compte | ~~ReferralHistory~~ (corrigé), ~~PointsHistory~~ (corrigé) |
| **Admin** | Dashboard, Orders, OrderDetails, Users, UserDetails, Restaurants, ValidateRestaurant, Support, TicketDetails, Finances, Refunds, Drivers, SuspendedRestaurants, ProblematicOrders, Analytics, PendingDriverPayments, PendingRestaurantPayments, AccountSettings, Login, etc. | ~~ValidateDriver~~ (corrigé) |

---

## 1. Client → Backend

### Auth
- **PhoneEntry / OTPVerification** : `sendOTP`, `verifyOTP` → `/auth/send-otp`, `/auth/verify-otp`. OK.

### Utilisateur
- **ProfileScreen, EditProfileScreen, ProfileCreationScreen** : `getMyProfile`, `updateMyProfile`, `uploadProfilePicture` → `/users/me`, etc. OK.
- **ManageAddressesScreen, AddAddressScreen, AddressSelectionScreen** : `getAddresses`, `addAddress`, `updateAddress`, `deleteAddress` → `/users/me/addresses`. OK.
- **NotificationPreferencesScreen** : `getNotificationPreferences`, `updateNotificationPreferences` → `/users/me/notification-preferences`. OK.
- **FavoritesScreen, RestaurantDetailScreen** : `getFavorites`, `addFavorite`, `removeFavorite` → `/users/me/favorites`. OK.
- **LoyaltyDashboardScreen** : `getLoyaltyPoints` → `/users/me/loyalty`. OK.
- **ReferralProgramScreen** : copie du code (clipboard). Pas d'API spécifique.
- **ReferralHistoryScreen** : ~~mock~~ → `getReferrals` → `/users/me/referrals`. Corrigé.
- **PointsHistoryScreen** : ~~mock~~ → `getLoyaltyPoints` pour points actuels ; historique des transactions non disponible côté backend. Corrigé (points réels + mock historique).

### Restaurants & Recherche
- **HomeScreen, CategoryResultsScreen** : `getRestaurants` → `/restaurants`. OK.
- **RestaurantDetailScreen** : `getRestaurantDetail`, `getRestaurantMenu` → `/restaurants/:id`, `/restaurants/:id/menu`. OK.
- **SearchScreen** : `searchCatalog` → `/search`. OK.

### Commandes
- **CheckoutScreen** : `getAddresses`, `createOrder`, `initiatePayment`, `validatePromoCode` → `/users/me/addresses`, `/orders`, `/orders/:id/payment/initiate`, `/users/me/promotions/validate`. OK.
- **OrderHistoryScreen** : `getOrderHistory` → `/users/me/orders`. OK.
- **OrderDetailsScreen, OrderReceiptScreen** : `getOrderDetail` → `/orders/:id`. OK.
- **OrderReviewScreen** : `reviewOrder` → `/orders/:id/review`. OK.
- **OrderTrackingScreen, TrackingDriverAssignedScreen, TrackingOutForDeliveryScreen, DeliveryArrivalScreen** : `trackOrder` → `/orders/:id/track`. OK.
- **ReportProblemScreen** : `reportOrderIssue` → `/orders/:id/report`. OK.

### Support
- **LiveChatSupportScreen** : `createSupportTicket`, `getSupportTicketById`, `addTicketMessage` → `/users/me/support/tickets`, etc. OK (polling + refresh).
- **MyClaimsTrackingScreen** : `getSupportTickets` → `/users/me/support/tickets`. OK.
- **ClaimTicketDetailsScreen** : `getSupportTicketById` → `/users/me/support/tickets/:id`. OK.
- **DeleteAccountConfirmationScreen** : `deleteUserAccount` → `DELETE /users/me`. OK.

### Sans API (statique / local)
- **ContactSupportScreen** : navigation vers LiveChat. OK.
- **HelpCenterScreen, AboutBaibebalo, PrivacyPolicy, etc.** : contenu statique. OK.

---

## 2. Admin → Backend

### Auth & Compte
- **Login** : `authAPI.login` → `/auth/admin/login`. OK.
- **AccountSettings** : `authAPI` (profile, sessions, logout, etc.) → `/admin/account/*`. OK.
- **ForgotPassword, ResetPassword** : `authAPI` → oubli / changement mot de passe. OK.

### Dashboard & Alertes
- **Dashboard** : `dashboardAPI.getDashboard`, `getRecentOrders`, `getRevenueData`, `getRealTimeOrders`, `getGeographicData` → `/admin/dashboard`, etc. OK.
- **SystemAlertsPanel, DismissedAlertsHistory** : alertes, dismiss, restore → `/admin/dashboard/alerts/*`. OK.

### Commandes
- **Orders** : `ordersAPI.getOrders` → `/admin/orders`. OK.
- **OrderDetails** : `ordersAPI.getOrderDetails`, `cancelOrder`, `reassignDeliveryPerson` ; `driversAPI.getDrivers` pour réassignation. OK.
- **ProblematicOrders** : `ordersAPI.getProblematicOrders`, `cancelOrder`, `reassignDeliveryPerson`. OK.

### Utilisateurs
- **Users** : `usersAPI.getUsers`, `bulkActionUsers` → `/admin/users`. OK.
- **UserDetails** : `usersAPI.getUserDetails` → `/admin/users/:id`. OK.

### Restaurants
- **Restaurants** : `restaurantsAPI.getRestaurants` → `/admin/restaurants`. OK.
- **ValidateRestaurant** : `restaurantsAPI.getRestaurantDetails`, `validateRestaurant`, `rejectRestaurant` → `/admin/restaurants/:id`, approve, reject. OK.
- **SuspendedRestaurants** : `restaurantsAPI.getSuspendedRestaurants`, `reactivateRestaurant`. OK.

### Livreurs
- **Drivers** : `driversAPI.getDrivers`, `createDriver`, `updateDriver`, `deleteDriver` → `/admin/delivery-persons`. OK.
- **ValidateDriver** : ~~mock~~ → `driversAPI.getDrivers({ status: 'pending' })`, `approveDriver`, `rejectDriver`. Corrigé.

### Support
- **Support** : `supportAPI.getTickets`, `createTicket` → `/admin/support/tickets`. OK.
- **TicketDetails** : `supportAPI.getTicketDetails`, `replyToTicket`, `closeTicket` → `/admin/support/tickets/:id`, reply, close. OK.

### Finances
- **Finances, FinancialDashboard** : `financesAPI.getFinancialOverview`, `getExpenses`, `getPendingDeliveryPayments`, `getPendingRestaurantPayments`. OK.
- **PendingDriverPayments, PendingRestaurantPayments** : `financesAPI` + `apiClient.put(.../payouts/:id/process)` pour traitement. OK.
- **Refunds** : `refundsAPI.getRefunds`, `approveRefund`, `rejectRefund`. OK.

### Analytics
- **Analytics, AnalyticsOverview, RestaurantPerformance, DeliveryPerformance, FunnelConversion, TemporalAnalysis, GeographicHeatmap** : `dashboardAPI`, `analyticsAPI` → `/admin/analytics/*`, `/admin/dashboard/*`. OK.

### Pages sans API ou partiellement
- **PlatformSettings, CommissionSettings, DeliveryZones, PromoCodes, NotificationTemplates, PromotionalBanners, BadgesRewards, KnowledgeBase, etc.** : paramètres ou contenu statique / à brancher ultérieurement. Non bloquant pour le flux principal.

---

## 3. Backend – Routes utilisées

- **Auth** : `/api/v1/auth/*` (send-otp, verify-otp, admin/login, refresh-token).
- **Users** : `/api/v1/users/me`, `/users/me/addresses`, `/users/me/orders`, `/users/me/favorites`, `/users/me/loyalty`, `/users/me/referrals`, `/users/me/support/tickets`, `/users/me/notification-preferences`, etc.
- **Restaurants** : `/api/v1/restaurants`, `/restaurants/:id`, `/restaurants/:id/menu`, etc.
- **Search** : `/api/v1/search`.
- **Orders** : `/api/v1/orders` (create, detail, track, cancel, review, report, payment).
- **Notifications** : `/api/v1/notifications/*`.
- **Admin** : `/api/v1/admin/dashboard`, `/admin/orders`, `/admin/users`, `/admin/restaurants`, `/admin/delivery-persons`, `/admin/support/tickets`, `/admin/finances/*`, `/admin/analytics/*`, etc.

---

## 4. Correctifs appliqués

1. **ReferralHistoryScreen** : remplacement du mock par `getReferrals` ; mapping `referrals` → liste + total gains (approx. 500 FCFA par parrainage complété).
2. **PointsHistoryScreen** : appel à `getLoyaltyPoints` pour afficher les points actuels ; l'historique des transactions reste en mock (pas d'endpoint dédié).
3. **ValidateDriver** : chargement des livreurs `status: 'pending'` via `driversAPI`, affichage du premier (ou liste), actions approuver / rejeter via `approveDriver` et `rejectDriver`.

---

## 5. Points restants (optionnels)

- **Support (admin)** : utiliser `user_id` et `order_id` en query params depuis OrderDetails (`/support?user_id=...&order_id=...`) pour pré-remplir la création de ticket.
- **Historique des points (client)** : backend ne fournit pas d'historique de transactions de points ; uniquement le solde actuel. Une évolution backend serait nécessaire pour un historique réel.

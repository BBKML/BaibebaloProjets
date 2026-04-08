# Rapport – App mobile client (React Native / Expo)

**Projet :** baibebalo-client-clean  
**Backend :** baibebalo-backend (API v1)  
**Admin :** baibebalo-admin

---

## 1. Synthèse par écran / fonctionnalité

| Fonctionnalité | État | Écrans / API | Alignement backend |
|----------------|------|--------------|--------------------|
| Inscription et connexion par OTP SMS | ✅ Fait | PhoneEntryScreen, OTPVerificationScreen, auth.js, authStore | `/auth/send-otp`, `/auth/verify-otp` |
| Page d'accueil avec restaurants proches | ✅ Fait | HomeScreen, getRestaurants | `/restaurants` avec lat/lng, radius, sort (corrigé) |
| Recherche avec filtres | ✅ Fait | SearchScreen, SearchFiltersModal, searchCatalog | `/search` + params (min_rating, sort, etc.) |
| Page détaillée restaurant + menu | ✅ Fait | RestaurantDetailScreen, getRestaurantDetail, getRestaurantMenu | `/restaurants/:id`, `/restaurants/:id/menu` |
| Panier avec personnalisation des plats | ✅ Fait | ShoppingCartScreen, CustomizeDishScreen, cartStore | Options envoyées dans la commande |
| Validation commande (adresse + paiement) | ✅ Fait | CheckoutScreen, AddressSelectionScreen, PaymentMethodScreen | `/orders/calculate-fees`, `POST /orders` |
| Suivi commande en temps réel avec carte GPS | ✅ Fait | OrderTrackingScreen, socketService | Socket namespace `/client`, `order_status_changed`, `delivery_location_updated` + carte (corrigé) |
| Historique des commandes | ✅ Fait | OrderHistoryScreen, getOrderHistory | `GET /users/me/orders` |
| Programme fidélité et parrainage | ✅ Fait | ReferralProgramScreen, PointsHistoryScreen, LoyaltyDashboardScreen | `/users/me/loyalty`, `/users/me/referrals` |
| Support et réclamations | ✅ Fait | HelpCenterScreen, ContactSupportScreen, LiveChatSupportScreen, ReportProblemScreen, MyClaimsTrackingScreen, ClaimTicketDetailsScreen | `/users/me/support/tickets`, messages, close |

---

## 2. Détail par fonctionnalité

### 2.1 Inscription et connexion par OTP SMS

- **Écrans :** `PhoneEntryScreen` (saisie téléphone), `OTPVerificationScreen` (saisie code 6 chiffres, compte à rebours, renvoi code).
- **API :** `sendOTP(phone)`, `verifyOTP(phone, code, firstName, lastName)` → `POST /auth/send-otp`, `POST /auth/verify-otp`.
- **Store :** `authStore` (tokens, user, isLoading).
- **Backend :** Envoi SMS OTP (Twilio/Orange/Nexah), vérification, création ou connexion user, retour tokens + user.

### 2.2 Page d'accueil avec restaurants proches

- **Écran :** `HomeScreen` – liste restaurants, promotions, catégories, barre de recherche.
- **API :** `getRestaurants`, `getActivePromotions`, `getCategories` → `GET /restaurants`, `GET /restaurants/promotions/active`, `GET /restaurants/categories`.
- **Correction :** Utilisation d’**expo-location** pour récupérer la position ; envoi de `latitude`, `longitude`, `radius: 15`, `sort: 'distance'` à `getRestaurants` pour afficher les restaurants proches en premier (si permission accordée).

### 2.3 Recherche avec filtres

- **Écrans :** `SearchScreen`, `SearchFiltersModal` (tri, note min, temps livraison, prix, type de cuisine, livraison gratuite, etc.).
- **API :** `searchCatalog(params)` → `GET /search` avec `q`, `min_rating`, `max_delivery_time`, `sort`, `cuisine_type`, `min_price`, `max_price`, etc.
- **Backend :** Route `/search` (search.routes) avec filtres côté API.

### 2.4 Page détaillée restaurant avec menu

- **Écran :** `RestaurantDetailScreen` – infos restaurant, menu par catégories, favori, avis.
- **API :** `getRestaurantDetail(id)`, `getRestaurantMenu(id)`, `getRestaurantReviews(id)`.
- **Backend :** `GET /restaurants/:id`, `GET /restaurants/:id/menu`, `GET /restaurants/:id/reviews` (authenticateOptional).

### 2.5 Panier avec personnalisation des plats

- **Écrans :** `ShoppingCartScreen`, `CustomizeDishScreen` (options, quantité, notes).
- **Store :** `cartStore` (Zustand) – items, restaurantId, addItem, updateQuantity, removeItem, getTotal.
- **API :** `getSuggestedItems(restaurantId, cartItemIds)` pour suggestions (backend `/restaurants/:id/suggestions`).
- **Backend :** Création commande avec `items` (menu_item_id, quantity, options, special_instructions).

### 2.6 Validation commande avec adresse et paiement

- **Écrans :** `AddressSelectionScreen` → `CheckoutScreen` (ou `PaymentMethodScreen` selon flux), puis création commande.
- **API :** `getAddresses`, `calculateFees(restaurantId, deliveryAddressId, subtotal)`, `createOrder(orderData)`, `validatePromoCode`.
- **Backend :** `POST /orders/calculate-fees`, `POST /orders` (delivery_address_id, payment_method, items, etc.).

### 2.7 Suivi commande en temps réel avec carte GPS

- **Écran :** `OrderTrackingScreen` – timeline statuts, infos restaurant/livreur, adresse, résumé, **carte**.
- **Socket :** `socketService` – namespace `/client`, auth par token, `join_order`, événements `order_status_changed`, `delivery_assigned`, `order_picked_up`, `delivery_location_updated`, `delivery_arrived_at_customer`.
- **Correction :** Ajout d’une **carte (react-native-maps)** affichant :
  - l’adresse de livraison (si lat/lng présents),
  - la **position du livreur en temps réel** (via `delivery_location_updated`),
  - le restaurant (si pas encore de position livreur).
- **Backend :** Émission des événements depuis les controllers (order, delivery) via `emitToOrder` et mise à jour position livreur par le namespace `/partners` (`location_update`).

### 2.8 Historique des commandes

- **Écran :** `OrderHistoryScreen` – liste par sections (Aujourd’hui, Cette semaine, etc.), statuts, navigation vers détail / suivi.
- **API :** `getOrderHistory()` → `GET /users/me/orders`.
- **Backend :** Route sous `user.routes` (authenticate + authorize user).

### 2.9 Programme de fidélité et parrainage

- **Écrans :** `LoyaltyDashboardScreen`, `ReferralProgramScreen`, `PointsHistoryScreen`, `ReferralHistoryScreen`.
- **API :** `getLoyalty()`, `getReferrals()` → `GET /users/me/loyalty`, `GET /users/me/referrals`.
- **Backend :** Colonnes `loyalty_points`, `referral_code`, `referred_by` ; tables `loyalty_transactions`, `referrals`.

### 2.10 Support et réclamations

- **Écrans :** `HelpCenterScreen`, `ContactSupportScreen`, `LiveChatSupportScreen`, `ReportProblemScreen`, `MyClaimsTrackingScreen`, `ClaimTicketDetailsScreen`, `SupportFeedbackSuccessScreen`.
- **API :** `getSupportTickets`, `createSupportTicket`, `getSupportTicketById`, `addTicketMessage`, `closeSupportTicket` (api/support.js) ; `reportOrderIssue` pour signaler un problème sur une commande.
- **Backend :** `GET/POST /users/me/support/tickets`, `GET /users/me/support/tickets/:id`, `POST .../messages`, `PUT .../close` ; admin reçoit les réponses en temps réel via `partnersIo`.
- **Correction :** Dans `ReportProblemScreen`, suppression de la valeur en dur `'84920'` pour `selectedOrder` lorsque `orderId` est absent (utilisation de `null`).

---

## 3. Corrections appliquées (résumé)

1. **Carte GPS sur le suivi de commande**  
   - Dans `OrderTrackingScreen` : ajout de `MapView` (react-native-maps) avec marqueurs pour adresse de livraison, position du livreur (temps réel) et restaurant. Affichage conditionnel dès qu’une position (livreur, adresse ou restaurant) est disponible.

2. **Restaurants proches sur l’accueil**  
   - Dans `HomeScreen` : utilisation d’**expo-location** ; si la permission est accordée, passage de `latitude`, `longitude`, `radius: 15` et `sort: 'distance'` à `getRestaurants` pour trier par distance (aligné avec le backend).

3. **Support / réclamation**  
   - Dans `ReportProblemScreen` : `selectedOrder` initialisé à `orderId || null` au lieu de `orderId || '84920'`.

---

## 4. Alignement backend / admin

- **Auth :** OTP envoyé et vérifié côté backend ; pas de changement nécessaire.
- **Restaurants :** `GET /restaurants` avec `authenticateOptional` ; paramètres `latitude`, `longitude`, `radius`, `sort` gérés par le controller.
- **Recherche :** `GET /search` avec paramètres utilisés par le client (q, min_rating, sort, etc.).
- **Commandes :** Création, calcul des frais, suivi, annulation, avis, report – routes et controllers cohérents.
- **Socket :** Namespace `/client` avec auth JWT, rooms `order_<id>`, événements émis par le backend (order, delivery).
- **Utilisateur :** Adresses, favoris, loyalty, referrals, support tickets – routes sous `/users/me/*`.
- **Admin :** Gestion des tickets support (réponses, clôture) et des réclamations ; pas de modification requise côté app client pour ces flux.

---

## 5. Récapitulatif

| Élément | Statut |
|--------|--------|
| Inscription / connexion OTP | ✅ |
| Accueil + restaurants proches | ✅ (corrigé : lat/lng + sort distance) |
| Recherche + filtres | ✅ |
| Détail restaurant + menu | ✅ |
| Panier + personnalisation | ✅ |
| Checkout (adresse + paiement) | ✅ |
| Suivi temps réel + carte GPS | ✅ (corrigé : carte avec position livreur) |
| Historique commandes | ✅ |
| Fidélité + parrainage | ✅ |
| Support et réclamations | ✅ (corrigé : selectedOrder sans valeur en dur) |

Toutes les fonctionnalités listées sont présentes et alignées avec le backend et l’admin ; les corrections portent sur la carte de suivi, les restaurants proches et un détail du support.

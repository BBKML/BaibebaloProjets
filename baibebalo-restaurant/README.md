# 🍽️ BAIBEBALO RESTAURANT - Application Mobile

Application mobile React Native pour les restaurants partenaires BAIBEBALO.

## 📋 Structure du Projet

```
baibebalo-restaurant/
├── src/
│   ├── api/              # Services API
│   │   ├── auth.js
│   │   ├── orders.js
│   │   ├── menu.js
│   │   ├── finance.js
│   │   ├── reviews.js
│   │   └── promotions.js
│   ├── constants/        # Constantes
│   │   ├── colors.js
│   │   └── api.js
│   ├── navigation/       # Navigation
│   │   └── AppNavigator.js
│   ├── screens/          # Écrans
│   │   ├── auth/         # Authentification
│   │   ├── onboarding/   # Inscription
│   │   ├── dashboard/    # Dashboard
│   │   ├── orders/       # Commandes
│   │   ├── menu/         # Menu
│   │   ├── statistics/   # Statistiques
│   │   ├── finance/      # Finances
│   │   ├── reviews/       # Avis
│   │   ├── promotions/   # Promotions
│   │   └── settings/     # Paramètres
│   └── store/            # State management (Zustand)
│       ├── authStore.js
│       └── restaurantStore.js
├── App.js
├── index.js
└── package.json
```

## ✅ Écrans Implémentés

### Authentification (1/1) ✅
- ✅ `RestaurantLoginScreen` - Connexion

### Onboarding (10/10) ✅ COMPLET
- ✅ `RegisterStep1Screen` - Informations de base
- ✅ `RegisterStep2Screen` - Localisation (avec carte)
- ✅ `RegisterStep3Screen` - Horaires
- ✅ `RegisterStep4Screen` - Documents
- ✅ `RegisterStep5Screen` - Informations financières
- ✅ `RegisterStep6Screen` - Photos/Médias
- ✅ `PendingValidationScreen` - Validation en attente
- ✅ `PartnerTrainingScreen` - Module de formation
- ✅ `QualificationQuizScreen` - Quiz de validation
- ✅ `AccountActivationScreen` - Activation du compte

### Dashboard (1/3)
- ✅ `DashboardScreen` - Vue d'ensemble
- ⏳ `DetailedStatisticsScreen` - Statistiques détaillées
- ⏳ `PerformanceGraphsScreen` - Graphiques de performance

### Commandes (6/6) ✅ COMPLET
- ✅ `OrdersScreen` - Liste des commandes
- ✅ `UrgentOrdersViewScreen` - Commandes en attente (vue urgente)
- ✅ `OrderDetailsScreen` - Détails d'une commande
- ✅ `RefuseOrderModal` - Modal refuser commande
- ✅ `PreparationTrackerScreen` - Suivi préparation
- ✅ `OrderHistoryScreen` - Historique

### Menu (7/7) ✅ COMPLET
- ✅ `MenuScreen` - Vue liste du menu
- ✅ `AddCategoryModal` - Ajouter une catégorie
- ✅ `AddMenuItemScreen` - Ajouter un article (upload photos intégré)
- ✅ `EditMenuItemScreen` - Modifier un article (upload photos intégré)
- ✅ `ItemVariationsOptionsScreen` - Gestion options et variations
- ✅ `DishPromotionsScreen` - Promotions sur articles
- ✅ `BulkMenuEditScreen` - Gestion en masse

### Statistiques (3/3) ✅ COMPLET
- ✅ `StatisticsScreen` - Vue principale
- ✅ `DetailedStatisticsScreen` - Statistiques détaillées
- ✅ `PerformanceGraphsScreen` - Graphiques

### Finances (4/4) ✅ COMPLET
- ✅ `FinancialDashboardScreen` - Dashboard financier
- ✅ `TransactionHistoryScreen` - Historique transactions
- ✅ `WithdrawalRequestScreen` - Demande de retrait
- ✅ `InvoicesReceiptsScreen` - Factures et reçus

### Avis (2/2) ✅ COMPLET
- ✅ `CustomerReviewsDashboardScreen` - Dashboard des avis
- ✅ `ReviewResponseModal` - Répondre à un avis

### Promotions (2/2) ✅ COMPLET
- ✅ `CreateAdvancedPromotionScreen` - Créer une promotion
- ✅ `MarketingOverviewScreen` - Liste des promotions

### Paramètres (4/4) ✅ COMPLET
- ✅ `SettingsScreen` - Paramètres principaux
- ✅ `SupportHelpCenterScreen` - Support technique (intégré dans SettingsScreen)
- ✅ `EditRestaurantProfileScreen` - Modifier profil
- ✅ `NotificationPreferencesScreen` - Préférences notifications

## 🚀 Installation

```bash
cd baibebalo-restaurant
npm install
```

## 📱 Démarrage

```bash
# Démarrer Expo
npm start

# Android
npm run android

# iOS
npm run ios
```

## 🧪 Tests - Intégration Backend

### Test rapide de connexion

```bash
# 1. Démarrer le backend
cd ../baibebalo-backend
npm start

# 2. Dans un autre terminal, tester la connexion
cd baibebalo-restaurant
npm run test:api
```

### Configuration requise

**⚠️ IMPORTANT :** Modifier l'IP dans `src/constants/api.js` :

```javascript
const API_BASE_URL = __DEV__ 
  ? 'http://VOTRE_IP_LOCALE:5000/api/v1' // ⚠️ Remplacez VOTRE_IP_LOCALE
  : 'https://api.baibebalo.com/api/v1';
```

**Trouver votre IP :**
- Windows : `ipconfig` → "Adresse IPv4"
- Mac/Linux : `ifconfig` ou `ip addr`

### Guides de test

- **📖 Guide complet :** `GUIDE_TEST_INTEGRATION.md`
- **⚡ Test rapide :** `TEST_RAPIDE.md`

### Checklist de test

- [ ] Backend démarré et accessible
- [ ] IP configurée dans `api.js`
- [ ] Test de connexion réussi (`npm run test:api`)
- [ ] Connexion dans l'app fonctionne
- [ ] Dashboard charge les données
- [ ] Commandes fonctionnent (liste, accepter, refuser)
- [ ] Menu fonctionne (créer, modifier, supprimer)
- [ ] Pas d'erreurs dans la console

---

## 📝 Notes

- ✅ Tous les écrans sont implémentés
- ✅ Intégration backend complète
- ⚠️ L'IP du backend doit être mise à jour dans `src/constants/api.js` pour le développement local

## 🔄 Prochaines Étapes

1. ✅ Tester l'intégration backend (voir section Tests ci-dessus)
2. ✅ Vérifier tous les écrans avec de vraies données
3. ✅ Corriger les incohérences de format de données si nécessaire
4. ✅ Optimiser les performances
5. ✅ Implémenter le refresh token automatique

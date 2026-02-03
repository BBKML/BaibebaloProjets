# 🚴 MAQUETTE APPLICATION LIVREUR BAIBEBALO

## Document pour Stitch - Création des écrans

Ce document liste tous les écrans nécessaires pour l'application mobile livreur BAIBEBALO.

---

## 📱 LISTE COMPLÈTE DES ÉCRANS (53 écrans)

### 🔐 SECTION 1: INSCRIPTION ET VALIDATION (15 écrans)

| # | Nom de l'écran | Description |
|---|----------------|-------------|
| 1 | `SplashScreen` | Écran de démarrage avec logo BAIBEBALO animé |
| 2 | `WelcomeDeliveryScreen` | Écran d'accueil "Devenir livreur BAIBEBALO" |
| 3 | `PhoneInputScreen` | Saisie du numéro de téléphone |
| 4 | `OTPVerificationScreen` | Vérification du code OTP |
| 5 | `PersonalInfoStep1Screen` | Infos personnelles (nom, prénom, date naissance) |
| 6 | `PersonalInfoStep2Screen` | Photo profil et adresse résidence |
| 7 | `VehicleTypeSelectionScreen` | Sélection: Moto / Vélo / À pied |
| 8 | `DocumentUploadMotoScreen` | Upload documents moto (CNI, permis, carte grise, assurance, photo moto) |
| 9 | `DocumentUploadVeloPietonScreen` | Upload documents vélo/piéton (CNI, certificat résidence, photo) |
| 10 | `MobileMoneySetupScreen` | Configuration Mobile Money (Orange/MTN/Moov) |
| 11 | `AvailabilityScheduleScreen` | Sélection des créneaux de disponibilité |
| 12 | `PendingValidationScreen` | Écran "En attente de validation" (24-48h) |
| 13 | `TrainingModulesScreen` | Liste des modules de formation |
| 14 | `TrainingModuleDetailScreen` | Contenu d'un module (vidéo/texte) |
| 15 | `CertificationQuizScreen` | Quiz de certification (20 questions) |
| 16 | `QuizResultScreen` | Résultat du quiz (réussite/échec) |
| 17 | `ContractSigningScreen` | Signature électronique du contrat |
| 18 | `StarterKitScreen` | Choix du kit de démarrage (sac, gilet, support) |
| 19 | `ActivationPendingScreen` | En attente de première livraison test |
| 20 | `WelcomeActivatedScreen` | "Bienvenue dans l'équipe!" - Compte activé |

---

### 🏠 SECTION 2: INTERFACE PRINCIPALE (8 écrans)

| # | Nom de l'écran | Description |
|---|----------------|-------------|
| 21 | `DeliveryHomeScreen` | Écran d'accueil livreur avec toggle statut |
| 22 | `StatusToggleScreen` | Changement de statut (Disponible/Hors ligne/En pause) |
| 23 | `DailyStatsScreen` | Statistiques détaillées du jour |
| 24 | `HeatMapScreen` | Carte des zones de forte demande |
| 25 | `RecentDeliveriesScreen` | Historique récent des courses |
| 26 | `ObjectivesProgressScreen` | Progression des objectifs (gamification) |
| 27 | `QuickActionsScreen` | Actions rapides (statut, gains, aide) |
| 28 | `NotificationCenterScreen` | Centre de notifications |

---

### 📦 SECTION 3: RÉCEPTION ET GESTION DES COURSES (6 écrans)

| # | Nom de l'écran | Description |
|---|----------------|-------------|
| 29 | `NewDeliveryAlertScreen` | Pop-up plein écran nouvelle course (Accepter/Refuser) |
| 30 | `DeliveryDetailsScreen` | Détails complets de la course acceptée |
| 31 | `RefusalConfirmationScreen` | Confirmation de refus avec raison |
| 32 | `PauseForcedScreen` | Écran de pause forcée (3 refus consécutifs) |
| 33 | `ActiveDeliveriesListScreen` | Liste des courses en cours |
| 34 | `DeliveryPriorityScreen` | Gestion priorité si plusieurs courses |

---

### 🗺️ SECTION 4: NAVIGATION ET RÉCUPÉRATION (8 écrans)

| # | Nom de l'écran | Description |
|---|----------------|-------------|
| 35 | `NavigationToRestaurantScreen` | Navigation GPS vers le restaurant |
| 36 | `RestaurantArrivalScreen` | Écran "Vous êtes arrivé" au restaurant |
| 37 | `OrderVerificationScreen` | Checklist de vérification commande |
| 38 | `OrderPhotoScreen` | Prise de photo de la commande |
| 39 | `OrderPickedUpScreen` | Confirmation récupération commande |
| 40 | `RestaurantContactScreen` | Appeler/Contacter le restaurant |
| 41 | `ReportProblemPickupScreen` | Signaler problème à la récupération |
| 42 | `WaitingAtRestaurantScreen` | Écran d'attente si commande pas prête |

---

### 🏠 SECTION 5: LIVRAISON CHEZ LE CLIENT (8 écrans)

| # | Nom de l'écran | Description |
|---|----------------|-------------|
| 43 | `NavigationToClientScreen` | Navigation GPS vers le client |
| 44 | `ClientInfoScreen` | Infos client et instructions spéciales |
| 45 | `ClientArrivalScreen` | Écran "Vous êtes arrivé" chez le client |
| 46 | `CashPaymentScreen` | Collecte paiement en espèces |
| 47 | `OnlinePaymentConfirmScreen` | Confirmation paiement déjà effectué |
| 48 | `DeliveryProofPhotoScreen` | Photo preuve de livraison |
| 49 | `ConfirmationCodeScreen` | Saisie code 4 chiffres du client |
| 50 | `DeliverySuccessScreen` | Animation succès + gains affichés |
| 51 | `ClientContactScreen` | Appeler/Message au client |
| 52 | `DeliveryInstructionsScreen` | Instructions détaillées du client |

---

### ⚠️ SECTION 6: GESTION DES PROBLÈMES (10 écrans)

| # | Nom de l'écran | Description |
|---|----------------|-------------|
| 53 | `ClientAbsentScreen` | Procédure client absent |
| 54 | `CallAttemptTrackerScreen` | Suivi des 3 tentatives d'appel |
| 55 | `WaitingTimerScreen` | Timer 10 minutes sur place |
| 56 | `LeaveWithNeighborScreen` | Option laisser à un voisin |
| 57 | `IncorrectAddressScreen` | Gestion adresse incorrecte |
| 58 | `EmergencyButtonScreen` | Bouton urgence "J'ai un problème" |
| 59 | `EmergencyTypeSelectionScreen` | Type de problème (accident, panne, sécurité...) |
| 60 | `DamagedOrderScreen` | Signalement commande endommagée |
| 61 | `SupportChatScreen` | Chat avec support |
| 62 | `IncidentReportScreen` | Rapport d'incident complet |

---

### 💰 SECTION 7: GAINS ET PAIEMENTS (8 écrans)

| # | Nom de l'écran | Description |
|---|----------------|-------------|
| 63 | `EarningsDashboardScreen` | Dashboard solde et gains |
| 64 | `DailyEarningsDetailScreen` | Détail gains du jour |
| 65 | `WeeklyEarningsScreen` | Statistiques hebdomadaires |
| 66 | `MonthlyEarningsScreen` | Statistiques mensuelles |
| 67 | `DeliveryEarningDetailScreen` | Détail d'une course (distance, durée, gains) |
| 68 | `WithdrawRequestScreen` | Demande de retrait |
| 69 | `WithdrawConfirmationScreen` | Confirmation retrait vers Mobile Money |
| 70 | `PaymentHistoryScreen` | Historique des paiements reçus |
| 71 | `EarningsProjectionScreen` | Projections de revenus |
| 72 | `BonusPenaltyDetailScreen` | Détail bonus et pénalités |

---

### 📊 SECTION 8: STATISTIQUES ET PERFORMANCE (8 écrans)

| # | Nom de l'écran | Description |
|---|----------------|-------------|
| 73 | `PerformanceDashboardScreen` | Tableau de bord performances |
| 74 | `WeeklyPerformanceScreen` | Graphiques hebdomadaires |
| 75 | `RankingScreen` | Classement anonymisé des livreurs |
| 76 | `BadgesRewardsScreen` | Badges et récompenses obtenus |
| 77 | `CustomerRatingsScreen` | Notes et commentaires clients |
| 78 | `CoverageMapScreen` | Carte thermique zones livrées |
| 79 | `PersonalGoalsScreen` | Objectifs personnels définis |
| 80 | `PerformanceHistoryScreen` | Historique des performances |

---

### ⚙️ SECTION 9: PARAMÈTRES ET COMPTE (12 écrans)

| # | Nom de l'écran | Description |
|---|----------------|-------------|
| 81 | `SettingsScreen` | Écran paramètres principal |
| 82 | `EditProfileScreen` | Modifier profil (photo, téléphone) |
| 83 | `UpdateDocumentsScreen` | Mettre à jour documents expirés |
| 84 | `ChangeVehicleScreen` | Changer de véhicule |
| 85 | `AvailabilitySettingsScreen` | Modifier disponibilités |
| 86 | `VacationModeScreen` | Mode vacances (désactivation temporaire) |
| 87 | `WorkZonesScreen` | Sélection zones de travail préférées |
| 88 | `DeliveryPreferencesScreen` | Préférences de course |
| 89 | `NotificationSettingsScreen` | Paramètres notifications |
| 90 | `BatterySaverModeScreen` | Mode économie batterie |
| 91 | `SecuritySettingsScreen` | PIN, 2FA, déconnexion à distance |
| 92 | `LegalInfoScreen` | Contrat, confidentialité, FAQ |
| 93 | `HelpCenterScreen` | Centre d'aide livreurs |
| 94 | `AboutAppScreen` | À propos de l'application |

---

## 🎨 DÉTAILS PAR ÉCRAN

---

### 🔐 SECTION 1: INSCRIPTION ET VALIDATION

---

#### 1. `SplashScreen`
**Description:** Écran de démarrage de l'application

**Éléments UI:**
- Logo BAIBEBALO animé (scooter/vélo)
- Texte "Livreur" sous le logo
- Animation de chargement
- Couleur de fond: Vert BAIBEBALO (#22C55E)

**Actions:**
- Auto-redirection vers WelcomeDeliveryScreen ou DeliveryHomeScreen

---

#### 2. `WelcomeDeliveryScreen`
**Description:** Écran d'accueil pour les nouveaux livreurs

**Éléments UI:**
- Image d'un livreur souriant avec sac BAIBEBALO
- Titre: "Devenir Livreur BAIBEBALO"
- Sous-titre: "Gagnez de l'argent en livrant des repas"
- Avantages listés:
  - 💰 "Revenus flexibles"
  - ⏰ "Horaires libres"
  - 📍 "Travaillez près de chez vous"
  - 🎯 "Bonus et récompenses"
- Bouton principal: "COMMENCER L'INSCRIPTION"
- Lien: "Déjà inscrit? Se connecter"

**Navigation:**
- → PhoneInputScreen

---

#### 3. `PhoneInputScreen`
**Description:** Saisie du numéro de téléphone

**Éléments UI:**
- Titre: "Votre numéro de téléphone"
- Input téléphone avec préfixe +225
- Checkbox: "J'accepte les conditions générales"
- Lien vers conditions
- Bouton: "RECEVOIR LE CODE"

**Validations:**
- Format CI (10 chiffres)
- Checkbox obligatoire

**Navigation:**
- → OTPVerificationScreen

---

#### 4. `OTPVerificationScreen`
**Description:** Vérification du code OTP

**Éléments UI:**
- Titre: "Entrez le code reçu"
- Sous-titre: "Code envoyé au +225 XX XX XX XX XX"
- 6 cases pour le code OTP
- Timer: "Renvoyer dans 00:45"
- Bouton: "Renvoyer le code"
- Bouton: "VÉRIFIER"

**Navigation:**
- → PersonalInfoStep1Screen

---

#### 5. `PersonalInfoStep1Screen`
**Description:** Informations personnelles - Partie 1

**Éléments UI:**
- Indicateur de progression: 1/5
- Titre: "Vos informations personnelles"
- Input: Nom complet
- Input: Prénom
- Date picker: Date de naissance (18 ans minimum)
- Input: Email (optionnel)
- Bouton: "CONTINUER"

**Validations:**
- Nom et prénom obligatoires
- Âge minimum 18 ans

**Navigation:**
- → PersonalInfoStep2Screen

---

#### 6. `PersonalInfoStep2Screen`
**Description:** Informations personnelles - Partie 2

**Éléments UI:**
- Indicateur de progression: 1/5
- Zone photo profil avec icône caméra
- Bouton: "Prendre une photo" / "Choisir dans la galerie"
- Input: Adresse de résidence
- Input: Quartier
- Input: Ville
- Bouton: "CONTINUER"

**Navigation:**
- → VehicleTypeSelectionScreen

---

#### 7. `VehicleTypeSelectionScreen`
**Description:** Sélection du type de véhicule

**Éléments UI:**
- Indicateur de progression: 2/5
- Titre: "Quel est votre moyen de transport?"
- 3 cartes sélectionnables:
  
  **Carte 1 - MOTO (Badge "Prioritaire")**
  - Icône: 🏍️
  - "Moto"
  - "Livraisons rapides, plus de courses"
  - "Documents requis: CNI, Permis A, Carte grise, Assurance"
  
  **Carte 2 - VÉLO**
  - Icône: 🚴
  - "Vélo"
  - "Écologique, zones urbaines"
  - "Documents requis: CNI, Certificat résidence"
  
  **Carte 3 - À PIED**
  - Icône: 🚶
  - "À pied"
  - "Zones limitées, courtes distances"
  - "Documents requis: CNI, Certificat résidence"

- Bouton: "CONTINUER"

**Navigation:**
- Si Moto → DocumentUploadMotoScreen
- Si Vélo/Piéton → DocumentUploadVeloPietonScreen

---

#### 8. `DocumentUploadMotoScreen`
**Description:** Upload des documents pour livreurs moto

**Éléments UI:**
- Indicateur de progression: 3/5
- Titre: "Documents obligatoires"
- Sous-titre: "Livreur Moto"

**Liste des documents avec upload:**
```
┌─────────────────────────────────────┐
│ ✅ CNI Recto-Verso                  │
│    [📷 Recto] [📷 Verso]            │
│    Statut: ✅ Uploadé               │
├─────────────────────────────────────┤
│ ☐ Permis de conduire A              │
│    [📷 Recto] [📷 Verso]            │
│    Statut: En attente               │
├─────────────────────────────────────┤
│ ☐ Carte grise de la moto            │
│    [📷 Uploader]                    │
│    Statut: En attente               │
├─────────────────────────────────────┤
│ ☐ Attestation d'assurance           │
│    [📷 Uploader]                    │
│    Doit être valide                 │
├─────────────────────────────────────┤
│ ☐ Photo de la moto                  │
│    [📷 Uploader]                    │
│    Plaque visible                   │
└─────────────────────────────────────┘
```

- Bouton: "CONTINUER" (actif quand tout uploadé)

**Navigation:**
- → MobileMoneySetupScreen

---

#### 9. `DocumentUploadVeloPietonScreen`
**Description:** Upload des documents pour vélo/piéton

**Éléments UI:**
- Indicateur de progression: 3/5
- Titre: "Documents obligatoires"
- Sous-titre: "Livreur Vélo/Piéton"

**Liste des documents:**
```
┌─────────────────────────────────────┐
│ ☐ CNI Recto-Verso                   │
│    [📷 Recto] [📷 Verso]            │
├─────────────────────────────────────┤
│ ☐ Certificat de résidence           │
│    [📷 Uploader]                    │
├─────────────────────────────────────┤
│ ☐ Photo récente                     │
│    [📷 Uploader]                    │
│    Fond neutre, visage visible      │
└─────────────────────────────────────┘
```

- Bouton: "CONTINUER"

**Navigation:**
- → MobileMoneySetupScreen

---

#### 10. `MobileMoneySetupScreen`
**Description:** Configuration du compte Mobile Money

**Éléments UI:**
- Indicateur de progression: 4/5
- Titre: "Informations de paiement"
- Sous-titre: "Où souhaitez-vous recevoir vos gains?"

**Sélection opérateur:**
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Orange    │ │    MTN      │ │    Moov     │
│    Money    │ │   Money     │ │   Money     │
│     🟠      │ │     🟡      │ │     🔵      │
└─────────────┘ └─────────────┘ └─────────────┘
```

- Input: Numéro de compte Mobile Money
- Input: Nom du titulaire (doit correspondre à l'identité)
- Info: "Un micro-paiement de 1 FCFA sera effectué pour vérifier votre compte"
- Bouton: "VÉRIFIER MON COMPTE"

**États:**
- Vérification en cours (spinner)
- ✅ Compte vérifié
- ❌ Échec de vérification (réessayer)

**Navigation:**
- → AvailabilityScheduleScreen

---

#### 11. `AvailabilityScheduleScreen`
**Description:** Sélection des créneaux de disponibilité

**Éléments UI:**
- Indicateur de progression: 5/5
- Titre: "Vos disponibilités"
- Sous-titre: "Quand êtes-vous disponible pour livrer?"

**Grille de sélection:**
```
         │ Matin    │ Après-midi │ Soir
         │ 8h-12h   │ 12h-18h    │ 18h-22h
─────────┼──────────┼────────────┼─────────
Lundi    │ [✅]     │ [✅]       │ [✅]
Mardi    │ [☐]      │ [✅]       │ [✅]
Mercredi │ [☐]      │ [✅]       │ [✅]
Jeudi    │ [✅]     │ [✅]       │ [☐]
Vendredi │ [✅]     │ [✅]       │ [✅]
Samedi   │ [✅]     │ [✅]       │ [✅]
Dimanche │ [☐]      │ [☐]       │ [☐]
```

- Checkbox: "Je suis flexible (disponible à tout moment)"
- Note: "Modifiable à tout moment dans les paramètres"
- Bouton: "TERMINER L'INSCRIPTION"

**Navigation:**
- → PendingValidationScreen

---

#### 12. `PendingValidationScreen`
**Description:** En attente de validation par l'administration

**Éléments UI:**
- Icône: ⏳ (horloge animée)
- Titre: "Dossier en cours de validation"
- Sous-titre: "Notre équipe vérifie vos documents"
- Timeline:
  ```
  ✅ Informations personnelles
  ✅ Documents uploadés
  ⏳ Vérification en cours (24-48h)
  ○ Formation
  ○ Activation
  ```
- Texte: "Vous recevrez une notification dès que votre dossier sera validé"
- Bouton secondaire: "Contacter le support"

**États possibles:**
- En cours de validation
- Documents refusés (avec raison) → Retour à l'upload
- Validé → TrainingModulesScreen

---

#### 13. `TrainingModulesScreen`
**Description:** Liste des modules de formation obligatoire

**Éléments UI:**
- Titre: "Formation obligatoire"
- Sous-titre: "Complétez tous les modules pour commencer"
- Barre de progression: 0/4 modules

**Liste des modules:**
```
┌─────────────────────────────────────────┐
│ 📱 Module 1: Utilisation de l'app       │
│    Durée: 10 minutes                    │
│    [▶️ COMMENCER]                       │
├─────────────────────────────────────────┤
│ 🤝 Module 2: Standards de service       │
│    Durée: 10 minutes                    │
│    🔒 Verrouillé                        │
├─────────────────────────────────────────┤
│ 🛣️ Module 3: Sécurité routière          │
│    Durée: 10 minutes                    │
│    🔒 Verrouillé                        │
├─────────────────────────────────────────┤
│ 🧼 Module 4: Hygiène et qualité         │
│    Durée: 5 minutes                     │
│    🔒 Verrouillé                        │
└─────────────────────────────────────────┘
```

**Navigation:**
- → TrainingModuleDetailScreen (pour chaque module)

---

#### 14. `TrainingModuleDetailScreen`
**Description:** Contenu d'un module de formation

**Éléments UI:**
- Header avec titre du module
- Vidéo ou slides de formation
- Points clés listés
- Quiz rapide à la fin (2-3 questions)
- Bouton: "MODULE SUIVANT" ou "PASSER LE QUIZ FINAL"

**Exemples de contenu:**

**Module 1 - Utilisation de l'app:**
- Interface et navigation
- Accepter/refuser une course
- Utiliser le GPS
- Marquer les étapes

**Module 2 - Standards de service:**
- Code vestimentaire
- Comportement professionnel
- Communication client/restaurant
- Gestion des problèmes courants

**Module 3 - Sécurité routière:**
- Règles de circulation
- Port du casque obligatoire
- Conduite défensive
- Gestion du stress

**Module 4 - Hygiène et qualité:**
- Manipulation des aliments
- Propreté du sac de livraison
- Température des plats
- Emballage

---

#### 15. `CertificationQuizScreen`
**Description:** Quiz de certification final

**Éléments UI:**
- Titre: "Quiz de certification"
- Progression: Question 5/20
- Barre de progression visuelle
- Question affichée
- 4 options de réponse (radio buttons)
- Bouton: "QUESTION SUIVANTE"

**Infos:**
- 20 questions
- Score minimum: 80% (16/20)
- Tentatives illimitées

---

#### 16. `QuizResultScreen`
**Description:** Résultat du quiz

**États:**

**Réussite (≥80%):**
- Animation de confettis 🎉
- Icône: ✅
- Titre: "Félicitations!"
- Score: "18/20 (90%)"
- Bouton: "TÉLÉCHARGER LE CERTIFICAT"
- Bouton: "CONTINUER"

**Échec (<80%):**
- Icône: ❌
- Titre: "Pas encore..."
- Score: "12/20 (60%)"
- Texte: "Il faut 80% pour réussir. Révisez les modules et réessayez!"
- Bouton: "REVOIR LES MODULES"
- Bouton: "RÉESSAYER LE QUIZ"

---

#### 17. `ContractSigningScreen`
**Description:** Signature électronique du contrat

**Éléments UI:**
- Titre: "Contrat de prestation"
- Document scrollable (résumé des termes clés)
- Sections:
  - Type de contrat (Prestataire indépendant)
  - Rémunération (structure)
  - Responsabilités
  - Conditions générales
- Checkbox: "J'ai lu et j'accepte les termes du contrat"
- Zone de signature manuscrite (dessiner avec le doigt)
- Bouton: "SIGNER LE CONTRAT"

---

#### 18. `StarterKitScreen`
**Description:** Choix du kit de démarrage

**Éléments UI:**
- Titre: "Kit de démarrage"
- Sous-titre: "Équipez-vous pour livrer (optionnel)"

**Articles disponibles:**
```
┌─────────────────────────────────────────┐
│ 🎒 Sac isotherme BAIBEBALO              │
│    Prix: 15 000 FCFA                    │
│    [☐] Ajouter                          │
├─────────────────────────────────────────┤
│ 🦺 Gilet réfléchissant                  │
│    Prix: 5 000 FCFA                     │
│    [☐] Ajouter                          │
├─────────────────────────────────────────┤
│ 📱 Support téléphone                    │
│    Prix: 3 000 FCFA                     │
│    [☐] Ajouter                          │
└─────────────────────────────────────────┘

Total: 0 FCFA

Options de paiement:
○ Payer maintenant
○ Déduction sur premières courses
○ Retirer en boutique
```

- Bouton: "CONTINUER" ou "PASSER CETTE ÉTAPE"

---

#### 19. `ActivationPendingScreen`
**Description:** En attente de première livraison test

**Éléments UI:**
- Icône: 🚀
- Titre: "Dernière étape!"
- Sous-titre: "Livraison test supervisée"
- Texte explicatif:
  "Un superviseur vous accompagnera lors de votre première livraison pour valider vos compétences."
- Bouton: "PLANIFIER MA LIVRAISON TEST"
- Ou attente de notification

---

#### 20. `WelcomeActivatedScreen`
**Description:** Compte activé - Bienvenue!

**Éléments UI:**
- Animation de célébration 🎉
- Icône: ✅
- Titre: "Bienvenue dans l'équipe!"
- Sous-titre: "Votre compte est maintenant actif"
- Avatar du livreur
- Badge: "Nouveau Livreur"
- Statistiques initiales: 0 courses, 0 FCFA
- Bouton: "COMMENCER À LIVRER"

**Navigation:**
- → DeliveryHomeScreen

---

### 🏠 SECTION 2: INTERFACE PRINCIPALE

---

#### 21. `DeliveryHomeScreen`
**Description:** Écran d'accueil principal du livreur

**Éléments UI:**

**Header:**
- Photo profil + "Bonjour, [Prénom]!"
- Icône notification (badge si nouvelles)

**Toggle Statut (Grand, centré):**
```
┌──────────────────────────────────────┐
│          🟢 DISPONIBLE               │
│       [Toucher pour changer]         │
└──────────────────────────────────────┘
```

**Statistiques du jour:**
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 💰 Gains    │ │ 📦 Courses  │ │ ⭐ Note     │
│ 12 450 F    │ │     8       │ │   4.8/5     │
└─────────────┘ └─────────────┘ └─────────────┘
```

**Objectif du jour (Gamification):**
```
Progression: ████████░░ 8/10 courses
🎯 Objectif: 10 courses = Bonus +2000 FCFA
```

**Mini carte:**
- Position actuelle (point bleu)
- Zones de forte demande (rouge)
- Restaurants actifs (pins verts)
- Suggestion: "Rapprochez-vous du centre-ville"

**Dernières courses (3):**
```
┌──────────────────────────────────────┐
│ 13:45 Restaurant Chez Marie          │
│ → Quartier Tchengué ✅ Livrée        │
│ +1 750 FCFA                          │
└──────────────────────────────────────┘
```

**Bottom Navigation:**
- 🏠 Accueil (actif)
- 📦 Courses
- 💰 Gains
- 📊 Stats
- ⚙️ Paramètres

---

#### 22. `StatusToggleScreen`
**Description:** Modal de changement de statut

**Éléments UI:**
- Titre: "Votre statut"
- Options:
  ```
  🟢 Disponible
     Vous recevez des alertes de courses
  
  🔴 Hors ligne
     Vous ne recevez aucune alerte
  
  🟡 En pause (30 min max)
     Pause temporaire
  ```
- Bouton: "CONFIRMER"

---

#### 23. `DailyStatsScreen`
**Description:** Statistiques détaillées du jour

**Éléments UI:**
- Date du jour
- Heures connecté: 6h 45min
- Courses complétées: 8
- Courses refusées: 1
- Distance totale: 24.5 km
- Gains bruts: 14 000 FCFA
- Bonus: +2 000 FCFA
- Pénalités: -0 FCFA
- **Total net: 16 000 FCFA**

---

#### 24. `HeatMapScreen`
**Description:** Carte des zones de forte demande

**Éléments UI:**
- Carte plein écran
- Légende:
  - 🔴 Forte demande
  - 🟡 Demande moyenne
  - 🟢 Faible demande
- Position actuelle
- Bouton: "Naviguer vers zone chaude"

---

### 📦 SECTION 3: RÉCEPTION ET GESTION DES COURSES

---

#### 29. `NewDeliveryAlertScreen`
**Description:** Pop-up plein écran pour nouvelle course

**Éléments UI:**
```
┌─────────────────────────────────────────┐
│        🔔 NOUVELLE COURSE DISPONIBLE    │
├─────────────────────────────────────────┤
│                                         │
│  📍 Récupération                        │
│     Restaurant Chez Marie               │
│     Rue des Écoles, Centre-ville        │
│     Distance: 1.2 km                    │
│                                         │
│  🏠 Livraison                           │
│     Quartier Tchengué                   │
│     Près de l'école primaire            │
│     Distance totale: 3.5 km             │
│                                         │
│  💰 Rémunération: 1 750 FCFA            │
│  ⏱️ Temps estimé: 25 minutes            │
│                                         │
│         ⏰ Répondre dans: 00:28         │
│                                         │
│  [✅ ACCEPTER]     [❌ REFUSER]         │
│                                         │
└─────────────────────────────────────────┘
```

**Comportement:**
- Son d'alerte fort
- Vibration continue
- Ne se ferme pas automatiquement
- Timer de 30 secondes

---

#### 30. `DeliveryDetailsScreen`
**Description:** Détails complets de la course acceptée

**Éléments UI:**
- Statut: "EN ROUTE VERS LE RESTAURANT"
- Carte avec itinéraire
- Détails restaurant
- Détails commande (#BAIB-12345)
- Liste des articles
- Mode de paiement (Cash/En ligne)
- Instructions spéciales
- Boutons d'action selon l'étape

---

#### 31. `RefusalConfirmationScreen`
**Description:** Confirmation de refus avec raison

**Éléments UI:**
- Titre: "Pourquoi refusez-vous?"
- Options:
  - Trop loin
  - Pas dans ma zone
  - Fin de service
  - Problème personnel
  - Autre
- Avertissement: "3 refus consécutifs = pause forcée 15 min"
- Bouton: "CONFIRMER LE REFUS"

---

#### 32. `PauseForcedScreen`
**Description:** Écran de pause forcée après 3 refus

**Éléments UI:**
- Icône: ⏸️
- Titre: "Pause obligatoire"
- Texte: "Suite à 3 refus consécutifs, vous êtes en pause pour 15 minutes"
- Timer: 14:32
- Conseil: "Profitez-en pour vous rapprocher d'une zone active"
- Bouton (grisé): "Reprendre dans 14:32"

---

### 🗺️ SECTION 4: NAVIGATION ET RÉCUPÉRATION

---

#### 35. `NavigationToRestaurantScreen`
**Description:** Navigation GPS vers le restaurant

**Éléments UI:**
- Carte plein écran avec itinéraire
- Position en temps réel
- Distance restante: "850 m"
- Temps estimé: "3 minutes"
- Instructions: "Tournez à droite dans 200m"
- Bouton audio: "Instructions vocales ON/OFF"

**Panneau glissable (bas):**
```
RÉCUPÉRATION
Restaurant Chez Marie
Rue des Écoles, Centre-ville

Commande #BAIB-12345
• 2x Poulet Bicyclette
• 1x Riz Sauce Graine
• 1x Coca-Cola

Paiement: Cash à la livraison (5 450 FCFA)

[📞 Appeler le restaurant]
```

- Bouton: "Ouvrir dans Google Maps"

---

#### 36. `RestaurantArrivalScreen`
**Description:** Écran d'arrivée au restaurant

**Éléments UI:**
- Notification: "Vous êtes arrivé! 📍"
- Nom du restaurant
- Numéro de commande
- Bouton principal: "🔔 SIGNALER MON ARRIVÉE"
- Sous-texte: "Le restaurant sera notifié"
- Temps d'attente estimé si commande pas prête

---

#### 37. `OrderVerificationScreen`
**Description:** Checklist de vérification de la commande

**Éléments UI:**
```
┌─────────────────────────────────────┐
│ ✅ Vérifier la commande             │
├─────────────────────────────────────┤
│ [☐] Nombre de sacs correct          │
│ [☐] Commande bien fermée/emballée   │
│ [☐] Boissons incluses               │
│ [☐] Couverts et serviettes          │
│                                     │
│ ⚠️ Problème avec la commande?       │
│            [Signaler]               │
└─────────────────────────────────────┘
```

- Bouton: "PRENDRE PHOTO (recommandé)"
- Bouton: "✅ COMMANDE RÉCUPÉRÉE"

---

#### 38. `OrderPhotoScreen`
**Description:** Prise de photo de la commande

**Éléments UI:**
- Caméra plein écran
- Guide: "Prenez une photo claire de la commande"
- Bouton capture
- Prévisualisation
- Bouton: "UTILISER CETTE PHOTO"
- Bouton: "REPRENDRE"

---

#### 39. `OrderPickedUpScreen`
**Description:** Confirmation récupération commande

**Éléments UI:**
- Animation: ✅
- Titre: "Commande récupérée!"
- Notification envoyée: "Le client a été notifié"
- Prochaine étape: "Direction: Quartier Tchengué"
- Bouton: "DÉMARRER LA LIVRAISON"

---

### 🏠 SECTION 5: LIVRAISON CHEZ LE CLIENT

---

#### 43. `NavigationToClientScreen`
**Description:** Navigation GPS vers le client

**Éléments UI:**
- Carte avec itinéraire
- Étage si immeuble
- Instructions du client en gros

**Panneau client:**
```
Client: Jean K.
+225 XX XX XX XX XX
Quartier Tchengué
Près de l'école primaire
2ème maison à gauche après le carrefour

Instructions:
"Appeler à l'arrivée, portail vert"

[📞 Appeler le client]
[💬 Envoyer un message]
```

**Accès rapide problèmes:**
- "Client ne répond pas"
- "Adresse introuvable"
- "Problème avec la commande"
- "Accident/retard"

---

#### 44. `ClientInfoScreen`
**Description:** Informations détaillées du client

**Éléments UI:**
- Photo profil client (si disponible)
- Nom: Jean K.
- Téléphone
- Adresse complète
- Points de repère
- Instructions spéciales (highlight)
- Historique: "3ème commande de ce client"
- Note moyenne du client
- Boutons: Appeler / Message

---

#### 45. `ClientArrivalScreen`
**Description:** Arrivée chez le client

**Éléments UI:**
- Notification: "Vous êtes arrivé! 📍"
- Bouton: "Je suis en bas" (notifie le client)
- Timer visible pour le client
- Options si problème

---

#### 46. `CashPaymentScreen`
**Description:** Collecte du paiement en espèces

**Éléments UI:**
```
┌─────────────────────────────────────┐
│       💵 PAIEMENT EN ESPÈCES        │
├─────────────────────────────────────┤
│ Montant à collecter: 5 450 FCFA     │
│                                     │
│ Montant reçu: [______] FCFA         │
│                                     │
│ Rendu à faire: 0 FCFA               │
│                                     │
│ ⚠️ Vérifiez bien les billets        │
└─────────────────────────────────────┘
```

- Bouton: "PAIEMENT REÇU"
- Lien: "Problème de paiement?"

---

#### 47. `OnlinePaymentConfirmScreen`
**Description:** Confirmation paiement déjà effectué

**Éléments UI:**
- Icône: ✅
- Titre: "Paiement déjà effectué"
- Montant: 5 450 FCFA
- Mode: Orange Money
- Texte: "Aucune transaction nécessaire"
- Bouton: "CONTINUER"

---

#### 48. `DeliveryProofPhotoScreen`
**Description:** Photo preuve de livraison

**Éléments UI:**
- Caméra
- Guide: "Prenez une photo de la commande remise"
- Options:
  - Photo de la porte si laisser devant
  - Photo avec client (optionnel)
- Bouton: "CONTINUER"

---

#### 49. `ConfirmationCodeScreen`
**Description:** Saisie du code 4 chiffres du client

**Éléments UI:**
- Titre: "Code de confirmation"
- Sous-titre: "Demandez le code au client"
- 4 cases pour le code
- Bouton: "VALIDER"
- Lien: "Client n'a pas le code?"

---

#### 50. `DeliverySuccessScreen`
**Description:** Succès de la livraison

**Éléments UI:**
- Animation de succès 🎉
- Titre: "Livraison effectuée!"
- "+1 750 FCFA ajouté à vos gains"
- Note du client: ⭐⭐⭐⭐⭐
- Statistiques mises à jour
- Bouton: "RETOUR À L'ACCUEIL"
- Bouton: "VOIR MES GAINS"

---

### ⚠️ SECTION 6: GESTION DES PROBLÈMES

---

#### 53. `ClientAbsentScreen`
**Description:** Procédure client absent

**Éléments UI:**
- Titre: "Client absent"
- Procédure:
  1. "Appelez le client (3 tentatives)"
  2. "Attendez 10 minutes sur place"
  3. "Choisissez une option"
- Options:
  - Laisser à un voisin (avec accord)
  - Retourner au restaurant
  - Annuler la livraison
- Note: "Photo de preuve obligatoire"

---

#### 54. `CallAttemptTrackerScreen`
**Description:** Suivi des tentatives d'appel

**Éléments UI:**
- Tentative 1: ✅ 14:32 - Pas de réponse
- Tentative 2: ✅ 14:35 - Pas de réponse
- Tentative 3: [Appeler maintenant]
- Timer entre appels

---

#### 55. `WaitingTimerScreen`
**Description:** Timer d'attente sur place

**Éléments UI:**
- Timer grand: 07:23 restant
- Texte: "Attendez sur place 10 minutes"
- Rappel: "Gardez votre téléphone visible"
- À la fin: Options de résolution

---

#### 58. `EmergencyButtonScreen`
**Description:** Écran d'urgence

**Éléments UI:**
- Bouton rouge: "🆘 J'AI UN PROBLÈME"
- Types de problèmes:
  - 🚗 Accident de circulation
  - 🔧 Panne de véhicule
  - ⚠️ Problème de sécurité
  - 🏥 Problème de santé
  - ❓ Autre urgence
- Actions automatiques affichées

---

### 💰 SECTION 7: GAINS ET PAIEMENTS

---

#### 63. `EarningsDashboardScreen`
**Description:** Dashboard principal des gains

**Éléments UI:**
```
┌──────────────────────────────────────┐
│        💰 SOLDE DISPONIBLE           │
│           48 750 FCFA                │
│      [Demander un paiement]          │
└──────────────────────────────────────┘

Aujourd'hui: 12 450 FCFA (8 courses)
Cette semaine: 67 800 FCFA (42 courses)
Ce mois: 185 000 FCFA (115 courses)
Total gagné: 1 234 500 FCFA
```

**Liste des courses:**
```
┌──────────────────────────────────────┐
│ 13:45 Centre → Tchengué ✅           │
│ Distance: 3.5 km | Durée: 22 min     │
│ +1 750 FCFA | Note: ⭐⭐⭐⭐⭐         │
├──────────────────────────────────────┤
│ 12:30 Koko → Petit Paris ✅          │
│ Distance: 2.1 km | Durée: 18 min     │
│ +1 500 FCFA | Note: ⭐⭐⭐⭐           │
└──────────────────────────────────────┘
```

---

#### 68. `WithdrawRequestScreen`
**Description:** Demande de retrait

**Éléments UI:**
- Solde disponible: 48 750 FCFA
- Montant minimum: 5 000 FCFA
- Input: Montant à retirer
- Boutons rapides: [Tout] [25 000] [10 000]
- Compte destination: Orange Money (+225...)
- [Modifier]
- Bouton: "DEMANDER LE PAIEMENT"
- Note: "Traitement sous 24h jours ouvrés"

---

#### 70. `PaymentHistoryScreen`
**Description:** Historique des paiements

**Éléments UI:**
```
23/12/2025 | Retrait Orange Money | -50 000 FCFA | ✅
16/12/2025 | Retrait Orange Money | -75 000 FCFA | ✅
09/12/2025 | Retrait Orange Money | -60 000 FCFA | ✅
```

- Filtre par mois
- Télécharger relevé PDF

---

### 📊 SECTION 8: STATISTIQUES ET PERFORMANCE

---

#### 73. `PerformanceDashboardScreen`
**Description:** Tableau de bord des performances

**Éléments UI:**
```
Membre depuis: 3 mois
Courses totales: 387
Courses complétées: 378 (97.7%)
Courses annulées: 9 (2.3%)
Distance parcourue: 1 247 km
Note moyenne: ⭐ 4.8/5
```

- Graphiques hebdomadaires
- Évolution de la note

---

#### 75. `RankingScreen`
**Description:** Classement des livreurs

**Éléments UI:**
```
🏆 Top Livreurs de la Semaine
─────────────────────────────
1. 🥇 Bakary D.   - 52 courses
2. 🥈 Vous        - 42 courses
3. 🥉 Amadou S.   - 38 courses
```

---

#### 76. `BadgesRewardsScreen`
**Description:** Badges et récompenses

**Éléments UI:**
- 🏅 100 livraisons effectuées
- ⭐ Note parfaite 5.0 sur 30 jours
- 🚀 Livreur le plus rapide du mois
- 🎂 1 an d'ancienneté
- 🔥 10 jours consécutifs actifs

---

### ⚙️ SECTION 9: PARAMÈTRES ET COMPTE

---

#### 81. `SettingsScreen`
**Description:** Écran paramètres principal

**Éléments UI:**
- **Mon compte**
  - Modifier le profil
  - Mettre à jour les documents
  - Changer de véhicule

- **Disponibilités**
  - Horaires préférés
  - Mode vacances
  - Zones de travail

- **Préférences**
  - Préférences de course
  - Notifications
  - Mode économie batterie

- **Sécurité**
  - Code PIN
  - Authentification 2 facteurs
  - Déconnexion à distance

- **Support**
  - Centre d'aide
  - Contacter le support
  - Signaler un bug

- **Légal**
  - Contrat
  - Confidentialité
  - À propos

- Bouton: "SE DÉCONNECTER"

---

## 🎨 GUIDE DE STYLE

### Couleurs
- **Primaire:** Vert BAIBEBALO #22C55E
- **Secondaire:** Bleu #3B82F6
- **Succès:** Vert #10B981
- **Erreur:** Rouge #EF4444
- **Warning:** Orange #F59E0B
- **Texte principal:** #1F2937
- **Texte secondaire:** #6B7280
- **Fond:** #F3F4F6

### Icônes
- Style: Lucide React ou Heroicons
- Taille: 24px (standard), 32px (featured)

### Typographie
- Titres: Inter Bold
- Corps: Inter Regular
- Chiffres: Inter Medium (tabular)

### Boutons
- Primaire: Fond vert, texte blanc, coins arrondis 8px
- Secondaire: Bordure verte, fond transparent
- Danger: Fond rouge

---

## 📋 RÉCAPITULATIF

| Section | Nombre d'écrans |
|---------|-----------------|
| Inscription et Validation | 20 |
| Interface Principale | 8 |
| Réception et Gestion des Courses | 6 |
| Navigation et Récupération | 8 |
| Livraison chez le Client | 10 |
| Gestion des Problèmes | 10 |
| Gains et Paiements | 10 |
| Statistiques et Performance | 8 |
| Paramètres et Compte | 14 |
| **TOTAL** | **94 écrans** |

---

## 🚀 ORDRE DE PRIORITÉ POUR LE DÉVELOPPEMENT

### Phase 1 - MVP (Priorité Haute)
1. SplashScreen
2. PhoneInputScreen + OTPVerificationScreen
3. DeliveryHomeScreen
4. NewDeliveryAlertScreen
5. NavigationToRestaurantScreen
6. OrderVerificationScreen
7. NavigationToClientScreen
8. DeliverySuccessScreen
9. EarningsDashboardScreen

### Phase 2 - Inscription Complète
10-20. Tous les écrans d'inscription

### Phase 3 - Fonctionnalités Avancées
21-60. Gestion des problèmes, statistiques

### Phase 4 - Finitions
61-94. Paramètres, badges, classements

---

**Document créé le:** 2026-02-01
**Pour:** Développement Stitch
**Application:** BAIBEBALO Livreur (Mobile Android/iOS)

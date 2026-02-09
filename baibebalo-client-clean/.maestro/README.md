# Tests E2E Maestro – App Client BAIBEBALO

Flows de test [Maestro](https://maestro.mobile.dev/) pour l’app React Native client (`ci.baibebalo.client`).

## Installation Maestro

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Sous Windows (PowerShell), utiliser l’installateur ou WSL. Voir [Maestro – Install](https://maestro.mobile.dev/docs/getting-started/installation).

## Prérequis

- App client installée sur un émulateur ou un appareil (build debug).
- Backend disponible (pour inscription, recherche, commandes).
- Pour **inscription** : numéro de test ou OTP fixe (ex. `123456`) si votre backend le permet.

## Lancer les tests

Depuis la racine du projet client :

```bash
cd baibebalo-client-clean
maestro test .maestro/
```

Lancer un flow précis :

```bash
maestro test .maestro/client-signup.yaml
maestro test .maestro/client-search-restaurant.yaml
```

## Flows disponibles

| Fichier | Description |
|--------|-------------|
| `client-signup.yaml` | Inscription : téléphone → OTP → (profil si nouveau) → Accueil |
| `client-search-restaurant.yaml` | Recherche d’un restaurant (ex. "Pizza") |
| `client-add-to-cart.yaml` | Recherche → ouverture d’un restaurant → ajout d’un plat au panier |
| `client-checkout.yaml` | Panier → validation → adresse → paiement → confirmation (nécessite une adresse enregistrée) |
| `client-tracking.yaml` | Onglet Commandes → ouverture d’une commande → écran suivi |
| `client-rating.yaml` | Commandes → commande livrée → Modifier mon avis → écran notation |

## App ID

- **Android** : `ci.baibebalo.client` (package dans `app.json`).
- **iOS** : `ci.baibebalo.client` (bundleIdentifier).

## Notes

- **Checkout** : le flow suppose qu’au moins une adresse de livraison existe. Sinon, ajoutez-en une manuellement avant d’exécuter `client-checkout.yaml`.
- **Notation** : nécessite une commande déjà livrée pour que « Modifier mon avis » soit affiché.
- Les étapes marquées `optional: true` ne font pas échouer le flow si l’élément est absent.

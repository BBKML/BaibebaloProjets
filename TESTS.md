# Tests – Projet Baibebalo

Ce document décrit les **cinq types de tests** (fonctionnels, non fonctionnels, structurels, confirmation, régression) et comment les exécuter dans chaque partie du projet.

---

## 1. Types de tests

| Type | Objectif | Exemples |
|------|----------|----------|
| **Fonctionnels** | Vérifier que les fonctionnalités métier se comportent comme prévu (API, parcours utilisateur). | Endpoints API, envoi OTP, commandes, livraison. |
| **Non fonctionnels** | Sécurité, performance, charge. | Injection SQL, rate limit, tests de charge. |
| **Structurels** | Logique interne (modules, utils, calculs). | Commission, format, validation, composants UI. |
| **Confirmation** | Scénarios de bout en bout (E2E / intégration). | Flux client, restaurant, livreur. |
| **Régression** | S’assurer que les parcours critiques ne cassent pas après une modification. | Auth, commandes, livraison, admin. |

---

## 2. Backend (`baibebalo-backend`)

- **Framework :** Jest.
- **Config :** `jest.config.js`, `tests/setup.js`.

### Commandes

| Commande | Contenu |
|----------|---------|
| `npm test` | Tous les tests (sauf perf par défaut). |
| `npm run test:functional` | `tests/api/**` – auth, orders, users, delivery, restaurants, admin, payments, socket. |
| `npm run test:non-functional` | `tests/security`, `tests/performance`. |
| `npm run test:structural` | `tests/structural/**` – commission, helpers. |
| `npm run test:confirmation` | `tests/integration/**` – client-flow, delivery-flow, restaurant-flow. |
| `npm run test:regression` | `tests/regression` + `tests/api` + `tests/integration`. |
| `npm run test:all` | Toute la suite Jest. |
| `npm run test:coverage` | Rapport de couverture. |
| `npm run test:security` | Uniquement `tests/security`. |
| `npm run test:load` / `test:perf` | Tests de charge (hors suite par défaut). |

### Structure des dossiers de tests

- `tests/api/` – Tests fonctionnels API.
- `tests/security/` – Tests non fonctionnels (sécurité).
- `tests/performance/` – Tests non fonctionnels (charge).
- `tests/structural/` – Tests unitaires (commission, helpers).
- `tests/integration/` – Tests de confirmation (flux E2E).
- `tests/regression/` – Tests de régression (parcours critiques).

---

## 3. Admin (`baibebalo-admin`)

- **Framework :** Vitest + React Testing Library.
- **Config :** `vite.config.js` (section `test`), `tests/setup.js`.

### Commandes

| Commande | Contenu |
|----------|---------|
| `npm run test` | Mode watch Vitest. |
| `npm run test:run` | Exécution une fois. |
| `npm run test:functional` | `tests/functional` – smoke (ex. Login). |
| `npm run test:structural` | `tests/structural` – ex. Button. |
| `npm run test:confirmation` | `tests/confirmation` – ex. Login. |
| `npm run test:all` | Toute la suite. |
| `npm run test:coverage` | Couverture. |

---

## 4. Client mobile (`baibebalo-client-clean`)

- **Framework :** Jest (environnement jsdom) + Babel.
- **Config :** `jest.config.js`, `jest.setup.js`.

### Commandes

| Commande | Contenu |
|----------|---------|
| `npm test` | Tous les tests. |
| `npm run test:structural` | `__tests__/utils` – format, validation. |
| `npm run test:functional` | `__tests__/` (tous). |
| `npm run test:all` | Idem `npm test`. |
| `npm run test:coverage` | Couverture. |

### Contenu

- **Structurels :** `format.js` (formatCurrency, calculateOrderSubtotal, etc.), `validation.js` (validatePhoneNumber, validateOTP, validateEmail).

---

## 5. Livreur (`baibebalo-livreur`)

- **Framework :** Jest (jsdom).
- **Config :** `jest.config.js`, `jest.setup.js`.

### Commandes

| Commande | Contenu |
|----------|---------|
| `npm test` | Tous les tests. |
| `npm run test:structural` | `__tests__/` – smoke. |
| `npm run test:all` | Idem `npm test`. |

---

## 6. Restaurant (`baibebalo-restaurant`)

- **Framework :** Jest (jsdom).
- **Config :** `jest.config.js`, `jest.setup.js`.

### Commandes

| Commande | Contenu |
|----------|---------|
| `npm test` | Tous les tests. |
| `npm run test:structural` | `__tests__/` – smoke. |
| `npm run test:all` | Idem `npm test`. |

---

## 7. Lancer tous les tests (tous les projets)

À la racine du dépôt (sans script racine) :

```bash
cd baibebalo-backend   && npm run test:all
cd ../baibebalo-admin  && npm run test:all
cd ../baibebalo-client-clean && npm run test:all
cd ../baibebalo-livreur     && npm run test:all
cd ../baibebalo-restaurant  && npm run test:all
```

Sous PowerShell :

```powershell
cd baibebalo-backend;   npm run test:all
cd ..\baibebalo-admin;  npm run test:all
cd ..\baibebalo-client-clean; npm run test:all
cd ..\baibebalo-livreur;     npm run test:all
cd ..\baibebalo-restaurant;   npm run test:all
```

---

## 8. Résumé par type

- **Fonctionnels :** Backend `test:functional`, Admin `test:functional` (smoke / pages).
- **Non fonctionnels :** Backend `test:non-functional` (sécurité + perf).
- **Structurels :** Backend `test:structural`, Admin `test:structural`, Client/Livreur/Restaurant `test` ou `test:structural`.
- **Confirmation :** Backend `test:confirmation`, Admin `test:confirmation`.
- **Régression :** Backend `test:regression` (parcours critiques + API + intégration).

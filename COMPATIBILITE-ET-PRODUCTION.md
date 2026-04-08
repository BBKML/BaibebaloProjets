# Compatibilité et mise en production – BAIBEBALO

Ce document résume la **compatibilité** entre le backend, l’admin et les trois applications mobiles, et les points à respecter pour une **mise en ligne professionnelle**.

---

## Compatibilité technique

### API et authentification

| Composant | URL API | Authentification |
|-----------|---------|------------------|
| **Backend** | `/api/v1` (Express) | JWT dans `Authorization: Bearer <token>` |
| **Admin** | `VITE_API_URL` ou `VITE_BACKEND_URL` + `/api/v1` | `accessToken` + `refreshToken` (localStorage) |
| **App Client** | `EXPO_PUBLIC_API_URL` ou défaut production | `accessToken` (AsyncStorage), refresh automatique |
| **App Livreur** | `EXPO_PUBLIC_API_URL` ou IP dev | `delivery_token` (AsyncStorage) |
| **App Restaurant** | `EXPO_PUBLIC_API_URL` ou IP dev | `token` (Zustand / store) |

Les réponses backend sont au format : `{ success: true, data: ... }` ou `{ success: false, error: { code, message } }`. Les trois apps et l’admin gèrent ce format.

### Workflow commande (aligné)

- **Statuts** : `new` → `accepted` → `preparing` → `ready` → `picked_up` → `delivering` → `delivered` (et `cancelled`).
- **Socket** (namespace `/partners` pour livreur/restaurant) : `new_order`, `order_update`, `order_ready`, `order_picked_up`, `order_cancelled`, `order_proposed` (livreur).
- **Délai d’acceptation restaurant** : 2 minutes (timer côté app + alerte socket).

### Variables d’environnement (production)

- **Backend** : `PORT`, `NODE_ENV=production`, base de données, JWT_SECRET, etc.
- **Admin** : `VITE_API_URL=https://votre-domaine.com/api/v1`
- **Apps mobiles** : `EXPO_PUBLIC_API_URL=https://votre-domaine.com/api/v1` (à définir au build EAS / release).

En **développement**, les apps livreur et restaurant peuvent utiliser une IP locale (ex. `192.168.1.x:5000/api/v1`) ; en production, n’utiliser que l’URL de l’API hébergée.

---

## Professionnalisme et utilisateurs

### Déjà en place

- **Logs** : Les `console.log` / `console.warn` dans les clients API des trois apps sont supprimés ou conditionnés par `__DEV__` pour ne pas polluer la production.
- **Messages utilisateur** :
  - Connexion : « Impossible de se connecter. Vérifiez votre connexion internet. »
  - Erreurs livreur : « Connexion interrompue. Vous pouvez continuer. » (au lieu de « synchronisation »).
  - Fonctionnalités à venir : « Bientôt disponible. » / « … bientôt disponible. »
- **Placeholders** : Remplacement de « phase 2 », « prochainement », « backend » dans les textes visibles par l’utilisateur.

### À faire avant mise en ligne

1. **Backend** : Vérifier que `NODE_ENV=production` et que les `console.*` sensibles sont remplacés par un logger (ex. Winston) ou désactivés.
2. **Admin** : Vérifier que les appels API et toasts d’erreur n’affichent pas de messages techniques bruts à l’utilisateur.
3. **Tests** : Tester un parcours complet (commande client → acceptation restaurant → prise en charge livreur → livraison) avec l’URL de production.
4. **Politique de confidentialité / CGU** : S’assurer que les liens et textes légaux sont à jour et accessibles depuis les apps.

---

## Simplicité pour les utilisateurs

- Formulaires : étapes claires, messages d’erreur courts et en français.
- Boutons : libellés explicites (Valider, Envoyer, Annuler, OK).
- Alertes : pas de termes techniques (« backend », « synchronisation ») ; préférer « connexion », « enregistrement », « envoi ».

Pour toute question technique sur l’architecture ou les variables d’environnement, se référer à `README-GUIDE-UTILISATION.md` et `README-DEPLOIEMENT.md`.

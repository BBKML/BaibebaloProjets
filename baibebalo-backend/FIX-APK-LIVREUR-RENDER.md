# Fix APK Livreur – Plantage après connexion (routes Render)

## 1. Diagnostic

### Backend (baibebalo-backend)

- **Routes concernées** : Les 3 routes existent et sont définies dans `src/routes/delivery.routes.js` :
  - `GET /api/v1/delivery/orders/active` → `deliveryController.getActiveOrders`
  - `GET /api/v1/delivery/earnings` → `deliveryController.getEarnings`
  - `GET /api/v1/delivery/history` → `deliveryController.getDeliveryHistory`
- **Montage** : Dans `index.js`, les routes delivery sont montées sous `/api/v1/delivery` → URLs complètes correctes.
- **Auth** : Toutes ces routes sont protégées par `authenticate` + `authorize('delivery_person')` puis `requireActiveDelivery`. Un livreur avec `status = 'pending'` reçoit **403** (pas de token émis à la connexion s’il est pending).
- **Cause probable des "- - ms - -" sur Render** :
  1. **Cold start** : le service Render se réveille après inactivité ; la première requête peut prendre 30–60 s. Si le client (APK) a un timeout 30 s, il coupe avant la réponse → Render log "- - ms - -".
  2. **Timeout côté backend** : une requête DB lente (ex. `getEarnings` avec la table `transactions`) pouvait bloquer sans répondre.
  3. **Erreur non gérée** : une exception (ex. colonne manquante) pouvait faire planter le handler avant d’envoyer une réponse.

### App Livreur (baibebalo-livreur)

- **Config API** : `src/constants/api.js` utilise en production `https://baibebaloprojets.onrender.com/api/v1` (pas d’URL en dur à modifier).
- **Appels** : `getActiveOrders`, `getEarnings`, `getDeliveryHistory` sont appelés en parallèle dans `loadDashboardData()` (deliveryStore). Chaque appel a un `.catch(() => ({ success: false }))` pour éviter de faire crasher l’app.
- **Problèmes possibles** :
  - Timeout client 30 s trop court pour le cold start Render.
  - Pas d’affichage d’erreur clair si tout échoue → l’utilisateur ne sait pas qu’il doit réessayer.

### Modifications effectuées

1. **Backend**
   - **getEarnings** : requêtes vers la table `transactions` enveloppées dans des `try/catch` pour ne pas faire échouer tout le handler si la table ou les colonnes manquent ; réponse toujours envoyée avec des 0 en fallback.
   - **getEarnings** : utilisation de `withTimeout` (comme pour les autres handlers) pour éviter qu’une requête DB bloquée ne laisse la route sans réponse.
   - Réponse **503** + code `TIMEOUT` en cas de timeout handler.

2. **App Livreur**
   - **client.js** : timeout porté à **60 s** lorsque l’URL contient `render.com` (cold start).
   - **client.js** : intercepteur de réponse renforcé (logs, gestion propre du 401, pas de crash si `AsyncStorage` échoue).
   - **DeliveryHomeScreen** : accès sécurisé à `todayStats?.earnings` pour éviter un crash au rendu.
   - **DeliveryHomeScreen** : chargement initial dans un `try/catch` et affichage d’un bandeau d’erreur si `dashboardError` est défini, avec invitation à « Tirer pour réessayer ».

---

## 2. Tests des routes sur Render (curl)

Base URL : `https://baibebaloprojets.onrender.com`

Vous devez disposer d’un **token JWT** d’un livreur **actif** (après connexion via `POST /api/v1/auth/verify-otp` avec `role: "delivery"`).

### Obtenir un token (exemple)

```bash
# 1) Envoyer l’OTP (remplacer +2250700000000 par le numéro du livreur)
curl -s -X POST "https://baibebaloprojets.onrender.com/api/v1/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+2250700000000"}'

# 2) Vérifier l’OTP (remplacer CODE par le code reçu)
curl -s -X POST "https://baibebaloprojets.onrender.com/api/v1/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+2250700000000","code":"CODE","role":"delivery"}'
```

Dans la réponse de `verify-otp`, récupérer `data.accessToken` ou `data.token` et l’utiliser comme `TOKEN` ci‑dessous.

### Tester les 3 routes (avec token)

Remplacez `VOTRE_TOKEN` par le token reçu.

```bash
BASE="https://baibebaloprojets.onrender.com/api/v1"
TOKEN="VOTRE_TOKEN"

# Commandes actives
curl -s -w "\nHTTP %{http_code} time %{time_total}s\n" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE/delivery/orders/active"

# Gains
curl -s -w "\nHTTP %{http_code} time %{time_total}s\n" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE/delivery/earnings"

# Historique (avec paramètres optionnels)
curl -s -w "\nHTTP %{http_code} time %{time_total}s\n" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE/delivery/history?page=1&limit=5&status=delivered"
```

Résultat attendu : **HTTP 200** et un JSON `{ "success": true, "data": ... }`. Si vous voyez **403** : compte livreur `pending` ou `rejected` (vérifier en base ou via l’admin). Si vous voyez **401** : token invalide ou expiré.

### Sans token (doit échouer en 401)

```bash
curl -s -w "\nHTTP %{http_code}\n" \
  "https://baibebaloprojets.onrender.com/api/v1/delivery/orders/active"
# Attendu : 401
```

---

## 3. Déploiement des changements

### Backend (Render)

1. **Commit et push** des changements du backend (notamment `src/controllers/delivery.controller.js`).
2. Sur **Render** : le déploiement se déclenche automatiquement si le repo est connecté (auto-deploy on push).
3. Sinon : Dashboard Render → votre service → **Manual Deploy** → **Deploy latest commit**.
4. Attendre la fin du déploiement (et éventuellement un premier “cold start”).
5. Tester avec les commandes curl ci‑dessus (la première requête après un cold start peut prendre 30–60 s).

### App Livreur (APK EAS Build)

1. **Commit et push** des changements de l’app Livreur (`src/api/client.js`, `src/screens/home/DeliveryHomeScreen.js`, etc.).
2. Vérifier que l’URL d’API en production est bien `https://baibebaloprojets.onrender.com` (déjà le cas dans `constants/api.js` si vous n’avez pas modifié la prod).
3. Lancer un build EAS pour l’APK :
   ```bash
   cd baibebalo-livreur
   eas build --platform android --profile production
   ```
4. Une fois le build terminé, télécharger l’APK depuis le lien fourni par EAS (ou le profil de build configuré).
5. Installer sur un appareil et tester :
   - Connexion avec un compte livreur **actif**.
   - L’écran d’accueil doit charger (stats, commandes actives, historique) ; en cas d’échec réseau ou timeout, un bandeau d’erreur doit s’afficher avec « Tirer pour réessayer ».

### Vérifier que le fix est bon avant de rebuilder l’APK

- Tester les 3 routes en **curl** sur Render avec un token livreur actif → **200** et JSON valide.
- En local : lancer l’app Livreur (Expo) avec l’URL de prod (`EXPO_PUBLIC_API_URL=https://baibebaloprojets.onrender.com/api/v1`) et se connecter avec le même livreur → l’écran d’accueil doit se charger ou afficher le bandeau d’erreur sans crasher.
- Si la première requête après cold start est lente : attendre jusqu’à 60 s (nouveau timeout) et vérifier que la réponse arrive et que l’app ne plante pas.

---

## 4. Résumé des fichiers modifiés

| Fichier | Modifications |
|--------|----------------|
| `baibebalo-backend/src/controllers/delivery.controller.js` | getEarnings : requêtes transactions en try/catch, withTimeout, réponse 503 en cas de timeout |
| `baibebalo-livreur/src/api/client.js` | Timeout 60 s en prod (render.com), intercepteur réponse renforcé |
| `baibebalo-livreur/src/screens/home/DeliveryHomeScreen.js` | Loading sécurisé (todayStats?.earnings), erreur dashboard affichée, try/catch sur loadDashboardData et refresh |

Aucune nouvelle route n’a été créée ; les 3 routes existaient déjà et sont maintenant plus robustes côté backend et mieux gérées côté app.

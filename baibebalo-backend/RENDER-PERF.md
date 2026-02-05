# Performances routes delivery sur Render (PostgreSQL)

## ⚠️ Ce backend utilise PostgreSQL, pas MongoDB

- Il n’y a **pas** de Mongoose, pas de `models/Order.js`, pas de `.lean()`.
- Les routes delivery sont dans `src/routes/delivery.routes.js` et `src/controllers/delivery.controller.js`.
- La base est gérée avec **pg** et des requêtes SQL dans `src/database/db.js` et `src/database/migrate.js`.

## Pourquoi c’est encore lent (2–3 s) ?

Les optimisations **sont bien dans le code** (SELECT ciblés, requêtes parallèles pour earnings).  
Si les temps restent > 2 s, la cause la plus probable est que **les index PostgreSQL ne sont pas créés sur la base Render**.

Sans ces index, PostgreSQL fait des scans complets ou des plans sous-optimaux sur `orders` et `transactions`.

## ✅ À faire sur Render : créer les index

### Option 1 : Script dédié (recommandé)

1. Sur le dashboard Render, ouvre ton service backend.
2. Onglet **Shell** (ou une tâche one-off) et exécute :
   ```bash
   node scripts/add-delivery-indexes.js
   ```
   (en étant à la racine du projet, avec `DATABASE_URL` déjà défini.)

Le script crée uniquement les 3 index nécessaires aux routes delivery.

### Option 2 : Migration complète

Si tu préfères tout réappliquer :

```bash
node src/database/migrate.js
```

(Les index delivery sont déjà dans ce fichier ; les instructions de migration peuvent varier selon ton setup.)

## Index créés

| Index | Table | Rôle |
|-------|--------|------|
| `idx_orders_delivery_status` | orders | `/delivery/orders/active` (commandes par livreur + statut) |
| `idx_orders_delivery_created` | orders | `/delivery/history` (historique par livreur, tri par date) |
| `idx_transactions_to_date` | transactions | `/delivery/earnings` (agrégations par livreur et date) |

## Pourquoi parfois "- - ms - -" sur /earnings ?

- Avant : les 3 requêtes `transactions` (today, week, month) étaient **séquentielles** et **sans timeout**. Si une bloquait, la route ne renvoyait jamais de réponse.
- Maintenant : tout le bloc getEarnings est sous **withTimeout** (10 s) et les 3 requêtes sont en **parallèle** (`Promise.all`). Soit une réponse 200, soit 503 en cas de timeout, plus de requête qui reste sans réponse.

## Vérifier après création des index

```bash
time curl -s -H "Authorization: Bearer VOTRE_TOKEN" \
  "https://baibebaloprojets.onrender.com/api/v1/delivery/orders/active"
time curl -s -H "Authorization: Bearer VOTRE_TOKEN" \
  "https://baibebaloprojets.onrender.com/api/v1/delivery/earnings"
```

Objectif : temps total < 500 ms une fois les index en place et le service à chaud.

# Guide d'utilisation des tests de commission livreurs

Ce dossier contient des outils pour tester et vérifier les calculs de commission des livreurs.

## 📁 Fichiers disponibles

1. **`test-commission-livreurs.js`** - Script Node.js pour tester automatiquement les calculs
2. **`test-commission-livreurs.sql`** - Script SQL pour des requêtes de test rapides
3. **`../TESTS-COMMISSION-LIVREURS.md`** - Documentation complète avec exemples

## 🚀 Utilisation

### Option 1 : Script Node.js (recommandé)

```bash
# Tester tous les livreurs (limite à 5)
cd baibebalo-backend
node scripts/test-commission-livreurs.js

# Tester un livreur spécifique
node scripts/test-commission-livreurs.js "ID_DU_LIVREUR"
```

**Exemple de sortie :**
```
🧪 Test des calculs de commission pour le livreur: abc123-def456-...
================================================================================

📦 Livreur: Kouassi Jean (ID: abc123-def456-...)
   Gains totaux (table): 77496 FCFA
   Livraisons totales: 65

📊 RÉSULTATS PAR PÉRIODE:
────────────────────────────────────────────────────────────────────────────────

📅 AUJOURD'HUI:
   Frais de livraison: 0.00 FCFA
   Gains livreur: 0.00 FCFA
   Commission Baibebalo: 0.00 FCFA

📅 30 DERNIERS JOURS:
   Frais de livraison: 0.00 FCFA
   Gains livreur: 0.00 FCFA
   Commission Baibebalo: 0.00 FCFA

📅 TOUT LE TEMPS:
   Frais de livraison: 110000.00 FCFA
   Gains livreur: 77496.00 FCFA
   Commission Baibebalo: 32504.00 FCFA
   Pourcentage commission: 29.55%

✅ VÉRIFICATIONS:
────────────────────────────────────────────────────────────────────────────────
✅ Gains totaux cohérents: 77496 FCFA (table) = 77496.00 FCFA (transactions)
✅ Toutes les transactions sont liées à des commandes
✅ Toutes les commandes livrées ont un delivered_at
```

### Option 2 : Script SQL

```bash
# Modifier l'ID du livreur dans le fichier SQL
# Puis exécuter :
psql -d baibebalo -f scripts/test-commission-livreurs.sql

# Ou depuis psql :
\set delivery_person_id 'abc123-def456-...'
\i scripts/test-commission-livreurs.sql
```

**Ou directement dans psql :**

```sql
-- Remplacer 'ID_LIVREUR' par l'ID réel
\set delivery_person_id 'abc123-def456-...'

-- Exécuter les tests
\i scripts/test-commission-livreurs.sql
```

### Option 3 : Requêtes SQL manuelles

Voir `TESTS-COMMISSION-LIVREURS.md` pour des exemples de requêtes SQL à exécuter manuellement.

## ✅ Ce que les tests vérifient

1. **Cohérence des gains** : Les gains totaux dans `delivery_persons` correspondent à la somme des transactions
2. **Calcul de commission** : La commission = Frais de livraison - Gains livreur (par période)
3. **Intégrité des données** : 
   - Toutes les transactions ont un `order_id`
   - Toutes les commandes livrées ont un `delivered_at`
4. **Cohérence des dates** : Les filtres de date utilisent `delivered_at` pour être cohérents

## 🐛 Dépannage

### Erreur : "Cannot find module 'pg'"

```bash
npm install pg
```

### Erreur : "Connection refused"

Vérifier que :
- La base de données est démarrée
- Les variables d'environnement `DATABASE_URL` sont correctes
- Les permissions de connexion sont correctes

### Les résultats ne correspondent pas

1. Vérifier que les transactions ont bien un `order_id`
2. Vérifier que les commandes ont bien un `delivered_at`
3. Vérifier que les transactions ont le statut `'completed'`
4. Vérifier les requêtes dans `TESTS-COMMISSION-LIVREURS.md`

## 📊 Interprétation des résultats

### Commission à 0

**Causes possibles :**
- Aucune livraison sur la période
- Les bonus dépassent les frais de livraison (normal, commission = 0)
- Problème de dates (transactions vs commandes)

**Solution :**
Vérifier les dates avec :
```sql
SELECT 
  DATE(t.created_at) as date_transaction,
  DATE(o.delivered_at) as date_livraison,
  COUNT(*) as nombre
FROM transactions t
LEFT JOIN orders o ON t.order_id = o.id
WHERE t.to_user_id = 'ID_LIVREUR'
GROUP BY DATE(t.created_at), DATE(o.delivered_at);
```

### Gains totaux différents

**Causes possibles :**
- Transactions sans `order_id` (ajustements manuels)
- Transactions avec statut différent de `'completed'`
- Problème de synchronisation

**Solution :**
```sql
-- Comparer les deux sources
SELECT 
  (SELECT total_earnings FROM delivery_persons WHERE id = 'ID_LIVREUR') as table_delivery_persons,
  (SELECT COALESCE(SUM(amount), 0) FROM transactions 
   WHERE to_user_id = 'ID_LIVREUR' AND transaction_type = 'delivery_fee') as table_transactions;
```

## 📝 Notes importantes

1. Les bonus quotidiens (`daily_goal_bonus`) sont des transactions séparées et ne sont **PAS** inclus dans le calcul de la commission sur les frais de livraison.

2. Les ajustements manuels (transactions sans `order_id`) ne sont **PAS** inclus dans le calcul de la commission.

3. La commission ne peut jamais être négative : si les bonus dépassent les frais de livraison, la commission sera de 0.

4. Les calculs utilisent `delivered_at` de la table `orders` pour être cohérents avec les frais de livraison.

## 🔗 Liens utiles

- Documentation complète : `TESTS-COMMISSION-LIVREURS.md`
- Code source : `src/controllers/admin.controller.js` (fonction `getDeliveryPersonById`)

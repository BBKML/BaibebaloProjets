# 🧪 Tests manuels — Livraison express (Client → Livreur → Destinataire)

Ce document décrit les scénarios de test pour la fonctionnalité **Livraison express** (sans restaurant), inspirée de « Send something » de Glovo.

---

## Prérequis

- **Backend** : démarré (`npm run dev` dans `baibebalo-backend`)
- **Client** : app mobile ou simulateur (`npx expo start` dans `baibebalo-client-clean`)
- **Livreur** : app mobile ou simulateur (`npx expo start` dans `baibebalo-livreur`)
- **Admin** : dashboard web (`npm run dev` dans `baibebalo-admin`)
- **Base de données** : migrations exécutées, au moins un utilisateur client, un livreur actif, des adresses enregistrées

---

## 1. Client — Création et suivi des commandes express

### 1.1 Accès à l’écran express

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Ouvrir l’app client | Accueil affiché |
| 2 | Sur l’accueil, chercher la catégorie « Envoyer un colis » | La catégorie est visible |
| 3 | Appuyer sur « Envoyer un colis » | Navigation vers l’écran **ExpressCheckout** |

### 1.2 Création d’une commande express

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Sur ExpressCheckout, vérifier les champs | Point de collecte, Adresse de livraison, Destinataire (nom, téléphone), Description |
| 2 | Sélectionner une adresse de **collecte** (ou en ajouter une) | L’adresse est sélectionnée |
| 3 | Sélectionner une adresse de **livraison** différente | L’adresse est sélectionnée |
| 4 | Renseigner nom et téléphone du destinataire | Champs remplis |
| 5 | Renseigner une description (ex. « Documents importants ») | Champ rempli |
| 6 | Attendre le calcul des frais | Frais et distance affichés |
| 7 | Valider la commande | Message de succès, redirection vers suivi ou historique |

### 1.3 Suivi de la commande

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Aller dans **Historique des commandes** | La commande express apparaît avec le libellé « Livraison express » |
| 2 | Ouvrir la commande | Détails affichés (point de collecte, destinataire, statut) |
| 3 | Ouvrir le **suivi** | Timeline adaptée : Prêt → Collecté → En livraison → Livré |
| 4 | Vérifier le bloc « Point de collecte » | Affiché à la place de « Restaurant » |

### 1.4 Commander à nouveau

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Sur la page de détail d’une commande express | Bouton « Commander à nouveau » visible |
| 2 | Appuyer sur « Commander à nouveau » | Redirection vers **ExpressCheckout** (et non vers un panier restaurant) |

---

## 2. Livreur — Prise en charge et exécution des courses express

### 2.1 Affichage des courses express

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Ouvrir l’app livreur | Accueil / liste des courses |
| 2 | Vérifier la liste des courses disponibles ou assignées | Les courses express apparaissent |
| 3 | Vérifier l’affichage d’une course express | « Point de collecte » affiché au lieu de « Restaurant » |

### 2.2 Prise en charge

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Accepter une course express | Course ajoutée à « Mes courses » |
| 2 | Ouvrir les détails | Point de collecte, adresse de livraison, destinataire (nom, téléphone) visibles |

### 2.3 Exécution du parcours

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Aller au point de collecte | Navigation possible vers l’adresse de collecte |
| 2 | Marquer « Collecté » (picked_up) | Statut mis à jour |
| 3 | Aller à l’adresse de livraison | Navigation possible |
| 4 | Marquer « Livré » (delivered) | Statut mis à jour, course terminée |

---

## 3. Admin — Filtres et statistiques

### 3.1 Filtre par type de commande

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Ouvrir le dashboard admin | Page d’accueil |
| 2 | Aller dans **Commandes** | Liste des commandes |
| 3 | Utiliser le filtre « Type » | Options : Tous / Restaurant / Express |
| 4 | Sélectionner « Express » | Seules les commandes express sont affichées |
| 5 | Sélectionner « Restaurant » | Seules les commandes restaurant sont affichées |

### 3.2 Colonne Restaurant dans la liste

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Afficher la liste des commandes (tous types) | Colonne « Restaurant » visible |
| 2 | Pour une commande express | La colonne affiche « Express » (et non un nom de restaurant) |

### 3.3 Détail d’une commande express

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Cliquer sur une commande express | Page de détail ouverte |
| 2 | Vérifier le bloc « Point de collecte » | Titre « Point de collecte » au lieu de « Restaurant » |
| 3 | Vérifier les informations | Adresse de collecte, destinataire (nom, téléphone) affichés |

---

## Checklist rapide

- [ ] Client : création d’une commande express
- [ ] Client : suivi et historique
- [ ] Client : « Commander à nouveau » vers ExpressCheckout
- [ ] Livreur : affichage « Point de collecte »
- [ ] Livreur : prise en charge et exécution
- [ ] Admin : filtre Type (Express / Restaurant)
- [ ] Admin : colonne Restaurant = « Express »
- [ ] Admin : détail avec bloc Point de collecte

---

## Dépannage

| Problème | Vérification |
|----------|--------------|
| Pas de frais calculés | Vérifier que les adresses ont latitude/longitude |
| Erreur création commande | Vérifier `order_type`, `pickup_address`, `delivery_address` dans les logs backend |
| Livreur ne voit pas la course | Vérifier que le livreur est actif et dans la zone |
| Admin : pas de filtre Type | Vérifier que `order_type` est bien renvoyé par l’API admin |

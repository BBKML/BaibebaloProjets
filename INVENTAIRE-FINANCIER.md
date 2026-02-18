# 📊 Inventaire financier — Baibebalo Korhogo

Projection des revenus de la plateforme de livraison Baibebalo à Korhogo, Côte d'Ivoire.

---

## 💰 Modèle de revenus Baibebalo

La plateforme gagne sur **deux sources** par commande livrée :

| Source | Taux | Description |
|--------|------|-------------|
| **Commission restaurant** | 15 % | Sur le sous-total (montant des plats) |
| **Commission livraison** | 30 % | Sur les frais de livraison (le livreur reçoit 70 %) |

### Exemple par commande

| Élément | Montant (FCFA) |
|---------|----------------|
| Sous-total (plats) | 5 000 |
| Commission restaurant (15 %) | **750** |
| Frais de livraison (client paie) | 600 |
| Commission livraison (30 %) | **180** |
| **Revenu Baibebalo par commande** | **930** |

---

## 📈 Hypothèses de base (Korhogo)

| Paramètre | Valeur | Justification |
|-----------|--------|---------------|
| Sous-total moyen par commande | 4 500 FCFA | Repas typique maquis/restaurant |
| Frais de livraison moyens | 550 FCFA | Base 500 + bonus occasionnels |
| Commission restaurant | 15 % | Taux par défaut plateforme |
| Commission livraison | 30 % | Livreur 70 %, plateforme 30 % |

### Revenu moyen par commande

```
Commission restaurant : 4 500 × 15 % = 675 FCFA
Commission livraison  : 550 × 30 %   = 165 FCFA
─────────────────────────────────────────────
Total par commande    :              840 FCFA
```

---

## 📅 Projection mensuelle et annuelle

### Scénario 1 : Démarrage (mois 1–3)

| Indicateur | Valeur |
|------------|--------|
| Commandes / jour | 10 |
| Jours ouverts / mois | 26 |
| **Commandes / mois** | **260** |
| Revenu moyen / commande | 840 FCFA |
| **Revenu mensuel** | **218 400 FCFA** |
| **Revenu annuel (×12)** | **2 620 800 FCFA** |

### Scénario 2 : Croissance (mois 4–6)

| Indicateur | Valeur |
|------------|--------|
| Commandes / jour | 25 |
| Jours ouverts / mois | 26 |
| **Commandes / mois** | **650** |
| Revenu moyen / commande | 840 FCFA |
| **Revenu mensuel** | **546 000 FCFA** |
| **Revenu annuel (×12)** | **6 552 000 FCFA** |

### Scénario 3 : Consolidation (mois 7–12)

| Indicateur | Valeur |
|------------|--------|
| Commandes / jour | 50 |
| Jours ouverts / mois | 26 |
| **Commandes / mois** | **1 300** |
| Revenu moyen / commande | 840 FCFA |
| **Revenu mensuel** | **1 092 000 FCFA** |
| **Revenu annuel (×12)** | **13 104 000 FCFA** |

### Scénario 4 : Maturité (année 2+)

| Indicateur | Valeur |
|------------|--------|
| Commandes / jour | 100 |
| Jours ouverts / mois | 26 |
| **Commandes / mois** | **2 600** |
| Revenu moyen / commande | 840 FCFA |
| **Revenu mensuel** | **2 184 000 FCFA** |
| **Revenu annuel (×12)** | **26 208 000 FCFA** |

---

## 📋 Tableau récapitulatif

| Scénario | Commandes/mois | Revenu/mois (FCFA) | Revenu/an (FCFA) | Revenu/an (€)* |
|----------|----------------|--------------------|------------------|----------------|
| Démarrage | 260 | 218 400 | 2 620 800 | ~4 000 € |
| Croissance | 650 | 546 000 | 6 552 000 | ~10 000 € |
| Consolidation | 1 300 | 1 092 000 | 13 104 000 | ~20 000 € |
| Maturité | 2 600 | 2 184 000 | 26 208 000 | ~40 000 € |

*Taux indicatif : 1 € ≈ 655 FCFA

---

## 💸 Charges à déduire (ordre de grandeur)

| Poste | Montant mensuel estimé |
|-------|------------------------|
| VPS | 5 000 – 15 000 FCFA (≈ 8–23 €) |
| Domaine | ~1 000 FCFA/mois |
| Nexah (SMS) | Variable selon volume |
| Firebase | Gratuit (quota gratuit) |
| **Total charges fixes** | **~20 000 FCFA/mois** |

### Revenu net estimé (exemple scénario Croissance)

```
Revenu brut :     546 000 FCFA
Charges :        - 20 000 FCFA
─────────────────────────────
Revenu net :     526 000 FCFA/mois
```

---

## 📊 Synthèse par scénario

| Scénario | Revenu net/mois | Revenu net/an |
|----------|-----------------|---------------|
| Démarrage | ~200 000 FCFA | ~2 400 000 FCFA |
| Croissance | ~530 000 FCFA | ~6 360 000 FCFA |
| Consolidation | ~1 070 000 FCFA | ~12 840 000 FCFA |
| Maturité | ~2 160 000 FCFA | ~25 920 000 FCFA |

---

## ⚠️ Points d’attention

1. **Pas de paiement en ligne** : encaissement en espèces à la livraison, donc gestion des remises livreurs → plateforme.
2. **Saisonnalité** : pics en période de fêtes, baisse en période de Ramadan ou vacances scolaires.
3. **Concurrence** : arrivée éventuelle d’autres acteurs à Korhogo.
4. **Coûts cachés** : support client, marketing, maintenance technique.

---

## 📌 Formules de calcul

```
Commission restaurant = Sous-total × 15 %
Commission livraison  = Frais livraison × 30 %
Revenu Baibebalo     = Commission restaurant + Commission livraison
```

---

*Document basé sur la configuration actuelle de la plateforme Baibebalo.  
Dernière mise à jour : Février 2025*

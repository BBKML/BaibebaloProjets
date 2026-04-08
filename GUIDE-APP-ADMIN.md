# 🖥️ Guide d'utilisation - Panel Admin BAIBEBALO

Interface web d'administration pour gérer la plateforme BAIBEBALO.

---

## 🚀 Démarrage

### Prérequis
- Node.js 18+
- npm ou yarn

### Installation
```bash
cd baibebalo-admin
npm install
```

### Configuration
```bash
# Créer .env à la racine de baibebalo-admin
# Exemple pour développement local :
VITE_API_URL=http://192.168.1.16:5000/api/v1
VITE_BACKEND_URL=http://192.168.1.16:5000
```

### Lancement
```bash
# Mode développement
npm run dev

# Build production
npm run build

# Prévisualiser le build
npm run preview
```

---

## 📖 Utilisation

### 1. Connexion
- URL : `http://localhost:5174` (ou l'IP configurée)
- Email et mot de passe admin
- Créer un admin : `cd baibebalo-backend && npm run admin:create`

### 2. Dashboard
- Statistiques globales (revenus, commandes, utilisateurs)
- Alertes en temps réel
- Graphiques d'évolution

### 3. Gestion des commandes
- Liste toutes les commandes
- Filtres par statut, date, restaurant
- Détails et export

### 4. Gestion des restaurants
- Créer, modifier, suspendre
- Valider les inscriptions en attente
- Consulter les statistiques par restaurant

### 5. Gestion des livreurs
- Créer, modifier, suspendre
- Valider les inscriptions
- Suivi des gains et remises espèces

### 6. Finances
- Revenus par période
- Commissions plateforme
- Paiements et retraits

### 7. Support
- Tickets support
- Répondre aux demandes
- Fermer les tickets

---

## 🛠️ Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarrer en mode développement |
| `npm run build` | Build pour production |
| `npm run preview` | Prévisualiser le build |
| `npm run lint` | Vérifier le code |

---

## ⚠️ Problèmes courants

Voir [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) pour les solutions détaillées.

| Problème | Solution rapide |
|----------|-----------------|
| CORS erreur | Vérifier CORS_ORIGIN dans le backend |
| 401 Unauthorized | Vérifier le token, se reconnecter |
| Données non chargées | Vérifier que VITE_API_URL pointe vers le bon backend |

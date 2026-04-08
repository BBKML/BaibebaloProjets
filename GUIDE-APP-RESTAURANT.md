# 📱 Guide d'utilisation - App Restaurant BAIBEBALO

Application mobile pour les restaurants partenaires de la plateforme BAIBEBALO.

---

## 🚀 Démarrage

### Prérequis
- Node.js 18+
- npm ou yarn
- Expo Go sur votre téléphone (même WiFi que le PC)

### Installation
```bash
cd baibebalo-restaurant
npm install
```

### Configuration
```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer .env et mettre l'IP du backend
# Exemple: EXPO_PUBLIC_API_URL=http://192.168.1.16:5000/api/v1
```

### Lancement
```bash
# Démarrer Expo
npm start

# Ou directement sur Android
npm run android

# Ou sur iOS
npm run ios
```

---

## 📖 Utilisation

### 1. Connexion
- **Option A** : Email + mot de passe (si compte déjà créé)
- **Option B** : Mot de passe oublié → réception OTP par SMS

### 2. Gestion des commandes
- **Dashboard** : Vue d'ensemble (CA du jour, nouvelles commandes)
- **Nouvelles** : Accepter ou refuser dans les 2 minutes
- **En cours** : Préparer, marquer prête, suivi livraison
- **Complétées** : Historique des commandes livrées

### 3. Menu
- Créer des catégories et des plats
- Ajouter photos, prix, options
- Gérer la disponibilité

### 4. Finances
- Consulter les revenus (revenu net = subtotal - commission)
- Statistiques et graphiques
- Demandes de retrait

### 5. Support
- Signaler un problème
- Chat en direct avec le support
- Appeler : 05 85 67 09 40 / 07 87 09 79 96

---

## 🛠️ Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm start` | Démarrer Expo |
| `npm run android` | Lancer sur Android |
| `npm run ios` | Lancer sur iOS |
| `npm run test:api` | Tester la connexion à l'API |

---

## ⚠️ Problèmes courants

Voir [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) pour les solutions détaillées.

| Problème | Solution rapide |
|----------|-----------------|
| Network Error | Vérifier l'IP dans `.env` et que le backend tourne |
| Erreur de syntaxe (TransformError) | Redémarrer Metro : `npx expo start --clear` |
| Commandes non reçues | Vérifier le mode maintenance dans les paramètres backend |

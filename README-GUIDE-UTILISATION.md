# 📱 Guide d'utilisation - Plateforme BAIBEBALO

Guide global pour utiliser les applications de la plateforme de livraison BAIBEBALO (Korhogo, Côte d'Ivoire).

---

## 🏗️ Architecture de la plateforme

```
BaibebaloProjets/
├── baibebalo-backend/      # API REST + WebSocket (Node.js/Express)
├── baibebalo-admin/        # Panel d'administration (React/Vite)
├── baibebalo-livreur/      # App mobile livreurs (React Native/Expo)
├── baibebalo-restaurant/   # App mobile restaurants (React Native/Expo)
└── baibebalo-client-clean/ # App mobile clients (React Native/Expo)
```

---

## 🚀 Ordre de démarrage (développement local)

### 1. Backend (obligatoire en premier)
```bash
cd baibebalo-backend
npm install
# Configurer .env (copier .env.example)
npm run dev
```
Le serveur affiche l'URL réseau (ex: `http://192.168.1.16:5000`). **Notez cette IP** pour les apps mobiles.

### 2. Applications mobiles (Livreur, Restaurant, Client)
Chaque app doit avoir `EXPO_PUBLIC_API_URL` pointant vers l'IP du backend dans son fichier `.env`.

### 3. Admin
```bash
cd baibebalo-admin
npm install
# Configurer .env avec VITE_API_URL
npm run dev
```

---

## 📚 Guides d’utilisation et formation

Les **guides détaillés** pour former les utilisateurs (restaurants, livreurs, clients) et une vue d’ensemble de la plateforme sont dans le dossier **`docs/guides/`** :

| Public | Guide | Description |
|--------|--------|-------------|
| **Tous** | [Guide général](docs/guides/00-GUIDE-GENERAL.md) | Vue d’ensemble plateforme, rôles, parcours d’une commande |
| **Restaurants** | [Guide Restaurant](docs/guides/01-GUIDE-RESTAURANT.md) | Connexion, commandes (accepter/refuser), menu, stats, finances, paramètres |
| **Livreurs** | [Guide Livreur](docs/guides/02-GUIDE-LIVREUR.md) | Inscription, statut, déroulement d’une course, gains, remise espèces, incidents |
| **Clients** | [Guide Client](docs/guides/03-GUIDE-CLIENT.md) | Commander, suivi, livraison, code de confirmation, support |

→ **Index complet** : [docs/guides/README.md](docs/guides/README.md)

---

## 🔧 Dépannage

En cas de problème, consultez **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** pour les solutions courantes.

---

## 📞 Contacts Baibebalo

- **Téléphone** : 05 85 67 09 40 / 07 87 09 79 96
- **Email** : support@baibebalo.ci

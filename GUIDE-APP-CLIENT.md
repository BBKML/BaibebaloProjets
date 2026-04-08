# 📱 Guide d'utilisation - App Client BAIBEBALO

Application mobile pour les clients qui commandent sur la plateforme BAIBEBALO.

---

## 🚀 Démarrage

### Prérequis
- Node.js 18+
- npm ou yarn
- Expo Go sur votre téléphone (même WiFi que le PC)

### Installation
```bash
cd baibebalo-client-clean
npm install
```

### Configuration
```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer .env pour le développement local
# EXPO_PUBLIC_API_URL=http://192.168.1.16:5000/api/v1
# Pour la production : https://baibebaloprojets.onrender.com/api/v1
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

### 1. Inscription / Connexion
- Entrez votre numéro de téléphone (format: +225 07 XX XX XX XX)
- Recevez le code OTP par SMS
- Validez le code (pas de mot de passe requis)

### 2. Passer une commande
- Parcourez les restaurants disponibles
- Ajoutez des plats au panier
- Choisissez l'adresse de livraison
- Sélectionnez le mode de paiement (Mobile Money, espèces)

### 3. Suivi
- Suivez la préparation en temps réel
- Suivez le livreur sur la carte
- Recevez une notification à la livraison

### 4. Support
- Centre d'aide
- Signaler un problème
- Contacter le support

---

## 🛠️ Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm start` | Démarrer Expo |
| `npm run android` | Lancer sur Android |
| `npm run ios` | Lancer sur iOS |
| `npm run test:e2e` | Tests E2E Maestro |

---

## ⚠️ Problèmes courants

Voir [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) pour les solutions détaillées.

| Problème | Solution rapide |
|----------|-----------------|
| Network Error | Vérifier l'IP dans `.env` |
| Aucun restaurant affiché | Vérifier que des restaurants sont actifs en base |
| OTP non reçu | Vérifier la config SMS du backend |

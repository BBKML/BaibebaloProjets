# 📱 Guide d'utilisation - App Livreur BAIBEBALO

Application mobile pour les livreurs de la plateforme BAIBEBALO.

---

## 🚀 Démarrage

### Prérequis
- Node.js 18+
- npm ou yarn
- Expo Go sur votre téléphone (même WiFi que le PC)

### Installation
```bash
cd baibebalo-livreur
npm install
```

### Configuration
```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer .env et mettre l'IP du backend (affichée au démarrage du backend)
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
- Entrez votre numéro de téléphone (format: +225 07 XX XX XX XX)
- Recevez le code OTP par SMS
- Validez le code pour vous connecter

### 2. Accepter une course
- Activez votre disponibilité sur l'écran d'accueil
- Les courses à proximité apparaissent automatiquement
- Appuyez sur "Accepter" dans le délai imparti (2 min)

### 3. Effectuer une livraison
- Récupérez la commande au restaurant
- Suivez la navigation vers le client
- Remettez la commande et validez le code de confirmation

### 4. Gains et remise espèces
- Consultez vos gains dans l'onglet "Gains"
- Remise espèces : sélectionnez les commandes à remettre
- Transférez le montant sur le Mobile Money Baibebalo (07 87 09 79 96)

---

## 🛠️ Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm start` | Démarrer Expo (mode développement) |
| `npm run android` | Lancer sur émulateur/appareil Android |
| `npm run ios` | Lancer sur simulateur iOS |
| `npm run test:api` | Tester la connexion à l'API |
| `npm run build:android:prod` | Build APK production (EAS) |

---

## ⚠️ Problèmes courants

Voir [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) pour les solutions détaillées.

| Problème | Solution rapide |
|----------|-----------------|
| Network Error | Vérifier que le backend tourne et que l'IP dans `.env` est correcte |
| OTP non reçu | Vérifier le provider SMS dans la config backend (dev = logs uniquement) |
| App ne se connecte pas | Téléphone et PC doivent être sur le même WiFi |

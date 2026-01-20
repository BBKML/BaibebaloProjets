# 📱 Créer un compte client de test

## Méthode 1 : Via le script backend (Recommandé)

### Étape 1 : Créer le compte dans la base de données

```bash
cd baibebalo-backend
node scripts/create-test-client.js
```

Ce script va :
- ✅ Créer un compte client avec le numéro `+2250700000000`
- ✅ Générer les tokens d'accès
- ✅ Afficher toutes les informations nécessaires

### Étape 2 : Utiliser le compte dans l'app mobile

**Option A : Via OTP (processus normal)**
1. Ouvrez l'application mobile
2. Entrez le numéro : `0700000000` ou `+2250700000000`
3. Demandez un code OTP
4. Le code sera visible dans les logs du serveur en mode développement

**Option B : Utiliser directement les tokens**
Si vous avez besoin de vous connecter directement sans OTP, vous pouvez modifier temporairement le code pour utiliser les tokens générés.

## Méthode 2 : Via l'API directement

### Étape 1 : Envoyer un OTP

```bash
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+2250700000000"
  }'
```

### Étape 2 : Vérifier l'OTP (créer le compte)

```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+2250700000000",
    "code": "123456",
    "first_name": "Jean",
    "last_name": "Kouassi"
  }'
```

**Note** : Le code OTP sera visible dans les logs du serveur en mode développement.

## Informations du compte de test

- **Téléphone** : `+2250700000000` ou `0700000000`
- **Prénom** : Jean
- **Nom** : Kouassi
- **Email** : test.client@baibebalo.ci

## 🔧 Configuration

Assurez-vous que :
1. ✅ Le backend est démarré (`npm start` dans `baibebalo-backend`)
2. ✅ La base de données est accessible
3. ✅ Le serveur écoute sur le port configuré (par défaut 3000)

## 📝 Notes importantes

- Le compte sera créé avec le statut `active`
- Un code de parrainage unique sera généré automatiquement
- Les points de fidélité commencent à 0
- Le compte peut être réutilisé pour tous vos tests

## 🐛 Dépannage

Si le script échoue :
1. Vérifiez que la base de données est accessible
2. Vérifiez les variables d'environnement dans `.env`
3. Vérifiez que les tables `users` et `otp_codes` existent
4. Consultez les logs du serveur pour plus de détails

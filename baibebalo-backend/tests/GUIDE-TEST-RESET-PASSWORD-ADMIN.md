# Guide de Test - Réinitialisation Mot de Passe Admin

## 📋 Prérequis

1. **Serveur backend démarré** :
   ```bash
   cd baibebalo-backend
   npm start
   # ou
   node src/server.js
   ```

2. **Admin existant** avec l'email `bookeleblan@gmail.com`

3. **Configuration email** dans `.env` :
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=bookeleblan@gmail.com
   EMAIL_PASSWORD=bbkml
   EMAIL_FROM=bookeleblan@gmail.com
   ADMIN_PANEL_URL=http://localhost:5174
   ```

---

## 🧪 Test Automatique

### Option 1 : Script de test automatique

```bash
cd baibebalo-backend
node tests/test-admin-password-reset.js
```

Le script va :
1. ✅ Vérifier que l'admin existe
2. ✅ Envoyer la demande de réinitialisation
3. ✅ Récupérer le token depuis la base de données
4. ✅ Réinitialiser le mot de passe
5. ✅ Tester la connexion avec le nouveau mot de passe

---

## 🧪 Test Manuel (Recommandé)

### Étape 1 : Demander la réinitialisation

**Via l'interface web :**
1. Ouvrez `http://localhost:5174/forgot-password`
2. Entrez l'email : `bookeleblan@gmail.com`
3. Cliquez sur "ENVOYER LE LIEN DE RÉINITIALISATION"

**Ou via API (curl/Postman) :**
```bash
curl -X POST http://localhost:5000/api/v1/auth/admin/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "bookeleblan@gmail.com"}'
```

**Résultat attendu :**
```json
{
  "success": true,
  "message": "Si cet email existe, vous recevrez un lien de réinitialisation par email."
}
```

### Étape 2 : Vérifier l'email

1. **Vérifiez votre boîte email** `bookeleblan@gmail.com`
2. **Ou consultez les logs du serveur** (en mode dev, le lien est affiché dans la console)

**Dans les logs backend, vous verrez :**
```
══════════════════════════════════════════════════════════════════
🔐 LIEN DE RÉINITIALISATION MOT DE PASSE ADMIN
══════════════════════════════════════════════════════════════════
   📧 Email: bookeleblan@gmail.com
   🔗 Lien: http://localhost:5174/reset-password?token=XXX&email=bookeleblan@gmail.com
   🔑 Token: [token_hex_64_caracteres]
   ⏰ Valide pendant: 1 heure
══════════════════════════════════════════════════════════════════
```

### Étape 3 : Récupérer le token depuis la base de données

Si l'email n'arrive pas, récupérez le token directement :

```sql
SELECT code, expires_at, created_at 
FROM otp_codes 
WHERE phone = 'bookeleblan@gmail.com' 
  AND type = 'admin_password_reset' 
  AND is_used = false
ORDER BY created_at DESC 
LIMIT 1;
```

### Étape 4 : Réinitialiser le mot de passe

**Via l'interface web :**
1. Ouvrez le lien depuis l'email ou les logs
2. Entrez un nouveau mot de passe (minimum 8 caractères)
3. Confirmez le mot de passe
4. Cliquez sur "Réinitialiser le mot de passe"

**Ou via API :**
```bash
curl -X POST http://localhost:5000/api/v1/auth/admin/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bookeleblan@gmail.com",
    "reset_token": "VOTRE_TOKEN_ICI",
    "new_password": "NouveauMotDePasse123!"
  }'
```

**Résultat attendu :**
```json
{
  "success": true,
  "message": "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter."
}
```

### Étape 5 : Tester la connexion

1. Allez sur `http://localhost:5174/login`
2. Entrez :
   - Email : `bookeleblan@gmail.com`
   - Mot de passe : Le nouveau mot de passe que vous avez défini
3. Cliquez sur "Se connecter"

**Résultat attendu :** Connexion réussie ✅

---

## 🔍 Vérifications

### Vérifier que le token est créé

```sql
SELECT * FROM otp_codes 
WHERE phone = 'bookeleblan@gmail.com' 
  AND type = 'admin_password_reset'
ORDER BY created_at DESC;
```

### Vérifier que le mot de passe a été mis à jour

```sql
SELECT id, email, full_name, updated_at 
FROM admins 
WHERE email = 'bookeleblan@gmail.com';
```

Le champ `updated_at` doit être mis à jour après la réinitialisation.

---

## ⚠️ Dépannage

### Problème : Email non reçu

1. **Vérifiez les logs du serveur** - Le lien est toujours affiché en mode dev
2. **Vérifiez la configuration email** dans `.env`
3. **Vérifiez les spams** dans votre boîte email
4. **Récupérez le token depuis la base de données** (voir Étape 3)

### Problème : Token expiré

- Les tokens expirent après 1 heure
- Demandez un nouveau lien de réinitialisation

### Problème : Token invalide

- Vérifiez que vous utilisez le bon token
- Vérifiez que le token n'a pas déjà été utilisé
- Vérifiez que l'email correspond exactement

### Problème : Erreur de connexion email

- Vérifiez `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD` dans `.env`
- Pour Gmail, vous devrez peut-être utiliser un "Mot de passe d'application" au lieu du mot de passe normal
- Activez l'accès aux applications moins sécurisées dans Gmail (ou utilisez OAuth2)

---

## 📝 Notes

- En mode développement, le lien de réinitialisation est toujours affiché dans les logs
- Le token est valide pendant 1 heure
- Le token ne peut être utilisé qu'une seule fois
- Le système ne révèle pas si l'email existe ou non (sécurité)

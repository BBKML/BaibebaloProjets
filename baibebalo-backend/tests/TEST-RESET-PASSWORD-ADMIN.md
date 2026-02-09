# 🧪 Test Réinitialisation Mot de Passe Admin

## 📋 Instructions de Test

### Étape 1 : Démarrer le serveur backend

Dans un terminal, démarrez le serveur :
```bash
cd baibebalo-backend
npm start
```

Attendez que le serveur affiche : `✅ Serveur démarré sur le port 5000`

---

### Étape 2 : Lancer le test automatique

Dans un **nouveau terminal** :
```bash
cd baibebalo-backend
node tests/test-admin-password-reset.js
```

Le script va :
1. ✅ Vérifier que l'admin `bookeleblan@gmail.com` existe
2. ✅ Envoyer la demande de réinitialisation
3. ✅ Récupérer le token depuis la base de données
4. ✅ Réinitialiser le mot de passe avec un mot de passe de test
5. ✅ Tester la connexion avec le nouveau mot de passe
6. ✅ Afficher l'URL complète pour test manuel

---

### Étape 3 : Test manuel via l'interface web

#### 3.1 Demander la réinitialisation

1. Ouvrez votre navigateur : `http://localhost:5174/forgot-password`
2. Entrez l'email : `bookeleblan@gmail.com`
3. Cliquez sur "ENVOYER LE LIEN DE RÉINITIALISATION"

**Vérification :**
- ✅ Message de succès affiché
- ✅ Email envoyé (vérifiez votre boîte email)
- ✅ **OU** consultez les logs du serveur backend (le lien est affiché)

#### 3.2 Réinitialiser le mot de passe

1. **Option A** : Cliquez sur le lien dans l'email reçu
2. **Option B** : Copiez le lien depuis les logs du serveur et collez-le dans le navigateur

Le lien ressemble à :
```
http://localhost:5174/reset-password?token=abc123...&email=bookeleblan@gmail.com
```

3. Sur la page de réinitialisation :
   - Entrez un nouveau mot de passe (minimum 8 caractères)
   - Confirmez le mot de passe
   - Cliquez sur "Réinitialiser le mot de passe"

**Résultat attendu :**
- ✅ Message de succès
- ✅ Redirection vers la page de connexion

#### 3.3 Tester la connexion

1. Allez sur `http://localhost:5174/login`
2. Entrez :
   - Email : `bookeleblan@gmail.com`
   - Mot de passe : Le nouveau mot de passe que vous avez défini
3. Cliquez sur "Se connecter"

**Résultat attendu :** ✅ Connexion réussie !

---

## 🔍 Vérifications dans les logs

Pendant le test, surveillez les logs du serveur backend. Vous devriez voir :

### 1. Demande de réinitialisation :
```
🔐 LIEN DE RÉINITIALISATION MOT DE PASSE ADMIN
📧 Email: bookeleblan@gmail.com
🔗 Lien: http://localhost:5174/reset-password?token=...
```

### 2. Email envoyé :
```
✅ Email envoyé avec succès
```

### 3. Mot de passe réinitialisé :
```
✅ Mot de passe admin réinitialisé
```

---

## ⚠️ Si l'email n'arrive pas

Le lien de réinitialisation est **toujours affiché dans les logs du serveur** en mode développement.

**Récupérez le token depuis la base de données :**

```sql
SELECT code, expires_at 
FROM otp_codes 
WHERE phone = 'bookeleblan@gmail.com' 
  AND type = 'admin_password_reset' 
  AND is_used = false
ORDER BY created_at DESC 
LIMIT 1;
```

Puis construisez l'URL manuellement :
```
http://localhost:5174/reset-password?token=[CODE]&email=bookeleblan@gmail.com
```

---

## ✅ Checklist de Test

- [ ] Serveur backend démarré
- [ ] Admin `bookeleblan@gmail.com` existe dans la base de données
- [ ] Test automatique exécuté avec succès
- [ ] Email de réinitialisation reçu OU lien récupéré depuis les logs
- [ ] Mot de passe réinitialisé via l'interface web
- [ ] Connexion réussie avec le nouveau mot de passe

---

## 📝 Notes

- Le token est valide pendant **1 heure**
- Le token ne peut être utilisé qu'**une seule fois**
- En mode développement, le lien est toujours affiché dans les logs (même si l'email échoue)
- Le système ne révèle pas si l'email existe ou non (sécurité)

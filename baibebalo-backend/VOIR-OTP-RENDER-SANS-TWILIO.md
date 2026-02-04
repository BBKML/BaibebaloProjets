# Voir les codes OTP sur Render sans payer Twilio

Tant que tu n’as pas souscrit à Twilio (ou un autre fournisseur SMS), tu peux quand même **voir les codes OTP** pour tester l’app.

---

## 1. Sur Render : variables d’environnement

Dans ton **Web Service** → **Environment**, ajoute ou modifie :

| Variable | Valeur |
|----------|--------|
| `SMS_PROVIDER` | `dev` |
| `DEBUG_OTP_RESPONSE` | `true` *(optionnel)* |

- **`SMS_PROVIDER=dev`** : aucun SMS n’est envoyé (pas d’appel à Twilio). Le code OTP est généré et **affiché dans les logs** Render.
- **`DEBUG_OTP_RESPONSE=true`** : en plus des logs, l’API **renvoie le code OTP dans la réponse** (champ `data.debug_otp`). Pratique pour le voir dans l’app ou dans l’onglet Réseau du navigateur.

Enregistre (**Save Changes**) puis redéploie si besoin.

---

## 2. Où voir le code OTP

### Option A : Logs Render

1. Render → ton **Web Service** → onglet **Logs**.
2. Demande un OTP depuis l’app (numéro de téléphone → « Envoyer le code »).
3. Dans les logs, cherche un bloc du type :
   ```
   🔐 CODE OTP GÉNÉRÉ
   📞 Numéro: +225...
   🔑 Code OTP: 123456
   ```
   Le code est sur la ligne **Code OTP**.

### Option B : Réponse API (si `DEBUG_OTP_RESPONSE=true`)

Si tu as mis **`DEBUG_OTP_RESPONSE=true`**, la réponse de `POST /api/v1/auth/send-otp` contient :

```json
{
  "success": true,
  "data": {
    "channels": { "sms": false, "whatsapp": false },
    "debug_otp": "123456"
  }
}
```

Tu peux voir **`debug_otp`** dans l’onglet **Réseau** (DevTools) du navigateur ou dans l’app si tu affiches cette donnée en test.

---

## 3. Quand tu auras Twilio

Quand tu souscris à Twilio :

1. Remplace **`SMS_PROVIDER`** par **`twilio`**.
2. Ajoute les variables Twilio (comme dans `.env.example`).
3. Enlève **`DEBUG_OTP_RESPONSE`** (ou mets `false`) pour ne plus renvoyer l’OTP dans la réponse.

Les vrais SMS seront alors envoyés et les utilisateurs recevront le code par SMS.

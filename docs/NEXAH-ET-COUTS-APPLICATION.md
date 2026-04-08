# Nexah et coûts de fonctionnement de l’application Baibebalo

Ce document répond à deux questions : **Nexah est-il bien configuré ?** et **Que faut-il encore payer pour que l’application fonctionne ?**

---

## 1. Nexah : état de la configuration

### 1.1 Ce qui est déjà en place

Nexah est **correctement intégré** dans le backend :

| Élément | Statut |
|--------|--------|
| **Config** (`src/config/index.js`) | ✅ `sms.nexah` avec `apiKey`, `senderId`, `endpoint` |
| **Service SMS** (`src/services/sms.service.js`) | ✅ Méthode `sendViaNexah(phone, message)` qui appelle l’API Nexah |
| **Variables d’environnement** (`.env`) | ✅ `NEXAH_API_KEY`, `NEXAH_SENDER_ID`, `NEXAH_ENDPOINT` renseignés |
| **Endpoint utilisé** | ✅ `https://api.nexah.net/api/v1/sms/send` |
| **Body envoyé** | ✅ `apiKey`, `from` (senderId), `to` (numéro), `message` |
| **Validation** | ✅ Au démarrage, le service vérifie que les champs requis pour Nexah sont présents |

Les SMS sont utilisés **uniquement pour les OTP** (connexion / inscription). Le reste des notifications passe par les **push** (Firebase), pour limiter les coûts.

### 1.2 Point important : activer Nexah en production

Dans votre fichier **`.env`** vous avez actuellement :

```env
SMS_PROVIDER=dev
```

- **`dev`** : aucun SMS n’est envoyé ; le code OTP est affiché dans les logs (pratique en développement).
- **`nexah`** : les SMS sont envoyés via Nexah (nécessaire en production pour que les utilisateurs reçoivent le code par SMS).

**Pour que les vrais SMS partent en production**, il faut :

1. Mettre dans `.env` (sur le serveur de production) :
   ```env
   SMS_PROVIDER=nexah
   ```
2. Garder les variables Nexah remplies :
   ```env
   NEXAH_API_KEY=votre_cle
   NEXAH_SENDER_ID=BAIBEBALO
   NEXAH_ENDPOINT=https://api.nexah.net/api/v1/sms/send
   ```
3. Redémarrer le backend après modification du `.env`.

### 1.3 Tester l’envoi Nexah

Depuis la racine du backend :

```bash
cd baibebalo-backend
# Mettre temporairement SMS_PROVIDER=nexah dans .env si vous voulez tester l’envoi réel
node tests/test-nexah-sms.js
```

Le script envoie un SMS de test au numéro indiqué dans le fichier (à adapter si besoin). Vérifiez aussi que votre **compte Nexah** a du crédit SMS.

### 1.4 Résumé Nexah

| Question | Réponse |
|----------|---------|
| Nexah est-il bien configuré dans le code ? | **Oui** (config + service + .env avec clé, sender, endpoint). |
| Les SMS partent-ils actuellement ? | **Non** tant que `SMS_PROVIDER=dev`. En production, mettre `SMS_PROVIDER=nexah`. |
| Que faire en plus ? | Mettre `SMS_PROVIDER=nexah` en prod, vérifier le crédit Nexah, et tester avec `test-nexah-sms.js` si besoin. |

---

## 2. Ce qu’il reste à payer pour le fonctionnement de l’application

Voici les **postes de coûts** liés au fonctionnement de Baibebalo (hébergement, SMS, optionnel : paiement en ligne, stockage, etc.).

### 2.1 Coûts quasi indispensables (pour faire tourner l’app)

| Poste | Rôle | Ordre de grandeur | Commentaire |
|-------|------|-------------------|-------------|
| **Serveur (VPS / hébergement)** | Héberger le backend, la base de données (et éventuellement l’admin) | 5 000 – 20 000 FCFA/mois | Sans serveur, l’API n’est pas accessible en production. |
| **Base de données** | PostgreSQL (souvent inclus avec le VPS ou proposé en add-on) | Souvent inclus dans le VPS | Sinon, compter un forfait selon l’hébergeur. |
| **Nexah (SMS OTP)** | Envoi du code OTP par SMS à chaque connexion / inscription | Variable selon le volume | ~15 FCFA par SMS. Ex. 500 connexions/mois ≈ 7 500 FCFA. Dépend du crédit acheté sur le compte Nexah. |
| **Nom de domaine** (optionnel mais recommandé) | Ex. api.baibebalo.ci, baibebalo.ci | ~1 000 FCFA/mois (ou annuel) | Utile pour une URL stable et pro. |

**Total indicatif “minimum”** : environ **15 000 – 30 000 FCFA/mois** (VPS + Nexah + éventuellement domaine), selon le volume de connexions et le choix d’hébergement.

### 2.2 Services gratuits (si vous restez dans les quotas)

| Service | Usage dans Baibebalo | Coût |
|---------|----------------------|------|
| **Firebase (FCM)** | Notifications push (commandes, livraison, etc.) | Gratuit (quota gratuit généralement suffisant) |
| **Stockage local (uploads)** | Photos (plats, profil) si `UPLOAD_PROVIDER=local` | Gratuit (espace disque du VPS) |
| **Email (SMTP Gmail ou autre)** | Envoi d’emails (optionnel) | Souvent gratuit jusqu’à un certain volume |

### 2.3 Coûts optionnels (selon les fonctionnalités activées)

| Poste | Quand ça devient payant | Ordre de grandeur |
|-------|------------------------|--------------------|
| **Paiement en ligne (Orange Money, MTN MoMo, FedaPay, Wave)** | Si vous activez le paiement en ligne côté backend et que vous souscrivez aux comptes marchands | Frais par transaction + éventuellement abonnement (dépend du partenaire). Actuellement le backend est en “cash” par défaut. |
| **Stockage cloud (S3, Cloudinary)** | Si vous mettez `UPLOAD_PROVIDER=s3` ou `cloudinary` pour les images | Selon le volume (stockage + bande passante). |
| **Redis** | Si vous activez Redis pour le cache / sessions (`REDIS_ENABLED=true`) | Souvent inclus sur un VPS ; sinon forfait selon l’hébergeur. |

### 2.4 Synthèse “qui paie quoi”

- **Nexah** : vous payez le **crédit SMS** sur votre compte Nexah (consommé à chaque OTP envoyé).
- **Hébergement (VPS, DB, domaine)** : **vous** les payez à l’hébergeur.
- **Firebase** : **gratuit** dans le cadre d’usage actuel (notifications push).
- **Paiement en ligne** : **vous** payez les frais aux opérateurs (Orange, MTN, etc.) ou agrégateurs (FedaPay, Wave) si vous les activez.
- **Stockage cloud (S3/Cloudinary)** : **vous** payez si vous quittez le stockage local.

Pour une **vision revenus / charges** (commissions, scénarios, charges à déduire), voir le fichier **`INVENTAIRE-FINANCIER.md`** à la racine du projet.

---

## 3. Checklist rapide “Nexah + production”

- [ ] Dans `.env` de production : `SMS_PROVIDER=nexah`
- [ ] `NEXAH_API_KEY`, `NEXAH_SENDER_ID`, `NEXAH_ENDPOINT` correctement renseignés
- [ ] Crédit SMS suffisant sur le compte Nexah
- [ ] Test d’envoi avec `node tests/test-nexah-sms.js` (en mettant temporairement `SMS_PROVIDER=nexah` si vous testez en local)
- [ ] Redémarrage du backend après toute modification du `.env`

---

*Dernière mise à jour : Février 2025. Pour les montants précis (Nexah, hébergeur, domaine), se référer aux tarifs actuels des fournisseurs.*

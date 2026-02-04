# Tester les 3 applications mobiles Baibebalo (Client, Restaurant, Livreur)

Méthode simple : **Expo Go + tunnel**. Aucun build EAS, aucun APK à générer. Tes amis installent Expo Go et scannent le QR code de l’app que tu leur montres.

Les trois apps utilisent déjà le backend **https://baibebaloprojets.onrender.com**.

---

## Les 3 applications

| App | Dossier | Rôle |
|-----|---------|------|
| **Client** | `baibebalo-client-clean` | Clients : commander, suivre commande, fidélité, etc. |
| **Restaurant** | `baibebalo-restaurant` | Restaurants : menu, commandes, statistiques, etc. |
| **Livreur** | `baibebalo-livreur` | Livreurs : missions, livraisons, gains, etc. |

---

## Méthode simple : Expo Go + tunnel (pour les 3 apps)

### Côté toi (pour chaque app à tester)

Tu ouvres **un terminal par app** (ou tu lances une app après l’autre).

**1. App Client**
```bash
cd C:\Users\booke\BaibebaloProjets\baibebalo-client-clean
npm start
```
→ Appuie sur **`t`** pour lancer le **tunnel** → un **QR code** s’affiche. Partage-le pour que tes amis testent l’app **Client**.

**2. App Restaurant**
```bash
cd C:\Users\booke\BaibebaloProjets\baibebalo-restaurant
npm start
```
→ Appuie sur **`t`** pour le **tunnel** → **QR code** pour l’app **Restaurant**.

**3. App Livreur**
```bash
cd C:\Users\booke\BaibebaloProjets\baibebalo-livreur
npm start
```
→ Appuie sur **`t`** pour le **tunnel** → **QR code** pour l’app **Livreur**.

---

### Côté tes amis

1. Ils installent **Expo Go** (Play Store ou App Store).
2. Ils scannent le **QR code** que tu leur envoies (ou que tu affiches) :
   - **QR Client** → ils testent en tant que client.
   - **QR Restaurant** → ils testent en tant que restaurant.
   - **QR Livreur** → ils testent en tant que livreur.
3. L’app se charge dans Expo Go et appelle le backend Render.

---

### En pratique

- Tu ne peux lancer **qu’une app à la fois** dans un même terminal (une fois le tunnel actif, tu restes sur cette app).
- Pour montrer les 3 apps : ouvre **3 terminaux** et lance `npm start` + tunnel dans chaque dossier (Client, Restaurant, Livreur). Tu auras **3 QR codes** à partager.
- Tant que le terminal (tunnel) reste ouvert, le lien du QR code fonctionne. Dès que tu fermes, il ne marche plus.

---

## Récapitulatif

| App | Commande | QR pour |
|-----|----------|--------|
| Client | `cd baibebalo-client-clean` puis `npm start` + `t` | Test client |
| Restaurant | `cd baibebalo-restaurant` puis `npm start` + `t` | Test restaurant |
| Livreur | `cd baibebalo-livreur` puis `npm start` + `t` | Test livreur |

Toutes pointent vers **https://baibebaloprojets.onrender.com**.

---

## Apps installées sur le téléphone (sans ton PC)

Pour que tes amis aient l’app **installée** sur leur téléphone et qu’ils puissent l’utiliser **même quand ton ordinateur est éteint**, il faut leur envoyer un **fichier APK** (Android). Deux options :

---

### Option A : GitHub Actions (recommandé – une fois configuré, tu cliques et tu récupères l’APK)

**Une seule fois** : tu crées un token Expo et tu l’ajoutes dans GitHub. Ensuite, à chaque fois que tu veux un nouvel APK, tu lances le workflow et tu récupères le lien de téléchargement.

1. **Créer un token Expo**  
   → https://expo.dev/accounts/baibebalo/settings/access-tokens  
   → **Create token** → copie le token.

2. **Ajouter le secret sur GitHub**  
   → Repo **BBKML/BaibebaloProjets** → **Settings** → **Secrets and variables** → **Actions**  
   → **New repository secret** : nom **`EXPO_TOKEN`**, valeur = le token → **Add secret**.

3. **Lancer un build**  
   → Onglet **Actions** → workflow **« EAS Build Client Android »** → **Run workflow**.  
   → Quand le job est terminé, ouvre le lien du build sur expo.dev et **télécharge l’APK**.  
   → Envoie le fichier APK (ou le lien) à tes amis ; ils l’installent sur leur téléphone. **Plus besoin de ton PC.**

Pour l’instant le workflow ne build que l’app **Client**. Pour **Restaurant** et **Livreur**, il faudrait ajouter des workflows similaires (ou les lancer un par un depuis WSL / un autre PC).

---

### Option B : WSL (Ubuntu) sur ton PC, puis build EAS

Sous Windows, le build EAS échoue souvent à cause de l’archive. Si tu lances le build **depuis Linux (WSL)** sur le même PC, ça peut passer.

1. **Installer Ubuntu sous Windows**  
   → Ouvre **Microsoft Store** → cherche **Ubuntu** → **Installer**.  
   → Ou dans un terminal Admin : `wsl --install Ubuntu` puis redémarre.

2. **Ouvrir Ubuntu** (menu Démarrer → Ubuntu).

3. **Dans le terminal Ubuntu** :
   ```bash
   cd /mnt/c/Users/booke/BaibebaloProjets/baibebalo-client-clean
   npm install -g eas-cli
   eas login
   eas build --platform android --profile preview
   ```
   → À la fin, EAS affiche un **lien pour télécharger l’APK**. Tu l’envoies à tes amis ; ils l’installent. **Ensuite ton PC peut être éteint.**

Pour **Restaurant** et **Livreur**, tu fais la même chose en changeant le dossier (`baibebalo-restaurant`, `baibebalo-livreur`) et en lançant `eas build` dans chaque projet.

---

### Récap

| Ce que tu veux | Solution |
|----------------|----------|
| Test rapide, ton PC allumé | Expo Go + tunnel (section ci-dessus) |
| App installée, PC éteint | Option A (GitHub Actions) ou Option B (WSL + EAS build) → tu récupères l’APK et tu le partages |

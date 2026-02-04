# Build / partage de l’app Client Baibebalo

---

## Méthode simple (recommandée) : Expo Go + tunnel

Pour les 3 apps (Client, Restaurant, Livreur) : voir **PARTAGE-APPS-MOBILES.md** à la racine du projet.

**Aucun build EAS, aucun token, pas de GitHub Actions.** Tes amis testent l’app directement avec Expo Go.

### Côté toi

1. Ouvre un terminal dans le projet client :
   ```bash
   cd C:\Users\booke\BaibebaloProjets\baibebalo-client-clean
   npm start
   ```
2. Quand le menu s’affiche, appuie sur **`t`** pour lancer le **tunnel** (ou choisis « Tunnel » dans le menu).
3. Un **QR code** s’affiche.

### Côté tes amis

1. Ils installent **Expo Go** depuis le Play Store (Android) ou l’App Store (iOS).
2. Ils scannent le **QR code** avec l’appareil photo (Android) ou avec l’app Expo Go (iOS).
3. L’app se charge dans Expo Go et utilise déjà le backend **https://baibebaloprojets.onrender.com**.

**Limite** : tant que tu laisses `npm start` (tunnel) ouvert sur ton PC, ils peuvent utiliser l’app. Dès que tu fermes, le lien ne marche plus. Idéal pour une démo ou un test ensemble.

---

## Méthode avancée : APK (EAS ou GitHub Actions)

Si tu veux un **fichier APK** à partager (sans avoir à lancer le tunnel), tu peux utiliser EAS Build. Sous Windows, l’archive peut provoquer une erreur « tar » ; une option est de lancer le build depuis **GitHub Actions** (Linux).

### 1. Créer un token Expo

1. Va sur **https://expo.dev/accounts/baibebalo/settings/access-tokens**
2. **Create token** → donne un nom (ex. `github-actions`) → **Create**
3. **Copie le token** (tu ne pourras plus le revoir ensuite)

### 2. Ajouter le secret sur GitHub

1. Repo **BBKML/BaibebaloProjets** sur GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret**
   - Name : **`EXPO_TOKEN`**
   - Value : colle le token Expo
4. **Add secret**

### 3. Lancer le build

1. **Pousse le code** (commit + push) pour que le workflow soit bien présent
2. Onglet **Actions** → workflow **« EAS Build Client Android »**
3. **Run workflow** → **Run workflow**
4. Le job tourne sur **Linux** ; à la fin, le build EAS est visible sur **https://expo.dev** (compte baibebalo, projet baibebalo-client). Tu peux télécharger l’APK depuis le lien du build.

---

### 4. Build en local (Windows) si tu veux réessayer plus tard

- WSL : installe une distribution (ex. `wsl --install Ubuntu`), redémarre, puis dans WSL :
  ```bash
  cd /mnt/c/Users/booke/BaibebaloProjets/baibebalo-client-clean
  npm install -g eas-cli
  eas login
  eas build --platform android --profile preview
  ```
- Ou continue à utiliser uniquement le workflow GitHub Actions ci-dessus.

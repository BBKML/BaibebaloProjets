# Option B : Build APK avec WSL (Ubuntu)

Guide pour générer les **3 APK** (Client, Restaurant, Livreur) depuis **Ubuntu sous Windows**, sans erreur « tar ». Une fois les APK récupérés, tu les envoies à tes amis ; ils les installent et peuvent utiliser l’app **même quand ton PC est éteint**.

---

## Étape 1 : Installer Ubuntu (WSL)

1. Ouvre **Microsoft Store** (Windows).
2. Cherche **Ubuntu** → **Obtenir** / **Installer**.
3. Quand c’est installé, **redémarre** le PC si on te le demande.
4. Ouvre **Ubuntu** depuis le menu Démarrer (tape « Ubuntu »).

À la première ouverture, Ubuntu peut demander un **nom d’utilisateur** et un **mot de passe** (pour WSL uniquement). Choisis-les et retiens-les.

---

## Étape 2 : Installer Node et EAS dans Ubuntu

Dans le **terminal Ubuntu**, exécute :

```bash
# Mettre à jour les paquets
sudo apt update

# Installer Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Vérifier
node -v
npm -v

# Installer EAS CLI
sudo npm install -g eas-cli

# Se connecter à Expo (email + mot de passe du compte baibebalo)
eas login
```

Utilise le même compte que sur **expo.dev** (ex. **bookeleblan@gmail.com**).

---

## Étape 3 : Build de l’app Client

```bash
cd /mnt/c/Users/booke/BaibebaloProjets/baibebalo-client-clean
npm install
eas build --platform android --profile preview
```

- La première fois, EAS peut demander de confirmer le projet → valide.
- À la fin, un **lien** s’affiche pour **télécharger l’APK**. Ouvre-le dans un navigateur, télécharge l’APK et garde-le (ex. pour le partager).

---

## Étape 4 : Build de l’app Livreur

```bash
cd /mnt/c/Users/booke/BaibebaloProjets/baibebalo-livreur
npm install
eas init
```
À « Create a new project » → **Yes** (ou lie à un projet existant si tu en as un pour Livreur).

```bash
eas build --platform android --profile preview
```

Récupère le **lien de l’APK** à la fin du build.

---

## Étape 5 : Build de l’app Restaurant

```bash
cd /mnt/c/Users/booke/BaibebaloProjets/baibebalo-restaurant
npm install
eas init
```
À « Create a new project » → **Yes** (ou lie à un projet existant).

```bash
eas build --platform android --profile preview
```

Récupère le **lien de l’APK** à la fin du build.

---

## Récap des commandes (dans l’ordre)

| App        | Commandes (dans Ubuntu) |
|-----------|--------------------------|
| **Client**    | `cd /mnt/c/Users/booke/BaibebaloProjets/baibebalo-client-clean` → `npm install` → `eas build --platform android --profile preview` |
| **Livreur**   | `cd /mnt/c/Users/booke/BaibebaloProjets/baibebalo-livreur` → `npm install` → `eas init` → `eas build --platform android --profile preview` |
| **Restaurant**| `cd /mnt/c/Users/booke/BaibebaloProjets/baibebalo-restaurant` → `npm install` → `eas init` → `eas build --platform android --profile preview` |

Chaque build peut prendre **plusieurs minutes**. Les 3 apps pointent déjà vers **https://baibebaloprojets.onrender.com**.

Une fois les 3 APK téléchargés, envoie-les à tes amis (fichier ou lien) ; ils les installent sur leur téléphone et peuvent les utiliser **sans que ton PC soit allumé**.

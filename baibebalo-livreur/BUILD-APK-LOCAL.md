# Générer l’APK en local (sans EAS cloud)

Projet : **Expo SDK 54** (BAIBEBALO Livreur).

Tu peux obtenir un APK à partager avec tes amis **sans utiliser le quota EAS** en lançant le build sur ta machine.

---

## Méthode 1 : EAS Build en local (recommandée)

Même commande qu’en cloud, mais le build tourne chez toi → **aucun quota consommé**.

### Commande (WSL ou Linux)

```bash
cd /mnt/c/Users/booke/BaibebaloProjets/baibebalo-livreur
eas build --platform android --profile preview --local
```

### Prérequis

- **Node.js** et **npm** (déjà là si tu fais du Expo)
- **Android SDK** et **Android NDK** installés sur la même machine (WSL ou Windows)

#### Installer Android SDK + NDK (WSL / Linux)

1. Télécharge Android Studio ou le “command line tools” :  
   https://developer.android.com/studio  
2. Installe et ouvre Android Studio → **Settings / SDK Manager** :
   - onglet **SDK Platforms** : coche au moins une version (ex. Android 14)
   - onglet **SDK Tools** : coche **Android SDK Build-Tools**, **NDK**, **CMake**
3. Définir les variables d’environnement (à mettre dans `~/.bashrc` ou `~/.zshrc`) :

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
```

Puis : `source ~/.bashrc` (ou `~/.zshrc`).

#### Si tu es sous Windows (PowerShell)

Installe Android Studio pour Windows, puis dans PowerShell (en adaptant le chemin si besoin) :

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
```

Lance la commande depuis le dossier du projet :

```powershell
cd C:\Users\booke\BaibebaloProjets\baibebalo-livreur
eas build --platform android --profile preview --local
```

### Résultat

À la fin du build, l’APK est créé dans le répertoire courant (ou dans le dossier indiqué par EAS dans le terminal). Tu peux l’envoyer à tes amis pour qu’ils l’installent.

---

## Méthode 2 : Prebuild + Gradle (sans EAS)

Génération du projet Android puis build avec Gradle. Aussi sans quota EAS.

### 1. Générer le dossier `android/`

```bash
cd /mnt/c/Users/booke/BaibebaloProjets/baibebalo-livreur
npx expo prebuild --platform android
```

### 2. Builder l’APK release

**Sous WSL / Linux :**

```bash
cd android
./gradlew assembleRelease
```

**Sous Windows (CMD ou PowerShell) :**

```cmd
cd android
gradlew.bat assembleRelease
```

### 3. Où est l’APK ?

Fichier généré :

```
android/app/build/outputs/apk/release/app-release.apk
```

Tu peux copier ce fichier et l’envoyer à tes amis pour qu’ils l’installent sur leur téléphone Android.

### Prérequis Méthode 2

- Node.js, npm
- **Java JDK 17** (recommandé pour les projets Expo récents)
- **Android SDK** (Android Studio ou “command line tools”)

#### Installer Java (WSL / Ubuntu)

```bash
sudo apt update
sudo apt install -y openjdk-17-jdk
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc
echo 'export PATH=$JAVA_HOME/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

#### SDK Android « SDK location not found »

Si tu builds **sous WSL** et que tu as Android Studio (et le SDK) **sous Windows**, crée le fichier `android/local.properties` avec le chemin du SDK côté WSL :

```properties
sdk.dir=/mnt/c/Users/booke/AppData/Local/Android/Sdk
```

(Si ton SDK est ailleurs, ouvre Android Studio → Settings → Android SDK et note « Android SDK Location » ; adapte le chemin en style WSL, ex. `C:\...` → `/mnt/c/...`.)

#### Erreurs I/O ou « Build Tools corrupted » sous WSL

- **Cache Gradle sur le disque Windows** : mettre le cache dans le FS WSL évite beaucoup d’erreurs. Avant de lancer le build :
  ```bash
  export GRADLE_USER_HOME=~/.gradle
  ./gradlew --stop
  ```
  Puis relancer `./gradlew assembleRelease`.

- **Build Tools 35.0.0 corrupted / AAPT manquant** : le projet est configuré pour utiliser **34.0.0**. Dans Android Studio (Windows) : **SDK Manager** → onglet **SDK Tools** → coche **Android SDK Build-Tools 34.0.0** → Apply. Si besoin, décocher 35.0.0 pour libérer de l’espace.

Même réglage de `ANDROID_HOME` / `ANDROID_SDK_ROOT` que pour la méthode 1 si besoin.

---

## Récap

| Méthode              | Commande / étapes                    | Quota EAS | Prérequis              |
|----------------------|--------------------------------------|-----------|-------------------------|
| EAS build local      | `eas build -p android --profile preview --local` | Non       | SDK + NDK (ou Docker)   |
| Prebuild + Gradle    | `expo prebuild` puis `gradlew assembleRelease`    | Non       | JDK 17 + Android SDK    |

Les deux méthodes produisent un APK que tu peux partager pour installation manuelle (hors Play Store).

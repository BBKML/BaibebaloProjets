# Guide – Configuration de l’adresse réseau (Baibebalo)

Ce guide explique comment configurer l’**adresse réseau** de l’API et des applications pour accéder au backend depuis un téléphone ou un autre PC sur le même Wi‑Fi (ex. `http://192.168.1.13:5000`).

---

## 1. Où trouver l’IP à utiliser

Au démarrage du backend, le serveur affiche l’URL réseau à utiliser :

```
🚀 BAIBEBALO API - SERVEUR DÉMARRÉ
   🌐 URL réseau: http://192.168.1.13:5000
   💡 Pour accéder depuis un téléphone, utilisez: http://192.168.1.13:5000
```

- **Utilisez cette IP** (ici `192.168.1.13`) dans toutes les applications qui doivent joindre l’API en dev.
- Si vous changez de réseau ou de machine, l’IP peut changer. Refaites la configuration avec la nouvelle IP affichée au démarrage du backend.

---

## 2. Récapitulatif par application

| Application        | Fichier(s) à modifier                    | Variable(s) d'environnement              |
|--------------------|------------------------------------------|-------------------------------------------|
| **Backend**        | Aucun (IP affichée automatiquement)      | —                                         |
| **Admin (Vite)**   | `baibebalo-admin/.env`                   | `VITE_API_URL`, `VITE_BACKEND_URL`        |
| **Client (Expo)**  | `baibebalo-client-clean/.env`            | `EXPO_PUBLIC_API_URL`                     |
| **Livreur (Expo)** | `baibebalo-livreur/.env`                 | `EXPO_PUBLIC_API_URL`                     |
| **Restaurant (Expo)** | `baibebalo-restaurant/.env`            | `EXPO_PUBLIC_API_URL`                     |

---

## 3. Étapes détaillées

### 3.1 Backend

- Aucune config à faire pour l’IP réseau : le serveur l’affiche au démarrage.
- Assurez-vous que le **pare-feu** autorise le port **5000** en entrée sur votre machine si vous voulez y accéder depuis le téléphone ou un autre PC.

### 3.2 Admin (interface web)

1. Ouvrir le dossier **`baibebalo-admin`**.
2. Créer ou modifier le fichier **`.env`** (vous pouvez partir de **`.env.example`**).
3. Renseigner (en remplaçant `192.168.1.13` par votre IP si différente) :

```env
VITE_API_URL=http://192.168.1.13:5000/api/v1
VITE_BACKEND_URL=http://192.168.1.13:5000
```

4. Redémarrer le serveur de dev (ex. `npm run dev`) pour que les variables soient prises en compte.

### 3.3 Client (app mobile client)

1. Ouvrir le dossier **`baibebalo-client-clean`**.
2. Créer ou modifier **`.env`** (à partir de **`.env.example`** si besoin).
3. Mettre :

```env
EXPO_PUBLIC_API_URL=http://192.168.1.13:5000/api/v1
```

4. Redémarrer Expo (ex. `npx expo start`).

### 3.4 Livreur (app mobile livreur)

1. Ouvrir le dossier **`baibebalo-livreur`**.
2. Créer **`.env`** (copier **`.env.example`** si le fichier n’existe pas) puis modifier.
3. Mettre :

```env
EXPO_PUBLIC_API_URL=http://192.168.1.13:5000/api/v1
```

4. Redémarrer Expo.

### 3.5 Restaurant (app mobile restaurant)

1. Ouvrir le dossier **`baibebalo-restaurant`**.
2. Créer **`.env`** (copier **`.env.example`** si le fichier n’existe pas) puis modifier.
3. Mettre :

```env
EXPO_PUBLIC_API_URL=http://192.168.1.13:5000/api/v1
```

4. Redémarrer Expo.

---

## 4. Vérifications rapides

- **Backend** : dans un navigateur ou avec `curl`, ouvrir `http://VOTRE_IP:5000/health` (ex. `http://192.168.1.13:5000/health`). Vous devez avoir une réponse du serveur.
- **Téléphone** : être sur le **même réseau Wi‑Fi** que la machine qui héberge le backend.
- **Admin** : après avoir mis à jour `.env` et redémarré, l’admin doit charger les données depuis `http://VOTRE_IP:5000`.

---

## 5. En cas de changement d’IP

Si vous changez de réseau ou de PC :

1. Redémarrer le backend et noter la nouvelle **URL réseau** affichée.
2. Mettre à jour **la même IP** dans chaque **`.env`** (admin, client, livreur, restaurant) comme indiqué ci‑dessus.
3. Redémarrer chaque app (admin dev server, Expo client, livreur, restaurant).

---

## 6. Production

En production, vous n’utilisez pas l’IP locale. Vous configurez une URL publique (ex. `https://api.baibebalo.ci` ou `https://baibebaloprojets.onrender.com`) dans les variables d’environnement de build (EAS, Vite, etc.) ; les `.env` locaux ne sont pas utilisés sur les builds de prod.

---

**Résumé** : utilisez toujours l’IP affichée au démarrage du backend (`🌐 URL réseau`) dans les fichiers `.env` de chaque application, avec le port `5000` et, pour l’API, le préfixe `/api/v1` où indiqué.

# Pourquoi ça marche en terminal mais pas dans les APK envoyés aux amis ?

## En résumé

| Problème | Cause principale | Solution |
|----------|------------------|----------|
| **Images ne s'affichent pas** (placeholders gris) | En dev vous utilisez souvent le backend local où les uploads existent ; en APK l'app appelle Render où les **fichiers uploadés ne sont pas persistants** (disque éphémère). | Stockage externe (S3/Cloudinary) pour les images en production, ou accepter que sur Render gratuit les images peuvent disparaître. |
| **App Livreur se ferme** | Ancienne version de l'APK (avant correctifs) ou **MapView** qui plante sur certains appareils Android. | Reconstruire l'APK Livreur avec les derniers correctifs ; sur certains téléphones, désactiver temporairement la carte si le crash persiste. |
| **« Voir statistiques » en erreur (admin)** | Le backend interrogeait une colonne `restaurant_rating` dans la table `orders` alors qu’elle n’existe que dans `reviews`. | Corrigé côté backend (requête basée sur la table `reviews`). Redéployer le backend. |
| **Menus pas affichés** | Erreur 500 sur mise à jour menu (options) ou **URL d’API incorrecte** dans l’APK. | Backend corrigé (customization_options → options). Vérifier que l’APK a bien été buildé avec `EXPO_PUBLIC_API_URL` = URL Render (déjà dans `eas.json`). |

---

## 1. Images : terminal vs APK

- **En terminal (Expo / `npm start`)**  
  L’app tourne sur votre machine et utilise en général une URL d’API locale (ex. `http://192.168.x.x:5000/api/v1`). Les images sont servies par votre backend local depuis le dossier `uploads/`, qui existe et persiste sur votre PC.

- **Dans l’APK**  
  L’app est buildée avec `EXPO_PUBLIC_API_URL` = `https://baibebaloprojets.onrender.com/api/v1` (dans `eas.json`). Donc elle charge les images depuis Render. Sur Render (plan gratuit), le **système de fichiers est éphémère** : tout ce qui est dans `uploads/` peut disparaître au redémarrage ou au redéploiement. Si le fichier n’existe plus, l’URL renvoie 404 → placeholder gris.

**À faire :**  
Pour des images stables pour vos amis, configurer un stockage externe (S3 ou Cloudinary) et faire servir les images depuis là. Le backend supporte déjà l’upload S3/Cloudinary.

---

## 2. App Livreur qui se ferme

- **Ancien APK**  
  Si l’APK a été généré avant les correctifs (store, `DeliveryHomeScreen`, etc.), il peut encore crasher au chargement de l’accueil.

- **Carte (MapView)**  
  Sur certains appareils Android, le module natif de la carte peut planter (Google Play Services, permissions, etc.). Les correctifs réduisent les risques côté données ; si le crash continue, il peut venir de la carte.

**À faire :**  
1. Reconstruire l’APK Livreur avec le code à jour (EAS ou WSL) et renvoyer ce nouvel APK aux amis.  
2. Si ça plante encore sur certains téléphones, on peut ajouter une option pour désactiver la carte sur l’écran d’accueil (affichage simplifié sans carte).

---

## 3. Admin : « Erreur lors de la récupération des statistiques »

La requête utilisait `orders.restaurant_rating`, alors que cette colonne n’existe que dans la table **reviews**. La requête a été corrigée pour utiliser `reviews` et les réponses vides sont gérées.

**À faire :**  
Pousser les modifs et redéployer le backend sur Render. Le bouton « Voir statistiques » doit ensuite fonctionner.

---

## 4. Menus pas affichés

- **Côté backend**  
  La mise à jour des articles avec options (PUT menu) renvoyait une erreur à cause de la colonne `customization_options` inexistante. C’est corrigé (mapping vers la colonne `options`).

- **Côté APK**  
  Si l’APK a été buildé avec la bonne config (`eas.json` avec `EXPO_PUBLIC_API_URL` = Render), les menus devraient s’afficher une fois le backend à jour. Si vous aviez buildé sans cette variable ou avec une mauvaise URL, les appels API (dont le menu) peuvent échouer.

**À faire :**  
Redéployer le backend, puis reconstruire les APK (Client, Restaurant, Livreur) avec le code actuel et la même URL Render dans `eas.json`.

---

## 5. Vérifier la config des builds

Dans chaque projet (client, livreur, restaurant), `eas.json` doit avoir pour le profil **preview** (et **production**) :

```json
"env": {
  "EXPO_PUBLIC_API_URL": "https://baibebaloprojets.onrender.com/api/v1"
}
```

C’est déjà le cas dans votre dépôt. Lors du build EAS, cette valeur est injectée ; l’APK utilisera donc bien l’API Render. Les différences de comportement viennent surtout de :

- **Images** : absence de persistance des uploads sur Render.  
- **Livreur** : ancien APK ou crash natif (carte).  
- **Admin stats** : requête SQL corrigée, à déployer.  
- **Menus** : correctifs backend déployés + APK à jour.

---

## Récap des actions

1. **Backend** : pousser les corrections (statistiques, menu, etc.) et redéployer sur Render.  
2. **Admin** : aucune action côté code si vous utilisez le backend déployé ; « Voir statistiques » marchera après redéploiement backend.  
3. **APK Client / Restaurant / Livreur** : reconstruire avec EAS (ou WSL si besoin) et **redistribuer les nouveaux APK** à vos amis.  
4. **Images durables** : à terme, configurer S3 ou Cloudinary pour les uploads en production.

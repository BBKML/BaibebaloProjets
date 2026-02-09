# Instructions de Démarrage - Paramètres Généraux

## ✅ Corrections Appliquées

Les chemins d'import ont été corrigés :
- ✅ `src/utils/settings.js` : utilise maintenant `../database/db`
- ✅ `src/utils/syncSettings.js` : utilise maintenant `../database/db`
- ✅ `tests/test-sync-settings.js` : chemins corrigés

## 🚀 Démarrage du Serveur

**IMPORTANT** : Vous devez redémarrer le serveur pour que les nouvelles routes soient disponibles.

### Étape 1 : Arrêter le serveur actuel (si en cours)

Appuyez sur `Ctrl+C` dans le terminal où le serveur tourne.

### Étape 2 : Redémarrer le serveur

```bash
cd baibebalo-backend
npm start
```

### Étape 3 : Vérifier les logs

Vous devriez voir dans les logs :

```
🔄 Synchronisation des paramètres depuis config/index.js...
✅ Synchronisation terminée: 13 paramètres synchronisés (X créés, Y mis à jour)
```

Et plus loin :

```
✅ Serveur démarré avec succès!
```

## 🧪 Tests

### Test 1 : Synchronisation (sans serveur)

```bash
cd baibebalo-backend
node tests/test-sync-settings.js
```

**Résultat attendu** :
```
✅ Tous les paramètres sont correctement synchronisés
✅ Les valeurs correspondent à config/index.js
```

### Test 2 : Route publique (serveur doit être démarré)

```bash
cd baibebalo-backend
node tests/test-public-settings.js
```

**Résultat attendu** :
```
✅ Route accessible sans authentification
✅ Tous les paramètres critiques sont présents
✅ La route publique fonctionne correctement
```

### Test 3 : Test manuel avec curl

```bash
curl http://localhost:5000/api/v1/public/settings
```

Ou dans le navigateur :
```
http://localhost:5000/api/v1/public/settings
```

**Résultat attendu** :
```json
{
  "success": true,
  "data": {
    "settings": {
      "payment.enabledMethods": {
        "value": ["cash"],
        "description": "..."
      },
      ...
    },
    "timestamp": "2026-02-07T12:00:00.000Z"
  }
}
```

## ✅ Vérification Rapide

1. **Le serveur démarre sans erreur** ✅
2. **La synchronisation s'exécute au démarrage** ✅
3. **La route `/api/v1/public/settings` est accessible** ✅
4. **Les paramètres sont retournés correctement** ✅

## 🔧 Dépannage

### Problème : Route 404

**Solution** : Redémarrer le serveur pour charger les nouvelles routes.

### Problème : Erreur de synchronisation

**Solution** : Vérifier la connexion à la base de données dans `.env`.

### Problème : Paramètres manquants

**Solution** : Exécuter manuellement la synchronisation :
```bash
node tests/test-sync-settings.js
```

## 📝 Résumé

- ✅ Tous les fichiers sont créés et corrigés
- ✅ Les chemins d'import sont corrects
- ✅ La synchronisation fonctionne (testé avec succès)
- ⚠️ **Le serveur doit être redémarré** pour que la route publique soit disponible

Une fois le serveur redémarré, tout devrait fonctionner correctement ! 🎉

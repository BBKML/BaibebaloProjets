# 🐛 Debug de l'erreur "Something went wrong"

## 📋 Étapes de diagnostic

### 1️⃣ Voir les logs d'erreur détaillés

Dans Expo Go, appuyez sur **"View error log"** pour voir l'erreur complète.

### 2️⃣ Vérifier les logs dans le terminal

Regardez le terminal où vous avez lancé `npm start` - il devrait afficher l'erreur JavaScript complète.

### 3️⃣ Problèmes courants et solutions

#### Problème : Module non trouvé
**Erreur typique** : `Cannot find module '...'`

**Solution** :
```bash
npm install
npm start -- --clear
```

#### Problème : Erreur avec react-native-reanimated
**Erreur typique** : `Reanimated 2 failed to create a worklet`

**Solution** : Vérifiez que le plugin est bien dans `babel.config.js` :
```js
plugins: ['react-native-reanimated/plugin']
```

#### Problème : Erreur avec Zustand
**Erreur typique** : `Cannot read property '...' of undefined`

**Solution** : Vérifiez que les stores sont bien initialisés.

#### Problème : Erreur avec Navigation
**Erreur typique** : `The action 'NAVIGATE' with payload ... was not handled`

**Solution** : Vérifiez que toutes les routes sont bien définies.

## 🔍 Vérifications à faire

1. ✅ Tous les modules sont installés (`npm install`)
2. ✅ `babel.config.js` contient le plugin reanimated
3. ✅ Pas d'imports de modules incompatibles avec Expo Go
4. ✅ Les chemins d'imports sont corrects

## 📝 Prochaines étapes

**Copiez-collez ici** :
1. Le message d'erreur complet depuis "View error log"
2. Les logs du terminal
3. Je vous aiderai à corriger ! 💪

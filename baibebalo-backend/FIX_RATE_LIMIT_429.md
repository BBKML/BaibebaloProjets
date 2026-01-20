# 🔧 Fix : Erreur 500 au lieu de 429 pour le Rate Limiting

## 📋 Problème

Quand l'utilisateur essaie d'envoyer un OTP trop rapidement, le backend retournait une **erreur 500** au lieu d'un **429 (Too Many Requests)**.

### Erreur dans les logs :
```
17:10:22 [error]: Erreur création OTP {"error":"Veuillez attendre 1 minute avant de demander un nouveau code"}
17:10:22 [error]: Erreur sendOTP {"error":"Veuillez attendre 1 minute avant de demander un nouveau code"}
17:10:22 [error]: Erreur non gérée {"error":"Veuillez attendre 1 minute avant de demander un nouveau code"}
POST /api/v1/auth/send-otp 500 47.894 ms - 539
```

## ✅ Solution

### Modification du contrôleur `auth.controller.js`

Le contrôleur détecte maintenant les erreurs de rate limiting et retourne un **429** avec le bon format :

```javascript
async sendOTP(req, res, next) {
  try {
    const { phone } = req.body;
    const code = await authService.createOTP(phone);
    await smsService.sendOTP(phone, code);
    
    res.json({
      success: true,
      message: 'Code OTP envoyé par SMS',
    });
  } catch (error) {
    logger.error('Erreur sendOTP', { error: error.message });
    
    // Détecter les erreurs de rate limiting et retourner un 429
    if (error.message && error.message.includes('attendre') && error.message.includes('minute')) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: error.message,
        },
      });
    }
    
    // Pour les autres erreurs, passer au middleware d'erreur
    next(error);
  }
}
```

## 🎯 Résultat

### Avant :
- ❌ Erreur 500 (Internal Server Error)
- ❌ Le client ne peut pas distinguer une erreur de rate limiting d'une vraie erreur serveur

### Après :
- ✅ Erreur 429 (Too Many Requests)
- ✅ Format de réponse cohérent avec le rate limiter middleware
- ✅ Le client peut correctement afficher le message d'erreur

## 📱 Format de réponse

### Erreur 429 (Rate Limiting) :
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Veuillez attendre 1 minute avant de demander un nouveau code"
  }
}
```

### Succès :
```json
{
  "success": true,
  "message": "Code OTP envoyé par SMS"
}
```

## ✅ Statut

- ✅ Contrôleur modifié pour détecter les erreurs de rate limiting
- ✅ Retourne un 429 au lieu d'un 500
- ✅ Format de réponse cohérent avec le rate limiter middleware
- ✅ Le client peut maintenant correctement gérer l'erreur 429

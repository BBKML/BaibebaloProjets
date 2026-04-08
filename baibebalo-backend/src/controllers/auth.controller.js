const authService = require('../services/auth.service');
const smsService = require('../services/sms.service');
const notificationService = require('../services/notification.service');
const { generateAccessToken, generateRefreshToken } = require('../middlewares/auth');
const { query } = require('../database/db');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');
const config = require('../config');

class AuthController {
  /**
   * Envoyer un code OTP
   */
  async sendOTP(req, res, next) {
    try {
      const { phone } = req.body;

      // Générer et sauvegarder l'OTP
      const code = await authService.createOTP(phone);

      // Afficher le code OTP dans les logs (toujours visible pour faciliter les tests)
      const otpMessage = `
══════════════════════════════════════════════════════════════════
🔐 CODE OTP GÉNÉRÉ (CONNEXION/INSCRIPTION CLIENT)
══════════════════════════════════════════════════════════════════
   📞 Numéro: ${phone}
   🔑 Code OTP: ${code}
   ⏰ Valide pendant: 5 minutes
   📅 Date: ${new Date().toISOString()}
══════════════════════════════════════════════════════════════════`;
      
      // Log dans la console (toujours visible dans le terminal)
      console.log('\n' + otpMessage + '\n');
      
      // Log avec Winston (pour les fichiers de log)
      logger.info('CODE OTP GÉNÉRÉ POUR CLIENT', { 
        phone, 
        code, 
        expiresIn: '5 minutes',
        type: 'client_login',
        timestamp: new Date().toISOString()
      });

      // Envoyer par SMS uniquement (WhatsApp désactivé)
      let smsOk = false;
      try {
        const smsResult = await smsService.sendOTP(phone, code);
        smsOk = smsResult?.success === true;
      } catch (smsError) {
        logger.warn('Échec envoi SMS OTP', { error: smsError.message });
      }

      // En mode développement ou si SMS_PROVIDER=dev (sans Twilio), on continue même si le SMS n'est pas envoyé
      const isDev = process.env.NODE_ENV === 'development';
      const smsProviderDev = process.env.SMS_PROVIDER === 'dev';
      if (!smsOk && !isDev && !smsProviderDev) {
        throw new Error('Échec envoi OTP par SMS');
      }

      // Pour les tests sans Twilio : renvoyer l'OTP dans la réponse si demandé (Render, etc.)
      const allowOtpInResponse = isDev || process.env.DEBUG_OTP_RESPONSE === 'true';

      res.json({
        success: true,
        message: smsOk ? 'Code OTP envoyé par SMS' : 'Code OTP généré (voir logs ou réponse si DEBUG_OTP_RESPONSE activé)',
        data: {
          channels: {
            sms: smsOk,
            whatsapp: false,
          },
          // En dev ou si DEBUG_OTP_RESPONSE=true (tests sans Twilio), renvoyer le code
          ...(allowOtpInResponse && { debug_otp: code }),
        },
      });
    } catch (error) {
      // Détecter les erreurs de rate limiting et retourner un 429
      if (error.statusCode === 429 || error.code === 'RATE_LIMIT_EXCEEDED' || 
          (error.message && error.message.includes('attendre') && error.message.includes('minute'))) {
        logger.warn('Rate limit OTP dépassé', { 
          phone: req.body?.phone,
          error: error.message 
        });
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: error.message || 'Veuillez attendre 1 minute avant de demander un nouveau code',
          },
        });
      }
      
      // Pour les autres erreurs, logger et passer au middleware d'erreur
      logger.error('Erreur sendOTP', { 
        phone: req.body?.phone,
        error: error.message 
      });
      next(error);
    }
  }

  /**
   * Vérifier l'OTP et créer/connecter l'utilisateur
   */
  async verifyOTP(req, res, next) {
    try {
      const { phone, code, first_name, last_name, role } = req.body;
      const fcm_token = req.body.fcm_token ?? req.body.fcmToken ?? '';
      const fcmToken = typeof fcm_token === 'string' ? fcm_token.trim() : '';

      // Vérifier l'OTP
      const otp = await authService.verifyOTP(phone, code);
      
      if (!otp || !otp.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_OTP',
            message: 'Code OTP invalide ou expiré',
            attemptsRemaining: otp?.attemptsRemaining ?? undefined,
          },
        });
      }

      // Si c'est un livreur, vérifier s'il existe dans delivery_persons
      if (role === 'delivery') {
        const deliveryResult = await query(
          'SELECT * FROM delivery_persons WHERE phone = $1',
          [phone]
        );

        if (deliveryResult.rows.length > 0) {
          // Livreur existant - vérifier son statut
          const delivery = deliveryResult.rows[0];
          
          if (delivery.status === 'pending') {
            // Compte en attente de validation
            return res.json({
              success: true,
              message: 'Compte en attente de validation',
              data: {
                user: {
                  id: delivery.id,
                  phone: delivery.phone,
                  first_name: delivery.first_name,
                  last_name: delivery.last_name,
                  status: delivery.status,
                  validation_status: 'pending',
                },
                isNewUser: false,
                needsValidation: true,
              },
            });
          }

          if (delivery.status !== 'active') {
            return res.status(403).json({
              success: false,
              error: {
                code: 'ACCOUNT_NOT_ACTIVE',
                message: 'Votre compte n\'est pas encore activé',
                status: delivery.status,
              },
            });
          }

          // Livreur actif - générer les tokens
          const accessToken = generateAccessToken({
            id: delivery.id,
            phone: delivery.phone,
            type: 'delivery_person',
          });

          const refreshToken = generateRefreshToken({
            id: delivery.id,
            phone: delivery.phone,
            type: 'delivery_person',
          });

          logger.info('OTP vérifié avec succès', { phone, type: 'delivery_login' });

          if (fcmToken) {
            notificationService.saveFCMToken(delivery.id, 'delivery_person', fcmToken).catch((err) =>
              logger.warn('Sauvegarde FCM token livreur', { error: err.message })
            );
          }

          return res.json({
            success: true,
            message: 'Connexion réussie',
            data: {
              user: {
                id: delivery.id,
                phone: delivery.phone,
                first_name: delivery.first_name,
                last_name: delivery.last_name,
                status: delivery.status,
                validation_status: delivery.status,
                vehicle_type: delivery.vehicle_type,
                average_rating: delivery.average_rating,
                total_deliveries: delivery.total_deliveries,
              },
              token: accessToken,
              accessToken,
              refreshToken,
              isNewUser: false,
            },
          });
        } else {
          // Nouveau livreur - OTP validé, peut procéder à l'inscription
          logger.info('OTP vérifié avec succès', { phone, type: 'delivery_registration' });
          return res.json({
            success: true,
            message: 'OTP vérifié. Veuillez compléter votre inscription.',
            data: {
              isNewUser: true,
              phone,
            },
          });
        }
      }

      // Flow standard pour les clients
      // Trouver ou créer l'utilisateur
      const { user, isNew } = await authService.findOrCreateUser(phone, {
        first_name,
        last_name,
      });

      // Générer les tokens
      const accessToken = generateAccessToken({
        id: user.id,
        phone: user.phone,
        type: 'client',
      });

      const refreshToken = generateRefreshToken({
        id: user.id,
        phone: user.phone,
        type: 'client',
      });

      logger.info('OTP vérifié avec succès', { phone, type: 'login' });

      if (fcmToken) {
        try {
          await notificationService.saveFCMToken(user.id, 'user', fcmToken);
        } catch (err) {
          logger.warn('Sauvegarde FCM token client (login OK)', { error: err.message });
        }
      }

      res.json({
        success: true,
        message: isNew ? 'Compte créé avec succès' : 'Connexion réussie',
        data: {
          user: {
            id: user.id,
            phone: user.phone,
            first_name: user.first_name,
            last_name: user.last_name,
            referral_code: user.referral_code,
            loyalty_points: user.loyalty_points,
          },
          accessToken,
          refreshToken,
          isNewUser: isNew,
        },
      });
    } catch (error) {
      if (error.code === 'OTP_MAX_ATTEMPTS' || error.statusCode === 429) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'OTP_MAX_ATTEMPTS',
            message: error.message || 'Nombre maximum de tentatives atteint',
            attemptsRemaining: error.attemptsRemaining ?? 0,
          },
        });
      }
      logger.error('Erreur verifyOTP', { error: error.message });
      next(error);
    }
  }

  /**
   * Connexion restaurant/partenaire
   */
  async partnerLogin(req, res, next) {
    try {
      // Accepter soit email soit phone
      const email = req.body?.email?.trim();
      const phone = req.body?.phone?.trim();
      const fcm_token = req.body?.fcm_token?.trim();
      
      // Déterminer l'identifiant (priorité au phone si fourni et non vide)
      const identifier = (phone && phone.length > 0) ? phone : (email && email.length > 0 ? email.toLowerCase() : null);
      const password = req.body?.password;

      // Log pour débogage
      logger.debug('Tentative de connexion restaurant', {
        email: email || 'MANQUANT',
        phone: phone || 'MANQUANT',
        identifier: identifier || 'MANQUANT',
        identifierLength: identifier?.length,
        passwordProvided: !!password,
        passwordLength: password?.length,
        bodyKeys: Object.keys(req.body || {}),
        body: req.body,
      });

      if (!identifier || !password) {
        logger.warn('Connexion restaurant: champs manquants', {
          identifier: !!identifier,
          password: !!password,
          emailProvided: !!email,
          phoneProvided: !!phone,
        });
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Numéro de téléphone (ou email) et mot de passe requis',
          },
        });
      }

      // Trouver le restaurant par phone ou email
      // Si c'est un numéro (commence par + ou contient que des chiffres), chercher par phone
      // Sinon, chercher par email
      const isPhone = /^[+]?[0-9\s\-()]+$/.test(identifier);
      let result;
      
      if (isPhone) {
        // Nettoyer le numéro de téléphone (supprimer espaces, tirets, parenthèses, +225)
        let cleanPhone = identifier.replace(/[\s\-()]/g, '');
        // Supprimer le préfixe +225 ou 225 si présent
        cleanPhone = cleanPhone.replace(/^\+?225/, '');
        // Si le numéro commence par 0, le garder, sinon ajouter 0
        if (!cleanPhone.startsWith('0') && cleanPhone.length === 9) {
          cleanPhone = '0' + cleanPhone;
        }
        
        // Chercher avec différentes variantes du numéro
        result = await query(
          `SELECT * FROM restaurants 
           WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+225', '') = $1
              OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+225', '') = $2
              OR phone = $3`,
          [cleanPhone, '0' + cleanPhone.replace(/^0/, ''), identifier]
        );
      } else {
        // Chercher par email
        result = await query(
          'SELECT * FROM restaurants WHERE LOWER(TRIM(email)) = $1',
          [identifier]
        );
      }

      if (result.rows.length === 0) {
        logger.warn('Connexion restaurant: identifiant non trouvé', { 
          identifier,
          isPhone,
        });
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Numéro de téléphone (ou email) ou mot de passe incorrect',
          },
        });
      }

      const restaurant = result.rows[0];

      // Log pour débogage
      logger.debug('Restaurant trouvé', {
        restaurantId: restaurant.id,
        restaurantEmail: restaurant.email,
        restaurantStatus: restaurant.status,
        hasPasswordHash: !!restaurant.password_hash,
      });

      // Nettoyer le mot de passe (supprimer les espaces avant/après)
      const cleanPassword = password.trim();
      
      // Vérifier le mot de passe
      const isValid = await bcrypt.compare(cleanPassword, restaurant.password_hash);
      
      logger.debug('Vérification mot de passe', {
        isValid,
        passwordLength: password.length,
        cleanPasswordLength: cleanPassword.length,
        hashLength: restaurant.password_hash?.length,
        passwordChars: password.split('').map((c, i) => `${i}:${c.charCodeAt(0)}`).join(','),
      });
      
      if (!isValid) {
        logger.warn('Connexion restaurant: mot de passe incorrect', {
          identifier,
          restaurantId: restaurant.id,
          passwordProvided: !!password,
        });
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Numéro de téléphone (ou email) ou mot de passe incorrect',
          },
        });
      }

      // Vérifier que le restaurant est actif
      if (restaurant.status !== 'active') {
        logger.warn('Connexion restaurant: compte non actif', {
          identifier,
          status: restaurant.status,
        });
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCOUNT_NOT_ACTIVE',
            message: 'Votre compte n\'est pas encore activé',
          },
        });
      }

      // Générer les tokens
      const accessToken = generateAccessToken({
        id: restaurant.id,
        email: restaurant.email,
        type: 'restaurant',
      });

      const refreshToken = generateRefreshToken({
        id: restaurant.id,
        email: restaurant.email,
        type: 'restaurant',
      });

      if (fcm_token) {
        try {
          await notificationService.saveFCMToken(restaurant.id, 'restaurant', fcm_token);
          logger.info('FCM token restaurant sauvegardé', { restaurantId: restaurant.id });
        } catch (err) {
          logger.warn('Sauvegarde FCM token restaurant', { error: err.message });
        }
      }

      res.json({
        success: true,
        message: 'Connexion réussie',
        data: {
          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
            email: restaurant.email,
            status: restaurant.status,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      logger.error('Erreur partnerLogin', { error: error.message });
      next(error);
    }
  }

  /**
   * Mot de passe oublié partenaire - Étape 1: Envoyer OTP
   */
  async partnerForgotPassword(req, res, next) {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({
          success: false,
          error: { code: 'PHONE_REQUIRED', message: 'Numéro de téléphone requis' },
        });
      }

      // Normaliser le numéro de téléphone pour la recherche
      let cleanPhone = phone.trim().replace(/\s+/g, '');
      
      // Générer les variantes possibles du numéro
      const phoneVariants = [cleanPhone];
      
      // Si commence par +225, ajouter sans le +225
      if (cleanPhone.startsWith('+225')) {
        phoneVariants.push(cleanPhone.replace('+225', ''));
        phoneVariants.push(cleanPhone.replace('+2250', '0')); // +2250xxx -> 0xxx
      }
      // Si commence par 225, ajouter avec + et sans
      else if (cleanPhone.startsWith('225')) {
        phoneVariants.push('+' + cleanPhone);
        phoneVariants.push(cleanPhone.substring(3)); // 225xxx -> xxx
      }
      // Si commence par 0, ajouter avec +225
      else if (cleanPhone.startsWith('0')) {
        phoneVariants.push('+225' + cleanPhone); // 07xx -> +22507xx
      }
      // Sinon (juste les chiffres), ajouter les préfixes
      else {
        phoneVariants.push('+225' + cleanPhone);
        phoneVariants.push('+2250' + cleanPhone);
        phoneVariants.push('0' + cleanPhone);
      }

      logger.debug('Recherche restaurant avec variantes', { phoneVariants });

      // Vérifier que le restaurant existe avec l'une des variantes
      const result = await query(
        'SELECT id, name, email, phone FROM restaurants WHERE phone = ANY($1)',
        [phoneVariants]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { 
            code: 'RESTAURANT_NOT_FOUND', 
            message: 'Aucun compte restaurant trouvé avec ce numéro' 
          },
        });
      }

      const restaurant = result.rows[0];
      // Utiliser le numéro tel qu'il est stocké dans la base
      const storedPhone = restaurant.phone;

      // Générer un OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Supprimer les anciens OTP pour ce numéro
      await query(
        "DELETE FROM otp_codes WHERE phone = $1 AND type = 'password_reset'",
        [storedPhone]
      );

      // Sauvegarder le nouvel OTP
      await query(
        `INSERT INTO otp_codes (phone, code, expires_at, type, attempts)
         VALUES ($1, $2, $3, 'password_reset', 0)`,
        [storedPhone, otp, expiresAt]
      );

      // Afficher le code OTP dans les logs (toujours visible)
      const otpMessage = `
══════════════════════════════════════════════════════════════════
🔐 CODE OTP RÉINITIALISATION MOT DE PASSE (RESTAURANT)
══════════════════════════════════════════════════════════════════
   📞 Numéro: ${storedPhone}
   🏪 Restaurant: ${restaurant.name} (ID: ${restaurant.id})
   🔑 Code OTP: ${otp}
   ⏰ Valide pendant: 10 minutes
   📅 Date: ${new Date().toISOString()}
══════════════════════════════════════════════════════════════════`;
      
      console.log(otpMessage);
      logger.info('CODE OTP RÉINITIALISATION RESTAURANT', { 
        phone: storedPhone, 
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        code: otp, 
        expiresIn: '10 minutes' 
      });

      // Envoyer l'OTP par SMS
      const smsService = require('../services/sms.service');
      try {
        await smsService.sendOTP(storedPhone, otp);
        logger.info('OTP de réinitialisation envoyé par SMS', { phone: storedPhone, restaurantId: restaurant.id });
      } catch (smsError) {
        logger.warn('Échec envoi SMS OTP reset', { error: smsError.message });
      }

      res.json({
        success: true,
        message: 'Code de vérification envoyé par SMS',
        data: {
          phone: storedPhone, // Retourner le numéro normalisé
          restaurant_name: restaurant.name,
          expires_in: 600, // 10 minutes en secondes
          // En dev, on renvoie le code pour faciliter les tests
          ...(process.env.NODE_ENV === 'development' && { debug_otp: otp }),
        },
      });
    } catch (error) {
      logger.error('Erreur partnerForgotPassword', { error: error.message });
      next(error);
    }
  }

  /**
   * Mot de passe oublié partenaire - Étape 2: Vérifier OTP
   */
  async partnerVerifyResetOtp(req, res, next) {
    try {
      const { phone, otp } = req.body;

      if (!phone || !otp) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'Téléphone et code OTP requis' },
        });
      }

      // Normaliser le numéro de téléphone
      let cleanPhone = phone.trim().replace(/\s+/g, '');
      const phoneVariants = [cleanPhone];
      if (cleanPhone.startsWith('+225')) {
        phoneVariants.push(cleanPhone.replace('+225', ''));
        phoneVariants.push(cleanPhone.replace('+2250', '0'));
      } else if (cleanPhone.startsWith('225')) {
        phoneVariants.push('+' + cleanPhone);
        phoneVariants.push(cleanPhone.substring(3));
      } else if (cleanPhone.startsWith('0')) {
        phoneVariants.push('+225' + cleanPhone);
      } else {
        phoneVariants.push('+225' + cleanPhone);
        phoneVariants.push('+2250' + cleanPhone);
        phoneVariants.push('0' + cleanPhone);
      }

      // Récupérer l'OTP
      const result = await query(
        `SELECT * FROM otp_codes 
         WHERE phone = ANY($1) AND type = 'password_reset' AND is_used = false
         ORDER BY created_at DESC LIMIT 1`,
        [phoneVariants]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'OTP_NOT_FOUND', message: 'Aucune demande de réinitialisation trouvée' },
        });
      }

      const otpRecord = result.rows[0];

      // Vérifier expiration
      if (new Date() > new Date(otpRecord.expires_at)) {
        return res.status(400).json({
          success: false,
          error: { code: 'OTP_EXPIRED', message: 'Le code a expiré. Veuillez en demander un nouveau.' },
        });
      }

      // Vérifier le nombre de tentatives
      if (otpRecord.attempts >= 5) {
        return res.status(429).json({
          success: false,
          error: { code: 'TOO_MANY_ATTEMPTS', message: 'Trop de tentatives. Veuillez en demander un nouveau code.' },
        });
      }

      // Vérifier le code
      if (otpRecord.code !== otp.trim()) {
        // Incrémenter les tentatives
        await query(
          'UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1',
          [otpRecord.id]
        );
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_OTP', message: 'Code incorrect' },
        });
      }

      // Générer un token temporaire pour la réinitialisation (6 chiffres)
      const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Afficher le token de réinitialisation dans les logs
      const resetTokenMessage = `
══════════════════════════════════════════════════════════════════
🔐 TOKEN DE RÉINITIALISATION GÉNÉRÉ (RESTAURANT)
══════════════════════════════════════════════════════════════════
   📞 Numéro: ${otpRecord.phone}
   🔑 Token de réinitialisation: ${resetToken}
   ⏰ Valide pendant: 10 minutes
   📅 Date: ${new Date().toISOString()}
══════════════════════════════════════════════════════════════════`;
      
      console.log(resetTokenMessage);
      logger.info('TOKEN RÉINITIALISATION RESTAURANT', { 
        phone: otpRecord.phone, 
        resetToken: resetToken, 
        expiresIn: '10 minutes' 
      });
      
      // Utiliser le numéro tel qu'il est stocké dans l'OTP
      const storedPhone = otpRecord.phone;

      // Marquer l'OTP comme utilisé et sauvegarder le token
      await query(
        `UPDATE otp_codes SET is_used = true WHERE id = $1`,
        [otpRecord.id]
      );

      // Stocker le reset token avec le numéro stocké (pas celui fourni par l'utilisateur)
      await query(
        `INSERT INTO otp_codes (phone, code, expires_at, type, is_used)
         VALUES ($1, $2, $3, 'reset_token', false)`,
        [storedPhone, resetToken, new Date(Date.now() + 15 * 60 * 1000)]
      );

      logger.info('OTP de réinitialisation vérifié', { phone: storedPhone });

      res.json({
        success: true,
        message: 'Code vérifié avec succès',
        data: {
          reset_token: resetToken,
          expires_in: 900, // 15 minutes
        },
      });
    } catch (error) {
      logger.error('Erreur partnerVerifyResetOtp', { error: error.message });
      next(error);
    }
  }

  /**
   * Mot de passe oublié partenaire - Étape 3: Réinitialiser mot de passe
   */
  async partnerResetPassword(req, res, next) {
    try {
      const { phone, reset_token, new_password } = req.body;

      if (!phone || !reset_token || !new_password) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'Tous les champs sont requis' },
        });
      }

      // Vérifier la longueur du mot de passe
      if (new_password.length < 6) {
        return res.status(400).json({
          success: false,
          error: { code: 'WEAK_PASSWORD', message: 'Le mot de passe doit contenir au moins 6 caractères' },
        });
      }

      // Normaliser le numéro de téléphone
      let cleanPhone = phone.trim().replace(/\s+/g, '');
      const phoneVariants = [cleanPhone];
      if (cleanPhone.startsWith('+225')) {
        phoneVariants.push(cleanPhone.replace('+225', ''));
        phoneVariants.push(cleanPhone.replace('+2250', '0'));
      } else if (cleanPhone.startsWith('225')) {
        phoneVariants.push('+' + cleanPhone);
        phoneVariants.push(cleanPhone.substring(3));
      } else if (cleanPhone.startsWith('0')) {
        phoneVariants.push('+225' + cleanPhone);
      } else {
        phoneVariants.push('+225' + cleanPhone);
        phoneVariants.push('+2250' + cleanPhone);
        phoneVariants.push('0' + cleanPhone);
      }

      // Vérifier le token de réinitialisation
      const result = await query(
        `SELECT * FROM otp_codes 
         WHERE phone = ANY($1) AND type = 'reset_token' AND code = $2 AND is_used = false
         ORDER BY created_at DESC LIMIT 1`,
        [phoneVariants, reset_token]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Token de réinitialisation invalide' },
        });
      }

      const tokenRecord = result.rows[0];
      // Utiliser le numéro tel qu'il est stocké dans le token
      const storedPhone = tokenRecord.phone;

      // Vérifier expiration du token
      if (new Date() > new Date(tokenRecord.expires_at)) {
        return res.status(400).json({
          success: false,
          error: { code: 'TOKEN_EXPIRED', message: 'Le token a expiré. Veuillez recommencer.' },
        });
      }

      // Hasher le nouveau mot de passe
      const passwordHash = await bcrypt.hash(new_password, 12);

      // Mettre à jour le mot de passe du restaurant avec le numéro stocké
      const updateResult = await query(
        'UPDATE restaurants SET password_hash = $1, updated_at = NOW() WHERE phone = $2 RETURNING id, name',
        [passwordHash, storedPhone]
      );

      if (updateResult.rows.length === 0) {
        logger.error('Restaurant non trouvé pour mise à jour mot de passe', { phone: storedPhone });
        return res.status(404).json({
          success: false,
          error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant non trouvé' },
        });
      }

      logger.info('Mot de passe mis à jour', { 
        restaurantId: updateResult.rows[0].id, 
        restaurantName: updateResult.rows[0].name 
      });

      // Marquer le token comme utilisé
      await query(
        'UPDATE otp_codes SET is_used = true WHERE id = $1',
        [tokenRecord.id]
      );

      // Nettoyer les anciens codes pour ce numéro
      await query(
        "DELETE FROM otp_codes WHERE phone = $1 AND type IN ('password_reset', 'reset_token') AND is_used = true",
        [storedPhone]
      );

      logger.info('Mot de passe restaurant réinitialisé', { phone: phone.trim() });

      res.json({
        success: true,
        message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
      });
    } catch (error) {
      logger.error('Erreur partnerResetPassword', { error: error.message });
      next(error);
    }
  }

  /**
   * Connexion livreur
   */
  async deliveryLogin(req, res, next) {
    try {
      const { phone, password } = req.body;

      // Trouver le livreur
      const result = await query(
        'SELECT * FROM delivery_persons WHERE phone = $1',
        [phone]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Téléphone ou mot de passe incorrect',
          },
        });
      }

      const delivery = result.rows[0];

      // Vérifier le mot de passe
      const isValid = await bcrypt.compare(password, delivery.password_hash);
      
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Téléphone ou mot de passe incorrect',
          },
        });
      }

      // Vérifier que le livreur est actif
      if (delivery.status !== 'active') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCOUNT_NOT_ACTIVE',
            message: 'Votre compte n\'est pas encore activé',
          },
        });
      }

      // Générer les tokens
      const accessToken = generateAccessToken({
        id: delivery.id,
        phone: delivery.phone,
        type: 'delivery_person',
      });

      const refreshToken = generateRefreshToken({
        id: delivery.id,
        phone: delivery.phone,
        type: 'delivery_person',
      });

      res.json({
        success: true,
        message: 'Connexion réussie',
        data: {
          delivery_person: {
            id: delivery.id,
            first_name: delivery.first_name,
            last_name: delivery.last_name,
            phone: delivery.phone,
            status: delivery.status,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      logger.error('Erreur deliveryLogin', { error: error.message });
      next(error);
    }
  }

  /**
   * Connexion admin
   */
  async adminLogin(req, res) {
    try {
      const { email, password, fcm_token } = req.body;

      // Trouver l'admin
      const result = await query(
        'SELECT * FROM admins WHERE email = $1 AND is_active = true',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email ou mot de passe incorrect',
          },
        });
      }

      const admin = result.rows[0];

      // Vérifier le mot de passe
      const isValid = await bcrypt.compare(password, admin.password_hash);
      
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email ou mot de passe incorrect',
          },
        });
      }

      // Mettre à jour last_login (et fcm_token si fourni)
      if (fcm_token && typeof fcm_token === 'string' && fcm_token.trim()) {
        await query(
          'UPDATE admins SET last_login = NOW(), fcm_token = $2 WHERE id = $1',
          [admin.id, fcm_token.trim()]
        );
      } else {
        await query(
          'UPDATE admins SET last_login = NOW() WHERE id = $1',
          [admin.id]
        );
      }

      // Générer les tokens
      const accessToken = generateAccessToken({
        id: admin.id,
        email: admin.email,
        type: 'admin',
        role: admin.role,
      });

      const refreshToken = generateRefreshToken({
        id: admin.id,
        email: admin.email,
        type: 'admin',
      });

      res.json({
        success: true,
        message: 'Connexion admin réussie',
        data: {
          admin: {
            id: admin.id,
            email: admin.email,
            full_name: admin.full_name,
            role: admin.role,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      logger.error('Erreur adminLogin', {
        message: error.message,
        stack: error.stack,
        code: error.code,
      });
      
      // En développement, retourner plus de détails
      const isDev = process.env.NODE_ENV !== 'production';
      
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message: 'Erreur lors de la connexion',
          ...(isDev && {
            details: error.message,
            hint: error.hint || 'Vérifiez que la table admins existe et que la base de données est accessible',
          }),
        },
      });
    }
  }

  /**
   * Rafraîchir le token d'accès
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'REFRESH_TOKEN_REQUIRED',
            message: 'Refresh token requis',
          },
        });
      }

      const { verifyRefreshToken } = require('../middlewares/auth');
      const decoded = verifyRefreshToken(refreshToken);

      // Générer un nouveau access token
      const newAccessToken = generateAccessToken({
        id: decoded.id,
        phone: decoded.phone,
        email: decoded.email,
        type: decoded.type,
      });

      res.json({
        success: true,
        data: {
          accessToken: newAccessToken,
        },
      });
    } catch (error) {
      logger.error('Erreur refreshToken', { error: error.message });
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token invalide',
        },
      });
    }
  }

  /**
   * Mot de passe oublié admin - Étape 1: Envoyer email avec lien de réinitialisation
   */
  async adminForgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: { code: 'EMAIL_REQUIRED', message: 'Adresse email requise' },
        });
      }

      // Vérifier que l'admin existe
      const result = await query(
        'SELECT id, email, full_name FROM admins WHERE email = $1 AND is_active = true',
        [email.toLowerCase().trim()]
      );

      // Ne pas révéler si l'email existe ou non (sécurité)
      if (result.rows.length === 0) {
        // Retourner un succès même si l'email n'existe pas (pour éviter l'énumération)
        logger.warn('Tentative réinitialisation mot de passe admin avec email inexistant', { email });
        return res.json({
          success: true,
          message: 'Si cet email existe, vous recevrez un lien de réinitialisation par email.',
        });
      }

      const admin = result.rows[0];

      // Générer un token de réinitialisation sécurisé
      const crypto = require('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

      // Supprimer les anciens tokens pour cet admin
      await query(
        "DELETE FROM otp_codes WHERE phone = $1 AND type = 'admin_password_reset'",
        [admin.email]
      );

      // Sauvegarder le token (on utilise la table otp_codes avec email comme "phone")
      try {
        await query(
          `INSERT INTO otp_codes (phone, code, expires_at, type, is_used)
           VALUES ($1, $2, $3, 'admin_password_reset', false)`,
          [admin.email, resetToken, expiresAt]
        );
        logger.debug('Token de réinitialisation sauvegardé', { 
          email: admin.email, 
          tokenLength: resetToken.length,
          expiresAt 
        });
      } catch (dbError) {
        logger.error('Erreur lors de la sauvegarde du token', {
          error: dbError.message,
          code: dbError.code,
          email: admin.email,
          tokenLength: resetToken.length,
          emailLength: admin.email.length
        });
        throw dbError;
      }

      // Construire l'URL de réinitialisation
      const frontendUrl = config.urls.adminPanel || 'http://localhost:5174';
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(admin.email)}`;

      // Afficher le lien dans les logs (mode dev)
      if (process.env.NODE_ENV === 'development') {
        const resetMessage = `
══════════════════════════════════════════════════════════════════
🔐 LIEN DE RÉINITIALISATION MOT DE PASSE ADMIN
══════════════════════════════════════════════════════════════════
   📧 Email: ${admin.email}
   👤 Admin: ${admin.full_name} (ID: ${admin.id})
   🔗 Lien: ${resetUrl}
   🔑 Token: ${resetToken}
   ⏰ Valide pendant: 1 heure
   📅 Date: ${new Date().toISOString()}
══════════════════════════════════════════════════════════════════`;
        console.log('\n' + resetMessage + '\n');
      }

      // Envoyer l'email de réinitialisation
      const emailService = require('../services/email.service');
      try {
        await emailService.sendPasswordResetEmail(admin.email, admin.full_name, resetUrl, resetToken);
        logger.info('Email de réinitialisation envoyé', { 
          email: admin.email, 
          adminId: admin.id 
        });
      } catch (emailError) {
        logger.error('Échec envoi email réinitialisation', { 
          error: emailError.message,
          email: admin.email 
        });
        // Ne pas bloquer - le lien est dans les logs en dev
      }

      res.json({
        success: true,
        message: 'Si cet email existe, vous recevrez un lien de réinitialisation par email.',
      });
    } catch (error) {
      logger.error('Erreur adminForgotPassword', { error: error.message });
      next(error);
    }
  }

  /**
   * Mot de passe oublié admin - Étape 2: Réinitialiser mot de passe avec token
   */
  async adminResetPassword(req, res, next) {
    try {
      const { email, reset_token, new_password } = req.body;

      if (!email || !reset_token || !new_password) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'Tous les champs sont requis' },
        });
      }

      // Vérifier la longueur du mot de passe
      if (new_password.length < 8) {
        return res.status(400).json({
          success: false,
          error: { code: 'WEAK_PASSWORD', message: 'Le mot de passe doit contenir au moins 8 caractères' },
        });
      }

      // Vérifier le token de réinitialisation
      const result = await query(
        `SELECT * FROM otp_codes 
         WHERE phone = $1 AND type = 'admin_password_reset' AND code = $2 AND is_used = false
         ORDER BY created_at DESC LIMIT 1`,
        [email.toLowerCase().trim(), reset_token]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Token de réinitialisation invalide ou expiré' },
        });
      }

      const tokenRecord = result.rows[0];

      // Vérifier expiration du token
      if (new Date() > new Date(tokenRecord.expires_at)) {
        return res.status(400).json({
          success: false,
          error: { code: 'TOKEN_EXPIRED', message: 'Le token a expiré. Veuillez en demander un nouveau.' },
        });
      }

      // Vérifier que l'admin existe toujours
      const adminResult = await query(
        'SELECT id, email, full_name FROM admins WHERE email = $1 AND is_active = true',
        [email.toLowerCase().trim()]
      );

      if (adminResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'ADMIN_NOT_FOUND', message: 'Admin non trouvé' },
        });
      }

      const admin = adminResult.rows[0];

      // Hasher le nouveau mot de passe
      const passwordHash = await bcrypt.hash(new_password, 12);

      // Mettre à jour le mot de passe
      await query(
        'UPDATE admins SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, admin.id]
      );

      logger.info('Mot de passe admin réinitialisé', { 
        adminId: admin.id, 
        email: admin.email,
        adminName: admin.full_name 
      });

      // Marquer le token comme utilisé
      await query(
        'UPDATE otp_codes SET is_used = true WHERE id = $1',
        [tokenRecord.id]
      );

      // Nettoyer les anciens tokens pour cet admin
      await query(
        "DELETE FROM otp_codes WHERE phone = $1 AND type = 'admin_password_reset' AND is_used = true",
        [admin.email]
      );

      res.json({
        success: true,
        message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
      });
    } catch (error) {
      logger.error('Erreur adminResetPassword', { error: error.message });
      next(error);
    }
  }
  /**
   * Déconnexion (invalide le refresh token côté client)
   */
  async logout(req, res) {
    try {
      // JWT est stateless : la déconnexion effective est gérée côté client (suppression du token)
      // Si un refresh token est fourni, on peut l'invalider en base si une table de tokens révoqués existe
      res.json({
        success: true,
        message: 'Déconnexion réussie',
      });
    } catch (error) {
      logger.error('Erreur logout', { error: error.message });
      res.status(500).json({
        success: false,
        error: { code: 'LOGOUT_ERROR', message: 'Erreur lors de la déconnexion' },
      });
    }
  }
}

module.exports = new AuthController();
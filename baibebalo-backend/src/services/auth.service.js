const { query, transaction } = require('../database/db');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');
const config = require('../config');
const smsService = require('./sms.service');

class AuthService {
  /**
   * Générer un code OTP aléatoire
   */
  generateOTP(length = 6) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  /**
   * Créer un code OTP (sans l'envoyer)
   */
  async createOTP(phone, type = 'login') {
    try {
      // Vérifier les OTP récents (limite anti-spam)
      const recentOTP = await query(
        `SELECT COUNT(*) as count FROM otp_codes
         WHERE phone = $1 
         AND created_at > NOW() - INTERVAL '1 minute'`,
        [phone]
      );

      if (parseInt(recentOTP.rows[0].count) > 0) {
        const error = new Error('Veuillez attendre 1 minute avant de demander un nouveau code');
        error.statusCode = 429;
        error.code = 'RATE_LIMIT_EXCEEDED';
        throw error;
      }

      const code = this.generateOTP(6);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Invalider les anciens OTP non utilisés
      await query(
        `UPDATE otp_codes 
         SET is_used = true 
         WHERE phone = $1 AND is_used = false`,
        [phone]
      );

      // Créer nouveau OTP
      try {
        // Essayer avec max_attempts
        await query(
          `INSERT INTO otp_codes (phone, code, type, expires_at, max_attempts)
           VALUES ($1, $2, $3, $4, 3)`,
          [phone, code, type, expiresAt]
        );
      } catch (error) {
        // Si la colonne n'existe pas, insérer sans max_attempts
        if (error.message.includes('max_attempts')) {
          await query(
            `INSERT INTO otp_codes (phone, code, type, expires_at)
             VALUES ($1, $2, $3, $4)`,
            [phone, code, type, expiresAt]
          );
        } else {
          throw error;
        }
      }

      logger.info('OTP créé', { phone, type, expiresAt });

      return code;
    } catch (error) {
      // Ne pas logger les erreurs de rate limiting (déjà gérées dans le contrôleur)
      if (error.statusCode !== 429 && error.code !== 'RATE_LIMIT_EXCEEDED') {
        logger.error('Erreur création OTP', { 
          phone, 
          type, 
          error: error.message 
        });
      }
      throw error;
    }
  }

  /**
   * Créer et envoyer un code OTP
   */
  async createAndSendOTP(phone, type = 'login') {
    try {
      // Vérifier les OTP récents (limite anti-spam)
      const recentOTP = await query(
        `SELECT COUNT(*) as count FROM otp_codes
         WHERE phone = $1 
         AND created_at > NOW() - INTERVAL '1 minute'`,
        [phone]
      );

      if (parseInt(recentOTP.rows[0].count) > 0) {
        const error = new Error('Veuillez attendre 1 minute avant de demander un nouveau code');
        error.statusCode = 429;
        error.code = 'RATE_LIMIT_EXCEEDED';
        throw error;
      }

      const code = this.generateOTP(6);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Invalider les anciens OTP non utilisés
      await query(
        `UPDATE otp_codes 
         SET is_used = true 
         WHERE phone = $1 AND is_used = false`,
        [phone]
      );

      // Créer nouveau OTP
      try {
        // Essayer avec max_attempts
        await query(
          `INSERT INTO otp_codes (phone, code, type, expires_at, max_attempts)
           VALUES ($1, $2, $3, $4, 3)`,
          [phone, code, type, expiresAt]
        );
      } catch (error) {
        // Si la colonne n'existe pas, insérer sans max_attempts
        if (error.message.includes('max_attempts')) {
          await query(
            `INSERT INTO otp_codes (phone, code, type, expires_at)
             VALUES ($1, $2, $3, $4)`,
            [phone, code, type, expiresAt]
          );
        } else {
          throw error;
        }
      }

      logger.info('OTP créé', { phone, type, expiresAt });

      // Envoyer le SMS
      if (config.env !== 'test') {
        await smsService.sendOTP(phone, code);
      } else {
        logger.debug('Mode test - OTP non envoyé', { code });
      }

      return {
        success: true,
        message: 'Code envoyé par SMS',
        expiresIn: 300, // secondes
        ...(config.env === 'development' && { code }), // Exposer en dev uniquement
      };
    } catch (error) {
      // Ne pas logger les erreurs de rate limiting (déjà gérées dans le contrôleur)
      if (error.statusCode !== 429 && error.code !== 'RATE_LIMIT_EXCEEDED') {
        logger.error('Erreur création OTP', { 
          phone, 
          type, 
          error: error.message 
        });
      }
      throw error;
    }
  }

  /**
   * Vérifier un code OTP
   */
  async verifyOTP(phone, code) {
    try {
      const otpResult = await query(
        `SELECT * FROM otp_codes
         WHERE phone = $1 
         AND is_used = false
         AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1`,
        [phone]
      );

      if (otpResult.rows.length === 0) {
        return {
          success: false,
          error: 'Code invalide ou expiré',
          attemptsRemaining: 0,
        };
      }

      const otpRecord = otpResult.rows[0];
      const maxAttempts = otpRecord.max_attempts || 3;
      const attempts = otpRecord.attempts || 0;

      if (attempts >= maxAttempts) {
        await query(`UPDATE otp_codes SET is_used = true WHERE id = $1`, [otpRecord.id]);
        const error = new Error('Nombre maximum de tentatives atteint. Demandez un nouveau code.');
        error.statusCode = 429;
        error.code = 'OTP_MAX_ATTEMPTS';
        error.attemptsRemaining = 0;
        throw error;
      }

      if (otpRecord.code !== code) {
        const nextAttempts = attempts + 1;
        await query(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1`, [otpRecord.id]);

        const remaining = Math.max(0, maxAttempts - nextAttempts);
        if (remaining === 0) {
          await query(`UPDATE otp_codes SET is_used = true WHERE id = $1`, [otpRecord.id]);
          const error = new Error('Nombre maximum de tentatives atteint. Demandez un nouveau code.');
          error.statusCode = 429;
          error.code = 'OTP_MAX_ATTEMPTS';
          error.attemptsRemaining = 0;
          throw error;
        }

        return {
          success: false,
          error: 'Code invalide ou expiré',
          attemptsRemaining: remaining,
        };
      }

      await query(`UPDATE otp_codes SET is_used = true WHERE id = $1`, [otpRecord.id]);

      logger.info('OTP vérifié avec succès', { phone, type: otpRecord.type });

      return {
        success: true,
        otpRecord,
        attemptsRemaining: Math.max(0, maxAttempts - attempts),
      };
    } catch (error) {
      logger.error('Erreur vérification OTP', { 
        phone, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Trouver ou créer un utilisateur client
   */
  async findOrCreateUser(phone, userData = {}) {
    try {
      return await transaction(async (client) => {
        // Vérifier les colonnes disponibles
        const tableInfo = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users'
        `);
        const columns = tableInfo.rows.map(row => row.column_name);
        const hasLastLogin = columns.includes('last_login');
        const hasStatus = columns.includes('status');

        // Vérifier si l'utilisateur existe
        let result = await client.query(
          'SELECT * FROM users WHERE phone = $1',
          [phone]
        );

        if (result.rows.length > 0) {
          // Mettre à jour last_login si la colonne existe
          if (hasLastLogin) {
            await client.query(
              'UPDATE users SET last_login = NOW() WHERE id = $1',
              [result.rows[0].id]
            );
          }

          logger.info('Utilisateur existant connecté', { 
            userId: result.rows[0].id,
            phone 
          });

          return { user: result.rows[0], isNew: false };
        }

        // Créer un nouveau utilisateur
        const referralCode = await this.generateUniqueReferralCode(client);
        
        // Construire la requête dynamiquement selon les colonnes disponibles
        let insertQuery = `INSERT INTO users (
          phone, 
          first_name, 
          last_name, 
          email,
          referral_code`;
        
        if (hasStatus) {
          insertQuery += `, status`;
        }
        if (hasLastLogin) {
          insertQuery += `, last_login`;
        }
        
        insertQuery += `) VALUES ($1, $2, $3, $4, $5`;
        
        const values = [
          phone, 
          userData.first_name || null, 
          userData.last_name || null,
          userData.email || null,
          referralCode
        ];
        
        let paramIndex = 6;
        if (hasStatus) {
          insertQuery += `, 'active'`;
        }
        if (hasLastLogin) {
          insertQuery += `, NOW()`;
        }
        
        insertQuery += `) RETURNING *`;
        
        result = await client.query(insertQuery, values);

        const newUser = result.rows[0];

        // Vérifier si référé par quelqu'un
        if (userData.referred_by_code) {
          await this.processReferral(client, newUser.id, userData.referred_by_code);
        }

        logger.info('Nouvel utilisateur créé', { 
          userId: newUser.id,
          phone,
          referralCode 
        });

        return { user: newUser, isNew: true };
      });
    } catch (error) {
      logger.error('Erreur findOrCreateUser', { 
        phone, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Créer un compte restaurant
   */
  async createRestaurant(restaurantData, password) {
    try {
      return await transaction(async (client) => {
        // Vérifier unicité du phone et email
        const existing = await client.query(
          `SELECT id FROM restaurants 
           WHERE phone = $1 OR email = $2`,
          [restaurantData.phone, restaurantData.email]
        );

        if (existing.rows.length > 0) {
          throw new Error('Un restaurant avec ce téléphone ou email existe déjà');
        }

        // Hasher le mot de passe
        const passwordHash = await bcrypt.hash(password, config.bcryptRounds || 10);

        // Générer le slug
        const slug = await this.generateUniqueSlug(
          client, 
          restaurantData.name, 
          'restaurants'
        );

        // Créer le restaurant
        const result = await client.query(
          `INSERT INTO restaurants (
            name, slug, phone, email, password_hash,
            category, cuisine_type, description,
            address, district, latitude, longitude,
            delivery_radius, mobile_money_number, 
            mobile_money_provider, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'pending')
          RETURNING *`,
          [
            restaurantData.name,
            slug,
            restaurantData.phone,
            restaurantData.email,
            passwordHash,
            restaurantData.category,
            restaurantData.cuisine_type || null,
            restaurantData.description || null,
            restaurantData.address,
            restaurantData.district || null,
            restaurantData.latitude,
            restaurantData.longitude,
            restaurantData.delivery_radius || 10.0,
            restaurantData.mobile_money_number || null,
            restaurantData.mobile_money_provider || null
          ]
        );

        logger.info('Restaurant créé', { 
          restaurantId: result.rows[0].id,
          name: restaurantData.name,
          status: 'pending'
        });

        return result.rows[0];
      });
    } catch (error) {
      logger.error('Erreur création restaurant', { 
        name: restaurantData.name,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Créer un compte livreur
   */
  async createDeliveryPerson(deliveryData, password) {
    try {
      return await transaction(async (client) => {
        // Vérifier unicité du phone
        const existing = await client.query(
          'SELECT id FROM delivery_persons WHERE phone = $1',
          [deliveryData.phone]
        );

        if (existing.rows.length > 0) {
          throw new Error('Un livreur avec ce numéro existe déjà');
        }

        // Hasher le mot de passe
        const passwordHash = await bcrypt.hash(password, config.bcryptRounds || 10);

        // Créer le livreur
        const result = await client.query(
          `INSERT INTO delivery_persons (
            phone, password_hash, first_name, last_name,
            vehicle_type, vehicle_plate,
            mobile_money_number, mobile_money_provider,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
          RETURNING *`,
          [
            deliveryData.phone,
            passwordHash,
            deliveryData.first_name,
            deliveryData.last_name,
            deliveryData.vehicle_type,
            deliveryData.vehicle_plate || null,
            deliveryData.mobile_money_number || null,
            deliveryData.mobile_money_provider || null
          ]
        );

        logger.info('Livreur créé', { 
          deliveryId: result.rows[0].id,
          phone: deliveryData.phone,
          status: 'pending'
        });

        return result.rows[0];
      });
    } catch (error) {
      logger.error('Erreur création livreur', { 
        phone: deliveryData.phone,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Connexion avec mot de passe (restaurants, livreurs, admins)
   */
  async loginWithPassword(identifier, password, userType) {
    try {
      let table, field;

      switch (userType) {
        case 'restaurant':
          table = 'restaurants';
          field = 'email';
          break;
        case 'delivery_person':
          table = 'delivery_persons';
          field = 'phone';
          break;
        case 'admin':
          table = 'admins';
          field = 'email';
          break;
        default:
          throw new Error('Type utilisateur invalide');
      }

      const result = await query(
        `SELECT * FROM ${table} WHERE ${field} = $1`,
        [identifier]
      );

      if (result.rows.length === 0) {
        logger.warn('Tentative de connexion échouée - utilisateur introuvable', {
          identifier,
          userType
        });
        return {
          success: false,
          error: 'Identifiants invalides',
        };
      }

      const user = result.rows[0];

      // Vérifier le mot de passe
      const isValid = await bcrypt.compare(password, user.password_hash);

      if (!isValid) {
        logger.warn('Tentative de connexion échouée - mot de passe incorrect', {
          userId: user.id,
          userType
        });
        return {
          success: false,
          error: 'Identifiants invalides',
        };
      }

      // Vérifier le statut
      const status = user.status || user.is_active;
      if (status === 'suspended' || status === false) {
        return {
          success: false,
          error: 'Votre compte est suspendu',
        };
      }

      // Mettre à jour last_login
      if (userType === 'admin') {
        await query(
          `UPDATE ${table} SET last_login = NOW() WHERE id = $1`,
          [user.id]
        );
      }

      logger.info('Connexion réussie', { 
        userId: user.id,
        userType 
      });

      // Retirer le password_hash de la réponse
      delete user.password_hash;

      return {
        success: true,
        user,
      };
    } catch (error) {
      logger.error('Erreur loginWithPassword', { 
        identifier,
        userType,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Générer un code de parrainage unique
   */
  async generateUniqueReferralCode(client = null) {
    const queryFn = client ? client.query.bind(client) : query;
    let code;
    let isUnique = false;

    while (!isUnique) {
      code = this.generateRandomCode(8);
      
      const result = await queryFn(
        'SELECT id FROM users WHERE referral_code = $1',
        [code]
      );

      if (result.rows.length === 0) {
        isUnique = true;
      }
    }

    return code;
  }

  /**
   * Générer un slug unique
   */
  async generateUniqueSlug(client, name, table) {
    const queryFn = client ? client.query.bind(client) : query;
    let slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      const testSlug = counter === 1 ? slug : `${slug}-${counter}`;
      
      const result = await queryFn(
        `SELECT id FROM ${table} WHERE slug = $1`,
        [testSlug]
      );

      if (result.rows.length === 0) {
        slug = testSlug;
        isUnique = true;
      } else {
        counter++;
      }
    }

    return slug;
  }

  /**
   * Générer un code aléatoire
   */
  generateRandomCode(length) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sans O, 0, I, 1
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Traiter le parrainage
   */
  async processReferral(client, newUserId, referralCode) {
    try {
      // Trouver le parrain
      const referrer = await client.query(
        'SELECT id, loyalty_points FROM users WHERE referral_code = $1',
        [referralCode]
      );

      if (referrer.rows.length === 0) {
        logger.warn('Code de parrainage invalide', { referralCode });
        return;
      }

      const referrerId = referrer.rows[0].id;

      // Lier le nouveau user au parrain
      await client.query(
        'UPDATE users SET referred_by = $1 WHERE id = $2',
        [referrerId, newUserId]
      );

      // Récompenser le parrain (500 points)
      const rewardPoints = config.business?.referrerReward || 500;
      await client.query(
        'UPDATE users SET loyalty_points = loyalty_points + $1 WHERE id = $2',
        [rewardPoints, referrerId]
      );

      logger.info('Parrainage traité', { 
        referrerId,
        newUserId,
        rewardPoints 
      });
    } catch (error) {
      logger.error('Erreur traitement parrainage', { 
        newUserId,
        referralCode,
        error: error.message 
      });
      // Ne pas bloquer la création du compte si le parrainage échoue
    }
  }

  /**
   * Nettoyer les OTP expirés (à exécuter périodiquement)
   */
  async cleanupExpiredOTP() {
    try {
      const result = await query(
        `DELETE FROM otp_codes 
         WHERE expires_at < NOW() - INTERVAL '24 hours'`
      );

      logger.info('OTP expirés nettoyés', { 
        deleted: result.rowCount 
      });

      return result.rowCount;
    } catch (error) {
      logger.error('Erreur nettoyage OTP', { 
        error: error.message 
      });
      throw error;
    }
  }
}

module.exports = new AuthService();
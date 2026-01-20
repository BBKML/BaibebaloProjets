const config = require('../config');
const logger = require('../utils/logger');
const { query } = require('../database/db');
const twilio = require('twilio');
const axios = require('axios');

class SMSService {
  constructor() {
    this.provider = config.sms.provider || 'dev';
    
    // Initialiser Twilio si configuré
    if (this.provider === 'twilio' && config.sms.twilio.accountSid) {
      this.twilioClient = twilio(
        config.sms.twilio.accountSid,
        config.sms.twilio.authToken
      );
      logger.info('Twilio initialisé');
    }

    // Vérifier configuration providers
    this.validateProviderConfig();
  }

  /**
   * Valider la configuration du provider
   */
  validateProviderConfig() {
    const configs = {
      twilio: ['accountSid', 'authToken', 'phoneNumber'],
      nexah: ['apiKey', 'senderId'],
      orange: ['clientId', 'clientSecret', 'sender'],
    };

    if (this.provider !== 'dev' && configs[this.provider]) {
      const required = configs[this.provider];
      const missing = required.filter(field => !config.sms[this.provider]?.[field]);
      
      if (missing.length > 0) {
        logger.warn(`Configuration ${this.provider} incomplète`, { missing });
      }
    }
  }

  /**
   * Valider format numéro téléphone CI
   */
  validatePhoneNumber(phone) {
    // Format: +225 XX XX XX XX XX (10 chiffres après +225)
    const cleaned = phone.replace(/\s+/g, '');
    
    // Préfixes valides en Côte d'Ivoire
    const validPrefixes = /^\+225(0[1457]|[4-9])\d{8}$/;
    
    if (!validPrefixes.test(cleaned)) {
      throw new Error(`Numéro invalide pour la Côte d'Ivoire: ${phone}`);
    }

    return cleaned;
  }

  /**
   * Envoyer un SMS avec retry logic
   */
  async send(phone, message, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;

    // Valider le numéro
    try {
      phone = this.validatePhoneNumber(phone);
    } catch (error) {
      logger.error('Numéro de téléphone invalide', { phone, error: error.message });
      throw error;
    }

    // Tronquer le message si trop long (160 caractères pour SMS standard)
    if (message.length > 160) {
      logger.warn('Message SMS tronqué', { 
        originalLength: message.length,
        phone 
      });
      message = message.substring(0, 157) + '...';
    }

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Tentative SMS ${attempt}/${maxRetries}`, { 
          phone, 
          provider: this.provider 
        });

        let result;

        switch (this.provider) {
          case 'twilio':
            result = await this.sendViaTwilio(phone, message);
            break;
          
          case 'nexah':
            result = await this.sendViaNexah(phone, message);
            break;
          
          case 'orange':
            result = await this.sendViaOrange(phone, message);
            break;
          
          case 'dev':
          default:
            result = this.sendViaDev(phone, message);
            break;
        }

        // Logger le succès
        await this.logSMS(phone, message, 'sent', this.provider, result.messageId);

        logger.info('SMS envoyé avec succès', { 
          phone, 
          provider: this.provider,
          messageId: result.messageId,
          attempt 
        });

        return result;

      } catch (error) {
        lastError = error;
        
        logger.error(`Échec envoi SMS (tentative ${attempt}/${maxRetries})`, {
          phone,
          provider: this.provider,
          error: error.message,
          attempt
        });

        // Si c'est la dernière tentative, logger l'échec
        if (attempt === maxRetries) {
          await this.logSMS(phone, message, 'failed', this.provider, null, error.message);
          throw new Error(`Échec envoi SMS après ${maxRetries} tentatives: ${error.message}`);
        }

        // Attendre avant de réessayer (exponential backoff)
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Envoyer via Twilio
   */
  async sendViaTwilio(phone, message) {
    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: config.sms.twilio.phoneNumber,
        to: phone,
      });

      return { 
        success: true, 
        provider: 'twilio', 
        messageId: result.sid,
        cost: result.price ? Math.abs(parseFloat(result.price)) : null
      };
    } catch (error) {
      logger.error('Erreur Twilio', { 
        error: error.message,
        code: error.code 
      });
      throw new Error(`Twilio error: ${error.message}`);
    }
  }

  /**
   * Envoyer via Nexah (CI)
   */
  async sendViaNexah(phone, message) {
    try {
      const endpoint = config.sms.nexah.endpoint || 'https://api.nexah.net/api/v1/sms/send';
      
      const response = await axios.post(
        endpoint,
        {
          apiKey: config.sms.nexah.apiKey,
          from: config.sms.nexah.senderId || 'BAIBEBALO',
          to: phone,
          message: message,
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.data.success === false) {
        throw new Error(response.data.message || 'Erreur Nexah');
      }

      return { 
        success: true, 
        provider: 'nexah', 
        messageId: response.data.messageId || response.data.id,
        cost: 15 // FCFA (estimation)
      };
    } catch (error) {
      if (error.response) {
        logger.error('Erreur Nexah API', { 
          status: error.response.status,
          data: error.response.data 
        });
        throw new Error(`Nexah error: ${error.response.data.message || error.message}`);
      }
      throw new Error(`Nexah error: ${error.message}`);
    }
  }

  /**
   * Envoyer via Orange SMS API (CI)
   */
  async sendViaOrange(phone, message) {
    try {
      // 1. Obtenir le token OAuth2
      const token = await this.getOrangeToken();

      // 2. Envoyer le SMS
      const cleanPhone = phone.replace('+', '');
      const senderPhone = config.sms.orange.sender || '+2250700000000';

      const response = await axios.post(
        `${config.sms.orange.tokenUrl?.replace('/oauth/v3/token', '')}/smsmessaging/v1/outbound/tel:${senderPhone}/requests`,
        {
          outboundSMSMessageRequest: {
            address: `tel:${cleanPhone}`,
            senderAddress: `tel:${senderPhone}`,
            outboundSMSTextMessage: {
              message: message
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000
        }
      );

      return { 
        success: true, 
        provider: 'orange', 
        messageId: response.data.outboundSMSMessageRequest?.deliveryInfoList?.[0]?.messageId,
        cost: 20 // FCFA (estimation)
      };
    } catch (error) {
      if (error.response) {
        logger.error('Erreur Orange SMS API', { 
          status: error.response.status,
          data: error.response.data 
        });
        throw new Error(`Orange SMS error: ${error.response.data.error || error.message}`);
      }
      throw new Error(`Orange SMS error: ${error.message}`);
    }
  }

  /**
   * Obtenir token Orange OAuth2
   */
  async getOrangeToken() {
    try {
      const auth = Buffer.from(
        `${config.sms.orange.clientId}:${config.sms.orange.clientSecret}`
      ).toString('base64');

      const response = await axios.post(
        config.sms.orange.tokenUrl || 'https://api.orange.com/oauth/v3/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000
        }
      );

      return response.data.access_token;
    } catch (error) {
      logger.error('Erreur obtention token Orange', { 
        error: error.message 
      });
      throw new Error('Impossible d\'obtenir le token Orange');
    }
  }

  /**
   * Mode développement (affiche dans la console)
   */
  sendViaDev(phone, message) {
    console.log('\n' + '═'.repeat(70));
    console.log('📱 [DEV MODE] SMS SIMULÉ');
    console.log('═'.repeat(70));
    console.log(`   📞 Destinataire: ${phone}`);
    console.log(`   💬 Message: ${message}`);
    console.log(`   ⏰ Date: ${new Date().toISOString()}`);
    console.log('═'.repeat(70) + '\n');

    return { 
      success: true, 
      provider: 'dev',
      messageId: `dev_${Date.now()}`
    };
  }

  /**
   * Envoyer un OTP
   */
  async sendOTP(phone, code, expiryMinutes = 5) {
    const message = `Votre code BAIBEBALO est: ${code}. Valide ${expiryMinutes} minutes. Ne le partagez jamais.`;
    
    return await this.send(phone, message, {
      maxRetries: 2 // Moins de retries pour OTP (urgent)
    });
  }

  /**
   * Envoyer une notification de commande
   */
  async sendOrderNotification(phone, orderNumber, status) {
    const messages = {
      accepted: `✅ Commande ${orderNumber} acceptée par le restaurant.`,
      preparing: `👨‍🍳 Commande ${orderNumber} en préparation.`,
      ready: `📦 Commande ${orderNumber} prête, livreur en route.`,
      delivering: `🚴 Commande ${orderNumber} en cours de livraison.`,
      delivered: `🎉 Commande ${orderNumber} livrée. Bon appétit !`,
      cancelled: `❌ Commande ${orderNumber} annulée.`,
    };

    const message = messages[status] || `Mise à jour commande ${orderNumber}`;
    
    return await this.send(phone, message);
  }

  /**
   * Envoyer notification au restaurant
   */
  async sendRestaurantNotification(phone, orderNumber, total) {
    const message = `🔔 Nouvelle commande ${orderNumber} - ${total} FCFA. Acceptez rapidement !`;
    
    return await this.send(phone, message, {
      maxRetries: 2 // Urgent
    });
  }

  /**
   * Envoyer notification au livreur
   */
  async sendDeliveryNotification(phone, orderNumber, restaurant, earnings) {
    const message = `🚴 Nouvelle livraison ${orderNumber} - ${restaurant}. Gains: ${earnings} FCFA. Acceptez vite !`;
    
    return await this.send(phone, message, {
      maxRetries: 2 // Urgent
    });
  }

  /**
   * Logger un SMS envoyé
   */
  async logSMS(phone, message, status, provider, messageId = null, error = null) {
    try {
      // Essayer avec message_id
      try {
        await query(
          `INSERT INTO sms_logs (phone, message, status, provider, message_id, error, sent_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [phone, message, status, provider, messageId, error]
        );
      } catch (err) {
        // Si message_id n'existe pas, essayer sans
        if (err.message.includes('message_id')) {
          await query(
            `INSERT INTO sms_logs (phone, message, status, provider, error, sent_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [phone, message, status, provider, error]
          );
        } else {
          throw err;
        }
      }
    } catch (err) {
      logger.error('Erreur logging SMS', { error: err.message });
      // Ne pas bloquer l'envoi si le logging échoue
    }
  }

  /**
   * Obtenir les statistiques SMS
   */
  async getStatistics(startDate, endDate) {
    try {
      const result = await query(
        `SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'sent') as sent,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          provider,
          DATE(sent_at) as date
         FROM sms_logs
         WHERE sent_at BETWEEN $1 AND $2
         GROUP BY provider, DATE(sent_at)
         ORDER BY date DESC`,
        [startDate, endDate]
      );

      return result.rows;
    } catch (error) {
      logger.error('Erreur statistiques SMS', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir le coût estimé
   */
  async getEstimatedCost(startDate, endDate) {
    try {
      const stats = await this.getStatistics(startDate, endDate);
      
      const costs = {
        twilio: 50, // FCFA
        nexah: 15,  // FCFA
        orange: 20, // FCFA
        dev: 0
      };

      let totalCost = 0;
      
      stats.forEach(stat => {
        const costPerSMS = costs[stat.provider] || 0;
        totalCost += parseInt(stat.sent) * costPerSMS;
      });

      return {
        totalCost,
        currency: 'FCFA',
        stats
      };
    } catch (error) {
      logger.error('Erreur calcul coût SMS', { error: error.message });
      throw error;
    }
  }

  /**
   * Nettoyer les anciens logs (plus de 90 jours)
   */
  async cleanupOldLogs() {
    try {
      const result = await query(
        `DELETE FROM sms_logs 
         WHERE sent_at < NOW() - INTERVAL '90 days'`
      );

      logger.info('Anciens logs SMS nettoyés', { deleted: result.rowCount });
      return result.rowCount;
    } catch (error) {
      logger.error('Erreur nettoyage logs SMS', { error: error.message });
      throw error;
    }
  }
}

module.exports = new SMSService();
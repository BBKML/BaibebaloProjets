const axios = require('axios');
const config = require('../../config');
const logger = require('../../utils/logger');

class OrangeMoneyService {
  constructor() {
    this.endpoint = config.payment.orangeMoney.endpoint;
    this.merchantKey = config.payment.orangeMoney.merchantKey;
    this.secret = config.payment.orangeMoney.secret;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Obtenir un token d'accès OAuth2
   */
  async getAccessToken() {
    try {
      // Si token existe et n'est pas expiré
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      const response = await axios.post(
        `${this.endpoint}/oauth/v2/token`,
        {
          grant_type: 'client_credentials',
        },
        {
          auth: {
            username: this.merchantKey,
            password: this.secret,
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Token expire généralement dans 1 heure
      this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;

      logger.info('Token Orange Money obtenu');
      return this.accessToken;
    } catch (error) {
      logger.error('Erreur obtention token Orange Money:', error.response?.data || error.message);
      throw new Error('Impossible d\'obtenir le token Orange Money');
    }
  }

  /**
   * Initier un paiement
   */
  async initiatePayment(orderNumber, amount, phoneNumber, returnUrl) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.endpoint}/webpayment/v1/transactions/webpayment`,
        {
          merchant_key: this.merchantKey,
          currency: 'XOF',
          order_id: orderNumber,
          amount: amount,
          return_url: returnUrl || `${config.urls.frontend}/payment/success`,
          cancel_url: `${config.urls.frontend}/payment/cancel`,
          notif_url: `${config.urls.api}/api/v1/webhooks/orange-money`,
          lang: 'fr',
          reference: orderNumber,
          customer_firstname: 'Client',
          customer_lastname: 'BAIBEBALO',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`Paiement Orange Money initié: ${orderNumber}`);

      return {
        success: true,
        payment_url: response.data.payment_url,
        payment_token: response.data.payment_token,
        order_id: orderNumber,
      };
    } catch (error) {
      logger.error('Erreur initiation paiement Orange Money:', error.response?.data || error.message);
      throw new Error('Erreur lors de l\'initiation du paiement');
    }
  }

  /**
   * Vérifier le statut d'un paiement
   */
  async checkPaymentStatus(paymentToken) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.endpoint}/webpayment/v1/transactions/${paymentToken}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const status = response.data.status;

      return {
        success: true,
        status: this.mapStatus(status),
        transaction_id: response.data.transaction_id,
        raw_status: status,
      };
    } catch (error) {
      logger.error('Erreur vérification paiement Orange Money:', error.response?.data || error.message);
      throw new Error('Erreur lors de la vérification du paiement');
    }
  }

  /**
   * Effectuer un paiement (transfert vers un numéro)
   */
  async payout(amount, phoneNumber, reference) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.endpoint}/payout/v1/transactions`,
        {
          amount: amount,
          currency: 'XOF',
          receiver_phone_number: phoneNumber,
          reference: reference,
          description: `Retrait BAIBEBALO - ${reference}`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`Payout Orange Money effectué: ${reference}`);

      return {
        success: true,
        transaction_id: response.data.transaction_id,
        status: response.data.status,
      };
    } catch (error) {
      logger.error('Erreur payout Orange Money:', error.response?.data || error.message);
      throw new Error('Erreur lors du paiement');
    }
  }

  /**
   * Mapper les statuts Orange Money vers nos statuts
   */
  mapStatus(orangeStatus) {
    const statusMap = {
      'SUCCESS': 'completed',
      'PENDING': 'pending',
      'FAILED': 'failed',
      'EXPIRED': 'expired',
      'CANCELLED': 'cancelled',
    };

    return statusMap[orangeStatus] || 'unknown';
  }

  /**
   * Valider un numéro Orange Money
   */
  isValidPhoneNumber(phoneNumber) {
    // Format: +225 07/05/01 XX XX XX XX
    const cleanNumber = phoneNumber.replace(/\s+/g, '');
    return /^\+225(07|05|01)\d{8}$/.test(cleanNumber);
  }

  /**
   * Gérer le webhook de notification
   */
  async handleWebhook(webhookData) {
    try {
      const {
        // payment_token non utilisé mais présent dans les données
        status,
        order_id,
        transaction_id,
      } = webhookData;

      logger.info('Webhook Orange Money reçu:', {
        order_id,
        status,
        transaction_id,
      });

      // Mettre à jour la commande dans la base de données
      const { query } = require('../../database/db');

      const mappedStatus = this.mapStatus(status);

      if (mappedStatus === 'completed') {
        await query(
          `UPDATE orders 
           SET payment_status = 'paid', payment_reference = $1
           WHERE order_number = $2`,
          [transaction_id, order_id]
        );

        await query(
          `UPDATE transactions 
           SET status = 'completed', reference = $1
           WHERE order_id = (SELECT id FROM orders WHERE order_number = $2)
           AND type = 'order_payment'`,
          [transaction_id, order_id]
        );

        logger.info(`Paiement Orange Money confirmé: ${order_id}`);
      } else if (mappedStatus === 'failed') {
        await query(
          `UPDATE orders 
           SET payment_status = 'failed'
           WHERE order_number = $1`,
          [order_id]
        );

        logger.warn(`Paiement Orange Money échoué: ${order_id}`);
      }

      return {
        success: true,
        status: mappedStatus,
      };
    } catch (error) {
      logger.error('Erreur traitement webhook Orange Money:', error);
      throw error;
    }
  }
}

module.exports = new OrangeMoneyService();
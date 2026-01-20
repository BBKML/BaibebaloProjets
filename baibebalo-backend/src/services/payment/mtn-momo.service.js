const axios = require('axios');
const crypto = require('crypto');
const config = require('../../config');
const logger = require('../../utils/logger');

class MTNMoMoService {
  constructor() {
    this.endpoint = config.payment.mtnMomo.endpoint;
    this.apiKey = config.payment.mtnMomo.apiKey;
    this.secret = config.payment.mtnMomo.secret;
    this.subscriptionKey = null;
  }

  /**
   * Générer un UUID v4
   */
  generateUUID() {
    return crypto.randomUUID();
  }

  /**
   * Créer une API User (une fois)
   */
  async createAPIUser() {
    try {
      const userId = this.generateUUID();

      await axios.post(
        `${this.endpoint}/v1_0/apiuser`,
        {
          providerCallbackHost: config.urls.api,
        },
        {
          headers: {
            'X-Reference-Id': userId,
            'Ocp-Apim-Subscription-Key': this.apiKey,
          },
        }
      );

      logger.info('API User MTN créé:', userId);
      return userId;
    } catch (error) {
      logger.error('Erreur création API User MTN:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Créer une API Key
   */
  async createAPIKey(userId) {
    try {
      const response = await axios.post(
        `${this.endpoint}/v1_0/apiuser/${userId}/apikey`,
        {},
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.apiKey,
          },
        }
      );

      logger.info('API Key MTN créée');
      return response.data.apiKey;
    } catch (error) {
      logger.error('Erreur création API Key MTN:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Obtenir un token d'accès
   */
  async getAccessToken() {
    try {
      const auth = Buffer.from(`${this.apiKey}:${this.secret}`).toString('base64');

      const response = await axios.post(
        `${this.endpoint}/collection/token/`,
        {},
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey || this.apiKey,
          },
        }
      );

      return response.data.access_token;
    } catch (error) {
      logger.error('Erreur obtention token MTN:', error.response?.data || error.message);
      throw new Error('Impossible d\'obtenir le token MTN MoMo');
    }
  }

  /**
   * Demander un paiement (Request to Pay)
   */
  async requestPayment(amount, phoneNumber, externalId, payerMessage) {
    try {
      const token = await this.getAccessToken();
      const referenceId = this.generateUUID();

      await axios.post(
        `${this.endpoint}/collection/v1_0/requesttopay`,
        {
          amount: amount.toString(),
          currency: 'XOF',
          externalId: externalId,
          payer: {
            partyIdType: 'MSISDN',
            partyId: phoneNumber.replace('+', ''),
          },
          payerMessage: payerMessage || 'Paiement BAIBEBALO',
          payeeNote: `Commande ${externalId}`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Reference-Id': referenceId,
            'X-Target-Environment': config.env === 'production' ? 'production' : 'sandbox',
            'Ocp-Apim-Subscription-Key': this.subscriptionKey || this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`Paiement MTN MoMo demandé: ${externalId}`);

      return {
        success: true,
        reference_id: referenceId,
        external_id: externalId,
      };
    } catch (error) {
      logger.error('Erreur demande paiement MTN:', error.response?.data || error.message);
      throw new Error('Erreur lors de la demande de paiement');
    }
  }

  /**
   * Vérifier le statut d'un paiement
   */
  async checkPaymentStatus(referenceId) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.endpoint}/collection/v1_0/requesttopay/${referenceId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Target-Environment': config.env === 'production' ? 'production' : 'sandbox',
            'Ocp-Apim-Subscription-Key': this.subscriptionKey || this.apiKey,
          },
        }
      );

      const status = response.data.status;

      return {
        success: true,
        status: this.mapStatus(status),
        raw_status: status,
        financial_transaction_id: response.data.financialTransactionId,
        external_id: response.data.externalId,
      };
    } catch (error) {
      logger.error('Erreur vérification paiement MTN:', error.response?.data || error.message);
      throw new Error('Erreur lors de la vérification du paiement');
    }
  }

  /**
   * Effectuer un transfert (payout)
   */
  async transfer(amount, phoneNumber, externalId, payeeNote) {
    try {
      const token = await this.getAccessToken();
      const referenceId = this.generateUUID();

      await axios.post(
        `${this.endpoint}/disbursement/v1_0/transfer`,
        {
          amount: amount.toString(),
          currency: 'XOF',
          externalId: externalId,
          payee: {
            partyIdType: 'MSISDN',
            partyId: phoneNumber.replace('+', ''),
          },
          payerMessage: 'Retrait BAIBEBALO',
          payeeNote: payeeNote || `Paiement ${externalId}`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Reference-Id': referenceId,
            'X-Target-Environment': config.env === 'production' ? 'production' : 'sandbox',
            'Ocp-Apim-Subscription-Key': this.subscriptionKey || this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`Transfert MTN MoMo effectué: ${externalId}`);

      return {
        success: true,
        reference_id: referenceId,
        external_id: externalId,
      };
    } catch (error) {
      logger.error('Erreur transfert MTN:', error.response?.data || error.message);
      throw new Error('Erreur lors du transfert');
    }
  }

  /**
   * Vérifier le solde du compte
   */
  async getBalance() {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.endpoint}/collection/v1_0/account/balance`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Target-Environment': config.env === 'production' ? 'production' : 'sandbox',
            'Ocp-Apim-Subscription-Key': this.subscriptionKey || this.apiKey,
          },
        }
      );

      return {
        available_balance: parseFloat(response.data.availableBalance),
        currency: response.data.currency,
      };
    } catch (error) {
      logger.error('Erreur obtention solde MTN:', error.response?.data || error.message);
      throw new Error('Erreur lors de la récupération du solde');
    }
  }

  /**
   * Mapper les statuts MTN vers nos statuts
   */
  mapStatus(mtnStatus) {
    const statusMap = {
      'SUCCESSFUL': 'completed',
      'PENDING': 'pending',
      'FAILED': 'failed',
      'TIMEOUT': 'expired',
    };

    return statusMap[mtnStatus] || 'unknown';
  }

  /**
   * Valider un numéro MTN
   */
  isValidPhoneNumber(phoneNumber) {
    // Format: +225 05/04 XX XX XX XX
    const cleanNumber = phoneNumber.replace(/\s+/g, '');
    return /^\+225(05|04)\d{8}$/.test(cleanNumber);
  }

  /**
   * Gérer le callback de notification
   */
  async handleCallback(callbackData) {
    try {
      const {
        // referenceId non utilisé mais présent dans les données
        status,
        externalId,
        financialTransactionId,
      } = callbackData;

      logger.info('Callback MTN MoMo reçu:', {
        externalId,
        status,
        financialTransactionId,
      });

      const { query } = require('../../database/db');
      const mappedStatus = this.mapStatus(status);

      if (mappedStatus === 'completed') {
        await query(
          `UPDATE orders 
           SET payment_status = 'paid', payment_reference = $1
           WHERE order_number = $2`,
          [financialTransactionId, externalId]
        );

        await query(
          `UPDATE transactions 
           SET status = 'completed', reference = $1
           WHERE order_id = (SELECT id FROM orders WHERE order_number = $2)
           AND type = 'order_payment'`,
          [financialTransactionId, externalId]
        );

        logger.info(`Paiement MTN MoMo confirmé: ${externalId}`);
      } else if (mappedStatus === 'failed') {
        await query(
          `UPDATE orders 
           SET payment_status = 'failed'
           WHERE order_number = $1`,
          [externalId]
        );

        logger.warn(`Paiement MTN MoMo échoué: ${externalId}`);
      }

      return {
        success: true,
        status: mappedStatus,
      };
    } catch (error) {
      logger.error('Erreur traitement callback MTN:', error);
      throw error;
    }
  }
}

module.exports = new MTNMoMoService();
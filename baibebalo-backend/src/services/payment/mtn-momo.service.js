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
   * Sécurité :
   *  1. Vérification du montant reçu vs montant attendu en DB
   *  2. Idempotence : UPDATE uniquement si payment_status = 'pending'
   */
  async handleCallback(callbackData) {
    try {
      const {
        status,
        externalId,
        financialTransactionId,
        amount: callbackAmount,
      } = callbackData;

      logger.info('Traitement callback MTN MoMo:', {
        externalId,
        status,
        financialTransactionId,
        callbackAmount,
      });

      const { query } = require('../../database/db');
      const mappedStatus = this.mapStatus(status);

      if (mappedStatus === 'completed') {
        // --- Faille 2 : Vérifier le montant ---
        const orderResult = await query(
          `SELECT id, total, payment_status, order_number FROM orders WHERE order_number = $1`,
          [externalId]
        );

        if (orderResult.rows.length === 0) {
          logger.error(`Callback MTN MoMo: commande inconnue ${externalId}`);
          return { success: false, error: 'Commande introuvable' };
        }

        const order = orderResult.rows[0];

        // Tolérance de 1 FCFA pour les arrondis
        if (callbackAmount !== undefined) {
          const received = Math.round(Number(callbackAmount));
          const expected = Math.round(Number(order.total));
          if (Math.abs(received - expected) > 1) {
            logger.error('FRAUDE DÉTECTÉE: montant callback MTN ne correspond pas', {
              externalId,
              montant_recu: received,
              montant_attendu: expected,
              financialTransactionId,
            });
            return { success: false, error: 'Montant invalide' };
          }
        } else {
          logger.warn(`Callback MTN MoMo: champ amount absent pour ${externalId} — vérification ignorée`);
        }

        // --- Faille 3 : Idempotence — n'agit que si encore en attente ---
        if (order.payment_status === 'paid') {
          logger.info(`Callback MTN MoMo dupliqué ignoré (déjà payé): ${externalId}`);
          return { success: true, status: 'already_paid' };
        }

        if (order.payment_status === 'cancelled') {
          logger.warn(`Callback MTN MoMo: commande annulée ${externalId}`);
          return { success: false, error: 'Commande annulée' };
        }

        await query(
          `UPDATE orders
           SET payment_status = 'paid', paid_at = NOW(), payment_reference = $1, updated_at = NOW()
           WHERE order_number = $2 AND payment_status = 'pending'`,
          [financialTransactionId, externalId]
        );

        await query(
          `UPDATE transactions
           SET status = 'completed', payment_reference = $1, completed_at = NOW()
           WHERE order_id = $2 AND transaction_type = 'order_payment' AND status != 'completed'`,
          [financialTransactionId, order.id]
        );

        logger.info(`Paiement MTN MoMo confirmé: ${externalId} — montant: ${order.total} FCFA`);

      } else if (mappedStatus === 'failed') {
        await query(
          `UPDATE orders
           SET payment_status = 'failed'
           WHERE order_number = $1 AND payment_status = 'pending'`,
          [externalId]
        );
        logger.warn(`Paiement MTN MoMo échoué: ${externalId}`);
      }

      return { success: true, status: mappedStatus };
    } catch (error) {
      logger.error('Erreur traitement callback MTN:', error);
      throw error;
    }
  }
}

module.exports = new MTNMoMoService();
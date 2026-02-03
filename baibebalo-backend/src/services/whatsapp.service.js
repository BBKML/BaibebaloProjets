const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class WhatsAppService {
  constructor() {
    this.provider = config.whatsapp?.provider || 'dev';
    this.enabled = config.whatsapp?.enabled === true || config.whatsapp?.enabled === 'true';
  }

  isConfigured() {
    if (this.provider === 'dev') {
      return true;
    }
    return Boolean(
      config.whatsapp?.token
      && config.whatsapp?.phoneNumberId
      && config.whatsapp?.templateName
    );
  }

  /**
   * Envoyer un message WhatsApp via Cloud API (template)
   */
  async sendTemplate(phone, templateName, templateParams = []) {
    if (!this.enabled) {
      return { success: false, provider: this.provider, skipped: true };
    }

    if (this.provider === 'dev') {
      return this.sendViaDev(phone, templateName, templateParams);
    }

    if (!this.isConfigured()) {
      const error = 'Configuration WhatsApp incomplète';
      logger.warn(error);
      throw new Error(error);
    }

    const endpoint = `https://graph.facebook.com/v18.0/${config.whatsapp.phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to: phone.replace(/\s+/g, ''),
      type: 'template',
      template: {
        name: templateName,
        language: { code: config.whatsapp.languageCode || 'fr' },
        components: templateParams.length
          ? [
              {
                type: 'body',
                parameters: templateParams.map((value) => ({
                  type: 'text',
                  text: String(value),
                })),
              },
            ]
          : [],
      },
    };

    try {
      const response = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${config.whatsapp.token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      return {
        success: true,
        provider: 'whatsapp_cloud',
        messageId: response.data?.messages?.[0]?.id,
      };
    } catch (error) {
      logger.error('Erreur WhatsApp Cloud API', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw new Error(`WhatsApp error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Envoyer un OTP via WhatsApp (template)
   */
  async sendOTP(phone, code, expiryMinutes = 5) {
    const templateName = config.whatsapp.templateName || 'baibebalo_otp';
    const params = [code, `${expiryMinutes}`];
    return this.sendTemplate(phone, templateName, params);
  }

  /**
   * Mode développement (affiche dans la console)
   */
  sendViaDev(phone, templateName, templateParams) {
    console.log('\n' + '═'.repeat(70));
    console.log('💬 [DEV MODE] WHATSAPP SIMULÉ');
    console.log('═'.repeat(70));
    console.log(`   📞 Destinataire: ${phone}`);
    console.log(`   📄 Template: ${templateName}`);
    console.log(`   🧩 Params: ${JSON.stringify(templateParams)}`);
    console.log(`   ⏰ Date: ${new Date().toISOString()}`);
    console.log('═'.repeat(70) + '\n');

    return {
      success: true,
      provider: 'dev',
      messageId: `dev_wa_${Date.now()}`,
    };
  }
}

module.exports = new WhatsAppService();

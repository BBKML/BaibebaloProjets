const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');
const { query } = require('../database/db');

class EmailService {
  constructor() {
    // Configuration du transporteur
    this.transporter = nodemailer.createTransport({
      host: config.email.smtp?.host || process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: config.email.smtp?.port || parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT, 10) || 587,
      secure: config.email.smtp?.secure || process.env.EMAIL_SECURE === 'true' || false,
      auth: {
        user: config.email.smtp?.user || process.env.EMAIL_USER || process.env.SMTP_USER || '',
        pass: config.email.smtp?.password || process.env.EMAIL_PASSWORD || process.env.SMTP_PASSWORD || '',
      },
      pool: true, // Utiliser un pool de connexions
      maxConnections: 5,
      maxMessages: 100,
    });

    // Vérifier la connexion au démarrage
    if (config.env !== 'test') {
      this.verifyConnection();
    }
  }

  /**
   * Vérifier la connexion SMTP
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('✅ Connexion email établie', { 
        host: config.email.smtp?.host || process.env.EMAIL_HOST,
        port: config.email.smtp?.port || process.env.EMAIL_PORT 
      });
    } catch (error) {
      logger.error('❌ Erreur connexion email', { 
        error: error.message,
        host: config.email.smtp?.host || process.env.EMAIL_HOST 
      });
    }
  }

  /**
   * Envoyer un email avec retry logic
   */
  async sendEmail(to, subject, html, text = null, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 2000;

    // Valider l'email
    if (!this.isValidEmail(to)) {
      throw new Error(`Adresse email invalide: ${to}`);
    }

    // Générer version texte si non fournie
    if (!text) {
      text = this.htmlToText(html);
    }

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Tentative email ${attempt}/${maxRetries}`, { 
          to, 
          subject 
        });

        const emailUser = config.email.smtp?.user || process.env.EMAIL_USER || process.env.SMTP_USER || '';
        const fromName = config.email.fromName || process.env.EMAIL_FROM_NAME || 'BAIBEBALO';
        const fromAddress = config.email.from || process.env.EMAIL_FROM || emailUser;
        
        const mailOptions = {
          from: `${fromName} <${fromAddress}>`,
          to,
          subject,
          text,
          html,
          ...(options.attachments && { attachments: options.attachments }),
          ...(options.cc && { cc: options.cc }),
          ...(options.bcc && { bcc: options.bcc }),
        };

        const info = await this.transporter.sendMail(mailOptions);
        
        // Logger le succès
        await this.logEmail(to, subject, 'sent', info.messageId);

        logger.info('Email envoyé avec succès', { 
          to, 
          subject,
          messageId: info.messageId,
          attempt 
        });

        return {
          success: true,
          messageId: info.messageId,
          accepted: info.accepted,
          rejected: info.rejected,
        };

      } catch (error) {
        lastError = error;
        
        logger.error(`Échec envoi email (tentative ${attempt}/${maxRetries})`, {
          to,
          subject,
          error: error.message,
          attempt
        });

        // Si c'est la dernière tentative, logger l'échec
        if (attempt === maxRetries) {
          await this.logEmail(to, subject, 'failed', null, error.message);
          throw new Error(`Échec envoi email après ${maxRetries} tentatives: ${error.message}`);
        }

        // Attendre avant de réessayer (exponential backoff)
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Valider une adresse email
   */
  isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * Convertir HTML en texte simple
   */
  htmlToText(html) {
    return html
      .replace(/<style[^>]*>.*<\/style>/gm, '')
      .replace(/<script[^>]*>.*<\/script>/gm, '')
      .replace(/<[^>]+>/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Email de bienvenue client
   */
  async sendWelcomeEmail(user) {
    if (!user.email) {
      logger.warn('Pas d\'email pour utilisateur', { userId: user.id });
      return { success: false, reason: 'no_email' };
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #FF6B35 0%, #FF8B5A 100%); color: white; padding: 40px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 30px 20px; background: #f9f9f9; }
          .content h2 { color: #FF6B35; margin-top: 0; }
          .button { display: inline-block; padding: 14px 28px; background: #FF6B35; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .button:hover { background: #FF8B5A; }
          .code-box { background: #fff; border: 2px dashed #FF6B35; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; color: #FF6B35; margin: 20px 0; letter-spacing: 2px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background: #f0f0f0; }
          .footer a { color: #FF6B35; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Bienvenue sur BAIBEBALO !</h1>
          </div>
          <div class="content">
            <h2>Bonjour ${user.first_name || 'Cher client'} !</h2>
            <p>Merci de rejoindre <strong>BAIBEBALO</strong>, la plateforme de livraison #1 à Korhogo !</p>
            
            <p>Avec BAIBEBALO, commandez vos repas préférés et recevez-les chez vous en quelques minutes.</p>
            
            <h3>🎁 Votre cadeau de bienvenue :</h3>
            <div class="code-box">
              ${user.referral_code || 'WELCOME'}
            </div>
            <p style="text-align: center; color: #666; font-size: 14px;">
              Partagez ce code avec vos amis et gagnez des récompenses !
            </p>
            
            <div style="text-align: center;">
              <a href="${config.urls.clientApp}" class="button">Commander maintenant</a>
            </div>
            
            <h3>📱 Téléchargez l'application</h3>
            <p>Pour une meilleure expérience, téléchargez notre application mobile :</p>
            <ul>
              <li>Navigation plus rapide</li>
              <li>Notifications en temps réel</li>
              <li>Suivi GPS de votre livraison</li>
              <li>Offres exclusives</li>
            </ul>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} BAIBEBALO - Korhogo, Côte d'Ivoire</p>
            <p>
              Questions ? Contactez-nous : 
              <a href="mailto:support@baibebalo.ci">support@baibebalo.ci</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(
      user.email,
      'Bienvenue sur BAIBEBALO ! 🎉',
      html
    );
  }

  /**
   * Email de confirmation de commande
   */
  async sendOrderConfirmation(order, user, restaurant) {
    if (!user.email) {
      return { success: false, reason: 'no_email' };
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #FF6B35; color: white; padding: 20px; text-align: center; }
          .order-details { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .order-number { font-size: 24px; font-weight: bold; color: #FF6B35; text-align: center; margin: 10px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #ddd; }
          .total { font-size: 20px; font-weight: bold; color: #FF6B35; margin-top: 15px; text-align: right; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Commande Confirmée !</h1>
          </div>
          <div class="order-details">
            <div class="order-number">${order.order_number}</div>
            
            <div class="info-row">
              <strong>Restaurant :</strong>
              <span>${restaurant?.name || 'N/A'}</span>
            </div>
            
            <div class="info-row">
              <strong>Statut :</strong>
              <span>En préparation</span>
            </div>
            
            <div class="info-row">
              <strong>Temps estimé :</strong>
              <span>${order.estimated_delivery_time || 30} minutes</span>
            </div>
            
            <div class="info-row">
              <strong>Adresse de livraison :</strong>
              <span>${order.delivery_address?.address_line || 'N/A'}</span>
            </div>
            
            <div class="info-row">
              <strong>Mode de paiement :</strong>
              <span>${this.formatPaymentMethod(order.payment_method)}</span>
            </div>
            
            <div class="total">
              Total : ${order.total?.toLocaleString('fr-FR')} FCFA
            </div>
          </div>
          
          <p style="text-align: center;">
            Suivez votre commande en temps réel dans l'application
          </p>
          
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} BAIBEBALO</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(
      user.email,
      `Commande ${order.order_number} confirmée`,
      html
    );
  }

  /**
   * Email de validation restaurant
   */
  async sendRestaurantApproval(restaurant) {
    if (!restaurant.email) {
      return { success: false, reason: 'no_email' };
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #28a745; color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #FF6B35; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Félicitations !</h1>
          </div>
          <div class="content">
            <p>Bonjour ${restaurant.name},</p>
            
            <p>Nous sommes ravis de vous informer que <strong>votre restaurant a été approuvé</strong> et est maintenant actif sur BAIBEBALO !</p>
            
            <p>Vous pouvez dès maintenant :</p>
            <ul>
              <li>Recevoir et gérer vos commandes</li>
              <li>Mettre à jour votre menu</li>
              <li>Consulter vos statistiques</li>
              <li>Gérer votre profil</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${config.urls.adminPanel}/restaurant/login" class="button">
                Accéder au tableau de bord
              </a>
            </div>
            
            <p>Besoin d'aide ? Notre équipe est à votre disposition.</p>
            
            <p>Bienvenue dans la famille BAIBEBALO ! 🚀</p>
          </div>
          <div class="footer">
            <p>Équipe BAIBEBALO<br>support@baibebalo.ci</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(
      restaurant.email,
      'Votre restaurant est maintenant actif ! 🎉',
      html
    );
  }

  /**
   * Email de rapport hebdomadaire restaurant
   */
  async sendWeeklyReport(restaurant, stats) {
    if (!restaurant.email) {
      return { success: false, reason: 'no_email' };
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #FF6B35; color: white; padding: 20px; }
          .stat-box { display: inline-block; width: 45%; padding: 15px; margin: 5px; background: #f9f9f9; border-radius: 5px; text-align: center; }
          .stat-value { font-size: 32px; font-weight: bold; color: #FF6B35; }
          .stat-label { color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Rapport Hebdomadaire</h1>
          </div>
          <div style="padding: 20px;">
            <p>Bonjour ${restaurant.name},</p>
            <p>Voici vos performances de la semaine :</p>
            
            <div style="text-align: center;">
              <div class="stat-box">
                <div class="stat-value">${stats.total_orders || 0}</div>
                <div class="stat-label">Commandes</div>
              </div>
              
              <div class="stat-box">
                <div class="stat-value">${(stats.revenue || 0).toLocaleString()} F</div>
                <div class="stat-label">Chiffre d'affaires</div>
              </div>
              
              <div class="stat-box">
                <div class="stat-value">${stats.average_rating || 0}/5</div>
                <div class="stat-label">Note moyenne</div>
              </div>
              
              <div class="stat-box">
                <div class="stat-value">${stats.new_customers || 0}</div>
                <div class="stat-label">Nouveaux clients</div>
              </div>
            </div>
            
            ${stats.top_item ? `<p><strong>Plat le plus vendu :</strong> ${stats.top_item}</p>` : ''}
            
            <p>Continuez comme ça ! 🚀</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(
      restaurant.email,
      'Votre rapport hebdomadaire BAIBEBALO',
      html
    );
  }

  /**
   * Email de réinitialisation mot de passe
   */
  async sendPasswordReset(email, resetToken) {
    const resetUrl = `${config.urls.clientApp}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #FF6B35; color: white; text-decoration: none; border-radius: 5px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔐 Réinitialisation de mot de passe</h1>
          <p>Vous avez demandé à réinitialiser votre mot de passe BAIBEBALO.</p>
          
          <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
          </div>
          
          <div class="warning">
            <strong>⏰ Ce lien expire dans 1 heure.</strong>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. 
            Votre mot de passe actuel reste inchangé.
          </p>
          
          <p style="color: #666; font-size: 12px;">
            Si le bouton ne fonctionne pas, copiez ce lien : <br>
            <span style="word-break: break-all;">${resetUrl}</span>
          </p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(
      email,
      'Réinitialisation de mot de passe BAIBEBALO',
      html
    );
  }

  /**
   * Formater méthode de paiement
   */
  formatPaymentMethod(method) {
    const methods = {
      'cash': 'Espèces',
      'orange_money': 'Orange Money',
      'mtn_money': 'MTN Mobile Money',
      'moov_money': 'Moov Money',
      'waves': 'Wave',
    };
    return methods[method] || method;
  }

  /**
   * Logger un email
   */
  async logEmail(to, subject, status, messageId = null, error = null) {
    try {
      await query(
        `INSERT INTO email_logs (recipient, subject, status, message_id, error, sent_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [to, subject, status, messageId, error]
      );
    } catch (err) {
      logger.error('Erreur logging email', { error: err.message });
    }
  }

  /**
   * Obtenir statistiques emails
   */
  async getStatistics(startDate, endDate) {
    try {
      const result = await query(
        `SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'sent') as sent,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          DATE(sent_at) as date
         FROM email_logs
         WHERE sent_at BETWEEN $1 AND $2
         GROUP BY DATE(sent_at)
         ORDER BY date DESC`,
        [startDate, endDate]
      );

      return result.rows;
    } catch (error) {
      logger.error('Erreur statistiques email', { error: error.message });
      throw error;
    }
  }

  /**
   * Envoyer un email de réinitialisation de mot de passe (Admin)
   */
  async sendPasswordResetEmail(email, fullName, resetUrl, resetToken) {
    if (!this.isValidEmail(email)) {
      throw new Error(`Adresse email invalide: ${email}`);
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #22c38e 0%, #1a9d6e 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #333;
          }
          .message {
            color: #666;
            margin-bottom: 30px;
            line-height: 1.8;
          }
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          .reset-button {
            display: inline-block;
            background: #22c38e;
            color: white !important;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            transition: background 0.3s;
          }
          .reset-button:hover {
            background: #1a9d6e;
          }
          .token-info {
            background: #f8f9fa;
            border-left: 4px solid #22c38e;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .token-info p {
            margin: 5px 0;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: #666;
            word-break: break-all;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            color: #856404;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #e9ecef;
          }
          .footer a {
            color: #22c38e;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Réinitialisation de mot de passe</h1>
          </div>
          <div class="content">
            <div class="greeting">
              Bonjour ${fullName || 'Administrateur'},
            </div>
            <div class="message">
              <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte administrateur BAIBEBALO.</p>
              <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
            </div>
            
            <div class="button-container">
              <a href="${resetUrl}" class="reset-button">Réinitialiser mon mot de passe</a>
            </div>

            <div class="token-info">
              <p><strong>Ou copiez ce lien dans votre navigateur :</strong></p>
              <p>${resetUrl}</p>
            </div>

            <div class="warning">
              <p><strong>⚠️ Important :</strong></p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Ce lien est valide pendant <strong>1 heure</strong> uniquement</li>
                <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
                <li>Ne partagez jamais ce lien avec quelqu'un d'autre</li>
              </ul>
            </div>

            <div class="message">
              <p>Si le bouton ne fonctionne pas, copiez et collez le lien ci-dessus dans votre navigateur.</p>
            </div>
          </div>
          <div class="footer">
            <p><strong>BAIBEBALO</strong> - Plateforme de livraison</p>
            <p>Korhogo, Côte d'Ivoire</p>
            <p>
              Questions ? <a href="mailto:support@baibebalo.ci">support@baibebalo.ci</a>
            </p>
            <p style="margin-top: 15px; font-size: 11px; color: #999;">
              Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Réinitialisation de mot de passe BAIBEBALO

Bonjour ${fullName || 'Administrateur'},

Vous avez demandé à réinitialiser votre mot de passe pour votre compte administrateur BAIBEBALO.

Cliquez sur ce lien pour réinitialiser votre mot de passe :
${resetUrl}

Ce lien est valide pendant 1 heure uniquement.

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.

---
BAIBEBALO - Plateforme de livraison
Korhogo, Côte d'Ivoire
support@baibebalo.ci
    `;

    return await this.sendEmail(
      email,
      'Réinitialisation de votre mot de passe BAIBEBALO',
      html,
      text
    );
  }
}

module.exports = new EmailService();
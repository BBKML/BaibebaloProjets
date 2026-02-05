/**
 * Service de logging centralisé avec Winston
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// S'assurer que le dossier logs existe AVANT de créer le logger
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Définir les niveaux de log personnalisés
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
  },
};

// Ajouter les couleurs
winston.addColors(customLevels.colors);

// Format personnalisé pour les logs
const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  // Ajouter les métadonnées si présentes
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

// Créer le logger Winston
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: config.env === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'baibebalo-api',
    environment: config.env,
  },
  transports: [
    // Logs d'erreur dans un fichier séparé
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Tous les logs dans combined.log
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/rejections.log'),
    }),
  ],
});

// Ajouter la console en développement
if (config.env !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        customFormat
      ),
    })
  );
}

// Stream pour Morgan (logging HTTP)
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

/**
 * Logger enrichi avec méthodes utilitaires
 */
class Logger {
  constructor() {
    this.winston = logger;
  }

  /**
   * Log une erreur
   */
  error(message, meta = {}) {
    logger.error(message, meta);
  }

  /**
   * Log un avertissement
   */
  warn(message, meta = {}) {
    logger.warn(message, meta);
  }

  /**
   * Log une information
   */
  info(message, meta = {}) {
    logger.info(message, meta);
  }

  /**
   * Log HTTP (pour Morgan)
   */
  http(message, meta = {}) {
    logger.http(message, meta);
  }

  /**
   * Log de debug (développement)
   */
  debug(message, meta = {}) {
    logger.debug(message, meta);
  }

  /**
   * Anonymiser les données personnelles (PII) dans les logs
   */
  anonymizePII(data) {
    if (!data || typeof data !== 'object') return data;

    const sensitiveFields = [
      'phone', 'email', 'password', 'password_hash', 'token', 'otp', 'code',
      'address_line', 'address', 'landmark', 'bank_account', 'mobile_money_number',
      'id_card', 'driver_license', 'vehicle_registration', 'insurance',
    ];

    const anonymized = { ...data };

    for (const field of sensitiveFields) {
      if (anonymized[field]) {
        if (typeof anonymized[field] === 'string') {
          // Anonymiser partiellement (garder quelques caractères)
          const value = anonymized[field];
          if (value.length > 4) {
            anonymized[field] = value.substring(0, 2) + '***' + value.substring(value.length - 2);
          } else {
            anonymized[field] = '***';
          }
        } else {
          anonymized[field] = '[REDACTED]';
        }
      }
    }

    // Anonymiser les objets imbriqués
    for (const key in anonymized) {
      if (typeof anonymized[key] === 'object' && anonymized[key] !== null && !Array.isArray(anonymized[key])) {
        anonymized[key] = this.anonymizePII(anonymized[key]);
      }
    }

    return anonymized;
  }

  /**
   * Logger une requête HTTP (avec anonymisation PII)
   */
  logRequest(req, additionalInfo = {}) {
    const logData = {
      method: req.method,
      url: req.url,
      ip: this.anonymizeIP(req.ip),
      userAgent: req.get('user-agent'),
      userId: req.user?.id, // ID seulement, pas de données personnelles
      ...this.anonymizePII(additionalInfo),
    };
    this.http('HTTP Request', logData);
  }

  /**
   * Anonymiser l'adresse IP (garder seulement les 2 premiers octets)
   */
  anonymizeIP(ip) {
    if (!ip) return '[UNKNOWN]';
    // IPv4: 192.168.x.x
    // IPv6: simplifier
    if (ip.includes('.')) {
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.x.x`;
    }
    return '[IP_REDACTED]';
  }

  /**
   * Logger une réponse HTTP (avec anonymisation PII)
   */
  logResponse(req, res, additionalInfo = {}) {
    this.http('HTTP Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: res.get('X-Response-Time'),
      ...this.anonymizePII(additionalInfo),
    });
  }

  /**
   * Logger une action utilisateur (avec anonymisation PII)
   */
  logUserAction(userId, userType, action, details = {}) {
    this.info('User Action', {
      userId,
      userType,
      action,
      ...this.anonymizePII(details),
    });
  }

  /**
   * Logger une transaction financière
   */
  logTransaction(transactionId, type, amount, status, details = {}) {
    this.info('Transaction', {
      transactionId,
      type,
      amount,
      status,
      ...details,
    });
  }

  /**
   * Logger un événement de commande
   */
  logOrderEvent(orderId, event, details = {}) {
    this.info('Order Event', {
      orderId,
      event,
      ...details,
    });
  }

  /**
   * Logger un événement de sécurité
   */
  logSecurity(event, severity, details = {}) {
    const logMethod = severity === 'high' ? 'error' : 'warn';
    this[logMethod]('Security Event', {
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  /**
   * Logger les performances
   */
  logPerformance(operation, duration, details = {}) {
    const logMethod = duration > 1000 ? 'warn' : 'debug';
    this[logMethod]('Performance', {
      operation,
      duration: `${duration}ms`,
      ...details,
    });
  }

  /**
   * Obtenir le logger Winston brut
   */
  get stream() {
    return logger.stream;
  }
}

// Créer une instance singleton
const loggerInstance = new Logger();

module.exports = loggerInstance;

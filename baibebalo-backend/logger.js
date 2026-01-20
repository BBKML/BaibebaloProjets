const winston = require('winston');
const path = require('path');
const config = require('../config');

// Formats personnalisés
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Ajouter les métadonnées si présentes
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    
    // Ajouter la stack trace pour les erreurs
    if (stack) {
      msg += `\n${stack}`;
    }
    
    return msg;
  })
);

// Configuration des transports
const transports = [];

// Console en développement
if (config.env === 'development') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      ),
    })
  );
}

// Fichiers de logs
transports.push(
  // Tous les logs
  new winston.transports.File({
    filename: path.join('logs', 'combined.log'),
    format: customFormat,
  }),
  // Erreurs uniquement
  new winston.transports.File({
    filename: path.join('logs', 'error.log'),
    level: 'error',
    format: customFormat,
  })
);

// Créer le logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: customFormat,
  transports,
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join('logs', 'exceptions.log') 
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join('logs', 'rejections.log') 
    }),
  ],
});

// Méthodes de helper
logger.request = (req, message = 'Request') => {
  logger.info(message, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id,
  });
};

logger.apiError = (req, error, message = 'API Error') => {
  logger.error(message, {
    method: req.method,
    url: req.originalUrl,
    error: error.message,
    stack: error.stack,
    userId: req.user?.id,
  });
};

// Ne pas quitter le processus après une exception
logger.exitOnError = false;

module.exports = logger;
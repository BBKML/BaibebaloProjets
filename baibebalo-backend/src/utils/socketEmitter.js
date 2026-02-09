/**
 * Émission Socket.IO vers les rooms order_* (admin + app client)
 * Permet au client de recevoir order_status_changed, delivery_assigned, delivery_location_updated, etc.
 */

const logger = require('./logger');

/**
 * Émet un événement à la room d'une commande (namespace admin et namespace client)
 * @param {object} app - Express app (app.get('io'), app.get('clientIo'))
 * @param {string} orderId - UUID de la commande
 * @param {string} event - Nom de l'événement
 * @param {object} data - Données à envoyer
 */
function emitToOrder(app, orderId, event, data) {
  if (!app || !orderId) {
    logger.warn('emitToOrder: app ou orderId manquant', { app: !!app, orderId });
    return;
  }
  const io = app.get('io');
  const clientIo = app.get('clientIo');
  const room = `order_${orderId}`;
  
  logger.debug('emitToOrder:', { 
    orderId, 
    event, 
    room, 
    hasIo: !!io, 
    hasClientIo: !!clientIo,
    data 
  });
  
  if (io) {
    io.to(room).emit(event, data);
    logger.debug(`Événement ${event} émis vers ${room} (namespace admin)`);
  }
  if (clientIo) {
    clientIo.to(room).emit(event, data);
    logger.debug(`Événement ${event} émis vers ${room} (namespace client)`);
  }
  
  if (!io && !clientIo) {
    logger.warn('emitToOrder: Aucun namespace Socket.IO disponible', { orderId, event });
  }
}

module.exports = { emitToOrder };

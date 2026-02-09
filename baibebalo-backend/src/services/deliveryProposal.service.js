/**
 * Attribution automatique des courses (modèle Glovo)
 * Propose une commande "ready" à un livreur ; s'il refuse ou timeout, on propose au suivant.
 */

const { query } = require('../database/db');
const logger = require('../utils/logger');
const config = require('../config');

const PROPOSAL_EXPIRY_SECONDS = config.business.deliveryProposalExpirySeconds || 120;

/**
 * Propose une commande à un livreur disponible (le plus proche du restaurant si géo dispo, sinon premier dispo).
 * À appeler quand une commande passe en "ready" sans livreur assigné, ou après refus/timeout.
 * @param {string} orderId - UUID de la commande
 * @param {object} app - Express app (pour get('io'), get('partnersIo'))
 * @returns {Promise<{ proposed: boolean, deliveryPersonId?: string }>}
 */
async function proposeOrderToDelivery(orderId, app) {
  const orderResult = await query(
    `SELECT o.id, o.order_number, o.delivery_fee, o.total, o.restaurant_id, o.delivery_person_id,
            o.proposed_delivery_person_id, o.proposal_expires_at,
            r.name as restaurant_name, r.address as restaurant_address,
            r.latitude as restaurant_lat, r.longitude as restaurant_lng
     FROM orders o
     JOIN restaurants r ON o.restaurant_id = r.id
     WHERE o.id = $1 AND o.status = 'ready' AND o.delivery_person_id IS NULL`,
    [orderId]
  );

  if (orderResult.rows.length === 0) {
    return { proposed: false };
  }

  const order = orderResult.rows[0];

  // Livreurs actifs et disponibles (hors ceux déjà en proposition non expirée pour cette commande)
  const deliveryPersonsResult = await query(
    `SELECT id, fcm_token, current_latitude, current_longitude
     FROM delivery_persons
     WHERE status = 'active'
       AND delivery_status = 'available'
       AND id != COALESCE($1, '00000000-0000-0000-0000-000000000000'::uuid)
     ORDER BY
       CASE
         WHEN current_latitude IS NOT NULL AND current_longitude IS NOT NULL
              AND (SELECT latitude FROM restaurants WHERE id = $2) IS NOT NULL
         THEN earth_distance(
           ll_to_earth(current_latitude, current_longitude),
           ll_to_earth((SELECT latitude FROM restaurants WHERE id = $2), (SELECT longitude FROM restaurants WHERE id = $2))
         )
         ELSE 999999999
       END ASC,
       id
     LIMIT 1`,
    [order.proposed_delivery_person_id || null, order.restaurant_id]
  );

  if (deliveryPersonsResult.rows.length === 0) {
    logger.info(`Aucun livreur disponible pour la commande ${order.order_number}`);
    return { proposed: false };
  }

  const deliveryPerson = deliveryPersonsResult.rows[0];
  const expiresAt = new Date(Date.now() + PROPOSAL_EXPIRY_SECONDS * 1000);

  await query(
    `UPDATE orders
     SET proposed_delivery_person_id = $1, proposal_expires_at = $2, updated_at = NOW()
     WHERE id = $3`,
    [deliveryPerson.id, expiresAt, orderId]
  );

  const partnersIo = app && app.get('partnersIo');
  if (partnersIo) {
    partnersIo.to(`delivery_${deliveryPerson.id}`).emit('order_proposed', {
      order_id: orderId,
      order_number: order.order_number,
      restaurant_name: order.restaurant_name,
      restaurant_address: order.restaurant_address,
      restaurant_lat: order.restaurant_lat,
      restaurant_lng: order.restaurant_lng,
      delivery_fee: order.delivery_fee,
      total: order.total,
      expires_at: expiresAt.toISOString(),
      expires_in_seconds: PROPOSAL_EXPIRY_SECONDS,
    });
  }

  try {
    const notificationService = require('./notification.service');
    await notificationService.sendToUser(deliveryPerson.id, 'delivery', {
      title: '📦 Course proposée',
      body: `${order.restaurant_name} - ${order.delivery_fee || order.total} FCFA. Acceptez dans les ${Math.floor(PROPOSAL_EXPIRY_SECONDS / 60)} min.`,
      type: 'order_proposed',
      data: {
        order_id: orderId,
        order_number: order.order_number,
        restaurant_name: order.restaurant_name,
        expires_at: expiresAt.toISOString(),
        expires_in_seconds: PROPOSAL_EXPIRY_SECONDS,
      },
      channel: 'deliveries',
    });
  } catch (err) {
    logger.warn('Push order_proposed ignorée', { error: err.message, deliveryPersonId: deliveryPerson.id });
  }

  logger.info(`Course proposée: ${order.order_number} → livreur ${deliveryPerson.id} (expire ${expiresAt.toISOString()})`);
  return { proposed: true, deliveryPersonId: deliveryPerson.id };
}

/**
 * Annule la proposition en cours pour une commande (refus ou timeout) et propose au suivant si possible.
 * @param {string} orderId - UUID de la commande
 * @param {object} app - Express app
 */
async function clearProposalAndProposeNext(orderId, app) {
  await query(
    `UPDATE orders
     SET proposed_delivery_person_id = NULL, proposal_expires_at = NULL, updated_at = NOW()
     WHERE id = $1 AND status = 'ready' AND delivery_person_id IS NULL`,
    [orderId]
  );
  return proposeOrderToDelivery(orderId, app);
}

module.exports = {
  proposeOrderToDelivery,
  clearProposalAndProposeNext,
  PROPOSAL_EXPIRY_SECONDS,
};

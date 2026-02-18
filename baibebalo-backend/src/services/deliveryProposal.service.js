/**
 * Attribution automatique des courses (modèle Glovo)
 * Propose une commande "ready" aux 3 livreurs les plus proches ; le premier à accepter obtient la course.
 */

const { query } = require('../database/db');
const logger = require('../utils/logger');
const config = require('../config');

const PROPOSAL_EXPIRY_SECONDS = config.business.deliveryProposalExpirySeconds || 120;
const PROPOSAL_COUNT = 3;

/**
 * Propose une commande aux 3 livreurs les plus proches (ou moins si pas assez disponibles).
 * À appeler quand une commande passe en "ready" sans livreur assigné, ou après refus/timeout.
 * @param {string} orderId - UUID de la commande
 * @param {object} app - Express app (pour get('io'), get('partnersIo'))
 * @param {string[]} excludeDeliveryPersonIds - IDs des livreurs déjà proposés (pour proposer au "suivant" après refus/expiration)
 * @returns {Promise<{ proposed: boolean, deliveryPersonIds?: string[] }>}
 */
async function proposeOrderToDelivery(orderId, app, excludeDeliveryPersonIds = []) {
  const orderResult = await query(
    `SELECT o.id, o.order_number, o.delivery_fee, o.total, o.restaurant_id, o.order_type, o.delivery_person_id,
            o.pickup_address,
            r.name as restaurant_name, r.address as restaurant_address,
            r.latitude as restaurant_lat, r.longitude as restaurant_lng
     FROM orders o
     LEFT JOIN restaurants r ON o.restaurant_id = r.id
     WHERE o.id = $1 AND o.status = 'ready' AND o.delivery_person_id IS NULL`,
    [orderId]
  );

  if (orderResult.rows.length === 0) {
    return { proposed: false };
  }

  const order = orderResult.rows[0];

  // Point de référence pour la distance : restaurant (food) ou pickup (express)
  let refLat, refLon, refName, refAddress;
  if (order.order_type === 'express' && order.pickup_address) {
    const pickup = typeof order.pickup_address === 'string' ? JSON.parse(order.pickup_address) : order.pickup_address;
    refLat = pickup?.latitude;
    refLon = pickup?.longitude;
    refName = 'Point de collecte';
    refAddress = pickup?.address_line || pickup?.address || 'Collecte';
  } else if (order.restaurant_id && order.restaurant_lat != null && order.restaurant_lng != null) {
    refLat = parseFloat(order.restaurant_lat);
    refLon = parseFloat(order.restaurant_lng);
    refName = order.restaurant_name || 'Restaurant';
    refAddress = order.restaurant_address || '';
  } else {
    logger.warn(`Commande ${order.order_number}: pas de coordonnées pour proposition (order_type=${order.order_type})`);
    return { proposed: false };
  }

  const excludeProposals = await query(
    `SELECT delivery_person_id FROM order_delivery_proposals WHERE order_id = $1`,
    [orderId]
  );
  const excludeIds = [
    ...excludeDeliveryPersonIds,
    ...excludeProposals.rows.map((r) => r.delivery_person_id),
  ].filter(Boolean);

  // Livreurs actifs et disponibles, triés par distance au point de référence (restaurant ou pickup)
  const deliveryPersonsResult = await query(
    `SELECT id, fcm_token, current_latitude, current_longitude
     FROM delivery_persons
     WHERE status = 'active'
       AND delivery_status = 'available'
       ${excludeIds.length > 0 ? 'AND id != ALL($3::uuid[])' : ''}
     ORDER BY
       CASE
         WHEN current_latitude IS NOT NULL AND current_longitude IS NOT NULL
              AND $4::decimal IS NOT NULL AND $5::decimal IS NOT NULL
         THEN earth_distance(
           ll_to_earth(current_latitude, current_longitude),
           ll_to_earth($4::decimal, $5::decimal)
         )
         ELSE 999999999
       END ASC,
       id
     LIMIT $2`,
    [null, PROPOSAL_COUNT, excludeIds.length > 0 ? excludeIds : [], refLat, refLon]
  );

  if (deliveryPersonsResult.rows.length === 0) {
    logger.info(`Aucun livreur disponible pour la commande ${order.order_number}`);
    return { proposed: false };
  }

  const deliveryPersons = deliveryPersonsResult.rows;
  const expiresAt = new Date(Date.now() + PROPOSAL_EXPIRY_SECONDS * 1000);

  for (const dp of deliveryPersons) {
    await query(
      `INSERT INTO order_delivery_proposals (order_id, delivery_person_id, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (order_id, delivery_person_id) DO UPDATE SET expires_at = $3`,
      [orderId, dp.id, expiresAt]
    );
  }

  const partnersIo = app && app.get('partnersIo');
  const isExpress = order.order_type === 'express';
  const pickupAddr = isExpress && order.pickup_address
    ? (typeof order.pickup_address === 'string' ? JSON.parse(order.pickup_address) : order.pickup_address)
    : null;

  const payload = {
    order_id: orderId,
    order_number: order.order_number,
    order_type: order.order_type || 'food',
    restaurant_name: isExpress ? (pickupAddr?.address_line || 'Point de collecte') : order.restaurant_name,
    restaurant_address: isExpress ? (pickupAddr?.address_line || pickupAddr?.address || '') : order.restaurant_address,
    restaurant_lat: isExpress ? pickupAddr?.latitude : order.restaurant_lat,
    restaurant_lng: isExpress ? pickupAddr?.longitude : order.restaurant_lng,
    pickup_address: isExpress ? pickupAddr : null,
    delivery_fee: order.delivery_fee,
    total: order.total,
    expires_at: expiresAt.toISOString(),
    expires_in_seconds: PROPOSAL_EXPIRY_SECONDS,
  };

  const shortLabel = isExpress ? 'Livraison express' : (order.restaurant_name || 'Course');
  const notifBody = `${shortLabel} - ${order.delivery_fee || order.total} FCFA. Acceptez dans les ${Math.floor(PROPOSAL_EXPIRY_SECONDS / 60)} min.`;

  for (const dp of deliveryPersons) {
    if (partnersIo) {
      partnersIo.to(`delivery_${dp.id}`).emit('order_proposed', payload);
    }

    try {
      const notificationService = require('./notification.service');
      await notificationService.sendToUser(dp.id, 'delivery', {
        title: '📦 Course proposée',
        body: notifBody,
        type: 'order_proposed',
        data: {
          order_id: orderId,
          order_number: order.order_number,
          order_type: order.order_type || 'food',
          restaurant_name: payload.restaurant_name,
          expires_at: expiresAt.toISOString(),
          expires_in_seconds: PROPOSAL_EXPIRY_SECONDS,
        },
        channel: 'deliveries',
      });
    } catch (err) {
      logger.warn('Push order_proposed ignorée', { error: err.message, deliveryPersonId: dp.id });
    }
  }

  const ids = deliveryPersons.map((d) => d.id);
  logger.info(
    `Course proposée à ${ids.length} livreur(s): ${order.order_number} → [${ids.join(', ')}] (expire ${expiresAt.toISOString()})`
  );
  return { proposed: true, deliveryPersonIds: ids };
}

/**
 * Annule les propositions en cours pour une commande et propose aux 3 suivants (excluant ceux déjà proposés).
 * @param {string} orderId - UUID de la commande
 * @param {object} app - Express app
 */
async function clearProposalAndProposeNext(orderId, app) {
  const existing = await query(
    `SELECT delivery_person_id FROM order_delivery_proposals WHERE order_id = $1`,
    [orderId]
  );
  const excludeIds = existing.rows.map((r) => r.delivery_person_id);

  await query(`DELETE FROM order_delivery_proposals WHERE order_id = $1`, [orderId]);

  // Nettoyer aussi les anciennes colonnes sur orders pour cohérence
  await query(
    `UPDATE orders SET proposed_delivery_person_id = NULL, proposal_expires_at = NULL, updated_at = NOW()
     WHERE id = $1 AND status = 'ready' AND delivery_person_id IS NULL`,
    [orderId]
  );

  return proposeOrderToDelivery(orderId, app, excludeIds);
}

/**
 * Annule toutes les propositions pour une commande (ex. quand un livreur accepte).
 * @param {string} orderId - UUID de la commande
 */
async function clearProposalsForOrder(orderId) {
  await query(`DELETE FROM order_delivery_proposals WHERE order_id = $1`, [orderId]);
  await query(
    `UPDATE orders SET proposed_delivery_person_id = NULL, proposal_expires_at = NULL, updated_at = NOW()
     WHERE id = $1`,
    [orderId]
  );
}

module.exports = {
  proposeOrderToDelivery,
  clearProposalAndProposeNext,
  clearProposalsForOrder,
  PROPOSAL_EXPIRY_SECONDS,
};

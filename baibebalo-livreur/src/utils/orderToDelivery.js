/**
 * Transforme une commande API (getOrderDetail) en forme "delivery" pour les écrans
 * NavigationToRestaurant et NavigationToCustomer (coords restaurant + client pour GPS).
 * @param {object} order - Order depuis API (data.order)
 * @returns {object} delivery avec restaurant: { name, address, latitude, longitude, phone }, customer: { name, area, address, landmark, latitude, longitude, phone }, id, order_id, delivery_fee, earnings, ...
 */
export function orderToDeliveryShape(order) {
  if (!order) return null;
  
  // Parser delivery_address si c'est une string JSON
  let addr = {};
  if (order.delivery_address) {
    if (typeof order.delivery_address === 'string') {
      try {
        addr = JSON.parse(order.delivery_address);
      } catch (e) {
        console.warn('Erreur parsing delivery_address:', e);
        addr = {};
      }
    } else if (typeof order.delivery_address === 'object') {
      addr = order.delivery_address;
    }
  }
  
  const lat = (v) => (v != null && v !== '' && v !== undefined) ? parseFloat(v) : null;

  // Revenu net restaurant = subtotal - commission (calculé côté backend, fallback si manquant)
  const subtotal = parseFloat(order.subtotal) || 0;
  const commissionRate = parseFloat(order.commission_rate) || 15;
  const commissionAmount = order.commission != null ? parseFloat(order.commission) : (subtotal * commissionRate) / 100;
  const restaurantNetRevenue = order.restaurant_net_revenue != null && order.restaurant_net_revenue !== ''
    ? parseFloat(order.restaurant_net_revenue)
    : Math.max(0, subtotal - commissionAmount);
  
  // Utiliser estimated_earnings si disponible, sinon calculer à partir de delivery_fee
  // Pour une estimation basique, on prend 70% du delivery_fee (gain de base minimum)
  const estimatedEarnings = order.estimated_earnings || 
    (order.delivery_fee ? Math.round(parseFloat(order.delivery_fee) * 0.7) : 0);
  
  // Construire le nom du client avec plusieurs fallbacks
  const clientFirstName = order.client_first_name || '';
  const clientLastName = order.client_last_name || '';
  const clientName = [clientFirstName, clientLastName].filter(Boolean).join(' ') || 
                     order.customer?.name || 'Client';
  
  // Construire l'adresse complète du client
  const customerAddress = addr.address_line || addr.address || order.customer?.address || '';
  const customerArea = addr.district || addr.area || order.customer?.area || '';
  const customerLandmark = addr.landmark || order.customer?.landmark || '';
  // Prioriser client_phone depuis order (qui vient du backend) puis customer?.phone
  const customerPhone = order.client_phone || order.customer?.phone || '';
  
  console.log('🔍 orderToDeliveryShape - Données client:', {
    client_first_name: clientFirstName,
    client_last_name: clientLastName,
    client_phone_from_order: order.client_phone,
    client_phone_from_customer: order.customer?.phone,
    client_phone_final: customerPhone,
    delivery_address_raw: order.delivery_address,
    delivery_address_parsed: addr,
    customer_address: customerAddress,
    customer_area: customerArea,
    customer_landmark: customerLandmark,
    order_user_id: order.user_id,
  });
  
  const isExpress = order.order_type === 'express';
  let pickupAddr = {};
  if (isExpress && order.pickup_address) {
    pickupAddr = typeof order.pickup_address === 'string' ? (() => { try { return JSON.parse(order.pickup_address); } catch (e) { return {}; } })() : order.pickup_address;
  }

  const restaurantOrPickup = isExpress ? {
    name: 'Point de collecte',
    address: pickupAddr?.address_line || pickupAddr?.address || '',
    latitude: lat(pickupAddr?.latitude),
    longitude: lat(pickupAddr?.longitude),
    phone: order.client_phone || order.customer?.phone || '',
    logo: null,
    distance: order.restaurant_distance,
  } : {
    name: order.restaurant_name || order.restaurant?.name || '',
    address: order.restaurant_address || order.restaurant?.address || '',
    latitude: lat(order.restaurant_latitude) ?? lat(order.restaurant?.latitude),
    longitude: lat(order.restaurant_longitude) ?? lat(order.restaurant?.longitude),
    phone: order.restaurant_phone || order.restaurant?.phone || '',
    logo: order.restaurant_logo || order.restaurant?.logo || null,
    distance: order.restaurant_distance,
  };

  return {
    id: order.id,
    order_id: order.id,
    order_number: order.order_number,
    order_type: order.order_type || 'food',
    status: order.status,
    delivery_fee: order.delivery_fee,
    earnings: estimatedEarnings,
    payment_method: order.payment_method || 'waves',
    total: order.total || 0,
    restaurant_net_revenue: isExpress ? 0 : restaurantNetRevenue,
    restaurant_subtotal: isExpress ? 0 : (order.restaurant_subtotal ?? subtotal),
    restaurant_commission: isExpress ? 0 : (order.restaurant_commission ?? commissionAmount),
    restaurant: restaurantOrPickup,
    customer: {
      name: order.recipient_name || clientName,
      area: customerArea,
      address: customerAddress,
      landmark: customerLandmark,
      latitude: lat(addr.latitude) ?? lat(order.customer?.latitude),
      longitude: lat(addr.longitude) ?? lat(order.customer?.longitude),
      phone: order.recipient_phone || customerPhone,
      totalDistance: order.delivery_distance || order.customer?.totalDistance,
    },
    delivery_address: addr,
    client_first_name: clientFirstName,
    client_last_name: clientLastName,
    client_phone: customerPhone, // Ajout pour faciliter l'accès
  };
}

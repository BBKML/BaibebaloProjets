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
  
  return {
    id: order.id,
    order_id: order.id,
    order_number: order.order_number,
    status: order.status,
    delivery_fee: order.delivery_fee,
    earnings: estimatedEarnings,
    payment_method: order.payment_method || 'waves',
    total: order.total || 0,
    restaurant_net_revenue: order.restaurant_net_revenue || null, // Revenu net du restaurant (subtotal - commission)
    restaurant_subtotal: order.restaurant_subtotal || null, // Sous-total des articles
    restaurant_commission: order.restaurant_commission || null, // Commission Baibebalo
    restaurant: {
      name: order.restaurant_name || order.restaurant?.name || '',
      address: order.restaurant_address || order.restaurant?.address || '',
      latitude: lat(order.restaurant_latitude) ?? lat(order.restaurant?.latitude),
      longitude: lat(order.restaurant_longitude) ?? lat(order.restaurant?.longitude),
      phone: order.restaurant_phone || order.restaurant?.phone || '',
      logo: order.restaurant_logo || order.restaurant?.logo || null,
      distance: order.restaurant_distance,
    },
    customer: {
      name: clientName,
      area: customerArea,
      address: customerAddress,
      landmark: customerLandmark,
      latitude: lat(addr.latitude) ?? lat(order.customer?.latitude),
      longitude: lat(addr.longitude) ?? lat(order.customer?.longitude),
      phone: customerPhone,
      totalDistance: order.delivery_distance || order.customer?.totalDistance,
    },
    delivery_address: addr,
    client_first_name: clientFirstName,
    client_last_name: clientLastName,
    client_phone: customerPhone, // Ajout pour faciliter l'accès
  };
}

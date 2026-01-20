/**
 * Utilitaires Socket.IO pour notifier les admins du dashboard
 */

/**
 * Notifier les admins du dashboard d'une mise à jour de commande
 */
function notifyAdminDashboard(io, event, data) {
  if (!io) {
    return;
  }
  
  io.to('admin_dashboard').emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notifier les admins d'une nouvelle commande
 */
function notifyNewOrder(io, order) {
  notifyAdminDashboard(io, 'new_order', {
    order_id: order.id,
    order_number: order.order_number,
    status: order.status,
    total: order.total,
    restaurant_id: order.restaurant_id,
    user_id: order.user_id,
  });
}

/**
 * Notifier les admins d'un changement de statut de commande
 */
function notifyOrderStatusChange(io, orderId, status, additionalData = {}) {
  notifyAdminDashboard(io, 'order_updated', {
    order_id: orderId,
    status,
    ...additionalData,
  });
}

module.exports = {
  notifyAdminDashboard,
  notifyNewOrder,
  notifyOrderStatusChange,
};

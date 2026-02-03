/**
 * Utilitaires de formatage
 */

/**
 * Formater un montant en FCFA
 */
export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '0 FCFA';
  return `${amount.toLocaleString('fr-FR')} FCFA`;
};

/**
 * Formater une date
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  });
};

/**
 * Formater une date avec l'heure
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formater un numéro de téléphone
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  // Supprimer les espaces et caractères spéciaux
  const cleaned = phone.replace(/\D/g, '');
  // Formater selon le format ivoirien
  if (cleaned.startsWith('225')) {
    return `+225 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`;
  }
  return phone;
};

/**
 * Tronquer un texte
 */
export const truncate = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

/**
 * Calculer le sous-total d'une commande à partir des items
 */
export const calculateOrderSubtotal = (order) => {
  if (!order) return 0;
  // Si subtotal existe, l'utiliser
  if (order.subtotal) return Number.parseFloat(order.subtotal);
  // Sinon, calculer à partir des items
  if (!order.items) return 0;
  return order.items.reduce((sum, item) => {
    // Le backend retourne unit_price dans order_items
    const itemPrice = item.unit_price || item.price || item.menu_item?.price || item.menu_item_snapshot?.price || 0;
    const itemQuantity = item.quantity || 1;
    return sum + Number.parseFloat(itemPrice) * itemQuantity;
  }, 0);
};

/**
 * Calculer le total d'une commande (sous-total + frais de livraison + taxes)
 */
export const calculateOrderTotal = (order) => {
  if (!order) return 0;
  // Si total existe, l'utiliser (priorité)
  if (order.total) return Number.parseFloat(order.total);
  // Sinon, si total_amount existe, l'utiliser
  if (order.total_amount) return Number.parseFloat(order.total_amount);
  // Sinon, calculer
  const subtotal = calculateOrderSubtotal(order);
  const deliveryFee = Number.parseFloat(order.delivery_fee || 0);
  const taxes = Number.parseFloat(order.taxes || 0);
  return subtotal + deliveryFee + taxes;
};

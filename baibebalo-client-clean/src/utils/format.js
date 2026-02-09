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
 * Recalcule toujours à partir des items pour éviter les erreurs de calcul
 */
export const calculateOrderSubtotal = (order) => {
  if (!order) return 0;
  if (!order.items || order.items.length === 0) {
    // Si pas d'items, utiliser le subtotal de la commande comme fallback
    return Number.parseFloat(order.subtotal || 0);
  }
  
  // TOUJOURS recalculer à partir des items (source de vérité)
  // Ne pas utiliser item.subtotal stocké car il peut être incorrect
  const calculatedSubtotal = order.items.reduce((sum, item) => {
    // TOUJOURS calculer unit_price * quantity pour garantir l'exactitude
    const itemPrice = item.unit_price || item.price || item.menu_item?.price || item.menu_item_snapshot?.price || 0;
    const itemQuantity = item.quantity || 1;
    const itemSubtotal = Number.parseFloat(itemPrice) * itemQuantity;
    
    // Vérifier si le subtotal stocké diffère du recalculé
    const storedItemSubtotal = item.subtotal !== undefined && item.subtotal !== null
      ? Number.parseFloat(item.subtotal)
      : null;
    
    if (storedItemSubtotal !== null && Math.abs(storedItemSubtotal - itemSubtotal) > 0.01) {
      console.warn('Sous-total item incorrect détecté:', {
        itemName: item.name || item.menu_item?.name,
        unitPrice: itemPrice,
        quantity: itemQuantity,
        storedSubtotal: storedItemSubtotal,
        recalculatedSubtotal: itemSubtotal,
      });
    }
    
    return sum + (isNaN(itemSubtotal) ? 0 : itemSubtotal);
  }, 0);
  
  // Retourner le sous-total calculé (plus fiable que celui de la base de données)
  return calculatedSubtotal;
};

/**
 * Calculer le total d'une commande (sous-total + frais de livraison + taxes)
 * TOUJOURS recalculer pour éviter d'utiliser un total incorrect de la base de données
 */
export const calculateOrderTotal = (order) => {
  if (!order) return 0;
  
  // TOUJOURS recalculer à partir du sous-total recalculé et des frais
  // C'est la source de vérité pour garantir l'exactitude
  const subtotal = calculateOrderSubtotal(order);
  const deliveryFee = Number.parseFloat(order.delivery_fee || 0);
  const taxes = Number.parseFloat(order.taxes || 0);
  const discount = Number.parseFloat(order.discount || 0);
  
  // Total = Sous-total + Frais de livraison + Taxes - Réduction
  const calculatedTotal = subtotal + deliveryFee + taxes - discount;
  
  // Vérifier si le total en base diffère significativement du recalculé
  const storedTotal = order.total ? Number.parseFloat(order.total) : null;
  if (storedTotal !== null && Math.abs(storedTotal - calculatedTotal) > 0.01) {
    // Logger pour déboguer (en production, utiliser un service de logging)
    console.warn('Total recalculé diffère de celui en base:', {
      orderId: order.id,
      orderNumber: order.order_number,
      storedTotal,
      calculatedTotal,
      subtotal,
      deliveryFee,
      taxes,
      discount,
    });
  }
  
  // Toujours retourner le total recalculé (source de vérité)
  return Math.max(0, calculatedTotal);
};

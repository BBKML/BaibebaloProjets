/**
 * Utilitaires pour le calcul des gains des livreurs
 */

/**
 * Calcule les bonus à ajouter aux frais de livraison (payés par le client)
 * @param {number} baseDeliveryFee - Frais de livraison de base
 * @param {number} deliveryDistance - Distance de livraison en km
 * @param {Date} [orderDate] - Date de la commande (pour calculer heure de pointe et week-end)
 * @returns {Object} { totalBonus, breakdown } - Total des bonus et détail
 */
function calculateDeliveryBonuses(baseDeliveryFee, deliveryDistance = 0, orderDate = new Date()) {
  const config = require('../config');
  const businessConfig = config.business;
  
  const currentHour = orderDate.getHours();
  const dayOfWeek = orderDate.getDay(); // 0 = Dimanche, 6 = Samedi
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  // 1. BONUS DISTANCE LONGUE (si distance > 5 km → +200 FCFA)
  const longDistanceThreshold = businessConfig.deliveryBonusLongDistanceThreshold || 5;
  const bonusLongDistance = deliveryDistance > longDistanceThreshold 
    ? (businessConfig.deliveryBonusLongDistanceAmount || 200) 
    : 0;
  
  // 2. BONUS HEURE DE POINTE (12h-14h ou 19h-21h → +100 FCFA)
  const peakHours = businessConfig.deliveryPeakHours || { lunch: { start: 12, end: 14 }, dinner: { start: 19, end: 21 } };
  const isPeakHour = (currentHour >= peakHours.lunch.start && currentHour < peakHours.lunch.end) ||
                     (currentHour >= peakHours.dinner.start && currentHour < peakHours.dinner.end);
  const bonusPeakHour = isPeakHour ? (businessConfig.deliveryBonusPeakHourAmount || 100) : 0;
  
  // 3. Sous-total avant bonus week-end
  const subtotalWithBonuses = baseDeliveryFee + bonusLongDistance + bonusPeakHour;
  
  // 4. BONUS WEEK-END (+10% sur le total frais + bonus)
  const weekendBonusPercent = businessConfig.deliveryBonusWeekendPercent || 10;
  const bonusWeekend = isWeekend ? Math.round(subtotalWithBonuses * weekendBonusPercent / 100) : 0;
  
  // 5. TOTAL DES BONUS
  const totalBonus = bonusLongDistance + bonusPeakHour + bonusWeekend;
  
  return {
    totalBonus: Math.round(totalBonus),
    breakdown: {
      bonus_long_distance: bonusLongDistance,
      bonus_peak_hour: bonusPeakHour,
      bonus_weekend: bonusWeekend,
      base_fee: baseDeliveryFee,
      total_with_bonuses: baseDeliveryFee + totalBonus,
    },
  };
}

/**
 * Calcule les gains estimés d'un livreur pour une commande
 * MAINTENANT : Les bonus sont inclus dans les frais de livraison payés par le client
 * Le livreur reçoit 70% du total (frais de base + bonus)
 * @param {number} deliveryFee - Frais de livraison TOTAL (base + bonus) payé par le client
 * @param {number} deliveryDistance - Distance de livraison en km (pour info)
 * @param {Date} [orderDate] - Date de la commande (pour info)
 * @returns {number} Gains estimés en FCFA (70% du total)
 */
function calculateEstimatedEarnings(deliveryFee, deliveryDistance = 0, orderDate = new Date()) {
  const config = require('../config');
  const businessConfig = config.business;
  
  // Les bonus sont maintenant inclus dans deliveryFee (payé par le client)
  // Le livreur reçoit 70% du total
  const deliveryPersonPercentage = businessConfig.deliveryPersonPercentage || 70;
  const earnings = (deliveryFee * deliveryPersonPercentage) / 100;
  
  return Math.round(earnings);
}

module.exports = {
  calculateEstimatedEarnings,
  calculateDeliveryBonuses,
};

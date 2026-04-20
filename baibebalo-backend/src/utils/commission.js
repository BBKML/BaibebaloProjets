/**
 * Calcul des commissions plateforme (alignement Glovo)
 * Une seule source de vérité pour le taux par défaut et le calcul.
 */

const DEFAULT_COMMISSION_RATE = 15; // %

/**
 * Calcule le montant de la commission à partir du sous-total et du taux.
 * @param {number} subtotal - Sous-total de la commande (FCFA)
 * @param {number|string} [commissionRatePercent] - Taux en % (défaut: 15)
 * @returns {{ commission: number, rate: number }}
 */
function getCommission(subtotal, commissionRatePercent) {
  const hasRate = commissionRatePercent != null && String(commissionRatePercent).trim() !== '';
  const rate = hasRate ? Number(commissionRatePercent) : DEFAULT_COMMISSION_RATE;
  const commission = Math.round((subtotal * rate) / 100 * 100) / 100;
  return { commission, rate };
}

/**
 * Revenu net restaurant = sous-total - commission.
 * @param {number} subtotal - Sous-total (FCFA)
 * @param {number} [commissionRatePercent] - Taux commission %
 * @param {number} [commissionAmount] - Commission déjà calculée (prioritaire)
 * @returns {number} Montant net à créditer au restaurant
 */
function getNetRestaurantRevenue(subtotal, commissionRatePercent, commissionAmount) {
  const useGiven =
    commissionAmount != null && String(commissionAmount).trim() !== '';
  const commission = useGiven
    ? Number(commissionAmount)
    : getCommission(subtotal, commissionRatePercent).commission;
  return Math.round((subtotal - commission) * 100) / 100;
}

module.exports = {
  DEFAULT_COMMISSION_RATE,
  getCommission,
  getNetRestaurantRevenue,
};

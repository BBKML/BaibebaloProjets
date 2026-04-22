/**
 * Parse JSON sans lever d'exception.
 * @param {*} value - Valeur à parser
 * @param {*} fallback - Valeur retournée si le parsing échoue (défaut: null)
 * @returns La valeur parsée ou fallback
 */
function safeJsonParse(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

module.exports = { safeJsonParse };

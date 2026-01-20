/**
 * Utilitaires de validation
 */

/**
 * Valider un numéro de téléphone ivoirien
 */
export const validatePhoneNumber = (phone) => {
  if (!phone) return false;
  // Supprimer les espaces et caractères spéciaux
  const cleaned = phone.replace(/\D/g, '');
  // Vérifier si c'est un numéro ivoirien (225 + 8 chiffres)
  if (cleaned.startsWith('225')) {
    return cleaned.length === 11; // 225 + 8 chiffres
  }
  // Vérifier si c'est un numéro local (8 chiffres)
  return cleaned.length === 8;
};

/**
 * Valider un code OTP
 */
export const validateOTP = (code) => {
  if (!code) return false;
  return /^\d{6}$/.test(code);
};

/**
 * Valider un email
 */
export const validateEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

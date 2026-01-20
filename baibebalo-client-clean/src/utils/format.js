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

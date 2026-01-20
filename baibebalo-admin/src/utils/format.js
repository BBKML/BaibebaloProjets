/**
 * Formater les montants en FCFA (Franc CFA - Côte d'Ivoire)
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '0 FCFA';
  
  // Formater le nombre avec séparateurs de milliers
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  
  return `${formatted} FCFA`;
};

/**
 * Formater les dates
 */
export const formatDate = (date) => {
  if (!date) return '-';
  
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
};

/**
 * Formater les dates courtes (format maquette: "12 Mai, 2024")
 */
export const formatDateShort = (date) => {
  if (!date) return '-';
  
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
};

/**
 * Formater les pourcentages
 */
export const formatPercent = (value) => {
  if (value === null || value === undefined) return '0%';
  
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

/**
 * Formater les nombres
 */
export const formatNumber = (value) => {
  if (value === null || value === undefined) return '0';
  
  return new Intl.NumberFormat('fr-FR').format(value);
};

/**
 * Formater le temps relatif (il y a X minutes)
 */
export const formatTimeAgo = (date) => {
  if (!date) return '-';
  
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) return 'À l\'instant';
  if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} h`;
  if (diffInSeconds < 604800) return `Il y a ${Math.floor(diffInSeconds / 86400)} j`;
  
  return formatDateShort(date);
};

// Journal d'actions admin — stocké en localStorage
// Persiste les 500 dernières actions des 7 derniers jours

const STORAGE_KEY = '@baibebalo_admin_action_log';
const MAX_ENTRIES = 500;
const RETENTION_DAYS = 7;

export const ACTION_TYPES = {
  ORDER_CANCELLED:   { label: 'Commande annulée',      icon: 'cancel',            color: 'text-red-600' },
  ORDER_REASSIGNED:  { label: 'Livreur réassigné',     icon: 'swap_horiz',        color: 'text-blue-600' },
  ORDER_INTERVENED:  { label: 'Intervention commande', icon: 'emergency',         color: 'text-amber-600' },
  STATUS_CHANGED:    { label: 'Statut modifié',        icon: 'published_with_changes', color: 'text-indigo-600' },
  DRIVER_VALIDATED:  { label: 'Livreur validé',        icon: 'verified',          color: 'text-emerald-600' },
  DRIVER_SUSPENDED:  { label: 'Livreur suspendu',      icon: 'block',             color: 'text-red-600' },
  RESTAURANT_VALIDATED: { label: 'Restaurant validé', icon: 'store',             color: 'text-emerald-600' },
  TICKET_CLOSED:     { label: 'Ticket fermé',          icon: 'check_circle',      color: 'text-emerald-600' },
  REFUND_ISSUED:     { label: 'Remboursement émis',    icon: 'payments',          color: 'text-purple-600' },
};

const readLog = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const entries = JSON.parse(raw);
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    return entries.filter((e) => e.timestamp > cutoff);
  } catch {
    return [];
  }
};

const writeLog = (entries) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // localStorage plein — ignorer
  }
};

export const logAction = (type, details = {}) => {
  const entries = readLog();
  entries.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    timestamp: Date.now(),
    ...details,
  });
  writeLog(entries);
};

export const getActionLog = (limit = 100) => {
  return readLog().reverse().slice(0, limit);
};

export const clearActionLog = () => {
  localStorage.removeItem(STORAGE_KEY);
};

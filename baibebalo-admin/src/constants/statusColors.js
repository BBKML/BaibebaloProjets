// Palette canonique des statuts — source unique de vérité pour toute l'app admin

export const ORDER_STATUS = {
  new:                { label: 'Nouvelle',         cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  pending:            { label: 'En attente',        cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  scheduled:          { label: 'Programmée',        cls: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400' },
  accepted:           { label: 'Acceptée',          cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  confirmed:          { label: 'Confirmée',         cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  preparing:          { label: 'En préparation',    cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  ready:              { label: 'Prête',             cls: 'bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary' },
  picked_up:          { label: 'Récupérée',         cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
  delivering:         { label: 'En livraison',      cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
  driver_at_customer: { label: 'Livreur arrivé',    cls: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' },
  delivered:          { label: 'Livrée',            cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  cancelled:          { label: 'Annulée',           cls: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
};

export const DRIVER_STATUS = {
  active:    { label: 'Actif',     cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  inactive:  { label: 'Inactif',   cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  suspended: { label: 'Suspendu',  cls: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
  pending:   { label: 'En attente',cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  online:    { label: 'En ligne',  cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  offline:   { label: 'Hors ligne',cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  busy:      { label: 'Occupé',    cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
};

export const RESTAURANT_STATUS = {
  active:    { label: 'Actif',     cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  inactive:  { label: 'Inactif',   cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  suspended: { label: 'Suspendu',  cls: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
  pending:   { label: 'En attente',cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
};

export const TICKET_STATUS = {
  open:        { label: 'Ouvert',    cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  in_progress: { label: 'En cours',  cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
  resolved:    { label: 'Résolu',    cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  closed:      { label: 'Fermé',     cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
};

export const TICKET_PRIORITY = {
  low:      { label: 'Faible',  cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  medium:   { label: 'Moyen',   cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  high:     { label: 'Élevée',  cls: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400' },
  urgent:   { label: 'Urgent',  cls: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
};

/** Helper : retourne les classes CSS pour un statut commande */
export const getOrderStatusCls = (status) =>
  ORDER_STATUS[status]?.cls ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';

export const getOrderStatusLabel = (status) =>
  ORDER_STATUS[status]?.label ?? status ?? 'Inconnu';

export const getDriverStatusCls = (status) =>
  DRIVER_STATUS[status]?.cls ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';

export const getRestaurantStatusCls = (status) =>
  RESTAURANT_STATUS[status]?.cls ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';

export const getTicketStatusCls = (status) =>
  TICKET_STATUS[status]?.cls ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';

export const getTicketPriorityCls = (priority) =>
  TICKET_PRIORITY[priority]?.cls ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';

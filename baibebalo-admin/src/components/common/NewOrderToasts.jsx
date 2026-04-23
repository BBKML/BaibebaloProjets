import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewOrderAlert } from '../../hooks/useNewOrderAlert';
import { formatCurrency } from '../../utils/format';

const AUTO_DISMISS_MS = 8000;

const NewOrderToasts = () => {
  const { toasts, dismissToast, requestNotificationPermission } = useNewOrderAlert();
  const navigate = useNavigate();

  // Demander la permission notifications au premier rendu
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Auto-dismiss
  useEffect(() => {
    if (!toasts.length) return;
    const timer = setTimeout(() => {
      const oldest = toasts[toasts.length - 1];
      if (oldest) dismissToast(oldest.id);
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toasts]);

  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4 w-80 animate-slide-in"
        >
          {/* Icône pulsante */}
          <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
            <span className="material-symbols-outlined text-primary text-lg">shopping_bag</span>
          </div>

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-primary uppercase tracking-wide">Nouvelle commande</p>
            <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
              #{toast.orderNumber}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{toast.restaurant}</p>
            <p className="text-sm font-bold text-emerald-600 mt-1">{formatCurrency(toast.total)} FCFA</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1 shrink-0">
            <button
              onClick={() => { dismissToast(toast.id); navigate(`/orders/${toast.id}`); }}
              className="text-xs font-bold text-primary hover:underline text-right"
            >
              Voir →
            </button>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-right"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NewOrderToasts;

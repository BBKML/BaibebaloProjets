import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { getActionLog, clearActionLog, ACTION_TYPES } from '../utils/adminActionLog';

const formatRelative = (ts) => {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const formatAbsolute = (ts) =>
  new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

// Fond coloré par type d'action pour différenciation visuelle
const ACTION_BG = {
  ORDER_CANCELLED:      'bg-red-100 dark:bg-red-500/15',
  ORDER_REASSIGNED:     'bg-blue-100 dark:bg-blue-500/15',
  ORDER_INTERVENED:     'bg-amber-100 dark:bg-amber-500/15',
  STATUS_CHANGED:       'bg-indigo-100 dark:bg-indigo-500/15',
  DRIVER_VALIDATED:     'bg-emerald-100 dark:bg-emerald-500/15',
  DRIVER_SUSPENDED:     'bg-red-100 dark:bg-red-500/15',
  RESTAURANT_VALIDATED: 'bg-emerald-100 dark:bg-emerald-500/15',
  TICKET_CLOSED:        'bg-emerald-100 dark:bg-emerald-500/15',
  REFUND_ISSUED:        'bg-purple-100 dark:bg-purple-500/15',
};

const AdminActionLog = () => {
  const [entries, setEntries] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [tick, setTick] = useState(0);

  const load = () => setEntries(getActionLog(200));

  useEffect(() => {
    load();
    // Rafraîchir les temps relatifs toutes les 30s
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const handleClear = () => {
    if (!window.confirm('Effacer tout le journal de cette session ?')) return;
    clearActionLog();
    load();
  };

  const filtered = filterType === 'all'
    ? entries
    : entries.filter((e) => e.type === filterType);

  const typeOptions = [
    { value: 'all', label: 'Tout' },
    ...Object.entries(ACTION_TYPES).map(([value, cfg]) => ({ value, label: cfg.label })),
  ];

  return (
    <Layout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Journal d'actions
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Historique des actions effectuées dans cette session (7 derniers jours · {entries.length} entrée{entries.length !== 1 ? 's' : ''})
            </p>
          </div>
          {entries.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <span className="material-symbols-outlined text-base">delete_sweep</span>
              Effacer le journal
            </button>
          )}
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((opt) => {
            const count = opt.value === 'all' ? entries.length : entries.filter(e => e.type === opt.value).length;
            return (
            <button
              key={opt.value}
              onClick={() => setFilterType(opt.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filterType === opt.value
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary/50'
              }`}
            >
              {opt.label}
              {count > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none ${
                  filterType === opt.value ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>{count}</span>
              )}
            </button>
            );
          })}
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3 block">history</span>
            <p className="font-bold text-slate-500 dark:text-slate-400">
              {entries.length === 0
                ? 'Aucune action enregistrée dans cette session'
                : 'Aucune action pour ce filtre'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Les actions sont enregistrées dès qu'une intervention est effectuée</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map((entry) => {
                const cfg = ACTION_TYPES[entry.type] || { label: entry.type, icon: 'info', color: 'text-slate-500' };
                return (
                  <div key={entry.id} className="flex items-start gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    {/* Icône */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${ACTION_BG[entry.type] || 'bg-slate-100 dark:bg-slate-700'}`}>
                      <span className={`material-symbols-outlined text-lg ${cfg.color}`}>{cfg.icon}</span>
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{cfg.label}</p>

                      {/* Détails contextuels */}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {entry.orderNumber && (
                          <span className="text-xs text-slate-500">
                            Commande <span className="font-semibold text-slate-700 dark:text-slate-300">#{entry.orderNumber}</span>
                          </span>
                        )}
                        {entry.driverName && (
                          <span className="text-xs text-slate-500">
                            Livreur <span className="font-semibold text-slate-700 dark:text-slate-300">{entry.driverName}</span>
                          </span>
                        )}
                        {entry.reason && (
                          <span className="text-xs text-slate-500 italic truncate max-w-xs">« {entry.reason} »</span>
                        )}
                        {entry.note && (
                          <span className="text-xs text-slate-500 italic truncate max-w-xs">« {entry.note} »</span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 mt-1" title={formatAbsolute(entry.timestamp)}>
                        {formatRelative(entry.timestamp)}
                      </p>
                    </div>

                    {/* Lien vers la commande si disponible */}
                    {entry.orderId && (
                      <Link
                        to={`/orders/${entry.orderId}/intervention`}
                        className="shrink-0 text-xs font-semibold text-primary hover:underline"
                      >
                        Voir →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Note persistance */}
        <p className="text-xs text-center text-slate-400 dark:text-slate-500">
          Ce journal est local à votre navigateur. Il n'est pas partagé entre les administrateurs.
        </p>
      </div>
    </Layout>
  );
};

export default AdminActionLog;

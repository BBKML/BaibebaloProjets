import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { formatCurrency } from '../utils/format';
import { dashboardAPI } from '../api/dashboard';
import { ordersAPI } from '../api/orders';

const REFRESH_INTERVAL = 15000; // 15 secondes

const STATUS_CONFIG = {
  new:        { label: 'Nouvelle',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',     dot: 'bg-blue-500',    priority: 1 },
  accepted:   { label: 'Acceptée',       color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', dot: 'bg-indigo-500', priority: 2 },
  preparing:  { label: 'Préparation',    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500',   priority: 3 },
  ready:      { label: 'Prête',          color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', dot: 'bg-purple-500', priority: 4 },
  delivering: { label: 'En livraison',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', dot: 'bg-orange-500', priority: 5 },
};

const ACTIVE_STATUSES = ['new', 'accepted', 'preparing', 'ready', 'delivering'];

// Seuils d'alerte par statut (en minutes)
const ALERT_THRESHOLDS = {
  new: 5,
  accepted: 10,
  preparing: 45,
  ready: 15,
  delivering: 60,
};

const elapsed = (ts) => {
  if (!ts) return 0;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 1000 / 60); // minutes
};

const elapsedLabel = (mins) => {
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}min` : ''}`;
};

const getStartTime = (order) => {
  return order.placed_at || order.created_at;
};

const getStatusTime = (order) => {
  const map = {
    new: order.placed_at,
    accepted: order.accepted_at,
    preparing: order.preparing_at,
    ready: order.ready_at,
    delivering: order.delivering_at || order.picked_up_at,
  };
  return map[order.status] || order.placed_at;
};

const ActiveOrdersMonitor = () => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [alertOnly, setAlertOnly] = useState(false);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef(null);

  // Ticker pour mettre à jour les durées en temps réel
  useEffect(() => {
    intervalRef.current = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Charger les commandes actives
  const { data, isLoading, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['active-orders-monitor'],
    queryFn: () => ordersAPI.getOrders({
      status: ACTIVE_STATUSES.join(','),
      limit: 100,
      sort: 'placed_at',
      order: 'asc',
    }),
    refetchInterval: REFRESH_INTERVAL,
    staleTime: 10000,
  });

  // Charger aussi les alertes système
  const { data: alertsData } = useQuery({
    queryKey: ['system-alerts-monitor'],
    queryFn: () => dashboardAPI.getSystemAlerts(),
    refetchInterval: 30000,
  });

  const allOrders = data?.orders || data?.data?.orders || [];
  const systemAlerts = alertsData?.alerts || alertsData?.data?.alerts || [];
  const criticalAlerts = systemAlerts.filter((a) => a.type === 'error' || a.priority === 'high');

  // Filtrer et calculer les alertes
  const ordersWithMeta = allOrders
    .filter((o) => ACTIVE_STATUSES.includes(o.status))
    .map((order) => {
      const statusElapsed = elapsed(getStatusTime(order));
      const totalElapsed = elapsed(getStartTime(order));
      const threshold = ALERT_THRESHOLDS[order.status] || 30;
      const isAlert = statusElapsed >= threshold;
      return { ...order, statusElapsed, totalElapsed, isAlert };
    })
    .filter((o) => filterStatus === 'all' || o.status === filterStatus)
    .filter((o) => !alertOnly || o.isAlert)
    .sort((a, b) => {
      // Alertes d'abord, puis par temps écoulé décroissant
      if (a.isAlert !== b.isAlert) return a.isAlert ? -1 : 1;
      return b.totalElapsed - a.totalElapsed;
    });

  // Compteurs par statut
  const counts = ACTIVE_STATUSES.reduce((acc, s) => {
    acc[s] = allOrders.filter((o) => o.status === s).length;
    return acc;
  }, {});
  const alertCount = allOrders.filter((o) => {
    const se = elapsed(getStatusTime(o));
    return se >= (ALERT_THRESHOLDS[o.status] || 30);
  }).length;

  const lastUpdate = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

  return (
    <Layout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Suivi temps réel
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Actualisé toutes les {REFRESH_INTERVAL / 1000}s · dernière mise à jour {lastUpdate}
              </span>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            Actualiser
          </button>
        </div>

        {/* Alertes critiques */}
        {criticalAlerts.length > 0 && (
          <div className="space-y-2">
            {criticalAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <span className="material-symbols-outlined text-red-600 mt-0.5 shrink-0">error</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-red-800 dark:text-red-300 text-sm">{alert.title}</p>
                  {alert.message && <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{alert.message}</p>}
                </div>
                {alert.action && (
                  <Link to={alert.action} className="shrink-0 text-xs font-semibold text-red-600 hover:underline">
                    Voir →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        {/* KPI pipeline */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ACTIVE_STATUSES.map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
                className={`bg-white dark:bg-slate-800 rounded-xl border p-4 text-left transition-all ${
                  filterStatus === s
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{cfg.label}</span>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{counts[s] ?? 0}</p>
              </button>
            );
          })}
          {/* Alertes */}
          <button
            onClick={() => setAlertOnly(!alertOnly)}
            className={`bg-white dark:bg-slate-800 rounded-xl border p-4 text-left transition-all ${
              alertOnly
                ? 'border-red-500 ring-2 ring-red-200 dark:ring-red-900/30 bg-red-50 dark:bg-red-900/10'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Alertes</span>
            </div>
            <p className={`text-2xl font-black ${alertCount > 0 ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
              {alertCount}
            </p>
          </button>
        </div>

        {/* Filtre actif */}
        {(filterStatus !== 'all' || alertOnly) && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Filtres actifs :</span>
            {filterStatus !== 'all' && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_CONFIG[filterStatus]?.color}`}>
                {STATUS_CONFIG[filterStatus]?.label}
                <button onClick={() => setFilterStatus('all')} className="ml-1.5 hover:opacity-70">×</button>
              </span>
            )}
            {alertOnly && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                ⚠ En retard
                <button onClick={() => setAlertOnly(false)} className="ml-1.5 hover:opacity-70">×</button>
              </span>
            )}
          </div>
        )}

        {/* Liste commandes */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : ordersWithMeta.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3 block">check_circle</span>
            <p className="font-bold text-slate-500 dark:text-slate-400">
              {alertOnly ? 'Aucune commande en retard 🎉' : 'Aucune commande active en ce moment'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {ordersWithMeta.map((order) => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
              const threshold = ALERT_THRESHOLDS[order.status] || 30;
              const progressPct = Math.min(100, (order.statusElapsed / threshold) * 100);

              return (
                <div
                  key={order.id}
                  className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden transition-all ${
                    order.isAlert
                      ? 'border-red-300 dark:border-red-700'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-4 p-4">

                    {/* Statut + numéro */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-3 h-3 rounded-full shrink-0 ${cfg.dot} ${order.isAlert ? 'animate-pulse' : ''}`} />
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 dark:text-white text-sm">
                          #{order.order_number || order.id?.slice(0, 8)}
                        </p>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold mt-0.5 ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>

                    {/* Restaurant + client */}
                    <div className="flex-1 min-w-0 hidden sm:block">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {order.restaurant_name || order.restaurant?.name || '—'}
                      </p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {order.customer_name || `${order.user?.first_name || ''} ${order.user?.last_name || ''}`.trim() || 'Client'}
                      </p>
                    </div>

                    {/* Montant */}
                    <div className="text-right hidden md:block">
                      <p className="font-bold text-slate-900 dark:text-white text-sm">
                        {formatCurrency(order.total || 0)} FCFA
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {order.items_count || 0} article{(order.items_count || 0) > 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Temps */}
                    <div className="text-right">
                      <p className={`text-sm font-black ${order.isAlert ? 'text-red-600' : 'text-slate-600 dark:text-slate-300'}`}>
                        {order.isAlert && '⚠ '}{elapsedLabel(order.statusElapsed)}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">dans ce statut</p>
                    </div>

                    {/* Bouton */}
                    <Link
                      to={`/orders/${order.id}/intervention`}
                      className={`shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                        order.isAlert
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                      }`}
                    >
                      {order.isAlert ? 'Intervenir' : 'Voir'}
                    </Link>
                  </div>

                  {/* Barre de progression du délai */}
                  <div className="h-1 bg-slate-100 dark:bg-slate-700">
                    <div
                      className={`h-full transition-all ${
                        progressPct >= 100 ? 'bg-red-500' : progressPct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Légende seuils */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Seuils d'alerte</p>
          <div className="flex flex-wrap gap-4">
            {ACTIVE_STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s]?.dot}`} />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {STATUS_CONFIG[s]?.label} → {ALERT_THRESHOLDS[s]} min
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ActiveOrdersMonitor;

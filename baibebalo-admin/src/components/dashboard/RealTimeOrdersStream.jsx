import { useState, useMemo } from 'react';
import { formatCurrency, formatDateShort } from '../../utils/format';

const RealTimeOrdersStream = ({ orders }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [filterMode, setFilterMode] = useState('AND'); // 'AND' ou 'OR'
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Filtrer les commandes avec mode ET/OU
  const filteredOrders = useMemo(() => {
    if (filterMode === 'OR') {
      // Mode OU : au moins un filtre doit correspondre
      return orders.filter(order => {
        const matches = [];

        // Filtre par statut
        if (statusFilter !== 'all') {
          matches.push(order.status === statusFilter);
        }

        // Filtre par montant minimum
        if (amountMin) {
          matches.push(order.total >= parseFloat(amountMin));
        }

        // Filtre par montant maximum
        if (amountMax) {
          matches.push(order.total <= parseFloat(amountMax));
        }

        // Filtre par zone
        if (zoneFilter) {
          matches.push(order.zone && order.zone.toLowerCase().includes(zoneFilter.toLowerCase()));
        }

        // Si aucun filtre n'est actif, retourner toutes les commandes
        if (matches.length === 0) {
          return true;
        }

        // Au moins un filtre doit correspondre
        return matches.some(match => match === true);
      });
    } else {
      // Mode ET (par défaut) : tous les filtres actifs doivent correspondre
      return orders.filter(order => {
        // Filtre par statut
        if (statusFilter !== 'all' && order.status !== statusFilter) {
          return false;
        }

        // Filtre par montant minimum
        if (amountMin && order.total < parseFloat(amountMin)) {
          return false;
        }

        // Filtre par montant maximum
        if (amountMax && order.total > parseFloat(amountMax)) {
          return false;
        }

        // Filtre par zone
        if (zoneFilter && order.zone && !order.zone.toLowerCase().includes(zoneFilter.toLowerCase())) {
          return false;
        }

        return true;
      });
    }
  }, [orders, statusFilter, amountMin, amountMax, zoneFilter, filterMode]);

  // Extraire les zones uniques pour le filtre
  const uniqueZones = useMemo(() => {
    const zones = new Set();
    orders.forEach(order => {
      if (order.zone) {
        zones.add(order.zone);
      }
    });
    return Array.from(zones).sort();
  }, [orders]);
  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-500',
      accepted: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-500',
      preparing: 'bg-orange-100 text-orange-800 dark:bg-orange-500/10 dark:text-orange-500',
      ready: 'bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-500',
      delivering: 'bg-primary/10 text-primary',
      delivered: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-500',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      new: 'Nouvelle',
      accepted: 'Acceptée',
      preparing: 'En préparation',
      ready: 'Prête',
      picked_up: 'Récupérée',
      delivering: 'En livraison',
      driver_at_customer: 'Livreur arrivé',
      delivered: 'Livrée',
      cancelled: 'Annulée',
    };
    return labels[status] || status;
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Commandes en Temps Réel</h3>
            <p className="text-xs text-slate-500 mt-1">Flux en direct des commandes actives</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">En Direct</span>
          </div>
        </div>
        
        {/* Filtres */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Filtres</span>
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {showAdvancedFilters ? 'Masquer avancés' : 'Filtres avancés'}
              </button>
            </div>
            {showAdvancedFilters && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Mode:</span>
                <button
                  onClick={() => setFilterMode('AND')}
                  className={`text-xs font-bold px-2 py-1 rounded ${
                    filterMode === 'AND'
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  ET
                </button>
                <button
                  onClick={() => setFilterMode('OR')}
                  className={`text-xs font-bold px-2 py-1 rounded ${
                    filterMode === 'OR'
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  OU
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Filtre par statut */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 focus:ring-primary focus:border-primary"
            >
              <option value="all">Tous les statuts</option>
              <option value="new">Nouvelle</option>
              <option value="accepted">Acceptée</option>
              <option value="preparing">En préparation</option>
              <option value="ready">Prête</option>
              <option value="delivering">En livraison</option>
            </select>

            {/* Filtre par montant minimum */}
            <input
              type="number"
              placeholder="Montant min (FCFA)"
              value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)}
              className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 focus:ring-primary focus:border-primary"
            />

            {/* Filtre par montant maximum */}
            <input
              type="number"
              placeholder="Montant max (FCFA)"
              value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)}
              className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 focus:ring-primary focus:border-primary"
            />

            {/* Filtre par zone */}
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 focus:ring-primary focus:border-primary"
            >
              <option value="">Toutes les zones</option>
              {uniqueZones.map(zone => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </div>

          {showAdvancedFilters && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                <span className="font-semibold">Mode {filterMode}:</span>{' '}
                {filterMode === 'AND'
                  ? 'Tous les filtres actifs doivent correspondre (intersection)'
                  : 'Au moins un filtre actif doit correspondre (union)'}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Filtres actifs:</span>
                {statusFilter !== 'all' && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">Statut: {statusFilter}</span>
                )}
                {amountMin && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">Min: {amountMin} FCFA</span>
                )}
                {amountMax && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">Max: {amountMax} FCFA</span>
                )}
                {zoneFilter && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">Zone: {zoneFilter}</span>
                )}
                {statusFilter === 'all' && !amountMin && !amountMax && !zoneFilter && (
                  <span className="text-slate-400">Aucun filtre actif</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto custom-scrollbar">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p className="text-sm">
              {orders.length === 0
                ? 'Aucune commande active en ce moment'
                : `Aucune commande ne correspond aux filtres (${orders.length} commande(s) totale(s))`}
            </p>
            {(statusFilter !== 'all' || amountMin || amountMax || zoneFilter) && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setAmountMin('');
                  setAmountMax('');
                  setZoneFilter('');
                }}
                className="mt-2 text-xs font-semibold text-primary hover:underline"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredOrders.length !== orders.length && (
              <div className="p-2 bg-primary/5 border-b border-primary/20">
                <p className="text-xs text-primary font-semibold text-center">
                  {filteredOrders.length} commande(s) sur {orders.length} correspond(ent) aux filtres
                </p>
              </div>
            )}
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        #{order.order_number || order.id.slice(0, 8)}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 space-y-0.5">
                      <p>
                        <span className="font-semibold">{order.restaurant?.name || 'N/A'}</span>
                        {' → '}
                        <span>{order.client?.name || 'Client'}</span>
                      </p>
                      {order.zone && (
                        <p className="text-slate-400">📍 {order.zone}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                      {formatCurrency(order.total)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {formatTime(order.placed_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeOrdersStream;

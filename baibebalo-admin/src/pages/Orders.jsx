import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { ordersAPI } from '../api/orders';
import { usersAPI } from '../api/users';
import { restaurantsAPI } from '../api/restaurants';
import driversAPI from '../api/drivers';
import { formatCurrency, formatDateShort } from '../utils/format';
import TableSkeleton from '../components/common/TableSkeleton';
import ExportOrdersModal from '../components/modals/ExportOrdersModal';

/** Liste déroulante avec recherche et tri par nom */
function SearchableSelect({ options, value, onChange, placeholder, label, id, className = '' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const sorted = [...(options || [])].sort((a, b) => (a.label || '').localeCompare(b.label || '', 'fr'));
  const filtered = !search.trim()
    ? sorted
    : sorted.filter((o) => (o.label || '').toLowerCase().includes(search.trim().toLowerCase()));
  const selectedOption = options?.find((o) => o.id === value);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        value={open ? search : (selectedOption ? selectedOption.label : '')}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {}}
        placeholder={placeholder}
        className="w-full min-w-[180px] px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
      />
      {open && (
        <ul
          className="absolute z-20 mt-1 max-h-56 w-full min-w-[200px] overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1"
          role="listbox"
        >
          <li
            role="option"
            className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={() => {
              onChange('');
              setSearch('');
              setOpen(false);
            }}
          >
            {placeholder}
          </li>
          {filtered.map((opt) => (
            <li
              key={opt.id}
              role="option"
              aria-selected={value === opt.id}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 ${value === opt.id ? 'bg-primary/10 text-primary font-medium' : 'text-slate-700 dark:text-slate-300'}`}
              onClick={() => {
                onChange(opt.id);
                setSearch('');
                setOpen(false);
              }}
            >
              {opt.label}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">Aucun résultat</li>
          )}
        </ul>
      )}
    </div>
  );
}

// Libellés des statuts en français (alignés sur le backend)
const STATUTS_FR = {
  new: { label: 'Nouvelle', class: 'bg-semantic-amber/10 text-semantic-amber' },
  pending: { label: 'En attente', class: 'bg-semantic-amber/10 text-semantic-amber' },
  accepted: { label: 'Acceptée', class: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500' },
  confirmed: { label: 'Confirmée', class: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500' },
  preparing: { label: 'En préparation', class: 'bg-semantic-amber/10 text-semantic-amber' },
  ready: { label: 'Prête', class: 'bg-primary/10 text-primary' },
  picked_up: { label: 'Récupérée', class: 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500' },
  delivering: { label: 'En livraison', class: 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500' },
  delivered: { label: 'Livrée', class: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500' },
  cancelled: { label: 'Annulée', class: 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-500' },
};

const Orders = () => {
  const navigate = useNavigate();
  const [showExportModal, setShowExportModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    date_from: '',
    date_to: '',
    user_id: '',
    delivery_person_id: '',
    restaurant_id: '',
    page: 1,
    limit: 20,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', filters],
    queryFn: () => ordersAPI.getOrders(filters),
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: () => usersAPI.getUsers({ limit: 500 }),
  });
  const { data: restaurantsData } = useQuery({
    queryKey: ['admin-restaurants-list'],
    queryFn: () => restaurantsAPI.getRestaurants({ status: 'active', limit: 500 }),
  });
  const { data: driversData } = useQuery({
    queryKey: ['admin-drivers-list'],
    queryFn: () => driversAPI.getDrivers({ status: 'active', limit: 500 }),
  });

  const orders = data?.data?.orders || [];
  const pagination = data?.data?.pagination || {};
  const users = usersData?.data?.users || usersData?.data || [];
  const restaurants = restaurantsData?.data?.restaurants || restaurantsData?.data || [];
  const drivers = driversData?.data?.delivery_persons || driversData?.data?.delivery_persons || driversData?.data || [];

  const getStatusBadge = (status) => {
    const config = STATUTS_FR[status] || { label: status || '—', class: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${config.class}`}>
        {config.label}
      </span>
    );
  };

  const applyFilters = (next) => {
    setFilters((prev) => ({ ...prev, ...next, page: 1 }));
  };

  const clientOptions = (Array.isArray(users) ? users : []).map((u) => ({
    id: u.id,
    label: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.phone || u.email || u.id?.slice(0, 8) || '',
  })).filter((o) => o.label);

  const driverOptions = (Array.isArray(drivers) ? drivers : []).map((d) => ({
    id: d.id,
    label: [d.first_name, d.last_name].filter(Boolean).join(' ') || d.phone || d.id?.slice(0, 8) || '',
  })).filter((o) => o.label);

  const restaurantOptions = (Array.isArray(restaurants) ? restaurants : []).map((r) => ({
    id: r.id,
    label: r.name || r.id?.slice(0, 8) || '',
  })).filter((o) => o.label);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Liste des Commandes</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Gérez et suivez toutes les commandes entrantes</p>
          </div>
          <TableSkeleton rows={10} columns={6} />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-400">Erreur lors du chargement</h3>
          <p className="text-red-700 dark:text-red-300 mt-2">{error.message}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Liste des Commandes</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Gérez et suivez toutes les commandes entrantes</p>
          </div>
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined">file_download</span>
            <span className="text-sm font-semibold">Exporter</span>
          </button>
        </div>

        {/* Export Modal */}
        <ExportOrdersModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
        />

        {/* Filtres : dates, client, livreur, restaurant, statut */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Du</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => applyFilters({ date_from: e.target.value })}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Au</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => applyFilters({ date_to: e.target.value })}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary"
              />
            </div>
            <SearchableSelect
              label="Client"
              id="filter-client"
              placeholder="Tous les clients"
              options={clientOptions}
              value={filters.user_id}
              onChange={(id) => applyFilters({ user_id: id })}
            />
            <SearchableSelect
              label="Livreur"
              id="filter-livreur"
              placeholder="Tous les livreurs"
              options={driverOptions}
              value={filters.delivery_person_id}
              onChange={(id) => applyFilters({ delivery_person_id: id })}
            />
            <SearchableSelect
              label="Restaurant"
              id="filter-restaurant"
              placeholder="Tous les restaurants"
              options={restaurantOptions}
              value={filters.restaurant_id}
              onChange={(id) => applyFilters({ restaurant_id: id })}
            />
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Statut</label>
              <select
                value={filters.status}
                onChange={(e) => applyFilters({ status: e.target.value })}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary"
              >
                <option value="">Tous les statuts</option>
                {Object.entries(STATUTS_FR).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setFilters({ status: '', date_from: '', date_to: '', user_id: '', delivery_person_id: '', restaurant_id: '', page: 1, limit: 20 })}
              className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[11px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">ID Commande</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Restaurant</th>
                  <th className="px-6 py-4">Livreur</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-center">Statut</th>
                  <th className="px-6 py-4 text-right">Montant</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-slate-500">
                      Aucune commande trouvée
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const initials = (order.client_name || 'N/A')
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);
                    
                    return (
                      <tr 
                        key={order.id} 
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                          #{order.id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                              {initials}
                            </div>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                              {order.client_name || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {order.restaurant_name || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {order.delivery_name || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {formatDateShort(order.placed_at || order.created_at)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-900 dark:text-white">
                          {formatCurrency(order.total || 0)}
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => navigate(`/orders/${order.id}`)}
                            className="material-symbols-outlined text-slate-400 hover:text-primary transition-colors"
                          >
                            visibility
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <p className="text-sm text-slate-500">
                Page {pagination.page} sur {pagination.pages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.pages}
                  className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Orders;

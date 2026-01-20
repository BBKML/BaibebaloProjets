import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { ordersAPI } from '../api/orders';
import { formatCurrency, formatDateShort } from '../utils/format';
import TableSkeleton from '../components/common/TableSkeleton';
import ExportOrdersModal from '../components/modals/ExportOrdersModal';

const Orders = () => {
  const navigate = useNavigate();
  const [showExportModal, setShowExportModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    page: 1,
    limit: 20,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', filters],
    queryFn: () => ordersAPI.getOrders(filters),
  });

  const orders = data?.data?.orders || [];
  const pagination = data?.data?.pagination || {};

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'En attente', class: 'bg-semantic-amber/10 text-semantic-amber' },
      confirmed: { label: 'Confirmé', class: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500' },
      preparing: { label: 'Préparation', class: 'bg-semantic-amber/10 text-semantic-amber' },
      ready: { label: 'Prêt', class: 'bg-primary/10 text-primary' },
      delivering: { label: 'En livraison', class: 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500' },
      delivered: { label: 'Livré', class: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500' },
      cancelled: { label: 'Annulé', class: 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-500' },
    };
    
    const config = statusConfig[status] || { label: status, class: 'bg-slate-100 text-slate-600' };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${config.class}`}>
        {config.label}
      </span>
    );
  };

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

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex gap-4">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="confirmed">Confirmé</option>
              <option value="preparing">Préparation</option>
              <option value="ready">Prêt</option>
              <option value="delivering">En livraison</option>
              <option value="delivered">Livré</option>
              <option value="cancelled">Annulé</option>
            </select>
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
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-center">Statut</th>
                  <th className="px-6 py-4 text-right">Montant</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
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
                          {order.restaurant_name || 'N/A'}
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

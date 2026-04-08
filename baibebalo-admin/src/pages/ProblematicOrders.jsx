import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { formatCurrency, formatDateShort } from '../utils/format';
import toast from 'react-hot-toast';
import TableSkeleton from '../components/common/TableSkeleton';
import { ordersAPI } from '../api/orders';

const PROBLEM_LABELS = {
  litige: { label: 'LITIGE', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  retard: { label: 'RETARD', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  client_absent: { label: 'CLIENT ABSENT', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  other: { label: 'AUTRE', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
};

const URGENCY_LABELS = {
  high: { label: 'Haute', cls: 'text-rose-600 dark:text-rose-400' },
  medium: { label: 'Moyenne', cls: 'text-amber-600 dark:text-amber-400' },
  low: { label: 'Basse', cls: 'text-slate-500 dark:text-slate-400' },
};

const ProblematicOrders = () => {
  const [problemType, setProblemType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['problematic-orders', problemType, currentPage],
    queryFn: () => ordersAPI.getProblematicOrders({
      page: currentPage,
      limit: itemsPerPage,
      problem_type: problemType !== 'all' ? problemType : undefined,
    }),
    retry: 1,
  });

  const cancelMutation = useMutation({
    mutationFn: ({ orderId, reason }) => ordersAPI.cancelOrder(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['problematic-orders']);
      toast.success('Commande annulée');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de l\'annulation');
    },
  });

  const orders = data?.data?.orders || [];
  const pagination = data?.data?.pagination || { total: 0, pages: 0, page: 1 };

  const handleCancel = (orderId, orderNumber) => {
    if (globalThis.confirm(`Annuler la commande #${orderNumber} ?`)) {
      cancelMutation.mutate({ orderId, reason: 'Annulée depuis commandes problématiques' });
    }
  };

  const getProblemInfo = (type) => PROBLEM_LABELS[type] || PROBLEM_LABELS.other;
  const getUrgencyInfo = (level) => URGENCY_LABELS[level] || URGENCY_LABELS.low;

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64 animate-pulse" />
          <div className="flex gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32 animate-pulse" />)}
          </div>
          <TableSkeleton rows={5} columns={6} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Commandes Problématiques
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Commandes en retard, litiges ou avec client absent
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'Toutes' },
            { value: 'retard', label: 'Retard' },
            { value: 'litige', label: 'Litige' },
            { value: 'client_absent', label: 'Client absent' },
            { value: 'other', label: 'Autre' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setProblemType(value); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                problemType === value
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-rose-500 text-xl">error</span>
            <div>
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">Erreur de chargement</p>
              <p className="text-xs text-rose-600 dark:text-rose-500 mt-0.5">
                {error.response?.data?.error?.message || 'Impossible de charger les commandes problématiques'}
                {error.response?.data?.error?.detail && (
                  <span className="block font-mono opacity-70">{error.response.data.error.detail}</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {pagination.total} commande{pagination.total !== 1 ? 's' : ''} problématique{pagination.total !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {['Commande', 'Client', 'Restaurant', 'Date', 'Problème', 'Urgence', 'Total', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-14 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">check_circle</span>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">
                          Aucune commande problématique
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          Toutes les commandes se déroulent normalement
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const problemInfo = getProblemInfo(order.problem_type);
                    const urgencyInfo = getUrgencyInfo(order.urgency);
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <td className="px-5 py-4">
                          <span className="text-sm font-bold text-primary">#{order.order_number || order.id.slice(0, 8)}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">{order.client_name || '—'}</div>
                          {order.client_phone && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">{order.client_phone}</div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-slate-700 dark:text-slate-300">{order.restaurant_name || '—'}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {formatDateShort(order.placed_at)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${problemInfo.cls}`}>
                            {problemInfo.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-bold ${urgencyInfo.cls}`}>
                            {urgencyInfo.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {formatCurrency(order.total)}
                          </span>
                        </td>
                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/orders/${order.id}`)}
                              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-colors"
                            >
                              Détails
                            </button>
                            <button
                              onClick={() => handleCancel(order.id, order.order_number)}
                              disabled={cancelMutation.isPending}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              Annuler
                            </button>
                            {order.delivery_phone && (
                              <a
                                href={`tel:${order.delivery_phone}`}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors"
                              >
                                Livreur
                              </a>
                            )}
                            {order.client_phone && !order.delivery_phone && (
                              <a
                                href={`tel:${order.client_phone}`}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors"
                              >
                                Client
                              </a>
                            )}
                          </div>
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
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Page {pagination.page} sur {pagination.pages} — {pagination.total} au total
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  ← Précédent
                </button>
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(pagination.pages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary text-white'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={currentPage === pagination.pages}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProblematicOrders;

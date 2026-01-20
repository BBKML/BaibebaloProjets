import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { formatCurrency, formatDateShort } from '../utils/format';
import { exportToCSV } from '../utils/export';
import toast from 'react-hot-toast';
import TableSkeleton from '../components/common/TableSkeleton';
import KPICardSkeleton from '../components/common/KPICardSkeleton';
import { refundsAPI } from '../api/refunds';

const Refunds = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const queryClient = useQueryClient();

  // Charger les remboursements depuis l'API
  const { data, isLoading } = useQuery({
    queryKey: ['refunds', activeFilter, priorityFilter, currentPage],
    queryFn: () => refundsAPI.getRefunds({ 
      page: currentPage, 
      limit: itemsPerPage,
      status: activeFilter !== 'all' ? activeFilter : undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    }),
    retry: 2,
  });

  // Mutation pour approuver un remboursement
  const approveMutation = useMutation({
    mutationFn: (id) => refundsAPI.approveRefund(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['refunds']);
      toast.success('Remboursement approuvé et traité');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de l\'approbation');
    },
  });

  // Mutation pour rejeter un remboursement
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => refundsAPI.rejectRefund(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['refunds']);
      toast.success('Remboursement rejeté');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors du rejet');
    },
  });

  const refunds = data?.data?.refunds || [];
  const statistics = data?.data?.statistics || {};
  const pagination = data?.data?.pagination || { total: 0, pages: 0 };

  // Fonction d'export
  const handleExport = () => {
    try {
      if (refunds.length === 0) {
        toast.error('Aucun remboursement à exporter');
        return;
      }

      const exportData = refunds.map(refund => ({
        'ID Remboursement': refund.id || refund.refund_number || '-',
        'ID Commande': refund.order_id || refund.order_number || '-',
        'Montant': formatCurrency(refund.amount || 0),
        'Raison': refund.reason || '-',
        'Statut': getStatusLabel(refund.status),
        'Priorité': refund.priority || '-',
        'Créé le': refund.created_at ? formatDateShort(refund.created_at) : '-',
        'Traité le': refund.processed_at ? formatDateShort(refund.processed_at) : '-',
      }));

      exportToCSV(exportData, `remboursements-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Export CSV réussi !');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  const handleApprove = (refundId) => {
    if (window.confirm(`Êtes-vous sûr de vouloir approuver ce remboursement ?`)) {
      approveMutation.mutate(refundId);
    }
  };

  const handleReject = (refundId) => {
    if (globalThis.confirm('Êtes-vous sûr de vouloir rejeter ce remboursement ?')) {
      toast.success(`Remboursement ${refundId} rejeté`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
      case 'approved':
        return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'rejected':
        return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'approved':
        return 'Approuvé';
      case 'rejected':
        return 'Rejeté';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64 animate-pulse" />
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32 animate-pulse" />
          </div>

          {/* Filters Skeleton */}
          <div className="flex gap-4">
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32 animate-pulse" />
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32 animate-pulse" />
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32 animate-pulse" />
          </div>

          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {new Array(3).fill(null).map((_, i) => (
              <div key={`card-skeleton-${i}`} className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Gestion des Remboursements
            </h2>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 mt-1">
              <span>Support</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
              <span className="text-primary font-semibold">Files de remboursement</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                search
              </span>
              <input
                className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary"
                placeholder="Rechercher une commande..."
                type="text"
              />
            </div>
            <button className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-full">
                +5.2%
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
              Total Remboursé (mois)
            </p>
            <p className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {formatCurrency(statistics.total_refunded || 0)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                <span className="material-symbols-outlined">pending_actions</span>
              </div>
              <span className="text-orange-600 dark:text-orange-400 text-xs font-bold bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-full">
                {statistics.pending_count || 0}
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Demandes en attente</p>
            <p className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {statistics.pending_count || 0}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                <span className="material-symbols-outlined">verified</span>
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Taux d'approbation</p>
            <p className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {statistics.completed_count && statistics.pending_count 
                ? `${Math.round((statistics.completed_count / (statistics.completed_count + statistics.pending_count)) * 100)}%`
                : '0%'}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                <span className="material-symbols-outlined">timer</span>
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
              Temps de traitement moyen
            </p>
            <p className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {statistics.avg_processing_hours ? `${Number.parseFloat(statistics.avg_processing_hours).toFixed(1)}h` : '0h'}
            </p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${
                activeFilter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Toutes les demandes
            </button>
            <button
              onClick={() => setActiveFilter('pending')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-colors ${
                activeFilter === 'pending'
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              En attente
              {statistics.pending_count > 0 && (
                <span className="size-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-[10px]">
                  {statistics.pending_count}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveFilter('approved')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === 'approved'
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Approuvées
            </button>
            <button
              onClick={() => setActiveFilter('rejected')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === 'rejected'
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Rejetées
            </button>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium bg-white dark:bg-slate-800">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              Filtres
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium bg-white dark:bg-slate-800">
              <span className="material-symbols-outlined text-sm">download</span>
              Export
            </button>
          </div>
        </div>

        {/* Refund Request List */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Demandes prioritaires</h3>
          {refunds.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-400 mb-4">check_circle</span>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                Aucun remboursement {activeFilter !== 'all' ? `(${activeFilter})` : ''} pour le moment
              </p>
            </div>
          ) : (
            <>
              {refunds.map((refund) => (
                <div
                  key={refund.id}
                  className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
                    refund.priority === 'low' ? 'opacity-80' : ''
                  }`}
                >
                  <div className="p-6 flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                            #{refund.id}
                          </span>
                          <h4 className="font-bold text-lg text-slate-900 dark:text-white">
                            {refund.customer_name || 'Client inconnu'}
                          </h4>
                          <span
                            className={`size-1.5 rounded-full ${
                              refund.status === 'pending' ? 'bg-orange-500' : refund.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          ></span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                            {refund.created_at ? formatDateShort(refund.created_at) : 'N/A'}
                          </span>
                        </div>
                        <p className="text-xl font-black text-slate-900 dark:text-white">
                          {formatCurrency(refund.amount || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-1">
                          Motif du remboursement
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border-l-4 border-primary">
                          "{refund.description || 'Aucun motif spécifié'}"
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          Commande: #{refund.order_number || refund.order_id}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-4 lg:w-1/3">
                      <div className="flex-1 w-full space-y-2">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                          Preuve visuelle
                        </p>
                        <div className="relative group/img overflow-hidden rounded-lg aspect-square sm:aspect-video lg:aspect-square bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          {/* TODO: Ajouter un champ pour les images de preuve dans la table transactions */}
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-400 text-3xl">no_photography</span>
                          </div>
                        </div>
                      </div>
                      {refund.status === 'pending' && (
                        <div className="flex flex-col gap-2 w-full sm:w-48 lg:w-full xl:w-48">
                          <button
                            onClick={() => handleApprove(refund.id)}
                            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">check_circle</span>
                            Approuver
                          </button>
                          <button
                            onClick={() => handleReject(refund.id)}
                            className="w-full py-2.5 border border-red-500 text-red-500 hover:bg-red-500/5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">cancel</span>
                            Rejeter
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Page {currentPage} sur {pagination.pages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Précédent
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                let pageNum;
                if (pagination.pages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= pagination.pages - 2) {
                  pageNum = pagination.pages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                      currentPage === pageNum
                        ? 'bg-primary text-white'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={currentPage === pagination.pages}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Refunds;

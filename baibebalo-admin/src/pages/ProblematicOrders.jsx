import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { formatCurrency, formatDateShort } from '../utils/format';
import toast from 'react-hot-toast';
import TableSkeleton from '../components/common/TableSkeleton';
import { ordersAPI } from '../api/orders';

const ProblematicOrders = () => {
  const [problemType, setProblemType] = useState('all');
  const [urgencyLevel, setUrgencyLevel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Charger les commandes problématiques depuis l'API
  const { data, isLoading } = useQuery({
    queryKey: ['problematic-orders', problemType, urgencyLevel, currentPage],
    queryFn: () => ordersAPI.getProblematicOrders({ 
      page: currentPage, 
      limit: itemsPerPage,
      problem_type: problemType !== 'all' ? problemType : undefined,
      urgency: urgencyLevel !== 'all' ? urgencyLevel : undefined,
    }),
    retry: 2,
  });

  // Mutation pour réassigner un livreur
  const reassignMutation = useMutation({
    mutationFn: ({ orderId, deliveryPersonId }) => ordersAPI.reassignDeliveryPerson(orderId, deliveryPersonId),
    onSuccess: () => {
      queryClient.invalidateQueries(['problematic-orders']);
      toast.success('Livreur réassigné avec succès');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la réassignation');
    },
  });

  // Mutation pour annuler une commande
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
  const pagination = data?.data?.pagination || { total: 0, pages: 0 };

  const handleReassign = (orderId) => {
    // TODO: Ouvrir un modal pour sélectionner un nouveau livreur
    toast.info('Fonctionnalité de réassignation en cours de développement');
  };

  const handleCancel = (orderId) => {
    if (globalThis.confirm(`Êtes-vous sûr de vouloir annuler la commande ${orderId} ?`)) {
      cancelMutation.mutate({ orderId, reason: 'Annulée depuis la page des commandes problématiques' });
    }
  };

  const handleCall = (orderId, type) => {
    // TODO: Intégrer avec un service de téléphonie
    toast.info(`Appel ${type === 'driver' ? 'du livreur' : 'du client'} pour la commande ${orderId}...`);
  };

  const handleViewDetails = (orderId) => {
    navigate(`/orders/${orderId}`);
  };

  const getProblemBadge = (type) => {
    switch (type) {
      case 'litige':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'retard':
        return 'bg-red-900 text-red-100 dark:bg-red-950 dark:text-red-300';
      case 'client_absent':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getProblemLabel = (type) => {
    switch (type) {
      case 'litige':
        return 'LITIGE';
      case 'retard':
        return 'RETARD';
      case 'client_absent':
        return 'CLIENT ABSENT';
      default:
        return type.toUpperCase();
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesType = problemType === 'all' || order.problemType === problemType;
    const matchesUrgency = urgencyLevel === 'all' || order.urgency === urgencyLevel;
    const matchesSearch =
      searchQuery === '' ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.client.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesUrgency && matchesSearch;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64 animate-pulse" />
            <div className="flex gap-3">
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32 animate-pulse" />
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32 animate-pulse" />
            </div>
          </div>

          {/* Filters Skeleton */}
          <div className="flex gap-4">
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-64 animate-pulse" />
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-48 animate-pulse" />
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-48 animate-pulse" />
          </div>

          {/* Table Skeleton */}
          <TableSkeleton rows={5} columns={6} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Commandes Problématiques & Alertes
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Gérez les commandes en difficulté et intervenez rapidement
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Problem Type Filter */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                Filtrer par Type de Problème
              </h3>
              <div className="flex flex-wrap gap-2">
                <select
                  value={problemType}
                  onChange={(e) => setProblemType(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-1 focus:ring-primary"
                >
                  <option value="all">Tous</option>
                  <option value="retard">Retard</option>
                  <option value="litige">Litige</option>
                  <option value="client_absent">Client Absent</option>
                </select>
              </div>
            </div>

            {/* Urgency Level Filter */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                Filtrer par Niveau d'Urgence
              </h3>
              <select
                value={urgencyLevel}
                onChange={(e) => setUrgencyLevel(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-1 focus:ring-primary"
              >
                <option value="all">Tous</option>
                <option value="high">Haute</option>
                <option value="medium">Moyenne</option>
                <option value="low">Basse</option>
              </select>
            </div>

            {/* Search */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                Rechercher
              </h3>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher commande ou client"
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-1 focus:ring-primary placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    ID Commande
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Statut du Problème
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider text-right">
                    Actions Rapides
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-4xl text-slate-400">shopping_bag</span>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">
                          Aucune commande problématique trouvée
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{order.id}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">{order.client}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{order.date}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${getProblemBadge(order.problemType)}`}
                        >
                          {getProblemLabel(order.problemType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                        {formatCurrency(order.amount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleReassign(order.id)}
                            className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            Réassigner
                          </button>
                          <button
                            onClick={() => handleCancel(order.id)}
                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => handleCall(order.id, order.problemType === 'retard' ? 'driver' : 'client')}
                            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            {order.problemType === 'retard' ? 'Appeler le livreur' : 'Appeler le client'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Affichage {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, filteredOrders.length)} sur {filteredOrders.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Précédent
                </button>
                {Array.from({ length: Math.min(4, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
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
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
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

export default ProblematicOrders;

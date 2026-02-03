import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { supportAPI } from '../api/support';
import { formatDateShort } from '../utils/format';
import { exportToCSV } from '../utils/export';
import TableSkeleton from '../components/common/TableSkeleton';
import toast from 'react-hot-toast';

const Support = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    status: '',
    page: 1,
    limit: 20,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);

  const userIdParam = searchParams.get('user_id') || '';
  const orderIdParam = searchParams.get('order_id') || '';
  const initialCreateData = useMemo(() => {
    if (!userIdParam || !orderIdParam) return null;
    return {
      user_id: userIdParam,
      order_id: orderIdParam,
      user_type: 'user',
      subject: `Contact client - Commande #${orderIdParam.slice(0, 8)}`,
      message: '',
      priority: 'medium',
      category: 'order',
    };
  }, [userIdParam, orderIdParam]);

  useEffect(() => {
    if (initialCreateData) setShowCreateModal(true);
  }, [initialCreateData]);

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    if (userIdParam || orderIdParam) setSearchParams({});
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => supportAPI.getTickets(filters),
  });

  // Mutation pour créer un ticket
  const createMutation = useMutation({
    mutationFn: supportAPI.createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries(['tickets']);
      setShowCreateModal(false);
      if (userIdParam || orderIdParam) setSearchParams({});
      toast.success('Ticket créé avec succès');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la création du ticket');
    },
  });

  const tickets = data?.data?.tickets || [];
  const pagination = data?.data?.pagination || {};

  // Fonction d'export
  const handleExport = () => {
    try {
      if (tickets.length === 0) {
        toast.error('Aucun ticket à exporter');
        return;
      }

      const exportData = tickets.map(ticket => ({
        'ID Ticket': ticket.id || ticket.ticket_number || '-',
        'Sujet': ticket.subject || '-',
        'Type': ticket.type || '-',
        'Priorité': ticket.priority || '-',
        'Statut': ticket.status || '-',
        'Créé le': ticket.created_at ? formatDateShort(ticket.created_at) : '-',
        'Mis à jour le': ticket.updated_at ? formatDateShort(ticket.updated_at) : '-',
      }));

      exportToCSV(exportData, `tickets-support-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Export CSV réussi !');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Gestion des Tickets Support</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Flux centralisé des demandes d'assistance</p>
          </div>
          <TableSkeleton rows={10} columns={6} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Gestion des Tickets Support</h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl font-medium">Flux centralisé des demandes d'assistance clients, restaurants et livreurs de l'écosystème BAIBEBALO.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleExport}
              disabled={isLoading || tickets.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg">file_download</span>
              <span>Exporter</span>
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-md hover:brightness-110 transition-all"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              <span>Nouveau Ticket</span>
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button 
                onClick={() => setFilters({ ...filters, status: '', page: 1 })}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  filters.status === '' 
                    ? 'bg-white dark:bg-primary shadow-sm text-primary dark:text-white' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-primary'
                }`}
              >
                Tous
              </button>
              <button 
                onClick={() => setFilters({ ...filters, status: 'open', page: 1 })}
                className={`px-4 py-1.5 text-xs font-bold transition-colors ${
                  filters.status === 'open' 
                    ? 'bg-white dark:bg-primary shadow-sm text-primary dark:text-white' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-primary'
                }`}
              >
                Nouveau
              </button>
              <button 
                onClick={() => setFilters({ ...filters, status: 'in_progress', page: 1 })}
                className={`px-4 py-1.5 text-xs font-bold transition-colors ${
                  filters.status === 'in_progress' 
                    ? 'bg-white dark:bg-primary shadow-sm text-primary dark:text-white' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-primary'
                }`}
              >
                En cours
              </button>
              <button 
                onClick={() => setFilters({ ...filters, status: 'resolved', page: 1 })}
                className={`px-4 py-1.5 text-xs font-bold transition-colors ${
                  filters.status === 'resolved' 
                    ? 'bg-white dark:bg-primary shadow-sm text-primary dark:text-white' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-primary'
                }`}
              >
                Résolu
              </button>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
            <div className="flex gap-2 flex-wrap">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-900 dark:text-white">
                Type: Tous <span className="material-symbols-outlined text-sm">expand_more</span>
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-900 dark:text-white">
                Priorité: Toutes <span className="material-symbols-outlined text-sm">expand_more</span>
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-900 dark:text-white">
                Période <span className="material-symbols-outlined text-sm">calendar_today</span>
              </button>
            </div>
            <button 
              onClick={() => setFilters({ status: '', page: 1, limit: 20 })}
              className="ml-auto text-xs font-bold text-slate-500 hover:text-primary"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          {/* Info pagination en haut */}
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {pagination.total || tickets.length} ticket(s) trouvé(s)
            </span>
            <select
              value={filters.limit}
              onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value), page: 1 })}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
            >
              <option value={10}>10 par page</option>
              <option value={20}>20 par page</option>
              <option value={50}>50 par page</option>
              <option value={100}>100 par page</option>
            </select>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-32">ID</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-40">Utilisateur</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-28">Catégorie</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sujet</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-36">Priorité</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-40">Statut</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-48">Date de création</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-16 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-slate-500">
                      Aucun ticket trouvé
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => {
                    // Déterminer le type d'utilisateur (Client, Resto, Livreur)
                    const userType = ticket.user_type || 'client';
                    const userTypeConfig = {
                      client: { label: 'Client', class: 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' },
                      restaurant: { label: 'Resto', class: 'bg-primary/10 text-primary dark:text-white' },
                      delivery: { label: 'Livreur', class: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
                    };
                    const userTypeInfo = userTypeConfig[userType] || userTypeConfig.client;

                    // Mapper les catégories vers des labels lisibles
                    const categoryConfig = {
                      order: { label: 'Commande', icon: 'shopping_bag', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
                      payment: { label: 'Paiement', icon: 'payments', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
                      delivery: { label: 'Livraison', icon: 'local_shipping', class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
                      account: { label: 'Compte', icon: 'person', class: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
                      technical: { label: 'Technique', icon: 'build', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
                      other: { label: 'Autre', icon: 'help', class: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
                    };
                    const categoryInfo = categoryConfig[ticket.category] || categoryConfig.other;

                    return (
                      <tr key={ticket.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-4 font-mono text-xs text-slate-900 dark:text-white font-medium">
                          #{ticket.ticket_number || ticket.id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${userTypeInfo.class}`}>
                            {userTypeInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${categoryInfo.class}`}>
                            <span className="material-symbols-outlined text-sm">{categoryInfo.icon}</span>
                            {categoryInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">{ticket.subject}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{ticket.description?.substring(0, 60)}...</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            ticket.priority === 'urgent' 
                              ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-500'
                              : ticket.priority === 'high'
                              ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-500'
                              : 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500'
                          }`}>
                            {ticket.priority === 'urgent' && <span className="size-1.5 rounded-full bg-red-600"></span>}
                            {ticket.priority === 'high' && <span className="size-1.5 rounded-full bg-orange-600"></span>}
                            {ticket.priority === 'normal' && <span className="size-1.5 rounded-full bg-blue-600"></span>}
                            {ticket.priority === 'urgent' ? 'Urgent' : ticket.priority === 'high' ? 'Élevée' : 'Normale'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                            ticket.status === 'open' 
                              ? 'bg-primary/20 text-primary'
                              : ticket.status === 'in_progress'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                              : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400'
                          }`}>
                            {ticket.status === 'open' ? 'Nouveau' : ticket.status === 'in_progress' ? 'En cours' : 'Résolu'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {formatDateShort(ticket.created_at)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => navigate(`/support/${ticket.id}`)}
                            className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                          >
                            <span className="material-symbols-outlined text-lg">visibility</span>
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
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Page {filters.page} sur {pagination.pages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: 1 })}
                  disabled={filters.page === 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-base">first_page</span>
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                  disabled={filters.page === 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-base">chevron_left</span>
                </button>
                
                {/* Numéros de pages */}
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  let pageNum;
                  if (pagination.pages <= 5) {
                    pageNum = i + 1;
                  } else if (filters.page <= 3) {
                    pageNum = i + 1;
                  } else if (filters.page >= pagination.pages - 2) {
                    pageNum = pagination.pages - 4 + i;
                  } else {
                    pageNum = filters.page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setFilters({ ...filters, page: pageNum })}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        filters.page === pageNum
                          ? 'bg-primary text-white'
                          : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setFilters({ ...filters, page: Math.min(pagination.pages, filters.page + 1) })}
                  disabled={filters.page === pagination.pages}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: pagination.pages })}
                  disabled={filters.page === pagination.pages}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-base">last_page</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Créer Ticket */}
        {showCreateModal && (
          <CreateTicketModal
            initialData={initialCreateData}
            onClose={handleCloseCreateModal}
            onSubmit={(formData) => createMutation.mutate(formData)}
            isLoading={createMutation.isPending}
          />
        )}
      </div>
    </Layout>
  );
};

const defaultFormData = {
  subject: '',
  message: '',
  priority: 'medium',
  category: '',
  user_type: '',
  user_id: '',
  order_id: '',
};

// Modal pour créer un ticket
const CreateTicketModal = ({ initialData, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState(() => ({
    ...defaultFormData,
    ...(initialData || {}),
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.message) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Nouveau Ticket Support</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Sujet *
            </label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
              placeholder="Résumé du problème..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Message *
            </label>
            <textarea
              required
              rows={6}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary resize-none"
              placeholder="Décrivez le problème en détail..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Priorité
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="low">Basse</option>
                <option value="medium">Normale</option>
                <option value="high">Élevée</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Catégorie
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
                placeholder="Technique, Facturation, etc."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Type d'utilisateur
              </label>
              <select
                value={formData.user_type}
                onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="">Aucun</option>
                <option value="user">Client</option>
                <option value="restaurant">Restaurant</option>
                <option value="delivery">Livreur</option>
              </select>
            </div>
            {formData.user_type && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  ID Utilisateur
                </label>
                <input
                  type="text"
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
                  placeholder="UUID de l'utilisateur"
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              ID Commande (optionnel)
            </label>
            <input
              type="text"
              value={formData.order_id}
              onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary"
              placeholder="UUID de la commande"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Création...' : 'Créer le ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Support;

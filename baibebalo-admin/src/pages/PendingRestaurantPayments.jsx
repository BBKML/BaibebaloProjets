import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { financesAPI } from '../api/finances';
import apiClient from '../api/client';
import { formatCurrency } from '../utils/format';
import toast from 'react-hot-toast';

const PendingRestaurantPayments = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [minAmount, setMinAmount] = useState('');

  // Calculer les dates pour le filtre de période
  const getDateRange = (period) => {
    const today = new Date();
    const dateTo = today.toISOString().split('T')[0];
    
    switch (period) {
      case 'all':
        // 7 derniers jours
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return {
          date_from: sevenDaysAgo.toISOString().split('T')[0],
          date_to: dateTo,
        };
      case 'month':
        // Ce mois
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          date_from: firstDayOfMonth.toISOString().split('T')[0],
          date_to: dateTo,
        };
      case 'custom':
        // Période personnalisée - pour l'instant, retourner undefined
        return {};
      default:
        return {};
    }
  };

  // Récupérer les paiements depuis l'API
  const { data, isLoading, error } = useQuery({
    queryKey: ['restaurant-payments', activeTab, searchQuery, periodFilter, minAmount],
    queryFn: () => {
      const params = {
        page: 1,
        limit: 100,
        status: activeTab === 'pending' ? 'pending' : activeTab === 'paid' ? 'completed' : undefined,
      };
      
      // Ajouter les filtres
      if (searchQuery) params.search = searchQuery;
      if (minAmount) params.min_amount = parseFloat(minAmount);
      
      // Ajouter les dates selon la période
      const dateRange = getDateRange(periodFilter);
      if (dateRange.date_from) params.date_from = dateRange.date_from;
      if (dateRange.date_to) params.date_to = dateRange.date_to;
      
      return financesAPI.getPendingRestaurantPayments(params);
    },
  });

  const payments = data?.data?.payments || [];
  const totalCount = data?.data?.pagination?.total || 0;

  const handleSelectPayment = (paymentId) => {
    setSelectedPayments((prev) =>
      prev.includes(paymentId) ? prev.filter((id) => id !== paymentId) : [...prev, paymentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPayments.length === payments.length) {
      setSelectedPayments([]);
    } else {
      setSelectedPayments(payments.map((p) => p.id));
    }
  };

  // Mutation pour payer les sélections
  const paySelectedMutation = useMutation({
    mutationFn: async (paymentIds) => {
      // Appeler l'endpoint pour traiter chaque paiement
      // Utiliser processPayout pour chaque ID (transaction ID)
      const results = await Promise.allSettled(
        paymentIds.map((id) => {
          // Utiliser l'endpoint processPayout qui existe dans le backend
          return apiClient.put(`/admin/finances/payouts/${id}/process`);
        })
      );
      
      // Vérifier s'il y a des erreurs
      const errors = results.filter(r => r.status === 'rejected');
      if (errors.length > 0) {
        throw new Error(`${errors.length} paiement(s) ont échoué`);
      }
      
      return results;
    },
    onSuccess: () => {
      toast.success(`Paiement de ${selectedPayments.length} restaurant(s) effectué avec succès`);
      setSelectedPayments([]);
      queryClient.invalidateQueries(['restaurant-payments']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors du paiement');
    },
  });

  const handlePaySelected = () => {
    if (selectedPayments.length === 0) {
      toast.error('Veuillez sélectionner au moins un paiement');
      return;
    }
    if (window.confirm(`Êtes-vous sûr de vouloir payer ${selectedPayments.length} paiement(s) ?`)) {
      paySelectedMutation.mutate(selectedPayments);
    }
  };

  // Fonction pour exporter en CSV
  const handleExportCSV = () => {
    if (payments.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    // Créer le contenu CSV
    const headers = ['Restaurant', 'ID Restaurant', 'Montant', 'Période', 'Statut', 'Date'];
    const rows = payments.map((payment) => [
      payment.restaurant_name || payment.restaurantName || 'N/A',
      payment.restaurant_id || payment.restaurantId || 'N/A',
      payment.amount || 0,
      payment.period || 'N/A',
      payment.status || 'pending',
      payment.created_at ? new Date(payment.created_at).toLocaleDateString('fr-FR') : 'N/A',
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) => row.map((cell) => {
        const value = String(cell).replace(/"/g, '""');
        return `"${value}"`;
      }).join(';')),
    ].join('\n');

    // Ajouter BOM UTF-8 pour Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `paiements-restaurants-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Export CSV réussi');
  };

  // Fonction pour voir les détails d'un paiement
  const handleViewDetails = (paymentId) => {
    // TODO: Naviguer vers une page de détails ou ouvrir un modal
    toast.info('Fonctionnalité de détails à venir');
    // navigate(`/finances/payments/restaurants/${paymentId}`);
  };

  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'NA';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Heading & Actions */}
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Paiements Restaurants en Attente
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-base">
              Gérez les versements hebdomadaires et effectuez les virements groupés.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportCSV}
              disabled={isLoading || payments.length === 0}
              className="flex items-center gap-2 px-4 h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-xl">download</span>
              <span>Exporter CSV</span>
            </button>
            <button
              onClick={handlePaySelected}
              disabled={selectedPayments.length === 0 || paySelectedMutation.isPending}
              className="flex items-center gap-2 px-6 h-11 bg-primary text-white rounded-lg text-sm font-bold shadow-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-xl">send</span>
              <span>
                {paySelectedMutation.isPending
                  ? 'Paiement en cours...'
                  : `Payer la sélection (${selectedPayments.length})`}
              </span>
            </button>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 gap-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 border-b-[3px] pb-3 pt-4 transition-colors ${
              activeTab === 'pending'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-primary'
            }`}
          >
            <p className="text-sm font-bold tracking-tight">En attente</p>
            {activeTab === 'pending' && (
              <span className="bg-primary/10 text-primary text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {isLoading ? '...' : totalCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('paid')}
            className={`flex items-center gap-2 border-b-[3px] pb-3 pt-4 transition-colors ${
              activeTab === 'paid'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-primary'
            }`}
          >
            <p className="text-sm font-bold tracking-tight">Payés</p>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 border-b-[3px] pb-3 pt-4 transition-colors ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-primary'
            }`}
          >
            <p className="text-sm font-bold tracking-tight">Historique complet</p>
          </button>
        </div>

        {/* Filters Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-3">
            <h3 className="text-slate-900 dark:text-white text-sm font-bold">Recherche</h3>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nom du restaurant..."
                className="w-full pl-10 pr-4 h-12 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-primary focus:border-primary transition-all"
              />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-3">
            <h3 className="text-slate-900 dark:text-white text-sm font-bold">Période</h3>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                calendar_month
              </span>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="w-full pl-10 pr-4 h-12 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm appearance-none focus:ring-primary focus:border-primary text-slate-900 dark:text-white"
              >
                <option value="all">7 derniers jours</option>
                <option value="month">Ce mois (Octobre)</option>
                <option value="custom">Période personnalisée</option>
              </select>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-3">
            <h3 className="text-slate-900 dark:text-white text-sm font-bold">Montant minimum</h3>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                payments
              </span>
              <input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 h-12 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-primary focus:border-primary transition-all text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </section>

        {/* Table Data Section */}
        <section>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4 w-12">
                    {activeTab === 'pending' && (
                      <input
                        type="checkbox"
                        checked={selectedPayments.length === payments.length && payments.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary cursor-pointer"
                      />
                    )}
                  </th>
                  <th className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Restaurant
                  </th>
                  <th className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Montant à régler
                  </th>
                  <th className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Période
                  </th>
                  <th className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Commandes
                  </th>
                  <th className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                      Chargement...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-red-500">
                      Erreur lors du chargement des paiements
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                      Aucun paiement {activeTab === 'pending' ? 'en attente' : activeTab === 'paid' ? 'payé' : 'trouvé'}
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => {
                    const isSelected = selectedPayments.includes(payment.id);
                    const restaurantName = payment.restaurant_name || payment.restaurantName || 'N/A';
                    const restaurantId = payment.restaurant_id || payment.restaurantId || 'N/A';
                    return (
                      <tr
                        key={payment.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          {activeTab === 'pending' && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectPayment(payment.id)}
                              className="rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary cursor-pointer"
                            />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {getInitials(restaurantName)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {restaurantName}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">ID: {restaurantId}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-lg font-bold text-slate-900 dark:text-white">
                            {formatCurrency(payment.amount || 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {payment.created_at
                            ? new Date(payment.created_at).toLocaleDateString('fr-FR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {payment.order_number || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {payment.status === 'paid' && (
                              <button
                                onClick={async () => {
                                  try {
                                    await financesAPI.refreshRestaurantBalance(payment.restaurant_id || payment.user_id);
                                    toast.success('Solde restaurant actualisé');
                                    queryClient.invalidateQueries(['restaurant-payments']);
                                  } catch (error) {
                                    toast.error('Erreur lors de l\'actualisation');
                                  }
                                }}
                                className="text-emerald-600 hover:text-emerald-700 font-bold text-sm transition-colors px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-50"
                                title="Actualiser le solde"
                              >
                                <span className="material-symbols-outlined text-lg">refresh</span>
                              </button>
                            )}
                            {payment.status === 'pending' && (
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Marquer le paiement de ${formatCurrency(payment.amount)} comme effectué ?`)) {
                                    try {
                                      await financesAPI.markPayoutAsPaid(payment.id);
                                      toast.success('Paiement marqué comme effectué');
                                      queryClient.invalidateQueries(['restaurant-payments']);
                                    } catch (error) {
                                      toast.error(error.response?.data?.error?.message || 'Erreur');
                                    }
                                  }
                                }}
                                className="text-primary hover:text-primary/70 font-bold text-sm transition-colors px-3 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/5"
                                title="Marquer comme payé"
                              >
                                <span className="material-symbols-outlined text-lg">check_circle</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleViewDetails(payment.id)}
                              className="text-primary hover:text-primary/70 font-bold text-sm transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-primary/20"
                              title="Voir les détails"
                            >
                              <span className="material-symbols-outlined text-lg">visibility</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default PendingRestaurantPayments;

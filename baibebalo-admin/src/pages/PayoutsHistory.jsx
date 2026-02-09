import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { financesAPI } from '../api/finances';
import { formatCurrency, formatDateShort } from '../utils/format';
import TableSkeleton from '../components/common/TableSkeleton';

const PayoutsHistory = () => {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState(''); // État local pour l'input de recherche
  const debounceTimerRef = useRef(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    status: 'all', // all, pending, paid, completed, rejected
    user_type: 'all', // all, delivery, restaurant
    phone: '', // Recherche par numéro
    date_from: '', // Date de début
    date_to: '', // Date de fin
  });

  // Debounce pour la recherche par numéro (500ms) - recherche automatique après arrêt de saisie
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, phone: searchInput, page: 1 }));
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchInput]);

  // Fonction pour déclencher la recherche manuellement
  const handleSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    // Mettre à jour les filtres immédiatement
    setFilters(prev => ({ ...prev, phone: searchInput.trim(), page: 1 }));
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['payouts-history', filters],
    queryFn: () => financesAPI.getPayoutRequests({
      ...filters,
      status: filters.status === 'all' ? undefined : filters.status,
      user_type: filters.user_type === 'all' ? undefined : filters.user_type,
      phone: filters.phone || undefined,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
    }),
  });

  const payouts = data?.data?.payouts || [];
  const pagination = data?.data?.pagination || { page: 1, limit: 50, total: 0, pages: 0 };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400',
      paid: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
      completed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400',
      rejected: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
    };
    return badges[status] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'En attente',
      paid: 'Payé',
      completed: 'Complété',
      rejected: 'Rejeté',
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Historique des Paiements
          </h1>
          <TableSkeleton rows={10} columns={7} />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Historique des Paiements
          </h1>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-400">
              Erreur lors du chargement : {error?.response?.data?.error?.message || error?.message}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/finances')}
              className="flex items-center justify-center w-10 h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              title="Retour aux Finances"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Historique des Paiements
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-base mt-1">
                Consultez tous les paiements effectués avec leurs détails et preuves
              </p>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="space-y-4">
            {/* Première ligne : Type et Statut */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Type
                </label>
                <select
                  value={filters.user_type}
                  onChange={(e) => setFilters({ ...filters, user_type: e.target.value, page: 1 })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="all">Tous</option>
                  <option value="delivery">Livreurs</option>
                  <option value="restaurant">Restaurants</option>
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Statut
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="all">Tous</option>
                  <option value="pending">En attente</option>
                  <option value="paid">Payé</option>
                  <option value="completed">Complété</option>
                  <option value="rejected">Rejeté</option>
                </select>
              </div>
            </div>

            {/* Deuxième ligne : Recherche par numéro et dates */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Recherche par numéro
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Numéro de téléphone ou Mobile Money"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    className="w-full px-4 py-2 pr-10 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400"
                  />
                  {isLoading && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className="material-symbols-outlined animate-spin text-primary text-lg">sync</span>
                    </span>
                  )}
                  {!isLoading && searchInput && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <span className="material-symbols-outlined text-lg">search</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Date de début
                </label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value, page: 1 })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters({ ...filters, date_to: e.target.value, page: 1 })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleSearch();
                  }}
                  disabled={isLoading}
                  className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                      Recherche...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">search</span>
                      Rechercher
                    </>
                  )}
                </button>
                {(filters.phone || filters.date_from || filters.date_to) && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    {filters.phone && <span className="mr-2">📱 {filters.phone}</span>}
                    {filters.date_from && <span className="mr-2">📅 Depuis: {filters.date_from}</span>}
                    {filters.date_to && <span>📅 Jusqu'à: {filters.date_to}</span>}
                  </div>
                )}
                <button
                  onClick={() => {
                    setSearchInput('');
                    setFilters({
                      page: 1,
                      limit: 50,
                      status: 'all',
                      user_type: 'all',
                      phone: '',
                      date_from: '',
                      date_to: '',
                    });
                  }}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[11px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Bénéficiaire</th>
                  <th className="px-6 py-4">Montant</th>
                  <th className="px-6 py-4">Date création</th>
                  <th className="px-6 py-4">Date paiement</th>
                  <th className="px-6 py-4 text-center">Statut</th>
                  <th className="px-6 py-4">Preuve</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-16">
                      <div className="flex flex-col items-center justify-center text-center max-w-xl mx-auto">
                        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                          <span className="material-symbols-outlined text-slate-400 text-5xl">search_off</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                          {filters.phone || filters.date_from || filters.date_to
                            ? 'Aucun résultat trouvé'
                            : 'Aucun paiement trouvé'}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                          {filters.phone || filters.date_from || filters.date_to ? (
                            <>
                              Aucun paiement ne correspond à vos critères de recherche.
                              {filters.phone && <><br />Numéro recherché: <strong>{filters.phone}</strong></>}
                              {filters.date_from && <><br />Date de début: <strong>{filters.date_from}</strong></>}
                              {filters.date_to && <><br />Date de fin: <strong>{filters.date_to}</strong></>}
                              <br /><br />Essayez de modifier vos filtres ou réinitialisez la recherche.
                            </>
                          ) : (
                            'Aucun paiement n\'a été trouvé dans l\'historique.'
                          )}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  payouts.map((payout) => (
                    <tr
                      key={payout.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {payout.user_type === 'delivery' ? 'Livreur' : 'Restaurant'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {payout.delivery_name || payout.restaurant_name || 'N/A'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {payout.delivery_phone || payout.restaurant_phone || 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(payout.amount || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {payout.created_at ? formatDateShort(payout.created_at) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {payout.paid_at ? formatDateShort(payout.paid_at) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(payout.status)}`}>
                          {getStatusLabel(payout.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {payout.payment_transaction_id || payout.payment_proof_url ? (
                          <div className="flex flex-col gap-1">
                            {payout.payment_transaction_id && (
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                TX: {payout.payment_transaction_id}
                              </span>
                            )}
                            {payout.payment_proof_url && (
                              <a
                                href={payout.payment_proof_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                Voir capture
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Aucune</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            const details = [
                              `ID: ${payout.id}`,
                              `Type: ${payout.user_type === 'delivery' ? 'Livreur' : 'Restaurant'}`,
                              `Bénéficiaire: ${payout.delivery_name || payout.restaurant_name || 'N/A'}`,
                              `Montant: ${formatCurrency(payout.amount)}`,
                              `Statut: ${getStatusLabel(payout.status)}`,
                              `Créé le: ${payout.created_at ? formatDateShort(payout.created_at) : 'N/A'}`,
                              payout.paid_at ? `Payé le: ${formatDateShort(payout.paid_at)}` : null,
                              payout.paid_by_name ? `Payé par: ${payout.paid_by_name}` : null,
                              payout.payment_transaction_id ? `Transaction: ${payout.payment_transaction_id}` : null,
                              payout.payment_proof_url ? `Preuve: ${payout.payment_proof_url}` : null,
                              payout.processed_by_name ? `Traité par: ${payout.processed_by_name}` : null,
                              payout.notes ? `Notes: ${payout.notes}` : null,
                            ].filter(Boolean).join('\n');
                            
                            alert(details);
                          }}
                          className="text-primary hover:text-primary/70 font-bold text-sm transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-primary/20"
                          title="Voir les détails"
                        >
                          <span className="material-symbols-outlined text-base">visibility</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Page {pagination.page} sur {pagination.pages} ({pagination.total} total)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: Math.max(1, pagination.page - 1) })}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: Math.min(pagination.pages, pagination.page + 1) })}
                  disabled={pagination.page === pagination.pages}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default PayoutsHistory;

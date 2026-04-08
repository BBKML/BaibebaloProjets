import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { financesAPI } from '../api/finances';
import { formatCurrency } from '../utils/format';
import TableSkeleton from '../components/common/TableSkeleton';
import toast from 'react-hot-toast';

/**
 * Page Admin : Vue paiement livreurs (chaque lundi)
 * Liste tous les livreurs avec leurs gains (solde à payer) pour faciliter le paiement hebdomadaire
 */
const DeliveryPaymentSummary = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['delivery-payment-summary'],
    queryFn: () => financesAPI.getDeliveryPaymentSummary(),
  });

  const generateMutation = useMutation({
    mutationFn: () => financesAPI.generatePayouts('delivery'),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['delivery-payment-summary']);
      queryClient.invalidateQueries(['delivery-payments']);
      toast.success(res?.message || 'Payouts générés avec succès');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Erreur lors de la génération');
    },
  });

  const refreshBalancesMutation = useMutation({
    mutationFn: () => financesAPI.refreshAllDeliveryBalances(),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['delivery-payment-summary']);
      queryClient.invalidateQueries(['delivery-payments']);
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'driver' });
      toast.success(res?.message || 'Soldes recalculés');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Erreur lors du recalcul');
    },
  });

  const [searchQuery, setSearchQuery] = useState('');

  const deliveryPersons = data?.data?.delivery_persons || [];
  const totalToPay = data?.data?.total_to_pay || 0;
  const driversWithBalance = data?.data?.drivers_with_balance || 0;
  const driversCount = data?.data?.drivers_count || 0;

  const filteredDeliveryPersons = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return deliveryPersons;
    return deliveryPersons.filter((dp) => {
      const name = `${dp.first_name || ''} ${dp.last_name || ''}`.toLowerCase();
      const phone = (dp.phone || '').replace(/\s/g, '');
      const mm = (dp.mobile_money_number || '').replace(/\s/g, '');
      return name.includes(q) || phone.includes(q) || mm.includes(q);
    });
  }, [deliveryPersons, searchQuery]);

  const handleGeneratePayouts = () => {
    if (window.confirm('Générer les payouts pour tous les livreurs avec solde ≥ 1000 FCFA et Mobile Money configuré ?')) {
      generateMutation.mutate();
    }
  };

  const handleGoToPayments = () => {
    navigate('/finances');
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Link to="/finances" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary font-medium">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Retour Finances
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Vue paiement livreurs</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Chargement...</p>
          </div>
          <TableSkeleton rows={12} columns={8} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Fil d'Ariane / Retour */}
        <div className="flex items-center gap-2 text-sm">
          <Link
            to="/finances"
            className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-primary font-medium"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Retour Finances
          </Link>
        </div>

        {/* En-tête */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Vue paiement livreurs
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Liste des livreurs avec leurs gains à payer. Utilisez cette vue chaque lundi pour effectuer les paiements.
          </p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500">error</span>
            <p className="text-red-700 dark:text-red-400 text-sm font-medium">
              {error?.response?.data?.error?.message || error?.message || 'Erreur inconnue'}
            </p>
          </div>
        )}

        {/* Cartes de synthèse */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Synthèse</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-primary/30 p-4 flex flex-col justify-between">
              <p className="text-sm font-medium text-primary dark:text-primary/90">Total à payer</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(totalToPay)}
              </p>
              <button
                onClick={handleGoToPayments}
                className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary hover:brightness-110 text-white rounded-lg font-semibold text-sm transition-colors"
              >
                <span className="material-symbols-outlined text-lg">payments</span>
                Payer les livreurs
              </button>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Livreurs éligibles (≥ 1000 FCFA)</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {driversWithBalance} <span className="text-slate-400 dark:text-slate-500 font-normal text-lg">/ {driversCount}</span>
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Livreurs actifs</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{driversCount}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Actions</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                if (window.confirm('Recalculer les soldes de tous les livreurs depuis les transactions ? (synchronise admin et app livreur)')) {
                  refreshBalancesMutation.mutate();
                }
              }}
              disabled={refreshBalancesMutation.isPending}
              className="flex items-center gap-2 px-4 py-2.5 border border-amber-300 dark:border-amber-700 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium disabled:opacity-50 transition-colors"
              title="Synchroniser les soldes admin / app livreur"
            >
              <span className="material-symbols-outlined text-lg">sync</span>
              {refreshBalancesMutation.isPending ? 'Recalcul...' : 'Recalculer soldes'}
            </button>
            <button
              onClick={handleGeneratePayouts}
              disabled={generateMutation.isPending || driversWithBalance === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              Générer les payouts
            </button>
          </div>
        </div>

        {/* Table + Recherche */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Liste des livreurs</p>
            <div className="relative w-full sm:w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">search</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nom, téléphone ou Mobile Money..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                aria-label="Rechercher un livreur"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label="Effacer la recherche"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              )}
            </div>
          </div>
          {searchQuery.trim() && (
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400">
              {filteredDeliveryPersons.length === 0
                ? 'Aucun livreur ne correspond à la recherche.'
                : `${filteredDeliveryPersons.length} livreur${filteredDeliveryPersons.length > 1 ? 's' : ''} trouvé${filteredDeliveryPersons.length > 1 ? 's' : ''}`}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[11px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">Livreur</th>
                  <th className="px-6 py-4">Téléphone</th>
                  <th className="px-6 py-4">Mobile Money</th>
                  <th className="px-6 py-4">Gains à payer</th>
                  <th className="px-6 py-4">Total gains</th>
                  <th className="px-6 py-4">Livraisons</th>
                  <th className="px-6 py-4">Compte</th>
                  <th className="px-6 py-4">Éligible paiement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDeliveryPersons.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-16 text-center">
                      {deliveryPersons.length === 0 ? (
                        <>
                          <p className="text-slate-500 dark:text-slate-400 font-medium">Aucun livreur</p>
                          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Les livreurs en attente ou actifs apparaîtront ici après inscription.</p>
                        </>
                      ) : (
                        <>
                          <p className="text-slate-500 dark:text-slate-400 font-medium">Aucun résultat</p>
                          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Modifiez la recherche (nom, téléphone ou numéro Mobile Money) ou effacez le filtre.</p>
                        </>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredDeliveryPersons.map((dp) => {
                    const balance = dp.available_balance || 0;
                    const canPay = dp.can_payout;
                    const isActive = dp.status === 'active';
                    return (
                      <tr
                        key={dp.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                          !isActive ? 'opacity-75' : ''
                        } ${balance >= 1000 && isActive ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <Link
                            to={`/drivers/${dp.id}`}
                            className="font-semibold text-slate-900 dark:text-white hover:text-primary"
                          >
                            {dp.first_name} {dp.last_name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          {dp.phone || '—'}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-sm">
                          {dp.mobile_money_number || (
                            <span className="text-amber-600 dark:text-amber-400">Non configuré</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`font-bold ${
                              balance >= 1000 && isActive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {formatCurrency(balance)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          {formatCurrency(dp.total_earnings || 0)}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          {dp.total_deliveries || 0}
                        </td>
                        <td className="px-6 py-4">
                          {isActive ? (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200">
                              Actif
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                              En attente
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {canPay ? (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200">
                              À payer
                            </span>
                          ) : !isActive ? (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                              Valider d&apos;abord
                            </span>
                          ) : balance > 0 && balance < 1000 ? (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              &lt; 1000 FCFA
                            </span>
                          ) : !dp.mobile_money_number ? (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                              MM manquant
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Procédure (repliable) */}
        <details className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 overflow-hidden group">
          <summary className="p-4 cursor-pointer list-none flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-500">info</span>
              Procédure paiement lundi
            </span>
            <span className="material-symbols-outlined text-slate-500 transition-transform group-open:rotate-180">expand_more</span>
          </summary>
          <div className="px-4 pb-4 text-sm text-slate-600 dark:text-slate-400">
            <ol className="list-decimal list-inside space-y-2">
              <li>Consultez cette liste pour voir les gains de chaque livreur.</li>
              <li>Cliquez sur <strong>Générer les payouts</strong> pour créer les demandes de paiement.</li>
              <li>Cliquez sur <strong>Payer les livreurs</strong> (ci-dessus ou dans la carte Total à payer) pour accéder aux paiements en attente.</li>
              <li>Effectuez les virements Mobile Money vers les numéros indiqués.</li>
            </ol>
          </div>
        </details>
      </div>
    </Layout>
  );
};

export default DeliveryPaymentSummary;

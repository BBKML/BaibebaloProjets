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

  const deliveryPersons = data?.data?.delivery_persons || [];
  const totalToPay = data?.data?.total_to_pay || 0;
  const driversWithBalance = data?.data?.drivers_with_balance || 0;
  const driversCount = data?.data?.drivers_count || 0;

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
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Vue paiement livreurs
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Chargement...</p>
          </div>
          <TableSkeleton rows={12} columns={6} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Vue paiement livreurs
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Liste des livreurs avec leurs gains à payer. Utilisez cette vue chaque lundi pour effectuer les paiements.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link
              to="/finances"
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Retour Finances
            </Link>
            <button
              onClick={() => {
                if (window.confirm('Recalculer les soldes de tous les livreurs depuis les transactions ? (synchronise admin et app livreur)')) {
                  refreshBalancesMutation.mutate();
                }
              }}
              disabled={refreshBalancesMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 border border-amber-300 dark:border-amber-700 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium disabled:opacity-50"
              title="Synchroniser les soldes admin / app livreur"
            >
              <span className="material-symbols-outlined text-lg">sync</span>
              {refreshBalancesMutation.isPending ? 'Recalcul...' : 'Recalculer soldes'}
            </button>
            <button
              onClick={handleGeneratePayouts}
              disabled={generateMutation.isPending || driversWithBalance === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium"
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              Générer les payouts
            </button>
            <button
              onClick={handleGoToPayments}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:brightness-110 text-white rounded-lg font-medium"
            >
              <span className="material-symbols-outlined text-lg">payments</span>
              Payer les livreurs
            </button>
          </div>
        </div>

        {/* Résumé */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-xl p-5">
            <p className="text-sm font-medium text-primary dark:text-primary/90">Total à payer</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {formatCurrency(totalToPay)}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Livreurs à payer (≥ 1000 FCFA)</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {driversWithBalance} / {driversCount}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total livreurs actifs</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{driversCount}</p>
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-400 text-sm font-medium">
              Erreur : {error?.response?.data?.error?.message || error?.message || 'Erreur inconnue'}
            </p>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
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
                  <th className="px-6 py-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {deliveryPersons.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-16 text-center">
                      <p className="text-slate-500 dark:text-slate-400 font-medium">Aucun livreur actif</p>
                    </td>
                  </tr>
                ) : (
                  deliveryPersons.map((dp) => {
                    const balance = dp.available_balance || 0;
                    const canPay = dp.can_payout;
                    return (
                      <tr
                        key={dp.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                          balance >= 1000 ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''
                        }`}
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
                              balance >= 1000
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
                          {canPay ? (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200">
                              À payer
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

        {/* Info */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-sm text-slate-600 dark:text-slate-400">
          <p className="font-medium mb-2">Procédure paiement lundi</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Consultez cette liste pour voir les gains de chaque livreur.</li>
            <li>Cliquez sur <strong>Générer les payouts</strong> pour créer les demandes de paiement.</li>
            <li>Cliquez sur <strong>Payer les livreurs</strong> pour accéder aux paiements en attente.</li>
            <li>Effectuez les virements Mobile Money vers les numéros indiqués.</li>
          </ol>
        </div>
      </div>
    </Layout>
  );
};

export default DeliveryPaymentSummary;

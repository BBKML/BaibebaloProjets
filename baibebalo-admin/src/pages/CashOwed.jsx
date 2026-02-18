import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { financesAPI } from '../api/finances';
import { formatCurrency } from '../utils/format';
import TableSkeleton from '../components/common/TableSkeleton';

/**
 * Page Admin : Ce que les livreurs doivent (espèces non remises)
 * Affiche le solde espèces à reverser par chaque livreur ayant des livraisons cash non encore remises
 */
const CashOwed = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['delivery-cash-owed'],
    queryFn: () => financesAPI.getDeliveryCashOwed(),
  });

  const deliveryPersons = data?.data?.delivery_persons || [];
  const totalOwed = data?.data?.total_owed || 0;

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Espèces dues par les livreurs
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Chargement...</p>
          </div>
          <TableSkeleton rows={8} columns={4} />
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
              Espèces dues par les livreurs
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Montant collecté en espèces (paiement à la livraison) que chaque livreur doit reverser à la plateforme.
              Les livreurs déclarent leurs remises dans l&apos;app ; vous validez ici une fois l&apos;argent reçu.
            </p>
          </div>
          <Link
            to="/finances"
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Retour Finances
          </Link>
        </div>

        {/* Total dû */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-amber-600 dark:text-amber-400">
              account_balance_wallet
            </span>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Total espèces à recevoir
              </p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                {formatCurrency(totalOwed)} FCFA
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {deliveryPersons.length} livreur(s) avec espèces non remises
              </p>
            </div>
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
                  <th className="px-6 py-4">Montant dû</th>
                  <th className="px-6 py-4">Commandes concernées</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {deliveryPersons.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600">
                          check_circle
                        </span>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">
                          Aucun livreur avec espèces en attente
                        </p>
                        <p className="text-sm text-slate-400 dark:text-slate-500">
                          Tous les livreurs ont remis les espèces collectées.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  deliveryPersons.map((dp) => (
                    <tr
                      key={dp.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {dp.first_name} {dp.last_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {dp.phone || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {formatCurrency(dp.cash_to_remit || 0)} FCFA
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {dp.orders_count || 0} commande(s)
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-sm text-slate-600 dark:text-slate-400">
          <p className="font-medium mb-2">Comment ça marche ?</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Le livreur collecte l&apos;argent en espèces auprès du client à la livraison.</li>
            <li>Il doit déclarer sa remise dans l&apos;app (agence ou dépôt Mobile Money).</li>
            <li>Une fois l&apos;argent reçu, validez la remise dans{' '}
              <Link to="/finances/cash-remittances" className="font-semibold text-primary hover:underline">
                Remises espèces
              </Link>.
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default CashOwed;

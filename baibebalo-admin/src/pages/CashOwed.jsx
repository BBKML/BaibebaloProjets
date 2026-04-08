import { useState, useMemo } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['delivery-cash-owed'],
    queryFn: () => financesAPI.getDeliveryCashOwed(),
  });

  const deliveryPersons = data?.data?.delivery_persons || [];
  const totalOwed = data?.data?.total_owed || 0;

  const filteredDeliveryPersons = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return deliveryPersons;
    return deliveryPersons.filter((dp) => {
      const name = `${dp.first_name || ''} ${dp.last_name || ''}`.toLowerCase();
      const phone = (dp.phone || '').replace(/\s/g, '');
      return name.includes(q) || phone.includes(q);
    });
  }, [deliveryPersons, searchQuery]);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Link to="/finances" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary font-medium">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Retour Finances
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Espèces dues par les livreurs</h1>
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
        {/* Retour */}
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
            Espèces dues par les livreurs
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Montant collecté en espèces (paiement à la livraison) que chaque livreur doit reverser à la plateforme.
            Les livreurs déclarent leurs remises dans l&apos;app ; vous validez dans Remises espèces une fois l&apos;argent reçu.
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

        {/* Synthèse */}
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-3">Synthèse</p>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-amber-600 dark:text-amber-400">account_balance_wallet</span>
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Total espèces à recevoir</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{formatCurrency(totalOwed)}</p>
              </div>
            </div>
            <div className="text-sm text-amber-700 dark:text-amber-400">
              {deliveryPersons.length === 0 && 'Aucun livreur avec espèces en attente'}
              {deliveryPersons.length === 1 && '1 livreur avec espèces non remises'}
              {deliveryPersons.length > 1 && `${deliveryPersons.length} livreurs avec espèces non remises`}
            </div>
          </div>
        </div>

        {/* Table + Recherche */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Liste des livreurs avec espèces dues</p>
            <div className="relative w-full sm:w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">search</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nom ou téléphone..."
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
                  <th className="px-6 py-4">Montant dû</th>
                  <th className="px-6 py-4">Commandes concernées</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDeliveryPersons.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-16 text-center">
                      {deliveryPersons.length === 0 ? (
                        <div className="flex flex-col items-center gap-4">
                          <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600">check_circle</span>
                          <p className="text-slate-500 dark:text-slate-400 font-medium">Aucun livreur avec espèces en attente</p>
                          <p className="text-sm text-slate-400 dark:text-slate-500">Tous les livreurs ont remis les espèces collectées.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-slate-500 dark:text-slate-400 font-medium">Aucun résultat</p>
                          <p className="text-sm text-slate-400 dark:text-slate-500">Modifiez la recherche ou effacez le filtre.</p>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredDeliveryPersons.map((dp) => (
                    <tr key={dp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {dp.first_name} {dp.last_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{dp.phone || '—'}</td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {formatCurrency(dp.cash_to_remit || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {dp.orders_count || 0} commande{dp.orders_count !== 1 ? 's' : ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Comment ça marche (repliable) */}
        <details className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 overflow-hidden group">
          <summary className="p-4 cursor-pointer list-none flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-500">info</span>
              Comment ça marche ?
            </span>
            <span className="material-symbols-outlined text-slate-500 transition-transform group-open:rotate-180">expand_more</span>
          </summary>
          <div className="px-4 pb-4 text-sm text-slate-600 dark:text-slate-400">
            <ul className="list-disc list-inside space-y-2">
              <li>Le livreur collecte l&apos;argent en espèces auprès du client à la livraison.</li>
              <li>Il déclare sa remise dans l&apos;app (agence ou dépôt Mobile Money).</li>
              <li>Une fois l&apos;argent reçu, validez la remise dans{' '}
                <Link to="/finances/cash-remittances" className="font-semibold text-primary hover:underline">
                  Remises espèces
                </Link>.
              </li>
            </ul>
          </div>
        </details>
      </div>
    </Layout>
  );
};

export default CashOwed;

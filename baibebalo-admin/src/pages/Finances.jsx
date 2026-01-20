import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { financesAPI } from '../api/finances';
import { formatCurrency, formatDateShort } from '../utils/format';
import TableSkeleton from '../components/common/TableSkeleton';

const Finances = () => {
  const [activeTab, setActiveTab] = useState('delivery');
  const [filters] = useState({
    page: 1,
    limit: 20,
  });

  const { data: deliveryData, isLoading: deliveryLoading } = useQuery({
    queryKey: ['delivery-payments', filters],
    queryFn: () => financesAPI.getPendingDeliveryPayments(filters),
    enabled: activeTab === 'delivery',
  });

  const { data: restaurantData, isLoading: restaurantLoading } = useQuery({
    queryKey: ['restaurant-payments', filters],
    queryFn: () => financesAPI.getPendingRestaurantPayments(filters),
    enabled: activeTab === 'restaurant',
  });

  const isLoading = activeTab === 'delivery' ? deliveryLoading : restaurantLoading;
  const payments = activeTab === 'delivery' 
    ? (deliveryData?.data?.payments || [])
    : (restaurantData?.data?.payments || []);
  
  // Récupérer le total payé sur 24h depuis les statistiques
  const totalPaid24h = activeTab === 'delivery' 
    ? (deliveryData?.data?.statistics?.total_paid_24h || 0)
    : 0;
  
  // État vide pour les paiements livreurs
  const isEmpty = !isLoading && payments.length === 0 && activeTab === 'delivery';

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {activeTab === 'delivery' ? 'Paiements Livreurs' : 'Paiements Restaurants'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Gérez les versements en attente</p>
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
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {activeTab === 'delivery' ? 'Paiements Livreurs en Attente' : 'Paiements Restaurants en Attente'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-base">
              {activeTab === 'delivery' 
                ? 'Gérez et validez les soldes en attente pour vos livreurs partenaires.'
                : 'Gérez les versements hebdomadaires et effectuez les virements groupés.'}
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                toast.info('Fonctionnalité d\'export en cours de développement');
              }}
              className="flex items-center gap-2 px-4 h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">download</span>
              <span>Exporter CSV</span>
            </button>
            <button className="flex items-center gap-2 px-6 h-11 bg-primary text-white rounded-lg text-sm font-bold shadow-sm hover:brightness-110 transition-all">
              <span className="material-symbols-outlined text-xl">send</span>
              <span>Payer la sélection (3)</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-0 mt-4">
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-8">
            <button
              onClick={() => setActiveTab('delivery')}
              className={`flex items-center gap-2 border-b-[3px] pb-3 pt-4 transition-colors ${
                activeTab === 'delivery'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-primary'
              }`}
            >
              <span className="text-sm font-bold tracking-tight">En attente</span>
              <span className="bg-primary/10 text-primary text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {deliveryData?.data?.pagination?.total || 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('restaurant')}
              className={`flex items-center gap-2 border-b-[3px] pb-3 pt-4 transition-colors ${
                activeTab === 'restaurant'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-primary'
              }`}
            >
              <span className="text-sm font-bold tracking-tight">Payés</span>
            </button>
            <button className="flex items-center gap-2 border-b-[3px] border-transparent text-slate-500 pb-3 pt-4 hover:text-primary transition-colors">
              <span className="text-sm font-bold tracking-tight">Historique complet</span>
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
            <h3 className="text-slate-900 dark:text-white text-sm font-bold">Recherche</h3>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input 
                className="w-full pl-10 pr-4 h-12 bg-gray-50 dark:bg-gray-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-primary focus:border-primary transition-all" 
                placeholder={activeTab === 'delivery' ? 'Nom du livreur...' : 'Nom du restaurant...'} 
                type="text"
              />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
            <h3 className="text-slate-900 dark:text-white text-sm font-bold">Période</h3>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">calendar_month</span>
              <select className="w-full pl-10 pr-4 h-12 bg-gray-50 dark:bg-gray-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm appearance-none focus:ring-primary focus:border-primary">
                <option>7 derniers jours</option>
                <option>Ce mois (Octobre)</option>
                <option>Période personnalisée</option>
              </select>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
            <h3 className="text-slate-900 dark:text-white text-sm font-bold">Montant minimum</h3>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">payments</span>
              <input 
                className="w-full pl-10 pr-4 h-12 bg-gray-50 dark:bg-gray-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-primary focus:border-primary transition-all" 
                placeholder="0.00" 
                type="number"
              />
            </div>
          </div>
        </section>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[11px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4 w-12">
                    <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary" />
                  </th>
                  <th className="px-6 py-4">{activeTab === 'delivery' ? 'Livreur' : 'Restaurant'}</th>
                  <th className="px-6 py-4">Montant à régler</th>
                  <th className="px-6 py-4">Période</th>
                  <th className="px-6 py-4 text-center">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isEmpty ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-16">
                      <div className="flex flex-col items-center justify-center text-center max-w-xl mx-auto">
                        {/* Empty State Illustration */}
                        <div className="relative mb-10 w-full flex justify-center">
                          <div className="absolute inset-0 flex items-center justify-center opacity-20 dark:opacity-30 pointer-events-none">
                            <div className="w-64 h-64 rounded-full bg-primary/20 blur-3xl" />
                            <div className="w-48 h-48 rounded-full bg-orange-500/10 blur-3xl -translate-x-20" />
                          </div>
                          <div className="relative z-10 w-64 h-64 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-2xl">
                            <div className="relative">
                              <div className="absolute -top-12 -right-4 w-12 h-12 rounded-full border-4 border-primary/40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center animate-bounce" style={{ animationDuration: '3s' }}>
                                <span className="material-symbols-outlined text-primary text-xl">payments</span>
                              </div>
                              <div className="absolute -bottom-8 -left-10 w-16 h-16 rounded-full border-4 border-orange-500/30 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center animate-pulse" style={{ animationDuration: '4s' }}>
                                <span className="material-symbols-outlined text-orange-500 text-2xl">toll</span>
                              </div>
                              <div className="w-32 h-32 bg-slate-200 dark:bg-slate-700 rounded-3xl flex items-center justify-center rotate-3 border-2 border-white/5 shadow-inner">
                                <span className="material-symbols-outlined text-slate-400 dark:text-slate-600 text-[80px]">account_balance_wallet</span>
                              </div>
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-1 bg-primary/20 rotate-45 rounded-full" />
                            </div>
                          </div>
                        </div>
                        {/* Text Content */}
                        <div className="space-y-4">
                          <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-widest">
                            Opérations à jour
                          </span>
                          <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Aucun paiement en attente
                          </h3>
                          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                            Tout est parfaitement synchronisé ! Il n'y a actuellement aucune transaction en attente de
                            traitement pour vos livreurs.
                          </p>
                        </div>
                        {/* Action Area */}
                        <div className="mt-10 flex flex-col sm:flex-row gap-4">
                          <button className="bg-primary hover:bg-primary/90 text-white px-8 py-3.5 rounded-xl font-bold transition-all hover:shadow-xl hover:shadow-primary/30 flex items-center gap-2 group">
                            <span className="material-symbols-outlined group-hover:-translate-x-0.5 transition-transform">history</span>
                            Vérifier l'historique
                          </button>
                          <button className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-8 py-3.5 rounded-xl font-bold transition-all border border-slate-200 dark:border-slate-700">
                            Configurer les seuils
                          </button>
                        </div>
                        {/* Stats Footer Hint */}
                        <div className="mt-16 grid grid-cols-3 gap-8 w-full max-w-md pt-8 border-t border-slate-200 dark:border-slate-800">
                          <div className="text-center">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Dernier Run</p>
                            <p className="text-sm font-extrabold text-slate-900 dark:text-white">Il y a 2h</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Automatisé</p>
                            <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Total Payé (24h)</p>
                            <p className="text-sm font-extrabold text-primary">{formatCurrency(totalPaid24h)}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                      Aucun paiement en attente
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-5">
                        <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary cursor-pointer" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                            <span className="material-symbols-outlined text-slate-400">
                              {activeTab === 'delivery' ? 'local_shipping' : 'restaurant'}
                            </span>
                          </div>
                          <div>
                            <p className="text-slate-900 dark:text-white text-sm font-bold">
                              {payment.name || 'N/A'}
                            </p>
                            <p className="text-slate-500 text-xs">ID: #{payment.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-slate-900 dark:text-white text-sm font-black">
                          {formatCurrency(payment.amount || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500">
                        {formatDateShort(payment.period_start)} - {formatDateShort(payment.period_end)}
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400">
                          En attente
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button className="text-primary hover:text-primary/70 font-bold text-sm">Détails</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Finances;

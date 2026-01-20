import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { usersAPI } from '../api/users';
import { formatCurrency, formatDateShort } from '../utils/format';
import TableSkeleton from '../components/common/TableSkeleton';
import LineChart from '../components/charts/LineChart';

const UserDetails = () => {
  // ⚠️ TOUS LES HOOKS DOIVENT ÊTRE APPELÉS EN PREMIER, AVANT TOUT RETURN CONDITIONNEL
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');

  const { data, isLoading, error } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersAPI.getUserDetails(id),
    retry: 2,
    enabled: !!id, // S'assurer que la requête ne s'exécute que si id existe
  });

  // Extraire les données après les hooks (mais avant les returns)
  const user = data?.data?.user || {};
  
  // Données pour le graphique d'activité (définies avant les returns)
  const activityData = [
    { name: 'Oct', value: 1 },
    { name: 'Nov', value: 2 },
    { name: 'Dec', value: 3 },
    { name: 'Jan', value: 6 },
    { name: 'Feb', value: 6 },
    { name: 'Mar', value: 9 },
  ];

  // Maintenant on peut faire les returns conditionnels
  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/users')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="h-8 w-64 skeleton"></div>
          </div>
          <TableSkeleton rows={5} columns={4} />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">Erreur</h3>
          <p className="text-red-700 dark:text-red-300">{error.message || 'Erreur lors du chargement de l\'utilisateur'}</p>
          <button
            onClick={() => navigate('/users')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retour aux utilisateurs
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/users')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Détails Utilisateur Enrichis
              </h1>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
            <span className="material-symbols-outlined text-sm">edit</span>
            <span className="text-sm font-semibold">Modifier</span>
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Revenu Total</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(user.total_revenue || 0)}
                </h3>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg">
                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">trending_up</span>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Commandes</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {user.total_orders || 0}
                </h3>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg">
                <span className="material-symbols-outlined text-emerald-600">trending_up</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Activité des Commandes (Derniers 6 Mois)
          </h3>
          <LineChart data={activityData} dataKey="value" nameKey="name" />
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'profile'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-primary'
              }`}
            >
              Profil
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'orders'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-primary'
              }`}
            >
              Commandes
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'reviews'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-primary'
              }`}
            >
              Avis
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'transactions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-primary'
              }`}
            >
              Transactions
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Nom complet
                    </label>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                      {user.full_name || user.name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Email
                    </label>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                      {user.email || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Téléphone
                    </label>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                      {user.phone || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Rôle
                    </label>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                      {user.role || 'Client'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Commandes Récentes</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[11px] font-black uppercase tracking-widest">
                        <th className="px-6 py-4">Nº Commande</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4 text-center">Statut</th>
                        <th className="px-6 py-4 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {user.recent_orders && user.recent_orders.length > 0 ? (
                        user.recent_orders.map((order) => {
                          const statusConfig = {
                            delivered: { label: 'Livré', class: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500' },
                            in_progress: { label: 'En cours', class: 'bg-semantic-amber/10 text-semantic-amber' },
                            cancelled: { label: 'Annulé', class: 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-500' },
                          };
                          const status = statusConfig[order.status] || { label: order.status, class: 'bg-slate-100 text-slate-600' };
                          
                          return (
                            <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                                #{order.id.slice(0, 8)}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-500">
                                {formatDateShort(order.created_at)}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${status.class}`}>
                                  {status.label}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right text-sm font-bold text-slate-900 dark:text-white">
                                {formatCurrency(order.total || 0)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                            Aucune commande récente
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                <p className="text-slate-500">Aucun avis disponible</p>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div>
                <p className="text-slate-500">Aucune transaction disponible</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UserDetails;

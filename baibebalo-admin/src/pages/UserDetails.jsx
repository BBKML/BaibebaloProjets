import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { usersAPI } from '../api/users';
import { formatCurrency, formatDateShort } from '../utils/format';
import { getImageUrl } from '../utils/url';
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
  const stats = data?.data?.stats || {};
  const recentOrders = data?.data?.recent_orders || user.recent_orders || [];
  const reviews = data?.data?.reviews || [];
  const addresses = data?.data?.addresses || user.addresses || [];
  
  // Données pour le graphique d'activité
  const activityData = data?.data?.activity || [
    { name: 'Oct', value: stats.orders_oct || 0 },
    { name: 'Nov', value: stats.orders_nov || 0 },
    { name: 'Dec', value: stats.orders_dec || 0 },
    { name: 'Jan', value: stats.orders_jan || 0 },
    { name: 'Feb', value: stats.orders_feb || 0 },
    { name: 'Mar', value: stats.orders_mar || 0 },
  ];

  const getStatusBadge = (status) => {
    if (user.is_suspended) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (status === 'active' || user.is_active) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
  };

  const getStatusLabel = () => {
    if (user.is_suspended) return 'Suspendu';
    if (user.is_active !== false) return 'Actif';
    return 'Inactif';
  };

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
            <div className="flex items-center gap-4">
              {/* Avatar */}
              {user.profile_picture ? (
                <img 
                  src={getImageUrl(user.profile_picture)} 
                  alt={user.first_name || 'User'}
                  className="w-14 h-14 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl"
                style={{ display: user.profile_picture ? 'none' : 'flex' }}
              >
                {(user.first_name?.[0] || user.name?.[0] || 'U').toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || 'Utilisateur'}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${getStatusBadge(user.status)}`}>
                    {getStatusLabel()}
                  </span>
                  <span className="text-sm text-slate-500">{user.phone}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => navigate(`/support?user_id=${id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">support_agent</span>
              <span className="text-sm font-semibold">Contacter</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Revenu Total</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(stats.total_spent ?? user.total_spent ?? user.total_revenue ?? 0)}
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
                  {stats.total_orders ?? user.total_orders ?? 0}
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
              <div className="space-y-6">
                {/* Informations personnelles */}
                <div>
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Informations personnelles</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InfoField label="Nom complet" value={user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name} />
                    <InfoField label="Email" value={user.email} />
                    <InfoField label="Téléphone" value={user.phone} />
                    <InfoField label="Rôle" value={user.role || 'Client'} />
                    <InfoField label="Inscrit le" value={user.created_at ? formatDateShort(user.created_at) : null} />
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Statut
                      </label>
                      <div className="mt-1">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${getStatusBadge(user.status)}`}>
                          {getStatusLabel()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statistiques */}
                <div>
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Statistiques</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                      <p className="text-xs text-slate-500">Total dépensé</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {formatCurrency(stats.total_spent || user.total_spent || user.total_revenue || 0)}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                      <p className="text-xs text-slate-500">Commandes</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {stats.total_orders || user.total_orders || 0}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                      <p className="text-xs text-slate-500">Panier moyen</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {formatCurrency(stats.avg_order_value || user.avg_order_value || 0)}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                      <p className="text-xs text-slate-500">Points fidélité</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {user.loyalty_points || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Adresses */}
                <div>
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Adresses enregistrées</h4>
                  {addresses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {addresses.map((address, index) => (
                        <div key={address.id || index} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-slate-400">location_on</span>
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {address.title || address.label || 'Adresse'}
                              </p>
                              <p className="text-sm text-slate-500">
                                {[
                                  address.address_line || address.address?.address_line || address.address,
                                  address.district && `Quartier: ${address.district}`,
                                  address.landmark,
                                ].filter(Boolean).join(' · ') || 'Non définie'}
                              </p>
                              {address.is_default && (
                                <span className="inline-flex mt-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded">
                                  Par défaut
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">Aucune adresse enregistrée</p>
                  )}
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
                        <th className="px-6 py-4">Restaurant</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4 text-center">Statut</th>
                        <th className="px-6 py-4 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {recentOrders && recentOrders.length > 0 ? (
                        recentOrders.map((order) => {
                          const statusConfig = {
                            delivered: { label: 'Livré', class: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500' },
                            preparing: { label: 'En préparation', class: 'bg-blue-100 text-blue-600' },
                            ready: { label: 'Prêt', class: 'bg-purple-100 text-purple-600' },
                            picked_up: { label: 'Récupérée', class: 'bg-blue-100 text-blue-600' },
                            delivering: { label: 'En livraison', class: 'bg-indigo-100 text-indigo-600' },
                            driver_at_customer: { label: 'Livreur arrivé', class: 'bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-500' },
                            in_progress: { label: 'En cours', class: 'bg-semantic-amber/10 text-semantic-amber' },
                            cancelled: { label: 'Annulé', class: 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-500' },
                            new: { label: 'Nouveau', class: 'bg-blue-100 text-blue-600' },
                          };
                          const status = statusConfig[order.status] || { label: order.status, class: 'bg-slate-100 text-slate-600' };
                          
                          return (
                            <tr 
                              key={order.id} 
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                              onClick={() => navigate(`/orders/${order.id}`)}
                            >
                              <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                                #{order.order_number || order.id.slice(0, 8)}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                {order.restaurant_name || 'Restaurant'}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-500">
                                {formatDateShort(order.created_at || order.placed_at)}
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
                          <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
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
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Avis laissés</h3>
                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-100 dark:border-slate-700"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {review.restaurant_name || 'Restaurant'}
                              </span>
                              {review.order_number && (
                                <span className="text-xs text-slate-500">
                                  Commande #{review.order_number}
                                </span>
                              )}
                              <span className="text-xs text-slate-500">
                                {formatDateShort(review.created_at)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mb-2">
                              {review.restaurant_rating != null && (
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-amber-500 text-sm">star</span>
                                  <span className="text-sm font-bold">{review.restaurant_rating}/5</span>
                                </span>
                              )}
                              {review.delivery_rating != null && (
                                <span className="flex items-center gap-1 text-slate-500">
                                  <span className="material-symbols-outlined text-slate-400 text-sm">delivery_dining</span>
                                  <span className="text-sm">{review.delivery_rating}/5</span>
                                </span>
                              )}
                            </div>
                            {review.comment && (
                              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{review.comment}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">Aucun avis disponible</p>
                )}
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

// Composant pour afficher un champ d'information
// Fonction utilitaire pour formater une valeur (gère les objets)
const formatValue = (val) => {
  if (val === null || val === undefined) return 'N/A';
  if (typeof val === 'object') {
    // Si c'est une adresse
    if (val.address_line || val.street || val.city) {
      return val.address_line || val.street || `${val.district || ''} ${val.city || ''}`.trim() || 'N/A';
    }
    // Autre objet
    return JSON.stringify(val);
  }
  return val;
};

const InfoField = ({ label, value }) => (
  <div>
    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
      {label}
    </label>
    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
      {formatValue(value)}
    </p>
  </div>
);

export default UserDetails;

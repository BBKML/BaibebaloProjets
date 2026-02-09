import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { restaurantsAPI } from '../api/restaurants';
import TableSkeleton from '../components/common/TableSkeleton';
import { formatDateShort, formatCurrency } from '../utils/format';
import { getImageUrl } from '../utils/url';
import toast from 'react-hot-toast';

const RestaurantDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('info');
  const [commissionInput, setCommissionInput] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['restaurant', id],
    queryFn: () => restaurantsAPI.getRestaurantDetails(id),
    retry: 2,
  });

  // Charger le menu uniquement quand l'onglet Menu est actif
  const { data: menuData, isLoading: isLoadingMenu } = useQuery({
    queryKey: ['restaurant-menu', id],
    queryFn: () => restaurantsAPI.getRestaurantMenu(id),
    enabled: activeTab === 'menu',
    retry: 2,
  });

  const suspendMutation = useMutation({
    mutationFn: (reason) => restaurantsAPI.suspendRestaurant(id, reason),
    onSuccess: () => {
      toast.success('Restaurant suspendu');
      queryClient.invalidateQueries(['restaurant', id]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suspension');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: () => restaurantsAPI.reactivateRestaurant(id),
    onSuccess: () => {
      toast.success('Restaurant réactivé');
      queryClient.invalidateQueries(['restaurant', id]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la réactivation');
    },
  });

  const commissionMutation = useMutation({
    mutationFn: (commission_rate) => restaurantsAPI.updateRestaurantCommission(id, commission_rate),
    onSuccess: () => {
      toast.success('Commission appliquée');
      setCommissionInput('');
      queryClient.invalidateQueries(['restaurant', id]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.response?.data?.error?.message || 'Erreur');
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/restaurants')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="h-8 w-64 skeleton"></div>
          </div>
          <TableSkeleton rows={5} columns={2} />
        </div>
      </Layout>
    );
  }

  if (error) {
    const apiMessage = error.response?.data?.error?.message || error.response?.data?.message;
    const is404 = error.response?.status === 404;
    const message = apiMessage || error.message || 'Erreur lors du chargement';
    return (
      <Layout>
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">
            {is404 ? 'Restaurant introuvable' : 'Erreur'}
          </h3>
          <p className="text-red-700 dark:text-red-300">{message}</p>
          {is404 && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
              Vérifiez que le backend tourne et que l’identifiant du restaurant existe en base.
            </p>
          )}
          <button
            onClick={() => navigate('/restaurants')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retour aux restaurants
          </button>
        </div>
      </Layout>
    );
  }

  const restaurant = data?.data?.restaurant || {};
  const stats = data?.data?.stats || {};
  const recentOrders = data?.data?.recent_orders || [];

  const currentCommission = restaurant.commission_rate != null ? Number(restaurant.commission_rate) : 15;
  const commissionInputValue = commissionInput !== '' ? commissionInput : String(currentCommission);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'pending':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'suspended':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'pending': return 'En attente';
      case 'suspended': return 'Suspendu';
      default: return status;
    }
  };

  const getOrderStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'confirmed': return 'Confirmée';
      case 'preparing': return 'En préparation';
      case 'ready': return 'Prête';
      case 'out_for_delivery': return 'En livraison';
      case 'delivered': return 'Livrée';
      case 'cancelled': return 'Annulée';
      default: return status || 'Inconnu';
    }
  };

  // Horaires : structure { monday: { open, close, isOpen }, ... }
  const DAY_LABELS = [
    { key: 'monday', label: 'Lundi' },
    { key: 'tuesday', label: 'Mardi' },
    { key: 'wednesday', label: 'Mercredi' },
    { key: 'thursday', label: 'Jeudi' },
    { key: 'friday', label: 'Vendredi' },
    { key: 'saturday', label: 'Samedi' },
    { key: 'sunday', label: 'Dimanche' },
  ];
  let openingHours = {};
  if (typeof restaurant.opening_hours === 'object' && restaurant.opening_hours !== null) {
    openingHours = restaurant.opening_hours;
  } else if (typeof restaurant.opening_hours === 'string') {
    try {
      openingHours = JSON.parse(restaurant.opening_hours) || {};
    } catch (_) {}
  }
  const hasAnyHours = Object.keys(openingHours).length > 0;

  const operatorLabel = (provider) => {
    if (!provider) return null;
    const p = String(provider).toLowerCase();
    if (p.includes('orange')) return 'Orange Money';
    if (p.includes('mtn')) return 'MTN Money';
    if (p.includes('moov')) return 'Moov Money';
    return provider;
  };
  const commissionDisplay = restaurant.commission_rate != null
    ? `${Number(restaurant.commission_rate).toFixed(2)} % · Propriétaire`
    : '15,00 % · Propriétaire';

  const handleSuspend = () => {
    const reason = globalThis.prompt('Raison de la suspension :');
    if (reason && reason.trim()) {
      suspendMutation.mutate(reason);
    }
  };

  const handleReactivate = () => {
    if (globalThis.confirm('Réactiver ce restaurant ?')) {
      reactivateMutation.mutate();
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/restaurants')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {restaurant.name || 'Restaurant'}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(restaurant.status)}`}>
                  {getStatusLabel(restaurant.status)}
                </span>
                {/* Indicateur Ouvert/Fermé */}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  restaurant.is_open 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${restaurant.is_open ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                  {restaurant.is_open ? 'Ouvert' : 'Fermé'}
                </span>
                {restaurant.category && (
                  <span className="text-sm text-slate-500">{restaurant.category}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            {restaurant.status === 'active' && (
              <button
                onClick={handleSuspend}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-semibold"
              >
                Suspendre
              </button>
            )}
            {restaurant.status === 'suspended' && (
              <button
                onClick={handleReactivate}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-semibold"
              >
                Réactiver
              </button>
            )}
            <button
              onClick={() => navigate(`/restaurants/${id}/statistics`)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold"
            >
              Voir statistiques
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">payments</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Revenus totaux</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {formatCurrency(stats.total_revenue || 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">shopping_bag</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Commandes totales</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {stats.total_orders || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">star</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Note moyenne</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {stats.average_rating ? `${parseFloat(stats.average_rating).toFixed(1)}/5` : 'N/A'}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">restaurant_menu</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Plats au menu</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {stats.menu_items_count || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            {['info', 'documents', 'orders', 'menu'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-bold transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab === 'info' && 'Informations'}
                {tab === 'documents' && 'Documents'}
                {tab === 'orders' && 'Commandes'}
                {tab === 'menu' && 'Menu'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Tab: Informations */}
            {activeTab === 'info' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Images */}
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Images</h3>
                  {restaurant.banner && (
                    <div className="mb-4 rounded-xl overflow-hidden">
                      <img 
                        src={getImageUrl(restaurant.banner)} 
                        alt="Banner"
                        className="w-full h-40 object-cover"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    {restaurant.logo ? (
                      <img 
                        src={getImageUrl(restaurant.logo)} 
                        alt="Logo"
                        className="w-20 h-20 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl text-slate-400">restaurant</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Informations générales */}
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Informations générales</h3>
                  <div className="space-y-4">
                    <InfoRow icon="store" label="Nom" value={restaurant.name} />
                    <InfoRow icon="category" label="Catégorie" value={restaurant.category} />
                    <InfoRow icon="location_on" label="Adresse" value={
                      typeof restaurant.address === 'object' 
                        ? (restaurant.address?.address_line || restaurant.address?.street || `${restaurant.address?.district || ''} ${restaurant.address?.city || ''}`.trim())
                        : restaurant.address
                    } />
                    <InfoRow icon="phone" label="Téléphone" value={restaurant.phone} />
                    <InfoRow icon="email" label="Email" value={restaurant.email} />
                    <InfoRow icon="delivery_dining" label="Rayon de livraison" value={restaurant.delivery_radius ? `${restaurant.delivery_radius} km` : 'Non défini'} />
                    <InfoRow icon="calendar_today" label="Inscrit le" value={restaurant.created_at ? formatDateShort(restaurant.created_at) : 'N/A'} />
                  </div>
                </div>

                {/* Horaires */}
                <div className="md:col-span-2">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400">schedule</span>
                    Horaires
                  </h3>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 text-left">
                          <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Jour</th>
                          <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Ouverture</th>
                          <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Fermeture</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {DAY_LABELS.map(({ key, label }) => {
                          const day = openingHours[key];
                          const isOpen = day && day.isOpen !== false && (day.open || day.close);
                          return (
                            <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                              <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{label}</td>
                              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                                {isOpen ? (day.open || '–') : '–'}
                              </td>
                              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                                {isOpen ? (day.close || '–') : <span className="text-slate-400 italic">Fermé</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {!hasAnyHours && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Horaires non renseignés par le restaurant.</p>
                  )}
                </div>

                {/* Propriétaire / Contact */}
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Propriétaire</h3>
                  <div className="space-y-4">
                    <InfoRow icon="person" label="Nom" value={restaurant.account_holder_name || restaurant.owner_name} />
                    <InfoRow icon="phone" label="Téléphone" value={restaurant.phone || restaurant.owner_phone} />
                    <InfoRow icon="email" label="Email" value={restaurant.email || restaurant.owner_email} />
                  </div>
                </div>

                {/* Paiement */}
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Informations de paiement</h3>
                  <div className="space-y-4">
                    <InfoRow icon="account_balance_wallet" label="Mobile Money" value={restaurant.mobile_money_number} />
                    <InfoRow icon="business" label="Opérateur" value={operatorLabel(restaurant.mobile_money_provider) || restaurant.mobile_money_provider} />
                    {/* Commission : définie par l'admin, affichée en lecture seule côté restaurant */}
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-slate-400 mt-0.5">percent</span>
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 mb-1">Commission (vous l’appliquez, le restaurant la voit en lecture seule)</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={commissionInputValue}
                            onChange={(e) => setCommissionInput(e.target.value === '' ? '' : e.target.value)}
                            className="w-24 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-900 dark:text-white"
                          />
                          <span className="text-sm text-slate-500">%</span>
                          <button
                            type="button"
                            onClick={() => {
                              const val = parseFloat(commissionInputValue);
                              if (!Number.isNaN(val) && val >= 0 && val <= 100) {
                                commissionMutation.mutate(val);
                              } else {
                                toast.error('Saisir un taux entre 0 et 100');
                              }
                            }}
                            disabled={commissionMutation.isPending}
                            className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                          >
                            {commissionMutation.isPending ? 'Application…' : 'Appliquer'}
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Affiché côté restaurant : &quot;{commissionDisplay}&quot; (non modifiable)</p>
                      </div>
                    </div>
                    <InfoRow icon="person" label="Nom titulaire compte" value={restaurant.account_holder_name} />
                    <InfoRow icon="account_balance" label="RIB" value={restaurant.bank_rib} />
                  </div>
                </div>

                {/* Coordonnées GPS */}
                {(restaurant.latitude && restaurant.longitude) && (
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Localisation</h3>
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Latitude: {restaurant.latitude}, Longitude: {restaurant.longitude}
                      </p>
                      <a
                        href={`https://www.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-2 text-primary hover:underline text-sm"
                      >
                        <span className="material-symbols-outlined text-base">open_in_new</span>
                        Voir sur Google Maps
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Documents */}
            {activeTab === 'documents' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DocumentCard 
                  title="RCCM" 
                  subtitle="Registre du Commerce"
                  url={restaurant.documents?.rccm}
                  icon="description"
                />
                <DocumentCard 
                  title="CNI Recto" 
                  subtitle="Carte d'identité (face avant)"
                  url={restaurant.id_card_front || restaurant.documents?.cni || restaurant.documents?.id}
                  icon="badge"
                />
                <DocumentCard 
                  title="CNI Verso" 
                  subtitle="Carte d'identité (face arrière)"
                  url={restaurant.id_card_back}
                  icon="badge"
                />
                <DocumentCard 
                  title="Licence d'exploitation" 
                  subtitle="Autorisation"
                  url={restaurant.documents?.license}
                  icon="verified"
                />
                <DocumentCard 
                  title="Certificat sanitaire" 
                  subtitle="Hygiène"
                  url={restaurant.documents?.health_certificate}
                  icon="health_and_safety"
                />
              </div>
            )}

            {/* Tab: Commandes récentes */}
            {activeTab === 'orders' && (
              <div>
                {recentOrders.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                    <p>Aucune commande récente</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs font-bold text-slate-500 uppercase">
                        <th className="pb-4">N° Commande</th>
                        <th className="pb-4">Client</th>
                        <th className="pb-4">Date</th>
                        <th className="pb-4">Statut</th>
                        <th className="pb-4 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {recentOrders.map((order) => (
                        <tr 
                          key={order.id} 
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                          onClick={() => navigate(`/orders/${order.id}`)}
                        >
                          <td className="py-3 font-mono text-sm">#{order.order_number || order.id.slice(0, 8)}</td>
                          <td className="py-3 text-sm">{order.customer_name || 'Client'}</td>
                          <td className="py-3 text-sm text-slate-500">{formatDateShort(order.created_at)}</td>
                          <td className="py-3">
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${
                              order.status === 'delivered' 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                                : order.status === 'cancelled'
                                ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                                : order.status === 'pending'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                : order.status === 'preparing'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                                : order.status === 'ready'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400'
                                : order.status === 'out_for_delivery'
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400'
                            }`}>
                              {getOrderStatusLabel(order.status)}
                            </span>
                          </td>
                          <td className="py-3 text-right font-semibold">{formatCurrency(order.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tab: Menu */}
            {activeTab === 'menu' && (
              <div>
                {isLoadingMenu ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="mt-4 text-slate-500 dark:text-slate-400">Chargement du menu...</p>
                  </div>
                ) : menuData?.data?.categories && menuData.data.categories.length > 0 ? (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Menu ({menuData.data.total_items} {menuData.data.total_items === 1 ? 'plat' : 'plats'})
                      </h3>
                    </div>
                    {menuData.data.categories.map((category) => (
                      <div key={category.id} className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                          <h4 className="text-base font-bold text-slate-900 dark:text-white">
                            {category.name}
                          </h4>
                          {category.description && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {category.description}
                            </span>
                          )}
                          <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                            {category.items?.length || 0} {category.items?.length === 1 ? 'plat' : 'plats'}
                          </span>
                        </div>
                        {category.items && category.items.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {category.items.map((item) => (
                              <div
                                key={item.id}
                                className={`bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden ${
                                  !item.is_available ? 'opacity-60' : ''
                                }`}
                              >
                                {item.photo || item.image_url ? (
                                  <div className="aspect-video w-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                                    <img
                                      src={getImageUrl(item.photo || item.image_url)}
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="aspect-video w-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-4xl text-slate-400">
                                      restaurant_menu
                                    </span>
                                  </div>
                                )}
                                <div className="p-4">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                                      {item.name}
                                    </h5>
                                    {!item.is_available && (
                                      <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded-full whitespace-nowrap">
                                        Indisponible
                                      </span>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                                      {item.description}
                                    </p>
                                  )}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {item.is_promotion_active ? (
                                        <>
                                          <span className="text-sm font-bold text-primary">
                                            {formatCurrency(item.effective_price)}
                                          </span>
                                          <span className="text-xs text-slate-500 dark:text-slate-400 line-through">
                                            {formatCurrency(item.original_price)}
                                          </span>
                                          {item.savings_percent > 0 && (
                                            <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold rounded">
                                              -{item.savings_percent}%
                                            </span>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                                          {formatCurrency(item.price)}
                                        </span>
                                      )}
                                    </div>
                                    {item.preparation_time && (
                                      <span className="text-xs text-slate-500 dark:text-slate-400">
                                        <span className="material-symbols-outlined text-xs align-middle">schedule</span>
                                        {item.preparation_time} min
                                      </span>
                                    )}
                                  </div>
                                  {item.total_sold !== undefined && item.total_sold > 0 && (
                                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                      {item.total_sold} {item.total_sold === 1 ? 'vente' : 'ventes'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
                            Aucun plat dans cette catégorie
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <span className="material-symbols-outlined text-4xl mb-2">restaurant_menu</span>
                    <p className="text-sm font-medium">Aucun menu disponible</p>
                    <p className="text-xs mt-1">Ce restaurant n'a pas encore de menu configuré</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Composant pour afficher une ligne d'information
// Fonction utilitaire pour formater une valeur (gère les objets)
const formatValue = (val) => {
  if (val === null || val === undefined) return 'Non renseigné';
  if (typeof val === 'object') {
    // Si c'est une adresse
    if (val.address_line || val.street || val.city) {
      return val.address_line || val.street || `${val.district || ''} ${val.city || ''}`.trim() || 'Non renseigné';
    }
    // Si c'est des horaires
    if (val.monday || val.tuesday) {
      return 'Voir horaires';
    }
    // Autre objet
    return JSON.stringify(val);
  }
  return val;
};

const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <span className="material-symbols-outlined text-slate-400 mt-0.5">{icon}</span>
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900 dark:text-white">{formatValue(value)}</p>
    </div>
  </div>
);

// Composant pour afficher un document
const DocumentCard = ({ title, subtitle, url, icon }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const imageUrl = url ? getImageUrl(url) : null;

  return (
    <>
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">{icon}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
          {imageUrl ? (
            <button 
              onClick={() => setIsZoomed(true)}
              className="text-primary hover:text-primary/70"
            >
              <span className="material-symbols-outlined">visibility</span>
            </button>
          ) : (
            <span className="text-xs text-slate-400">Non fourni</span>
          )}
        </div>
        {imageUrl && (
          <div className="mt-3">
            <img 
              src={imageUrl} 
              alt={title} 
              className="w-full max-h-32 object-contain rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              onClick={() => setIsZoomed(true)}
              onError={(e) => e.target.style.display = 'none'}
            />
          </div>
        )}
      </div>

      {/* Modal zoom */}
      {isZoomed && imageUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={imageUrl}
              alt={title}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default RestaurantDetails;

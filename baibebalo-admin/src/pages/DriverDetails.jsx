import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import driversAPI from '../api/drivers';
import TableSkeleton from '../components/common/TableSkeleton';
import { formatDateShort, formatCurrency } from '../utils/format';
import { getImageUrl } from '../utils/url';
import toast from 'react-hot-toast';

const DriverDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('info');

  const { data, isLoading, error } = useQuery({
    queryKey: ['driver', id],
    queryFn: () => driversAPI.getDriverById(id),
    retry: 2,
  });

  const suspendMutation = useMutation({
    mutationFn: (reason) => driversAPI.suspendDriver(id, reason),
    onSuccess: () => {
      toast.success('Livreur suspendu');
      queryClient.invalidateQueries(['driver', id]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suspension');
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => driversAPI.approveDriver(id),
    onSuccess: () => {
      toast.success('Livreur approuvé');
      queryClient.invalidateQueries(['driver', id]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'approbation');
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/drivers')}
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
    return (
      <Layout>
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">Erreur</h3>
          <p className="text-red-700 dark:text-red-300">{error.message || 'Erreur lors du chargement'}</p>
          <button
            onClick={() => navigate('/drivers')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retour aux livreurs
          </button>
        </div>
      </Layout>
    );
  }

  // Plusieurs formes de réponse possibles selon l'API
  const payload = data?.data ?? data;
  const driver = payload?.delivery_person ?? payload?.driver ?? (typeof payload?.id === 'string' && payload?.phone ? payload : null) ?? {};
  const stats = payload?.stats ?? data?.data?.stats ?? {};
  const recentDeliveries = payload?.recent_deliveries ?? data?.data?.recent_deliveries ?? [];

  if (data && !driver?.id && !driver?.phone) {
    return (
      <Layout>
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-400 mb-2">Données introuvables</h3>
          <p className="text-amber-700 dark:text-amber-300">La réponse du serveur ne contient pas les détails du livreur. Vérifiez que l&apos;API renvoie bien <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">data.delivery_person</code>.</p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => queryClient.invalidateQueries(['driver', id])}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              Recharger
            </button>
            <button
              onClick={() => navigate('/drivers')}
              className="px-4 py-2 border border-amber-600 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:bg-amber-900/30"
            >
              Retour aux livreurs
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const hasDriver = driver && (driver.id || driver.phone);

  const fullName = [driver.first_name, driver.last_name].filter(Boolean).join(' ') || 'Livreur';
  const initials = `${driver.first_name?.[0] || ''}${driver.last_name?.[0] || ''}`.toUpperCase() || 'L';
  const profilePicture = (driver.profile_picture || driver.photo) ? getImageUrl(driver.profile_picture || driver.photo) : null;
  const lat = driver.current_latitude != null ? Number(driver.current_latitude) : null;
  const lng = driver.current_longitude != null ? Number(driver.current_longitude) : null;
  const hasPosition = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'pending':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'suspended':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'rejected':
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
      case 'rejected': return 'Rejeté';
      case 'offline': return 'Hors ligne';
      default: return status;
    }
  };

  const getDeliveryStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-100 text-emerald-700';
      case 'busy':
        return 'bg-blue-100 text-blue-700';
      case 'on_break':
        return 'bg-amber-100 text-amber-700';
      case 'offline':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getDeliveryStatusLabel = (status) => {
    switch (status) {
      case 'available': return 'Disponible';
      case 'busy': return 'En course';
      case 'on_break': return 'En pause';
      case 'offline': return 'Hors ligne';
      default: return status || 'Inconnu';
    }
  };

  const getOrderStatusLabel = (status) => {
    switch (status) {
      case 'new': return 'Nouvelle';
      case 'pending': return 'En attente';
      case 'accepted': return 'Acceptée';
      case 'preparing': return 'En préparation';
      case 'ready': return 'Prête';
      case 'picked_up': return 'Récupérée';
      case 'delivering': return 'En livraison';
      case 'driver_at_customer': return 'Livreur arrivé';
      case 'delivered': return 'Livrée';
      case 'cancelled': return 'Annulée';
      default: return status || 'Inconnu';
    }
  };

  const getOrderStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'picked_up':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'delivering':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'driver_at_customer':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'ready':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'preparing':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'pending':
      case 'accepted':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getVehicleIcon = (vehicle) => {
    switch (vehicle?.toLowerCase()) {
      case 'moto': return 'motorcycle';
      case 'bike':
      case 'vélo': return 'pedal_bike';
      case 'foot':
      case 'pied': return 'directions_walk';
      default: return 'local_shipping';
    }
  };

  const handleSuspend = () => {
    const reason = globalThis.prompt('Raison de la suspension :');
    if (reason && reason.trim()) {
      suspendMutation.mutate(reason);
    }
  };

  const handleApprove = () => {
    if (globalThis.confirm('Approuver ce livreur ?')) {
      approveMutation.mutate();
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/drivers')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="flex items-center gap-4">
              {profilePicture ? (
                <img 
                  src={profilePicture} 
                  alt={fullName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl"
                style={{ display: profilePicture ? 'none' : 'flex' }}
              >
                {initials}
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  {fullName}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(driver.status)}`}>
                    {getStatusLabel(driver.status)}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getDeliveryStatusBadge(driver.delivery_status)}`}>
                    {getDeliveryStatusLabel(driver.delivery_status)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            {driver.status === 'pending' && (
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-semibold"
              >
                Approuver
              </button>
            )}
            {driver.status === 'active' && (
              <button
                onClick={handleSuspend}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-semibold"
              >
                Suspendre
              </button>
            )}
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
                <p className="text-xs text-slate-500 dark:text-slate-400">Gains totaux (livreur)</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {formatCurrency(stats.total_earnings || driver.total_earnings || 0)}
                </p>
                {stats.earnings && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    30j: {formatCurrency(stats.earnings.last_30_days || 0)}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">account_balance</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Commission Baibebalo</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {formatCurrency(stats.platform_commission?.all_time || 0)}
                </p>
                {stats.platform_commission && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    30j: {formatCurrency(stats.platform_commission.last_30_days || 0)} ({stats.platform_commission.percentage || 30}%)
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">local_shipping</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Livraisons totales</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {stats.total_deliveries || driver.total_deliveries || 0}
                </p>
                {stats.deliveries_30d !== undefined && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    30j: {stats.deliveries_30d}
                  </p>
                )}
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
                  {(stats.average_rating || driver.average_rating) ? `${parseFloat(stats.average_rating || driver.average_rating).toFixed(1)}/5` : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            {['info', 'documents', 'deliveries', 'location'].map((tab) => (
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
                {tab === 'deliveries' && 'Livraisons'}
                {tab === 'location' && 'Position'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Tab: Informations */}
            {activeTab === 'info' && (
              <div className="space-y-8">
                {/* Section Gains et Commission */}
                {(stats.earnings || stats.platform_commission) && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Gains et Commission</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Gains du livreur */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Gains du livreur (70%)</h4>
                        <div className="space-y-2">
                          {stats.earnings && (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">Aujourd'hui:</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.earnings.today || 0)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">7 derniers jours:</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.earnings.last_7_days || 0)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">30 derniers jours:</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.earnings.last_30_days || 0)}</span>
                              </div>
                              <div className="flex justify-between text-sm border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                                <span className="text-slate-700 dark:text-slate-300 font-semibold">Total:</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.earnings.all_time || 0)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Commission Baibebalo */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Commission Baibebalo (30%)</h4>
                        <div className="space-y-2">
                          {stats.platform_commission && (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">Aujourd'hui:</span>
                                <span className="font-bold text-purple-600 dark:text-purple-400">{formatCurrency(stats.platform_commission.today || 0)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">7 derniers jours:</span>
                                <span className="font-bold text-purple-600 dark:text-purple-400">{formatCurrency(stats.platform_commission.last_7_days || 0)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">30 derniers jours:</span>
                                <span className="font-bold text-purple-600 dark:text-purple-400">{formatCurrency(stats.platform_commission.last_30_days || 0)}</span>
                              </div>
                              <div className="flex justify-between text-sm border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                                <span className="text-slate-700 dark:text-slate-300 font-semibold">Total:</span>
                                <span className="font-bold text-purple-600 dark:text-purple-400">{formatCurrency(stats.platform_commission.all_time || 0)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {stats.delivery_fees && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Frais de livraison totaux (30j): {formatCurrency(stats.delivery_fees.last_30_days || 0)}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Répartition: {formatCurrency(stats.earnings?.last_30_days || 0)} pour le livreur (70%) + {formatCurrency(stats.platform_commission?.last_30_days || 0)} pour Baibebalo (30%)
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Informations personnelles */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Informations personnelles</h3>
                    {/* Photo du livreur */}
                    <div className="flex items-start gap-3 mb-6">
                      <span className="material-symbols-outlined text-slate-400 mt-0.5">account_circle</span>
                      <div>
                        <p className="text-xs text-slate-500 mb-2">Photo</p>
                        {profilePicture ? (
                          <img
                            src={profilePicture}
                            alt={fullName}
                            className="w-24 h-24 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-sm"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="w-24 h-24 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400"
                          style={{ display: profilePicture ? 'none' : 'flex' }}
                        >
                          <span className="material-symbols-outlined text-4xl">person</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <InfoRow icon="person" label="Prénom" value={driver.first_name} />
                      <InfoRow icon="person" label="Nom" value={driver.last_name} />
                      <InfoRow icon="phone" label="Téléphone" value={driver.phone} />
                      <InfoRow icon="email" label="Email" value={driver.email} />
                      <InfoRow icon="location_on" label="Adresse / Quartier" value={
                        typeof driver.address === 'object'
                          ? (driver.address?.address_line || driver.address?.street || `${driver.address?.district || ''} ${driver.address?.city || ''}`.trim())
                          : driver.address
                      } />
                      <InfoRow icon="calendar_today" label="Inscrit le" value={driver.created_at ? formatDateShort(driver.created_at) : 'N/A'} />
                      <InfoRow icon="badge" label="Statut compte" value={driver.status} />
                      <InfoRow icon="schedule" label="Disponibilité" value={driver.delivery_status} />
                    </div>
                  </div>

                  {/* Véhicule */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Véhicule</h3>
                    <div className="space-y-4">
                      <InfoRow icon="directions_car" label="Type" value={driver.vehicle_type} />
                      <InfoRow icon="pin" label="Plaque" value={driver.vehicle_plate} />
                      <InfoRow icon="palette" label="Couleur" value={driver.vehicle_color} />
                      <InfoRow icon="two_wheeler" label="Marque" value={driver.vehicle_brand} />
                    </div>
                  </div>

                  {/* Paiement */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Informations de paiement</h3>
                    <div className="space-y-4">
                      <InfoRow icon="account_balance_wallet" label="Mobile Money" value={driver.mobile_money_number} />
                      <InfoRow icon="business" label="Opérateur" value={driver.mobile_money_provider} />
                    </div>
                  </div>

                  {/* Statuts */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Statuts</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-slate-400 mt-0.5">verified_user</span>
                        <div>
                          <p className="text-xs text-slate-500">Statut du compte</p>
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${getStatusBadge(driver.status)}`}>
                            {getStatusLabel(driver.status)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-slate-400 mt-0.5">schedule</span>
                        <div>
                          <p className="text-xs text-slate-500">Disponibilité</p>
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${getDeliveryStatusBadge(driver.delivery_status)}`}>
                            {getDeliveryStatusLabel(driver.delivery_status)}
                          </span>
                        </div>
                      </div>
                      {driver.suspension_reason && (
                        <div className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-red-400 mt-0.5">warning</span>
                          <div>
                            <p className="text-xs text-slate-500">Raison de suspension</p>
                            <p className="text-sm text-red-600 dark:text-red-400">{driver.suspension_reason}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Documents - champs BDD : photo, id_card, driver_license, vehicle_registration, insurance_document */}
            {activeTab === 'documents' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DocumentCard
                  title="Photo de profil"
                  url={driver.profile_picture || driver.photo}
                  icon="account_circle"
                />
                <DocumentCard
                  title="CNI"
                  url={driver.id_card_front || driver.id_card}
                  icon="badge"
                />
                <DocumentCard
                  title="CNI Verso"
                  url={driver.id_card_back}
                  icon="badge"
                />
                <DocumentCard
                  title="Permis"
                  url={driver.driver_license_front || driver.driver_license}
                  icon="card_membership"
                />
                <DocumentCard
                  title="Permis Verso"
                  url={driver.driver_license_back}
                  icon="card_membership"
                />
                <DocumentCard
                  title="Carte grise"
                  url={driver.vehicle_registration_front || driver.vehicle_registration}
                  icon="directions_car"
                />
                <DocumentCard
                  title="Carte grise Verso"
                  url={driver.vehicle_registration_back}
                  icon="directions_car"
                />
                <DocumentCard
                  title="Assurance"
                  url={driver.insurance_document}
                  icon="security"
                />
              </div>
            )}

            {/* Tab: Livraisons récentes */}
            {activeTab === 'deliveries' && (
              <div>
                {recentDeliveries.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2">local_shipping</span>
                    <p>Aucune livraison récente</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs font-bold text-slate-500 uppercase">
                        <th className="pb-4">N° Commande</th>
                        <th className="pb-4">Restaurant</th>
                        <th className="pb-4">Date</th>
                        <th className="pb-4">Statut</th>
                        <th className="pb-4 text-right">Gain</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {recentDeliveries.map((delivery) => (
                        <tr 
                          key={delivery.id} 
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                          onClick={() => navigate(`/orders/${delivery.order_id || delivery.id}`)}
                        >
                          <td className="py-3 font-mono text-sm">#{delivery.order_number || delivery.id?.slice(0, 8)}</td>
                          <td className="py-3 text-sm">{delivery.restaurant_name || 'Restaurant'}</td>
                          <td className="py-3 text-sm text-slate-500">{formatDateShort(delivery.delivered_at || delivery.created_at)}</td>
                          <td className="py-3">
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${getOrderStatusBadge(delivery.status)}`}>
                              {getOrderStatusLabel(delivery.status)}
                            </span>
                          </td>
                          <td className="py-3 text-right font-semibold text-emerald-600">{formatCurrency(delivery.delivery_fee || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tab: Position */}
            {activeTab === 'location' && (
              <div>
                {hasPosition ? (
                  <div className="space-y-4">
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <strong>Dernière position connue</strong><br />
                        Latitude: {lat}<br />
                        Longitude: {lng}
                      </p>
                      {driver.last_location_update && (
                        <p className="text-xs text-slate-500 mt-2">
                          Mise à jour : {formatDateShort(driver.last_location_update)}
                        </p>
                      )}
                      <a
                        href={`https://www.google.com/maps?q=${lat},${lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                      >
                        <span className="material-symbols-outlined text-base">open_in_new</span>
                        Voir sur Google Maps
                      </a>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                      <iframe
                        title="Position du livreur"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`}
                        width="100%"
                        height="300"
                        style={{ border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2">location_off</span>
                    <p className="font-medium">Position non disponible</p>
                    <p className="text-sm mt-2">Le livreur n&apos;a pas partagé sa position récemment (GPS ou app fermée).</p>
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
const DocumentCard = ({ title, url, icon }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const imageUrl = url ? getImageUrl(url) : null;

  return (
    <>
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <div className="flex items-center gap-3 mb-3">
          <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">{icon}</span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</span>
        </div>
        {imageUrl ? (
          <div 
            className="relative cursor-pointer group"
            onClick={() => setIsZoomed(true)}
          >
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-600"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="hidden w-full h-32 bg-slate-100 dark:bg-slate-800 rounded-lg items-center justify-center">
              <span className="material-symbols-outlined text-slate-400">broken_image</span>
            </div>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-2xl">zoom_in</span>
            </div>
            <div className="absolute top-2 right-2 px-2 py-1 bg-emerald-500 text-white text-xs font-bold rounded">
              ✓ Uploadé
            </div>
          </div>
        ) : (
          <div className="w-full h-32 bg-slate-100 dark:bg-slate-800 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600">
            <span className="material-symbols-outlined text-slate-400 text-3xl mb-1">cloud_upload</span>
            <span className="text-xs text-slate-400">Non fourni</span>
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
            <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/50 text-white rounded-lg text-sm">
              {title}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DriverDetails;

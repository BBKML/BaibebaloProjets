import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { formatCurrency } from '../utils/format';
import toast from 'react-hot-toast';
import { commissionAPI } from '../api/commission';
import { restaurantsAPI } from '../api/restaurants';
import TableSkeleton from '../components/common/TableSkeleton';

const CommissionSettings = () => {
  const queryClient = useQueryClient();
  
  // Récupérer les paramètres de commission depuis l'API
  const { data: commissionData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['commission-settings'],
    queryFn: () => commissionAPI.getCommissionSettings(),
    retry: 2,
  });

  // Récupérer la liste des restaurants
  const { data: restaurantsData, isLoading: isLoadingRestaurants } = useQuery({
    queryKey: ['restaurants', { status: '' }],
    queryFn: () => restaurantsAPI.getRestaurants({ status: '', page: 1, limit: 100 }),
    retry: 2,
  });

  const settings = commissionData?.data?.settings || {};
  const defaultRate = settings.restaurant_commission_rate?.value || settings.default_commission_rate?.value || 15;
  const [localDefaultRate, setLocalDefaultRate] = useState(defaultRate);

  // Mettre à jour le taux local quand les données arrivent
  useEffect(() => {
    if (defaultRate) {
      setLocalDefaultRate(defaultRate);
    }
  }, [defaultRate]);

  // Mutation pour mettre à jour les paramètres de commission
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings) => commissionAPI.updateCommissionSettings(newSettings),
    onSuccess: () => {
      toast.success('Paramètres de commission mis à jour');
      queryClient.invalidateQueries(['commission-settings']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la mise à jour');
    },
  });

  // Mutation pour mettre à jour la commission d'un restaurant
  const updateRestaurantCommissionMutation = useMutation({
    mutationFn: ({ id, rate }) => restaurantsAPI.updateRestaurantCommission(id, rate),
    onSuccess: () => {
      toast.success('Commission du restaurant mise à jour');
      queryClient.invalidateQueries(['restaurants']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Erreur lors de la mise à jour');
    },
  });

  const handleApplyDefault = () => {
    updateSettingsMutation.mutate({
      restaurant_commission_rate: localDefaultRate,
      default_commission_rate: localDefaultRate,
    });
  };

  const handleEdit = (restaurantId, currentRate) => {
    const newRate = prompt(`Nouveau taux de commission pour ce restaurant (%)`, currentRate);
    if (newRate !== null) {
      const rate = parseFloat(newRate);
      if (!isNaN(rate) && rate >= 0 && rate <= 100) {
        updateRestaurantCommissionMutation.mutate({ id: restaurantId, rate });
      } else {
        toast.error('Le taux doit être entre 0 et 100');
      }
    }
  };

  const restaurants = restaurantsData?.data?.restaurants || [];
  const avgRate = restaurants.length > 0 
    ? restaurants.reduce((sum, r) => sum + (parseFloat(r.commission_rate) || defaultRate), 0) / restaurants.length 
    : defaultRate;

  if (isLoadingSettings || isLoadingRestaurants) {
    return (
      <Layout>
        <div className="space-y-8">
          <TableSkeleton rows={5} columns={5} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">
              Configuration des Commissions
            </h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl">
              Ajustez les taux pour chaque partenaire ou appliquez une règle globale. Les changements impactent immédiatement la facturation.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 rounded-lg h-11 px-6 bg-slate-100 dark:bg-slate-800 text-primary dark:text-white text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-transparent active:scale-95">
              <span className="material-symbols-outlined text-[20px]">history</span>
              <span>Journal d'audit</span>
            </button>
            <button
              onClick={handleApplyDefault}
              disabled={updateSettingsMutation.isPending}
              className="flex items-center gap-2 rounded-lg h-11 px-6 bg-primary text-white text-sm font-bold shadow-md hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span>{updateSettingsMutation.isPending ? 'Application...' : `Appliquer le taux par défaut (${localDefaultRate}%)`}</span>
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Taux Moyen</p>
              <span className="material-symbols-outlined text-primary/40">analytics</span>
            </div>
            <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{avgRate.toFixed(1)}%</p>
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              <span>+0.2% ce mois</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Restaurants</p>
              <span className="material-symbols-outlined text-primary/40">storefront</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{restaurants.length}</p>
            <div className="text-slate-500 dark:text-slate-400 text-xs">{restaurants.filter(r => r.status === 'pending').length} en attente d'activation</div>
          </div>
          <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Revenus Comm. (MTD)</p>
              <span className="material-symbols-outlined text-primary/40">payments</span>
            </div>
            <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{formatCurrency(12450)}</p>
            <div className="text-primary font-bold text-xs uppercase tracking-wider">Objectif: 15k</div>
          </div>
          <div className="flex flex-col gap-2 rounded-xl bg-primary text-white p-6 shadow-lg">
            <div className="flex justify-between items-start">
              <p className="text-white/80 text-sm font-medium">Taux par défaut</p>
              <span className="material-symbols-outlined text-white/50">settings_suggest</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tabular-nums">{localDefaultRate}%</p>
              <button
                onClick={() => {
                  const newRate = prompt('Nouveau taux par défaut (%)', localDefaultRate);
                  if (newRate !== null) {
                    const rate = parseFloat(newRate);
                    if (!isNaN(rate) && rate >= 0 && rate <= 100) {
                      setLocalDefaultRate(rate);
                    } else {
                      toast.error('Le taux doit être entre 0 et 100');
                    }
                  }
                }}
                className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors uppercase font-bold"
              >
                Modifier
              </button>
            </div>
            <p className="text-white/70 text-xs mt-1">Appliqué à {restaurants.filter(r => r.commission_rate === null || parseFloat(r.commission_rate) === defaultRate).length} restaurants</p>
          </div>
        </div>

        {/* Main Management Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white px-2">Liste des Partenaires</h3>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">filter_list</span>
                <input
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border-none rounded-lg text-sm focus:ring-1 focus:ring-primary"
                  placeholder="Filtrer par statut..."
                  type="text"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Restaurant</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Statut</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Commission</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Dernier Changement</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {restaurants.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                      Aucun restaurant trouvé
                    </td>
                  </tr>
                ) : (
                  restaurants.map((restaurant) => {
                    const initials = (restaurant.name || 'R')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .substring(0, 2);
                    const statusColor =
                      restaurant.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : restaurant.status === 'pending'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
                    
                    const currentRate = restaurant.commission_rate !== null && restaurant.commission_rate !== undefined
                      ? parseFloat(restaurant.commission_rate)
                      : defaultRate;
                    
                    const isCustomRate = restaurant.commission_rate !== null && restaurant.commission_rate !== undefined;
                    const typeColor = isCustomRate 
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400';

                    return (
                      <tr
                        key={restaurant.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {initials}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900 dark:text-white">{restaurant.name || 'Sans nom'}</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">ID: {restaurant.id?.substring(0, 8)}...</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${statusColor}`}>
                            {restaurant.status === 'active' ? 'Actif' : restaurant.status === 'pending' ? 'En attente' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold tabular-nums text-primary dark:text-blue-400">
                              {currentRate}%
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${typeColor}`}>
                              {isCustomRate ? 'Personnalisé' : 'Par défaut'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-sm text-slate-500 dark:text-slate-400">
                          {restaurant.updated_at ? new Date(restaurant.updated_at).toLocaleDateString('fr-FR') : 'N/A'} <br />
                          <span className="text-[10px]">par Admin</span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button
                            onClick={() => handleEdit(restaurant.id, currentRate)}
                            disabled={updateRestaurantCommissionMutation.isPending}
                            className="inline-flex items-center gap-1 text-primary hover:text-primary/70 font-bold text-sm transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-primary/20 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                            <span>Modifier</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Affichage de {restaurants.length} restaurant{restaurants.length > 1 ? 's' : ''}</p>
            <div className="flex gap-2">
              <button className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 disabled:opacity-50" disabled>
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <button className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600">
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CommissionSettings;

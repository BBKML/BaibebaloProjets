import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import { exportToCSV } from '../utils/export';
import KPICardSkeleton from '../components/common/KPICardSkeleton';
import ChartSkeleton from '../components/common/ChartSkeleton';
import { analyticsAPI } from '../api/analytics';
import { dashboardAPI } from '../api/dashboard';

const DeliveryPerformance = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('realtime');
  const period = timeRange === 'realtime' ? '7d' : timeRange === 'weekly' ? '30d' : '90d';

  // Récupérer les données analytics des livraisons
  const { data: deliveriesData, isLoading: isLoadingDeliveries } = useQuery({
    queryKey: ['analytics', 'deliveries', period],
    queryFn: () => analyticsAPI.getDeliveriesReport({ period }),
  });

  // Récupérer les données du dashboard
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardAPI.getDashboard(),
  });

  // Préparer les données pour les graphiques
  const deliveryVolumeData = deliveriesData?.data?.daily_deliveries?.slice(0, 7).map((day, index) => ({
    name: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][index] || `J${index + 1}`,
    value: parseInt(day.deliveries_count || 0),
  })) || [];

  // Préparer les données des top livreurs
  const topDriversData = deliveriesData?.data?.top_delivery_persons?.slice(0, 5).map((dp) => ({
    name: dp.name || 'Livreur',
    value: parseInt(dp.deliveries_count || 0),
    rating: parseFloat(dp.average_rating || 0),
  })) || [];

  // Calculer les KPIs depuis les données réelles
  const stats = deliveriesData?.data?.statistics || {};
  const globalStats = dashboardData?.data?.global || {};
  
  const activeDrivers = parseInt(stats.active_delivery_persons || globalStats.active_delivery_persons || 0);
  const successfulDeliveries = parseInt(stats.completed_deliveries || 0);
  const avgDeliveryTime = parseFloat(stats.avg_delivery_time_minutes || 0);
  
  // Calculer les changements (mockés pour l'instant)
  const driversChange = 12; // TODO: Calculer depuis les données
  const deliveriesChange = -3; // TODO: Calculer depuis les données

  // Fonction d'export
  const handleExport = () => {
    try {
      const exportData = [
        {
          'Période': period,
          'Livreurs Actifs': activeDrivers,
          'Livraisons Réussies': successfulDeliveries,
          'Temps Moyen Livraison': `${avgDeliveryTime} min`,
        },
        ...deliveryVolumeData.map(day => ({
          'Jour': day.name,
          'Livraisons': day.value,
        })),
        ...topDriversData.map(driver => ({
          'Livreur': driver.name,
          'Livraisons': driver.value,
          'Note Moyenne': driver.rating.toFixed(1),
        })),
      ];

      exportToCSV(exportData, `performance-livreurs-${period}-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Export CSV réussi !');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Retour"
            >
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">arrow_back</span>
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Dashboard Performance Livreurs
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Suivi et classement analytique des livreurs en temps réel.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2 border border-slate-200 dark:border-slate-700 transition-all">
              <span className="material-symbols-outlined text-lg">filter_alt</span>
              Filtres
            </button>
            <button 
              onClick={handleExport}
              disabled={isLoadingDeliveries || isLoadingDashboard}
              className="bg-primary hover:bg-primary/80 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              Exporter CSV
            </button>
          </div>
        </div>

        {/* Time Range Tabs */}
        <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setTimeRange('realtime')}
            className={`text-xs font-semibold pb-3 px-2 transition-colors ${
              timeRange === 'realtime'
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-500 dark:text-slate-400 hover:text-primary'
            }`}
          >
            Temps Réel
          </button>
          <button
            onClick={() => setTimeRange('weekly')}
            className={`text-xs font-semibold pb-3 px-2 transition-colors ${
              timeRange === 'weekly'
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-500 dark:text-slate-400 hover:text-primary'
            }`}
          >
            Hebdomadaire
          </button>
          <button
            onClick={() => setTimeRange('monthly')}
            className={`text-xs font-semibold pb-3 px-2 transition-colors ${
              timeRange === 'monthly'
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-500 dark:text-slate-400 hover:text-primary'
            }`}
          >
            Mensuel
          </button>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Top Metrics Card 1 - Active Drivers */}
          <div className="col-span-12 lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Livreurs Actifs</p>
              <div className="flex items-baseline gap-2 mt-2">
                <h4 className="text-slate-900 dark:text-white text-4xl font-bold tracking-tight">
                  {isLoadingDeliveries ? (
                    <span className="text-slate-400">...</span>
                  ) : (
                    activeDrivers
                  )}
                </h4>
                <span className="text-emerald-500 text-xs font-bold flex items-center">
                  <span className="material-symbols-outlined text-sm">trending_up</span>
                  {driversChange > 0 ? '+' : ''}{driversChange}%
                </span>
              </div>
            </div>
            <div className="mt-6 h-12 w-full opacity-30">
              <svg className="w-full h-full text-emerald-500 stroke-current fill-none" viewBox="0 0 100 30">
                <path d="M0 25 Q 10 20, 20 22 T 40 15 T 60 18 T 80 5 T 100 10" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </div>
          </div>

          {/* Top Metrics Card 2 - Successful Deliveries */}
          <div className="col-span-12 lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Livraisons Réussies/Jour</p>
              <div className="flex items-baseline gap-2 mt-2">
                <h4 className="text-slate-900 dark:text-white text-4xl font-bold tracking-tight">
                  {isLoadingDeliveries ? (
                    <span className="text-slate-400">...</span>
                  ) : (
                    successfulDeliveries
                  )}
                </h4>
                <span className={`text-xs font-bold flex items-center ${deliveriesChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  <span className="material-symbols-outlined text-sm">
                    {deliveriesChange >= 0 ? 'trending_up' : 'trending_down'}
                  </span>
                  {deliveriesChange > 0 ? '+' : ''}{deliveriesChange}%
                </span>
              </div>
            </div>
            <div className="mt-6 h-12 w-full opacity-30">
              <svg className="w-full h-full text-rose-500 stroke-current fill-none" viewBox="0 0 100 30">
                <path d="M0 5 Q 10 10, 20 8 T 40 15 T 60 12 T 80 25 T 100 22" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </div>
          </div>

          {/* Line Chart: Delivery Volume Trends */}
          <div className="col-span-12 lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="flex justify-between items-start mb-6">
              <h5 className="text-slate-900 dark:text-white font-bold">Évolution du Volume de Livraison</h5>
              <button className="text-slate-400 hover:text-primary cursor-pointer">
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>
            <div className="h-40 w-full relative min-h-[160px]">
              {isLoadingDeliveries ? (
                <ChartSkeleton />
              ) : deliveryVolumeData.length > 0 ? (
                <LineChart data={deliveryVolumeData} dataKey="value" nameKey="name" color="#198cb3" />
              ) : (
                <p className="text-slate-500 text-sm text-center py-8">Aucune donnée disponible</p>
              )}
            </div>
          </div>
        </div>

        {/* Top Drivers Ranking */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Classement des Livreurs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[11px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4 w-12">#</th>
                  <th className="px-6 py-4">Livreur</th>
                  <th className="px-6 py-4 text-center">Livraisons</th>
                  <th className="px-6 py-4 text-center">Note</th>
                  <th className="px-6 py-4 text-right">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoadingDeliveries ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-slate-500">
                      Chargement...
                    </td>
                  </tr>
                ) : topDriversData.length > 0 ? (
                  topDriversData.map((driver, index) => {
                  const badgeClass = index === 0 
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : index === 1
                    ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    : index === 2
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
                  
                  return (
                    <tr key={`driver-${index}-${driver.name}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${badgeClass}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                            {driver.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{driver.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-bold text-slate-900 dark:text-white">
                        {driver.value}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{driver.rating}</span>
                          <span className="material-symbols-outlined text-yellow-500 text-sm">star</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-primary h-full rounded-full"
                              style={{ width: `${(driver.value / 125) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-500">
                            {topDriversData.length > 0 && topDriversData[0]?.value > 0
                              ? Math.round((driver.value / topDriversData[0].value) * 100)
                              : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-slate-500">
                      Aucune donnée disponible
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Additional Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Average Delivery Time */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Temps Moyen de Livraison</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">Moyenne globale</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {isLoadingDeliveries ? '...' : `${Math.round(avgDeliveryTime)} min`}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '70%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">Meilleur temps</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">18 min</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '45%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Taux de Réussite</h3>
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="12"
                    className="text-slate-100 dark:text-slate-800"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="12"
                    strokeDasharray="352"
                    strokeDashoffset="35"
                    className="text-emerald-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">90%</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Réussite</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DeliveryPerformance;

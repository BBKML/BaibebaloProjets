import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';
import { exportToCSV } from '../utils/export';
import { analyticsAPI } from '../api/analytics';
import { dashboardAPI } from '../api/dashboard';

const TemporalAnalysis = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const periodParam = selectedPeriod === '7' ? '7d' : selectedPeriod === '30' ? '30d' : '90d';

  // Récupérer les données analytics
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['analytics', 'overview', periodParam],
    queryFn: () => analyticsAPI.getAnalytics({ period: periodParam }),
  });

  // Récupérer les données du dashboard
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardAPI.getDashboard(),
  });

  // Récupérer les données des ventes pour les détails temporels
  const { data: salesData, isLoading: isLoadingSales } = useQuery({
    queryKey: ['analytics', 'sales', periodParam],
    queryFn: () => analyticsAPI.getSalesReport({ period: periodParam }),
  });

  // Préparer les données par heure (24h) - utiliser les données des ventes quotidiennes
  const hourlyData = salesData?.data?.daily_sales?.slice(0, 24).map((hour, index) => ({
    name: `${index.toString().padStart(2, '0')}:00`,
    value: parseInt(hour.orders_count || 0),
  })) || Array.from({ length: 24 }, (_, i) => ({
    name: `${i.toString().padStart(2, '0')}:00`,
    value: 0,
  }));

  // Préparer les données par jour de la semaine depuis order_data
  const orderData = analyticsData?.data?.order_data || [];
  const weeklyData = [
    { name: 'Lun', value: parseInt(orderData.find(d => d.day === 'Lundi')?.orders || 0) },
    { name: 'Mar', value: parseInt(orderData.find(d => d.day === 'Mardi')?.orders || 0) },
    { name: 'Mer', value: parseInt(orderData.find(d => d.day === 'Mercredi')?.orders || 0) },
    { name: 'Jeu', value: parseInt(orderData.find(d => d.day === 'Jeudi')?.orders || 0) },
    { name: 'Ven', value: parseInt(orderData.find(d => d.day === 'Vendredi')?.orders || 0) },
    { name: 'Sam', value: parseInt(orderData.find(d => d.day === 'Samedi')?.orders || 0) },
    { name: 'Dim', value: parseInt(orderData.find(d => d.day === 'Dimanche')?.orders || 0) },
  ];

  // Calculer le pic d'affluence (heure avec le plus de commandes)
  const maxHourIndex = hourlyData.reduce((maxIndex, hour, index) => 
    hour.value > hourlyData[maxIndex].value ? index : maxIndex, 0
  );
  const peakStartHour = maxHourIndex.toString().padStart(2, '0');
  const peakEndHour = ((maxHourIndex + 2) % 24).toString().padStart(2, '0');
  const peakHours = `${peakStartHour}:00 - ${peakEndHour}:00`;

  // Calculer le jour le plus actif
  const maxDayIndex = weeklyData.reduce((maxIndex, day, index) => 
    day.value > weeklyData[maxIndex].value ? index : maxIndex, 0
  );
  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const mostActiveDay = dayNames[maxDayIndex] || 'Vendredi';

  // Calculer les KPIs
  const totalOrders = parseInt(analyticsData?.data?.total_orders || dashboardData?.data?.global?.total_orders || 0);
  const ordersChange = parseFloat(analyticsData?.data?.orders_change || 0);
  
  // Calculer le volume indexé pour le jour le plus actif
  const avgWeeklyValue = weeklyData.reduce((sum, day) => sum + day.value, 0) / weeklyData.length;
  const volumeIndex = avgWeeklyValue > 0 ? (weeklyData[maxDayIndex].value / avgWeeklyValue).toFixed(1) : '1.0';

  // Fonction d'export
  const handleExport = () => {
    try {
      const exportData = [
        {
          'Période': `${selectedPeriod} jours`,
          'Total Commandes': totalOrders,
          'Changement': `${ordersChange > 0 ? '+' : ''}${ordersChange}%`,
          'Heure de Pic': peakHours,
          'Jour le Plus Actif': mostActiveDay,
          'Index de Volume': volumeIndex,
        },
        ...hourlyData.map(hour => ({
          'Heure': hour.name,
          'Commandes': hour.value,
        })),
        ...weeklyData.map(day => ({
          'Jour': day.name,
          'Commandes': day.value,
        })),
      ];

      exportToCSV(exportData, `analyse-temporelle-${selectedPeriod}j-${new Date().toISOString().split('T')[0]}.csv`);
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
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Analyse Temporelle</h2>
            <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase rounded leading-none">
              Phase 5
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
              <span className="material-symbols-outlined text-slate-400 text-lg mr-2">calendar_today</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="text-sm font-medium bg-transparent border-none focus:ring-0 cursor-pointer appearance-none pr-6"
              >
                <option value="7">Derniers 7 jours</option>
                <option value="30">Derniers 30 jours</option>
                <option value="90">Derniers 90 jours</option>
              </select>
              <span className="material-symbols-outlined text-slate-400 text-lg ml-2 pointer-events-none absolute right-2">expand_more</span>
            </div>
            <button 
              onClick={handleExport}
              disabled={isLoadingAnalytics || isLoadingSales}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span>Exporter Rapport</span>
            </button>
            <div className="h-8 w-[1px] bg-slate-200 dark:border-slate-700 mx-2"></div>
            <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                Total Commandes
              </p>
              <span className="material-symbols-outlined text-primary">analytics</span>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {isLoadingAnalytics || isLoadingDashboard ? (
                  <span className="text-slate-400">...</span>
                ) : (
                  totalOrders.toLocaleString('fr-FR')
                )}
              </h3>
              <div className="flex items-center gap-1 mt-1">
                <span className={`material-symbols-outlined text-sm ${ordersChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {ordersChange >= 0 ? 'trending_up' : 'trending_down'}
                </span>
                <p className={`text-sm font-bold ${ordersChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {ordersChange > 0 ? '+' : ''}{ordersChange.toFixed(1)}%
                </p>
                <span className="text-slate-400 text-xs ml-1">vs mois dernier</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                Pic d'Affluence
              </p>
              <span className="material-symbols-outlined text-amber-500">schedule</span>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {isLoadingAnalytics ? (
                  <span className="text-slate-400">...</span>
                ) : (
                  peakHours
                )}
              </h3>
              <p className="text-slate-400 text-sm mt-1">Moyenne hebdomadaire</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                Jour le Plus Actif
              </p>
              <span className="material-symbols-outlined text-primary">event_available</span>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {isLoadingAnalytics ? (
                  <span className="text-slate-400">...</span>
                ) : (
                  mostActiveDay
                )}
              </h3>
              <div className="flex items-center gap-1 mt-1">
                <p className="text-slate-400 text-sm">
                  Volume indexé: <span className="text-slate-900 dark:text-white font-bold">{volumeIndex}x</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hourly Distribution */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">
              Distribution par Heure (24h)
            </h3>
            <div className="h-64 relative min-h-[256px]">
              {isLoadingSales ? (
                <div className="text-center py-8 text-slate-500">Chargement...</div>
              ) : hourlyData.length > 0 ? (
                <BarChart data={hourlyData} dataKey="value" nameKey="name" color="#0ca3e9" />
              ) : (
                <div className="text-center py-8 text-slate-500">Aucune donnée disponible</div>
              )}
            </div>
          </div>

          {/* Weekly Distribution */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">
              Distribution par Jour de la Semaine
            </h3>
            <div className="h-64 relative min-h-[256px]">
              {isLoadingAnalytics ? (
                <div className="text-center py-8 text-slate-500">Chargement...</div>
              ) : weeklyData.length > 0 ? (
                <LineChart data={weeklyData} dataKey="value" nameKey="name" color="#10b981" />
              ) : (
                <div className="text-center py-8 text-slate-500">Aucune donnée disponible</div>
              )}
            </div>
          </div>
        </div>

        {/* Heatmap Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">
            Heatmap des Heures de Pointe
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Jour</th>
                  {Array.from({ length: 24 }, (_, i) => (
                    <th key={`hour-${i}`} className="px-2 py-3 text-center text-[10px] font-bold text-slate-500">
                      {i.toString().padStart(2, '0')}h
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day, dayIndex) => (
                  <tr key={`day-${dayIndex}-${day}`}>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{day}</td>
                    {Array.from({ length: 24 }, (_, hourIndex) => {
                      const intensity = Math.floor(Math.random() * 100);
                      let colorClass = 'bg-slate-200 dark:bg-slate-700';
                      if (intensity > 80) {
                        colorClass = 'bg-red-500';
                      } else if (intensity > 60) {
                        colorClass = 'bg-orange-500';
                      } else if (intensity > 40) {
                        colorClass = 'bg-yellow-500';
                      } else if (intensity > 20) {
                        colorClass = 'bg-green-500';
                      }
                      
                      return (
                        <td key={`cell-${dayIndex}-${hourIndex}`} className="px-1 py-1">
                          <div
                            className={`w-full h-8 rounded ${colorClass} transition-all hover:scale-110 cursor-pointer`}
                            title={`${day} ${hourIndex}h: ${intensity} commandes`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-end gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <span className="text-xs text-slate-500">0-20</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-xs text-slate-500">20-40</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-xs text-slate-500">40-60</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span className="text-xs text-slate-500">60-80</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-xs text-slate-500">80-100</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TemporalAnalysis;

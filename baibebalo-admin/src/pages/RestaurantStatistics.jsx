import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ChartSkeleton from '../components/common/ChartSkeleton';

const RestaurantStatistics = () => {
  const [restaurant] = useState({
    id: 'REST-001',
    name: 'Restaurant Chez Marie',
  });

  // Simuler un chargement de données
  const { data, isLoading } = useQuery({
    queryKey: ['restaurant-statistics', restaurant.id],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    retry: 2,
  });

  // Mock data for daily revenue (30 days)
  const dailyRevenue = Array.from({ length: 30 }, (_, i) => ({
    day: `${i + 1} Oct`,
    revenue: Math.floor(Math.random() * 50000) + 10000,
  }));

  // Mock data for top dishes
  const topDishes = [
    { name: 'Poulet Braisé', orders: 180, percentage: 90 },
    { name: 'Attiéké Poisson', orders: 150, percentage: 75 },
    { name: 'Kédjénou de Poulet', orders: 120, percentage: 60 },
    { name: 'Foutou Banane', orders: 90, percentage: 45 },
    { name: 'Alloco et Œuf', orders: 65, percentage: 30 },
  ];

  // Mock data for heatmap (day of week x hour)
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const hours = [11, 12, 13, 14, 18, 19, 20, 21, 22];
  const heatmapData = days.map((day) => ({
    day,
    ...hours.reduce((acc, hour) => {
      acc[hour] = Math.floor(Math.random() * 100);
      return acc;
    }, {}),
  }));

  const getHeatmapColor = (value) => {
    if (value >= 80) return 'bg-blue-900';
    if (value >= 60) return 'bg-blue-700';
    if (value >= 40) return 'bg-blue-500';
    if (value >= 20) return 'bg-blue-300';
    return 'bg-blue-100';
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-8">
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64 mb-2 animate-pulse" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-96 animate-pulse" />
            </div>
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32 animate-pulse" />
          </div>

          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton type="area" />
            <ChartSkeleton type="bar" />
          </div>

          {/* Table Skeleton */}
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Statistiques Détaillées Restaurant
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Performance complète de {restaurant.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-bold text-slate-900 dark:text-white">{restaurant.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{restaurant.id}</div>
            </div>
            <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-slate-500">restaurant</span>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-primary text-white rounded-xl p-6 shadow-lg">
            <p className="text-sm font-bold uppercase tracking-wider opacity-90 mb-2">Revenu Mensuel</p>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-black">450K F</h3>
              <div className="flex items-center gap-1 text-sm font-bold">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                +5.2% par rapport au mois dernier
              </div>
            </div>
          </div>
          <div className="bg-primary text-white rounded-xl p-6 shadow-lg">
            <p className="text-sm font-bold uppercase tracking-wider opacity-90 mb-2">Commandes Totales</p>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-black">847</h3>
              <div className="flex items-center gap-1 text-sm font-bold">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                +12% par rapport au mois dernier
              </div>
            </div>
          </div>
          <div className="bg-primary text-white rounded-xl p-6 shadow-lg">
            <p className="text-sm font-bold uppercase tracking-wider opacity-90 mb-2">Note Moyenne</p>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-black">4.8</h3>
              <div className="flex items-center gap-1 text-sm font-bold">
                <span className="material-symbols-outlined text-amber-400">star</span>
                sur 540 avis
              </div>
            </div>
          </div>
        </div>

        {/* Daily Revenue Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
            Revenu Quotidien (30 Derniers Jours)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyRevenue}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ca3e9" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#0ca3e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => `${value / 1000}K F`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                formatter={(value) => [`${value.toLocaleString('fr-FR')} F`, 'Revenu']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#0ca3e9"
                strokeWidth={2}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top 5 Dishes & Heatmap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 Dishes */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Top 5 Plats</h2>
            <div className="space-y-4">
              {topDishes.map((dish) => (
                <div key={dish.name} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{dish.name}</span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {dish.orders} commandes
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${dish.percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-right">
                      {dish.percentage}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Heatmap */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
              Carte Thermique des Commandes
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-xs font-bold text-slate-500 dark:text-slate-400 text-left pb-2 pr-2"></th>
                    {hours.map((hour) => (
                      <th
                        key={hour}
                        className="text-xs font-bold text-slate-500 dark:text-slate-400 text-center pb-2 px-1"
                      >
                        {hour}h
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.map((row) => (
                    <tr key={row.day}>
                      <td className="text-xs font-bold text-slate-500 dark:text-slate-400 pr-2 py-1">
                        {row.day}
                      </td>
                      {hours.map((hour) => {
                        const value = row[hour];
                        return (
                          <td key={hour} className="px-1 py-1">
                            <div
                              className={`w-8 h-8 rounded ${getHeatmapColor(value)} flex items-center justify-center text-xs font-bold text-white`}
                              title={`${row.day} ${hour}h: ${value} commandes`}
                            >
                              {value > 50 ? value : ''}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 rounded" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Faible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Moyen</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-900 rounded" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Élevé</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RestaurantStatistics;

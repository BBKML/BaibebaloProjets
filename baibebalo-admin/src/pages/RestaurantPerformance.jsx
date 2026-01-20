import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { formatCurrency } from '../utils/format';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';
import KPICardSkeleton from '../components/common/KPICardSkeleton';
import ChartSkeleton from '../components/common/ChartSkeleton';
import { analyticsAPI } from '../api/analytics';
import { dashboardAPI } from '../api/dashboard';

const RestaurantPerformance = () => {
  const [period, setPeriod] = useState('30d');
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  // Fonction pour formater la période en français
  const getPeriodLabel = () => {
    const formatMonthYear = (date) => {
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${month} ${year}`;
    };

    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      return `${formatMonthYear(startDate)} - ${formatMonthYear(endDate)}`;
    }
    
    // Calculer la période basée sur le sélecteur
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }
    
    return `${formatMonthYear(startDate)} - ${formatMonthYear(now)}`;
  };

  // Récupérer les données analytics des restaurants
  const { data: restaurantsData, isLoading: isLoadingRestaurants } = useQuery({
    queryKey: ['analytics', 'restaurants', period],
    queryFn: () => analyticsAPI.getRestaurantsReport({ period }),
  });

  // Récupérer les données du dashboard pour les stats globales
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardAPI.getDashboard(),
  });

  // Préparer les données pour les graphiques
  const topRestaurantsData = restaurantsData?.data?.top_restaurants?.slice(0, 10).map((r, index) => ({
    name: r.name || `Restaurant ${index + 1}`,
    value: parseFloat(r.revenue_in_period || r.total_revenue || 0),
    location: r.category || 'Korhogo',
  })) || [];

  // Préparer les données de tendance des revenus (inscriptions quotidiennes)
  const revenueTrendData = restaurantsData?.data?.daily_registrations?.slice(0, 7).map((day, index) => ({
    name: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][index] || `J${index + 1}`,
    value: parseInt(day.registrations_count || 0),
  })) || [];

  // Calculer les KPIs depuis les données réelles
  const stats = restaurantsData?.data?.statistics || {};
  const globalStats = dashboardData?.data?.global || {};
  
  const avgRating = parseFloat(stats.avg_rating || globalStats.avg_restaurant_rating || 0);
  const totalRevenue = parseFloat(globalStats.total_revenue || 0);
  const activeRestaurants = parseInt(stats.active_restaurants || globalStats.active_restaurants || 0);
  
  // Calculer le temps de préparation moyen (données mockées pour l'instant, à remplacer par données réelles)
  const avgPrepTime = 18.5; // TODO: Récupérer depuis l'API
  
  // Calculer les changements (mockés pour l'instant)
  const ratingChange = 2.1; // TODO: Calculer depuis les données
  const revenueChange = 12.4; // TODO: Calculer depuis les données

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
              Restaurant Performance Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
              Analyse comparative des revenus, de la vitesse et des métriques de satisfaction à travers le réseau.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
              <input
                className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none w-64 transition-all"
                placeholder="Search metrics..."
                type="text"
              />
            </div>
            <button className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 size-2 bg-orange-500 rounded-full border-2 border-white dark:border-slate-800"></span>
            </button>
            <button 
              onClick={() => {
                // Ouvrir un sélecteur de date (à implémenter avec un composant date picker)
                const start = prompt('Date de début (YYYY-MM-DD):');
                const end = prompt('Date de fin (YYYY-MM-DD):');
                if (start && end) {
                  setDateRange({ start, end });
                  setPeriod('custom');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
            >
              <span className="material-symbols-outlined text-sm">calendar_today</span>
              <span>{getPeriodLabel()}</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Avg Restaurant Rating */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/50 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 dark:bg-primary/10 rounded-lg text-primary">
                <span className="material-symbols-outlined">star</span>
              </div>
              <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                {ratingChange > 0 ? '+' : ''}{ratingChange.toFixed(1)}%
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Avg Restaurant Rating</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">
              {isLoadingRestaurants ? (
                <span className="text-slate-400">...</span>
              ) : (
                <>
                  {avgRating.toFixed(1)}<span className="text-lg text-slate-400 font-normal">/5.0</span>
                </>
              )}
            </p>
          </div>

          {/* Global Prep Time */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/50 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-orange-50 dark:bg-orange-500/10 rounded-lg text-orange-500">
                <span className="material-symbols-outlined">timer</span>
              </div>
              <span className="text-orange-500 text-xs font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">trending_down</span>
                -0.5%
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Global Prep Time</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">
              {avgPrepTime.toFixed(1)}<span className="text-lg text-slate-400 font-normal"> min</span>
            </p>
          </div>

          {/* Total Revenue */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/50 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-green-50 dark:bg-emerald-500/10 rounded-lg text-emerald-500">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                {revenueChange > 0 ? '+' : ''}{revenueChange.toFixed(1)}%
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Total Revenue</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">
              {isLoadingDashboard ? (
                <span className="text-slate-400">...</span>
              ) : (
                formatCurrency(totalRevenue)
              )}
            </p>
          </div>

          {/* Active Restaurants */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/50 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-slate-500 dark:text-slate-400">
                <span className="material-symbols-outlined">storefront</span>
              </div>
              <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
                +3
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Active Restaurants</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">
              {isLoadingRestaurants ? (
                <span className="text-slate-400">...</span>
              ) : (
                activeRestaurants
              )}
            </p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top 10 Restaurants by Revenue */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Top 10 Restaurants by Revenue</h3>
              <button className="text-slate-400 hover:text-primary transition-colors">
                <span className="material-symbols-outlined">more_horiz</span>
              </button>
            </div>
            <div className="space-y-4">
              {isLoadingRestaurants ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={`skeleton-${i}`} className="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : topRestaurantsData.length > 0 ? (
                topRestaurantsData.map((restaurant, index) => {
                const maxValue = Math.max(...topRestaurantsData.map(r => r.value));
                const percentage = (restaurant.value / maxValue) * 100;
                
                return (
                  <div key={`restaurant-${index}-${restaurant.name}`} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <span>{restaurant.name} ({restaurant.location})</span>
                      <span>{formatCurrency(restaurant.value)}</span>
                    </div>
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">Aucune donnée disponible</p>
              )}
            </div>
          </div>

          {/* Revenue Trends */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Revenue Trends</h3>
              <button className="text-slate-400 hover:text-primary transition-colors">
                <span className="material-symbols-outlined">more_horiz</span>
              </button>
            </div>
            {isLoadingRestaurants ? (
              <ChartSkeleton />
            ) : revenueTrendData.length > 0 ? (
              <LineChart data={revenueTrendData} dataKey="value" nameKey="name" color="#0ca3e9" />
            ) : (
              <p className="text-slate-500 text-sm text-center py-8">Aucune donnée disponible</p>
            )}
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Satisfaction Score */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Satisfaction Score</h3>
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
                    strokeDashoffset="70"
                    className="text-emerald-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">80%</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Satisfait</span>
                </div>
              </div>
            </div>
          </div>

          {/* Prep Time Distribution */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Prep Time Distribution</h3>
            <BarChart data={revenueTrendData} dataKey="value" nameKey="name" color="#f59e0b" />
          </div>

          {/* Order Volume */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Order Volume</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Aujourd'hui</span>
                  <span className="font-bold text-slate-900 dark:text-white">1,245</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '85%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Cette semaine</span>
                  <span className="font-bold text-slate-900 dark:text-white">8,450</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '92%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Ce mois</span>
                  <span className="font-bold text-slate-900 dark:text-white">32,100</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-brand-orange h-full rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RestaurantPerformance;

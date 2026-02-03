import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { restaurantsAPI } from '../api/restaurants';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ChartSkeleton from '../components/common/ChartSkeleton';

const RestaurantStatistics = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('30d');

  const { data, isLoading, error } = useQuery({
    queryKey: ['restaurant-statistics', id, period],
    queryFn: () => restaurantsAPI.getRestaurantStatistics(id, { period }),
    enabled: !!id,
  });

  const stats = data?.data || {};
  const restaurant = stats.restaurant || {};
  const kpis = stats.kpis || {};
  const dailyRevenue = stats.daily_revenue || [];
  const topDishes = stats.top_dishes || [];
  const heatmap = stats.heatmap || [];
  const reviews = stats.reviews || {};

  const hours = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

  const getHeatmapColor = (value) => {
    if (value >= 20) return 'bg-primary';
    if (value >= 15) return 'bg-primary/80';
    if (value >= 10) return 'bg-primary/60';
    if (value >= 5) return 'bg-primary/40';
    if (value >= 1) return 'bg-primary/20';
    return 'bg-slate-100 dark:bg-slate-700';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR').format(value) + ' F';
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64 mb-2 animate-pulse" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-96 animate-pulse" />
            </div>
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton type="area" />
            <ChartSkeleton type="bar" />
          </div>
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Erreur de chargement</h2>
          <p className="text-slate-500 mb-4">{error.response?.data?.error?.message || 'Impossible de charger les statistiques'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Retour
          </button>
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
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-500 hover:text-primary mb-2"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Retour
            </button>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Statistiques Détaillées
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Performance de {restaurant.name || 'Restaurant'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="90d">90 derniers jours</option>
              <option value="1y">Cette année</option>
            </select>
            <div className="text-right">
              <div className="text-sm font-bold text-slate-900 dark:text-white">{restaurant.name}</div>
              <div className={`text-xs font-bold ${restaurant.status === 'active' ? 'text-emerald-500' : 'text-amber-500'}`}>
                {restaurant.status === 'active' ? 'Actif' : restaurant.status === 'suspended' ? 'Suspendu' : 'En attente'}
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-primary text-white rounded-xl p-6 shadow-lg">
            <p className="text-sm font-bold uppercase tracking-wider opacity-90 mb-2">Revenu Total</p>
            <div className="flex flex-col">
              <h3 className="text-2xl font-black">{formatCurrency(kpis.total_revenue || 0)}</h3>
              {kpis.revenue_trend !== 0 && (
                <div className={`flex items-center gap-1 text-sm font-bold mt-1 ${kpis.revenue_trend > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  <span className="material-symbols-outlined text-sm">
                    {kpis.revenue_trend > 0 ? 'trending_up' : 'trending_down'}
                  </span>
                  {kpis.revenue_trend > 0 ? '+' : ''}{kpis.revenue_trend}%
                </div>
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Commandes Livrées</p>
            <div className="flex flex-col">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{kpis.delivered_orders || 0}</h3>
              {kpis.orders_trend !== 0 && (
                <div className={`flex items-center gap-1 text-sm font-bold mt-1 ${kpis.orders_trend > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  <span className="material-symbols-outlined text-sm">
                    {kpis.orders_trend > 0 ? 'trending_up' : 'trending_down'}
                  </span>
                  {kpis.orders_trend > 0 ? '+' : ''}{kpis.orders_trend}%
                </div>
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Panier Moyen</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(Math.round(kpis.avg_order_value || 0))}
            </h3>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Note Moyenne</p>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {parseFloat(reviews.avg_rating || restaurant.average_rating || 0).toFixed(1)}
              </h3>
              <span className="material-symbols-outlined text-amber-400">star</span>
              <span className="text-sm text-slate-500">({reviews.total || 0} avis)</span>
            </div>
          </div>
        </div>

        {/* Stats supplémentaires */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 text-center">
            <div className="text-2xl font-black text-emerald-600">{kpis.delivered_orders || 0}</div>
            <div className="text-xs font-bold text-emerald-600 uppercase">Livrées</div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 text-center">
            <div className="text-2xl font-black text-amber-600">{kpis.pending_orders || 0}</div>
            <div className="text-xs font-bold text-amber-600 uppercase">En cours</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
            <div className="text-2xl font-black text-red-600">{kpis.cancelled_orders || 0}</div>
            <div className="text-xs font-bold text-red-600 uppercase">Annulées</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
            <div className="text-2xl font-black text-blue-600">{Math.round(kpis.avg_prep_time_minutes || 0)} min</div>
            <div className="text-xs font-bold text-blue-600 uppercase">Temps prépa.</div>
          </div>
        </div>

        {/* Daily Revenue Chart */}
        {dailyRevenue.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
              Revenu Quotidien (30 Derniers Jours)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyRevenue.slice().reverse()}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ca3e9" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#0ca3e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="day" 
                  stroke="#64748b" 
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => `${value / 1000}K`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value) => [formatCurrency(value), 'Revenu']}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
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
        )}

        {/* Top 5 Dishes & Heatmap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 Dishes */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Top 5 Plats</h2>
            {topDishes.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <span className="material-symbols-outlined text-4xl mb-2">restaurant_menu</span>
                <p>Aucune donnée disponible</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topDishes.map((dish, index) => (
                  <div key={dish.name} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{dish.name}</span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {dish.orders} cmd • {formatCurrency(dish.revenue)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${dish.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Heatmap */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
              Carte Thermique des Commandes
            </h2>
            {heatmap.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <span className="material-symbols-outlined text-4xl mb-2">grid_view</span>
                <p>Aucune donnée disponible</p>
              </div>
            ) : (
              <>
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
                      {heatmap.map((row) => (
                        <tr key={row.day}>
                          <td className="text-xs font-bold text-slate-500 dark:text-slate-400 pr-2 py-1">
                            {row.day}
                          </td>
                          {hours.map((hour) => {
                            const value = row[hour] || 0;
                            return (
                              <td key={hour} className="px-1 py-1">
                                <div
                                  className={`w-6 h-6 rounded ${getHeatmapColor(value)} flex items-center justify-center text-xs font-bold ${value > 5 ? 'text-white' : 'text-slate-400'}`}
                                  title={`${row.day} ${hour}h: ${value} commandes`}
                                >
                                  {value > 0 ? value : ''}
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
                    <div className="w-4 h-4 bg-slate-100 dark:bg-slate-700 rounded" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">0</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-primary/40 rounded" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">5+</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-primary rounded" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">20+</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Reviews Distribution */}
        {reviews.total > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
              Distribution des Avis
            </h2>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.distribution?.[star] || 0;
                const percentage = reviews.total > 0 ? (count / reviews.total * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{star}</span>
                      <span className="material-symbols-outlined text-amber-400 text-sm">star</span>
                    </div>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-3">
                      <div
                        className="bg-amber-400 h-3 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-500 w-16 text-right">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RestaurantStatistics;

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { dashboardAPI } from '../api/dashboard';
import KPICard from '../components/dashboard/KPICard';
import { formatCurrency } from '../utils/format';
import { exportToCSV } from '../utils/export';
import RevenueChart from '../components/charts/RevenueChart';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';
import PaymentMethodChart from '../components/charts/PaymentMethodChart';
import KPICardSkeleton from '../components/common/KPICardSkeleton';
import ChartSkeleton from '../components/common/ChartSkeleton';

const Analytics = () => {
  const [period, setPeriod] = useState('30');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', period],
    queryFn: () => dashboardAPI.getAnalytics({ period }),
    retry: 2,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Analytics Principal <span className="text-slate-400 font-normal ml-1">(Global)</span>
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <div className="px-3 py-1 text-xs font-bold rounded-md bg-white dark:bg-slate-600 shadow-sm">30 Days</div>
              </div>
              <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-xl">notifications</span>
              </button>
            </div>
          </div>

          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {new Array(4).fill(null).map((_, i) => (
              <KPICardSkeleton key={`analytics-skeleton-${i}`} />
            ))}
          </div>

          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton type="line" />
            <ChartSkeleton type="bar" />
          </div>
        </div>
      </Layout>
    );
  }

  const analytics = data?.data || {};

  // Utiliser les données réelles de l'API, ou des tableaux vides si pas de données
  const revenueData = analytics.revenue_data || [];
  const orderData = analytics.order_data || [];
  const paymentData = analytics.payment_methods || [];

  // Fonction d'export
  const handleExport = () => {
    try {
      const exportData = [
        {
          'Total GMV': formatCurrency(analytics.total_gmv || 0),
          'Total Commandes': analytics.total_orders || 0,
          'Utilisateurs Actifs': analytics.active_users || 0,
          'Taux de Conversion': `${analytics.conversion_rate || 0}%`,
          'Période': `${period} jours`,
        },
      ];

      // Ajouter les données de revenus si disponibles
      if (revenueData.length > 0) {
        revenueData.forEach((item, index) => {
          exportData.push({
            'Date': item.date || item.name || `Jour ${index + 1}`,
            'Revenus': formatCurrency(item.value || item.revenue || 0),
          });
        });
      }

      exportToCSV(exportData, `analytics-${period}j-${new Date().toISOString().split('T')[0]}.csv`);
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
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Analytics Principal <span className="text-slate-400 font-normal ml-1">(Global)</span>
            </h1>
            <div className="relative group hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input
                className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-9 pr-4 py-1.5 text-sm w-64 focus:ring-2 focus:ring-primary transition-all"
                placeholder="Search analytics..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setPeriod('30')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                  period === '30'
                    ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-500'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setPeriod('90')}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  period === '90'
                    ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-500'
                }`}
              >
                90 Days
              </button>
              <button
                onClick={() => setPeriod('ytd')}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  period === 'ytd'
                    ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-500'
                }`}
              >
                YTD
              </button>
            </div>
            <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-xl">notifications</span>
            </button>
            <button 
              onClick={handleExport}
              disabled={isLoading}
              className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Export Data
            </button>
          </div>
        </div>

        {/* KPI Bento Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined">payments</span>
              </div>
              {analytics.orders_change !== undefined && analytics.orders_change !== 0 && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  analytics.orders_change > 0
                    ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                    : 'text-red-500 bg-red-50 dark:bg-red-500/10'
                }`}>
                  {analytics.orders_change > 0 ? '+' : ''}{analytics.orders_change.toFixed(1)}%
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">
                Total GMV
              </p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                {formatCurrency(analytics.total_gmv || 0)}
              </h3>
            </div>
            <div className="mt-4 h-8 flex items-end gap-1">
              {[0.5, 0.67, 0.33, 0.75, 0.5, 1].map((height, i) => (
                <div
                  key={`gmv-bar-${i}-${height}`}
                  className="flex-1 bg-primary/20 rounded-t-sm"
                  style={{ height: `${height * 100}%` }}
                />
              ))}
            </div>
          </div>

          <KPICard
            title="Commandes Totales"
            value={analytics.total_orders || 0}
            change={analytics.orders_change || 0}
            iconName="shopping_bag"
          />

          <KPICard
            title="Utilisateurs Actifs"
            value={analytics.active_users || 0}
            change={analytics.users_change || 0}
            iconName="group"
          />

          <KPICard
            title="Taux de Conversion"
            value={`${analytics.conversion_rate || 0}%`}
            change={analytics.conversion_change || 0}
            iconName="trending_up"
          />
        </section>

        {/* Quick Links to Analytics Pages */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/analytics/restaurants"
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-primary">restaurant</span>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">Performance Restaurants</h4>
                <p className="text-xs text-slate-500">Analyses détaillées</p>
              </div>
            </div>
          </Link>
          <Link
            to="/analytics/delivery"
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-primary">local_shipping</span>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">Performance Livreurs</h4>
                <p className="text-xs text-slate-500">Suivi en temps réel</p>
              </div>
            </div>
          </Link>
          <Link
            to="/analytics/funnel"
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-primary">bar_chart</span>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">Funnel Conversion</h4>
                <p className="text-xs text-slate-500">Taux de conversion</p>
              </div>
            </div>
          </Link>
          <Link
            to="/analytics/temporal"
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-primary">schedule</span>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">Analyse Temporelle</h4>
                <p className="text-xs text-slate-500">Heures de pointe</p>
              </div>
            </div>
          </Link>
          <Link
            to="/analytics/heatmap"
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-primary">map</span>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">Heatmap Géographique</h4>
                <p className="text-xs text-slate-500">Densité par zone</p>
              </div>
            </div>
          </Link>
        </section>

        {/* Charts Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">Revenus Mensuels</h3>
            </div>
            <div className="p-6 w-full" style={{ minWidth: 0 }}>
              {revenueData.length > 0 ? (
                <RevenueChart data={revenueData} />
              ) : (
                <div className="flex items-center justify-center h-64 text-slate-500">
                  <p>Aucune donnée de revenus disponible</p>
                </div>
              )}
            </div>
          </div>

          {/* Orders Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">Commandes par Jour</h3>
            </div>
            <div className="p-6 w-full" style={{ minWidth: 0 }}>
              {orderData.length > 0 ? (
                <BarChart data={orderData} dataKey="value" nameKey="name" color="#0ca3e9" />
              ) : (
                <div className="flex items-center justify-center h-64 text-slate-500">
                  <p>Aucune donnée de commandes disponible</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Payment Methods & Trends */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Methods */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">Méthodes de Paiement</h3>
            </div>
            <div className="p-6 w-full" style={{ minWidth: 0 }}>
              {paymentData.length > 0 ? (
                <PaymentMethodChart data={paymentData} />
              ) : (
                <div className="flex items-center justify-center h-64 text-slate-500">
                  <p>Aucune donnée de méthodes de paiement disponible</p>
                </div>
              )}
            </div>
          </div>

          {/* Trends */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">Tendances</h3>
            </div>
            <div className="p-6 w-full" style={{ minWidth: 0 }}>
              {orderData.length > 0 ? (
                <LineChart data={orderData} dataKey="value" nameKey="name" color="#10b981" />
              ) : (
                <div className="flex items-center justify-center h-64 text-slate-500">
                  <p>Aucune donnée de tendances disponible</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Analytics;

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { formatCurrency } from '../utils/format';
import { financesAPI } from '../api/finances';
import { exportToCSV } from '../utils/export';
import BarChart from '../components/charts/BarChart';
import PieChart from '../components/charts/PaymentMethodChart';
import KPICard from '../components/dashboard/KPICard';
import KPICardSkeleton from '../components/common/KPICardSkeleton';
import ChartSkeleton from '../components/common/ChartSkeleton';
import TableSkeleton from '../components/common/TableSkeleton';

const FinancialDashboard = () => {
  const [period, setPeriod] = useState('month');

  // Charger les données financières depuis l'API (period = week | month | year)
  const { data: financialData, isLoading: isLoadingFinancial } = useQuery({
    queryKey: ['financial-overview', period],
    queryFn: () => financesAPI.getFinancialOverview({ period }),
    retry: 2,
  });

  // Charger les dépenses
  const { data: expensesData, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ['expenses', period],
    queryFn: () => financesAPI.getExpenses(period),
    retry: 2,
  });

  const isLoading = isLoadingFinancial || isLoadingExpenses;
  
  const overview = financialData?.data?.overview || {};
  const expenses = expensesData?.data || {};
  const netProfit = financialData?.data?.net_profit || 0;
  const profitMargin = financialData?.data?.profit_margin || 0;
  const platformRevenue = financialData?.data?.platform_revenue || {};
  const commissionFromRestaurants = platformRevenue.commission_from_restaurants || 0;
  const commissionFromDelivery = platformRevenue.commission_from_delivery || 0;
  const totalPlatformRevenue = platformRevenue.total || 0;
  const deliveryPayouts = financialData?.data?.delivery_payouts || 0; // Ce que les livreurs ont gagné (70%)
  const restaurantPayouts = financialData?.data?.restaurant_payouts || 0;

  // Fonction d'export
  const handleExport = () => {
    try {
      const exportData = [
        {
          'CA Total': formatCurrency(overview.total_revenue || 0),
          'Commissions': formatCurrency(overview.commission_collected || 0),
          'Dépenses': formatCurrency(expenses.total || 0),
          'Bénéfice Net': formatCurrency(netProfit),
          'Marge Bénéficiaire': `${profitMargin}%`,
          'Période': period,
        },
      ];

      exportToCSV(exportData, `dashboard-financier-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Export CSV réussi !');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  // Données pour les graphiques
  const revenueData = [
    { name: 'Jan', value: 340000 },
    { name: 'Fév', value: 210000 },
    { name: 'Mar', value: 520000 },
    { name: 'Avr', value: 480000 },
    { name: 'Mai', value: 610000 },
    { name: 'Juin', value: 550000 },
  ];

  const paymentMethodsData = [
    { name: 'Mobile Money', value: 2450000, color: '#0ca3e9' },
    { name: 'Cash', value: 3120000, color: '#10b981' },
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-8">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-64 animate-pulse" />
            <div className="flex items-center gap-4">
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-64 animate-pulse" />
              <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-24 animate-pulse" />
            </div>
          </div>

          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {new Array(3).fill(null).map((_, i) => (
              <KPICardSkeleton key={`kpi-skeleton-${i}`} />
            ))}
          </div>

          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChartSkeleton type="bar" />
            </div>
            <div>
              <ChartSkeleton type="pie" />
            </div>
          </div>

          {/* Table Skeleton */}
          <TableSkeleton rows={4} columns={5} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Finances</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Vue d'ensemble financière de la plateforme</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Sélecteur de période */}
            <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-full">
              {[
                { value: 'week', label: 'Semaine' },
                { value: 'month', label: 'Mois' },
                { value: 'year', label: 'Année' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setPeriod(value)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    period === value
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={handleExport}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-full text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Exporter
            </button>
          </div>
        </div>

        {/* KPI Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KPICard
            title="CA Total"
            value={formatCurrency(overview.total_revenue || 0)}
            iconName="payments"
            color="primary"
            subtitle={`${overview.total_orders || 0} commandes`}
          />
          <KPICard
            title="Revenus Plateforme"
            value={formatCurrency(totalPlatformRevenue)}
            iconName="account_balance_wallet"
            color="blue"
            subtitle={`Restaurants: ${formatCurrency(commissionFromRestaurants)}`}
          />
          <KPICard
            title="Dépenses"
            value={formatCurrency(expenses.total || 0)}
            iconName="trending_down"
            color="red"
            subtitle="Livreurs + restaurants"
          />
          <KPICard
            title="Bénéfice Net"
            value={formatCurrency(netProfit)}
            iconName={netProfit >= 0 ? 'trending_up' : 'trending_down'}
            color={netProfit >= 0 ? 'green' : 'red'}
            subtitle={profitMargin > 0 ? `Marge: ${profitMargin}%` : undefined}
          />
        </div>

        {/* Détails des commissions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: 'store', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10',
              label: 'Commission Restaurants', value: formatCurrency(commissionFromRestaurants),
              sub: 'Sur les commandes food',
            },
            {
              icon: 'delivery_dining', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10',
              label: 'Commission Livraisons', value: formatCurrency(commissionFromDelivery),
              sub: `Livreurs ont reçu ${formatCurrency(deliveryPayouts)}`,
            },
            {
              icon: 'account_balance', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10',
              label: 'Total Commissions', value: formatCurrency(totalPlatformRevenue),
              sub: 'Revenus nets Baibebalo',
            },
          ].map(({ icon, color, bg, label, value, sub }) => (
            <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl flex items-center gap-4">
              <div className={`p-3 rounded-xl ${bg} flex-shrink-0`}>
                <span className={`material-symbols-outlined ${color}`} style={{ fontSize: '22px' }}>{icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">{label}</p>
                <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">{value}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar Chart: Revenue Evolution */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">Évolution du CA</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Revenus cumulés sur les 6 derniers mois</p>
              </div>
            </div>
            <div className="h-64 relative min-h-[256px]">
              <BarChart data={revenueData} dataKey="value" nameKey="name" color="#0ca3e9" />
            </div>
          </div>

          {/* Pie Chart: Payment Methods */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="mb-6">
              <h4 className="font-bold text-slate-900 dark:text-white">Répartition Paiements</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Par méthode de paiement</p>
            </div>
            <div className="h-64 relative min-h-[256px]">
              <PieChart data={paymentMethodsData} />
            </div>
            <div className="mt-4 space-y-2">
              {paymentMethodsData.map((method) => (
                <div key={method.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: method.color }}
                    />
                    <span className="text-slate-600 dark:text-slate-400">{method.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(method.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white">Transactions Récentes</h3>
            <span className="text-xs text-slate-400">Données indicatives</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Montant</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Méthode</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {[
                  { date: '23 Jan 2024', type: 'Commande', amount: 12500, method: 'Mobile Money', status: 'completed' },
                  { date: '23 Jan 2024', type: 'Commission', amount: 1875, method: 'Cash', status: 'pending' },
                  { date: '22 Jan 2024', type: 'Commande', amount: 8900, method: 'Mobile Money', status: 'completed' },
                  { date: '22 Jan 2024', type: 'Remboursement', amount: 4500, method: 'Mobile Money', status: 'completed' },
                ].map((transaction, index) => (
                  <tr key={`transaction-${index}-${transaction.date}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">{transaction.date}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{transaction.type}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{transaction.method}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          transaction.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}
                      >
                        {transaction.status === 'completed' ? 'Complété' : 'En attente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default FinancialDashboard;

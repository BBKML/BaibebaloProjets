import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { formatCurrency } from '../utils/format';
import { financesAPI } from '../api/finances';
import { exportToCSV } from '../utils/export';
import BarChart from '../components/charts/BarChart';
import PieChart from '../components/charts/PaymentMethodChart';
import KPICardSkeleton from '../components/common/KPICardSkeleton';
import ChartSkeleton from '../components/common/ChartSkeleton';
import TableSkeleton from '../components/common/TableSkeleton';

const FinancialDashboard = () => {
  const [period, setPeriod] = useState('month');

  // Charger les données financières depuis l'API
  const { data: financialData, isLoading: isLoadingFinancial } = useQuery({
    queryKey: ['financial-overview', period],
    queryFn: () => financesAPI.getFinancialOverview(),
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Dashboard Financier Global</h2>
          <div className="flex items-center gap-4">
            <div className="max-w-md w-full">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                  search
                </span>
                <input
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                  placeholder="Rechercher une transaction..."
                  type="text"
                />
              </div>
            </div>
            <button className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>
            </button>
            <button 
              onClick={handleExport}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Exporter</span>
            </button>
          </div>
        </div>

        {/* KPI Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <span className="material-symbols-outlined">payments</span>
              </div>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">CA Total</p>
              <h3 className="text-2xl font-bold mt-1 tracking-tight text-slate-900 dark:text-white">
                {formatCurrency(overview.total_revenue || 0)}
              </h3>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <span className="material-symbols-outlined">account_balance_wallet</span>
              </div>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Commissions</p>
              <h3 className="text-2xl font-bold mt-1 tracking-tight text-slate-900 dark:text-white">
                {formatCurrency(overview.commission_collected || 0)}
              </h3>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                <span className="material-symbols-outlined">trending_down</span>
              </div>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Dépenses</p>
              <h3 className="text-2xl font-bold mt-1 tracking-tight text-slate-900 dark:text-white">
                {formatCurrency(expenses.total || 0)}
              </h3>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-lg ${netProfit >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                <span className="material-symbols-outlined">{netProfit >= 0 ? 'trending_up' : 'trending_down'}</span>
              </div>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Bénéfice Net</p>
              <h3 className={`text-2xl font-bold mt-1 tracking-tight ${netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(netProfit)}
              </h3>
              {profitMargin > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Marge: {profitMargin}%
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar Chart: Revenue Evolution */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">Évolution du CA</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Revenus cumulés sur les 6 derniers mois</p>
              </div>
              <select
                className="bg-slate-50 dark:bg-slate-800 border-none text-xs rounded-lg px-3 py-1.5 focus:ring-0"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="6months">Derniers 6 mois</option>
                <option value="12months">Dernières 12 mois</option>
              </select>
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
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Transactions Récentes</h3>
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

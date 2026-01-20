import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { formatCurrency } from '../utils/format';
import { exportToCSV } from '../utils/export';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import KPICardSkeleton from '../components/common/KPICardSkeleton';
import ChartSkeleton from '../components/common/ChartSkeleton';
import TableSkeleton from '../components/common/TableSkeleton';

const PaymentAnalysis = () => {
  const [period, setPeriod] = useState('30days');

  // Simuler un chargement de données
  const { data, isLoading } = useQuery({
    queryKey: ['payment-analysis', period],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    retry: 2,
  });

  // Données pour les graphiques (30 jours)
  const evolutionData = Array.from({ length: 30 }, (_, i) => ({
    day: `${i + 1} OCT`,
    cash: Math.floor(Math.random() * 200000) + 100000,
    orange: Math.floor(Math.random() * 150000) + 50000,
    mtn: Math.floor(Math.random() * 140000) + 60000,
  }));

  const pieData = [
    { name: 'Cash', value: 3100000, percentage: 45, color: '#37B24D' },
    { name: 'Orange Money', value: 1600000, percentage: 30, color: '#F28D2B' },
    { name: 'MTN MoMo', value: 800000, percentage: 25, color: '#2F80ED' },
  ];

  const operatorData = [
    {
      operator: 'Orange Money',
      volume: '2.45M FCFA',
      successRate: 98.2,
      avgTime: '1.2s',
      apiStatus: 'active',
      color: '#F28D2B',
    },
    {
      operator: 'MTN MoMo',
      volume: '1.85M FCFA',
      successRate: 95.6,
      avgTime: '1.5s',
      apiStatus: 'active',
      color: '#2F80ED',
    },
    {
      operator: 'Cash',
      volume: '3.12M FCFA',
      successRate: 100,
      avgTime: '0s',
      apiStatus: 'active',
      color: '#37B24D',
    },
  ];

  // Fonction d'export
  const handleExport = () => {
    try {
      const exportData = [
        {
          'Période': period,
          'Total Cash': formatCurrency(pieData.find(p => p.name === 'Cash')?.value || 0),
          'Total Orange Money': formatCurrency(pieData.find(p => p.name === 'Orange Money')?.value || 0),
          'Total MTN MoMo': formatCurrency(pieData.find(p => p.name === 'MTN MoMo')?.value || 0),
        },
        ...operatorData.map(op => ({
          'Opérateur': op.operator,
          'Volume': op.volume,
          'Taux de Réussite': `${op.successRate}%`,
          'Temps Moyen': op.avgTime,
          'Statut API': op.apiStatus,
        })),
      ];

      exportToCSV(exportData, `analyse-paiements-${period}-${new Date().toISOString().split('T')[0]}.csv`);
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
          <div>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
              <span>Analytics</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-slate-900 dark:text-slate-300 font-medium">Paiements Phase 5</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Analyse des Paiements</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-200 dark:border-slate-700">
              <span className="material-symbols-outlined text-slate-400 text-[20px]">calendar_today</span>
              <select
                className="bg-transparent border-none text-xs font-medium focus:ring-0 text-slate-600 dark:text-slate-300 cursor-pointer"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="30days">Derniers 30 jours</option>
                <option value="7days">Derniers 7 jours</option>
                <option value="month">Ce mois</option>
              </select>
            </div>
            <label className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-200 dark:border-slate-700">
              <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
              <input
                className="bg-transparent border-none text-xs focus:ring-0 text-slate-300 w-40"
                placeholder="Rechercher..."
                type="text"
              />
            </label>
            <button 
              onClick={handleExport}
              disabled={isLoading}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">file_download</span>
              <span>Exporter</span>
            </button>
            <div className="flex items-center gap-2 ml-2 pl-4 border-l border-slate-200 dark:border-slate-800">
              <button className="p-2 text-slate-400 hover:text-primary transition-colors relative">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900 dark:border-slate-800"></span>
              </button>
              <div className="size-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center overflow-hidden">
                <span className="material-symbols-outlined text-slate-300">person</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">+12.5%</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Volume Mobile Money</p>
            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">2,450,000 FCFA</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                <span className="material-symbols-outlined">account_balance_wallet</span>
              </div>
              <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded">-4.2%</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Volume Cash</p>
            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">3,120,000 FCFA</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                <span className="material-symbols-outlined">smartphone</span>
              </div>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">+8.1%</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Tx Succès Orange</p>
            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">98.2%</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <span className="material-symbols-outlined">bolt</span>
              </div>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">+2.4%</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Tx Succès MTN</p>
            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">95.6%</p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Line Chart Section */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Évolution 30 Jours</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tendance des volumes par méthode</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Cash</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Orange</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">MTN</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={256}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={10} tick={{ fill: '#64748b' }} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Line type="monotone" dataKey="cash" stroke="#37B24D" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="orange" stroke="#F28D2B" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="mtn" stroke="#2F80ED" strokeWidth={2} dot={false} />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex justify-between mt-4 px-2">
              <span className="text-[10px] font-bold text-slate-400">01 OCT</span>
              <span className="text-[10px] font-bold text-slate-400">07 OCT</span>
              <span className="text-[10px] font-bold text-slate-400">14 OCT</span>
              <span className="text-[10px] font-bold text-slate-400">21 OCT</span>
              <span className="text-[10px] font-bold text-slate-400">30 OCT</span>
            </div>
          </div>

          {/* Doughnut Chart Section */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col items-center">
            <div className="w-full text-left mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Répartition</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Canaux de paiement</p>
            </div>
            <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Total</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white leading-none">5.57M</p>
              </div>
            </div>
            <div className="w-full space-y-3">
              {pieData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{item.percentage}%</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {(item.value / 1000000).toFixed(1)}M FCFA
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Success Table Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Taux de succès des transactions par opérateur
            </h3>
            <button className="text-primary text-xs font-bold hover:underline">Voir tout l'historique</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Opérateur</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Volume (30j)
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Taux de succès
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Temps moyen
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Statut API</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {operatorData.map((operator) => (
                  <tr key={operator.operator} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="size-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${operator.color}20` }}
                        >
                          <span className="text-[10px] font-bold" style={{ color: operator.color }}>
                            {operator.operator === 'Orange Money' ? 'OM' : operator.operator === 'MTN MoMo' ? 'MTN' : 'CASH'}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{operator.operator}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{operator.volume}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{operator.successRate}%</span>
                        <div className="w-16 bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${operator.successRate}%`,
                              backgroundColor: operator.color,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{operator.avgTime}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                        {operator.apiStatus === 'active' ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-primary hover:text-primary/70 transition-colors">
                        <span className="material-symbols-outlined text-xl">more_vert</span>
                      </button>
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

export default PaymentAnalysis;

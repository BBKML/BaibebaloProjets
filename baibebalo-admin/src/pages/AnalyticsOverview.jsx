import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { formatCurrency } from '../utils/format';
import KPICardSkeleton from '../components/common/KPICardSkeleton';
import ChartSkeleton from '../components/common/ChartSkeleton';
import TableSkeleton from '../components/common/TableSkeleton';
import { dashboardAPI } from '../api/dashboard';

const AnalyticsOverview = () => {
  const [period, setPeriod] = useState('12M');

  // Simuler un chargement de données
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-overview', period],
    queryFn: async () => {
      // Simuler un délai de chargement
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    retry: 2,
  });

  // Mock data
  const revenueData = Array.from({ length: 12 }, (_, i) => ({
    month: `M${i + 1}`,
    revenue: Math.floor(Math.random() * 500000) + 200000,
    orders: Math.floor(Math.random() * 5000) + 2000,
  }));

  const userGrowthData = Array.from({ length: 12 }, (_, i) => ({
    month: `M${i + 1}`,
    newUsers: Math.floor(Math.random() * 500) + 200,
    activeUsers: Math.floor(Math.random() * 2000) + 1000,
  }));

  const performanceData = [
    { metric: 'Orders/Day', value: 1240, target: 1500, percentage: 82 },
    { metric: 'Revenue/Day', value: 45000, target: 55000, percentage: 82 },
    { metric: 'Active Users', value: 8500, target: 10000, percentage: 85 },
  ];

  const platformGrowthData = [
    { month: 'Jan', volume: 40, target: 60 },
    { month: 'Feb', volume: 55, target: 65 },
    { month: 'Mar', volume: 45, target: 70 },
    { month: 'Apr', volume: 75, target: 75 },
    { month: 'May', volume: 65, target: 80 },
    { month: 'Jun', volume: 90, target: 85 },
    { month: 'Jul', volume: 85, target: 90 },
  ];

  const criticalEvents = [
    {
      type: 'partner',
      icon: 'person_add',
      title: 'New Partner Onboarding',
      description: 'Logistics Corp joined the network.',
      time: '2 mins ago',
      color: 'blue',
    },
    {
      type: 'warning',
      icon: 'warning',
      title: 'API Latency Spike',
      description: 'Region: EU-West-1 (340ms)',
      time: '15 mins ago',
      color: 'orange',
    },
    {
      type: 'payment',
      icon: 'payments',
      title: 'Settlement Completed',
      description: '$24,300.00 disbursed to 12 partners.',
      time: '1 hour ago',
      color: 'emerald',
    },
  ];

  const highValueOrders = [
    { id: 'ORD-9021', client: 'Apex Dynamics', value: 12450, status: 'confirmed' },
    { id: 'ORD-8944', client: 'Horizon Group', value: 8200.5, status: 'processing' },
    { id: 'ORD-8912', client: 'Vertex Solutions', value: 19000, status: 'pending' },
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-8">
          {/* Header Skeleton */}
          <div className="flex flex-wrap justify-between items-end gap-4">
            <div className="max-w-2xl">
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64 mb-2 animate-pulse" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-96 animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32 animate-pulse" />
              <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
            </div>
          </div>

          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {new Array(4).fill(null).map((_, i) => (
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
          <div className="lg:col-span-2">
            <TableSkeleton rows={3} columns={5} />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black tracking-tight mb-2 text-slate-900 dark:text-white">
              Analytics Overview
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Real-time platform growth and operational health metrics for{' '}
              <span className="text-primary font-bold">Q3 2024</span>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setPeriod('12M')}
                className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${
                  period === '12M'
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                12M
              </button>
              <button
                onClick={() => setPeriod('6M')}
                className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${
                  period === '6M'
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                6M
              </button>
              <button
                onClick={() => setPeriod('30D')}
                className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${
                  period === '30D'
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                30D
              </button>
            </div>
            <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-lg flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <span className="material-symbols-outlined text-xl">calendar_month</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
              <span className="material-symbols-outlined text-5xl text-primary">trending_up</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              Total Revenue
            </p>
            <h3 className="text-3xl font-black mb-2 text-slate-900 dark:text-white">$4,285,900</h3>
            <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-sm">
              <span className="material-symbols-outlined text-sm">arrow_upward</span>
              +12.5% <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">vs last month</span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              Active Users
            </p>
            <h3 className="text-3xl font-black mb-2 text-slate-900 dark:text-white">124.5k</h3>
            <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-sm">
              <span className="material-symbols-outlined text-sm">arrow_upward</span>
              +5.2% <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">real-time</span>
            </div>
            <div className="mt-4 flex gap-1 h-6 items-end">
              <div className="w-2 h-[40%] bg-primary rounded-t-sm opacity-30" />
              <div className="w-2 h-[60%] bg-primary rounded-t-sm opacity-40" />
              <div className="w-2 h-[50%] bg-primary rounded-t-sm opacity-50" />
              <div className="w-2 h-[80%] bg-primary rounded-t-sm opacity-60" />
              <div className="w-2 h-[70%] bg-primary rounded-t-sm opacity-70" />
              <div className="w-2 h-[100%] bg-primary rounded-t-sm" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              Order Volume
            </p>
            <h3 className="text-3xl font-black mb-2 text-slate-900 dark:text-white">8,420</h3>
            <div className="flex items-center gap-1.5 text-orange-500 font-bold text-sm">
              <span className="material-symbols-outlined text-sm">arrow_downward</span>
              -2.1% <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">from avg.</span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              Avg. Order Value
            </p>
            <h3 className="text-3xl font-black mb-2 text-slate-900 dark:text-white">$512</h3>
            <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-sm">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Healthy <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">threshold</span>
            </div>
          </div>
        </div>

        {/* Primary Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Platform Growth Chart (Hybrid) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Platform Growth Overview</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Monthly volume vs Growth % projection
                </p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-primary/20 border border-primary" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Volume</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-orange-500" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Target</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={256}>
              <ComposedChart data={platformGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.1} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="volume" fill="#1c6ef2" fillOpacity={0.2} stroke="#1c6ef2" strokeWidth={2} />
                <Line type="monotone" dataKey="target" stroke="#FF6B35" strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex justify-around mt-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-2">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
            </div>
          </div>

          {/* Success Rate Gauge */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6">
              Global Success Rate
            </h4>
            <div className="relative size-40 mb-6">
              <svg className="size-full -rotate-90">
                <circle
                  className="text-slate-100 dark:text-slate-700"
                  cx="80"
                  cy="80"
                  fill="none"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="12"
                />
                <circle
                  className="text-primary"
                  cx="80"
                  cy="80"
                  fill="none"
                  r="70"
                  stroke="currentColor"
                  strokeDasharray="440"
                  strokeDashoffset="44"
                  strokeWidth="12"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-slate-900 dark:text-white">94.8%</span>
                <span className="text-[10px] font-bold text-emerald-500 uppercase">Optimal</span>
              </div>
            </div>
            <div className="space-y-3 w-full">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Completed</span>
                <span className="font-bold text-slate-900 dark:text-white">7,982</span>
              </div>
              <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[94%]" />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Failed/Cancelled</span>
                <span className="font-bold text-orange-500">438</span>
              </div>
              <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 w-[6%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Lower Section: Activity & Records */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity Feed */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Critical Events</h4>
              <span className="material-symbols-outlined text-slate-400 cursor-pointer">more_horiz</span>
            </div>
            <div className="space-y-6">
              {criticalEvents.map((event) => {
                const colorClasses = {
                  blue: 'bg-blue-100 dark:bg-blue-900/30 text-primary',
                  orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-500',
                  emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500',
                };
                return (
                  <div key={event.title} className="flex gap-4">
                    <div
                      className={`size-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClasses[event.color]}`}
                    >
                      <span className="material-symbols-outlined text-sm">{event.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{event.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{event.description}</p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase mt-1 block">
                        {event.time}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="w-full mt-6 py-2 text-xs font-bold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
              View All System Logs
            </button>
          </div>

          {/* High Value Transactions */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Recent High-Value Orders</h4>
              <button className="text-xs font-bold text-primary flex items-center gap-1">
                Filter <span className="material-symbols-outlined text-xs">tune</span>
              </button>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-black">
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Value</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {highValueOrders.map((order) => {
                  const statusConfig = {
                    confirmed: { label: 'Confirmée', class: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' },
                    processing: { label: 'En cours', class: 'bg-blue-100 dark:bg-blue-900/30 text-primary' },
                    pending: { label: 'En attente', class: 'bg-orange-100 dark:bg-orange-900/30 text-orange-500' },
                    delivering: { label: 'En livraison', class: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500' },
                    driver_at_customer: { label: 'Livreur arrivé', class: 'bg-purple-100 dark:bg-purple-900/30 text-purple-500' },
                    delivered: { label: 'Livrée', class: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' },
                  };
                  const status = statusConfig[order.status] || { label: order.status, class: 'bg-slate-100 text-slate-600' };
                  return (
                    <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-slate-900 dark:text-white">#{order.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-6 rounded-full bg-slate-200 dark:bg-slate-700 bg-cover" />
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{order.client}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                        {formatCurrency(order.value)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${status.class}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                          <span className="material-symbols-outlined text-slate-400">visibility</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AnalyticsOverview;

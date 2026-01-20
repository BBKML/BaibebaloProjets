import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { formatCurrency } from '../utils/format';
import TableSkeleton from '../components/common/TableSkeleton';

const DriverLeaderboard = () => {
  const [period, setPeriod] = useState('week');

  // Simuler un chargement de données
  const { data, isLoading } = useQuery({
    queryKey: ['driver-leaderboard', period],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    retry: 2,
  });

  const [drivers] = useState([
    {
      id: 'DRV-001',
      name: 'Jean Dupont',
      rank: 1,
      deliveries: 124,
      earnings: 1450,
      rating: 5,
      avgTime: '20 min',
      trend: [120, 125, 118, 130, 124, 128, 124],
    },
    {
      id: 'DRV-002',
      name: 'Marie Curie',
      rank: 2,
      deliveries: 110,
      earnings: 1290,
      rating: 4.8,
      avgTime: '22 min',
      trend: [105, 108, 112, 110, 109, 111, 110],
    },
    {
      id: 'DRV-003',
      name: 'Pierre Martin',
      rank: 3,
      deliveries: 98,
      earnings: 1150,
      rating: 4.5,
      avgTime: '18 min',
      trend: [100, 95, 102, 98, 96, 99, 98],
    },
    {
      id: 'DRV-004',
      name: 'Sophie Bernard',
      rank: 4,
      deliveries: 95,
      earnings: 1120,
      rating: 4.7,
      avgTime: '21 min',
      trend: [90, 92, 94, 96, 95, 93, 95],
    },
    {
      id: 'DRV-005',
      name: 'Lucas Dubois',
      rank: 5,
      deliveries: 88,
      earnings: 1050,
      rating: 4.6,
      avgTime: '19 min',
      trend: [85, 87, 86, 88, 87, 89, 88],
    },
  ]);

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return null;
    }
  };

  const getRankLabel = (rank) => {
    if (rank <= 3) return '';
    return `${rank}ème`;
  };

  const getTrendColor = (trend) => {
    const first = trend[0];
    const last = trend[trend.length - 1];
    if (last > first) return 'text-emerald-500';
    if (last < first) return 'text-red-500';
    return 'text-slate-500';
  };

  const renderSparkline = (trend) => {
    const max = Math.max(...trend);
    const min = Math.min(...trend);
    const range = max - min || 1;
    const width = 60;
    const height = 20;
    const points = trend.map((value, index) => {
      const x = (index / (trend.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });
    const path = `M ${points.join(' L ')}`;

    return (
      <svg width={width} height={height} className="overflow-visible">
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={getTrendColor(trend)}
        />
      </svg>
    );
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`material-symbols-outlined text-sm ${
          i < Math.floor(rating) ? 'text-amber-500 fill' : 'text-slate-300'
        }`}
      >
        star
      </span>
    ));
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64 animate-pulse" />
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-32 animate-pulse" />
          </div>

          {/* Table Skeleton */}
          <TableSkeleton rows={10} columns={7} />
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
              Classement & Performance Livreurs
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Phase 3 - Suivi des performances individuelles</p>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-900 dark:text-white focus:ring-1 focus:ring-primary"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-primary text-white">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Rang</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Nom du Livreur</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-center">Tendance</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-center">
                    Livraisons Réussies
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Total Gains</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-center">Note</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-center">Temps Moyen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {drivers.map((driver) => (
                  <tr
                    key={driver.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getRankIcon(driver.rank) && (
                          <span className="text-2xl">{getRankIcon(driver.rank)}</span>
                        )}
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {getRankLabel(driver.rank)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                          {driver.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{driver.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">{renderSparkline(driver.trend)}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-slate-900 dark:text-white">
                      {driver.deliveries}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-slate-900 dark:text-white">
                      {formatCurrency(driver.earnings)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-0.5">{renderStars(driver.rating)}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-400">
                      {driver.avgTime}
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

export default DriverLeaderboard;

import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { exportToCSV } from '../utils/export';
import toast from 'react-hot-toast';

const CohortRetentionAnalysis = () => {
  const [cohortType, setCohortType] = useState('registration');
  const [segment, setSegment] = useState('all');
  const [period, setPeriod] = useState('12months');

  const stats = [
    { label: 'Rétention Moyenne', value: '24.5%', change: '+2.1%', trend: 'up' },
    { label: 'Cohorte Active', value: '1,240', change: '-0.5%', trend: 'down' },
    { label: 'LTV Moyen', value: '45 FCFA', change: '+5.2%', trend: 'up' },
    { label: 'Churn Rate (M1)', value: '12.8%', change: '-1.4%', trend: 'down' },
  ];

  const cohortData = [
    {
      month: 'Janvier 2024',
      users: 1240,
      retention: [100, 42.5, 35.2, 28.1, 25.0, 22.4, 21.8, 20.5, 18.2, 15.4],
    },
    {
      month: 'Février 2024',
      users: 980,
      retention: [100, 38.1, 29.4, 24.2, 22.1, 20.5, 17.8, 15.2, 14.0, null],
    },
    {
      month: 'Mars 2024',
      users: 1520,
      retention: [100, 48.2, 41.0, 36.5, 32.2, 28.9, 26.4, 22.1, null, null],
    },
    {
      month: 'Avril 2024',
      users: 1105,
      retention: [100, 44.1, 34.8, 29.1, 26.5, 21.8, null, null, null, null],
    },
    {
      month: 'Mai 2024',
      users: 1380,
      retention: [100, 46.5, 38.2, 33.1, 28.4, null, null, null, null, null],
    },
  ];

  const getCohortCellClass = (value) => {
    if (value === null || value === undefined) return 'cohort-cell-0';
    if (value >= 80) return 'cohort-cell-100';
    if (value >= 60) return 'cohort-cell-80';
    if (value >= 40) return 'cohort-cell-60';
    if (value >= 20) return 'cohort-cell-40';
    if (value >= 5) return 'cohort-cell-20';
    return 'cohort-cell-5';
  };

  const handleExport = () => {
    try {
      const exportData = [
        ...stats.map(stat => ({
          'Métrique': stat.label,
          'Valeur': stat.value,
          'Changement': stat.change,
        })),
        ...cohortData.map(cohort => ({
          'Cohorte': cohort.month,
          'Utilisateurs': cohort.users,
          'M0': cohort.retention[0] || 0,
          'M1': cohort.retention[1] || 0,
          'M2': cohort.retention[2] || 0,
          'M3': cohort.retention[3] || 0,
          'M4': cohort.retention[4] || 0,
          'M5': cohort.retention[5] || 0,
          'M6': cohort.retention[6] || 0,
          'M7': cohort.retention[7] || 0,
          'M8': cohort.retention[8] || 0,
          'M9': cohort.retention[9] || 0,
        })),
      ];

      exportToCSV(exportData, `analyse-cohorte-retention-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Export CSV réussi !');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
          <span className="text-slate-500">Analytics</span>
          <span className="text-slate-700 dark:text-slate-500">/</span>
          <span className="text-primary font-black">Analyse par Cohorte</span>
        </nav>

        {/* Page Heading */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <h1 className="text-slate-900 dark:text-white text-4xl font-black leading-tight tracking-tighter">
              Rétention Client
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl font-medium">
              Visualisez l'évolution de la fidélité de vos clients mois après mois à l'aide de notre graphique
              matriciel de cohorte.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg text-xs font-bold transition-all border border-slate-200 dark:border-slate-700">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              Filtres Avancés
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-xs font-bold transition-all"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Exporter CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-xl hover:border-primary/50 transition-colors"
            >
              <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">
                {stat.label}
              </p>
              <div className="flex items-end justify-between">
                <p className="text-slate-900 dark:text-white text-3xl font-black tracking-tighter leading-none">
                  {stat.value}
                </p>
                <span
                  className={`text-xs font-bold flex items-center ${
                    stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {stat.change}{' '}
                  <span className="material-symbols-outlined text-xs">
                    {stat.trend === 'up' ? 'trending_up' : 'trending_down'}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Heatmap Section */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          {/* Control Panel */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cohort-type" className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Type de Cohorte
                </label>
                <select
                  id="cohort-type"
                  value={cohortType}
                  onChange={(e) => setCohortType(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg text-xs py-2 pl-3 pr-8 focus:ring-primary"
                >
                  <option value="registration">Date d'inscription</option>
                  <option value="first_purchase">Premier achat</option>
                  <option value="first_interaction">Première interaction</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="segment" className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Segment Client
                </label>
                <select
                  id="segment"
                  value={segment}
                  onChange={(e) => setSegment(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg text-xs py-2 pl-3 pr-8 focus:ring-primary"
                >
                  <option value="all">Tous les utilisateurs</option>
                  <option value="b2b">Clients B2B</option>
                  <option value="b2c">Clients B2C</option>
                  <option value="vip">Clients VIP</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="period" className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Période
                </label>
                <select
                  id="period"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg text-xs py-2 pl-3 pr-8 focus:ring-primary"
                >
                  <option value="12months">Derniers 12 mois</option>
                  <option value="6months">Derniers 6 mois</option>
                  <option value="2023">Année 2023</option>
                </select>
              </div>
            </div>
            {/* Legend */}
            <div className="flex flex-col items-end gap-2">
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Légende Rétention
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">0%</span>
                <div className="flex h-3 w-32 rounded-full overflow-hidden">
                  <div className="h-full w-1/4 bg-primary/25" />
                  <div className="h-full w-1/4 bg-primary/45" />
                  <div className="h-full w-1/4 bg-primary/85" />
                  <div className="h-full w-1/4 bg-primary" />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">100%</span>
              </div>
            </div>
          </div>

          {/* Heatmap Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50">
                  <th className="p-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 min-w-[140px]">
                    Mois
                  </th>
                  <th className="p-4 text-center text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700">
                    Users
                  </th>
                  {Array.from({ length: 10 }, (_, i) => (
                    <th
                      key={i}
                      className={`p-4 text-center text-[10px] font-black uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 ${
                        i === 0
                          ? 'text-primary bg-primary/5'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      M{i === 0 ? '0' : `+${i}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-xs font-medium">
                {cohortData.map((cohort, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-4 text-slate-900 dark:text-white font-bold border-r border-slate-200 dark:border-slate-700/50">
                      {cohort.month}
                    </td>
                    <td className="p-4 text-center text-slate-400 dark:text-slate-500 border-r border-slate-200 dark:border-slate-700/50">
                      {cohort.users.toLocaleString()}
                    </td>
                    {cohort.retention.map((value, colIndex) => (
                      <td
                        key={colIndex}
                        className={`p-4 text-center font-bold ${getCohortCellClass(value)}`}
                        style={{
                          backgroundColor:
                            value === null || value === undefined
                              ? '#1c2128'
                              : value >= 80
                                ? '#0aa4eb'
                                : value >= 60
                                  ? 'rgba(10, 164, 235, 0.85)'
                                  : value >= 40
                                    ? 'rgba(10, 164, 235, 0.65)'
                                    : value >= 20
                                      ? 'rgba(10, 164, 235, 0.45)'
                                      : value >= 5
                                        ? 'rgba(10, 164, 235, 0.25)'
                                        : 'rgba(10, 164, 235, 0.10)',
                          color:
                            value === null || value === undefined
                              ? '#4e5d66'
                              : value >= 20
                                ? 'white'
                                : '#8fb8cc',
                        }}
                      >
                        {value === null || value === undefined ? '-' : `${value}%`}
                      </td>
                    ))}
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

export default CohortRetentionAnalysis;
